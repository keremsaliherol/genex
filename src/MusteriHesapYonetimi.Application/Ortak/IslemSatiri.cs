using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Application.Ortak;

/// <summary>Hareket tablolarındaki bir satır (hesap detayı, müşteri detayı, genel bakış).</summary>
public sealed class IslemSatiri
{
    public int Id { get; init; }
    public DateTime Tarih { get; init; }
    public int HesapId { get; init; }
    public string HesapNo { get; init; } = string.Empty;
    public string? MusteriAd { get; init; }
    public IslemTipi Tip { get; init; }
    public decimal Tutar { get; init; }
    public string? Aciklama { get; init; }
    public int? KarsiHesapId { get; init; }
    public string? KarsiHesapNo { get; init; }

    /// <summary>İşlemden sonraki bakiye; yalnız tek hesabın hareketlerinde hesaplanır.</summary>
    public decimal? BakiyeSonra { get; set; }

    public decimal IsaretliTutar => Tip.BakiyeEtkisi() * Tutar;
}
