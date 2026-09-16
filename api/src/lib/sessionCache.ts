/**
 * Kurzlebiger In-Memory-Cache für bereits validierte Sessions.
 *
 * `requireAuth` (app.ts) fragt sonst bei JEDEM authentifizierten Request per
 * `prisma.session.findUnique` die DB — bei mehreren parallelen Requests
 * derselben Seite (z. B. dashboard.html: 7 gleichzeitige `Lesify.*()`-Calls,
 * siehe app/dashboard.html) macht das aus einem Seitenaufruf viele zusätzliche
 * Roundtrips zur (entfernten) Supabase-Instanz — messbar mitverantwortlich
 * für die "Seite lädt spürbar verzögert" Symptomatik. Ein kurzer Cache spart
 * die Session-Lookups für wiederholte Requests mit demselben Token, ohne die
 * eigentlichen Ressourcen-Queries zu berühren.
 *
 * Trade-off (bewusst akzeptiert): eine widerrufene Session kann bis zu
 * `TTL_MS` nach dem Widerruf noch als gültig gelten, falls sie kurz zuvor
 * gecached wurde. Logout und Passwort-Reset (routes/auth.ts) räumen den
 * jeweils betroffenen Eintrag zusätzlich sofort weg, um dieses Fenster in
 * den häufigsten Fällen auf praktisch null zu reduzieren.
 */

const TTL_MS = 30_000;

interface Eintrag {
  userId: string;
  ablaeuftAm: number;
  cachedBis: number;
}

export class SessionCache {
  private readonly eintraege = new Map<string, Eintrag>();

  /** `null` bei Cache-Miss/abgelaufenem Eintrag — dann normal per DB prüfen. */
  get(tokenHash: string, jetzt = Date.now()): string | null {
    const e = this.eintraege.get(tokenHash);
    if (!e) return null;
    if (e.cachedBis < jetzt || e.ablaeuftAm < jetzt) {
      this.eintraege.delete(tokenHash);
      return null;
    }
    return e.userId;
  }

  set(tokenHash: string, userId: string, ablaeuftAm: number, jetzt = Date.now()): void {
    this.eintraege.set(tokenHash, { userId, ablaeuftAm, cachedBis: jetzt + TTL_MS });
  }

  /** Nach Logout: genau diese eine Session sofort aus dem Cache werfen. */
  invalidate(tokenHash: string): void {
    this.eintraege.delete(tokenHash);
  }

  /** Nach Passwort-Reset ("alle Sessions beenden"): alle Einträge des Users werfen. */
  invalidateUser(userId: string): void {
    for (const [k, e] of this.eintraege) if (e.userId === userId) this.eintraege.delete(k);
  }

  /** Nur für Tests. */
  zuruecksetzen(): void {
    this.eintraege.clear();
  }
}
