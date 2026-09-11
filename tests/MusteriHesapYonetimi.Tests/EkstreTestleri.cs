using MusteriHesapYonetimi.Application.Islemler;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Tests;

public class EkstreDonemleriTestleri
{
    private static readonly DateTime Bugun = new(2026, 9, 11, 15, 30, 0);

    [Theory]
    [InlineData(null, "2026-09-01", "2026-09-11", EkstreDonemi.BuAy)]
    [InlineData(EkstreDonemi.GecenAy, "2026-08-01", "2026-08-31", EkstreDonemi.GecenAy)]
    [InlineData(EkstreDonemi.SonUcAy, "2026-07-01", "2026-09-11", EkstreDonemi.SonUcAy)]
    public void On_ayar_gun_araligina_cevrilir(EkstreDonemi? on, string bas, string bit, EkstreDonemi donem)
    {
        var sonuc = EkstreDonemleri.Coz(new EkstreFiltre { On = on }, Bugun);

        Assert.Equal((donem, DateTime.Parse(bas), DateTime.Parse(bit)), sonuc);
    }

    [Fact]
    public void Yalniz_tarih_verilirse_donem_ozeldir_eksik_uc_bugunle_tamamlanir()
    {
        var sonuc = EkstreDonemleri.Coz(new EkstreFiltre { Bas = new DateTime(2026, 7, 15) }, Bugun);

        Assert.Equal((EkstreDonemi.Ozel, new DateTime(2026, 7, 15), new DateTime(2026, 9, 11)), sonuc);
    }

    [Fact]
    public void Ters_verilen_tarihler_yer_degistirir()
    {
        var sonuc = EkstreDonemleri.Coz(new EkstreFiltre { On = EkstreDonemi.Ozel, Bas = new DateTime(2026, 9, 5), Bit = new DateTime(2026, 8, 1) }, Bugun);

        Assert.Equal((new DateTime(2026, 8, 1), new DateTime(2026, 9, 5)), (sonuc.Bas, sonuc.Bit));
    }

    [Fact]
    public void On_ayar_verilen_tarihlerden_onceliklidir()
        => Assert.Equal(EkstreDonemi.GecenAy, EkstreDonemleri.Coz(new EkstreFiltre { On = EkstreDonemi.GecenAy, Bas = new DateTime(2026, 1, 1) }, Bugun).Donem);
}

public class EkstreOzetiTestleri
{
    [Fact]
    public void Donem_basi_arti_giris_eksi_cikis_donem_sonudur()
    {
        IslemSatiri[] hareketler =
        [
            new() { Tip = IslemTipi.Yatirma, Tutar = 2_050m },
            new() { Tip = IslemTipi.Cekme, Tutar = 1_179.62m },
            new() { Tip = IslemTipi.TransferGiden, Tutar = 325m },
            new() { Tip = IslemTipi.TransferGelen, Tutar = 500m },
            new() { Tip = IslemTipi.Satim, Tutar = 100m }
        ];

        var ozet = EkstreOzeti.Hesapla(152_002.90m, hareketler);

        Assert.Equal(2_650m, ozet.Giris);
        Assert.Equal(3, ozet.GirisAdedi);
        Assert.Equal(1_504.62m, ozet.Cikis);
        Assert.Equal(2, ozet.CikisAdedi);
        Assert.Equal(152_002.90m + 2_650m - 1_504.62m, ozet.Kapanis);
    }
}

public class CsvTestleri
{
    [Fact]
    public void Ayirici_ve_tirnak_iceren_alan_tirnaga_alinir()
        => Assert.Equal("1;\"Kira; Eylül\";\"12\"\" ekran\";", Csv.Satir(["1", "Kira; Eylül", "12\" ekran", null]));

    [Theory]
    [InlineData("=HYPERLINK(\"x\")", "'=HYPERLINK(\"x\")")]
    [InlineData("-5", "'-5")]
    [InlineData("Maaş ödemesi", "Maaş ödemesi")]
    [InlineData(null, null)]
    public void Serbest_metin_formul_olarak_calismaz(string? girdi, string? beklenen)
        => Assert.Equal(beklenen, Csv.Metin(girdi));
}
