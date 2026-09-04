# Lesify

KI-Lern-Webapp für Schüler:innen (8./9. Klasse). Monorepo aus öffentlicher
Marketing-Website, eingeloggter App und Backend-API.

Status: Übergang vom statischen Prototyp zum Live-Produkt — Schritt-für-Schritt
in [`UMSETZUNGSPLAN.md`](UMSETZUNGSPLAN.md). Backend-Spezifikation in
[`Konzept-texts/backend-planning.md`](Konzept-texts/backend-planning.md)
(§0 „Stack" beschreibt die Technikwahl).

## Ordnerstruktur

| Ordner            | Inhalt                                                                 | Build?        |
| ----------------- | --------------------------------------------------------------------- | ------------- |
| `marketing/`      | Öffentliche Website (Landing, Preise, Login, Registrierung, Rechtstexte) | nein (statisch) |
| `app/`            | Eingeloggte App (Dashboard, Chat, Fächer, Klausuren, Lernplan …)      | nein (statisch) |
| `api/`            | Backend — Fastify + TypeScript (`@lesify/api`)                        | ja (`tsc`)    |
| `shared/`         | Reine Formeln/Typen für App **und** API (`@lesify/shared`), z. B. Notenlogik | ja (`tsc`) |
| `Konzept-texts/`  | Fachliche Spezifikation (PDFs, `backend-planning.md`, Prompt-Entwürfe) | —             |
| `.github/workflows/` | CI (Lint + Typecheck + Tests bei jedem Push)                      | —             |

`marketing/` und `app/` bleiben bewusst ohne Build-Tool / Framework — reines
HTML/CSS/Vanilla-JS wie im bisherigen Prototyp.

## Voraussetzungen

- **Node** ≥ 20 (`.nvmrc` → `nvm use`)
- **pnpm** 9 (`corepack enable`)
- **Python 3** (nur um `app/` und `marketing/` lokal statisch auszuliefern)

## Einrichtung

```bash
corepack enable
pnpm install
cp .env.example .env   # Werte für die lokale Umgebung eintragen
```

## Lokal entwickeln — ein Befehl

```bash
pnpm dev
```

Startet parallel:

| Dienst    | URL                     |
| --------- | ----------------------- |
| API       | http://localhost:3000   |
| App       | http://localhost:4001   |
| Marketing | http://localhost:4002   |

Beenden mit `Ctrl+C` (stoppt alle drei).

## Nützliche Skripte

| Befehl              | Wirkung                                          |
| ------------------- | ----------------------------------------------- |
| `pnpm lint`         | ESLint über `api/` + `shared/` + `scripts/`     |
| `pnpm format`       | Prettier schreibt Formatierung                  |
| `pnpm format:check` | Prettier prüft nur (wie in CI)                  |
| `pnpm typecheck`    | `tsc --noEmit` in allen Paketen                 |
| `pnpm test`         | Vitest in allen Paketen                         |

Ein Pre-Commit-Hook (`simple-git-hooks` + `lint-staged`) formatiert geänderte
Dateien vor jedem Commit. Nach dem ersten `pnpm install` ist er aktiv.

## Umgebungen

`local` · `staging` · `production` — jede mit eigener Datenbank, eigenem
Supabase-Storage-Bucket und eigenen Secrets. Variablennamen stehen in
`.env.example`; echte Werte gehören ausschließlich in den Secret-Store der
jeweiligen Umgebung, nie ins Repo.

## Lizenz

Privat / proprietär — siehe [`LICENSE`](LICENSE).
