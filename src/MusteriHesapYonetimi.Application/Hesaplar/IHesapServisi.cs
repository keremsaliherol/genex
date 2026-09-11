using System.ComponentModel.DataAnnotations;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Application.Hesaplar;

/// <summary>Hesap listesi, detay, açma ve pasife alma. Bakiye yalnız okunur; açılış tutarı PKG_ISLEM.YATIR ile girer.</summary>
public interface IHesapServisi
{
    Task<HesapListesi> ListeleAsync(HesapFiltre filtre, CancellationToken ct = default);
    Task<HesapDetay?> DetayAsync(int id, CancellationToken ct = default);

    /// <summary>Müşterinin açılacak sıradaki hesabının numarası; müşteri yoksa veya pasifse null.</summary>
    Task<string?> HesapNoOnizleAsync(int musteriId, CancellationToken ct = default);

    Task<Sonuc<HesapAcildi>> AcAsync(HesapAcmaKaydi kayit, CancellationToken ct = default);
    Task<Sonuc> PasifeAlAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<HesapAramaSonucu>> AraAsync(string q, int adet, CancellationToken ct = default);
}

public enum HesapSiralama { No, Musteri, Bakiye, Acilis, Son }

public sealed class HesapFiltre
{
    public string? Q { get; set; }
    public HesapTipi? Tip { get; set; }
    public DurumFiltresi Durum { get; set; } = DurumFiltresi.Aktif;
    public int? MusteriId { get; set; }
    public HesapSiralama Sirala { get; set; } = HesapSiralama.No;
    public SiralamaYonu Yon { get; set; } = SiralamaYonu.Artan;
    public int Sayfa { get; set; } = 1;
    public int Boyut { get; set; } = Sayfalama.VarsayilanBoyut;

    public bool FiltreVar => !string.IsNullOrWhiteSpace(Q) || Tip is not null || Durum != DurumFiltresi.Aktif || MusteriId is not null;
}

public sealed class HesapListeOgesi
{
    public int Id { get; init; }
    public string HesapNo { get; init; } = string.Empty;
    public int MusteriId { get; init; }
    public string MusteriAd { get; init; } = string.Empty;
    public MusteriTipi MusteriTipi { get; init; }
    public HesapTipi Tip { get; init; }
    public decimal Bakiye { get; init; }
    public DateTime AcilisTarihi { get; init; }
    public DateTime? SonHareket { get; init; }
    public bool Aktif { get; init; }
    public bool MusteriAktif { get; init; }
}

public sealed class HesapListesi
{
    public required SayfaSonucu<HesapListeOgesi> Sayfa { get; init; }

    /// <summary>Filtrelenen tüm hesapların (yalnız bu sayfanın değil) toplam bakiyesi.</summary>
    public decimal ToplamBakiye { get; init; }

    /// <summary>Müşteri filtresi varsa filtre çipinde gösterilen ad.</summary>
    public string? MusteriAd { get; init; }
}

public sealed class HesapDetay
{
    public required Hesap Hesap { get; init; }
    public required Musteri Musteri { get; init; }
    public required IReadOnlyList<IslemSatiri> SonHareketler { get; init; }
    public required IReadOnlyList<PortfoyPozisyonu> Portfoy { get; init; }
    public required IReadOnlyList<BakiyeNoktasi> BakiyeGecmisi { get; init; }
    public decimal Giris30 { get; init; }
    public decimal Cikis30 { get; init; }
    public int ToplamHareket { get; init; }

    /// <summary>null ise hesap pasife alınabilir; değilse neden.</summary>
    public string? PasifeAlmaEngeli { get; init; }
}

public sealed record BakiyeNoktasi(DateTime Zaman, decimal Bakiye);

/// <summary>VW_PORTFOY satırı: açık hisse pozisyonu. Fiyatlar temsilidir.</summary>
public sealed class PortfoyPozisyonu
{
    public int HesapId { get; init; }
    public string HisseKodu { get; init; } = string.Empty;
    public string HisseAd { get; init; } = string.Empty;
    public long NetAdet { get; init; }
    public decimal OrtMaliyet { get; init; }
    public decimal TemsiliFiyat { get; init; }
    public decimal PiyasaDegeri { get; init; }

    public decimal Maliyet => Math.Round(NetAdet * OrtMaliyet, 2);
    public decimal KarZarar => PiyasaDegeri - Maliyet;
    public decimal? KarZararYuzde => Maliyet == 0 ? null : Math.Round(KarZarar / Maliyet * 100, 1);
}

public sealed class HesapAcmaKaydi
{
    [Required(ErrorMessage = "Listeden bir müşteri seçin.")]
    public int? MusteriId { get; set; }

    public HesapTipi Tip { get; set; } = HesapTipi.Vadesiz;

    /// <summary>Metin olarak alınır (bkz. TutarMetni). Boş veya sıfır: açılış işlemi yok.</summary>
    [StringLength(30, ErrorMessage = "Tutar en fazla 30 karakter olabilir.")]
    public string? AcilisTutari { get; set; }
}

public sealed record HesapAcildi(int HesapId, string HesapNo, decimal? AcilisTutari);

public sealed record HesapAramaSonucu(int Id, string HesapNo, string MusteriAd, HesapTipi Tip, decimal Bakiye, bool Aktif, bool MusteriAktif);
