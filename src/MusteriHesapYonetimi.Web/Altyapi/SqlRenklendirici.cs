using System.Text;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using System.Text.Unicode;

namespace MusteriHesapYonetimi.Web.Altyapi;

/// <summary>
/// Oracle izindeki SQL'i sunucuda renklendirir (prototype/src/oracle-izi.js ile aynı kural): anahtar kelime,
/// metin sabiti, bind değişkeni ve yorum. Tırnaklı tanımlayıcı ("MUSTERI_ID") olduğu gibi kalır.
/// </summary>
public static partial class SqlRenklendirici
{
    private static readonly HtmlEncoder Kodlayici = HtmlEncoder.Create(UnicodeRanges.All);

    private static readonly HashSet<string> Anahtarlar =
    [
        "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "IS", "NULL", "AS", "ON", "JOIN", "INNER", "LEFT", "OUTER",
        "GROUP", "BY", "ORDER", "ASC", "DESC", "OFFSET", "ROWS", "ROW", "FETCH", "FIRST", "NEXT", "ONLY",
        "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "BEGIN", "END", "DECLARE", "FOR", "RETURNING",
        "CASE", "WHEN", "THEN", "ELSE", "COUNT", "SUM", "MAX", "MIN", "NVL", "COALESCE", "OVER", "PARTITION",
        "UNBOUNDED", "PRECEDING", "TRUNC", "ADD_MONTHS", "SYSDATE", "SYSTIMESTAMP", "DUAL", "COMMIT", "ROLLBACK",
        "EXISTS", "DISTINCT", "LIKE", "UPPER", "NLSSORT", "NLS_UPPER", "INSTR", "REPLACE", "CAST", "OPEN", "CURSOR",
        "TYPE", "TABLE", "OF", "BULK", "COLLECT", "LOOP", "EXIT", "IF", "WITH"
    ];

    public static string Html(string sql)
    {
        var sonuc = new StringBuilder(sql.Length * 2);
        foreach (Match m in Belirtec().Matches(sql))
        {
            var metin = Kodlayici.Encode(m.Value);
            if (m.Groups["yorum"].Success) sonuc.Append("<span class=\"cmt\">").Append(metin).Append("</span>");
            else if (m.Groups["metin"].Success) sonuc.Append("<span class=\"str\">").Append(metin).Append("</span>");
            else if (m.Groups["bind"].Success) sonuc.Append("<span class=\"bind\">").Append(metin).Append("</span>");
            else if (m.Groups["kelime"].Success && m.Value == m.Value.ToUpperInvariant() && Anahtarlar.Contains(m.Value))
                sonuc.Append("<span class=\"kw\">").Append(metin).Append("</span>");
            else sonuc.Append(metin);
        }
        return sonuc.ToString();
    }

    [GeneratedRegex("""(?<yorum>--[^\n]*)|(?<metin>'(?:[^']|'')*')|(?<bind>:[A-Za-z_][\w]*)|(?<tanim>"[^"]*")|(?<kelime>[A-Za-z_][\w$#.]*)|(?<diger>[\s\S])""")]
    private static partial Regex Belirtec();
}
