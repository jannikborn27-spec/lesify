#!/usr/bin/env bash
# Wendet ausstehende Prisma-Migrationen auf die PRODUKTIV-Datenbank an.
# Fragt die beiden Supabase-Verbindungsstrings verdeckt ab — nichts wird
# gespeichert oder angezeigt. Aufruf aus dem Projekt-Root:
#   bash scripts/prod-migrate.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Lesify — Migrationen auf die PRODUKTIV-Datenbank anwenden"
echo "Quelle: Railway → API-Service → Variables → DATABASE_URL (Auge-Symbol → kopieren)."
echo "Hinweis: beim Einfügen erscheint absichtlich NICHTS auf dem Bildschirm (Passwort-Schutz)."
echo "Einfach Cmd+V und dann Enter drücken — danach kommt eine Bestätigung mit ✓."
echo
read -rsp "1) DATABASE_URL aus Railway (Variables) einfügen: " PROD_DB_URL; echo
echo "   ✓ empfangen (${#PROD_DB_URL} Zeichen)"
read -rsp "2) DIRECT_URL aus Railway einfügen — gibt es keine, einfach nur Enter: " PROD_DIRECT_URL; echo
if [[ -z "$PROD_DIRECT_URL" ]]; then
  # Session-Pooler = gleicher String, Port 5432 statt 6543, ohne pgbouncer-Parameter.
  PROD_DIRECT_URL="${PROD_DB_URL/:6543\//:5432/}"
  PROD_DIRECT_URL="$(printf '%s' "$PROD_DIRECT_URL" | sed -E 's/[?&]pgbouncer=true//; s/[?&]connection_limit=[0-9]+//; s/\?$//')"
  echo "   ✓ aus DATABASE_URL abgeleitet (Port 5432)"
else
  echo "   ✓ empfangen (${#PROD_DIRECT_URL} Zeichen)"
fi
echo

for v in "$PROD_DB_URL" "$PROD_DIRECT_URL"; do
  case "$v" in
    postgres://*|postgresql://*) ;;
    *) echo "Fehler: das sieht nicht wie ein Verbindungsstring aus (muss mit postgresql:// beginnen)."; exit 1 ;;
  esac
  if [[ "$v" == *"[YOUR-PASSWORD]"* ]]; then
    echo "Fehler: [YOUR-PASSWORD] ist noch nicht durch das Datenbank-Passwort ersetzt."; exit 1
  fi
done
if [[ "$PROD_DB_URL" != *vmktsooagaoahvuoznfn* ]]; then
  echo "Achtung: der String gehört nicht zum Produktiv-Projekt (vmktsooagaoahvuoznfn). Abbruch."; exit 1
fi

DATABASE_URL="$PROD_DB_URL" DIRECT_URL="$PROD_DIRECT_URL" pnpm --filter @lesify/api db:deploy
