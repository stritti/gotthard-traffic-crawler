# AGENTS.md — gotthard-traffic-crawler

Web scraping project using **Crawlee v3** + **PlaywrightCrawler** + **Camoufox** for browser fingerprint spoofing. Targets `gotthard-traffic.ch`.

## Project structure

```
src/crawler.ts    — scrapeGotthard(): Crawl-Logik (Camoufox + Playwright + Extraktion + CSV)
src/server.ts     — Express-Server: GET /crawl (ruft scrapeGotthard auf, gibt JSON zurück)
src/main.ts       — CLI-Einstieg: one-shot + Cron alle 15 Minuten
src/routes.ts     — (unused) router from Crawlee template
storage/          — Crawlee local datasets, KV stores, request queues (gitignored)
dist/             — tsc build output (gitignored)
```

## Key commands

| Command | What it does |
|---|---|
| `bun start` | CLI: `tsx src/main.ts` (dev, one-shot + Cron) |
| `bun run start:server` | HTTP-Server: `tsx src/server.ts` (n8n-kompatibel) |
| `bun run start:prod` | CLI: `node dist/main.js` (nach build) |
| `bun run start:server:prod` | HTTP-Server: `node dist/server.js` (nach build) |
| `bun run build` | `tsc` — compiles `src/` → `dist/` |
| `bun run typecheck` | `tsc --noEmit` — type-check only |
| `bun run format` | Prettier — format `src/**/*.ts` |
| `bun run format:check` | Prettier — check formatting |
| `bun run get-binaries` | Downloads Camoufox browser binaries |
| `bun test` | Stub — no tests yet |

`postinstall` auto-runs `get-binaries`. First `bun install` downloads ~200MB of Camoufox binaries.

## ESM

`"type": "module"` in package.json. Local imports must use `.js` extension even for `.ts` files:

```ts
import { scrapeGotthard } from './crawler.js';  // correct
```

## Camoufox quirks

- **`useFingerprints: false` is required** in `browserPoolOptions` — Crawlee's default fingerprint spoofing conflicts with Camoufox.
- **`headless: true` works** with Camoufox — contrary to older docs.
- **Do NOT block images** (`block_images: true` or `route.abort()`) — Camoufox warnt explizit, dass Image-Blocking zur Erkennung durch Cloudflare führt.
- Playwright is pinned to **1.58.2**. The Docker image (`apify/actor-node-playwright-camoufox:24-1.58.2`) matches this version.

## HTTP client

Uses `ImpitHttpClient` with `Browser.Firefox` as the HTTP client (separate from the browser page requests). Configured via `crawlee`'s default HTTP agent in `crawler.ts`.

## Proxy

Proxy configuration is **commented out** in the codebase. Uncomment and provide `proxyUrls` in `crawler.ts` to enable:

```ts
proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
```

## TypeScript

- Target: `ES2022`, module: `NodeNext`, moduleResolution: `NodeNext`
- `noUnusedLocals: false` — the compiler won't error on unused variables
- Extends `@apify/tsconfig`
- Includes `DOM` lib (for `page.title()` etc.)

## Testing

No test suite exists. The `test` script is a placeholder:

```
echo "Error: oops, the actor has no tests yet, sad!" && exit 1
```

## Docker

Multistage build using `apify/actor-node-playwright-camoufox:24-1.58.2`. Production image runs `node dist/main.js` (CLI mode). Crawlee's local storage persists at `/home/myuser/storage` by default.

## GitHub

- **Dependabot** configured in `.github/dependabot.yml` — weekly npm + GitHub Actions updates
- **CI** in `.github/workflows/ci.yml` — formatting check + type check + tests on push/PR to main
- **Release** in `.github/workflows/release.yml` — semantic-release on push to main

## Storage

Crawlee stores run artifacts locally in `storage/`:
- `datasets/` — crawled data output
- `key_value_stores/` — key-value storage (screenshots, PDFs, etc.)
- `request_queues/` — queued URLs for crawling

All gitignored. Delete contents between test runs to start fresh.
