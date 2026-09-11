using MusteriHesapYonetimi.Application.Hesaplar;
using MusteriHesapYonetimi.Application.Musteriler;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Tests;

public class MusteriKurallariTestleri
{
    [Theory]
    [InlineData("40218375", true)]
    [InlineData("4021837", false)]
    [InlineData("402183751", false)]
    [InlineData("4021837A", false)]
    [InlineData(" 40218375", false)]
    [InlineData(null, false)]
    public void Musteri_no_CK_MUSTERI_NO_BICIM_ile_ayni_kurali_uygular(string? no, bool gecerli)
        => Assert.Equal(gecerli, MusteriKurallari.MusteriNoGecerli(no));

    [Fact]
    public void Uretilen_musteri_no_her_zaman_8_hanelidir()
    {
        var rastgele = new Random(42);
        for (var i = 0; i < 1000; i++)
            Assert.True(MusteriKurallari.MusteriNoGecerli(MusteriKurallari.RastgeleMusteriNo(rastgele)));
    }

    [Theory]
    [InlineData(MusteriTipi.Bireysel, "", "Ad ve soyadı girin.")]
    [InlineData(MusteriTipi.Kurumsal, "  ", "Ünvanı girin.")]
    [InlineData(MusteriTipi.Bireysel, "Ay", "En az 3 karakter girin.")]
    [InlineData(MusteriTipi.Bireysel, "Deniz", "Ad ve soyadı birlikte girin.")]
    [InlineData(MusteriTipi.Kurumsal, "Arçelik", null)]
    [InlineData(MusteriTipi.Bireysel, "  Deniz   Aksoy ", null)]
    public void Ad_kurali_musteri_tipine_gore_degisir(MusteriTipi tip, string ad, string? beklenen)
        => Assert.Equal(beklenen, MusteriKurallari.AdHatasi(tip, ad));

    [Theory]
    [InlineData("05354054591", "+90 535 405 45 91")]
    [InlineData("5354054591", "+90 535 405 45 91")]
    [InlineData("+90 (535) 405-45-91", "+90 535 405 45 91")]
    [InlineData("905354054591", "+90 535 405 45 91")]
    [InlineData(" 12345 ", "12345")]
    [InlineData("  ", null)]
    public void Telefon_turkiye_bicimine_getirilir(string girdi, string? beklenen)
        => Assert.Equal(beklenen, MusteriKurallari.TelefonBicimle(girdi));

    [Fact]
    public void Dogrula_kaydi_duzeltir_ve_tum_hatalari_birlikte_doner()
    {
        var kayit = new MusteriKaydi { Tip = MusteriTipi.Bireysel, AdSoyad = "Deniz", MusteriNo = "123", Eposta = " ADA@", Telefon = "0535 405" };

        var hatalar = MusteriKurallari.Dogrula(kayit);

        Assert.Equal(["AdSoyad", "MusteriNo", "Eposta", "Telefon"], hatalar.Select(h => h.Alan));
        Assert.Equal("ada@", kayit.Eposta);
    }

    [Fact]
    public void Hesabi_olan_musterinin_numarasi_degismez()
    {
        Assert.NotNull(MusteriKurallari.MusteriNoDegisikligiHatasi(1));
        Assert.Null(MusteriKurallari.MusteriNoDegisikligiHatasi(0));
    }

    [Fact]
    public void Aktif_hesabinda_bakiye_olan_musteri_pasife_alinamaz()
    {
        HesapDurumu[] hesaplar = [new("1001-40218375-01", true, 0m, 0), new("1001-40218375-02", true, 1_250.50m, 0)];

        var engel = MusteriKurallari.PasifeAlmaEngeli(true, hesaplar);

        Assert.NotNull(engel);
        Assert.Contains("1001-40218375-02", engel);
        Assert.Contains("₺1.250,50", engel);
    }

    [Fact]
    public void Acik_pozisyon_da_musteriyi_pasife_almayi_engeller()
        => Assert.NotNull(MusteriKurallari.PasifeAlmaEngeli(true, [new HesapDurumu("1001-40218375-01", true, 0m, 2)]));

    [Fact]
    public void Bakiyesiz_ve_pozisyonsuz_musteri_pasife_alinabilir()
        => Assert.Null(MusteriKurallari.PasifeAlmaEngeli(true, [new HesapDurumu("1001-40218375-01", true, 0m, 0), new HesapDurumu("1001-40218375-02", false, 0m, 0)]));

    [Fact]
    public void Zaten_pasif_musteri_tekrar_pasife_alinmaz()
        => Assert.Equal("Müşteri zaten pasif.", MusteriKurallari.PasifeAlmaEngeli(false, []));
}

public class HesapKurallariTestleri
{
    [Theory]
    [InlineData(null, 1)]
    [InlineData(1, 2)]
    [InlineData(7, 8)]
    public void Ek_no_en_buyuk_ek_nonun_bir_fazlasidir(int? enBuyuk, int beklenen)
        => Assert.Equal(beklenen, HesapKurallari.SonrakiEkNo(enBuyuk));

    [Fact]
    public void Bakiyeli_hesap_pasife_alinamaz()
        => Assert.Contains("₺0,01", HesapKurallari.PasifeAlmaEngeli(new("1001-40218375-01", true, 0.01m, 0)));

