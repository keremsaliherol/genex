// dist/ klasörünü yerelde sunar (bağımlılıksız). Kullanım: node serve.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = join(dirname(fileURLToPath(import.meta.url)), 'dist');
const TIP = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const port = Number(process.env.PORT) || 5173;

createServer(async (req, res) => {
  const yol = decodeURIComponent(new URL(req.url, 'http://yerel').pathname);
  const dosya = join(kok, yol === '/' ? 'index.html' : yol);
  if (!dosya.startsWith(kok)) { res.writeHead(403).end(); return; }
  try {
    const icerik = await readFile(dosya);
    res.writeHead(200, { 'Content-Type': TIP[extname(dosya)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(icerik);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bulunamadı');
  }
}).listen(port, () => console.log(`Hesap Masası prototipi: http://localhost:${port}`));
