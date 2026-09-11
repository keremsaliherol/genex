// Prototipi tek dosyaya gömer.
// dist/index.html    : tam belge, tarayıcıda doğrudan açılır
// dist/artifact.html : <title> ile başlar; html/head/body etiketi yok (Artifact sarmalayıcısı ekler)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = dirname(fileURLToPath(import.meta.url));
const oku = (...p) => readFileSync(join(kok, ...p), 'utf8');

const BOOTSTRAP_JS = 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/js/bootstrap.bundle.min.js';
const CHART_JS = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
const FONTLAR = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap';

// 1) CSS: Bootstrap (stylesheet olduğu için gömülmek zorunda) + tema katmanları
const bootstrapCss = oku('node_modules', 'bootstrap', 'dist', 'css', 'bootstrap.min.css').replace(/\/\*# sourceMappingURL=.*?\*\//g, '');
const disUrl = (bootstrapCss.match(/url\((?!["']?data:)[^)]*\)/g) || []).length;
const temaCss = ['tokens.css', 'shell.css', 'components.css'].map((f) => oku('src', f)).join('\n');

// 2) JS: yükleme sırası önemli (HM ad alanı)
const JS_SIRASI = ['data.js', 'util.js', 'oracle-izi.js', 'store.js', 'charts.js', 'router.js',
  'views/genel.js', 'views/musteri.js', 'views/hesap.js', 'views/islem.js', 'views/rapor.js'];
const appJs = JS_SIRASI.map((f) => `/* ${f} */\n${oku('src', f)}`).join('\n');

// 3) İkon sprite: kaynaktaki tırnaklı adlardan Phosphor'da karşılığı olanlar
const ikonDir = join(kok, 'node_modules', '@phosphor-icons', 'core', 'assets', 'regular');
const adlar = new Set();
for (const m of appJs.matchAll(/['"`]([a-z][a-z0-9-]{1,40})['"`]/g)) if (existsSync(join(ikonDir, `${m[1]}.svg`))) adlar.add(m[1]);
const semboller = [...adlar].sort().map((ad) => {
  const svg = readFileSync(join(ikonDir, `${ad}.svg`), 'utf8');
  const viewBox = (svg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 256 256';
  const ic = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<symbol id="i-${ad}" viewBox="${viewBox}" fill="currentColor">${ic}</symbol>`;
}).join('');
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${semboller}</svg>`;

// 4) Kontroller: em/en dash yasağı ve script kapanışı
const dash = (temaCss + appJs).match(/[–—]/g) || [];
if (/<\/script/i.test(appJs)) throw new Error('JS içinde </script> dizisi var');

const bas = `<title>Hesap Masası</title>
<meta name="description" content="Müşteri, hesap ve işlem yönetimi prototipi (ASP.NET Core MVC + Oracle).">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTLAR}">
<style>
${bootstrapCss}
${temaCss}
</style>`;
const govde = `${sprite}
<div id="hm-kok"></div>
<noscript><p style="padding:24px">Bu prototip JavaScript gerektirir.</p></noscript>
<script src="${BOOTSTRAP_JS}"></script>
<script src="${CHART_JS}"></script>
<script>
document.documentElement.lang = 'tr';
${appJs}
HM.baslat();
</script>`;

mkdirSync(join(kok, 'dist'), { recursive: true });
writeFileSync(join(kok, 'dist', 'artifact.html'), `${bas}\n${govde}\n`, 'utf8');
writeFileSync(join(kok, 'dist', 'index.html'), `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${bas}
</head>
<body>
${govde}
</body>
</html>
`, 'utf8');

const kb = (s) => (Buffer.byteLength(s, 'utf8') / 1024).toFixed(0);
console.log(`ikon: ${adlar.size} | bootstrap harici url: ${disUrl} | em/en dash: ${dash.length}`);
console.log(`artifact.html: ${kb(bas + govde)} KB (bootstrap ${kb(bootstrapCss)} KB, tema ${kb(temaCss)} KB, js ${kb(appJs)} KB, sprite ${kb(sprite)} KB)`);
