import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_DIR = path.resolve(import.meta.dirname, 'artifacts/eduplat/dist/public');
const API_HOST = 'localhost';
const API_PORT = 8080;
const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api')) {
    const proxyReq = http.request(
      { hostname: API_HOST, port: API_PORT, path: req.url, method: req.method, headers: req.headers },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('error', (err) => {
      console.error('API proxy error:', err.message);
      res.writeHead(502);
      res.end('API server unavailable');
    });
    req.pipe(proxyReq);
    return;
  }

  // Security: normalize path and verify it stays within FRONTEND_DIR
  const requestedPath = req.url === '/' ? 'index.html' : req.url.split('?')[0];
  const filePath = path.join(FRONTEND_DIR, path.normalize(requestedPath));
  const resolvedPath = path.resolve(filePath);

  // Path traversal check: resolved path must be inside FRONTEND_DIR
  if (!resolvedPath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let servePath = resolvedPath;
  if (!fs.existsSync(servePath) || fs.statSync(servePath).isDirectory()) {
    servePath = path.join(FRONTEND_DIR, 'index.html');
  }

  const ext = path.extname(servePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  try {
    const content = fs.readFileSync(servePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend running at http://localhost:${PORT}`);
});
