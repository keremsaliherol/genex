# Design System: Hesap Masası

Müşteri, hesap ve işlem yönetimi için iç operasyon konsolu (ASP.NET Core MVC + Oracle). Bu dosya prototipin (`prototype/`) ve sonraki fazda `wwwroot/css/theme.css`'in tek doğruluk kaynağıdır.

## 1. Visual Theme & Atmosphere
Sakin, kesin ve güven veren bir back-office arayüzü. Bir aracı kurumun operasyon masası: veri yoğun ama gürültüsüz, her rakam hizalı, her durum bir bakışta okunur. Yoğunluk "Daily App Balanced" ile "Cockpit Dense" arası (7/10), varyans "Predictable Symmetric" (3/10), hareket "Static Restrained" (3/10). Kartlar yalnız hiyerarşi gerektiğinde; gruplar 1px çizgilerle ayrılır. Tek imza öğesi: ekranın veritabanında ne çalıştırdığını gösteren **Oracle izi** paneli.

Temel: Bootstrap 5.3 (resmi paket) + bu dosyadaki token katmanı. Bootstrap'in CSS değişkenleri (`--bs-*`) token'lara bağlanır; bileşenler varsayılan Bootstrap görünümüyle bırakılmaz.

## 2. Color Palette & Roles
Nötrler hafif mavi eğilimlidir (kobalt vurguyla akraba). Tek vurgu rengi vardır; giriş/çıkış/uyarı renkleri semantiktir ve vurgu sayılmaz.

| Rol | Açık | Koyu | Görev |
|---|---|---|---|
| Canvas Mist | `#F3F5F8` | `#0E121A` | Sayfa zemini |
| Ledger Surface | `#FCFCFD` | `#151B25` | Panel, tablo, form yüzeyi |
| Row Wash | `#F7F8FA` | `#1B2230` | Tablo başlığı, hover, kod bloğu |
| Hairline | `#E2E6ED` | `#273142` | 1px yapısal çizgiler |
| Ink | `#141A26` | `#E6EAF1` | Ana metin |
| Ink Secondary | `#525C70` | `#A6B0C2` | İkincil metin, etiket |
| Ink Muted | `#6B7489` | `#8791A5` | Yer tutucu, meta (yalnız yüzey üzerinde) |
| **Cobalt** (tek vurgu) | `#2446C8` | `#7D96F2` | Birincil eylem, bağlantı, odak halkası, aktif menü |
| Cobalt Wash | `#E9EEFC` | `#1C2748` | Aktif menü zemini, seçili satır |
| Credit | `#17744A` / zemin `#E7F4ED` | `#55C592` / `#12291F` | Giriş (+) tutarları, "Aktif" |
| Debit | `#B42318` / zemin `#FCEBE9` | `#F28B82` / `#3A1A18` | Çıkış (-) tutarları, hata |
| Warn | `#935A00` / zemin `#FDF3DB` | `#E8B45A` / `#33270F` | Uyarı |

**Grafik renkleri** (dataviz doğrulayıcısından geçti; açık zemin `#FCFCFD`, koyu zemin `#151B25`):
- Seri 1 / giriş: `#2446C8` açık, `#5B78E6` koyu.
- Çıkış (ıraksak kutup): `#B42318` açık, `#e66767` koyu. Mavi-kırmızı çifti CVD ΔE 27,5 (açık) / 20,4 (koyu).
- Seri 2: `#eb6834` açık, `#d95926` koyu.
- Yeşil-kırmızı çifti grafiklerde kullanılmaz: koyu temada deuteranopi ΔE 3,4 ile başarısız. Tablolarda yeşil/kırmızı tutarlar her zaman +/- işaretiyle birlikte gelir.

## 3. Typography Rules
- **Sans:** Geist 400/500/600 (arayüz ve başlıklar). Dashboard olduğu için serif yok.
- **Mono:** Geist Mono 400/500 (tutarlar, müşteri/hesap no, SQL, zaman damgası). Tablo sütunlarında `tabular-nums`; büyük tekil rakamlarda orantılı rakam.
- **Ölçek:** 12 / 13 / 14 / 16 / 20 / 24 / 30 px. Gövde 14, tablo 13, sayfa başlığı 24/600, panel başlığı 14/600, etiket 13/500.
- **Kurallar:** Cümle düzeni ("Yeni müşteri"), başlıklarda `text-wrap: balance`, metin satırı en fazla 65 karakter, küçük büyük harf etiketlerde +0.04em aralık. Inter yok. Türkçe karakterler latin-ext alt kümesiyle gelir; üretimde font self-host edilir.

