# Gotthard Traffic Crawler

[![CI](https://github.com/stritti/gotthard-traffic-crawler/actions/workflows/ci.yml/badge.svg)](https://github.com/stritti/gotthard-traffic-crawler/actions/workflows/ci.yml)
[![Release](https://github.com/stritti/gotthard-traffic-crawler/actions/workflows/release.yml/badge.svg)](https://github.com/stritti/gotthard-traffic-crawler/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Web Scraper für aktuelle Stauinformationen des Gotthard-Strassentunnels. Extrahiert Staulängen (km) und Wartezeiten (min) für Nord- und Südportal von [gotthard-traffic.ch](https://www.gotthard-traffic.ch/?lan=de).

Nutzt **Camoufox** (Firefox + Fingerprint-Spoofing) zur Umgehung des Cloudflare-Schutzes, **PlaywrightCrawler** (Crawlee v3) für die Browser-Automation und bietet sowohl einen **CLI-Cronjob** als auch einen **HTTP-Server** für n8n-Integration.

## Features

-   **Cloudflare-Umgehung** via Camoufox-Firefox (Fingerprint-Spoofing, Humanize-Effekte)
-   **Duale Extraktion**: Staulänge (km) **und** Wartezeit (min) für beide Portale
-   **CLI-Modus**: Einmaliger Crawl + Cronjob alle 15 Minuten
-   **HTTP-Server**: `GET /crawl` → JSON-Antwort (ideal für n8n, Make, etc.)
-   **CSV-Logging**: Automatische Append in `gotthard_log.csv`
-   **Crawlee Dataset**: Strukturierte Speicherung für weitere Verarbeitung

## Voraussetzungen

-   **Node.js 22+**
-   **npm 10+**
-   **Playwright 1.58.2** (wird via Camoufox gebündelt)
-   ~200 MB freier Speicher für Camoufox-Browser-Binaries

## Installation

```bash
git clone https://github.com/stritti/gotthard-traffic-crawler.git
cd gotthard-traffic-crawler
npm install
```

Der `postinstall`-Hook lädt automatisch die Camoufox-Browser-Binaries herunter (~200 MB).

## Verwendung

### CLI-Modus (einmaliger Crawl + Cron)

```bash
npm start
```

Startet einen sofortigen Crawl und richtet einen Cronjob für alle 15 Minuten ein.

### HTTP-Server (für n8n)

```bash
npm run start:server
```

Server läuft auf `http://localhost:3000`.

| Endpoint | Beschreibung |
|---|---|
| `GET /crawl` | Führt einmaligen Crawl aus → JSON-Response |
| `GET /health` | Healthcheck → `{ "status": "ok" }` |

#### Beispiel-Response (`/crawl`)

```json
{
    "success": true,
    "timestamp": "2026-05-22T13:35:30.488Z",
    "data": {
        "nordportal_km": "3.8",
        "nordportal_min": "45",
        "suedportal_km": "1.7",
        "suedportal_min": "17"
    }
}
```

### Produktion (vorkompiliert)

```bash
npm run build
npm run start:prod           # CLI
npm run start:server:prod    # HTTP-Server
```

## Projektstruktur

```
src/
├── crawler.ts        # Crawl-Logik (Camoufox + Playwright + Extraktion + CSV)
├── server.ts         # Express-Server (GET /crawl, GET /health)
├── main.ts           # CLI-Einstieg (one-shot + Cron)
└── routes.ts         # (unused) Crawlee-Template-Router
storage/              # Crawlee-Datasets, KV-Stores, Request-Queues (gitignored)
dist/                 # tsc-Build-Output (gitignored)
```

## n8n-Integration

1. **HTTP-Server starten**: `npm run start:server` (als Service/PM2/Systemd)
2. **n8n-Workflow**: `HTTP Request`-Node → `GET http://dein-server:3000/crawl`
3. **Daten nutzen**: `${json.data.nordportal_km}`, `${json.data.nordportal_min}`, etc.

## Docker

```bash
docker build -t gotthard-crawler .
docker run gotthard-crawler
```

Das Docker-Image basiert auf `apify/actor-node-playwright-camoufox:24-1.58.2` und führt den CLI-Modus aus.

## Entwicklung

```bash
# Formattierung prüfen
npm run format:check

# Formattierung anwenden
npm run format

# TypeScript-Check
npm run typecheck

# Build
npm run build
```

## Releases

Dieses Projekt verwendet [**semantic-release**](https://semantic-release.gitbook.io/) für automatisierte Versionierung und GitHub-Releases.

Commit-Nachrichten müssen dem **Conventional Commits**-Standard folgen:

| Prefix | Release |
|---|---|
| `fix:` | Patch (1.0.x) |
| `feat:` | Minor (1.x.0) |
| `feat!:` oder `fix!:` | Major (x.0.0) |
| `chore:`, `docs:`, `refactor:` | Kein Release |

Nach einem Push auf `main` erstellt die GitHub Action automatisch einen Release. Der GIT_TOKEN wird automatisch von GitHub Actions bereitgestellt — kein manuelles Setup nötig.

## Lizenz

MIT — siehe [LICENSE](LICENSE).
