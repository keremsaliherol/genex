# Demo senaryosu (1-2 dakika)

Görüşmede ya da kayıtta uygulamanın Oracle ve .NET tarafını birlikte göstermek için kısa akış. Her adımda ekranın altındaki
**Oracle izi** paneli açık tutulur (Alt+O): konuşmanın asıl malzemesi, ekranın çalıştırdığı SQL ve PL/SQL'dir.

## Hazırlık (kayıttan önce)

```powershell
node db/tools/tohum-uret.mjs                 # tohum veriyi bugüne göre üret: "bugünkü işlemler" dolu olur
$env:HESAP_DB_SIFRE = '<hesap kullanıcısının şifresi>'
powershell -NoProfile -ExecutionPolicy Bypass -File db\kur.ps1
dotnet test tests/MusteriHesapYonetimi.EntegrasyonTestleri   # yeni tohumla raporlar ve paketler tutarlı mı
dotnet run --project src/MusteriHesapYonetimi.Web --urls http://localhost:5080
```

Tarayıcı 1440 × 900, açık tema. Oracle izi panelinde "Temizle" ile başlanır.

## Akış

| Süre | Ekran | Ne yapılır | Ne söylenir |
|---|---|---|---|
| 0:00 | Giriş | Demo hesabıyla oturum açılır | ASP.NET Core Identity, tek yönetici; kimlik tabloları da şema gibi SQL betiğiyle kuruldu (migration yok). 5 hatalı denemede kilit. |
| 0:10 | Genel bakış | Göstergeler, nakit akışı grafiği, en aktif müşteriler | Sayılar EF Core ve Dapper'dan; en aktif listesi `PKG_RAPOR.EN_AKTIF` (izde REF CURSOR). |
| 0:25 | İşlem yap | Göksu Mobilya `1001-55510734-02` → başka bir hesaba transfer, tutar girilir | Önizleme çift kaydı gösterir: giden ve gelen. |
| 0:40 | Dekont | Onaylanır, dekont açılır; Oracle izi büyütülür | `PKG_ISLEM.TRANSFER` iki hesabı `FOR UPDATE` ile sabit sırada kilitler; bakiyeyi uygulama değil `TRG_ISLEM_BAKIYE_GUNCELLE` yazar (izde önce/sonra); COMMIT .NET'teki transaction'da. |
| 0:55 | İşlem yap | Bakiyeden büyük bir çekme, "Yine de gönder" | Kuralın tek kaynağı PL/SQL: paket `ORA-20001` ile reddeder, hata doğru alanın altında, izde ROLLBACK. |
| 1:10 | Ekstre | Aynı hesabın ekstresi, "Son 3 ay" | Yürüyen bakiye veritabanında `SUM() OVER`; dönem başı + giriş − çıkış = dönem sonu. CSV Türkçe Excel'de doğrudan açılır. |
| 1:25 | Raporlar | Aylık özet, sonra bakiye değişimi; tema koyuya alınır | `PKG_RAPOR` REF CURSOR'ları Dapper ile okunur; grafik renkleri tema token'larından, her grafiğin tablo karşılığı var. |
| 1:40 | Kapanış | README ya da test çıktısı | 138 birim + 12 Oracle entegrasyon testi: paket ret kodları ve raporların birbirini tuttuğu gerçek veritabanında denetlenir. SQL 19c uyumlu. |

## Kayıttan sonra

Deneme işlemleri veriyi değiştirir. Tohum veriye dönmek için `db\kur.ps1` yeniden çalıştırılır; kimlik tabloları da
sıfırlandığı için uygulama yeniden başlatılır (yönetici hesabı açılışta yeniden oluşur).
