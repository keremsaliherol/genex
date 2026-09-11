# Devir notları: Hesap Masası

Yeni bir oturumun kaldığı yerden devam edebilmesi için güncel durum, kararlar ve Faz 4 planı.
Son güncelleme: 11 Eylül 2026. Şifreler bu dosyada yok; yerel değerler `CLAUDE.md`'de.

## 1. Durum

| Aşama | Durum | Çıktı |
|---|---|---|
| Arayüz planı | Tamam | [arayuz-plani.md](arayuz-plani.md), [../DESIGN.md](../DESIGN.md) |
| Tıklanabilir prototip | Tamam | `prototype/`, [ekran görüntüleri](ekran/), [Artifact](https://claude.ai/code/artifact/9dbfff5a-86d3-49b0-9a09-662219abb534) |
| Ortam kurulumu | Tamam | .NET SDK 10.0.401, WSL 2.7.13, Docker Desktop, `hesap-oracle` konteyneri |
| Faz 1: altyapı | Tamam, doğrulandı | `db/`, `MusteriHesapYonetimi.slnx`, `GET /saglik`, README |
| Faz 2: müşteri ve hesap CRUD | Tamam, doğrulandı | Kabuk ve tema, S2-S7, S11, genel bakışın gösterge kısmı |
| **Faz 3: işlemler, dekont, ekstre, Oracle izi** | **Tamam** (Oracle izinin tarayıcı doğrulaması bekliyor, Bölüm 10) | S8, dekont, S9, Oracle izi paneli, 111 test |
| Faz 4: raporlar | **Sırada** | Bölüm 7 |
| Faz 5: giriş, testler, sunum | Bekliyor | Identity, README görselleri, demo videosu |

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
- Oracle izi paneli derlendi ve birim testlerden geçti, ancak tarayıcıda doğrulanamadı: Windows Akıllı Uygulama Denetimi
  son derlemenin `MusteriHesapYonetimi.Web.dll`'ini yüklemedi (0x800711C7, CodeIntegrity olay 3077/3033). Bölüm 9 ve 10.
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
| Servis arayüzleri ve saf iş kuralları Application'da, gerçekleme Data'da | Kurallar veritabanı olmadan test edilir |
| İş kuralı ihlali istisna değil `Sonuc` döner (alan + mesaj + isteğe bağlı ORA kodu) | Web alanlı hatayı ModelState'e, alansızı bildirime aktarır; veritabanı reddi ayrıca gösterilir |
| Para hareketi kuralları yalnız PKG_ISLEM'de; uygulama pakete gitmeden önce yalnız zorunlu alan ve tutar biçimini kontrol eder | Kuralın tek kaynağı PL/SQL. Arayüzdeki bakiye/pozisyon kontrolü yalnız erken uyarı; "Yine de gönder" veritabanı reddini gösterir |
| `PaketHatalari`: ORA-200xx → form alanı (20001 → Tutar ya da Adet, 20012 → Hedef hesap, "Hedef ..." mesajı → hedef alanı) | Hata doğru alanın altında; teknik detayda ORA kodu |
| PKG_ISLEM çağrısı Dapper ile, isimli bağlama (`p_x => :x`), transaction .NET'te (`OracleTransaction`); hata olursa ROLLBACK | Paketler COMMIT etmez; transferin iki kaydı birlikte yazılır ya da hiçbiri |
| Dekonttaki işlem sonrası bakiye: güncel bakiye − sonraki hareketlerin işaretli toplamı | Ek kolon gerekmez; trigger kuralıyla aynı işaret |
| Ekstre Dapper ile: dönem başı bakiye `NVL(SUM(...))`, yürüyen bakiye `SUM() OVER (ORDER BY ISLEM_TARIHI, ISLEM_ID)`; tarih koşulu aralık (`>= :bas AND < :bit_ertesi`) | IDX_ISLEM_HESAP_TARIH kullanılır; tip filtresi yalnız gösterilen satırları daraltır, özet tüm hareketlerden |
| CSV: `;` ayırıcı, UTF-8 BOM, tr-TR ondalık virgül; serbest metin `=+-@` ile başlıyorsa önüne `'` | Türkçe Excel doğrudan açar; formül enjeksiyonu önlenir |
| **Oracle izi:** her sayfa isteğine `AsyncLocal` iz bağlamı (middleware, çerezle tarayıcı); EF Core komutları tek bir `DbCommandInterceptor`'dan, Dapper komutları `IzliDapper`'dan geçer; tarayıcı başına son 40 komut bellekte; panel `OracleIzi` ViewComponent | Controller ve servisler izden habersiz; POST → Redirect → GET'te kaydetme komutları da görünür; `/api` ve statik dosyalar izlenmez |
| İzde başlık EF Core `TagWith` etiketinden ("-- Müşteri listesi (sayfa)"); yoksa paket adı veya fiil + tablolar | Etiket SQL'in içinde de görünür; DBA'nın oturum izinde de sorgu tanınır |
| İşlemde iz açıksa bakiye çağrıdan önce ve sonra okunur, trigger'ın etkisi, COMMIT veya ROLLBACK ayrı girdi olarak yazılır | Trigger'ın UPDATE'i istemciye görünmez; panel "uygulama BAKIYE'yi yazmadı" gösterir |
| Oracle izi varsayılan yalnız Development'ta (`OracleIzi:Acik`); SQL renklendirme sunucuda (`SqlRenklendirici`) | Üretimde bind değerleri gösterilmez; panel JS'siz de okunur |
| Hesap açma tek transaction: `MUSTERI ... FOR UPDATE` (EF `FromSql`) → EF insert → Dapper `PKG_ISLEM.YATIR` → COMMIT | Aynı müşteriye eşzamanlı iki açılış aynı EK_NO'yu alamaz |
| Türkçe sıralama ve arama: `NLSSORT(..., 'NLS_SORT=XTURKISH')` ve `NLS_UPPER` EF `DbFunction` eşlemesiyle | Oturum ayarı havuzdaki bağlantıda durum taşır; bu yol SQL'de görünür |
| Tutar alanları metin olarak bağlanır, `TutarMetni` ayrıştırır; istemcide aynı kural, tutarlar kuruş | tr-TR model bağlayıcı "8140.25"i 814025 okur; kayan nokta hatası yok |
| Hesabı olan müşterinin numarası değiştirilemez | Hesap numarası müşteri numarasını içerir |
| Pasife alma kuralları Application'da; `CK_HESAP_PASIF_BAKIYE` son güvence | Prototipteki -20004/-20005/-20007 veritabanı kodu değil |
| Liste filtreleri GET sorgu dizesinde; JS varken `fetch` + `DOMParser` ile liste ve Oracle izi paneli yenilenir | Adres paylaşılabilir, geri tuşu çalışır, JS kapalıyken de form çalışır |
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
PKG_RAPOR.AYLIK_OZET_HESAP  (p_hesap_id, p_yil, p_ay, p_sonuc OUT SYS_REFCURSOR)
PKG_RAPOR.AYLIK_OZET_MUSTERI(p_musteri_id, p_yil, p_ay, p_sonuc OUT SYS_REFCURSOR)
PKG_RAPOR.BAKIYE_DEGISIMI   (p_hesap_id, p_bas, p_bit, p_acilis OUT, p_sonuc OUT SYS_REFCURSOR)
PKG_RAPOR.EN_AKTIF          (p_tur 'MUSTERI'|'HESAP', p_bas, p_adet, p_sonuc OUT SYS_REFCURSOR)
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

## 6. Kod haritası

| Dosya | İçerik |
|---|---|
| `db/01_schema.sql` … `04_dogrula.sql`, `99_temizle.sql`, `00_kur.sql`, `kur.ps1` | Şema, PL/SQL, tohum, doğrulama, silme, kurulum |
| `db/tools/tohum-uret.mjs` | `prototype/src/data.js`'i Node'da çalıştırıp `03_seed.sql` üretir |
| `tools/on-yuz-varliklari.mjs` | `wwwroot/css/theme.css` ve `wwwroot/icons/sprite.svg` üretimi, em/en dash kontrolü |
| `src/…Domain/` | Enum'lar, `VeritabaniKodu`, `BakiyeEtkisi`, `HesapNumarasi`; varlıklar |
| `src/…Application/Ortak/` | `Sonuc`/`AlanHatasi`, `SayfaSonucu`, `TurkceBicim`, `TutarMetni`, `IslemSatiri`, `Csv` |
| `src/…Application/Musteriler/`, `Hesaplar/`, `Ozet/` | Müşteri, hesap, genel bakış sözleşmeleri ve kuralları; `BakiyeGecmisi`, `PortfoyPozisyonu` |
| `src/…Application/Islemler/` | `IIslemServisi`, `IslemKaydi`, `IslemKurallari`, `PaketHatalari`, `Ekstre` (`IEkstreSorgusu`, `EkstreDonemleri`, `EkstreOzeti`) |
| `src/…Data/Musteriler/`, `Hesaplar/`, `Ozet/` | EF Core gerçeklemeleri (`TagWith` etiketli) |
| `src/…Data/Islemler/` | `IslemServisi` (Dapper + OracleTransaction, PKG_ISLEM; dekont EF), `EkstreSorgusu` (SUM() OVER) |
| `src/…Data/Izleme/` | `OracleIzBaglami` (AsyncLocal), `OracleIzDeposu`, `EfIzInterceptor`, `IzliDapper`, `IzBasligi` |
| `src/…Data/OracleFonksiyonlari.cs`, `OracleHatalari.cs`, `SorguYardimcilari.cs`, `OracleAltyapi.cs` | NLSSORT/NLS_UPPER; ORA hata yorumu; sıralama/sayfalama; bağlantı ve `OracleParametreleri` |
| `src/…Web/Program.cs` | Bağlantı kontrolü, MVC, tr-TR, durum sayfaları, Oracle izi (`UseOracleIzi`), `/saglik`, API |
| `src/…Web/Controllers/` | `Home`, `Musteri`, `Hesap` (+ `Ekstre`, `EkstreCsv`), `Islem` (`Yeni`, `Dekont`), `Hata` |
| `src/…Web/Api/` | `AramaUclari` (`/api/ara`, `/api/musteri/*`, `/api/hesap/ara`, `/api/hesap/{id}/islem`), `IslemApi` |
| `src/…Web/Altyapi/` | `SorguDizesi`, `Etiketler`, `WebUzantilari`, `OracleIzUzantilari`, `SqlRenklendirici` |
| `src/…Web/TagHelpers/`, `ViewComponents/` | `<ikon>`, `<tutar>`, rozetler, `<kimlik>`, `<th sirala>`; `OracleIziViewComponent` |
| `src/…Web/Views/` | Shared (`_Layout`, `_Sayfalama`, `_Bos`, `_HataOzeti`, `_BakiyeCizgisi`, `Components/OracleIzi`), Musteri, Hesap (+ `Ekstre`, `EkstreSec`), Islem (`Yeni`, `Dekont`), Home, Hata |
| `src/…Web/wwwroot/` | `css/theme.css` (üretilir), `css/uygulama.css`, `js/uygulama.js`, `icons/sprite.svg` (üretilir) |
| `tests/…/` | `DomainKurallariTestleri` (18), `UygulamaKurallariTestleri` (64), `IslemKurallariTestleri` (17), `EkstreTestleri` (12) |

## 7. Faz 4 planı: raporlar ve genel bakış grafikleri

Kapsam: arayüz planı S10 (aylık özet, bakiye değişimi, en aktif) ve S1'in grafik kısmı. Hedef görünüm:
`docs/ekran/01-genel-bakis.png`, `06-rapor-aylik-ozet.png`, prototipte `prototype/src/views/rapor.js`, `genel.js`, `charts.js`.

1. **Application:** `IRaporSorgusu`: `AylikOzetAsync(kapsam Hesap|Musteri, id, yil, ay)` → işlem tipine göre adet ve toplam;
   `BakiyeDegisimiAsync(hesapId, bas, bit)` → dönem başı + noktalar; `EnAktifAsync(tur, bas, adet)`. Dönem ön ayarları
   (son 30 gün, bu yıl, tümü) ve net etki hesabı saf fonksiyon, testli.
2. **Data:** Dapper ile `BEGIN PKG_RAPOR.AYLIK_OZET_HESAP(p_hesap_id => :id, ..., p_sonuc => :sonuc); END;`;
   `OracleParametreleri.RefCursor("sonuc")` ve `QueryIzliAsync` (REF CURSOR sonuç kümesi olarak okunur).
   `BAKIYE_DEGISIMI`'nde `p_acilis` OUT değeri çağrıdan sonra `Oku<decimal>`. Genel bakış: günlük nakit akışı sorgusu
   (`TRUNC(ISLEM_TARIHI)`, `IDX_ISLEM_TARIH`), `VW_EN_AKTIF_MUSTERILER` (sıralama sorguda).
3. **Web:** `RaporController` (`AylikOzet`, `BakiyeDegisimi`, `EnAktif`), üstte sekme gezinmesi, parametreler GET'te;
   CSV ve yazdırma ekstredeki gibi. Chart.js 4 `wwwroot/lib/chart.js`'e (prototipin npm paketinden,
   `tools/on-yuz-varliklari.mjs` kopyalar); renkler theme.css'teki `--viz-*` token'larından, grafiklerin yanında
   "Tablo olarak göster" alternatifi. Menüdeki "Raporlar" açılır; müşteri ve hesap detayına "Aylık özet" sekmesi;
   genel bakışa nakit akışı grafiği, en aktif müşteriler ve hesap dağılımı.
