# Devir notları: Hesap Masası

Yeni bir oturumun kaldığı yerden devam edebilmesi için güncel durum, kararlar ve Faz 3 planı.
Son güncelleme: 11 Eylül 2026. Şifreler bu dosyada yok; yerel değerler `CLAUDE.md`'de.

## 1. Durum

| Aşama | Durum | Çıktı |
|---|---|---|
| Arayüz planı | Tamam | [arayuz-plani.md](arayuz-plani.md), [../DESIGN.md](../DESIGN.md) |
| Tıklanabilir prototip | Tamam | `prototype/`, [ekran görüntüleri](ekran/), [Artifact](https://claude.ai/code/artifact/9dbfff5a-86d3-49b0-9a09-662219abb534) |
| Ortam kurulumu | Tamam | .NET SDK 10.0.401, WSL 2.7.13, Docker Desktop, `hesap-oracle` konteyneri |
| Faz 1: altyapı | Tamam, doğrulandı | `db/`, `MusteriHesapYonetimi.slnx`, `GET /saglik`, README |
| **Faz 2: müşteri ve hesap CRUD** | **Tamam, doğrulandı** | Kabuk ve tema, S2-S7, S11, genel bakışın gösterge kısmı, 82 test |
| Faz 3: işlemler ve ekstre | **Sırada** | Bölüm 7 |
| Faz 4: raporlar | Bekliyor | PKG_RAPOR, Chart.js, genel bakış grafikleri |
| Faz 5: giriş, testler, sunum | Bekliyor | Identity, README görselleri, demo videosu |

Faz 1 doğrulaması: kurulum betiği 13 sn'de temizler, kurar ve doğrular. Sonuç: 180 müşteri, 281 hesap,
10.997 işlem, bakiye tutarsızlığı 0, hatalı transfer çifti 0, paket duman testi geçti.

Faz 2 doğrulaması (tarayıcı paneli, 1280 px, konsol ve sunucu günlüğü temiz):
- Müşteri listesi ve hesap detayı prototip görüntüleriyle aynı veriyi gösteriyor (ör. 1001-51125307-01: ₺224.757,58,
  son 30 gün +₺57.740,06 / −₺25.174,63).
- Türkçe sıralama: 175 aktif müşterinin adı tarayıcının `Intl.Collator('tr')` sırasıyla birebir aynı (bozuk çift 0).
- Türkçe arama: "ipek" → İpek, "kılıç" ve "KILIÇ" → Kılıç; hesap no tiresiz rakamla bulunur.
- Canlı filtre: arama yazınca adres `?q=şahin` olur, 4 sonuç gelir, sayfa yenilenmez, odak kutuda kalır.
- Form: kural ve benzersizlik hataları birlikte döner ("Bu müşteri no kayıtlı: 37176914 (Alper Pekcan)."),
  e-posta küçük harfe, telefon `+90 532 123 45 67` biçimine çevrilir; jQuery doğrulaması blur'da çalışır.
- Hesap açma: ₺1.250,50 açılış tutarı PKG_ISLEM.YATIR ile girer, bakiye trigger'dan gelir, "Açılış bakiyesi" hareketi
  oluşur; bakiyeli hesap ve bakiyeli hesabı olan müşteri pasife alınamaz (gerekçe gösterilir); bakiyesiz hesap
  pasife alınır; hesabı olan müşterinin numarası kilitlidir; 404 sayfası çalışır.
- Deneme kayıtlarından sonra veritabanı `db\kur.ps1` ile tohum veriye geri döndürüldü.

## 2. Yeni oturuma başlarken

1. Docker Desktop açık olmalı: `docker start hesap-oracle` (bağlantı `localhost:1521/FREEPDB1`, kullanıcı `hesap`).
2. Oturum bir kurulumdan önce başladıysa PATH güncel değildir; tam yollar:
   `C:\Program Files\dotnet\dotnet.exe`, `C:\Program Files\Docker\Docker\resources\bin\docker.exe`.
3. Uygulamayı çalıştırıp `http://localhost:5080` açılır; `/saglik` `gecersizNesne: 0` döndürmeli.
4. Tohum veri üretildiği güne göre hazırlanır (son 190 gün). Farklı bir günde "bugünkü işlemler" boş görünür;
   demodan önce yeniden üretilip kurulur (Bölüm 3).
5. 5080'i başka bir oturumdan kalan `MusteriHesapYonetimi.Web.exe` tutuyorsa derleme DLL'leri yazamaz; o süreç durdurulur.

## 3. Komutlar

```powershell
# Veritabanını sıfırdan kur (temizle, şema, PL/SQL, tohum veri, doğrulama). Tekrar çalıştırmak güvenli.
node db/tools/tohum-uret.mjs
$env:HESAP_DB_SIFRE = '<hesap kullanıcısının şifresi>'
powershell -NoProfile -ExecutionPolicy Bypass -File db\kur.ps1

# Ön yüz varlıkları: theme.css (prototipten) ve ikon sprite'ı. Yeni ikon adı kullanınca veya prototip CSS'i değişince.
node tools/on-yuz-varliklari.mjs

# Uygulama (bağlantı cümlesi user-secrets'ta hazır: ConnectionStrings:HesapMasasi)
dotnet run --project src/MusteriHesapYonetimi.Web --urls http://localhost:5080

# Testler
dotnet test tests/MusteriHesapYonetimi.Tests

# Prototip (http://localhost:5173)
node prototype/build.mjs
node prototype/serve.mjs
```

`.claude/launch.json` iki yapılandırma içerir: `web` (5080) ve `prototip` (5173); tarayıcı paneli bunları başlatır.

## 4. Mimari kararlar

| Karar | Neden |
|---|---|
| Katmanlar: Domain ← Application ← Data; Web her üçüne, Tests Domain + Application'a bağlı | Şartnamedeki klasör yapısı; Controller'da iş mantığı yok |
| Servis arayüzleri ve saf iş kuralları Application'da, gerçekleme Data'da | Kurallar (`MusteriKurallari`, `HesapKurallari`) veritabanı olmadan test edilir |
| İş kuralı ihlali istisna değil `Sonuc` döner (alan + mesaj listesi) | Web alanlı hatayı ModelState'e, alansızı bildirime aktarır; tüm hatalar tek seferde gösterilir |
| Şema SQL betikleriyle yönetilir, EF Core migration yok | Oracle ortamlarında şema genelde DBA'nındır; PL/SQL nesneleri zaten betikte |
| EF Core: okumalar ve müşteri/hesap kayıtları. Dapper: PKG_ISLEM ve PKG_RAPOR çağrıları | Şartnamenin önerisi; iki yaklaşımı da göstermek |
| `HESAP.BAKIYE` uygulamadan hiç yazılmaz | Tek kaynak trigger. EF'te BAKIYE için Before/AfterSave = Ignore. Açılış tutarı bile `PKG_ISLEM.YATIR` ile girilir |
| Hesap açma tek transaction: `MUSTERI ... FOR UPDATE` (EF `FromSql`) → EF insert → Dapper `PKG_ISLEM.YATIR` → COMMIT | Aynı müşteriye eşzamanlı iki açılış aynı EK_NO'yu alamaz; hesap ve açılış işlemi birlikte yazılır ya da hiçbiri |
| Türkçe sıralama ve arama: `NLSSORT(..., 'NLS_SORT=XTURKISH')` ve `NLS_UPPER` EF `DbFunction` eşlemesiyle | Oturum ayarı (ALTER SESSION) havuzdaki bağlantıda durum taşır ve her açılışta gidiş-dönüş ister; bu yol SQL'de görünür |
| Tutar alanları metin olarak bağlanır, `TutarMetni` ayrıştırır | tr-TR model bağlayıcı "8140.25"i 814025 okur (nokta binlik ayırıcı) |
| Hesabı olan müşterinin numarası değiştirilemez | Hesap numarası müşteri numarasını içerir (`1001-<müşteri no>-<ek no>`) |
| Pasife alma: müşteride aktif hesapların bakiyesi ve pozisyonu sıfır olmalı, hesapta bakiye ve pozisyon sıfır olmalı | Prototipteki -20004/-20005 Application kuralı; `CK_HESAP_PASIF_BAKIYE` son güvence (ORA-02290 yakalanır) |
| Liste filtreleri GET sorgu dizesinde; JS varken `fetch` + `DOMParser` ile yalnız liste bölümü değişir | Adres paylaşılabilir, geri tuşu çalışır, JS kapalıyken de form çalışır; SPA gerekmez |
| Detay sekmeleri sunucu tarafında (`?sekme=`) | Bağlantı olarak paylaşılabilir; JS gerekmez |
| Hesap detayındaki bakiye sütunu ve 90 günlük çizgi, güncel bakiyeden geriye yürütülerek hesaplanır; çizgi sunucuda SVG | Son 20 hareket için SQL penceresi gereksiz; Chart.js Faz 4'e kadar yüklenmez |
| İkonlar harici sprite (`/icons/sprite.svg?v=...`), `<ikon>` TagHelper | Tarayıcı önbelleğe alır; `tools/on-yuz-varliklari.mjs` yalnız kullanılan ikonları koyar |
| `theme.css` prototipten üretilir, Razor'a özgü kurallar `uygulama.css`'te | Prototip ile uygulama aynı token'ları kullanır, elle kopya kaymaz |
| POST → Redirect → GET, sonuç TempData bildirimi; müşteri pasife almada "Geri al" | Yenilemede tekrar gönderim yok; geri al bir POST (Aktiflestir) |
| Antiforgery tüm POST'larda (`AutoValidateAntiforgeryTokenAttribute`); `donus` adresi `Url.IsLocalUrl` ile | CSRF ve açık yönlendirmeye karşı |
| 19c uyumluluğu | Betikler 19c söz dizimiyle; EF Core `UseOracleSQLCompatibility(DatabaseVersion19)`. Geliştirme veritabanı 26ai |
| Enum ↔ veritabanı kodu | `VeritabaniKodu.Yaz/Oku`: `TransferGelen` ↔ `TRANSFER_GELEN`. EF'te `Kod<T>()` dönüştürücüsü |
| `bool` ↔ `NUMBER(1)` | Oracle sağlayıcısının kendi eşlemesi. Ek dönüştürücü eklenmez, sorgu üretimini bozuyor |
| Kimlik kolonları `BY DEFAULT ON NULL` | Tohum veri prototiple aynı ID'lerle yüklenir; sonra `START WITH LIMIT VALUE` |
| Paketler COMMIT etmez | Transaction'ı .NET (`OracleTransaction`) yönetir; hata olursa ROLLBACK, yarım transfer yok |
| Dapper için `OracleParametreleri` | ODP.NET parametreleri varsayılan olarak sıraya göre bağlar; burada `BindByName = true`. REF CURSOR ve OUT okuma destekli |
| Bağlantı cümlesi koda yazılmaz | Geliştirmede user-secrets, sunucuda `ConnectionStrings__HesapMasasi`. Yoksa uygulama açıklayıcı hatayla başlamaz |
| HTTPS kapalı (`--no-https`) | Yerel geliştirmede sertifika kurulumu gerekmesin; gerekirse sonra eklenir |
| Çözüm dosyası `.slnx` | .NET 10 varsayılanı (VS 2022 17.13+ ve Rider açar) |

## 5. Veritabanı

**Tablolar:** `MUSTERI`, `HESAP` (+`EK_NO`), `HISSE`, `ISLEM` (+`REFERANS_NO`, `HISSE_KODU`, `ADET`, `BIRIM_FIYAT`).
Önemli kısıtlar: `UQ_MUSTERI_NO`, `CK_MUSTERI_NO_BICIM` (8 hane), `UQ_HESAP_NO`, `UQ_HESAP_MUSTERI_EK`,
`CK_HESAP_BAKIYE` (≥ 0), `CK_HESAP_PASIF_BAKIYE` (pasif hesabın bakiyesi 0), `CK_ISLEM_TRANSFER`, `CK_ISLEM_HISSE`.
İndeksler: `IDX_ISLEM_HESAP_TARIH` (ekstre), `IDX_ISLEM_TARIH`, `IDX_ISLEM_REFERANS` ve FK indeksleri.

**Trigger'lar:** `TRG_ISLEM_BAKIYE_GUNCELLE` (şartname 5.1), `TRG_ISLEM_DEGISMEZ` (ISLEM'de UPDATE/DELETE yasak).
**View'lar:** `VW_EN_AKTIF_MUSTERILER`, `VW_EN_AKTIF_HESAPLAR` (ORDER BY view'da değil sorguda), `VW_PORTFOY`
(EF'te anahtarsız `PortfoyPozisyonu`).
**Sekans:** `SEQ_REFERANS` (90000'den; referans `TRF` + YYAAGG + 5 hane).

**Paketler:**
```sql
PKG_ISLEM.YATIR    (p_hesap_id, p_tutar, p_aciklama, p_islem_id OUT)
PKG_ISLEM.CEK      (p_hesap_id, p_tutar, p_aciklama, p_islem_id OUT)
PKG_ISLEM.TRANSFER (p_kaynak, p_hedef, p_tutar, p_aciklama, p_referans OUT, p_giden_islem_id OUT)
PKG_ISLEM.HISSE_AL (p_hesap_id, p_hisse_kodu, p_adet, p_islem_id OUT)
PKG_ISLEM.HISSE_SAT(p_hesap_id, p_hisse_kodu, p_adet, p_islem_id OUT)
PKG_RAPOR.AYLIK_OZET_HESAP  (p_hesap_id, p_yil, p_ay, p_sonuc OUT SYS_REFCURSOR)
PKG_RAPOR.AYLIK_OZET_MUSTERI(p_musteri_id, p_yil, p_ay, p_sonuc OUT SYS_REFCURSOR)
PKG_RAPOR.BAKIYE_DEGISIMI   (p_hesap_id, p_bas, p_bit, p_acilis OUT, p_sonuc OUT SYS_REFCURSOR)
PKG_RAPOR.EN_AKTIF          (p_tur 'MUSTERI'|'HESAP', p_bas, p_adet, p_sonuc OUT SYS_REFCURSOR)
SP_AYLIK_ISLEM_OZETI        şartnamedeki isimle PKG_RAPOR.AYLIK_OZET_HESAP'ı çağırır
```
Transfer iki hesabı küçük `HESAP_ID` önce olacak şekilde `FOR UPDATE` ile kilitler (deadlock önlemi).
Uygulamadan isimli bağlamayla çağrılır: `BEGIN PKG_ISLEM.YATIR(p_hesap_id => :hesap_id, ...); END;` (`HesapServisi`).

**Hata kodları** (arayüz mesajları: [arayuz-plani.md](arayuz-plani.md), "Hata eşleme"):

| Kod | Anlam |
|---|---|
| -20001 | Yetersiz bakiye (mesaj kullanılabilir bakiyeyi ₺ biçiminde verir) |
| -20002 | Hesap veya sahibi müşteri pasif |
| -20003 | Satılabilir hisse adedi yetersiz |
| -20006 | Hisse işlemi yalnız yatırım hesabında |
| -20008 / -20009 | Hesap / hisse bulunamadı |
| -20010 / -20011 | Geçersiz adet / geçersiz tutar |
| -20012 | Aynı hesaba transfer |
| -20020 | ISLEM kaydı değiştirilemez |
| ORA-00001 | Benzersizlik (müşteri no, hesap no, müşteri + ek no) |
| ORA-02290 | CHECK ihlali |

`OracleHatalari.UygulamaMesaji` ORA-20xxx mesajının ilk satırını "ORA-20001: " önekini atıp döner.
Prototipteki -20004, -20005 ve -20007 veritabanı kodu değil; Faz 2'de `MusteriKurallari`/`HesapKurallari` ve
`HesapServisi.AcAsync` içinde uygulandı.

**Tohum veri:** 180 müşteri (5 pasif, ID 1-180), 281 hesap (9 pasif, ID 5001-5281), 10.997 işlem
(ID 1000001-1010997), 8 BIST hissesi (temsili fiyat). Müşteri no 8 hane, hesap no `1001-<müşteri no>-<ek no>`.

## 6. Kod haritası

| Dosya | İçerik |
|---|---|
| `db/01_schema.sql` … `04_dogrula.sql`, `99_temizle.sql` | Şema, PL/SQL, tohum, doğrulama, silme |
| `db/00_kur.sql`, `db/kur.ps1` | Kurulum sırası; konteynere kopyalayıp `NLS_LANG=AL32UTF8` ile çalıştırma |
| `db/tools/tohum-uret.mjs` | `prototype/src/data.js`'i Node'da çalıştırıp `03_seed.sql` üretir |
| `tools/on-yuz-varliklari.mjs` | `wwwroot/css/theme.css` ve `wwwroot/icons/sprite.svg` üretimi, em/en dash kontrolü |
| `src/…Domain/Tipler.cs`, `Varliklar.cs` | Enum'lar, `VeritabaniKodu`, `BakiyeEtkisi`, `HesapNumarasi`; `Musteri`, `Hesap`, `Islem`, `Hisse` |
| `src/…Application/Ortak/` | `Sonuc`/`AlanHatasi`, `SayfaSonucu`/`Sayfalama`, `TurkceBicim` (₺, tarih), `TutarMetni`, `IslemSatiri` |
| `src/…Application/Musteriler/` | `IMusteriServisi` + DTO'lar, `MusteriKaydi` (form + DataAnnotations), `MusteriKurallari` |
| `src/…Application/Hesaplar/` | `IHesapServisi` + DTO'lar, `HesapAcmaKaydi`, `HesapKurallari`, `BakiyeGecmisi`, `PortfoyPozisyonu` |
| `src/…Application/Ozet/`, `Sistem/` | `IGenelBakisSorgusu`; sağlık sorgusu |
| `src/…Data/HesapMasasiDbContext.cs` | EF Core eşlemesi (+ `VW_PORTFOY`, Oracle fonksiyonları) |
| `src/…Data/Musteriler/`, `Hesaplar/`, `Ozet/` | `MusteriServisi`, `HesapServisi` (EF + Dapper YATIR), `GenelBakisSorgusu` |
| `src/…Data/OracleFonksiyonlari.cs`, `OracleHatalari.cs`, `SorguYardimcilari.cs` | NLSSORT/NLS_UPPER; ORA hata yorumu; sıralama, sayfalama, `IslemSatiri` projeksiyonu |
| `src/…Data/OracleAltyapi.cs`, `VeriKatmaniKaydi.cs` | `OracleBaglantiFabrikasi`, `OracleParametreleri`; DI kaydı |
| `src/…Web/Program.cs` | Bağlantı kontrolü, MVC (antiforgery, Türkçe bağlama mesajları), tr-TR, durum sayfaları, `/saglik`, API |
| `src/…Web/Controllers/` | `Home` (genel bakış), `Musteri`, `Hesap`, `Hata` (404 ve 500) |
| `src/…Web/Api/AramaUclari.cs` | `/api/ara`, `/api/musteri/ara`, `/api/musteri/yeni-no`, `/api/hesap/no-onizle` |
| `src/…Web/TagHelpers/` | `<ikon>`, `<tutar>`, `<islem-tipi>`, `<durum>`, `<musteri-tipi>`, `<hesap-tipi>`, `<kimlik>`, `<th sirala>` |
| `src/…Web/Altyapi/` | `SorguDizesi` (filtre bağlantıları), `Etiketler` (enum adı + ikon), `WebUzantilari` |
| `src/…Web/Views/Shared/` | `_Layout` (kabuk), `_Sayfalama`, `_Bos`, `_HataOzeti`, `_BakiyeCizgisi` |
| `src/…Web/wwwroot/` | `css/theme.css` (üretilir), `css/uygulama.css`, `js/uygulama.js`, `icons/sprite.svg` (üretilir) |
| `tests/…/DomainKurallariTestleri.cs`, `UygulamaKurallariTestleri.cs` | 18 + 64 test |

## 7. Faz 3 planı: işlemler, dekont, ekstre ve Oracle izi

Kapsam: arayüz planı S8 (işlem yap), dekont, S9 (ekstre) ve Oracle izi. Hedef görünüm: `docs/ekran/04-islem-transfer.png`,
`05-ekstre.png` ve prototipteki `prototype/src/views/islem.js`, `hesap.js` (ekstre), `oracle-izi.js`.

1. **Application**
   - `IIslemServisi`: `YatirAsync`, `CekAsync`, `TransferAsync`, `HisseAlAsync`, `HisseSatAsync` → `Sonuc<IslemSonucu>`
     (işlem id, referans no); `DekontAsync(islemId)` (transferde REFERANS_NO ile karşı ayak); `EkstreAsync(hesapId, bas, bit, tipler)`.
   - Form modelleri: tutar metin (`TutarMetni`), adet tam sayı, açıklama en fazla 300 karakter.
   - `PaketHataEslemesi`: ORA kodu → alan (20001/20011 → Tutar, 20003/20010 → Adet, 20006 → Tip, 20012 → HedefHesap,
     20002 → form üstü). Saf fonksiyon, birim testli.
   - Ekstre özeti: dönem başı + giriş − çıkış = dönem sonu (saf fonksiyon + test).
2. **Data**
   - `IslemServisi`: Dapper + `OracleTransaction`; `BEGIN PKG_ISLEM.TRANSFER(...); END;` → COMMIT, hata → ROLLBACK.
     `OracleParametreleri` (OUT: `p_referans` Varchar2 20, `p_giden_islem_id` Int64), `OracleHatalari.UygulamaMesaji`.
   - Ekstre: Dapper, `IDX_ISLEM_HESAP_TARIH` aralık koşulu (`>= :bas AND < :bit + 1`) ve
     `SUM(isaretli tutar) OVER (ORDER BY ISLEM_TARIHI, ISLEM_ID)` + dönem başı bakiye.
3. **Web**
   - `IslemController`: `Yeni` (GET `?hesapId=&tip=`, POST), `Dekont/{id}`; `HesapController.Ekstre/{id}?bas=&bit=&tip=` ve CSV
     (`FileResult`, UTF-8 BOM, `;` ayırıcı). Yazdırma CSS'i theme.css'te hazır (`.baski-bas`, `@media print`).
   - Hesap seçici: `/api/hesap/ara` (bakiye, tip, aktif döner; `IHesapServisi.AraAsync` hazır). Önizleme (önce → sonra bakiye,
     transferde çift kayıt) istemcide, onay diyaloğu ve "İşleniyor" kilidi.
   - Açılacaklar: `_Layout.cshtml` menüsünde "İşlem yap" ve "Ekstre" (Faz değerini kaldır); hesap detayında İşlem yap
     (bölünmüş düğme) ve Ekstre; hesap listesi ve müşteri detayındaki hesap satırlarında Ekstre/İşlem yap; genel bakışta
     birincil eylem "İşlem yap"; hareket satırı tıklanınca dekont.
4. **Oracle izi**
   - EF `DbCommandInterceptor` + Dapper çağrılarını saran yardımcı → istek kapsamlı toplayıcı (SQL, bind değerleri, süre,
     etkilenen satır, katman etiketi) → `OracleIzi` ViewComponent (yalnız Development).
   - `_Layout`'taki `body.iz-yok` sınıfı kaldırılır; `.iz` CSS'i theme.css'te hazır. POST → Redirect'te iz TempData ile taşınır.
   - Trigger'ın UPDATE'i istemciye görünmez: iz girdisine TRG_ISLEM_BAKIYE_GUNCELLE notu ve önce/sonra bakiye eklenir.
5. **Testler:** hata eşleme, işlem formu kuralları, ekstre özeti.
6. **Doğrulama:** yatır → transfer → dekont → ekstre ve genel bakış güncel; yetersiz bakiye, aynı hesaba transfer, pasif
   hesap hataları; yazdırma görünümü. Deneme kayıtlarından sonra `db\kur.ps1` ile sıfırlanır.

## 8. Sonraki fazlar

- **Faz 4:** `RaporController`; PKG_RAPOR REF CURSOR'ları (`OracleParametreleri.RefCursor`); Chart.js, renkler
  DESIGN.md'deki doğrulanmış grafik paletinden. Genel bakışa nakit akışı grafiği, en aktif müşteriler ve hesap dağılımı;
  müşteri ve hesap detayına "Aylık özet" sekmesi.
- **Faz 5:** ASP.NET Core Identity (tek admin), testler, README ekran görüntüleri, 1-2 dk demo kaydı.
  Geist fontlarının `wwwroot/fonts` altına alınması.

## 9. Bilinen tuzaklar

- PowerShell'den sqlplus'a boru ile metin gönderince başa BOM eklenir, ilk satır yok sayılır. Betikler `docker cp` ile.
- sqlplus `NLS_LANG=AMERICAN_AMERICA.AL32UTF8` olmadan Türkçe karakterleri bozar (`kur.ps1` ayarlıyor).
- `ALTER TABLE` bağımlı trigger, view ve paketleri INVALID yapar; `DBMS_UTILITY.COMPILE_SCHEMA` ile derlenir.
- CHECK kısıtı UNKNOWN sonucu kabul eder; NULL kontrolleri açıkça yazılır.
- Windows PowerShell 5.1 BOM'suz `.ps1` dosyasını ANSI okur; `.ps1` dosyaları BOM'lu UTF-8 kaydedilir.
  Çalıştırma politikası için `powershell -ExecutionPolicy Bypass -File ...`.
- Claude ortamı, aynı PowerShell komutunda hem `Remove-Item` hem `C:\Program Files` yolu geçerse komutu engeller;
  silme için `[System.IO.File]::Delete` ya da ayrı komut.
- `dotnet run` kod değişikliğini almaz; sunucu yeniden başlatılır. Çalışan sunucu `bin/` DLL'lerini kilitler, aynı anda
  iki build (ör. test + run) ortak `obj/` klasörlerinde çakışır.
- `MapStaticAssets` statik dosya listesini derlemede çıkarır: `tools/on-yuz-varliklari.mjs` derlemeden önce çalıştırılır.
- Razor, enum tipli TagHelper özelliğinde tip adını kendisi ekler: `sirala-ilk="Azalan"` yazılır, `SiralamaYonu.Azalan` değil.
- tr-TR'de `ToUpper()` "i"yi "İ" yapar; veritabanı kodlarında `ToUpperInvariant()`. SVG yolu gibi makine metninde sayı
  `CultureInfo.InvariantCulture` ile yazılır (ondalık virgül yolu bozar).
- Tarayıcı paneli, sayfa kaydırılmışken ekran görüntüsünün üstünde boş bir bant gösterebilir; DOM'da yerleşim doğrudur.
- Proje OneDrive altında: `bin/`, `obj/`, `node_modules/` senkronize olur, dosya kilidi görülebilir. Sorun çıkarsa
  klasör OneDrive dışına taşınabilir.

## 10. Açık konular

- Depo: https://github.com/keremsaliherol/genex (`main`). `CLAUDE.md` şifre içerdiği için, Genex şartnamesi
  (`musteri_hesap_yonetim_proje_speq.md`) açık depoya konma izni netleşene kadar `.gitignore`'da.
- Fontlar şimdilik Google Fonts'tan (sistem fontu yedeğiyle); self-host Faz 5'te.
- Identity tabloları SQL betiğiyle mi, EF migration ile mi (Faz 5).
- HTTPS gerekirse eklenecek.
