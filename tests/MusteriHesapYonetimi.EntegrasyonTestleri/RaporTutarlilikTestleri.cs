using Microsoft.EntityFrameworkCore;
using MusteriHesapYonetimi.Application.Islemler;
using MusteriHesapYonetimi.Application.Raporlar;
using MusteriHesapYonetimi.Data.Islemler;
using MusteriHesapYonetimi.Data.Raporlar;

namespace MusteriHesapYonetimi.EntegrasyonTestleri;

/// <summary>
/// Aynı veriyi farklı yollardan hesaplayan ekranların birbirini tutması: PKG_RAPOR, ekstre sorgusu (SUM() OVER),
/// view'lar ve trigger'ın tuttuğu HESAP.BAKIYE. Faz 4'te elle yapılan karşılaştırmaların otomatiği.
/// </summary>
public class RaporTutarlilikTestleri
{
    [OracleFact]
    public async Task Tum_hesaplarda_bakiye_islemlerin_isaretli_toplamina_esittir()
    {
        // TRG_ISLEM_BAKIYE_GUNCELLE ile aynı işaret kuralı
        var tutarsiz = await TestOrtami.DegerAsync<int>("""
            SELECT COUNT(*)
              FROM HESAP h
             WHERE h.BAKIYE <> (SELECT NVL(SUM(CASE WHEN i.ISLEM_TIPI IN ('YATIRMA', 'TRANSFER_GELEN', 'SATIM')
                                                    THEN i.TUTAR ELSE -i.TUTAR END), 0)
                                  FROM ISLEM i
                                 WHERE i.HESAP_ID = h.HESAP_ID)
            """);

        Assert.Equal(0, tutarsiz);
    }

    [OracleFact]
    public async Task Aylik_ozetin_net_etkisi_ekstrenin_giris_eksi_cikisidir()
    {
        await using var db = TestOrtami.Veritabani();
        var bugun = DateTime.Today;

        // Bu ayın ekstresi ay başından bugüne; aylık özet bütün ayı kapsar (gelecek tarihli işlem yok)
        var ozet = await new RaporSorgusu(TestOrtami.Fabrika(), db).AylikOzetAsync(RaporKapsami.Hesap, TestOrtami.GoksuHesabi, bugun.Year, bugun.Month);
        var ekstre = await new EkstreSorgusu(TestOrtami.Fabrika(), db).OkuAsync(TestOrtami.GoksuHesabi, new EkstreFiltre { On = EkstreDonemi.BuAy });

        Assert.NotNull(ozet);
        Assert.NotNull(ekstre);
        Assert.Equal(ekstre.Ozet.Giris - ekstre.Ozet.Cikis, ozet.NetEtki);
        Assert.Equal(ekstre.Ozet.GirisAdedi + ekstre.Ozet.CikisAdedi, ozet.ToplamAdet);
    }

    [OracleFact]
    public async Task Musteri_kapsamli_ozet_hesap_ozetlerinin_toplamidir()
    {
        await using var db = TestOrtami.Veritabani();
        var rapor = new RaporSorgusu(TestOrtami.Fabrika(), db);
        var bugun = DateTime.Today;
        var hesaplar = await db.Hesaplar.Where(h => h.MusteriId == TestOrtami.GoksuMusterisi).Select(h => h.HesapId).ToListAsync();

        decimal net = 0;
        var adet = 0;
        foreach (var hesapId in hesaplar)
        {
            var o = await rapor.AylikOzetAsync(RaporKapsami.Hesap, hesapId, bugun.Year, bugun.Month);
            net += o!.NetEtki;
            adet += o.ToplamAdet;
        }
        var musteri = await rapor.AylikOzetAsync(RaporKapsami.Musteri, TestOrtami.GoksuMusterisi, bugun.Year, bugun.Month);

        Assert.NotNull(musteri);
        Assert.Equal(hesaplar.Count, musteri.HesapSayisi);
        Assert.Equal((net, adet), (musteri.NetEtki, musteri.ToplamAdet));
    }

    [OracleFact]
    public async Task Bakiye_degisiminin_kapanisi_guncel_bakiye_ve_paketin_son_bakiyesidir()
    {
        await using var db = TestOrtami.Veritabani();
        var (_, bas, bit) = RaporDonemleri.Bakiye(new BakiyeDegisimiFiltre { On = BakiyeDonemi.Son90 }, DateTime.Today);

        var rapor = await new RaporSorgusu(TestOrtami.Fabrika(), db).BakiyeDegisimiAsync(TestOrtami.GoksuHesabi, bas, bit);
        var durum = await TestOrtami.HesapDurumuAsync(TestOrtami.GoksuHesabi);

        Assert.NotNull(rapor);
        Assert.NotEmpty(rapor.Hareketler);
        // Uygulamanın trigger kuralıyla hesapladığı kapanış = paketin SUM() OVER ile verdiği son bakiye = HESAP.BAKIYE
        Assert.Equal(rapor.Hareketler[^1].BakiyeSonra, rapor.Ozet.Kapanis);
        Assert.Equal(durum.Bakiye, rapor.Ozet.Kapanis);
    }

    [OracleFact]
    public async Task En_aktif_paketi_tum_zamanlarda_viewlarla_ayni_siralamayi_verir()
    {
        await using var db = TestOrtami.Veritabani();
        var rapor = new RaporSorgusu(TestOrtami.Fabrika(), db);

        foreach (var tur in Enum.GetValues<EnAktifTuru>())
        {
            var paket = await rapor.EnAktifAsync(tur, new DateTime(1900, 1, 1), 5);   // PKG_RAPOR.EN_AKTIF
            var view = await rapor.EnAktifAsync(tur, null, 5);                         // VW_EN_AKTIF_*

            // Eşit adet ve hacimde sıra iki yolda farklı olabilir; karşılaştırma değerler üzerinden
            Assert.Equal(5, paket.Count);
            Assert.Equal(view.Select(s => (s.IslemAdedi, s.Hacim)), paket.Select(s => (s.IslemAdedi, s.Hacim)));
        }
    }
}
