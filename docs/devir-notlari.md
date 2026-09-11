# Devir notları: Hesap Masası

Yeni bir oturumun kaldığı yerden devam edebilmesi için güncel durum, kararlar ve Faz 5 planı.
Son güncelleme: 11 Eylül 2026 (Faz 4 sonu). Şifreler bu dosyada yok; yerel değerler `CLAUDE.md`'de.

## 1. Durum

| Aşama | Durum | Çıktı |
|---|---|---|
| Arayüz planı | Tamam | [arayuz-plani.md](arayuz-plani.md), [../DESIGN.md](../DESIGN.md) |
| Tıklanabilir prototip | Tamam | `prototype/`, [ekran görüntüleri](ekran/), [Artifact](https://claude.ai/code/artifact/9dbfff5a-86d3-49b0-9a09-662219abb534) |
| Ortam kurulumu | Tamam | .NET SDK 10.0.401, WSL 2.7.13, Docker Desktop, `hesap-oracle` konteyneri |
| Faz 1: altyapı | Tamam, doğrulandı | `db/`, `MusteriHesapYonetimi.slnx`, `GET /saglik`, README |
| Faz 2: müşteri ve hesap CRUD | Tamam, doğrulandı | Kabuk ve tema, S2-S7, S11, genel bakışın gösterge kısmı |
| Faz 3: işlemler, dekont, ekstre, Oracle izi | Tamam, doğrulandı | S8, dekont, S9, Oracle izi paneli (tarayıcı doğrulaması Faz 4 oturumunda) |
| Faz 4: raporlar ve grafikler | Tamam, doğrulandı | S10 (aylık özet, bakiye değişimi, en aktif), S1 grafikleri, detaylarda "Aylık özet" sekmesi, 138 test |
| **Faz 5: giriş, testler, sunum** | **Sırada** | Bölüm 7 |

Depo: https://github.com/keremsaliherol/genex (`main`). Her doğrulanmış adım commit edilip push'lanır (CLAUDE.md, "Git ve GitHub").

Faz 1 doğrulaması: kurulum betiği 13 sn'de temizler, kurar ve doğrular. Sonuç: 180 müşteri, 281 hesap,
10.997 işlem, bakiye tutarsızlığı 0, hatalı transfer çifti 0, paket duman testi geçti.

Faz 2 doğrulaması (tarayıcı paneli): Türkçe sıralama 175 adda `Intl.Collator('tr')` ile birebir; Türkçe arama ("ipek" → İpek);
canlı filtre sayfa yenilemeden; form hataları birlikte; açılış tutarı PKG_ISLEM.YATIR ile; pasife alma kuralları.

Faz 3 doğrulaması (tarayıcı paneli, konsol ve sunucu günlüğü temiz):
- Transfer 1001-51125307-01 → 1001-30144651-01, ₺2.500: önizleme (₺224.757,58 → ₺222.257,58 ve ₺45.846,15 → ₺48.346,15),
  onay diyaloğu, dekontta aynı referanslı iki kayıt (TRF26091190020) ve işlem sonrası bakiyeler önizlemeyle aynı.
- "Yine de gönder" ile ₺99.999.999 çekme: PKG_ISLEM ORA-20001 döndü, form "veritabanında reddedildi" gösterdi, bakiye değişmedi.
- Hisse satımı (BIMAS 1 adet): satış listesi yalnız portföydeki hisseler, pozisyon 67 → 66, dekontta birim fiyat.
- Ekstre (son 3 ay): dönem başı ₺152.002,90 + giriş ₺101.686,12 − çıkış ₺31.431,44 = ₺222.257,58 = son satırın yürüyen
  bakiyesi = hesabın güncel bakiyesi. Tip filtresi özeti değiştirmez; tarih değişince dönem "Özel" olur; CSV BOM'lu,
  noktalı virgüllü, tabloyla aynı satırlar.
- Oracle izi (Faz 4 oturumunda, ₺1,00 yatırma 1001-55510734-02): POST isteğinin izinde sırasıyla işlem öncesi bakiye,
  `PKG_ISLEM.YATIR` (OUT `islem_id`), işlem sonrası bakiye, trigger girdisi ("Uygulama BAKIYE'yi yazmadı",
  ₺8.098.763,13 → ₺8.098.764,13) ve COMMIT; redirect sonrası GET'in komutları ayrı grupta.

Faz 4 doğrulaması (tarayıcı paneli, konsol ve sunucu günlüğü temiz; her sayı sqlplus'ta ayrı sorguyla karşılaştırıldı):
- Genel bakış: son 30 gün yatırma ₺24.197.535,21, çekme ₺7.440.174,34 (grafik lejantı ₺24,2 mn / ₺7,4 mn), 30 gün × 2 seri;
  en aktif ilk 5 (69, 56, 35, 34, 32) doğrudan GROUP BY ile aynı; "Tablo" geçişi 30 satır, `aria-pressed` ve etiket değişir.
- Aylık özet, 1001-55510734-02, Eylül 2026: 7 yatırma ₺997.870,50, 6 çekme ₺66.906,09, 6 giden transfer ₺112.552,03,
  net +₺818.412,38 (prototip ekran görüntüsüyle aynı). Müşteri kapsamı (Göksu Mobilya, 2 hesap): 10 / 8 / 6 işlem,
  net +₺1.133.705,41. İzde `PKG_RAPOR.AYLIK_OZET_*` "PL/SQL paket", `:sonuc (OUT) = REF CURSOR`, satır sayısı ve not.
- Bakiye değişimi, aynı hesap, son 90 gün: açılış ₺3.666.127,62 (`p_acilis` OUT izde görünür), kapanış ₺8.098.763,13 =
  güncel bakiye = paketin son satır BAKIYE'si, 165 işlem, en yüksek ₺8.197.835,79, en düşük ₺3.549.344,97; 167 grafik noktası.
- En aktif hesaplar, tüm kayıtlar: `VW_EN_AKTIF_HESAPLAR` okunur (izde sıralama sorguda), 356 / 354 / 128 / 123 / 116 işlem.
- CSV'ler UTF-8 BOM'lu; `/Rapor/AylikOzet/5132` biçimli bağlantı ve CSV'si de çalışır. Kayıt seçmeden "Raporu çalıştır":
  "Listeden bir kayıt seçin.", `aria-invalid`, odak alanda. Tema değişince grafikler token'lardan yeniden kurulur
  (açık `#2446C8`/`#B42318`, koyu `#5B78E6`/`#E66767`); renk çiftleri dataviz doğrulayıcısından geçti (CVD ΔE en az 20,4).
- Deneme kaydından sonra veritabanı `db\kur.ps1` ile tohum veriye geri döndürüldü.

## 2. Yeni oturuma başlarken

1. Docker Desktop açık olmalı: `docker start hesap-oracle` (bağlantı `localhost:1521/FREEPDB1`, kullanıcı `hesap`).
2. Oturum bir kurulumdan önce başladıysa PATH güncel değildir; tam yollar:
   `C:\Program Files\dotnet\dotnet.exe`, `C:\Program Files\Docker\Docker\resources\bin\docker.exe`.
3. Uygulamayı çalıştırıp `http://localhost:5080` açılır; `/saglik` `gecersizNesne: 0` döndürmeli.
4. Tohum veri üretildiği güne göre hazırlanır (son 190 gün). Şu anki `03_seed.sql` 10 Eylül'e kadar; farklı bir günde
   "bugünkü işlemler" boş, nakit akışının son günleri sıfır görünür. Demodan önce yeniden üretilip kurulur (Bölüm 3).
5. 5080'i başka bir oturumdan kalan `MusteriHesapYonetimi.Web.exe` tutuyorsa derleme DLL'leri yazamaz; o süreç durdurulur.

## 3. Komutlar

```powershell
# Veritabanını sıfırdan kur (temizle, şema, PL/SQL, tohum veri, doğrulama). Tekrar çalıştırmak güvenli.
node db/tools/tohum-uret.mjs
$env:HESAP_DB_SIFRE = '<hesap kullanıcısının şifresi>'
powershell -NoProfile -ExecutionPolicy Bypass -File db\kur.ps1

# Ön yüz varlıkları: theme.css (prototipten), ikon sprite'ı, wwwroot/lib/chart.js (prototype/node_modules'tan).
# Yeni ikon adı kullanınca, prototip CSS'i veya Chart.js sürümü değişince; ardından Web yeniden derlenir.
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
| Servis arayüzleri ve saf iş kuralları Application'da, gerçekleme Data'da | Kurallar veritabanı olmadan test edilir |
| İş kuralı ihlali istisna değil `Sonuc` döner (alan + mesaj + isteğe bağlı ORA kodu) | Web alanlı hatayı ModelState'e, alansızı bildirime aktarır; veritabanı reddi ayrıca gösterilir |
| Para hareketi kuralları yalnız PKG_ISLEM'de; uygulama pakete gitmeden önce yalnız zorunlu alan ve tutar biçimini kontrol eder | Kuralın tek kaynağı PL/SQL. Arayüzdeki bakiye/pozisyon kontrolü yalnız erken uyarı; "Yine de gönder" veritabanı reddini gösterir |
| `PaketHatalari`: ORA-200xx → form alanı (20001 → Tutar ya da Adet, 20012 → Hedef hesap, "Hedef ..." mesajı → hedef alanı) | Hata doğru alanın altında; teknik detayda ORA kodu |
| PKG_ISLEM çağrısı Dapper ile, isimli bağlama (`p_x => :x`), transaction .NET'te (`OracleTransaction`); hata olursa ROLLBACK | Paketler COMMIT etmez; transferin iki kaydı birlikte yazılır ya da hiçbiri |
| Dekonttaki işlem sonrası bakiye: güncel bakiye − sonraki hareketlerin işaretli toplamı | Ek kolon gerekmez; trigger kuralıyla aynı işaret |
| Ekstre Dapper ile: dönem başı bakiye `NVL(SUM(...))`, yürüyen bakiye `SUM() OVER (ORDER BY ISLEM_TARIHI, ISLEM_ID)`; tarih koşulu aralık (`>= :bas AND < :bit_ertesi`) | IDX_ISLEM_HESAP_TARIH kullanılır; tip filtresi yalnız gösterilen satırları daraltır, özet tüm hareketlerden |
| CSV: `;` ayırıcı, UTF-8 BOM, tr-TR ondalık virgül; serbest metin `=+-@` ile başlıyorsa önüne `'` (`CsvDosyasi`) | Türkçe Excel doğrudan açar; formül enjeksiyonu önlenir |
| **Oracle izi:** her sayfa isteğine `AsyncLocal` iz bağlamı (middleware, çerezle tarayıcı); EF Core komutları tek bir `DbCommandInterceptor`'dan, Dapper komutları `IzliDapper`'dan geçer; tarayıcı başına son 40 komut bellekte; panel `OracleIzi` ViewComponent | Controller ve servisler izden habersiz; POST → Redirect → GET'te kaydetme komutları da görünür; `/api` ve statik dosyalar izlenmez |
| İzde başlık EF Core `TagWith` etiketinden ("-- Müşteri listesi (sayfa)"); yoksa paket adı veya fiil + tablolar; `QueryIzliAsync` isteğe bağlı not alır | Etiket SQL'in içinde de görünür; not paket gövdesinin ne yaptığını anlatır |
| İşlemde iz açıksa bakiye çağrıdan önce ve sonra okunur, trigger'ın etkisi, COMMIT veya ROLLBACK ayrı girdi olarak yazılır | Trigger'ın UPDATE'i istemciye görünmez; panel "uygulama BAKIYE'yi yazmadı" gösterir |
| Oracle izi varsayılan yalnız Development'ta (`OracleIzi:Acik`); SQL renklendirme sunucuda (`SqlRenklendirici`) | Üretimde bind değerleri gösterilmez; panel JS'siz de okunur |
| **Raporlar:** PKG_RAPOR Dapper ile `BEGIN PKG_RAPOR.X(p_a => :a, ..., p_sonuc => :sonuc); END;`; `OracleParametreleri.RefCursor` çıktısı ODP.NET'te komutun sonuç kümesi olarak döner, Dapper sıradan SELECT gibi okur | Şartname 5.2 ve Faz 4: stored procedure + REF CURSOR, .NET'te Dapper |
| REF CURSOR satırları kolon adlarıyla aynı büyük harfli özellikli özel sınıflara (`ISLEM_TIPI`, `TOPLAM_TUTAR`) okunur; tip kodu `VeritabaniKodu` ile enum'a | Paket sorgusunun kolonları çağıranda yeniden adlandırılamaz; global Dapper ayarı (`MatchNamesWithUnderscores`) değiştirilmez |
| `BAKIYE_DEGISIMI`: dönem başı `p_acilis` OUT (çağrıdan sonra `Oku<decimal>`), yürüyen bakiye paket içinde `SUM() OVER`; özet (kapanış, en yüksek/düşük) `BakiyeDegisimOzeti.Hesapla` ile trigger kuralından yeniden hesaplanır | İki bağımsız hesap aynı çıkmalı: kapanış = paketin son BAKIYE'si = güncel bakiye (doğrulandı) |
| En aktif: dönemli raporda `PKG_RAPOR.EN_AKTIF`, "tüm kayıtlar"da şartnamedeki `VW_EN_AKTIF_*` view'ları (sıralama ve `FETCH FIRST :adet` sorguda); ad/no/tip bilgisi ikinci bir EF sorgusuyla (`IN` listesi) | View tarih süzgeci almaz; iki yol da izde görünür. Genel bakıştaki "son 30 gün, ilk 5" `EN_AKTIF` ile |
| Aylık özet satırları ekranda işlem tipi sırasıyla (paket ISLEM_TIPI koduna göre sıralar); net etki `AylikOzetHesabi.NetEtki` | Prototip ve ekran görüntüsüyle aynı sıra; kural testli |
| Rapor filtreleri `[FromQuery]` olmadan bağlanır (route veya sorgu); CSV bağlantıları açık değerlerle kurulur | `Url.Action(..., new { id })` id'yi yola koyar (`/Rapor/AylikOzet/5132`); `[FromQuery]` ile rapor boş açılıyordu |
| Genel bakış nakit akışı: `TRUNC(ISLEM_TARIHI)` yalnız gruplamada, süzgeç `>= :bas` (IDX_ISLEM_TARIH); eksik günler `NakitAkisi.Doldur` ile sıfır | Veritabanı yalnız hareketli günleri döndürür; grafik 30 gün sabit |
| **Grafikler:** Chart.js 4.4.1 `wwwroot/lib/chart.js`'te (prototipin npm paketinden kopyalanır), yalnız `ViewData["Grafik"] = true` olan sayfalarda yüklenir; veri canvas'ın `data-veri` özniteliğinde JSON (`Json.Serialize`, tutarlar TL); `grafik.js` prototipin `charts.js`'i | Sunucu çizer, JS yalnız iyileştirir; CDN bağımlılığı yok |
| Grafik renkleri `--viz-*` token'larından okunur; `uygulama.js` tema değişince `hm:tema` olayı yayar, grafikler yeniden kurulur. Her grafiğin tablo karşılığı var (`data-tablo-gorunum`); JS kapalıyken ve yazdırmada tablo görünür | dataviz kuralları: tek eksen, ince işaret, metin veri rengini giymez, tablo alternatifi |
| Hesap açma tek transaction: `MUSTERI ... FOR UPDATE` (EF `FromSql`) → EF insert → Dapper `PKG_ISLEM.YATIR` → COMMIT | Aynı müşteriye eşzamanlı iki açılış aynı EK_NO'yu alamaz |
| Türkçe sıralama ve arama: `NLSSORT(..., 'NLS_SORT=XTURKISH')` ve `NLS_UPPER` EF `DbFunction` eşlemesiyle | Oturum ayarı havuzdaki bağlantıda durum taşır; bu yol SQL'de görünür |
| Tutar alanları metin olarak bağlanır, `TutarMetni` ayrıştırır; istemcide aynı kural, tutarlar kuruş | tr-TR model bağlayıcı "8140.25"i 814025 okur; kayan nokta hatası yok |
| Hesabı olan müşterinin numarası değiştirilemez | Hesap numarası müşteri numarasını içerir |
| Pasife alma kuralları Application'da; `CK_HESAP_PASIF_BAKIYE` son güvence | Prototipteki -20004/-20005/-20007 veritabanı kodu değil |
| Liste filtreleri GET sorgu dizesinde; JS varken `fetch` + `DOMParser` ile liste ve Oracle izi paneli yenilenir. Dönem formları (ekstre, bakiye değişimi) `data-donem-form`, kendiliğinden gönderilen süzgeçler `data-oto-gonder` | Adres paylaşılabilir, geri tuşu çalışır, JS kapalıyken de form çalışır |
| İkonlar harici sprite, `theme.css` prototipten üretilir (`tools/on-yuz-varliklari.mjs`) | Prototip ile uygulama aynı token'lar; yalnız kullanılan ikonlar |
| POST → Redirect → GET, TempData bildirimi; antiforgery tüm POST'larda; `donus` adresi `Url.IsLocalUrl` ile | Yenilemede tekrar gönderim yok; CSRF ve açık yönlendirmeye karşı |
| 19c uyumluluğu; enum ↔ veritabanı kodu (`VeritabaniKodu`); `bool` ↔ `NUMBER(1)` sağlayıcı eşlemesi | Geliştirme veritabanı 26ai, hedef 19c |
| Kimlik kolonları `BY DEFAULT ON NULL`; bağlantı cümlesi user-secrets'ta; HTTPS kapalı; `.slnx` | Faz 1 kararları |

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
Demo için kullanışlı kayıtlar: Göksu Mobilya Ltd. Şti. (müşteri 88, hesap 5132 `1001-55510734-02`, en aktif hesap).

## 6. Kod haritası

| Dosya | İçerik |
|---|---|
| `db/01_schema.sql` … `04_dogrula.sql`, `99_temizle.sql`, `00_kur.sql`, `kur.ps1` | Şema, PL/SQL, tohum, doğrulama, silme, kurulum |
| `db/tools/tohum-uret.mjs` | `prototype/src/data.js`'i Node'da çalıştırıp `03_seed.sql` üretir |
| `tools/on-yuz-varliklari.mjs` | `wwwroot/css/theme.css`, `wwwroot/icons/sprite.svg`, `wwwroot/lib/chart.js` üretimi, em/en dash kontrolü |
| `src/…Domain/` | Enum'lar, `VeritabaniKodu`, `BakiyeEtkisi`, `HesapNumarasi`; varlıklar |
| `src/…Application/Ortak/` | `Sonuc`/`AlanHatasi`, `SayfaSonucu`, `TurkceBicim`, `TutarMetni`, `IslemSatiri`, `Csv` |
| `src/…Application/Musteriler/`, `Hesaplar/`, `Ozet/` | Müşteri, hesap, genel bakış sözleşmeleri ve kuralları; `BakiyeGecmisi`, `PortfoyPozisyonu`, `NakitAkisi` |
| `src/…Application/Islemler/` | `IIslemServisi`, `IslemKaydi`, `IslemKurallari`, `PaketHatalari`, `Ekstre` (`IEkstreSorgusu`, `EkstreDonemleri`, `EkstreOzeti`) |
| `src/…Application/Raporlar/` | `IRaporSorgusu`, filtreler, `AylikOzet`, `BakiyeDegisimi` (+ `GrafikNoktalari`), `BakiyeDegisimOzeti`, `EnAktifSatir`, `RaporDonemleri` |
| `src/…Data/Musteriler/`, `Hesaplar/`, `Ozet/` | EF Core gerçeklemeleri (`TagWith` etiketli); genel bakışta nakit akışı Dapper ile |
| `src/…Data/Islemler/` | `IslemServisi` (Dapper + OracleTransaction, PKG_ISLEM; dekont EF), `EkstreSorgusu` (SUM() OVER) |
| `src/…Data/Raporlar/RaporSorgusu.cs` | PKG_RAPOR REF CURSOR çağrıları, `VW_EN_AKTIF_*` sorguları |
| `src/…Data/Izleme/` | `OracleIzBaglami` (AsyncLocal), `OracleIzDeposu`, `EfIzInterceptor`, `IzliDapper`, `IzBasligi` |
| `src/…Data/OracleFonksiyonlari.cs`, `OracleHatalari.cs`, `SorguYardimcilari.cs`, `OracleAltyapi.cs` | NLSSORT/NLS_UPPER; ORA hata yorumu; sıralama/sayfalama; bağlantı ve `OracleParametreleri` |
| `src/…Web/Program.cs` | Bağlantı kontrolü, MVC, tr-TR, durum sayfaları, Oracle izi (`UseOracleIzi`), `/saglik`, API |
| `src/…Web/Controllers/` | `Home`, `Musteri`, `Hesap` (+ `Ekstre`, `EkstreCsv`), `Islem` (`Yeni`, `Dekont`), `Rapor` (`AylikOzet`, `BakiyeDegisimi`, `EnAktif` + CSV'leri), `Hata` |
| `src/…Web/Api/` | `AramaUclari` (`/api/ara`, `/api/musteri/*`, `/api/hesap/ara`, `/api/hesap/{id}/islem`), `IslemApi` |
| `src/…Web/Altyapi/` | `SorguDizesi`, `Etiketler`, `WebUzantilari`, `OracleIzUzantilari`, `SqlRenklendirici`, `CsvDosyasi` |
| `src/…Web/TagHelpers/`, `ViewComponents/` | `<ikon>`, `<tutar>`, rozetler, `<kimlik>`, `<th sirala>`; `OracleIziViewComponent` |
| `src/…Web/Views/` | Shared (`_Layout`, `_Sayfalama`, `_Bos`, `_HataOzeti`, `_BakiyeCizgisi`, `_AylikOzetTablo`, `Components/OracleIzi`), Musteri, Hesap (+ `Ekstre`, `EkstreSec`), Islem (`Yeni`, `Dekont`), Rapor (`_RaporBasi`, `AylikOzet`, `BakiyeDegisimi`, `EnAktif`), Home, Hata |
| `src/…Web/wwwroot/` | `css/theme.css` (üretilir), `css/uygulama.css`, `js/uygulama.js`, `js/grafik.js`, `icons/sprite.svg` (üretilir), `lib/chart.js` (üretilir) |
| `tests/…/` | `DomainKurallariTestleri` (18), `UygulamaKurallariTestleri` (64), `IslemKurallariTestleri` (17), `EkstreTestleri` (12), `RaporTestleri` (27); toplam 138 |

## 7. Faz 5 planı: giriş, testler, sunum

Kapsam: arayüz planı S0 (giriş), şartnamedeki kimlik doğrulama, sunum malzemesi. Hedef görünüm: `docs/ekran/07-giris.png`,
prototipte `prototype/src/views/genel.js` (`V.giris`).

1. **Identity (tek admin):** ASP.NET Core Identity, cookie oturumu; tüm controller'lar `[Authorize]` (global filtre),
   `/Giris` ve `/saglik` anonim. Demo hesabı `admin@hesapmasasi.local` ilk çalıştırmada tohumlanır; parola koda yazılmaz
   (user-secrets, `Yonetici:Parola`). 5 hatalı denemede 5 dk kilit (Identity lockout), "Beni hatırla".
2. **Identity tabloları:** açık karar (Bölüm 10). Öneri: şema SQL betikleriyle yönetildiği için `db/05_identity.sql`
   (EF'nin ürettiği DDL'den, 19c uyumlu, `AspNet*` tabloları) ve `99_temizle.sql`'e silme satırları; EF migration kullanılmaz.
3. **Giriş ekranı:** prototipteki iki kolonlu düzen (form + koyu kobalt panel, mono ekstre dokusu), hata ve kilit mesajları,
   gönderimde kilitli düğme. Üst çubuktaki kullanıcı menüsüne "Oturumu kapat" (POST + antiforgery).
4. **Testler:** Oracle'a bağlanan entegrasyon testleri ayrı projede ve bağlantı yoksa atlanır: PKG_ISLEM hata kodları,
   transfer atomikliği, rapor sonuçlarının ekstreyle tutarlılığı (Faz 4'teki elle karşılaştırmaların otomatiği).
5. **Sunum:** tohum veriyi demo gününe göre yeniden üret ve kur; README'ye gerçek uygulamadan ekran görüntüleri
   (genel bakış, işlem + Oracle izi, aylık özet, bakiye değişimi); 1-2 dk demo kaydı. Geist fontları `wwwroot/fonts` altına.

## 8. Sonraki adımlar (Faz 5 sonrası)

- HTTPS ve üretim yapılandırması (ortam değişkeninden bağlantı cümlesi, `OracleIzi:Acik=false`).
- Genex şartnamesinin açık depoya konup konmayacağı kullanıcının kararı.

## 9. Bilinen tuzaklar

- PowerShell'den sqlplus'a boru ile metin gönderince başa BOM eklenir, ilk satır yok sayılır. Betikler `docker cp` ile.
  Git Bash'ten `docker exec -i ... sqlplus -s <<'EOF'` heredoc'u sorunsuz çalışır (hızlı kontrol sorguları için).
- sqlplus `NLS_LANG=AMERICAN_AMERICA.AL32UTF8` olmadan Türkçe karakterleri bozar (`kur.ps1` ayarlıyor).
- `ALTER TABLE` bağımlı trigger, view ve paketleri INVALID yapar; `DBMS_UTILITY.COMPILE_SCHEMA` ile derlenir.
- CHECK kısıtı UNKNOWN sonucu kabul eder; NULL kontrolleri açıkça yazılır.
- Windows PowerShell 5.1 BOM'suz `.ps1` dosyasını ANSI okur; `.ps1` dosyaları BOM'lu UTF-8 kaydedilir.
- Claude ortamı, aynı PowerShell komutunda hem `Remove-Item` hem `C:\Program Files` yolu geçerse komutu engeller.
- `dotnet run` kod değişikliğini almaz; sunucu yeniden başlatılır. Çalışan sunucu `bin/` DLL'lerini kilitler, aynı anda
  iki build ortak `obj/` klasörlerinde çakışır. `wwwroot` dosyaları ise diskten anında sunulur.
- `MapStaticAssets` statik dosya listesini derlemede çıkarır: `tools/on-yuz-varliklari.mjs` derlemeden önce çalıştırılır.
- Razor, enum tipli TagHelper özelliğinde tip adını kendisi ekler: `sirala-ilk="Azalan"` yazılır.
- tr-TR'de `ToUpper()` "i"yi "İ" yapar; veritabanı kodlarında `ToUpperInvariant()`. SVG yolu, CSS genişliği gibi makine
  metninde sayı `CultureInfo.InvariantCulture` ile yazılır.
- Dapper + ODP.NET: `OracleParametreleri` kullanılmazsa parametreler sıraya göre bağlanır (BindByName kapalı).
- `Url.Action(..., new { id })` varsayılan route'ta id'yi yola koyar; `[FromQuery]` ile bağlanan filtre onu görmez.
  Aynı nedenle `Url.Action("X") + Request.QueryString` yoldaki id'yi kaybeder: bağlantılar açık değerlerle kurulur.
- Controller'da eylem adı bir tiple aynıysa (`AylikOzet`, `BakiyeDegisimi`) eylem gövdesinde o tip adı yazılamaz
  (ad eylemi gösterir); `var` kullanılır.
- JS'te "2026-08-13" gibi saatsiz ISO tarih UTC okunur; sunucu tarihleri `ToString("s")` ile saatli gönderilir (yerel okunur).
- Tarayıcı panelinin sistem teması koyu: tema denemesinde açık tema elle seçilir, sonra "Sistem"e dönülür.
- Tarayıcı paneli, sayfa kaydırılmışken ekran görüntüsünün üstünde boş bir bant gösterebilir; panel gizliyken ekran
  görüntüsü alınamaz. Ölçüm için JS kullanılır.
- Proje OneDrive altında: `bin/`, `obj/`, `node_modules/` senkronize olur, dosya kilidi görülebilir.
- Windows Akıllı Uygulama Denetimi açık (`HKLM\SYSTEM\CurrentControlSet\Control\CI\Policy`,
  `VerifiedAndReputablePolicyState = 1`). İmzasız ve itibarı olmayan yeni derlenmiş bir DLL'i engelleyebilir: sunucu
  "Uygulama Denetimi ilkesi bu dosyayı engelledi (0x800711C7)" ile birkaç saniyede kapanır, tarayıcı paneli yine
  "başladı" der. Kayıt: Olay Görüntüleyicisi, Microsoft-Windows-CodeIntegrity/Operational, olay 3077/3033. Faz 3'ün son
  derlemesi engellendi, Faz 4'ün derlemeleri engellenmedi; karar derleme çıktısına göre değişiyor. Sunucu başladıktan sonra
  `preview_logs` ile "Now listening" satırı ve ilk istek kontrol edilir.

## 10. Açık konular

- Akıllı Uygulama Denetimi yeniden engellerse seçenekler kullanıcının: Denetimi Windows Güvenliği > Uygulama ve tarayıcı
  denetimi'nden kapatmak (kapatıldıktan sonra yeniden açmak Windows'u sıfırlamayı gerektirebilir), uygulamayı Docker/WSL
  içinde çalıştırmak ya da sonraki derlemede tekrar denemek. Sistem güvenlik ayarı Claude tarafından değiştirilmez.
- Genex şartnamesi (`musteri_hesap_yonetim_proje_speq.md`) açık depoya konma izni netleşene kadar `.gitignore`'da.
- Fontlar şimdilik Google Fonts'tan (sistem fontu yedeğiyle); self-host Faz 5'te.
- Identity tabloları SQL betiğiyle mi, EF migration ile mi (Faz 5; öneri Bölüm 7).
- HTTPS gerekirse eklenecek.
