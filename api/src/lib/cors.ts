/** Parst `CORS_ORIGINS` (kommagetrennt) zu einer Liste, leere Einträge raus. */
export function parseCorsOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * `origin`-Option für `@fastify/cors` (§4/Phase 11): Marketing/App laufen auf
 * anderem Origin als die API. dev/test erlauben jeden Origin (lokale Ports
 * variieren je nach Tooling); production nur die in `CORS_ORIGINS` gelisteten
 * Origins — ohne sie bleibt CORS zu (fail-closed), siehe Phase 16.
 */
export function corsOriginOption(
  istProd: boolean,
  corsOrigins: string | undefined,
): boolean | string[] {
  return istProd ? parseCorsOrigins(corsOrigins) : true;
}
