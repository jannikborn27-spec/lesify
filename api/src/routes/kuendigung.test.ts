import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../app.js';
import { getPrisma } from '../db.js';
import { FakeZahlungsGateway } from '../lib/zahlung.js';
import { FakeMailGateway } from '../lib/mailer.js';
import type { KuendigungMailDaten } from '../lib/mailTemplates.js';

type Gesendet = KuendigungMailDaten & { automatisch: boolean; konto?: string };

/** Schneidet Kündigungs-Mails mit; `internFehlschlag` simuliert Resend-Ausfall. */
class MitschnittMail extends FakeMailGateway {
  bestaetigungen: Gesendet[] = [];
  intern: Gesendet[] = [];
  internFehlschlag = false;
  override async kuendigungBestaetigungSenden(input: Gesendet): Promise<void> {
    this.bestaetigungen.push(input);
  }
  override async kuendigungInternSenden(input: Gesendet & { konto: string }): Promise<void> {
    if (this.internFehlschlag) throw new Error('resend down');
    this.intern.push(input);
  }
}

const keinPrisma = {} as unknown as PrismaClient;
const basis = { name: 'Kim Test', art: 'ordentlich', zeitpunkt: 'naechstmoeglich' } as const;

describe('kündigung — Validierung (ohne DB)', () => {
  const app = buildApp({ prisma: keinPrisma, logger: false, mail: new MitschnittMail() });

  it('außerordentlich ohne Grund → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/kuendigung',
      payload: { ...basis, email: 'a@b.de', art: 'ausserordentlich' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('Zeitpunkt „Datum" ohne Datum → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/kuendigung',
      payload: { ...basis, email: 'a@b.de', zeitpunkt: 'datum' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('Honeypot gefüllt → 200, ohne DB-Zugriff', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/kuendigung',
      payload: { ...basis, email: 'a@b.de', website: 'spam' },
    });
    expect(res.statusCode).toBe(200);
  });
});

const hatDb = !!process.env.DATABASE_URL;

describe.runIf(hatDb)('kündigung — Kündigungsbutton (Supabase)', () => {
  const mail = new MitschnittMail();
  const app = buildApp({ logger: false, zahlung: new FakeZahlungsGateway(), mail });
  const prisma = getPrisma();

  async function kontoMitAbo(): Promise<string> {
    const email = `k+${crypto.randomUUID()}@kuendigung.lesify.test`;
    const passwort = 'kuendigung-test-1234';
    await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: { name: 'Kim Test', email, passwort, einwilligung: true },
    });
    const token = (
      await app.inject({ method: 'POST', url: '/auth/login', payload: { email, passwort } })
    ).json().token as string;
    const abo = await app.inject({
      method: 'POST',
      url: '/abo',
      headers: { authorization: `Bearer ${token}` },
      payload: { paket: 'premium', intervall: 'monatlich' },
    });
    expect(abo.statusCode).toBe(201);
    return email;
  }
  const status = async (email: string) =>
    (await prisma.user.findUnique({ where: { email }, include: { abo: true } }))?.abo?.status;

  beforeAll(async () => {
    await app.ready();
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@kuendigung.lesify.test' } } });
    await app.close();
  });

  it('ordentlich, nächstmöglich → Abo automatisch gekündigt + Bestätigung mit Enddatum', async () => {
    const email = await kontoMitAbo();
    const res = await app.inject({
      method: 'POST',
      url: '/kuendigung',
      payload: { ...basis, email },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().eingangAm).toBeTruthy();
    expect(await status(email)).toBe('gekuendigt');
    const b = mail.bestaetigungen.at(-1)!;
    expect(b.email).toBe(email);
    expect(b.automatisch).toBe(true);
    expect(b.ergebnisText).toMatch(/Testphase am \d+\. \w+ \d{4}/);
    expect(b.eingangText).toMatch(/Uhr$/);
    expect(mail.intern.at(-1)!.konto).toContain('Abo ');

    // zweites Mal: bereits gekündigt, keine Änderung
    await app.inject({ method: 'POST', url: '/kuendigung', payload: { ...basis, email } });
    expect(mail.bestaetigungen.at(-1)!.ergebnisText).toMatch(/bereits gekündigt/);
  });

  it('außerordentlich → nicht automatisch, Abo unverändert, interne Kopie zur Bearbeitung', async () => {
    const email = await kontoMitAbo();
    const res = await app.inject({
      method: 'POST',
      url: '/kuendigung',
      payload: { ...basis, email, art: 'ausserordentlich', grund: 'Umzug ins Ausland' },
    });
    expect(res.statusCode).toBe(200);
    expect(await status(email)).toBe('test');
    expect(mail.bestaetigungen.at(-1)!.automatisch).toBe(false);
    expect(mail.intern.at(-1)!.grund).toBe('Umzug ins Ausland');
  });

  it('unbekannte E-Mail → gleiche Antwort, nichts automatisch', async () => {
    const email = `unbekannt+${crypto.randomUUID()}@kuendigung.lesify.test`;
    const res = await app.inject({
      method: 'POST',
      url: '/kuendigung',
      payload: { ...basis, email },
    });
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json()).sort()).toEqual(['eingangAm', 'ok']);
    expect(mail.bestaetigungen.at(-1)!.ergebnisText).toMatch(/kein laufendes Abo/);
    expect(mail.intern.at(-1)!.konto).toMatch(/kein Konto/);
  });

  it('nicht automatisch + interne Kopie scheitert → 503 (Kündigung darf nicht verloren gehen)', async () => {
    mail.internFehlschlag = true;
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/kuendigung',
        payload: { ...basis, email: `x+${crypto.randomUUID()}@kuendigung.lesify.test` },
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().fehler).toBe('kuendigung_versand_fehlgeschlagen');
    } finally {
      mail.internFehlschlag = false;
    }
  });
});
