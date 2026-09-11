# Devir notları: Hesap Masası

Yeni bir oturumun kaldığı yerden devam edebilmesi için güncel durum, kararlar ve kalan işler.
Son güncelleme: 11 Eylül 2026 (Faz 6 sonu: görsel yenileme, "Masa" tasarım yönü). Şifreler bu dosyada yok;
yerel değerler `CLAUDE.md`'de.

## 1. Durum

| Aşama | Durum | Çıktı |
|---|---|---|
| Arayüz planı | Tamam | [arayuz-plani.md](arayuz-plani.md), [../DESIGN.md](../DESIGN.md) |
| Tıklanabilir prototip | Tamam | `prototype/`, [ekran görüntüleri](ekran/), [Artifact](https://claude.ai/code/artifact/9dbfff5a-86d3-49b0-9a09-662219abb534) |
| Ortam kurulumu | Tamam | .NET SDK 10.0.401, WSL 2.7.13, Docker Desktop, `hesap-oracle` konteyneri |
| Faz 1: altyapı | Tamam, doğrulandı | `db/`, `MusteriHesapYonetimi.slnx`, `GET /saglik`, README |
| Faz 2: müşteri ve hesap CRUD | Tamam, doğrulandı | Kabuk ve tema, S2-S7, S11, genel bakışın gösterge kısmı |
| Faz 3: işlemler, dekont, ekstre, Oracle izi | Tamam, doğrulandı | S8, dekont, S9, Oracle izi paneli |
| Faz 4: raporlar ve grafikler | Tamam, doğrulandı | S10, S1 grafikleri, detaylarda "Aylık özet" sekmesi |
| Faz 5: giriş, testler, sunum | Tamam, doğrulandı | S0 ve Identity (`db/05_identity.sql`), 138 birim + 12 entegrasyon testi, yerel fontlar, [demo senaryosu](demo-senaryosu.md) |
| Faz 6: görsel yenileme | Tamam, doğrulandı | "Masa" tasarım yönü ([../DESIGN.md](../DESIGN.md)): Genex renk dili, Mona Sans, kahraman, işlem akışı şeridi, yeni giriş paneli |
| **Kalan (kullanıcıda)** | Demo kaydı; demo günü tohum yenilemesi | Bölüm 7 |

Depo: https://github.com/keremsaliherol/genex (`main`). Her doğrulanmış adım commit edilip push'lanır (CLAUDE.md, "Git ve GitHub").

Faz 1 doğrulaması: kurulum betiği temizler, kurar ve doğrular. Sonuç: 180 müşteri, 281 hesap, 10.997 işlem,
bakiye tutarsızlığı 0, hatalı transfer çifti 0, paket duman testi geçti.

Faz 2 doğrulaması (tarayıcı paneli): Türkçe sıralama 175 adda `Intl.Collator('tr')` ile birebir; Türkçe arama ("ipek" → İpek);
canlı filtre sayfa yenilemeden; form hataları birlikte; açılış tutarı PKG_ISLEM.YATIR ile; pasife alma kuralları.

Faz 3 doğrulaması (tarayıcı paneli, konsol ve sunucu günlüğü temiz):
- Transfer 1001-51125307-01 → 1001-30144651-01, ₺2.500: önizleme, onay diyaloğu, dekontta aynı referanslı iki kayıt
  ve işlem sonrası bakiyeler önizlemeyle aynı.
- "Yine de gönder" ile ₺99.999.999 çekme: PKG_ISLEM ORA-20001 döndü, form "veritabanında reddedildi" gösterdi, bakiye değişmedi.
- Hisse satımı (BIMAS 1 adet): satış listesi yalnız portföydeki hisseler, pozisyon 67 → 66, dekontta birim fiyat.
- Ekstre: dönem başı + giriş − çıkış = son satırın yürüyen bakiyesi = güncel bakiye; CSV BOM'lu, noktalı virgüllü.
- Oracle izi (₺1,00 yatırma): POST isteğinin izinde bakiye önce, `PKG_ISLEM.YATIR` (OUT `islem_id`), bakiye sonra,
  trigger girdisi ("Uygulama BAKIYE'yi yazmadı") ve COMMIT; redirect sonrası GET ayrı grupta.

Faz 4 doğrulaması (her sayı sqlplus'ta ayrı sorguyla karşılaştırıldı; konsol ve sunucu günlüğü temiz):
- Genel bakış: 30 günlük yatırma ₺24.197.535,21 / çekme ₺7.440.174,34; en aktif ilk 5 doğrudan GROUP BY ile aynı.
- Aylık özet 1001-55510734-02, Eylül 2026: net +₺818.412,38; müşteri kapsamı (Göksu Mobilya, 2 hesap) +₺1.133.705,41.
- Bakiye değişimi, son 90 gün: açılış ₺3.666.127,62 (`p_acilis` OUT), kapanış ₺8.098.763,13 = güncel bakiye = paketin
  son BAKIYE'si; en aktif "tüm kayıtlar" `VW_EN_AKTIF_HESAPLAR`'dan. Tema değişince grafikler token'lardan yeniden kurulur.

Faz 5 doğrulaması:
- Giriş (tarayıcı paneli, sqlplus): `db\kur.ps1` 6 adımda 15 sn; `ASPNET_*` tabloları ve dizinleri. Açılışta "Yönetici hesabı
  oluşturuldu"; `PASSWORD_HASH` Identity v3 (PBKDF2). Oturumsuz `/` → `/Giris?donus=%2F`, diğer sayfalar dönüş adresiyle,
  `/api/*` 401, `/saglik`, CSS/JS ve `/Hata/404` anonim. Boş gönderimde iki alan hatası; parola göster/gizle.
  Var olmayan e-postayla deneme ve başarılı giriş kullanıcı tarafından yapıldı (Claude tarayıcıda parola girmez): genel hata
  mesajı; `/`'ye dönüş, menüde "AD / admin". POST `/Giris`'in komutları Oracle izinde yok. Oturumu kapat: `/Giris` +
  "Oturum kapatıldı." bildirimi. Kilitlenme (5 deneme, 5 dk) Identity yapılandırmasıyla, tarayıcıda denenmedi.
- Entegrasyon testleri: 12 test gerçek Oracle'a karşı 4 sn'de geçti (model uyumu 2, paket ret 5, rapor tutarlılığı 5);
  bağlantı boşken (`ConnectionStrings__HesapMasasi=' '`) 12'si "Atlandı". Birim testleri 138.
- Yerel fontlar (tarayıcı paneli): Geist ve Geist Mono × latin/latin-ext, 4 yüz yüklü; `document.fonts.check` Türkçe
  (ğ ş ı İ ç ö ü) ve ₺ − • için doğru; gövde Geist, ekstre dokusu Geist Mono; dış kaynağa istek yok; önyüklenen ana font
  bir kez indirildi.

Faz 6 (görsel yenileme, "Masa" yönü; kurallar [../DESIGN.md](../DESIGN.md)):
- Renk dili Genex'in kendi sitesinin CSS token'larından: gece laciverti `#1A1A2E`, kızıl `#7B1D1A`/`#A52A27`/`#E63946`,
  kahraman degradesi `#0F0F1A → #1A1A2E → #2D2D44`. Firma adı ve logosu kullanılmaz. Rol ayrımı: eylem lacivert, etkileşim
  çivit (`#343A99`), kızıl yalnız kimlik öğeleri ve çıkış tutarları. Grafik renkleri dataviz doğrulayıcısından geçti.
- Fontlar: Geist (arayüz), Geist Mono (veri), Mona Sans (değişken genişlik: başlık %112 geniş, büyük rakam %84 dar);
  6 yüz yerelde, `tools/on-yuz-varliklari.mjs` Fontsource paketlerinden kopyalar.
- İmza öğeleri: iki temada lacivert kenar menü ve kızıl aktif çizgi; genel bakışta kahraman (toplam bakiye + 30 günlük
  birikimli net akış çizgisi + üç gösterge) ve gerçek son işlemlerden "İşlem akışı" şeridi; Oracle izi her temada koyu
  terminal; giriş panelinde Genex degradesi üstünde akan maskeli kurgusal defter.
- Hareket: sayfa girişi (kademeli), sayaçlar, grafik çizimi (yalnız ilk açılış), şerit ve defter döngüsü. Hepsi
  `prefers-reduced-motion: reduce`'da kapalı; şerit o durumda ince kaydırma çubuklu yatay listeye döner.
- Doğrulama (tarayıcı paneli, 1440×900 ve 390 px, açık ve koyu tema): Mona Sans / Geist / Geist Mono yüklü, Türkçe
  glifler doğru; kahraman 643/476 px iki kolon, 390 px'te tek kolon, yatay taşma yok; şeritte 20 öğe (ikinci kopya
  `aria-hidden`, bağlantıları `tabindex=-1`); Müşteriler, Hesap detay, İşlem yap, Dekont, Bakiye değişimi ve giriş sayfası
  iki temada gözden geçirildi. Açık temada Oracle izi grup başlıkları terminal renginde (`#9696B0` / `#DCDCE8` zemin
  `#0B0B14` üstünde). Animasyon anahtar kareleri (`belir`, `akis`, `defter`) CSS'te; panel hareket azaltmayı taklit ettiği
  için akış zorlanarak ölçüldü (defter −210 → −490 px). Sunucu günlüğü temiz; konsoldaki 401/404 kayıtları önceki bilinçli
  denemelerden.

## 2. Yeni oturuma başlarken

1. Docker Desktop açık olmalı: `docker start hesap-oracle` (bağlantı `localhost:1521/FREEPDB1`, kullanıcı `hesap`).
2. Oturum bir kurulumdan önce başladıysa PATH güncel değildir; tam yollar:
   `C:\Program Files\dotnet\dotnet.exe`, `C:\Program Files\Docker\Docker\resources\bin\docker.exe`.
3. Uygulamayı çalıştırıp `http://localhost:5080` açılır; `/saglik` `gecersizNesne: 0` döndürmeli. Sayfalar oturum ister:
   geliştirmede giriş sayfası demo hesabını gösterir (parola user-secrets `Yonetici:Parola`, yereli `CLAUDE.md`'de).
4. Tohum veri üretildiği güne göre hazırlanır (son 190 gün). Şu anki `03_seed.sql` 10 Eylül'e kadar; farklı bir günde
   "bugünkü işlemler" boş görünür. Demodan önce yeniden üretilip kurulur ([demo-senaryosu.md](demo-senaryosu.md), "Hazırlık").
5. 5080'i başka bir oturumdan kalan `MusteriHesapYonetimi.Web.exe` tutuyorsa derleme DLL'leri yazamaz; o süreç durdurulur.

## 3. Komutlar

```powershell
# Veritabanını sıfırdan kur (temizle, şema, PL/SQL, kimlik tabloları, tohum veri, doğrulama). Tekrar çalıştırmak güvenli.
# Kimlik tabloları da sıfırlanır: çalışan uygulama yeniden başlatılır, yönetici hesabı açılışta yeniden oluşur.
node db/tools/tohum-uret.mjs
$env:HESAP_DB_SIFRE = '<hesap kullanıcısının şifresi>'
powershell -NoProfile -ExecutionPolicy Bypass -File db\kur.ps1

# Ön yüz varlıkları: theme.css (prototipten), ikon sprite'ı, wwwroot/lib/chart.js ve wwwroot/fonts + css/fontlar.css
# (prototype/node_modules'tan). Yeni ikon, prototip CSS'i ya da paket sürümü değişince; ardından Web yeniden derlenir.
node tools/on-yuz-varliklari.mjs

# Uygulama (user-secrets hazır: ConnectionStrings:HesapMasasi, Yonetici:Parola)
dotnet run --project src/MusteriHesapYonetimi.Web --urls http://localhost:5080

# Birim testleri (veritabanı gerekmez)
dotnet test tests/MusteriHesapYonetimi.Tests
# Entegrasyon testleri (Oracle; bağlantı Web'in user-secrets'ından ya da ConnectionStrings__HesapMasasi'dan, yoksa atlanır)
dotnet test tests/MusteriHesapYonetimi.EntegrasyonTestleri

# Prototip (http://localhost:5173)
node prototype/build.mjs
node prototype/serve.mjs
```

`.claude/launch.json` iki yapılandırma içerir: `web` (5080) ve `prototip` (5173); tarayıcı paneli bunları başlatır.

## 4. Mimari kararlar

| Karar | Neden |
|---|---|
| Katmanlar: Domain ← Application ← Data; Web her üçüne; birim testleri Domain + Application'a, entegrasyon testleri Data'ya bağlı | Şartnamedeki klasör yapısı; Controller'da iş mantığı yok |
| Servis arayüzleri ve saf iş kuralları Application'da, gerçekleme Data'da | Kurallar veritabanı olmadan test edilir |
| İş kuralı ihlali istisna değil `Sonuc` döner (alan + mesaj + isteğe bağlı ORA kodu) | Web alanlı hatayı ModelState'e, alansızı bildirime aktarır; veritabanı reddi ayrıca gösterilir |
| Para hareketi kuralları yalnız PKG_ISLEM'de; uygulama pakete gitmeden önce yalnız zorunlu alan ve tutar biçimini kontrol eder | Kuralın tek kaynağı PL/SQL. Arayüzdeki bakiye/pozisyon kontrolü yalnız erken uyarı; "Yine de gönder" veritabanı reddini gösterir |
| `PaketHatalari`: ORA-200xx → form alanı (20001 → Tutar ya da Adet, 20012 → Hedef hesap, "Hedef ..." mesajı → hedef alanı) | Hata doğru alanın altında; teknik detayda ORA kodu. Entegrasyon testleriyle gerçek paket üzerinde doğrulanır |
| PKG_ISLEM çağrısı Dapper ile, isimli bağlama (`p_x => :x`), transaction .NET'te (`OracleTransaction`); hata olursa ROLLBACK | Paketler COMMIT etmez; transferin iki kaydı birlikte yazılır ya da hiçbiri |
| Dekonttaki işlem sonrası bakiye: güncel bakiye − sonraki hareketlerin işaretli toplamı | Ek kolon gerekmez; trigger kuralıyla aynı işaret |
| Ekstre Dapper ile: dönem başı bakiye `NVL(SUM(...))`, yürüyen bakiye `SUM() OVER (ORDER BY ISLEM_TARIHI, ISLEM_ID)`; tarih koşulu aralık | IDX_ISLEM_HESAP_TARIH kullanılır; tip filtresi yalnız gösterilen satırları daraltır |
| CSV: `;` ayırıcı, UTF-8 BOM, tr-TR ondalık virgül; serbest metin `=+-@` ile başlıyorsa önüne `'` (`CsvDosyasi`) | Türkçe Excel doğrudan açar; formül enjeksiyonu önlenir |
| **Oracle izi:** her sayfa isteğine `AsyncLocal` iz bağlamı (middleware, çerezle tarayıcı); EF Core komutları `DbCommandInterceptor`'dan, Dapper komutları `IzliDapper`'dan geçer; tarayıcı başına son 40 komut bellekte | Controller ve servisler izden habersiz; POST → Redirect → GET'te kaydetme komutları da görünür |
| İzde başlık EF Core `TagWith` etiketinden; yoksa paket adı veya fiil + tablolar; `QueryIzliAsync` isteğe bağlı not alır | Etiket SQL'in içinde de görünür; not paket gövdesinin ne yaptığını anlatır |
| İşlemde iz açıksa bakiye çağrıdan önce ve sonra okunur, trigger'ın etkisi, COMMIT veya ROLLBACK ayrı girdi olarak yazılır | Trigger'ın UPDATE'i istemciye görünmez; panel "uygulama BAKIYE'yi yazmadı" gösterir |
| Oracle izi varsayılan yalnız Development'ta (`OracleIzi:Acik`); SQL renklendirme sunucuda | Üretimde bind değerleri gösterilmez |
| **Raporlar:** PKG_RAPOR Dapper ile; `OracleParametreleri.RefCursor` çıktısı ODP.NET'te komutun sonuç kümesi olarak döner | Şartname 5.2 ve Faz 4: stored procedure + REF CURSOR, .NET'te Dapper |
| REF CURSOR satırları kolon adlarıyla aynı büyük harfli özellikli özel sınıflara okunur | Paket sorgusunun kolonları çağıranda yeniden adlandırılamaz; global Dapper ayarı değiştirilmez |
| `BAKIYE_DEGISIMI`: `p_acilis` OUT, yürüyen bakiye paket içinde; özet `BakiyeDegisimOzeti.Hesapla` ile yeniden hesaplanır | İki bağımsız hesap aynı çıkmalı: kapanış = paketin son BAKIYE'si = güncel bakiye (entegrasyon testi) |
| En aktif: dönemli raporda `PKG_RAPOR.EN_AKTIF`, "tüm kayıtlar"da `VW_EN_AKTIF_*` (sıralama sorguda); genel bakışta son 30 gün, ilk 5 | View tarih süzgeci almaz; iki yol da izde görünür, entegrasyon testi aynı sonucu verdiklerini denetler |
| Rapor filtreleri `[FromQuery]` olmadan bağlanır (route veya sorgu); CSV bağlantıları açık değerlerle | `Url.Action(..., new { id })` id'yi yola koyar |
| **Grafikler:** Chart.js 4.4.1 `wwwroot/lib/chart.js`'te, yalnız `ViewData["Grafik"] = true` sayfalarında; veri `data-veri` JSON; renkler `--viz-*` token'larından, `hm:tema` olayında yeniden kurulur; her grafiğin tablo karşılığı | Sunucu çizer, JS yalnız iyileştirir; CDN yok; dataviz kuralları |
| **Oturum:** ASP.NET Core Identity (`AddIdentityCore` + `SignInManager` + Identity çerezleri), tek yönetici, rol yok (`IdentityUserContext`). Tüm uç noktalar `FallbackPolicy` ile oturum ister; `/Giris`, `/Hata`, statik dosyalar (`MapStaticAssets().AllowAnonymous()`) ve `/saglik` anonim | Controller'lara tek tek `[Authorize]` yazılmaz; yeni eklenen uç nokta unutulsa da korunur |
| Kimlik tabloları `db/05_identity.sql` ile; DDL `KimlikDbContext` modelinden EF'nin `GenerateCreateScript()` çıktısı (Bölüm 9). Bağlam adları tırnaksız büyük harfe eşler (`ASPNET_USERS`, `NORMALIZED_USER_NAME`), metinler VARCHAR2, bayraklar NUMBER(1) + CHECK | Şema betiklerle yönetilir, migration yok; model ile DDL aynı kaynaktan. .NET 10 şema sürümleri bu bağlamda aynı 4 tabloyu üretir |
| Yönetici hesabı açılışta yoksa oluşturulur (`Yonetici:Eposta`, varsayılan `admin@hesapmasasi.local`; `Yonetici:Parola` user-secrets/ortam değişkeni). Veritabanı hazır değilse uygulama yine açılır, neden günlüğe yazılır | Parola koda ve depoya girmez; `kur.ps1` sıfırlamasından sonra hesap kendiliğinden döner |
| Kilitlenme 5 hatalı deneme / 5 dk; hata mesajı genel, kalan deneme sayısı gösterilmez; parola en az 10 karakter + Identity karakter kuralları | Hesap varlığı ele verilmez (kullanıcı adı taraması yapılamaz) |
| Çerez `hm-oturum` (HttpOnly, SameSite=Lax, 8 saat kayan); dönüş parametresi `donus` (`Url.IsLocalUrl`); `/api` isteklerinde yönlendirme yerine 401; çıkış POST + antiforgery | fetch giriş sayfasını JSON diye okumaz; açık yönlendirme ve CSRF'ye karşı |
| `KimlikDbContext` Oracle izine bağlanmaz | Bind değerlerinde parola özeti ve güvenlik damgası görünürdü |
| Giriş sayfası kabuksuz (`_YalinLayout`; iki layout'un ortak `<head>`'i `_BasEtiketleri`). Paneldeki ekstre dokusu sabit tohumlu kurgusal satırlar, hesap no maskeli; demo hesabı ipucu yalnız Development'ta ve parola ayardan okunur | Anonim sayfa veritabanından veri göstermez |
| **Entegrasyon testleri** ayrı projede (`MusteriHesapYonetimi.EntegrasyonTestleri`, Data'ya bağlı). Bağlantı Web projesinin user-secrets deposundan (aynı `UserSecretsId`) ya da `ConnectionStrings__HesapMasasi`'dan; tanımlı değilse `[OracleFact]` testi atlar. Veri değiştiren test yok: yalnız okuma ve paketin reddettiği (ROLLBACK edilen) işlemler, her birinde bakiye ve işlem sayısı öncesiyle aynı | Birim testleri veritabanısız hızlı kalır; Oracle olmayan CI kırmızıya dönmez; testler demo verisini bozmaz ve tekrar tekrar çalışır |
| **Fontlar yerelde:** Fontsource'un değişken Geist ve Geist Mono paketleri (OFL-1.1), yalnız latin + latin-ext alt kümeleri (~84 KB); `css/fontlar.css` paketin `@font-face` bloklarından üretilir, aile adları tema token'larıyla aynı; ana metin fontu `<link rel="preload">` (adres CSS'teki url ile birebir, sürüm eki yok) | Sayfalar dış kaynağa istek yapmaz (çevrimdışı demo, üçüncü tarafa istek yok). `geist` npm paketi Next.js'i peer bağımlılık olarak getirdiği için Fontsource. Türkçe ğ ş ı İ ve ₺ latin-ext'te |
| Hesap açma tek transaction: `MUSTERI ... FOR UPDATE` (EF `FromSql`) → EF insert → Dapper `PKG_ISLEM.YATIR` → COMMIT | Aynı müşteriye eşzamanlı iki açılış aynı EK_NO'yu alamaz |
| Türkçe sıralama ve arama: `NLSSORT(..., 'NLS_SORT=XTURKISH')` ve `NLS_UPPER` EF `DbFunction` eşlemesiyle | Oturum ayarı havuzdaki bağlantıda durum taşır; bu yol SQL'de görünür |
| Tutar alanları metin olarak bağlanır, `TutarMetni` ayrıştırır; istemcide aynı kural, tutarlar kuruş | tr-TR model bağlayıcı "8140.25"i 814025 okur |
| Hesabı olan müşterinin numarası değiştirilemez; pasife alma kuralları Application'da, `CK_HESAP_PASIF_BAKIYE` son güvence | Hesap numarası müşteri numarasını içerir |
| Liste filtreleri GET sorgu dizesinde; JS varken `fetch` + `DOMParser` ile liste ve Oracle izi paneli yenilenir; dönem formları `data-donem-form`, kendiliğinden gönderilen süzgeçler `data-oto-gonder` | Adres paylaşılabilir, geri tuşu çalışır, JS kapalıyken de form çalışır |
| İkonlar harici sprite, `theme.css` prototipten üretilir (`tools/on-yuz-varliklari.mjs`) | Prototip ile uygulama aynı token'lar |
| POST → Redirect → GET, TempData bildirimi; antiforgery tüm POST'larda | Yenilemede tekrar gönderim yok; CSRF'ye karşı |
| 19c uyumluluğu; enum ↔ veritabanı kodu (`VeritabaniKodu`); `bool` ↔ `NUMBER(1)`; kimlik kolonları `BY DEFAULT ON NULL`; HTTPS kapalı; `.slnx` | Geliştirme veritabanı 26ai, hedef 19c |

## 5. Veritabanı

**Tablolar:** `MUSTERI`, `HESAP` (+`EK_NO`), `HISSE`, `ISLEM` (+`REFERANS_NO`, `HISSE_KODU`, `ADET`, `BIRIM_FIYAT`).
Önemli kısıtlar: `UQ_MUSTERI_NO`, `CK_MUSTERI_NO_BICIM` (8 hane), `UQ_HESAP_NO`, `UQ_HESAP_MUSTERI_EK`,
`CK_HESAP_BAKIYE` (≥ 0), `CK_HESAP_PASIF_BAKIYE` (pasif hesabın bakiyesi 0), `CK_ISLEM_TRANSFER`, `CK_ISLEM_HISSE`.
İndeksler: `IDX_ISLEM_HESAP_TARIH` (ekstre), `IDX_ISLEM_TARIH`, `IDX_ISLEM_REFERANS` ve FK indeksleri.

**Kimlik tabloları** (`05_identity.sql`): `ASPNET_USERS` (`UQ_ASPNET_USERS_USER_NAME`, `IDX_ASPNET_USERS_EMAIL`,
`CK_ASPNET_USERS_BAYRAK`), `ASPNET_USER_CLAIMS`, `ASPNET_USER_LOGINS`, `ASPNET_USER_TOKENS` (FK'ler ON DELETE CASCADE).

**Trigger'lar:** `TRG_ISLEM_BAKIYE_GUNCELLE` (şartname 5.1), `TRG_ISLEM_DEGISMEZ` (ISLEM'de UPDATE/DELETE yasak).
**View'lar:** `VW_EN_AKTIF_MUSTERILER`, `VW_EN_AKTIF_HESAPLAR` (ORDER BY view'da değil sorguda), `VW_PORTFOY`.
**Sekans:** `SEQ_REFERANS` (90000'den; referans `TRF` + YYAAGG + 5 hane).

**Paketler:**
```sql
PKG_ISLEM.YATIR    (p_hesap_id, p_tutar, p_aciklama, p_islem_id OUT)
PKG_ISLEM.CEK      (p_hesap_id, p_tutar, p_aciklama, p_islem_id OUT)
PKG_ISLEM.TRANSFER (p_kaynak, p_hedef, p_tutar, p_aciklama, p_referans OUT, p_giden_islem_id OUT)
PKG_ISLEM.HISSE_AL (p_hesap_id, p_hisse_kodu, p_adet, p_islem_id OUT)
PKG_ISLEM.HISSE_SAT(p_hesap_id, p_hisse_kodu, p_adet, p_islem_id OUT)
PKG_RAPOR.AYLIK_OZET_HESAP  (p_hesap_id, p_yil, p_ay, p_sonuc OUT SYS_REFCURSOR)   -- ISLEM_TIPI, ISLEM_ADEDI, TOPLAM_TUTAR
PKG_RAPOR.AYLIK_OZET_MUSTERI(p_musteri_id, p_yil, p_ay, p_sonuc OUT SYS_REFCURSOR)
PKG_RAPOR.BAKIYE_DEGISIMI   (p_hesap_id, p_bas, p_bit, p_acilis OUT, p_sonuc OUT SYS_REFCURSOR)  -- bitiş günü dahil
PKG_RAPOR.EN_AKTIF          (p_tur 'MUSTERI'|'HESAP', p_bas, p_adet, p_sonuc OUT SYS_REFCURSOR)  -- ID, AD, TOPLAM_ISLEM, HACIM, SON_ISLEM
SP_AYLIK_ISLEM_OZETI        şartnamedeki isimle PKG_RAPOR.AYLIK_OZET_HESAP'ı çağırır
```
Transfer iki hesabı küçük `HESAP_ID` önce olacak şekilde `FOR UPDATE` ile kilitler (deadlock önlemi).

**Hata kodları** (arayüz eşlemesi `PaketHatalari`; mesajlar [arayuz-plani.md](arayuz-plani.md), "Hata eşleme"):

| Kod | Anlam | Form alanı |
|---|---|---|
| -20001 | Yetersiz bakiye (mesaj kullanılabilir bakiyeyi ₺ biçiminde verir) | Tutar; hisse alımında Adet |
| -20002 | Hesap veya sahibi müşteri pasif | Kaynak ya da hedef hesap (mesajın başına göre) |
| -20003 | Satılabilir hisse adedi yetersiz | Adet |
| -20006 | Hisse işlemi yalnız yatırım hesabında | İşlem tipi |
| -20008 / -20009 | Hesap / hisse bulunamadı | Hesap / Hisse |
| -20010 / -20011 | Geçersiz adet / geçersiz tutar | Adet / Tutar |
| -20012 | Aynı hesaba transfer | Hedef hesap |
| -20020 | ISLEM kaydı değiştirilemez | |
| ORA-00001 | Benzersizlik (müşteri no, hesap no, müşteri + ek no) | Müşteri no |
| ORA-02290 | CHECK ihlali | |

**Tohum veri:** 180 müşteri (5 pasif, ID 1-180), 281 hesap (9 pasif, ID 5001-5281), 10.997 işlem
(ID 1000001-1010997), 8 BIST hissesi (temsili fiyat). Müşteri no 8 hane, hesap no `1001-<müşteri no>-<ek no>`.
Demo için kullanışlı kayıtlar: Göksu Mobilya Ltd. Şti. (müşteri 88, vadesiz hesap 5132 `1001-55510734-02`, en aktif hesap).
Entegrasyon testleri bu kayıtlara ve tohumda pasif hesap, aktif vadesiz hesap ve açık hisse pozisyonu bulunmasına dayanır.

## 6. Kod haritası

| Dosya | İçerik |
|---|---|
| `db/01_schema.sql` … `05_identity.sql`, `99_temizle.sql`, `00_kur.sql`, `kur.ps1` | Şema, PL/SQL, tohum, doğrulama, kimlik tabloları, silme, kurulum |
| `db/tools/tohum-uret.mjs` | `prototype/src/data.js`'i Node'da çalıştırıp `03_seed.sql` üretir |
| `tools/on-yuz-varliklari.mjs` | `theme.css`, ikon sprite'ı, Chart.js, Geist / Geist Mono / Mona Sans fontları ve `fontlar.css` üretimi, em/en dash kontrolü |
| `src/…Domain/` | Enum'lar, `VeritabaniKodu`, `BakiyeEtkisi`, `HesapNumarasi`; varlıklar |
| `src/…Application/Ortak/` | `Sonuc`/`AlanHatasi`, `SayfaSonucu`, `TurkceBicim`, `TutarMetni`, `IslemSatiri`, `Csv` |
| `src/…Application/Musteriler/`, `Hesaplar/`, `Ozet/` | Müşteri, hesap, genel bakış sözleşmeleri ve kuralları; `BakiyeGecmisi`, `PortfoyPozisyonu`, `NakitAkisi` |
| `src/…Application/Islemler/` | `IIslemServisi`, `IslemKaydi`, `IslemKurallari`, `PaketHatalari`, `Ekstre` |
| `src/…Application/Raporlar/` | `IRaporSorgusu`, filtreler, `AylikOzet`, `BakiyeDegisimi`, `BakiyeDegisimOzeti`, `EnAktifSatir`, `RaporDonemleri` |
| `src/…Data/Musteriler/`, `Hesaplar/`, `Ozet/`, `Islemler/`, `Raporlar/` | EF Core ve Dapper gerçeklemeleri (PKG_ISLEM, PKG_RAPOR, ekstre) |
| `src/…Data/Kimlik/KimlikDbContext.cs` | Identity deposu, büyük harfli tablo/kolon eşlemesi |
| `src/…Data/Izleme/` | `OracleIzBaglami` (AsyncLocal), `OracleIzDeposu`, `EfIzInterceptor`, `IzliDapper`, `IzBasligi` |
| `src/…Data/OracleFonksiyonlari.cs`, `OracleHatalari.cs`, `SorguYardimcilari.cs`, `OracleAltyapi.cs` | NLSSORT/NLS_UPPER; ORA hata yorumu; sıralama/sayfalama; bağlantı ve `OracleParametreleri` |
| `src/…Web/Program.cs` | Bağlantı kontrolü, MVC, tr-TR, durum sayfaları, Oracle izi, kimlik (`AddKimlik`, `UseAuthentication`), `/saglik`, API, yönetici tohumu |
| `src/…Web/Controllers/` | `Home`, `Musteri`, `Hesap` (+ ekstre), `Islem`, `Rapor`, `Giris` (`/Giris`, `/Cikis`), `Hata` |
| `src/…Web/Api/` | `AramaUclari`, `IslemApi` |
| `src/…Web/Altyapi/` | `SorguDizesi`, `Etiketler`, `WebUzantilari`, `OracleIzUzantilari`, `SqlRenklendirici`, `CsvDosyasi`, `KimlikKaydi` |
| `src/…Web/TagHelpers/`, `ViewComponents/` | `<ikon>`, `<tutar>`, rozetler, `<kimlik>`, `<th sirala>`; `OracleIziViewComponent` |
| `src/…Web/Views/` | Shared (`_Layout`, `_YalinLayout`, `_BasEtiketleri`, `_Sayfalama`, `_Bos`, `_AylikOzetTablo`, ...), Musteri, Hesap, Islem, Rapor, Giris, Home, Hata |
| `src/…Web/wwwroot/` | `css/uygulama.css`, `js/uygulama.js`, `js/grafik.js`; üretilenler: `css/theme.css`, `css/fontlar.css`, `icons/sprite.svg`, `lib/chart.js`, `fonts/` (woff2 + `OFL-*.txt`) |
| `tests/MusteriHesapYonetimi.Tests/` | Birim testleri: `DomainKurallariTestleri` (18), `UygulamaKurallariTestleri` (64), `IslemKurallariTestleri` (17), `EkstreTestleri` (12), `RaporTestleri` (27); toplam 138 |
| `tests/MusteriHesapYonetimi.EntegrasyonTestleri/` | Oracle'a bağlanan testler: `TestOrtami` (bağlantı, `[OracleFact]`, ölçüm yardımcıları), `ModelUyumuTestleri` (2), `PaketRetTestleri` (5), `RaporTutarlilikTestleri` (5) |
| `docs/demo-senaryosu.md` | 1-2 dk demo akışı, hazırlık ve kayıttan sonra sıfırlama |

## 7. Kalan işler

Kullanıcıda:
1. **Demo kaydı:** [demo-senaryosu.md](demo-senaryosu.md). Kayıttan önce tohum veri o güne göre üretilip kurulur ve
   entegrasyon testleri çalıştırılır; kayıttan sonra `db\kur.ps1` ve uygulamanın yeniden başlatılması.
2. **README görselleri (isteğe bağlı):** README şimdilik prototip ekran görüntülerini kullanıyor (aynı tasarım; README bunu
   belirtiyor). Gerçek uygulamadan görüntü istenirse kullanıcı oturum açıkken alır, `docs/ekran/` altına konur; Claude
   tarayıcı paneli görüntülerini dosyaya kaydedemez ve oturum açamaz.

## 8. Sonraki adımlar

- HTTPS ve üretim yapılandırması (ortam değişkeninden bağlantı cümlesi ve yönetici parolası, `OracleIzi:Acik=false`).
- Genex şartnamesinin açık depoya konup konmayacağı kullanıcının kararı.
- Prototip (`prototype/`) fontları hâlâ Google Fonts'tan yükler (yalnız Geist, Mona Sans yok) ve Faz 6'nın yeni blokları
  (kahraman, işlem akışı, giriş paneli) yalnız Razor'da; prototip yalnız tasarım aracı olduğu için bırakıldı.

## 9. Bilinen tuzaklar

- PowerShell'den sqlplus'a boru ile metin gönderince başa BOM eklenir, ilk satır yok sayılır. Betikler `docker cp` ile.
  Git Bash'ten `docker exec -i ... sqlplus -s <<'EOF'` heredoc'u sorunsuz çalışır (hızlı kontrol sorguları için).
- sqlplus `NLS_LANG=AMERICAN_AMERICA.AL32UTF8` olmadan Türkçe karakterleri bozar (`kur.ps1` ayarlıyor).
- `ALTER TABLE` bağımlı trigger, view ve paketleri INVALID yapar; `DBMS_UTILITY.COMPILE_SCHEMA` ile derlenir.
- CHECK kısıtı UNKNOWN sonucu kabul eder; NULL kontrolleri açıkça yazılır.
- Windows PowerShell 5.1 BOM'suz `.ps1` dosyasını ANSI okur; `.ps1` dosyaları BOM'lu UTF-8 kaydedilir.
- Claude ortamı, aynı PowerShell komutunda hem `Remove-Item` hem `C:\Program Files` yolu geçerse komutu engeller.
- `dotnet run` kod değişikliğini almaz; sunucu yeniden başlatılır. Çalışan sunucu `bin/` DLL'lerini kilitler. Razor görünümleri
  de derlenir (runtime compilation yok): görünüm değişikliği için de yeniden başlatma; açık sekme ayrıca yenilenir.
- `MapStaticAssets` statik dosya listesini derlemede çıkarır: `tools/on-yuz-varliklari.mjs` derlemeden önce çalıştırılır.
- Razor, enum tipli TagHelper özelliğinde tip adını kendisi ekler: `sirala-ilk="Azalan"` yazılır.
- tr-TR'de `ToUpper()` "i"yi "İ" yapar; veritabanı kodlarında `ToUpperInvariant()`. Makine metninde sayı `InvariantCulture`.
- Dapper + ODP.NET: `OracleParametreleri` kullanılmazsa parametreler sıraya göre bağlanır (BindByName kapalı).
- `Url.Action(..., new { id })` id'yi yola koyar; `[FromQuery]` ile bağlanan filtre onu görmez; `Url.Action("X") + QueryString`
  yoldaki id'yi kaybeder.
- Controller'da eylem adı bir tiple aynıysa (`AylikOzet`) eylem gövdesinde o tip adı yazılamaz; `var` kullanılır.
- JS'te saatsiz ISO tarih UTC okunur; sunucu tarihleri `ToString("s")` ile saatli gönderilir.
- **Oturum ve doğrulama:** Claude, güvenlik kuralı gereği tarayıcıda parola girmez. Başarılı giriş gerektiren tarayıcı
  kontrollerinde kullanıcı panelde oturum açar; Claude "Oturumu kapat"ı denerse yeniden giriş gerekir. Giriş sayfası
  oturumsuz açıldığı için font, stil ve betik kontrolleri orada yapılabilir.
- `FallbackPolicy` statik dosyaları da korur: `MapStaticAssets().AllowAnonymous()` olmadan giriş sayfası stilsiz açılır.
- `db\kur.ps1` kimlik tablolarını da siler: çalışan uygulama yeniden başlatılmazsa yönetici hesabı olmaz, giriş yapılamaz.
- Kimlik DDL'ini yeniden üretmek için: scratchpad'de Data projesine referanslı bir konsol projesi `AddDbContext<KimlikDbContext>`
  (Oracle, 19c uyumluluk) ve `AddIdentityCore<IdentityUser>().AddEntityFrameworkStores<KimlikDbContext>()` kaydeder,
  `db.Database.GenerateCreateScript()` yazdırır (bağlanmaz). Çıktı `05_identity.sql`'deki adlandırmaya çevrilir.
- Entegrasyon testlerini atlanmış görmek için bağlantıyı boşlukla ezmek yeter: `ConnectionStrings__HesapMasasi=' '`
  (Windows'ta boş ortam değişkeni tanımlanamaz). Aynı derlemeyi yeniden çalıştırmak için `--no-build`.
- `geist` npm paketi `next` peer bağımlılığı taşır (npm 7+ Next.js'i de kurar); fontlar Fontsource paketlerinden alınır.
  Font önyüklemesinin adresi `fontlar.css`'teki url ile birebir olmalı (`asp-append-version` yok), yoksa font iki kez iner.
- Tarayıcı panelinin sistem teması koyu: tema denemesinde açık tema elle seçilir, sonra "Sistem"e dönülür.
- Tarayıcı paneli `prefers-reduced-motion: reduce` taklit eder: sayfa girişi, sayaç, grafik çizimi ve şerit panelde
  görünmez (şerit kaydırılabilir listedir). Hareket, anahtar karelerin varlığı ve animasyon zorlanarak ölçülür.
- Bootstrap başlık rengi `--ink`'e bağlı: her temada koyu kalan yüzeylerde (giriş paneli, Oracle izi) başlık ve metin
  renkleri açıkça verilir, yoksa açık temada koyu zemin üstünde koyu yazı kalır.
- Kenar menüye özgü dar ekran kuralları `.hm-sidebar` ile sınırlanır; `.hm-brand-name` giriş sayfasında da kullanılır.
- Tarayıcı paneli, sayfa kaydırılmışken ekran görüntüsünün üstünde boş bir bant gösterebilir; panel gizliyken ekran
  görüntüsü alınamaz. Ölçüm için JS kullanılır.
- Proje OneDrive altında: `bin/`, `obj/`, `node_modules/` senkronize olur, dosya kilidi görülebilir.
- Windows Akıllı Uygulama Denetimi açık (`VerifiedAndReputablePolicyState = 1`). İmzasız yeni derlenmiş bir DLL'i
  engelleyebilir: sunucu "Uygulama Denetimi ilkesi bu dosyayı engelledi (0x800711C7)" ile birkaç saniyede kapanır, tarayıcı
  paneli yine "başladı" der; test çalıştırıcısı "Catastrophic failure ... 0x800711C7" ve "hiç test yok" der (CodeIntegrity
  olay 3077/3033). Engellenenler: Faz 3'ün son web derlemesi, entegrasyon test projesinin ilk derlemesi, fontların ilk web
  derlemesi. Her seferinde gerçek bir kaynak değişikliğiyle alınan bir sonraki derleme geçti. Sunucu başladıktan sonra
  `preview_logs` ile "Now listening" satırı ve ilk istek kontrol edilir.

## 10. Açık konular

- Akıllı Uygulama Denetimi yeniden engellerse seçenekler kullanıcının (Denetimi kapatmak, uygulamayı ve testleri
  Docker/WSL içinde çalıştırmak ya da sonraki derlemede tekrar denemek). Sistem güvenlik ayarı Claude tarafından değiştirilmez.
- Genex şartnamesi (`musteri_hesap_yonetim_proje_speq.md`) açık depoya konma izni netleşene kadar `.gitignore`'da.
- HTTPS gerekirse eklenecek.
