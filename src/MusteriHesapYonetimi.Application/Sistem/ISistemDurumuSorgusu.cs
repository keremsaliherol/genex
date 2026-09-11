namespace MusteriHesapYonetimi.Application.Sistem;

/// <summary>Veritabanı bağlantısının ve şemanın sağlığını okur (/saglik).</summary>
public interface ISistemDurumuSorgusu
{
    Task<VeritabaniDurumu> OkuAsync(CancellationToken ct = default);
}

public sealed class VeritabaniDurumu
{
    public string Surum { get; set; } = string.Empty;
    public DateTime SunucuSaati { get; set; }
    public string SaatDilimi { get; set; } = string.Empty;
    public int Hesap { get; set; }
    public int Islem { get; set; }
    public int GecersizNesne { get; set; }

    /// <summary>EF Core ile okunur; Dapper sorgusuyla birlikte iki erişim yolunun da çalıştığını gösterir.</summary>
    public int AktifMusteri { get; set; }
    public decimal ToplamBakiye { get; set; }
}
