import { log } from 'crawlee';
import cron from 'node-cron';
import { scrapeGotthard, initCsv } from './crawler.js';

// CSV initialisieren (einmalig beim Start)
initCsv();

/**
 * Einmaligen Crawl durchführen und Ergebnis loggen.
 */
async function runOnce() {
    try {
        const data = await scrapeGotthard();
        log.info(
            `Ergebnis: Nord ${data.nordportal_km} km / ${data.nordportal_min} min | ` +
                `Süd ${data.suedportal_km} km / ${data.suedportal_min} min`,
        );
    } catch (e: any) {
        log.error(`Crawl fehlgeschlagen: ${e.message}`);
    }
}

// 1. Initialer Start
runOnce();

// 2. Cronjob alle 15 Minuten
cron.schedule('*/15 * * * *', () => {
    log.info('----------------------------------------');
    log.info('Cronjob ausgelöst: Starte planmäßigen Crawl...');
    runOnce();
});

log.info('✅ CLI-Crawler gestartet. Cronjob für alle 15 Minuten eingerichtet.');
