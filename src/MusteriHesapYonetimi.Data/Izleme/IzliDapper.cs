using System.Data;
using System.Diagnostics;
using Dapper;

namespace MusteriHesapYonetimi.Data.Izleme;

/// <summary>
/// Dapper çağrılarını Oracle izine yazan ince sarmalayıcı (EF Core komutları interceptor'dan geçer).
/// İz kapalıyken doğrudan Dapper'ı çağırır; ek maliyet yok.
/// </summary>
public static class IzliDapper
{
    public static Task<int> ExecuteIzliAsync(this IDbConnection baglanti, string baslik, CommandDefinition komut)
        => Izle(baslik, komut, () => baglanti.ExecuteAsync(komut), sonuc => sonuc >= 0 ? sonuc : null);

    public static Task<T?> ExecuteScalarIzliAsync<T>(this IDbConnection baglanti, string baslik, CommandDefinition komut)
        => Izle(baslik, komut, () => baglanti.ExecuteScalarAsync<T>(komut), _ => 1);

    /// <param name="not">Panelde komutun altında gösterilen açıklama (ör. paket gövdesinin ne yaptığı).</param>
    public static Task<List<T>> QueryIzliAsync<T>(this IDbConnection baglanti, string baslik, CommandDefinition komut, string? not = null)
        => Izle(baslik, komut, async () => (await baglanti.QueryAsync<T>(komut)).AsList(), sonuc => sonuc.Count, not);

    public static Task<T> QuerySingleIzliAsync<T>(this IDbConnection baglanti, string baslik, CommandDefinition komut)
        => Izle(baslik, komut, () => baglanti.QuerySingleAsync<T>(komut), _ => 1);

    private static async Task<T> Izle<T>(string baslik, CommandDefinition komut, Func<Task<T>> calistir, Func<T, int?> satir, string? not = null)
    {
        if (OracleIzBaglami.Gecerli is not { } baglam) return await calistir();
        var sure = Stopwatch.StartNew();
        try
        {
            var sonuc = await calistir();
            baglam.Ekle(Girdi(baslik, komut, sure.Elapsed, satir(sonuc), null, not));
            return sonuc;
        }
        catch (Exception hata)
        {
            baglam.Ekle(Girdi(baslik, komut, sure.Elapsed, null, hata, not));
            throw;
        }
    }

    private static IzGirdisi Girdi(string baslik, CommandDefinition komut, TimeSpan sure, int? satir, Exception? hata, string? not)
    {
        var sql = komut.CommandText.Trim();
        var paket = sql.StartsWith("BEGIN", StringComparison.OrdinalIgnoreCase);
        return new IzGirdisi
        {
            Katman = paket ? "PL/SQL paket" : "Dapper",
            Baslik = baslik,
            Sql = paket ? PlSqlSatirlari(sql) : sql,
            // OUT parametreler çağrıdan sonra okunur: izde paketin döndürdüğü değer görünür
            Parametreler = komut.Parameters is OracleParametreleri p ? p.IzListesi() : [],
            SureMs = sure.TotalMilliseconds,
            Satir = satir,
            Not = not,
            Hata = hata is null ? null : IzDegeri.Hata(hata)
        };
    }

    /// <summary>"BEGIN PKG.X(p_a => :a, p_b => :b); END;" tek satırını okunur hale getirir.</summary>
    private static string PlSqlSatirlari(string sql)
        => sql.Replace("BEGIN ", "BEGIN\n  ").Replace(", p_", ",\n    p_").Replace("); END;", ");\nEND;");
}