    [Fact]
    public void Pozisyonlu_hesap_pasife_alinamaz()
        => Assert.NotNull(HesapKurallari.PasifeAlmaEngeli(new("1001-40218375-01", true, 0m, 1)));

    [Fact]
    public void Bakiyesi_sifir_ve_pozisyonsuz_hesap_pasife_alinabilir()
        => Assert.Null(HesapKurallari.PasifeAlmaEngeli(new("1001-40218375-01", true, 0m, 0)));

    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("0", null)]
    [InlineData("1.250,00", 1250.00)]
    [InlineData("8140.25", 8140.25)]
    public void Acilis_tutari_istege_baglidir_sifir_islem_olusturmaz(string? metin, double? beklenen)
    {
        Assert.Null(HesapKurallari.AcilisTutariHatasi(metin, out var tutar));
        Assert.Equal(beklenen is null ? null : (decimal)beklenen, tutar);
    }

    [Fact]
    public void Gecersiz_acilis_tutari_bicim_mesaji_doner()
        => Assert.NotNull(HesapKurallari.AcilisTutariHatasi("12,345", out _));
}

public class TutarMetniTestleri
{
    [Theory]
    [InlineData("8.140,25", 8140.25)]
    [InlineData("8140,25", 8140.25)]
    [InlineData("8140.25", 8140.25)]
    [InlineData("₺ 1.250", 1250)]
    [InlineData("1.250.000", 1250000)]
    [InlineData("0,5", 0.5)]
    public void Turkce_ve_noktali_yazimlar_ayni_tutari_verir(string metin, double beklenen)
    {
        Assert.True(TutarMetni.TryAyristir(metin, out var tutar));
        Assert.Equal((decimal)beklenen, tutar);
    }

    [Theory]
    [InlineData("")]
    [InlineData("abc")]
    [InlineData("12,345")]
    [InlineData("-5")]
    [InlineData("1,2,3")]
    [InlineData("12345678901234567")]
    public void Gecersiz_tutar_reddedilir(string metin)
        => Assert.False(TutarMetni.TryAyristir(metin, out _));
}

public class TurkceBicimTestleri
{
    [Theory]
    [InlineData(1234.56, false, "₺1.234,56")]
    [InlineData(-1234.5, false, "−₺1.234,50")]
    [InlineData(2094, true, "+₺2.094,00")]
    [InlineData(0, true, "₺0,00")]
    public void Para_tr_TR_bicimi_ve_tipografik_eksi_kullanir(double tutar, bool isaretli, string beklenen)
        => Assert.Equal(beklenen, TurkceBicim.Para((decimal)tutar, isaretli));

    [Theory]
    [InlineData(157_640_915.63, "₺157,6 mn")]
    [InlineData(48_200, "₺48,2 bin")]
    [InlineData(950, "₺950")]
    public void Kisa_para_buyuk_tutarlari_ozetler(double tutar, string beklenen)
        => Assert.Equal(beklenen, TurkceBicim.ParaKisa((decimal)tutar));

    [Fact]
    public void Tarih_gun_ay_yil_noktali_yazilir()
        => Assert.Equal("10.09.2026 14:32", TurkceBicim.TarihSaat(new DateTime(2026, 9, 10, 14, 32, 0)));
}

public class BakiyeGecmisiTestleri
{
    [Fact]
    public void Guncel_bakiyeden_geriye_her_hareketin_sonrasi_bulunur()
    {
        // Eskiden yeniye: +100 yatırma, -30 çekme, +5 gelen transfer. Güncel bakiye 75.
        List<IslemSatiri> yenidenEskiye =
        [
            new() { Tip = IslemTipi.TransferGelen, Tutar = 5m },
            new() { Tip = IslemTipi.Cekme, Tutar = 30m },
            new() { Tip = IslemTipi.Yatirma, Tutar = 100m }
        ];

        BakiyeGecmisi.BakiyeleriDoldur(75m, yenidenEskiye);

        Assert.Equal([75m, 70m, 100m], yenidenEskiye.Select(i => i.BakiyeSonra!.Value));
    }

    [Fact]
    public void Cizgi_noktalari_donem_basindan_bugune_siralidir()
    {
        var bas = new DateTime(2026, 6, 1);
        var t1 = new DateTime(2026, 7, 1);
        var t2 = new DateTime(2026, 8, 1);
        var simdi = new DateTime(2026, 9, 11);

        var noktalar = BakiyeGecmisi.Noktalar(70m, [(t2, -30m), (t1, 100m)], bas, simdi);

        Assert.Equal([bas, t1, t2, simdi], noktalar.Select(n => n.Zaman));
        Assert.Equal([0m, 100m, 70m, 70m], noktalar.Select(n => n.Bakiye));
    }
}

public class SayfalamaTestleri
{
    [Theory]
    [InlineData(5, 100, 25, 4)]
    [InlineData(0, 100, 25, 1)]
    [InlineData(2, 0, 25, 1)]
    [InlineData(3, 51, 25, 3)]
    public void Sayfa_toplama_gore_sikistirilir(int sayfa, int toplam, int boyut, int beklenen)
        => Assert.Equal(beklenen, Sayfalama.SayfaDuzelt(sayfa, toplam, boyut));

    [Fact]
    public void Izin_verilmeyen_sayfa_boyutu_varsayilana_doner()
    {
        Assert.Equal(25, Sayfalama.BoyutDuzelt(1000));
        Assert.Equal(50, Sayfalama.BoyutDuzelt(50));
    }
}
