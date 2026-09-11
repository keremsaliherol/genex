using MusteriHesapYonetimi.Application.Ortak;

namespace MusteriHesapYonetimi.Application.Ozet;

/// <summary>Genel bakış göstergeleri ve son işlemler. Grafikler ve en aktif listesi Faz 4'te (PKG_RAPOR).</summary>
public interface IGenelBakisSorgusu
{
    Task<GenelBakisOzeti> OkuAsync(CancellationToken ct = default);
}

public sealed class GenelBakisOzeti
{
    public DateTime Bugun { get; init; }
    public int AktifMusteri { get; init; }
    public int KurumsalMusteri { get; init; }
    public int AcikHesap { get; init; }
    public int YatirimHesabi { get; init; }
    public decimal ToplamBakiye { get; init; }

    /// <summary>Transfer çifti tek işlem sayılır (gelen ayak hariç).</summary>
    public int BugunIslem { get; init; }
    public decimal BugunHacim { get; init; }

    public required IReadOnlyList<IslemSatiri> SonIslemler { get; init; }
}
