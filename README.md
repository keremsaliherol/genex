# Hesap Masası

Bir aracı kurum veya bankanın müşteri, hesap ve işlem süreçlerini yöneten örnek uygulama.
ASP.NET Core MVC (.NET 10) arayüzü, Oracle veritabanı ve iş kurallarının bir kısmını
veritabanında çalıştıran PL/SQL paketleri.

> Genex Yazılım görüşmesi için hazırlanmış bir portföy projesidir. Veriler kurgusaldır.

## Neden bu teknolojiler

Sermaye piyasası ve bankacılık yazılımlarında veri Oracle'da, kritik iş kuralları çoğunlukla
PL/SQL'de tutulur. Bu proje o düzeni küçük ölçekte kurar:

- **Bakiye tek yerden değişir.** Uygulama bakiyeyi hiçbir zaman yazmaz. Her para hareketi `ISLEM`
  tablosuna eklenir; `TRG_ISLEM_BAKIYE_GUNCELLE` trigger'ı bakiyeyi günceller.
- **Para hareketleri PL/SQL paketinden geçer.** `PKG_ISLEM` hesabı `FOR UPDATE` ile kilitler, kuralları
  kontrol eder ve arayüzün tanıdığı hata kodlarını (`ORA-20001` yetersiz bakiye vb.) üretir.
- **Transfer yarım kalmaz.** Giden ve gelen kayıt aynı transaction'da yazılır; iki hesap sabit sırayla
  (küçük `HESAP_ID` önce) kilitlendiği için ters yönlü eşzamanlı transferler deadlock'a girmez.
- **Raporlar REF CURSOR döndürür.** `PKG_RAPOR` prosedürleri .NET tarafında Dapper ile okunur.
- **İki erişim yolu.** CRUD için EF Core, paket ve rapor çağrıları için Dapper.

## Durum

| Aşama | Durum |
|---|---|
| Faz 1: şema, PL/SQL paketleri, tohum veri, .NET çözümü | Tamam |
| Faz 2: müşteri ve hesap ekranları (liste, detay, ekle/düzenle, hesap aç, pasife al) | Tamam |
| Faz 3: işlem yap (yatır, çek, transfer, hisse), dekont, ekstre, Oracle izi paneli | Sırada |
| Faz 4: raporlar (PKG_RAPOR, grafikler) | Bekliyor |
| Faz 5: giriş (Identity), sunum | Bekliyor |

Ayrıntılı durum ve kararlar: [docs/devir-notlari.md](docs/devir-notlari.md).

Faz 2'den öne çıkanlar: müşteri no ve Türkçe ad araması (`NLS_UPPER` / `NLSSORT` ile `XTURKISH`), sayfayı
yenilemeden uygulanan GET filtreleri, hesap açılışında müşteri satırı kilidi ve açılış tutarının `PKG_ISLEM.YATIR`
ile aynı transaction'da işlenmesi, veritabanı kısıtlarıyla desteklenen pasife alma kuralları.

## Mimari

```
src/
  MusteriHesapYonetimi.Domain        Varlıklar, enum'lar, iş kuralları (bakiye etkisi, hesap no)
  MusteriHesapYonetimi.Application   Servis arayüzleri ve kullanım senaryoları
  MusteriHesapYonetimi.Data          EF Core eşlemesi, Dapper + ODP.NET, PL/SQL çağrıları
  MusteriHesapYonetimi.Web           ASP.NET Core MVC (Razor + Bootstrap 5.3)
tests/
  MusteriHesapYonetimi.Tests         xUnit
db/
  01_schema.sql   tablolar, kısıtlar, indeksler
  02_plsql.sql    trigger'lar, view'lar, PKG_ISLEM, PKG_RAPOR
  03_seed.sql     tohum veri (db/tools/tohum-uret.mjs üretir)
  04_dogrula.sql  tutarlılık kontrolü ve paket duman testi
  kur.ps1         hepsini konteynerde sırayla çalıştırır
docs/             arayüz planı, ekran görüntüleri, devir notları
prototype/        tıklanabilir arayüz prototipi
tools/            on-yuz-varliklari.mjs: prototipten tema CSS'i ve ikon sprite'ı üretir
```

Katmanlar tek yönlü bağımlıdır: Web → Application/Data → Domain. Şema SQL betikleriyle yönetilir;
EF Core migration kullanılmaz. SQL ve PL/SQL, Oracle 19c ile uyumlu yazılır; EF Core da
`OracleSQLCompatibility.DatabaseVersion19` ile 19c'ye göre SQL üretir.

## Kurulum

Gerekenler: .NET 10 SDK, Docker Desktop (Windows'ta WSL2), Node.js (yalnız tohum veri üretimi ve prototip için).

### 1. Oracle veritabanı (Docker)

```powershell
docker run -d --name hesap-oracle -p 127.0.0.1:1521:1521 -e TZ=Europe/Istanbul `
  -e ORACLE_PASSWORD=<yonetici-sifresi> -e APP_USER=hesap -e APP_USER_PASSWORD=<uygulama-sifresi> `
  -v hesap-oracle-data:/opt/oracle/oradata gvenzl/oracle-free:latest-faststart
docker logs -f hesap-oracle   # "DATABASE IS READY TO USE!" satırını bekleyin
```

### 2. Şema, PL/SQL ve tohum veri

```powershell
node db/tools/tohum-uret.mjs                  # db/03_seed.sql'i bugüne göre üretir
$env:HESAP_DB_SIFRE = '<uygulama-sifresi>'
./db/kur.ps1                                  # temizler, kurar, doğrular
```

Betik sonunda bakiye tutarlılığını ve `PKG_ISLEM` duman testini raporlar. Tekrar çalıştırmak güvenlidir.

### 3. Uygulama

```powershell
dotnet user-secrets set "ConnectionStrings:HesapMasasi" "User Id=hesap;Password=<uygulama-sifresi>;Data Source=localhost:1521/FREEPDB1" --project src/MusteriHesapYonetimi.Web
dotnet run --project src/MusteriHesapYonetimi.Web
```

Bağlantı cümlesi koda ve `appsettings.json`'a yazılmaz. Sağlık kontrolü: `GET /saglik`.

## Prototip

`prototype/` klasöründe arayüzün tıklanabilir demosu var (vanilla JS + Bootstrap 5.3):

```powershell
node prototype/build.mjs
node prototype/serve.mjs   # http://localhost:5173
```

Arayüz planı: [docs/arayuz-plani.md](docs/arayuz-plani.md), tasarım sistemi: [DESIGN.md](DESIGN.md).
