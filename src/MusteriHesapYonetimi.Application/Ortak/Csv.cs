namespace MusteriHesapYonetimi.Application.Ortak;

/// <summary>
/// Türkçe Excel'in doğrudan açtığı CSV: noktalı virgül ayırıcı, UTF-8 BOM (dosyayı yazan ekler), tr-TR ondalık virgül.
/// </summary>
public static class Csv
{
    public const char Ayrac = ';';

    public static string Satir(IEnumerable<string?> alanlar) => string.Join(Ayrac, alanlar.Select(Alan));

    /// <summary>Ayırıcı, tırnak veya satır sonu içeren alan tırnağa alınır; içteki tırnak ikilenir.</summary>
    public static string Alan(string? deger)
    {
        var s = deger ?? string.Empty;
        return s.IndexOfAny([Ayrac, '"', '\n', '\r']) >= 0 ? $"\"{s.Replace("\"", "\"\"")}\"" : s;
    }

    /// <summary>
    /// Serbest metin (ör. açıklama) için formül enjeksiyonu önlemi: =, +, -, @ ile başlayan metnin önüne tek tırnak
    /// konur; Excel hücreyi formül olarak çalıştırmaz. Sayısal sütunlarda kullanılmaz.
    /// </summary>
    public static string? Metin(string? deger)
        => deger is { Length: > 0 } && "=+-@\t\r".Contains(deger[0]) ? "'" + deger : deger;
}
