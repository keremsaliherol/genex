using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Tests;

public class VeritabaniKoduTestleri
{
    [Theory]
    [InlineData(IslemTipi.Yatirma, "YATIRMA")]
    [InlineData(IslemTipi.Cekme, "CEKME")]
    [InlineData(IslemTipi.TransferGelen, "TRANSFER_GELEN")]
    [InlineData(IslemTipi.TransferGiden, "TRANSFER_GIDEN")]
    [InlineData(IslemTipi.Alim, "ALIM")]
    [InlineData(IslemTipi.Satim, "SATIM")]
    public void IslemTipi_CHECK_kisitindaki_kodla_eslesir(IslemTipi tip, string kod)
    {
        Assert.Equal(kod, VeritabaniKodu.Yaz(tip));
        Assert.Equal(tip, VeritabaniKodu.Oku<IslemTipi>(kod));
    }

    [Fact]
    public void Musteri_ve_hesap_tipleri_veritabani_kodlariyla_eslesir()
    {
        Assert.Equal("BIREYSEL", VeritabaniKodu.Yaz(MusteriTipi.Bireysel));
        Assert.Equal("KURUMSAL", VeritabaniKodu.Yaz(MusteriTipi.Kurumsal));
        Assert.Equal("VADESIZ", VeritabaniKodu.Yaz(HesapTipi.Vadesiz));
        Assert.Equal(HesapTipi.Yatirim, VeritabaniKodu.Oku<HesapTipi>("YATIRIM"));
    }

    [Fact]
    public void Bilinmeyen_kod_acik_bir_hatayla_reddedilir()
    {
        var hata = Assert.Throws<ArgumentOutOfRangeException>(() => VeritabaniKodu.Oku<IslemTipi>("HAVALE"));
        Assert.Contains("HAVALE", hata.Message);
    }
}

/// <summary>Bu kurallar TRG_ISLEM_BAKIYE_GUNCELLE trigger'ıyla aynı olmalı.</summary>
public class BakiyeKuraliTestleri
{
    [Theory]
    [InlineData(IslemTipi.Yatirma, 1)]
    [InlineData(IslemTipi.TransferGelen, 1)]
    [InlineData(IslemTipi.Satim, 1)]
    [InlineData(IslemTipi.Cekme, -1)]
    [InlineData(IslemTipi.TransferGiden, -1)]
    [InlineData(IslemTipi.Alim, -1)]
    public void Islem_tipinin_bakiye_etkisi_trigger_ile_ayni(IslemTipi tip, int beklenen)
        => Assert.Equal(beklenen, tip.BakiyeEtkisi());

    [Fact]
    public void Transfer_cifti_toplam_bakiyeyi_degistirmez()
    {
        var giden = new Islem { IslemTipi = IslemTipi.TransferGiden, Tutar = 8_140.25m };
        var gelen = new Islem { IslemTipi = IslemTipi.TransferGelen, Tutar = 8_140.25m };
        Assert.Equal(0m, giden.IsaretliTutar + gelen.IsaretliTutar);
    }

    [Fact]
    public void Ardisik_islemler_trigger_gibi_bakiyeyi_uretir()
    {
        Islem[] islemler =
        [
            new() { IslemTipi = IslemTipi.Yatirma, Tutar = 12_400.00m },
            new() { IslemTipi = IslemTipi.Cekme, Tutar = 2_500.50m },
            new() { IslemTipi = IslemTipi.TransferGiden, Tutar = 3_000.00m },
            new() { IslemTipi = IslemTipi.TransferGelen, Tutar = 750.25m }
        ];
        Assert.Equal(7_649.75m, islemler.Sum(i => i.IsaretliTutar));
    }
}

public class HesapNumarasiTestleri
{
    [Theory]
    [InlineData("40218375", 1, "1001-40218375-01")]
    [InlineData("40218375", 12, "1001-40218375-12")]
    public void Sube_musteri_no_ve_iki_haneli_ek_no_ile_olusur(string musteriNo, int ekNo, string beklenen)
        => Assert.Equal(beklenen, HesapNumarasi.Olustur(musteriNo, ekNo));
}
