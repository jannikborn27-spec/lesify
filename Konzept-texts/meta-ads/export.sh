#!/usr/bin/env bash
# Exportiert alle Motive aus creatives.html als 1080×1080-PNGs (Headless Chrome).
#
#   bash Konzept-texts/meta-ads/export.sh            → Konzept-texts/meta-ads/export/
#   bash Konzept-texts/meta-ads/export.sh <zielordner>
#
# Startet kurz einen lokalen Server im Repo-Root (Bilder/Fonts liegen in
# marketing/assets) und screenshottet je Karte creatives.html?export=<ID>&n=<i>.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$ROOT/Konzept-texts/meta-ads/export}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PORT=4331

# Creative-ID:Anzahl Karten — bei Änderungen in creatives.html mitpflegen
SLIDES="E1:1 E2:1 E3:1 E4:1 E5:1 K1:5 K2:5 K3:5 K4:5 K5:4"

mkdir -p "$OUT"
python3 -m http.server "$PORT" --directory "$ROOT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1

for entry in $SLIDES; do
  id="${entry%%:*}"; count="${entry##*:}"
  for ((i = 1; i <= count; i++)); do
    if [[ "$count" -gt 1 ]]; then file="lesify-$id-$i.png"; else file="lesify-$id.png"; fi
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
      --force-device-scale-factor=1 --window-size=1080,1080 \
      --virtual-time-budget=4000 \
      --screenshot="$OUT/$file" \
      "http://localhost:$PORT/Konzept-texts/meta-ads/creatives.html?export=$id&n=$i" \
      >/dev/null 2>&1
    echo "✓ $file"
  done
done
echo "Fertig: $OUT"
