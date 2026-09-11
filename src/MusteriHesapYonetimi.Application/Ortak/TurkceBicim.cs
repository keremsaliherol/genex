using System.Globalization;

namespace MusteriHesapYonetimi.Application.Ortak;

/// <summary>
/// Arayüzdeki tr-TR biçimleri: ₺1.234,56, 10.09.2026, 10.09.2026 14:32.
/// Eksi işareti tire değil U+2212'dir (tabular rakamlarla aynı genişlikte durur). Prototipteki util.js ile aynı çıktı.
/// </summary>
public static class TurkceBicim
{
    public static readonly CultureInfo Kultur = CultureInfo.GetCultureInfo("tr-TR");
    public const string Eksi = "−";

    public static string Para(decimal tutar, bool isaretli = false)
    {
        var isaret = tutar < 0 ? Eksi : isaretli && tutar > 0 ? "+" : "";
        return $"{isaret}₺{Math.Abs(tutar).ToString("N2", Kultur)}";
    }

    /// <summary>Özet göstergeler için kısa tutar: ₺157,6 mn, ₺48,2 bin.</summary>
    public static string ParaKisa(decimal tutar)
    {
        var tl = Math.Abs(tutar);
        var isaret = tutar < 0 ? Eksi : "";
        if (tl >= 1_000_000_000m) return $"{isaret}₺{(tl / 1_000_000_000m).ToString("N1", Kultur)} mr";
        if (tl >= 1_000_000m) return $"{isaret}₺{(tl / 1_000_000m).ToString("N1", Kultur)} mn";
        if (tl >= 10_000m) return $"{isaret}₺{(tl / 1_000m).ToString("N1", Kultur)} bin";
        return $"{isaret}₺{Math.Round(tl).ToString("N0", Kultur)}";
    }

    /// <summary>Form alanına geri yazılan tutar: 1.250,00 (₺ işareti alanın önekinde).</summary>
    public static string TutarGirdi(decimal tutar) => tutar.ToString("N2", Kultur);

    public static string Sayi(long sayi) => sayi.ToString("N0", Kultur);
    public static string Tarih(DateTime t) => t.ToString("dd.MM.yyyy", Kultur);
    public static string TarihSaat(DateTime t) => t.ToString("dd.MM.yyyy HH:mm", Kultur);
    public static string Saat(DateTime t) => t.ToString("HH:mm", Kultur);
    public static string UzunGun(DateTime t) => t.ToString("d MMMM yyyy dddd", Kultur);
}
