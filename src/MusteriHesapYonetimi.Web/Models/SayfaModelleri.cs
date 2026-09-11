using MusteriHesapYonetimi.Application.Hesaplar;
using MusteriHesapYonetimi.Application.Musteriler;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Application.Raporlar;

namespace MusteriHesapYonetimi.Web.Models;

/// <summary>_Sayfalama partial'ının modeli (SayfaSonucu generic olduğu için düz kopya).</summary>
public sealed record SayfaBilgisi(int Toplam, int Sayfa, int Boyut, int SonSayfa, int Bas, int Bit)
{
    public static SayfaBilgisi Olustur<T>(SayfaSonucu<T> s) => new(s.Toplam, s.Sayfa, s.Boyut, s.SonSayfa, s.Bas, s.Bit);
}

public sealed record MusteriListeSayfasi(MusteriFiltre Filtre, SayfaSonucu<MusteriListeOgesi> Sonuc);

public sealed record HesapListeSayfasi(HesapFiltre Filtre, HesapListesi Liste);

/// <summary>Aylık özet raporu; kayıt seçilmemişse Ozet null (seçim ekranı).</summary>
public sealed record AylikOzetSayfasi(RaporKapsami Kapsam, int Yil, int Ay, AylikOzet? Ozet);

/// <summary>Bakiye değişimi raporu; hesap seçilmemişse Rapor null. Dönem ve tarihler seçici için her durumda dolu.</summary>
public sealed record BakiyeDegisimiSayfasi(BakiyeDonemi Donem, DateTime Bas, DateTime Bit, BakiyeDegisimi? Rapor);

public sealed record EnAktifSayfasi(EnAktifFiltre Filtre, IReadOnlyList<EnAktifSatir> Satirlar);

/// <summary>Boş durum: ikon, başlık, açıklama ve isteğe bağlı eylem bağlantısı.</summary>
public sealed record BosDurum(string Ikon, string Baslik, string Metin, string? EylemMetni = null, string? EylemAdresi = null, bool EylemBirincil = true);

/// <summary>Ekmek kırıntısı öğesi; son öğenin adresi olmaz.</summary>
public sealed record Kirinti(string Ad, string? Adres = null);
