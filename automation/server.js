// server.js - Simple server to keep container running
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4444;

const server = http.createServer((req, res) => {
    console.log(`Request: ${req.url}`);
    
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
            <head><title>WebdriverIO Automation</title></head>
            <body>
                <h1>WebdriverIO Automation Server</h1>
                <p>Container is running!</p>
                <ul>
                    <li><a href="/build-report">View Build Report</a></li>
                    <li><a href="/test-report">View Test Report</a></li>
                    <li><a href="/health">Health Check</a></li>
                </ul>
            </body>
            </html>
        `);
    } else if (req.url === '/build-report') {
        const reportPath = path.join(__dirname, 'build-reports', 'build-report.html');
        if (fs.existsSync(reportPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fs.readFileSync(reportPath));
        } else {
            res.writeHead(404);
            res.end('Build report not found. Run npm run build first.');
        }
    } else if (req.url === '/test-report') {
        const reportPath = path.join(__dirname, 'test-reports', 'test-report.html');
        if (fs.existsSync(reportPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fs.readFileSync(reportPath));
        } else {
            res.writeHead(404);
            res.end('Test report not found. Run npm test first.');
        }
    } else if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the server at http://localhost:${PORT}`);
});

// Keep the process running
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.close(() => {
        process.exit(0);
    });
});