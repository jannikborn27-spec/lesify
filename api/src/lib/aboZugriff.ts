import type { Abo, PrismaClient, User } from '@prisma/client';

/**
 * App-Zugriff eines Kind-Profils je nach Abo-Zustand (Entscheidung 2026-09-23).
 *
 * - `voll`           — Abo läuft (`test`/`aktiv`, oder `gekuendigt` noch vor
 *                      Zeitraumende).
 * - `eingeschraenkt` — Zahlung offen (`zahlung_offen`): Kind kann sich
 *                      anmelden und alles **ansehen**, aber nichts Neues
 *                      anlegen/erzeugen (alle schreibenden Requests → 403
 *                      `zahlung_offen`). Nach {@link ZAHLUNG_OFFEN_LOESCH_TAGE}
 *                      Tagen ohne Zahlung löscht der Job
 *                      `zahlung-offen-loeschung` Kind-Profile + Inhalte.
 * - `gesperrt`       — Abo pausiert oder gekündigt und abgelaufen: Kind kommt
 *                      nicht mehr in die App (403 `abo_gesperrt`), nur Login/
 *                      Logout. Inhalte bleiben erhalten.
 *
 * Gilt **nur für Schüler-Konten** (`rolle = schueler`). Elternkonten werden
 * nie gesperrt — sie müssen das Abo ja wieder in Ordnung bringen können und
 * sehen den Zustand in `eltern-abo.html`.
 */
export type AboZugriff = 'voll' | 'eingeschraenkt' | 'gesperrt';
export type AboSperrGrund = 'pausiert' | 'abgelaufen' | 'zahlung_offen';

export const ZAHLUNG_OFFEN_LOESCH_TAGE = 30;
/** Warn-Mail an die Eltern so viele Tage vor der Löschung. */
export const ZAHLUNG_OFFEN_WARN_TAGE_VORHER = 7;

export interface ZugriffStand {
  zugriff: AboZugriff;
  grund: AboSperrGrund | null;
  /** nur bei `zahlung_offen`: ab wann Kind-Profile + Inhalte gelöscht werden */
  loeschungAm: Date | null;
}

const VOLL: ZugriffStand = { zugriff: 'voll', grund: null, loeschungAm: null };

export function loeschDatum(zahlungOffenSeit: Date): Date {
  return new Date(zahlungOffenSeit.getTime() + ZAHLUNG_OFFEN_LOESCH_TAGE * 86_400_000);
}

/** Reine Ableitung — testbar ohne DB. */
export function zugriffFuer(
  user: Pick<User, 'rolle'>,
  abo: Pick<Abo, 'status' | 'aktuellerZeitraumEnde' | 'zahlungOffenSeit'> | null,
  jetzt = new Date(),
): ZugriffStand {
  // Eltern nie sperren; Konten ohne Abo (Altbestand/Trial ohne Abo) laufen
  // weiter über die bisherige Paket-Logik in usage.ts.
  if (user.rolle !== 'schueler' || !abo) return VOLL;
  switch (abo.status) {
    case 'pausiert':
      return { zugriff: 'gesperrt', grund: 'pausiert', loeschungAm: null };
    case 'gekuendigt':
      return abo.aktuellerZeitraumEnde.getTime() <= jetzt.getTime()
        ? { zugriff: 'gesperrt', grund: 'abgelaufen', loeschungAm: null }
        : VOLL;
    case 'zahlung_offen':
      return {
        zugriff: 'eingeschraenkt',
        grund: 'zahlung_offen',
        loeschungAm: abo.zahlungOffenSeit ? loeschDatum(abo.zahlungOffenSeit) : null,
      };
    default:
      return VOLL;
  }
}

const TTL_MS = 30_000;

/**
 * Kurzlebiger Cache (wie `SessionCache`): der Zugriff wird bei jedem
 * authentifizierten Request gebraucht, ändert sich aber selten. Ein
 * Statuswechsel (Webhook, Pause, Kündigung) greift spätestens nach `TTL_MS`.
 */
export class ZugriffCache {
  private readonly eintraege = new Map<string, { stand: ZugriffStand; bis: number }>();

  async stand(prisma: PrismaClient, userId: string, jetzt = Date.now()): Promise<ZugriffStand> {
    const e = this.eintraege.get(userId);
    if (e && e.bis > jetzt) return e.stand;
    let stand: ZugriffStand;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          rolle: true,
          abo: { select: { status: true, aktuellerZeitraumEnde: true, zahlungOffenSeit: true } },
        },
      });
      stand = user ? zugriffFuer(user, user.abo) : VOLL;
    } catch (err) {
      // Fail-open: eine Abrechnungs-Sperre darf bei einem DB-Hänger nicht die
      // ganze App lahmlegen (jeder authentifizierte Request läuft hier durch).
      // Nicht cachen → nächster Request prüft erneut.
      console.error(JSON.stringify({ aboZugriffFehler: String(err), userId }));
      return VOLL;
    }
    this.eintraege.set(userId, { stand, bis: jetzt + TTL_MS });
    return stand;
  }

  zuruecksetzen(): void {
    this.eintraege.clear();
  }
}

/**
 * Welche Requests bei eingeschränktem/gesperrtem Zugriff trotzdem durchgehen.
 * `/auth/*` immer (sonst kein Login/Logout/`/auth/me` für den Sperrbildschirm);
 * bei `eingeschraenkt` zusätzlich alles Lesende (GET/HEAD).
 */
export function requestErlaubt(stand: ZugriffStand, method: string, url: string): boolean {
  if (stand.zugriff === 'voll') return true;
  const pfad = url.split('?')[0] ?? '';
  if (pfad.startsWith('/auth/')) return true;
  if (stand.zugriff === 'eingeschraenkt') return method === 'GET' || method === 'HEAD';
  return false;
}
