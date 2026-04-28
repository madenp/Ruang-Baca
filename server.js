const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'riwayat_pengunjung.json');

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif'
};

const server = http.createServer((req, res) => {
    // Handling API for visitors data
    const basePath = req.url.split('?')[0];
    if (basePath === '/api/visitors') {
        if (req.method === 'GET') {
            fs.readFile(DATA_FILE, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500);
                    return res.end('Error loading data');
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data || '[]');
            });
            return;
        }

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                fs.writeFile(DATA_FILE, body, (err) => {
                    if (err) {
                        res.writeHead(500);
                        return res.end(JSON.stringify({ error: 'Error saving data' }));
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                });
            });
            return;
        }
    }

    // Serve Static Files
    let filePath = '.' + req.url;
    // Remove query params if any
    if (filePath.includes('?')) {
        filePath = filePath.split('?')[0];
    }
    
    if (filePath === './' || filePath === './?') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    let contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(path.join(__dirname, filePath), (err, content) => {
        if (err) {
            if (err.code == 'ENOENT') {
                res.writeHead(404);
                res.end('File Not Found 404');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + err.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Live server is running at http://localhost:${PORT}`);
    console.log(`API endpoint available at http://localhost:${PORT}/api/visitors`);
});
