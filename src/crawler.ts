import { PlaywrightCrawler, Dataset, log } from 'crawlee';
import { launchOptions as camoufoxOptions } from 'camoufox-js';
import playwright from 'playwright';
import fs from 'fs';

// Log-Level auf INFO setzen für eine saubere Ausgabe
log.setLevel(log.LEVELS.INFO);

const TARGET_URL = 'https://www.gotthard-traffic.ch/?lan=de';
const LOG_FILE = 'gotthard_log.csv';

export interface CrawlResult {
    timestamp: string;
    nordportal_km: string;
    nordportal_min: string;
    suedportal_km: string;
    suedportal_min: string;
}

/** CSV-Header schreiben, falls Datei noch nicht existiert */
export function initCsv(): void {
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, 'timestamp,nordportal_km,nordportal_min,suedportal_km,suedportal_min\n');
    }
}

/**
 * Einmaligen Crawl der Gotthard-Traffic-Seite durchführen.
 * Gibt die extrahierten Daten zurück und appended sie an die CSV.
 */
export async function scrapeGotthard(): Promise<CrawlResult> {
    log.info('Starte Gotthard-Traffic Crawler...');
    initCsv();

    // Shared-Variablen: requestHandler schreibt hier rein
    let result: CrawlResult | undefined;
    let portalDataFound = false;

    // Camoufox-Launch-Options (Firefox-Fingerprint-Spoofing gegen Cloudflare)
    const cfLaunchOpts = await camoufoxOptions({
        headless: true,
        block_webrtc: true,
        locale: 'de-DE',
        screen: { width: 1920, height: 1080 },
        humanize: true,
    });

    const crawler = new PlaywrightCrawler({
        maxRequestRetries: 3,
        requestHandlerTimeoutSecs: 120,
        useSessionPool: false,

        launchContext: {
            launcher: playwright.firefox,
            launchOptions: { ...cfLaunchOpts },
        },
        browserPoolOptions: {
            useFingerprints: false, // Camoufox bringt eigenen Fingerprint mit
        },

        // Kein Image-Blocking — führt sonst zur Erkennung durch Cloudflare!
        preNavigationHooks: [],

        requestHandler: async ({ page, request }) => {
            log.info(`Navigiere zu ${request.url}...`);

            // Seite laden und auf Daten-Element warten (AJAX /refresh)
            await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Kurze Pause, damit LoadPage() den AJAX-Request starten kann
            await page.waitForTimeout(2000);

            // Warten bis die Traffic-Daten im DOM erscheinen
            try {
                await page.waitForSelector('[data-id="north-portal"]', { timeout: 25000 });
            } catch {
                // Fallback: auf networkidle warten, falls LoadPage() nicht funktioniert hat
                await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
            }

            const html = await page.content();

            // Portal-Blöcke aus dem HTML extrahieren
            const nordBlock =
                html.match(/data-id="north-portal"[\s\S]*?(?=data-id="south-portal"|<\/div>\s*<\/div>\s*$)/i)?.[0] ??
                '';
            const suedBlock =
                html.match(/data-id="south-portal"[\s\S]*?(?=data-id="|<\/div>\s*<\/div>\s*$)/i)?.[0] ?? '';

            function extractValues(block: string): { km: string; min: string } {
                let km = '0',
                    min = '0';
                const pattern = /<h4[^>]*>\s*([\d.,]+)\s*(km|min)\s*<\/h4>/gi;
                let m: RegExpExecArray | null;
                while ((m = pattern.exec(block)) !== null) {
                    const val = m[1].replace(',', '.');
                    if (m[2].toLowerCase() === 'km') km = val;
                    else min = val;
                }
                return { km, min };
            }

            const nord = extractValues(nordBlock);
            const sued = extractValues(suedBlock);

            portalDataFound = true; // data-id="north-portal" wurde im DOM gefunden

            result = {
                timestamp: new Date().toISOString(),
                nordportal_km: nord.km,
                nordportal_min: nord.min,
                suedportal_km: sued.km,
                suedportal_min: sued.min,
            };

            log.info(
                `Extrahiert -> Nord: ${result.nordportal_km} km / ${result.nordportal_min} min ` +
                    `| Süd: ${result.suedportal_km} km / ${result.suedportal_min} min`,
            );

            // In Crawlee-Dataset + CSV speichern
            await Dataset.pushData(result);
            const csvLine = `${result.timestamp},${result.nordportal_km},${result.nordportal_min},${result.suedportal_km},${result.suedportal_min}\n`;
            fs.appendFileSync(LOG_FILE, csvLine);
        },

        failedRequestHandler({ request, log, error }) {
            log.error(`Anfrage für ${request.url} ist endgültig fehlgeschlagen.`);
            log.error(`Fehlergrund: ${(error as Error).message}`);
        },
    });

    await crawler.run([TARGET_URL]);
    log.info('Crawler-Durchlauf beendet.');

    if (!result || !portalDataFound) {
        throw new Error(
            'Crawl fehlgeschlagen: keine Portal-Daten gefunden ' +
                '(data-id="north-portal" fehlt im DOM — Cloudflare-Block oder AJAX nicht geladen)',
        );
    }

    return result;
}
