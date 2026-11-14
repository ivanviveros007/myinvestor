import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulate } from './simulate.js';

const dist = fileURLToPath(new URL('../web/dist', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

export function createApp() {
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/health') return json(res, 200, { status: 'ok' });
      if (req.method === 'POST' && path === '/api/simulate') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
          if (body.length > 32000) return json(res, 413, { error: 'La solicitud supera el tamaño permitido.' });
        }
        return json(res, 200, { results: simulate(JSON.parse(body)) });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Método no permitido.' });
      const file = resolve(dist, path === '/' ? 'index.html' : '.' + decodeURIComponent(path));
      if (!file.startsWith(dist + sep)) return json(res, 404, { error: 'Ruta no encontrada.' });
      const info = await stat(file).catch(() => null);
      if (!info?.isFile()) return json(res, 404, { error: 'Ruta no encontrada.' });
      res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Content-Length': info.size });
      if (req.method === 'HEAD') return res.end();
      createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch (error) {
      if (res.headersSent) return res.destroy();
      json(res, 400, { error: error instanceof SyntaxError ? 'Solicitud inválida.' : error.message });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3003);
  createApp().listen(port, '127.0.0.1', () => console.log(`MyInvestor en http://127.0.0.1:${port}`));
}