## 4. Component Stylings
- **Butonlar:** Kontrol yarıçapı 6px. Birincil: Cobalt dolgu, beyaz metin; ikincil: yüzey + Hairline çerçeve; üçüncül: metin bağlantısı. Basışta `scale(.98)`. Parlama, gölge yok. Her ekranda tek birincil eylem.
- **Paneller:** 10px yarıçap, 1px Hairline, gölgesiz. Gölge yalnız dropdown, modal ve Oracle izi paneline, mürekkep tonlu (`rgba(20,26,38,.10)`).
- **Rozetler:** 4px yarıçap, 12px/500, soluk zemin + koyu metin, gerekiyorsa ikon. Pill yok. Renk yalnız anlam taşıyorsa (Aktif/Pasif, hata); işlem tipi rozetleri nötrdür, tutarın rengi bakiye etkisini anlatır.
- **Tablolar:** Satır 40px, hücre 8×12px, yalnız alt çizgi, hover Row Wash, yapışkan başlık, sayılar sağa hizalı mono. Sıralanabilir başlıklar `aria-sort` taşır.
- **Formlar:** Etiket üstte, zorunlu işareti, yardım metni altta, hata metni altta (Debit). Blur'da doğrulama; gönderimde hata özeti + ilk hatalı alana odak. Yer tutucu etiket yerine geçmez.
- **Durumlar:** Yükleniyor = sayfa şeklinde iskelet (döner çember yok); Boş = ne olduğunu ve nasıl doldurulacağını söyleyen kompozisyon + tek eylem; Hata = neden + çözüm + katlanır teknik detay (ORA kodu, istek kimliği).
- **İkonlar:** Phosphor Regular, 20px (tabloda 16px), tek aile, SVG sprite. Emoji yok.
- **Oracle izi:** Ana kolonun altına yapışık 36px durum çubuğu; tıklanınca 340px panel. Girdi: katman çipi (EF Core, Dapper, Paket, Trigger, View), renklendirilmiş SQL, bind tablosu, etkilenen satır, temsili süre.

## 5. Layout Principles
- Kabuk: 232px sidebar + ana kolon. 1024-1279px'de 64px ikon rayı, 768px altında offcanvas. İçerik kenar boşluğu 24px, en fazla 1600px.
- Üst çubuk 56px: breadcrumb, genel arama (Ctrl+K), Oracle izi, kullanıcı menüsü.
- Özet önce, detay sonra: KPI şeridi (çizgiyle ayrılmış tek satır), sonra grafik ve tablo. Üç eş kart dizisi yok.
- Filtreler kapsadıkları içeriğin üstünde tek satırda; URL sorgusuna yazılır.
- Geniş tablolar kendi kabında yatay kayar; sayfa gövdesi yatay kaymaz.

## 6. Motion & Interaction
- Hover/press 150-200ms ease-out, panel/offcanvas 220ms. Otomatik veya dekoratif animasyon yok.
- Sayfa geçişlerinde yapay bekleme yok; iskelet yalnız gerçekten yükleniyorsa.
- Grafiklerde hover katmanı varsayılan: çizgide crosshair + tooltip, çubukta işaret başına tooltip; her grafikte "Tablo olarak göster".
- `prefers-reduced-motion`'da tüm geçişler kapanır. Görünür klavye odağı (2px Cobalt halka + 2px boşluk).

## 7. Anti-Patterns (Banned)
- Emoji, Inter, serif, saf siyah `#000000`, saf beyaz zemin, mor/mavi AI gradyanı, neon parlama.
- Her bloğa aynı yarıçap + gölge; kartlara renkli kenar şeridi; üç eş kart satırı.
- Em-dash ve en-dash (tarih/sayı aralıkları kısa çizgiyle yazılır).
- Klişe adlar (Ahmet Yılmaz, Acme), sahte-kesin sayılar (tüm veriler "Demo verisi, kurgusal" etiketli ve veriden hesaplanır).
- Yalnız renkle anlam: giriş/çıkış her zaman işaret ve ikonla, durumlar etiketle.
- Grafikte çift eksen, her noktaya sayı, kesikli ızgara, mark etrafına çerçeve.
- "Oops", ünlem, özür dileyen hata mesajları; "Submit" gibi belirsiz buton adları.
