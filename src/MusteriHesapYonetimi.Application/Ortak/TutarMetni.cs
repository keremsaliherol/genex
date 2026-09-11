using System.Globalization;
using System.Text.RegularExpressions;

namespace MusteriHesapYonetimi.Application.Ortak;

/// <summary>
/// Formdaki tutar metnini ayrıştırır: "8.140,25", "8140,25", "8140.25", "₺ 1.250" kabul edilir.
/// Tutar alanları decimal değil metin olarak bağlanır: tr-TR kültüründe model bağlayıcı noktayı binlik ayırıcı
/// sayar ve "8140.25" değerini 814025 okur. Kural prototipteki tutarParse ile aynıdır.
/// </summary>
public static partial class TutarMetni
{
    public static bool TryAyristir(string? metin, out decimal tutar)
    {
        tutar = 0;
        var t = (metin ?? string.Empty).Replace("₺", "").Replace(" ", "").Replace("\u00A0", "").Trim();
        if (t.Length == 0) return false;

        if (t.Contains(',')) t = t.Replace(".", "").Replace(',', '.');
        else if (t.Count(c => c == '.') > 1 || UcHaneliSon().IsMatch(t)) t = t.Replace(".", "");

        // NUMBER(18,2): en fazla 16 tam hane, 2 ondalık
        if (!Bicim().IsMatch(t)) return false;
        return decimal.TryParse(t, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out tutar);
    }

    [GeneratedRegex(@"\.\d{3}$")]
    private static partial Regex UcHaneliSon();

    [GeneratedRegex(@"^\d{1,16}(\.\d{1,2})?$")]
    private static partial Regex Bicim();
}
