#!/usr/bin/env bash
# Baut die statische Website (marketing/ = Root, app/ unter /app) nach _site/.
# Genutzt von Cloudflare Pages (Build command: `bash scripts/build-site.sh`,
# Output directory: `_site`) und vom GitHub-Pages-Workflow — eine Quelle für beide.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf _site
mkdir -p _site/app
cp -r marketing/. _site/
cp -r app/. _site/app/
# Nichts ausliefern, was nicht auf die Website gehört.
rm -rf _site/index-backup*.html _site/assets.zip _site/README.md _site/app/README.md \
  _site/assets/img/images-fin _site/assets/img/test-img*
# Archiv der alten Startseite (noindex, nur lokal zum Nachschlagen) — seit
# 2026-09-28 nicht mehr öffentlich ausgeliefert (vor dem Werbestart aufgeräumt).
rm -rf _site/landing-old-dev-23092026
echo "Site gebaut: $(find _site -type f | wc -l | tr -d ' ') Dateien in _site/"
