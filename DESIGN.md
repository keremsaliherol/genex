# Design System: Hesap Masası ("Masa" yönü)

Müşteri, hesap ve işlem yönetimi için iç operasyon konsolu (ASP.NET Core MVC + Oracle). Bu dosya `prototype/src/`
katmanlarının (tokens, shell, components) ve onlardan üretilen `wwwroot/css/theme.css`'in tek doğruluk kaynağıdır.
Faz 6'da (görsel yenileme) "Kurumsal güven / kobalt" yönünün yerini aldı.

## 1. Visual Theme & Atmosphere
Bir aracı kurumun operasyon masası: veri yoğun, kesin, gürültüsüz; ama sıradan bir yönetim paneli gibi değil, işlem
salonunun ciddiyetini taşıyan. Renk dili Genex Yazılım'ın kendi tasarım token'larından türetildi (sitelerinin CSS'i:
`--secondary: #1a1a2e`, `--primary: #7b1d1a`, `--primary-light: #a52a27`, `--accent: #e63946`, kahraman degradesi
`#0f0f1a → #1a1a2e → #2d2d44`). Firma adı ve logosu kullanılmaz; yalnız görsel dil yansıtılır.

Okuma: Genex mülakatı için sermaye piyasası arka ofis konsolu, "işlem salonu hassasiyeti" dili. Yoğunluk 7/10,
varyans 5/10 (ürün arayüzü), hareket 5/10 (anlamlı ve kısa; hareket azaltmada kapalı).

**İmza öğeleri** (her biri bir şey anlatır):
- **Lacivert kenar menü** her iki temada Genex gece lacivertinde; aktif sayfa sol kenarda kızıl çizgiyle. Yapısal öğedir,
  sayfa ortasında tema değiştiren bölüm değildir.
- **Genişlik ekseni:** Mona Sans başlıklarda geniş (%112), büyük rakamlarda dar (%84) kesilir; rakamlar borsa panosu gibi okunur.
- **İşlem akışı şeridi** (genel bakış): gerçek son işlemler BIST kayan yazısı gibi yavaşça akar; üstüne gelince durur.
- **Oracle izi** her temada koyu bir terminaldir; üst kenarında Genex kızılı ince çizgi.
- **Giriş ekranı:** Genex kahraman degradesi üstünde, maskeli ve yukarı akan kurgusal bir defter.

Temel: Bootstrap 5.3 (resmi paket) + bu dosyadaki token katmanı. `--bs-*` değişkenleri token'lara bağlanır.

## 2. Color Palette & Roles
Nötrler Genex lacivertinin tonunda (240°). Rol ayrımı kesindir: **eylem lacivert, etkileşim vurgusu çivit, kimlik kızıl.**
Kızıl butonlarda ve verinin kendisinde kullanılmaz; yalnız kimlik öğelerinde (marka işareti, aktif gösterge, ışık) ve
çıkış tutarlarında (her zaman işaret ve ikonla).

| Rol | Açık | Koyu | Görev |
|---|---|---|---|
| Canvas | `#F3F3F7` | `#0F0F1A` | Sayfa zemini |
| Surface | `#FCFCFE` | `#151524` | Panel, tablo, form yüzeyi |
| Surface 2 | `#F6F6FA` | `#1B1B2E` | Tablo başlığı, iç zemin |
| Line / Line strong | `#E3E3EC` / `#CCCCDA` | `#2A2A40` / `#37374F` | Yapısal çizgiler |
| Ink / 2 / 3 | `#1A1A2E` / `#4B4B63` / `#6B6B82` | `#ECECF4` / `#A9A9C0` / `#8A8AA3` | Metin (en düşük kontrast 4,68:1) |
| **Action** | `#1A1A2E` (hover `#2D2D44`) | `#ECECF4` | Birincil buton dolgusu |
| **Accent** (çivit) | `#343A99` | `#A3A8F0` | Bağlantı, odak halkası, seçili satır |
| **Brand** (Genex kızılı) | `#A52A27`, degrade `#7B1D1A → #A52A27 → #C73E3A` | `#E63946` | Marka işareti, aktif gösterge |
| Credit | `#17744A` | `#55C592` | Giriş (+) tutarları, "Aktif" |
| Debit | `#A52A27` | `#F0827D` | Çıkış (−) tutarları, hata |
| Warn | `#935A00` | `#E8B45A` | Uyarı |

**Menü ve terminal** (iki temada aynı): menü `#1A1A2E → #10101C` degrade, metin `#B8B8CC` (8,7:1), soluk `#8484A0`
(4,7:1); terminal zemini `#0B0B14`, kod renkleri anahtar kelime `#A3A8F0`, metin `#7FD3A8`, bind `#E8B45A`.

**Grafik renkleri** (dataviz doğrulayıcısından geçti; açık zemin `#FCFCFE`, koyu `#151524`):
- Giriş / seri 1: `#4A50B8` açık, `#6C74E0` koyu. Çıkış (ıraksak kutup): `#A52A27` açık, `#E0544F` koyu.
- Seri 2 (hesap dağılımı): `#C27C0E` açık, `#B57A1C` koyu.
- Çiftler grafik başına doğrulandı (nakit akışı: seri 1 + çıkış; dağılım: seri 1 + seri 2).