4. **Testler:** dönem hesabı, özet net etkisi, bakiye değişiminde başlangıç + değişim = bitiş.
5. **Doğrulama:** rapor sonuçlarının ekstre ve hesap detayıyla tutarlılığı; Oracle izinde REF CURSOR çağrısı; açık ve koyu tema
   grafik renkleri. Deneme kayıtlarından sonra `db\kur.ps1`.

## 8. Sonraki faz

- **Faz 5:** ASP.NET Core Identity (tek admin), testler, README ekran görüntüleri, 1-2 dk demo kaydı.
  Geist fontlarının `wwwroot/fonts` altına alınması.

## 9. Bilinen tuzaklar

- PowerShell'den sqlplus'a boru ile metin gönderince başa BOM eklenir, ilk satır yok sayılır. Betikler `docker cp` ile.
- sqlplus `NLS_LANG=AMERICAN_AMERICA.AL32UTF8` olmadan Türkçe karakterleri bozar (`kur.ps1` ayarlıyor).
- `ALTER TABLE` bağımlı trigger, view ve paketleri INVALID yapar; `DBMS_UTILITY.COMPILE_SCHEMA` ile derlenir.
- CHECK kısıtı UNKNOWN sonucu kabul eder; NULL kontrolleri açıkça yazılır.
- Windows PowerShell 5.1 BOM'suz `.ps1` dosyasını ANSI okur; `.ps1` dosyaları BOM'lu UTF-8 kaydedilir.
- Claude ortamı, aynı PowerShell komutunda hem `Remove-Item` hem `C:\Program Files` yolu geçerse komutu engeller.
- `dotnet run` kod değişikliğini almaz; sunucu yeniden başlatılır. Çalışan sunucu `bin/` DLL'lerini kilitler, aynı anda
  iki build ortak `obj/` klasörlerinde çakışır. `wwwroot` dosyaları ise diskten anında sunulur.
