#!/usr/bin/env bash
# Konten in der PRODUKTION per E-Mail löschen (Konto + Kind-Profile + Inhalte +
# Dateien, wie „Konto löschen" in der App). Fragt die Zugänge verdeckt ab —
# nichts wird gespeichert oder angezeigt. Ohne --wirklich wird nur angezeigt.
# Aufruf aus dem Projekt-Root:
#   bash scripts/prod-konten-loeschen.sh a@b.de c@d.de              # nur anzeigen
#   bash scripts/prod-konten-loeschen.sh a@b.de c@d.de --wirklich   # löschen
set -euo pipefail
cd "$(dirname "$0")/.."

PROD_REF="vmktsooagaoahvuoznfn"

echo "Lesify — Konten in der PRODUKTION löschen"
echo "Quelle: Railway → API-Service → Variables (Auge-Symbol → kopieren)."
echo "Hinweis: beim Einfügen erscheint absichtlich NICHTS auf dem Bildschirm. Cmd+V, dann Enter."
echo
read -rsp "DATABASE_URL aus Railway einfügen: " PROD_DB; echo
if [[ "$PROD_DB" != *"$PROD_REF"* ]]; then
  echo "Abbruch: das ist nicht die Produktions-DB (Projekt $PROD_REF erwartet)."; exit 1
fi
echo "   ✓ Produktions-DB erkannt"
read -rsp "SUPABASE_SERVICE_KEY aus Railway einfügen (für die Dateien): " PROD_KEY; echo
if [[ -z "$PROD_KEY" ]]; then echo "Abbruch: leer."; exit 1; fi
echo "   ✓ empfangen (${#PROD_KEY} Zeichen)"
read -rp "SUPABASE_STORAGE_BUCKET aus Railway (Name, nicht geheim): " PROD_BUCKET
if [[ -z "$PROD_BUCKET" || "$PROD_BUCKET" == "lesify-local" ]]; then echo "Abbruch: Bucket fehlt bzw. ist der Dev-Bucket."; exit 1; fi
echo

DATABASE_URL="$PROD_DB" DIRECT_URL="$PROD_DB" \
  SUPABASE_URL="https://$PROD_REF.supabase.co" SUPABASE_SERVICE_KEY="$PROD_KEY" SUPABASE_STORAGE_BUCKET="$PROD_BUCKET" \
  pnpm --silent --filter @lesify/api konten:loeschen "$@"
