using System.Data;
using Dapper;
using Oracle.ManagedDataAccess.Client;
using Oracle.ManagedDataAccess.Types;

namespace MusteriHesapYonetimi.Data;

/// <summary>Dapper sorguları için açık bağlantı üretir (bağlantı havuzu ODP.NET'te).</summary>
public sealed class OracleBaglantiFabrikasi(string baglantiCumlesi)
{
    public async Task<OracleConnection> AcAsync(CancellationToken ct = default)
    {
        var baglanti = new OracleConnection(baglantiCumlesi);
        await baglanti.OpenAsync(ct);
        return baglanti;
    }
}

/// <summary>
/// Dapper için Oracle parametreleri: REF CURSOR ve OUT parametreleri destekler.
/// ODP.NET varsayılan olarak parametreleri adına göre değil SIRASINA göre bağlar;
/// burada BindByName açılır, yoksa isimli parametrelerle yazılmış çağrılar yanlış değer alabilir.
/// </summary>
public sealed class OracleParametreleri : SqlMapper.IDynamicParameters
{
    private readonly Dictionary<string, OracleParameter> _parametreler = new(StringComparer.OrdinalIgnoreCase);

    public OracleParametreleri Girdi(string ad, object? deger, OracleDbType? tip = null)
    {
        var parametre = new OracleParameter(ad, deger ?? DBNull.Value) { Direction = ParameterDirection.Input };
        if (tip is not null) parametre.OracleDbType = tip.Value;
        _parametreler[ad] = parametre;
        return this;
    }

    public OracleParametreleri Cikti(string ad, OracleDbType tip, int boyut = 0)
    {
        _parametreler[ad] = new OracleParameter(ad, tip, boyut, null, ParameterDirection.Output);
        return this;
    }

    /// <summary>SYS_REFCURSOR çıktısı; ExecuteReader'da sonuç kümesi olarak okunur.</summary>
    public OracleParametreleri RefCursor(string ad) => Cikti(ad, OracleDbType.RefCursor);

    public T? Oku<T>(string ad)
    {
        var hedefTip = Nullable.GetUnderlyingType(typeof(T)) ?? typeof(T);
        return _parametreler[ad].Value switch
        {
            null or DBNull => default,
            OracleDecimal d when d.IsNull => default,
            OracleDecimal d => (T)Convert.ChangeType(d.Value, hedefTip),
            OracleString s when s.IsNull => default,
            OracleString s => (T)(object)s.Value,
            var deger => (T)Convert.ChangeType(deger, hedefTip)
        };
    }

    void SqlMapper.IDynamicParameters.AddParameters(IDbCommand command, SqlMapper.Identity identity)
    {
        if (command is OracleCommand oracleKomutu) oracleKomutu.BindByName = true;
        foreach (var parametre in _parametreler.Values) command.Parameters.Add(parametre);
    }
}
