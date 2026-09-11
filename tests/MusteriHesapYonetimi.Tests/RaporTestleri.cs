using MusteriHesapYonetimi.Application.Hesaplar;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Application.Ozet;
using MusteriHesapYonetimi.Application.Raporlar;
using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Tests;

public class RaporDonemleriTestleri
{
    private static readonly DateTime Bugun = new(2026, 9, 11, 15, 30, 0);

    [Theory]
    [InlineData(null, null, 2026, 9)]
    [InlineData(2025, 13, 2025, 12)]
    [InlineData(2026, 0, 2026, 1)]
    [InlineData(2030, 5, 2026, 5)]
    [InlineData(1990, 5, 2024, 5)]
    public void Ay_ve_yil_secilebilen_araliga_cekilir(int? yil, int? ay, int beklenenYil, int beklenenAy)
        => Assert.Equal((beklenenYil, beklenenAy), RaporDonemleri.Ay(yil, ay, Bugun));

    [Fact]
    public void Ay_adi_turkce()
        => Assert.Equal("Eylül 2026", RaporDonemleri.AyAdi(2026, 9));

    [Theory]
    [InlineData(BakiyeDonemi.Son30, "2026-08-13")]
    [InlineData(BakiyeDonemi.Son90, "2026-06-14")]
    [InlineData(BakiyeDonemi.Son180, "2026-03-16")]
    public void Hazir_bakiye_donemi_bugun_dahil_gun_sayar(BakiyeDonemi on, string bas)
    {
        var sonuc = RaporDonemleri.Bakiye(new BakiyeDegisimiFiltre { On = on }, Bugun);

        Assert.Equal((on, DateTime.Parse(bas), new DateTime(2026, 9, 11)), sonuc);
    }

    [Fact]
    public void Donem_verilmezse_son_90_gun()
        => Assert.Equal(BakiyeDonemi.Son90, RaporDonemleri.Bakiye(new BakiyeDegisimiFiltre(), Bugun).Donem);

    [Fact]
    public void Yalniz_bitis_verilirse_donem_ozel_baslangic_son_90_gunle_tamamlanir()
    {
        var sonuc = RaporDonemleri.Bakiye(new BakiyeDegisimiFiltre { Bit = new DateTime(2026, 8, 31) }, Bugun);

        Assert.Equal((BakiyeDonemi.Ozel, new DateTime(2026, 6, 14), new DateTime(2026, 8, 31)), sonuc);
    }

    [Fact]
    public void Ters_verilen_tarihler_yer_degistirir()
    {
        var sonuc = RaporDonemleri.Bakiye(
            new BakiyeDegisimiFiltre { On = BakiyeDonemi.Ozel, Bas = new DateTime(2026, 9, 5), Bit = new DateTime(2026, 8, 1) }, Bugun);

        Assert.Equal((new DateTime(2026, 8, 1), new DateTime(2026, 9, 5)), (sonuc.Bas, sonuc.Bit));
    }

    [Theory]
    [InlineData(EnAktifDonemi.Son30Gun, "2026-08-13")]
    [InlineData(EnAktifDonemi.BuYil, "2026-01-01")]
    public void En_aktif_baslangici(EnAktifDonemi donem, string bas)
        => Assert.Equal(DateTime.Parse(bas), RaporDonemleri.EnAktifBaslangic(donem, Bugun));

    [Fact]
    public void Tum_kayitlarda_tarih_suzgeci_yok()
        => Assert.Null(RaporDonemleri.EnAktifBaslangic(EnAktifDonemi.Tumu, Bugun));

    [Theory]
    [InlineData(5, 5)]
    [InlineData(20, 20)]
    [InlineData(7, 10)]
    [InlineData(100000, 10)]
    public void En_aktif_adedi_listeyle_sinirli(int n, int beklenen)
        => Assert.Equal(beklenen, new EnAktifFiltre { N = n }.Adet);
}

public class AylikOzetTestleri
{
    [Fact]
    public void Net_etki_giris_tiplerinin_toplamindan_cikis_tipleri_cikarilir()
    {
        // docs/ekran/06-rapor-aylik-ozet.png'deki satırlar
        AylikOzetSatiri[] satirlar =
        [
            new(IslemTipi.Yatirma, 7, 997_870.50m),
            new(IslemTipi.Cekme, 6, 66_906.09m),
            new(IslemTipi.TransferGiden, 6, 112_552.03m)
        ];

        Assert.Equal(818_412.38m, AylikOzetHesabi.NetEtki(satirlar));
    }

    [Fact]
    public void Hisse_satimi_giris_alimi_cikistir()
    {
        AylikOzetSatiri[] satirlar =
        [
            new(IslemTipi.Alim, 1, 1_000m),
            new(IslemTipi.Satim, 1, 400m),
            new(IslemTipi.TransferGelen, 1, 50m)
        ];

        Assert.Equal(-550m, AylikOzetHesabi.NetEtki(satirlar));
        Assert.Equal([-1_000m, 400m, 50m], satirlar.Select(s => s.IsaretliToplam));
    }
}