- `MapStaticAssets` statik dosya listesini derlemede çıkarır: `tools/on-yuz-varliklari.mjs` derlemeden önce çalıştırılır.
- Razor, enum tipli TagHelper özelliğinde tip adını kendisi ekler: `sirala-ilk="Azalan"` yazılır.
- tr-TR'de `ToUpper()` "i"yi "İ" yapar; veritabanı kodlarında `ToUpperInvariant()`. SVG yolu gibi makine metninde sayı
  `CultureInfo.InvariantCulture` ile yazılır.
- Dapper + ODP.NET: `OracleParametreleri` kullanılmazsa parametreler sıraya göre bağlanır (BindByName kapalı).
- Tarayıcı paneli, sayfa kaydırılmışken ekran görüntüsünün üstünde boş bir bant gösterebilir; panel gizliyken ekran
  görüntüsü alınamaz. Ölçüm için JS kullanılır.
- Proje OneDrive altında: `bin/`, `obj/`, `node_modules/` senkronize olur, dosya kilidi görülebilir.
- Windows Akıllı Uygulama Denetimi açık (`HKLM\SYSTEM\CurrentControlSet\Control\CI\Policy`,
  `VerifiedAndReputablePolicyState = 1`). İmzasız ve itibarı olmayan yeni derlenmiş bir DLL'i engelleyebilir: sunucu
  "Uygulama Denetimi ilkesi bu dosyayı engelledi (0x800711C7)" ile birkaç saniyede kapanır, tarayıcı paneli yine
  "başladı" der. Kayıt: Olay Görüntüleyicisi, Microsoft-Windows-CodeIntegrity/Operational, olay 3077/3033. Önceki
  derlemeler engellenmedi; karar derleme çıktısına göre değişiyor.

## 10. Açık konular

- Akıllı Uygulama Denetimi engeli (11 Eylül 2026, Faz 3 son derlemesi): Oracle izinin tarayıcı doğrulaması bekliyor.
  Seçenekler kullanıcının: Denetimi Windows Güvenliği > Uygulama ve tarayıcı denetimi'nden kapatmak (kapatıldıktan sonra
  yeniden açmak Windows'u sıfırlamayı gerektirebilir), uygulamayı Docker/WSL içinde çalıştırmak ya da sonraki derlemede
  tekrar denemek. Sistem güvenlik ayarı Claude tarafından değiştirilmez.
- Genex şartnamesi (`musteri_hesap_yonetim_proje_speq.md`) açık depoya konma izni netleşene kadar `.gitignore`'da.
- Fontlar şimdilik Google Fonts'tan (sistem fontu yedeğiyle); self-host Faz 5'te.
- Identity tabloları SQL betiğiyle mi, EF migration ile mi (Faz 5).
- HTTPS gerekirse eklenecek.
