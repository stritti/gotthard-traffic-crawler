import { log } from 'crawlee';
import { scrapeGotthard, initCsv } from './crawler.js';

const BASE_INTERVAL_MS = 15 * 60 * 1000; // 15 Minuten
const PENALTY_MS = 5 * 60 * 1000; // +5 Minuten pro Fehlschlag
const MAX_INTERVAL_MS = 60 * 60 * 1000; // Maximal 60 Minuten

// CSV initialisieren (einmalig beim Start)
initCsv();

/**
 * Einmaligen Crawl durchführen.
 * Wirft bei Fehlschlag → wird vom Scheduler abgefangen und gezählt.
 */
async function runOnce(): Promise<void> {
    const data = await scrapeGotthard();
    log.info(
        `Ergebnis: Nord ${data.nordportal_km} km / ${data.nordportal_min} min | ` +
            `Süd ${data.suedportal_km} km / ${data.suedportal_min} min`,
    );
}

/**
 * Dynamischer Scheduler: Start → warten → wiederholen.
 * Intervall verlängert sich bei Fehlschlägen um je 5 Minuten (max 60min).
 * Setzt sich bei Erfolg zurück auf 15 Minuten.
 */
async function runForever(): Promise<void> {
    let failures = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            await runOnce();
            failures = 0; // Erfolg → Zähler zurücksetzen
        } catch (e: any) {
            failures++;
            log.error(`❌ Crawl #${failures} fehlgeschlagen: ${e.message}`);
        }

        const intervalMs = Math.min(BASE_INTERVAL_MS + failures * PENALTY_MS, MAX_INTERVAL_MS);
        const intervalMin = intervalMs / 60000;

        log.info(
            failures === 0
                ? `⏳ Nächster Crawl in ${intervalMin} Minuten...`
                : `⏳ Nächster Versuch in ${intervalMin} Minuten (${failures} Fehler seit letztem Erfolg)`,
        );

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
}

// Start
log.info('🚀 CLI-Crawler gestartet (dynamisches Intervall, Basis 15min).');
runForever().catch((e) => {
    log.error(`💥 Scheduler abgestürzt: ${e.message}`);
    process.exit(1);
});
