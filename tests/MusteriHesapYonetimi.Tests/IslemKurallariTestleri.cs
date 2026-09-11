using MusteriHesapYonetimi.Application.Islemler;
using MusteriHesapYonetimi.Application.Ortak;

namespace MusteriHesapYonetimi.Tests;

public class IslemKurallariTestleri
{
    [Fact]
    public void Gecerli_yatirma_tutari_ayristirir()
    {
        var hatalar = IslemKurallari.Dogrula(new IslemKaydi { HesapId = 5001, Tur = IslemTuru.Yatirma, Tutar = "8.140,25" }, out var tutar);

        Assert.Empty(hatalar);
        Assert.Equal(8140.25m, tutar);
    }

    [Fact]
    public void Hesapsiz_ve_hedefsiz_transfer_iki_alan_hatasi_verir()
    {
        var hatalar = IslemKurallari.Dogrula(new IslemKaydi { Tur = IslemTuru.Transfer, Tutar = "100" }, out _);

        Assert.Equal(["HesapId", "HedefHesapId"], hatalar.Select(h => h.Alan));
    }

    [Theory]
    [InlineData(null, "Tutarı girin.")]
    [InlineData("12,345", "Tutarı 1.250,00 biçiminde, en fazla 2 ondalıkla girin.")]
    public void Tutar_zorunlu_ve_bicimli(string? tutar, string mesaj)
    {
        var hatalar = IslemKurallari.Dogrula(new IslemKaydi { HesapId = 1, Tur = IslemTuru.Cekme, Tutar = tutar }, out _);

        Assert.Equal(mesaj, Assert.Single(hatalar).Mesaj);
    }

    [Fact]
    public void Hisse_isleminde_tutar_istenmez_hisse_ve_adet_istenir()
    {
        var hatalar = IslemKurallari.Dogrula(new IslemKaydi { HesapId = 1, Tur = IslemTuru.Alim, Tutar = "gecersiz" }, out _);

        Assert.Equal(["HisseKodu", "Adet"], hatalar.Select(h => h.Alan));
    }

    [Fact]
    public void Bakiye_ve_ayni_hesap_kurallari_pakete_birakilir()
    {
        // Aynı hesaba transfer ve sıfır tutar biçim olarak geçerli; reddi PKG_ISLEM yapar (-20012, -20011)
        var hatalar = IslemKurallari.Dogrula(new IslemKaydi { HesapId = 1, HedefHesapId = 1, Tur = IslemTuru.Transfer, Tutar = "0" }, out _);

        Assert.Empty(hatalar);
    }
}

public class PaketHatalariTestleri
{
    [Theory]
    [InlineData(20001, IslemTuru.Cekme, "Yetersiz bakiye. Kullanılabilir: ₺10,00", "Tutar")]
    [InlineData(20001, IslemTuru.Alim, "Yetersiz bakiye. Kullanılabilir: ₺10,00", "Adet")]
    [InlineData(20003, IslemTuru.Satim, "Satılabilir adet: 5", "Adet")]
    [InlineData(20011, IslemTuru.Yatirma, "Tutar sıfırdan büyük olmalı", "Tutar")]
    [InlineData(20012, IslemTuru.Transfer, "Aynı hesaba transfer yapılamaz.", "HedefHesapId")]
    [InlineData(20002, IslemTuru.Transfer, "Hedef hesap pasif. İşlem yapılamaz.", "HedefHesapId")]
    [InlineData(20002, IslemTuru.Cekme, "Bu hesap sahibi müşteri pasif. İşlem yapılamaz.", "HesapId")]
    [InlineData(20006, IslemTuru.Alim, "Hisse işlemi yalnız yatırım hesabında yapılır.", "Tur")]
    [InlineData(20999, IslemTuru.Yatirma, "Bilinmeyen", null)]
    public void Paket_hata_kodu_ilgili_form_alanina_eslenir(int kod, IslemTuru tur, string mesaj, string? alan)
        => Assert.Equal(alan, PaketHatalari.Alan(kod, mesaj, tur));

    [Fact]
    public void Oracle_kodu_bes_haneli_yazilir() => Assert.Equal("ORA-20001", PaketHatalari.Kod(20001));

    [Fact]
    public void Dekont_zamani_milisaniyeyle_yazilir()
        => Assert.Equal("10.09.2026 14:32:05.123", TurkceBicim.TarihSaatSaniye(new DateTime(2026, 9, 10, 14, 32, 5, 123)));
}
