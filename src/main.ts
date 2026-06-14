import cron from 'node-cron';
import { scrapeGotthard, initCsv } from './crawler.js';

// CSV initialisieren (einmalig beim Start)
initCsv();

let runCount = 0;
let consecutiveFailures = 0; // resets on success
let skipUntil: number | null = null; // nächster erlaubter Ausführungszeitpunkt

/**
 * Formatiert Millisekunden lesbar (z. B. "26s" oder "1min 23s").
 */
function prettyTime(ms: number): string {
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}min ${secs % 60}s`;
}

/**
 * Padding-Helfer für Tabellen-Ausrichtung.
 */
function pad(value: string, len = 6): string {
    return value.padStart(len, ' ');
}

/**
 * Einmaligen Crawl ausführen und schön ausgeben.
 */
async function scheduledCrawl(): Promise<void> {
    // ----- Skip bei Fehler-Backoff -----
    if (skipUntil && Date.now() < skipUntil) {
        const remainingMin = Math.ceil((skipUntil - Date.now()) / 60000);
        console.log(`⏸  Übersprungen — nächster Versuch in ${remainingMin}min\n`);
        return;
    }

    runCount++;
    const startTime = Date.now();
    const separator = '─'.repeat(36);
    console.log(`\n${separator}  ${runCount}. Durchlauf  ${separator}`);
    console.log(`🌐  ${new Date().toLocaleString('de-CH')}`);

    try {
        const data = await scrapeGotthard();
        const elapsed = Date.now() - startTime;

        // Erfolg — Zähler zurücksetzen
        consecutiveFailures = 0;
        skipUntil = null;

        // Ergebnis-Tabelle
        const header = '    Portal        km      min';
        const nord = `    Nordportal  ${pad(data.nordportal_km)}  ${pad(data.nordportal_min)}`;
        const sued = `    Südportal   ${pad(data.suedportal_km)}  ${pad(data.suedportal_min)}`;
        console.log(`📊  ${header}`);
        console.log(`    ${nord}`);
        console.log(`    ${sued}`);
        console.log(`💾  gotthard_log.csv`);
        console.log(`⏱   ${prettyTime(elapsed)}`);
        console.log(`✅  Erfolg\n`);
    } catch (e: any) {
        const elapsed = Date.now() - startTime;
        const errors = consecutiveFailures + 1; // +1 weil noch nicht inkrementiert

        console.log(`❌  FEHLSCHLAG nach ${prettyTime(elapsed)}`);
        console.log(`    ${e.message}`);

        // Fehler-Backoff: +5min pro Fehlschlag-Serie
        const penaltyMin = errors * 5;
        skipUntil = Date.now() + penaltyMin * 60 * 1000;
        consecutiveFailures = errors;

        console.log(`⏸  Nächster Versuch in 15min + ${penaltyMin}min Pause (${errors}. Fehlschlag)\n`);
    }
}

// ----- Cron alle 15 Minuten -----
cron.schedule('*/15 * * * *', scheduledCrawl);

// ----- Ersten Durchlauf sofort starten -----
console.log(`\n${'═'.repeat(44)}`);
console.log('        Gotthard Traffic Crawler');
console.log(`        Start: ${new Date().toLocaleString('de-CH')}`);
console.log(`        Cron:  Alle 15 Minuten`);
console.log(`${'═'.repeat(44)}\n`);

scheduledCrawl();
