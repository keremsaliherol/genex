using System.Collections.Concurrent;
using System.Globalization;
using System.Text.RegularExpressions;
using Oracle.ManagedDataAccess.Client;
using Oracle.ManagedDataAccess.Types;

namespace MusteriHesapYonetimi.Data.Izleme;

public sealed record IzParametresi(string Ad, string Deger);

/// <summary>Oracle izinde bir komut: katman, başlık, SQL, bind değerleri, süre, satır, not ve hata.</summary>
public sealed class IzGirdisi
{
    public required string Katman { get; init; }
    public required string Baslik { get; init; }
    public required string Sql { get; init; }
    public IReadOnlyList<IzParametresi> Parametreler { get; init; } = [];
    public double SureMs { get; init; }
    public int? Satir { get; init; }
    public string? Not { get; init; }
    public string? Hata { get; init; }
    public DateTime Zaman { get; init; } = DateTime.Now;

    /// <summary>Komutu çalıştıran istek, ör. "POST /Islem/Yeni"; panel komutları isteğe göre gruplar.</summary>
    public string Istek { get; set; } = string.Empty;
    public int IstekNo { get; set; }

    /// <summary>Veritabanında çalışan kod (paket, trigger, view): panelde vurgulu etiket.</summary>
    public bool VeritabaniKodu => Katman is "PL/SQL paket" or "Trigger" or "View";
}

/// <summary>
/// Tarayıcı başına son 40 komut, bellekte (yalnız geliştirme). Prototipteki panel gibi sayfalar arası birikir;
/// POST → Redirect → GET akışında kaydetme isteğinin komutları da sonraki sayfada görünür.
/// </summary>
public sealed class OracleIzDeposu
{
    public const int EnFazlaGirdi = 40;
    private const int EnFazlaIstemci = 200;
    private readonly ConcurrentDictionary<string, Gecmis> gecmisler = new();
    private int istekSayaci;

    public int YeniIstekNo() => Interlocked.Increment(ref istekSayaci);

    public void Ekle(string istemci, IzGirdisi girdi)
    {
        var gecmis = gecmisler.GetOrAdd(istemci, _ => new Gecmis());
        lock (gecmis)
        {
            gecmis.Girdiler.Insert(0, girdi);
            if (gecmis.Girdiler.Count > EnFazlaGirdi) gecmis.Girdiler.RemoveRange(EnFazlaGirdi, gecmis.Girdiler.Count - EnFazlaGirdi);
            gecmis.Son = DateTime.UtcNow;
        }
        if (gecmisler.Count > EnFazlaIstemci)
        {
            foreach (var eski in gecmisler.OrderBy(k => k.Value.Son).Take(gecmisler.Count - EnFazlaIstemci))
                gecmisler.TryRemove(eski.Key, out _);
        }
    }

    public IReadOnlyList<IzGirdisi> Oku(string istemci)
    {
        if (!gecmisler.TryGetValue(istemci, out var gecmis)) return [];
        lock (gecmis) return gecmis.Girdiler.ToList();
    }

    public void Temizle(string istemci) => gecmisler.TryRemove(istemci, out _);

    private sealed class Gecmis
    {
        public List<IzGirdisi> Girdiler { get; } = [];
        public DateTime Son { get; set; }
    }
}

/// <summary>
/// İsteğin iz bağlamı. AsyncLocal ile await'ler boyunca taşınır; EF Core interceptor'ı (tekil) ve Dapper yardımcısı
/// komutları buradan geçerli tarayıcının geçmişine yazar. Bağlam yoksa (iz kapalı, /api, arka plan işi) hiçbir şey yazılmaz.
/// </summary>
public sealed class OracleIzBaglami
{
    private static readonly AsyncLocal<OracleIzBaglami?> gecerli = new();
    private readonly OracleIzDeposu depo;
    private readonly string istemci;
    private readonly string istek;
    private readonly int istekNo;

    public OracleIzBaglami(OracleIzDeposu depo, string istemci, string istek)
    {
        this.depo = depo;
        this.istemci = istemci;
        this.istek = istek;
        istekNo = depo.YeniIstekNo();
    }

    public static OracleIzBaglami? Gecerli => gecerli.Value;

    /// <summary>Bağlamı istek boyunca etkinleştirir; Dispose önceki değeri geri koyar.</summary>
    public static IDisposable Baslat(OracleIzBaglami baglam)
    {
        var onceki = gecerli.Value;
        gecerli.Value = baglam;
        return new Geri(() => gecerli.Value = onceki);
    }

    public void Ekle(IzGirdisi girdi)
    {
        girdi.Istek = istek;
        girdi.IstekNo = istekNo;
        depo.Ekle(istemci, girdi);
    }

    private sealed class Geri(Action geri) : IDisposable
    {
        public void Dispose() => geri();
    }
}

/// <summary>Bind değerlerinin izdeki yazımı: metin tırnakta, sayı kültürden bağımsız, NULL açıkça.</summary>
internal static class IzDegeri
{
    public static string Yaz(object? deger) => deger switch
    {
        null or DBNull => "NULL",
        OracleDecimal { IsNull: true } or OracleString { IsNull: true } => "NULL",
        OracleDecimal d => d.ToString(),
        OracleString s => Metin(s.Value),
        string s => Metin(s),
        DateTime t => $"'{t:dd.MM.yyyy HH:mm:ss}'",
        bool b => b ? "1" : "0",
        IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
        _ => deger.ToString() ?? string.Empty
    };

    public static string Hata(Exception hata) => hata is OracleException o
        ? $"ORA-{o.Number:00000}: {OracleHatalari.UygulamaMesaji(o)}"
        : $"{hata.GetType().Name}: {hata.Message.Split('\n', 2)[0]}";

    private static string Metin(string s) => s.Length > 120 ? $"'{s[..117]}...'" : $"'{s}'";
}

/// <summary>Komut başlığı: EF Core TagWith etiketi, yoksa paket adı, yoksa fiil ve tablolar ("SELECT HESAP, MUSTERI").</summary>
internal static partial class IzBasligi
{
    public static string Cikar(string sql)
    {
        var bas = sql.TrimStart();
        if (bas.StartsWith("-- ", StringComparison.Ordinal)) return bas[3..].Split('\n', 2)[0].Trim();
        if (Paket().Match(sql) is { Success: true } paket) return paket.Value;
        var fiil = Fiil().Match(sql) is { Success: true } f ? f.Value.ToUpperInvariant() : "SQL";
        var tablolar = Tablo().Matches(sql).Select(m => m.Groups[2].Value.ToUpperInvariant()).Where(t => t != "DUAL").Distinct().Take(3);
        return $"{fiil} {string.Join(", ", tablolar)}".Trim();
    }

    [GeneratedRegex(@"\bPKG_[A-Z_]+\.[A-Z_]+\b")]
    private static partial Regex Paket();

    [GeneratedRegex(@"\b(SELECT|INSERT|UPDATE|DELETE|MERGE)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Fiil();

    [GeneratedRegex(@"\b(FROM|INTO|UPDATE|JOIN)\s+""?([A-Za-z_][A-Za-z0-9_$#]*)""?", RegexOptions.IgnoreCase)]
    private static partial Regex Tablo();
}
