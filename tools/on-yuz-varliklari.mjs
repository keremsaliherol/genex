// Web projesinin ön yüz varlıklarını prototipten üretir:
//   wwwroot/css/theme.css    ← prototype/src/tokens.css + shell.css + components.css (birebir)
//   wwwroot/icons/sprite.svg ← Web kaynaklarında (cshtml, cs, js) tırnak içinde geçen Phosphor ikon adları
// Gereksinim: prototype/node_modules (prototype klasöründe npm install).
// Çalıştırma: node tools/on-yuz-varliklari.mjs   (yeni ikon kullanıldığında veya prototip CSS'i değiştiğinde)
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = join(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(kok, 'src', 'MusteriHesapYonetimi.Web');
const wwwroot = join(web, 'wwwroot');

// 1) Tema: prototipin üç katmanı tek dosyada
const katmanlar = ['tokens.css', 'shell.css', 'components.css'];
const tema = `/* Hesap Masası teması. Bu dosya üretilir, elle değiştirmeyin: node tools/on-yuz-varliklari.mjs
   Kaynak: prototype/src/${katmanlar.join(', ')}. Razor'a özgü kurallar css/uygulama.css dosyasında. */\n\n`
  + katmanlar.map((f) => readFileSync(join(kok, 'prototype', 'src', f), 'utf8')).join('\n');
mkdirSync(join(wwwroot, 'css'), { recursive: true });
writeFileSync(join(wwwroot, 'css', 'theme.css'), tema, 'utf8');

// 2) Kaynak dosyalar (üçüncü taraf kütüphaneler ve derleme çıktıları hariç)
function* kaynaklar(klasor) {
  for (const ad of readdirSync(klasor)) {
    if (['bin', 'obj', 'lib', 'node_modules', 'icons'].includes(ad)) continue;
    const yol = join(klasor, ad);
    if (statSync(yol).isDirectory()) yield* kaynaklar(yol);
    else if (['.cshtml', '.cs', '.js'].includes(extname(ad))) yield yol;
  }
}
const dosyalar = [...kaynaklar(web)].map((yol) => ({ yol, metin: readFileSync(yol, 'utf8') }));

// 3) İkon sprite: harici <use href="/icons/sprite.svg#i-ad"> ile kullanılır, tarayıcı önbelleğe alır
const ikonKlasoru = join(kok, 'prototype', 'node_modules', '@phosphor-icons', 'core', 'assets', 'regular');
if (!existsSync(ikonKlasoru)) throw new Error('Phosphor ikonları bulunamadı: önce prototype klasöründe "npm install" çalıştırın.');
const adlar = new Set();
for (const { metin } of dosyalar) {
  for (const m of metin.matchAll(/["'`]([a-z][a-z0-9-]{1,40})["'`]/g)) {
    if (existsSync(join(ikonKlasoru, `${m[1]}.svg`))) adlar.add(m[1]);
  }
}
const semboller = [...adlar].sort().map((ad) => {
  const svg = readFileSync(join(ikonKlasoru, `${ad}.svg`), 'utf8');
  const viewBox = (svg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 256 256';
  const ic = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<symbol id="i-${ad}" viewBox="${viewBox}" fill="currentColor">${ic}</symbol>`;
}).join('\n');
mkdirSync(join(wwwroot, 'icons'), { recursive: true });
writeFileSync(join(wwwroot, 'icons', 'sprite.svg'), `<svg xmlns="http://www.w3.org/2000/svg">\n${semboller}\n</svg>\n`, 'utf8');

// 4) Metin kuralı (DESIGN.md): arayüzde em/en dash yok
const tireler = dosyalar.filter(({ metin }) => /[–—]/.test(metin)).map(({ yol }) => relative(kok, yol));
if (tireler.length) throw new Error(`em/en dash bulundu: ${tireler.join(', ')}`);

console.log(`theme.css: ${(Buffer.byteLength(tema) / 1024).toFixed(0)} KB | sprite: ${adlar.size} ikon | taranan dosya: ${dosyalar.length}`);