public class BakiyeDegisimOzetiTestleri
{
    private static readonly DateTime Bas = new(2026, 8, 1);

    private static IslemSatiri Islem(int gun, IslemTipi tip, decimal tutar, decimal? sonra = null)
        => new() { Tarih = Bas.AddDays(gun), Tip = tip, Tutar = tutar, BakiyeSonra = sonra };

    [Fact]
    public void Baslangic_arti_net_degisim_bitistir()
    {
        IslemSatiri[] hareketler =
        [
            Islem(1, IslemTipi.Yatirma, 2_000m),
            Islem(2, IslemTipi.Cekme, 3_500m),
            Islem(3, IslemTipi.TransferGelen, 250.25m),
            Islem(4, IslemTipi.Alim, 100m)
        ];

        var ozet = BakiyeDegisimOzeti.Hesapla(10_000m, Bas, hareketler);

        Assert.Equal(8_650.25m, ozet.Kapanis);
        Assert.Equal(ozet.Acilis + hareketler.Sum(h => h.IsaretliTutar), ozet.Kapanis);
        Assert.Equal(-1_349.75m, ozet.NetDegisim);
        Assert.Equal(4, ozet.IslemAdedi);
        Assert.Equal(new BakiyeUcu(12_000m, Bas.AddDays(1)), ozet.EnYuksek);
        Assert.Equal(new BakiyeUcu(8_500m, Bas.AddDays(2)), ozet.EnDusuk);
    }

    [Fact]
    public void Hareketsiz_donemde_bakiye_sabit_uclar_donem_basi()
    {
        var ozet = BakiyeDegisimOzeti.Hesapla(500m, Bas, []);

        Assert.Equal((500m, 0m, 0), (ozet.Kapanis, ozet.NetDegisim, ozet.IslemAdedi));
        Assert.Equal(new BakiyeUcu(500m, Bas), ozet.EnYuksek);
        Assert.Equal(ozet.EnYuksek, ozet.EnDusuk);
    }

    [Fact]
    public void Grafik_noktalari_donem_basi_hareketler_ve_simdi()
    {
        var simdi = new DateTime(2026, 8, 11, 15, 30, 0);
        IslemSatiri[] hareketler = [Islem(2, IslemTipi.Yatirma, 100m, sonra: 600m)];
        var rapor = new BakiyeDegisimi
        {
            Bas = Bas,
            Bit = simdi.Date,
            Hareketler = hareketler,
            Ozet = BakiyeDegisimOzeti.Hesapla(500m, Bas, hareketler)
        };

        Assert.Equal(
            [new BakiyeNoktasi(Bas, 500m), new BakiyeNoktasi(Bas.AddDays(2), 600m), new BakiyeNoktasi(simdi, 600m)],
            rapor.GrafikNoktalari(simdi));
    }

    [Fact]
    public void Gecmis_donemde_son_nokta_bitis_gununun_sonu()
    {
        var rapor = new BakiyeDegisimi
        {
            Bas = Bas,
            Bit = new DateTime(2026, 8, 5),
            Hareketler = [],
            Ozet = BakiyeDegisimOzeti.Hesapla(500m, Bas, [])
        };

        Assert.Equal(new BakiyeNoktasi(new DateTime(2026, 8, 6), 500m), rapor.GrafikNoktalari(new DateTime(2026, 9, 11, 15, 30, 0))[^1]);
    }
}

public class NakitAkisiTestleri
{
    private static readonly DateTime Bugun = new(2026, 9, 11, 15, 30, 0);

    [Fact]
    public void Otuz_gun_eskiden_yeniye_eksik_gunler_sifir()
    {
        var gunler = NakitAkisi.Doldur(Bugun,
        [
            new GunlukAkis(new DateTime(2026, 9, 11), 1_000m, 250m),
            new GunlukAkis(new DateTime(2026, 8, 13), 0m, 75m)
        ]);

        Assert.Equal(30, gunler.Count);
        Assert.Equal((new DateTime(2026, 8, 13), -75m), (gunler[0].Gun, gunler[0].Net));
        Assert.Equal((new DateTime(2026, 9, 11), 750m), (gunler[^1].Gun, gunler[^1].Net));
        Assert.All(gunler.Skip(1).Take(28), g => Assert.Equal((0m, 0m), (g.Giris, g.Cikis)));
    }

    [Fact]
    public void Pencere_disindaki_gun_alinmaz()
    {
        var gunler = NakitAkisi.Doldur(Bugun, [new GunlukAkis(new DateTime(2026, 8, 12), 999m, 0m)]);

        Assert.Equal(0m, gunler.Sum(g => g.Giris));
    }
}
