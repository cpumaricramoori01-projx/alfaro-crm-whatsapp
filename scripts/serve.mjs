import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
import { serveInbox } from '../api/whatsapp-inbox.mjs';
import { fetchCatalog } from './catalog.mjs';
import { serveWebhook } from '../api/whatsapp-webhook.mjs';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/api/whatsapp-inbox') {
      res.status = code => { res.statusCode = code; return res; };
      res.json = value => { res.setHeader('Content-Type','application/json; charset=utf-8'); return res.end(JSON.stringify(value)); };
      await serveInbox(req,res); return;
    }
    if (pathname === '/api/whatsapp-webhook') {
      res.status = code => { res.statusCode = code; return res; };
      res.json = body => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(JSON.stringify(body)); };
      await serveWebhook(req, res);
      return;
    }
    if (pathname === '/api/catalog') {
      try { const catalog = await fetchCatalog(); res.writeHead(200,{ 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store' }).end(JSON.stringify(catalog)); }
      catch { res.writeHead(502,{ 'Content-Type':'application/json; charset=utf-8' }).end(JSON.stringify({ error:'El catálogo público no está disponible.' })); }
      return;
    }
    const target = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403).end(); return; }
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch { res.writeHead(404).end('No encontrado'); }
});
server.listen(Number(process.env.PORT || 3100), '127.0.0.1', () => console.log(`Consola de prueba: http://localhost:${server.address().port}`));
