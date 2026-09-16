import { describe, expect, it } from 'vitest';
import { getPrisma } from '../../db.js';
import { kiKostenAlarmPruefen, kostenEurMikroAus, protokolliereKiKosten } from './kosten.js';

describe('kostenEurMikroAus', () => {
  it('reine Input/Output-Token, bekanntes Modell', () => {
    // 1 Mio. Input-Token = 1 $, 1 Mio. Output-Token = 5 $ → 6 $ × 0,93 = 5,58 €
    const mikro = kostenEurMikroAus('claude-haiku-4-5-20251001', {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    });
    expect(mikro).toBe(5_580_000);
  });

  it('typische kleine Chat-Nachricht kostet spürbar mehr als 0 (keine Rundung auf 0)', () => {
    const mikro = kostenEurMikroAus('claude-haiku-4-5-20251001', {
      inputTokens: 800,
      outputTokens: 200,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    });
    expect(mikro).toBeGreaterThan(0);
  });

  it('Cache-Lesen ist deutlich günstiger als frischer Input', () => {
    const basis = { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0 };
    const gelesen = kostenEurMikroAus('claude-haiku-4-5-20251001', {
      ...basis,
      cacheReadTokens: 1_000_000,
    });
    const frisch = kostenEurMikroAus('claude-haiku-4-5-20251001', {
      ...basis,
      cacheReadTokens: 0,
      inputTokens: 1_000_000,
    });
    expect(gelesen).toBeLessThan(frisch);
    expect(gelesen).toBeGreaterThan(0);
  });

  it('unbekanntes Modell fällt auf den Standardpreis zurück (kein Crash, kein 0)', () => {
    const mikro = kostenEurMikroAus('irgendein-zukuenftiges-modell', {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    });
    expect(mikro).toBeGreaterThan(0);
  });

  it('leere Usage kostet 0', () => {
    expect(
      kostenEurMikroAus('claude-haiku-4-5-20251001', {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      }),
    ).toBe(0);
  });
});

const hatDb = !!process.env.DATABASE_URL;

describe.runIf(hatDb)('protokolliereKiKosten / kiKostenAlarmPruefen (Supabase)', () => {
  const prisma = getPrisma();

  it('aggregiert mehrere Calls desselben Monats/Call-Typs/Modells', async () => {
    const monat = '2031-01'; // weit in der Zukunft, kollidiert nicht mit echten Daten
    const jetzt = new Date(`${monat}-15T00:00:00.000Z`);
    const callTyp = `test_${crypto.randomUUID()}`;
    const usage = {
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    };

    await protokolliereKiKosten(
      prisma,
      { callTyp, model: 'claude-haiku-4-5-20251001', usage },
      jetzt,
    );
    await protokolliereKiKosten(
      prisma,
      { callTyp, model: 'claude-haiku-4-5-20251001', usage },
      jetzt,
    );

    const zeile = await prisma.kiKosten.findUnique({
      where: { monat_callTyp_model: { monat, callTyp, model: 'claude-haiku-4-5-20251001' } },
    });
    expect(zeile?.calls).toBe(2);
    expect(zeile?.inputTokens).toBe(2000);
    expect(zeile?.outputTokens).toBe(1000);
    expect(zeile?.kostenEurMikro).toBeGreaterThan(0);
    expect(zeile?.kostenEurMikro).toBe(2 * kostenEurMikroAus('claude-haiku-4-5-20251001', usage));

    await prisma.kiKosten.delete({ where: { id: zeile!.id } });
  });

  it('kiKostenAlarmPruefen liefert eine Auswertung ohne zu werfen', async () => {
    const ergebnis = await kiKostenAlarmPruefen(prisma, new Date());
    expect(ergebnis.monat).toMatch(/^\d{4}-\d{2}$/);
    expect(typeof ergebnis.istEur).toBe('number');
    expect(typeof ergebnis.alarm).toBe('boolean');
  });
});
