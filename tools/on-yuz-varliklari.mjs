// Web projesinin ön yüz varlıklarını prototipten üretir:
//   wwwroot/css/theme.css             ← prototype/src/tokens.css + shell.css + components.css (birebir)
//   wwwroot/icons/sprite.svg          ← Web kaynaklarında (cshtml, cs, js) tırnak içinde geçen Phosphor ikon adları
//   wwwroot/lib/chart.js/chart.umd.js ← prototype/node_modules/chart.js (sürüm prototype/package.json'da sabit)
// Gereksinim: prototype/node_modules (prototype klasöründe npm install).
// Çalıştırma: node tools/on-yuz-varliklari.mjs   (yeni ikon kullanıldığında, prototip CSS'i veya Chart.js sürümü değiştiğinde)
// Yeni dosya üretildiyse Web projesi yeniden derlenir: MapStaticAssets dosya listesini derlemede çıkarır.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync, copyFileSync } from 'node:fs';
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

// 4) Chart.js: UMD paketi (zaten küçültülmüş) ve lisans. Kaynak haritası dağıtılmadığı için başvurusu çıkarılır,
//    yoksa tarayıcı geliştirici araçları olmayan .map dosyasını ister.
const chartKlasoru = join(kok, 'prototype', 'node_modules', 'chart.js');
if (!existsSync(chartKlasoru)) throw new Error('chart.js bulunamadı: önce prototype klasöründe "npm install" çalıştırın.');
const chartHedef = join(wwwroot, 'lib', 'chart.js');
mkdirSync(chartHedef, { recursive: true });
const chartJs = readFileSync(join(chartKlasoru, 'dist', 'chart.umd.js'), 'utf8').replace(/\n\/\/# sourceMappingURL=\S+\s*$/, '\n');
writeFileSync(join(chartHedef, 'chart.umd.js'), chartJs, 'utf8');
copyFileSync(join(chartKlasoru, 'LICENSE.md'), join(chartHedef, 'LICENSE.md'));
const chartSurum = JSON.parse(readFileSync(join(chartKlasoru, 'package.json'), 'utf8')).version;

// 5) Metin kuralı (DESIGN.md): arayüzde em/en dash yok
const tireler = dosyalar.filter(({ metin }) => /[–—]/.test(metin)).map(({ yol }) => relative(kok, yol));
if (tireler.length) throw new Error(`em/en dash bulundu: ${tireler.join(', ')}`);

console.log(`theme.css: ${(Buffer.byteLength(tema) / 1024).toFixed(0)} KB | sprite: ${adlar.size} ikon | chart.js ${chartSurum} | taranan dosya: ${dosyalar.length}`);
