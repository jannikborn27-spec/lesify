#!/usr/bin/env bash
# Lädt den neuesten nächtlichen DB-Dump der PRODUKTION nach api/backups/
# (gitignored — enthält Personendaten, nicht weitergeben). Fragt den
# Supabase-Service-Key verdeckt ab — nichts wird gespeichert oder angezeigt.
# Aufruf aus dem Projekt-Root:
#   bash scripts/prod-backup-holen.sh            # neuester Dump
#   bash scripts/prod-backup-holen.sh liste      # alle Dumps anzeigen
#   bash scripts/prod-backup-holen.sh holen db/lesify-2026-09-28T03-00-12Z.json.gz
# Danach Restore-Probe (gegen die Dev-DB aus api/.env, ohne Risiko):
#   pnpm --filter @lesify/api backup pruefen backups/<datei>
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Lesify — DB-Dump aus der PRODUKTION holen"
echo "Quelle: Railway → API-Service → Variables → SUPABASE_SERVICE_KEY (Auge-Symbol → kopieren)."
echo "Hinweis: beim Einfügen erscheint absichtlich NICHTS auf dem Bildschirm. Cmd+V, dann Enter."
echo
read -rsp "SUPABASE_SERVICE_KEY aus Railway einfügen: " PROD_KEY; echo
if [[ -z "$PROD_KEY" ]]; then echo "Abbruch: leer."; exit 1; fi
echo "   ✓ empfangen (${#PROD_KEY} Zeichen)"
echo

BEFEHL="${1:-holen}"
shift || true
SUPABASE_URL="https://vmktsooagaoahvuoznfn.supabase.co" SUPABASE_SERVICE_KEY="$PROD_KEY" \
  pnpm --filter @lesify/api backup "$BEFEHL" "$@"
