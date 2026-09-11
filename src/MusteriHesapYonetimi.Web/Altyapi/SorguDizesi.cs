using System.Globalization;
using Microsoft.AspNetCore.Http.Extensions;

namespace MusteriHesapYonetimi.Web.Altyapi;

/// <summary>
/// Filtre, sıralama ve sayfalama bağlantıları: mevcut sorgu dizesini korur, yalnız verilen anahtarları değiştirir.
/// Değeri null ya da boş olan anahtar adresten çıkar (varsayılan değerler adreste görünmez).
/// </summary>
public static class SorguDizesi
{
    public static string Degistir(HttpRequest istek, params (string Anahtar, object? Deger)[] degisiklikler)
    {
        var sorgu = istek.Query.ToDictionary(k => k.Key, k => k.Value.ToString(), StringComparer.OrdinalIgnoreCase);
        foreach (var (anahtar, deger) in degisiklikler)
        {
            var metin = Metin(deger);
            if (string.IsNullOrEmpty(metin)) sorgu.Remove(anahtar);
            else sorgu[anahtar] = metin;
        }
        var dizi = new QueryBuilder(sorgu.Where(k => !string.IsNullOrEmpty(k.Value)));
        return $"{istek.PathBase}{istek.Path}{dizi}";
    }

    /// <summary>Formdan geri dönülecek yerel adres (yol + sorgu).</summary>
    public static string Donus(HttpRequest istek) => $"{istek.PathBase}{istek.Path}{istek.QueryString}";

    private static string? Metin(object? deger) => deger switch
    {
        null => null,
        Enum e => e.ToString().ToLowerInvariant(),
        _ => Convert.ToString(deger, CultureInfo.InvariantCulture)
    };
}
