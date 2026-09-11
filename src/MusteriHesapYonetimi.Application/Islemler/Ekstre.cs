using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Application.Islemler;

/// <summary>Hesap ekstresi (S9): dönem başı bakiye, dönemin hareketleri ve yürüyen bakiye.</summary>
public interface IEkstreSorgusu
{
    /// <summary>Hesap yoksa null. Tip filtresi yalnız gösterilen satırları daraltır; özet ve yürüyen bakiye tüm hareketleri içerir.</summary>
    Task<Ekstre?> OkuAsync(int hesapId, EkstreFiltre filtre, CancellationToken ct = default);
}

public enum EkstreDonemi { BuAy, GecenAy, SonUcAy, Ozel }

/// <summary>GET sorgu dizesi: ?on=gecenay veya ?bas=2026-07-01&amp;bit=2026-09-10&amp;tip=Yatirma&amp;tip=Cekme</summary>
public sealed class EkstreFiltre
{
    public EkstreDonemi? On { get; set; }
    public DateTime? Bas { get; set; }
    public DateTime? Bit { get; set; }
    public List<IslemTipi> Tip { get; set; } = [];
}

public sealed class Ekstre
{
    public int HesapId { get; init; }
    public string HesapNo { get; init; } = string.Empty;
    public HesapTipi HesapTipi { get; init; }
    public int MusteriId { get; init; }
    public string MusteriAd { get; init; } = string.Empty;
    public EkstreDonemi Donem { get; init; }
    public DateTime Bas { get; init; }
    public DateTime Bit { get; init; }
    public IReadOnlyList<IslemTipi> Tipler { get; init; } = [];
    public required EkstreOzeti Ozet { get; init; }

    /// <summary>Gösterilen satırlar (tip filtresi uygulanmış), eskiden yeniye; BakiyeSonra yürüyen bakiyedir.</summary>
    public required IReadOnlyList<IslemSatiri> Satirlar { get; init; }
}

/// <summary>Dönem başı + giriş − çıkış = dönem sonu. Transfer ve hisse işlemleri de bakiye etkisine göre sayılır.</summary>
public sealed record EkstreOzeti(decimal Acilis, decimal Giris, int GirisAdedi, decimal Cikis, int CikisAdedi)
{
    public decimal Kapanis => Acilis + Giris - Cikis;

    public static EkstreOzeti Hesapla(decimal acilis, IEnumerable<IslemSatiri> donemHareketleri)
    {
        decimal giris = 0, cikis = 0;
        int girisAdedi = 0, cikisAdedi = 0;
        foreach (var islem in donemHareketleri)
        {
            if (islem.IsaretliTutar > 0) { giris += islem.Tutar; girisAdedi++; }
            else { cikis += islem.Tutar; cikisAdedi++; }
        }
        return new EkstreOzeti(acilis, giris, girisAdedi, cikis, cikisAdedi);
    }
}

public static class EkstreDonemleri
{
    /// <summary>
    /// Dönem ön ayarını gün aralığına çevirir (bitiş günü dahil). Özel dönemde eksik tarih bu ayın başı ve bugünle
    /// tamamlanır, ters verilen tarihler yer değiştirir. Tarih verilip ön ayar verilmediyse dönem özeldir.
    /// </summary>
    public static (EkstreDonemi Donem, DateTime Bas, DateTime Bit) Coz(EkstreFiltre filtre, DateTime bugun)
    {
        bugun = bugun.Date;
        var ayBasi = new DateTime(bugun.Year, bugun.Month, 1);
        var donem = filtre.On ?? (filtre.Bas is not null || filtre.Bit is not null ? EkstreDonemi.Ozel : EkstreDonemi.BuAy);
        var (bas, bit) = donem switch
        {
            EkstreDonemi.GecenAy => (ayBasi.AddMonths(-1), ayBasi.AddDays(-1)),
            EkstreDonemi.SonUcAy => (ayBasi.AddMonths(-2), bugun),
            EkstreDonemi.Ozel => ((filtre.Bas ?? ayBasi).Date, (filtre.Bit ?? bugun).Date),
            _ => (ayBasi, bugun)
        };
        if (bas > bit) (bas, bit) = (bit, bas);
        return (donem, bas, bit);
    }
}
