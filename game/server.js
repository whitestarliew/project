const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DATASHEET_PATH = path.join(__dirname, 'datasheet.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

function readDatasheet() {
  try {
    if (fs.existsSync(DATASHEET_PATH)) {
      const raw = fs.readFileSync(DATASHEET_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading datasheet.json:', err);
  }
  return [];
}

function writeDatasheet(data) {
  try {
    fs.writeFileSync(DATASHEET_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing datasheet.json:', err);
    return false;
  }
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // API Endpoints
  if (pathname === '/api/datasheet' && req.method === 'GET') {
    const scores = readDatasheet();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(scores));
  }

  if (pathname === '/api/datasheet' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const newEntry = JSON.parse(body);
        if (!newEntry || typeof newEntry.score !== 'number' || !newEntry.name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid score entry format' }));
        }

        let scores = readDatasheet();
        scores.push({
          name: String(newEntry.name).toUpperCase().substring(0, 3) || 'AAA',
          score: parseInt(newEntry.score, 10) || 0,
          wave: parseInt(newEntry.wave, 10) || 1,
          date: new Date().toISOString().split('T')[0]
        });

        // Sort descending by score
        scores.sort((a, b) => b.score - a.score);

        // Keep Top 10
        scores = scores.slice(0, 10).map((entry, idx) => ({
          rank: idx + 1,
          name: entry.name,
          score: entry.score,
          wave: entry.wave,
          date: entry.date
        }));

        writeDatasheet(scores);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, scores }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Server error parsing highscore payload' }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`🎮 Arcade Space Shooter Server running on http://localhost:${PORT}`);
  console.log(`📁 Datasheet loaded from: ${DATASHEET_PATH}`);
});