## 3. Typography Rules
- **Arayüz:** Geist 400/500/550/600. **Veri:** Geist Mono 400/500 (tutar, hesap no, SQL, zaman); tablo sütunlarında
  `tabular-nums`. **Başlık ve büyük rakam:** Mona Sans (ağırlık 200-900, genişlik %75-125).
- Genişlik ekseni anlam taşır: sayfa başlığı, marka adı, boş durum ve modal başlığı **geniş** (`--stretch-wide: 112%`);
  kahraman rakamı, KPI, bakiye ve dekont tutarı **dar** (`--stretch-narrow: 84%`, orantılı rakam).
- Ölçek: 12 / 13 / 14 / 16 / 20 / 24 / 30 / 40 / 52. Gövde 14, tablo 13, sayfa başlığı akışkan 26-34/650, panel başlığı 15/600.
- Cümle düzeni, başlıkta `text-wrap: balance`, paragrafta `pretty`, satır en fazla 65 karakter. Vurgu aynı ailede renkle
  ya da kalınlıkla (giriş başlığında kızıl "tek masada"). Serif ve Inter yok.
- Fontlar yerelde (Fontsource, OFL-1.1; latin + latin-ext), `tools/on-yuz-varliklari.mjs` kopyalar; ana metin fontu önyüklenir.

## 4. Component Stylings
- **Şekil kilidi:** kontrol 8px, panel 14px, rozet 5px; açılır menü ve seçici 12px, modal 16px. Pill yok.
- **Butonlar:** birincil lacivert dolgu, üstte 1px iç ışık; üzerine gelince 1px yükselir ve gölgesi büyür; basışta
  `scale(.97)` kısa esnemeyle döner. İkincil: yüzey + çizgi + küçük gölge. Her ekranda tek birincil eylem.
- **Paneller:** yüzey + 1px çizgi + lacivert tonlu yumuşak gölge (`--shadow-panel`, tek ışık kaynağı üstte).
- **Kahraman (genel bakış):** asimetrik iki kolon; solda tek ana rakam (toplam bakiye, 40-52px dar kesim) ve 30 günlük
  birikimli net akış çizgisi, sağda üç ikincil gösterge. Köşelerde çok hafif çivit ve kızıl ışık.
- **Tablolar:** satır 44px, başlık soluk; tıklanabilir satırın üzerindeyken sol kenarda 3px çivit çizgi.
- **Rozetler:** işlem tipi nötr; renk yalnız anlam taşıyorsa (Aktif, uyarı, hata). Kurumsal müşteri baş harfi lacivert dolgu.
- **Formlar:** etiket üstte, 38px yükseklik, üzerine gelince çizgi koyulaşır, odakta 4px çivit halka.
- **Durumlar:** iskelet (döner çember yok), boş durum (başlık Mona Sans geniş), hata (neden + çözüm + teknik detay).
- **İkonlar:** Phosphor Regular, SVG sprite. Emoji yok.

## 5. Layout Principles
- Kabuk: 248px lacivert menü + ana kolon (içerik en fazla 1520px). 1024-1279px'de 72px ikon rayı, 768px altında offcanvas.
- Üst çubuk 60px, cam (arka plan bulanıklığı; destek yoksa ya da şeffaflık azaltılmışsa düz zemin).
- Özet önce: kahraman ya da KPI şeridi, sonra işlem akışı, sonra grafik ve tablolar. Üç eş kart dizisi yok.
- Filtreler kapsadıkları içeriğin üstünde tek satırda; URL sorgusuna yazılır. Geniş tablolar kendi kabında kayar.

## 6. Motion & Interaction
- Her animasyonun bir görevi var: **sayfa girişi** blokları okuma sırasıyla 50ms arayla yukarı doğru getirir (520ms);
  **sayma** anahtar tam sayı göstergelerine dikkati çeker (900ms, ekran okuyucu son değeri okur); **grafik çizimi**
  verinin nereden büyüdüğünü gösterir (700ms, yalnız ilk açılışta); **işlem akışı** masanın canlı akışını anlatır
  (70s döngü, üstüne gelince ya da odakta durur); **giriş defteri** konunun kendi malzemesidir (48s döngü).
- Hover/press 160-240ms, çıkış eğrisi `cubic-bezier(.16,1,.3,1)`; basışta küçük esnek eğri.
- `prefers-reduced-motion: reduce`'da hepsi kapanır (şerit yatay kaydırılabilir listeye döner). Sayfada tek kayan şerit.
- Görünür klavye odağı (2px çivit halka + 2px boşluk).

## 7. Anti-Patterns (Banned)
- Emoji, Inter, serif, saf siyah ve saf beyaz, mor/mavi AI degradesi, neon parlama, özel imleç.
- Kızılı eylem ya da veri rengi olarak kullanmak (çıkış tutarı hariç, o da işaret ve ikonla).
- Her bloğa aynı gölge; kartlara renkli kenar şeridi; üç eş kart satırı; dekoratif durum noktası (yalnız veritabanı
  bağlantısı gibi gerçek durum).
