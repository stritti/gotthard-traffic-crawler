import express from 'express';
import { log } from 'crawlee';
import { scrapeGotthard, initCsv } from './crawler.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

const app = express();

// CSV beim Start initialisieren (falls noch nicht vorhanden)
initCsv();

app.get('/crawl', async (_req, res) => {
    try {
        const data = await scrapeGotthard();
        res.json({
            success: true,
            timestamp: data.timestamp,
            data: {
                nordportal_km: data.nordportal_km,
                nordportal_min: data.nordportal_min,
                suedportal_km: data.suedportal_km,
                suedportal_min: data.suedportal_min,
            },
        });
    } catch (error: any) {
        log.error(`/crawl fehlgeschlagen: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    log.info(`🚀 Gotthard-Traffic Server läuft auf http://localhost:${PORT}`);
    log.info(`   GET /crawl  → einmaligen Crawl ausführen`);
    log.info(`   GET /health → Healthcheck`);
});
