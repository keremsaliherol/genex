using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Web.Altyapi;

/// <summary>Enum değerlerinin arayüz adı ve ikonu (prototype/src/util.js ile aynı).</summary>
public static class Etiketler
{
    public static (string Ad, string Ikon) IslemEtiketi(IslemTipi tip) => tip switch
    {
        IslemTipi.Yatirma => ("Para yatırma", "arrow-down-left"),
        IslemTipi.Cekme => ("Para çekme", "arrow-up-right"),
        IslemTipi.TransferGelen => ("Gelen transfer", "arrows-left-right"),
        IslemTipi.TransferGiden => ("Giden transfer", "arrows-left-right"),
        IslemTipi.Alim => ("Hisse alım", "trend-up"),
        IslemTipi.Satim => ("Hisse satım", "trend-down"),
        _ => (tip.ToString(), "circle")
    };

    public static (string Ad, string Ikon) MusteriTipiEtiketi(MusteriTipi tip)
        => tip == MusteriTipi.Kurumsal ? ("Kurumsal", "buildings") : ("Bireysel", "user");

    public static (string Ad, string Ikon) HesapTipiEtiketi(HesapTipi tip)
        => tip == HesapTipi.Yatirim ? ("Yatırım", "chart-line-up") : ("Vadesiz", "wallet");

    private static readonly HashSet<string> SirketEkleri = ["A.Ş.", "Ltd.", "Şti.", "San.", "Tic.", "ve"];

    /// <summary>Kimlik rozetindeki baş harfler: "Anadolu Kablo Sistemleri A.Ş." → "AK".</summary>
    public static string Harfler(string ad)
    {
        var parcalar = ad.Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(p => !SirketEkleri.Contains(p));
        return string.Concat(parcalar.Take(2).Select(p => p[0])).ToUpper(TurkceBicim.Kultur);
    }
}