- Em-dash ve en-dash (aralıklar kısa çizgiyle).
- Klişe adlar, sahte-kesin sayılar (tüm veriler "Demo verisi, kurgusal" ve veriden hesaplanır). Anonim giriş sayfası
  veritabanından veri göstermez.
- Yalnız renkle anlam; grafikte çift eksen, her noktaya sayı, kesikli ızgara.
- "Oops", ünlem, özür dileyen hata mesajları; "Submit" gibi belirsiz buton adları.

## 8. Extreme görünüm (Faz 7)
Görünüm menüsünde Sistem / Açık / Koyu'nun yanında dördüncü seçenek. Aynı uygulama, aynı veri ve formlar; kabuk ve
sunum sahneye dönüşür. Kaynak `wwwroot/css/extreme.css` ve `wwwroot/js/extreme.js` (Razor'a özgü, prototipte yok).
Seçim localStorage `hm-tema = extreme`; ilk boyamadan önce html'e `data-extreme` konur, koyu temanın token'ları üstüne
extreme token'ları yazılır.

- **Okuma:** gece seansında bir işlem salonu. Zemin `#07070F`, üstünde yavaşça kayan kızıl ve çivit ışık, ince doku ve
  imleci izleyen yumuşak ışık. Kızıl bu görünümde enerji rengidir (perde, ilerleme çizgisi, damga, çıkış bandı);
  birincil düğme açık zemin, üzerine gelince soldan kızıl dolar.
- **Sorgu perdesi (imza):** her ekran değişiminde Genex degradesinde bir perde iner; hedef ekranın adı Mona Sans'ın
  genişlik ekseninde %125'ten %75'e daralır. Yeni ekran açılırken o isteğin Oracle izinden okunan SQL'i (varsa PL/SQL
  çağrısı) perdeye yazılır, sonra perde kalkar. Bağlantılar, tıklanabilir satırlar ve sayfa değiştiren formlar perdeden
  geçer; yeni sekme, CSV indirme ve API dokunulmaz. Herhangi bir tuş ya da tık perdeyi hemen kaldırır, en geç 2 sn'de kalkar.
- **Kabuk:** kenar menü yok, içerik kenardan kenara. Menü düğmesi tam ekran bir perde açar (düğmeden daire olarak);
  modüller dev yazıyla, yanlarında okudukları Oracle nesneleri (`MUSTERI`, `PKG_ISLEM` ...).
- **Tipografi:** sayfa başlığı 9,5rem'e kadar, açılışta harfler maskeli satırdan yükselir; kaydırdıkça geniş kesimden
  dar kesime iner ve söner, hızlı kaydırmada eğilir. Büyük rakamlar sayaç gibi 0'dan dönerek yerine oturur.
- **Yüzeyler:** panel, kart, gölge yok; bloklar ince bir üst çizgiyle ayrılır ve görünür alana girdikçe sırayla gelir.
  Tablolar defter satırı; üzerindeyken kızıl kenar çizgisi ve müşteri adı genişler.
- **Genel bakış:** tüm ekran kahraman; toplam bakiye dev dar kesim, arkasında son 30 günün nakit akışı ışıktan bir nehir
  (girişler üstte çivit, çıkışlar altta kızıl, kalınlık o günün tutarı; imleç nehri iter). Son işlemler iki kesişen bant:
  açık bant girişler sağa, kızıl bant çıkışlar sola akar; hız kaydırma hızıyla artar, yukarı kaydırınca yön döner.
  En aktif müşteriler sabitlenen bir sahnede yatay geçer (kaydırmaya bağlı zaman çizelgesi). Grafik görünür alana
  gelince çubuk çubuk çizilir.
- **Dekont:** sahnedeki tek kâğıt; yazıcıdan çıkar gibi basamaklarla iner, kenarları delikli, sonra "COMMIT" damgası vurulur.
- **Hareket tercihi:** Extreme'i seçmek açık bir hareket tercihidir; işletim sisteminin hareket azaltma ayarı bu görünümde
  uygulanmaz (diğer üç görünümde uygulanır). Kaydırmaya bağlı efektler yalnız destekleyen tarayıcıda; desteklemeyende
  içerik durağan ve eksiksiz görünür, sahne kartları yatay kaydırılır. Yazdırmada sahne öğeleri gizlenir.
- **Erişilebilirlik:** bölünmüş başlık `aria-label` ile bütün okunur; sayaçların son değeri görünmez metinde; bantların
  yalnız ilk dizisi odaklanabilir ve odakta bant durur; menü açıkken Tab menüde döner, Esc kapatır.

## Prototip notu
Prototip (`prototype/`) aynı CSS katmanlarını kullanır; ancak derlenmiş `dist/` fontları Google Fonts'tan yalnız Geist
olarak yükler (Mona Sans yok) ve Faz 6'nın yeni blokları (kahraman, işlem akışı, yeni giriş paneli) yalnız Razor
görünümlerindedir. Görsel doğrulama gerçek uygulamada yapılır.
