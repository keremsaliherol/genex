using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Application.Raporlar;

namespace MusteriHesapYonetimi.Application.Ozet;

/// <summary>Genel bakış: göstergeler, son 30 günün nakit akışı, en aktif müşteriler ve son işlemler.</summary>
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

    /// <summary>Son 30 gün, her gün bir satır (hareketsiz gün sıfır).</summary>
    public required IReadOnlyList<GunlukAkis> NakitAkisi { get; init; }

    /// <summary>Son 30 günde işlem adedine göre ilk 5 müşteri (PKG_RAPOR.EN_AKTIF).</summary>
    public required IReadOnlyList<EnAktifSatir> EnAktifMusteriler { get; init; }

    public required IReadOnlyList<IslemSatiri> SonIslemler { get; init; }
}

/// <summary>Günün para yatırma ve çekme toplamı. Transfer ve hisse işlemleri dahil değil.</summary>
public sealed record GunlukAkis(DateTime Gun, decimal Giris, decimal Cikis)
{
    public decimal Net => Giris - Cikis;
}

public static class NakitAkisi
{
    public const int GunSayisi = 30;

    /// <summary>Veritabanı yalnız hareketli günleri döndürür; eksik günler sıfırla doldurulur, sıra eskiden yeniye.</summary>
    public static IReadOnlyList<GunlukAkis> Doldur(DateTime bugun, IEnumerable<GunlukAkis> gunler)
    {
        var bas = bugun.Date.AddDays(-(GunSayisi - 1));
        var sozluk = gunler.ToDictionary(g => g.Gun.Date);
        return Enumerable.Range(0, GunSayisi)
            .Select(i => bas.AddDays(i))
            .Select(gun => sozluk.TryGetValue(gun, out var g) ? g with { Gun = gun } : new GunlukAkis(gun, 0, 0))
            .ToList();
    }
}
