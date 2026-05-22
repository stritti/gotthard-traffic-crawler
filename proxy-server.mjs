// Minimaler HTTP/HTTPS-Proxy-Server für Windows
// Start: node proxy-server.mjs
import http from 'node:http';
import net from 'node:net';

const PORT = 8080;

const server = http.createServer((req, res) => {
    const url = new URL(req.url);
    const options = {
        hostname: url.hostname,
        port: url.port || 80,
        method: req.method,
        path: url.pathname + url.search,
        headers: { ...req.headers },
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });
    proxyReq.on('error', () => res.writeHead(502).end('Proxy Error'));
    req.pipe(proxyReq);
});

server.on('connect', (req, clientSocket) => {
    const [host, port] = req.url.split(':');
    const serverSocket = net.connect(parseInt(port, 10) || 443, host, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
    });
    serverSocket.on('error', () => clientSocket.end());
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Proxy läuft auf Port ${PORT}`);
    console.log(`   Crawler in WSL nutzt: http://localhost:${PORT}`);
});
