using System.ComponentModel.DataAnnotations;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Application.Musteriler;

/// <summary>Müşteri CRUD. Silme yoktur; pasife alma soft delete'tir (AKTIF = 0).</summary>
public interface IMusteriServisi
{
    Task<SayfaSonucu<MusteriListeOgesi>> ListeleAsync(MusteriFiltre filtre, CancellationToken ct = default);
    Task<MusteriDetay?> DetayAsync(int id, CancellationToken ct = default);
    Task<Musteri?> GetirAsync(int id, CancellationToken ct = default);
    Task<Sonuc<int>> EkleAsync(MusteriKaydi kayit, CancellationToken ct = default);
    Task<Sonuc> GuncelleAsync(int id, MusteriKaydi kayit, CancellationToken ct = default);
    Task<Sonuc> PasifeAlAsync(int id, CancellationToken ct = default);
    Task<Sonuc> AktiflestirAsync(int id, CancellationToken ct = default);
    Task<string> YeniMusteriNoAsync(CancellationToken ct = default);
    Task<IReadOnlyList<MusteriAramaSonucu>> AraAsync(string q, int adet, CancellationToken ct = default);
}

public enum MusteriSiralama { Ad, No, Hesap, Bakiye, Kayit }

/// <summary>Liste filtreleri; GET sorgu dizesinden bağlanır (paylaşılabilir adres, geri tuşunda korunur).</summary>
public sealed class MusteriFiltre
{
    public string? Q { get; set; }
    public MusteriTipi? Tip { get; set; }
    public DurumFiltresi Durum { get; set; } = DurumFiltresi.Aktif;
    public MusteriSiralama Sirala { get; set; } = MusteriSiralama.Ad;
    public SiralamaYonu Yon { get; set; } = SiralamaYonu.Artan;
    public int Sayfa { get; set; } = 1;
    public int Boyut { get; set; } = Sayfalama.VarsayilanBoyut;

    public bool FiltreVar => !string.IsNullOrWhiteSpace(Q) || Tip is not null || Durum != DurumFiltresi.Aktif;
}

public sealed class MusteriListeOgesi
{
    public int Id { get; init; }
    public string MusteriNo { get; init; } = string.Empty;
    public string AdSoyad { get; init; } = string.Empty;
    public string? Eposta { get; init; }
    public string? Telefon { get; init; }
    public MusteriTipi Tip { get; init; }
    public int HesapSayisi { get; init; }
    public decimal ToplamBakiye { get; init; }
    public DateTime KayitTarihi { get; init; }
    public bool Aktif { get; init; }
}

public sealed class MusteriDetay
{
    public required Musteri Musteri { get; init; }
    public required IReadOnlyList<HesapOzeti> Hesaplar { get; init; }
    public required IReadOnlyList<IslemSatiri> SonIslemler { get; init; }

    /// <summary>null ise müşteri pasife alınabilir; değilse neden.</summary>
    public string? PasifeAlmaEngeli { get; init; }

    public decimal ToplamBakiye => Hesaplar.Sum(h => h.Bakiye);
    public DateTime? SonIslemTarihi => SonIslemler.Count > 0 ? SonIslemler[0].Tarih : null;
}

public sealed class HesapOzeti
{
    public int Id { get; init; }
    public string HesapNo { get; init; } = string.Empty;
    public HesapTipi Tip { get; init; }
    public decimal Bakiye { get; init; }
    public DateTime AcilisTarihi { get; init; }
    public DateTime? SonHareket { get; init; }
    public bool Aktif { get; init; }
}

/// <summary>Müşteri ekleme ve düzenleme formu. Ek kurallar (ad soyad, telefon biçimi) MusteriKurallari'nda.</summary>
public sealed class MusteriKaydi
{
    public MusteriTipi Tip { get; set; } = MusteriTipi.Bireysel;

    [Required(ErrorMessage = "Ad soyad veya ünvanı girin.")]
    [StringLength(150, ErrorMessage = "En fazla 150 karakter girin.")]
    public string AdSoyad { get; set; } = string.Empty;

    [Required(ErrorMessage = "Müşteri no girin.")]
    [RegularExpression("^[0-9]{8}$", ErrorMessage = "Müşteri no 8 haneli olmalı ve yalnız rakam içermeli.")]
    public string MusteriNo { get; set; } = string.Empty;

    [EmailAddress(ErrorMessage = "Geçerli bir e-posta girin, örneğin ad.soyad@example.com.")]
    [StringLength(150, ErrorMessage = "En fazla 150 karakter girin.")]
    public string? Eposta { get; set; }

    [StringLength(20, ErrorMessage = "En fazla 20 karakter girin.")]
    public string? Telefon { get; set; }
}

public sealed record MusteriAramaSonucu(int Id, string MusteriNo, string AdSoyad, MusteriTipi Tip, bool Aktif);
