using MusteriHesapYonetimi.Application.Hesaplar;
using MusteriHesapYonetimi.Application.Musteriler;
using MusteriHesapYonetimi.Application.Ortak;

namespace MusteriHesapYonetimi.Web.Models;

/// <summary>_Sayfalama partial'ının modeli (SayfaSonucu generic olduğu için düz kopya).</summary>
public sealed record SayfaBilgisi(int Toplam, int Sayfa, int Boyut, int SonSayfa, int Bas, int Bit)
{
    public static SayfaBilgisi Olustur<T>(SayfaSonucu<T> s) => new(s.Toplam, s.Sayfa, s.Boyut, s.SonSayfa, s.Bas, s.Bit);
}

public sealed record MusteriListeSayfasi(MusteriFiltre Filtre, SayfaSonucu<MusteriListeOgesi> Sonuc);

public sealed record HesapListeSayfasi(HesapFiltre Filtre, HesapListesi Liste);

/// <summary>Boş durum: ikon, başlık, açıklama ve isteğe bağlı eylem bağlantısı.</summary>
public sealed record BosDurum(string Ikon, string Baslik, string Metin, string? EylemMetni = null, string? EylemAdresi = null, bool EylemBirincil = true);

/// <summary>Ekmek kırıntısı öğesi; son öğenin adresi olmaz.</summary>
public sealed record Kirinti(string Ad, string? Adres = null);
