using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace MusteriHesapYonetimi.Data.Izleme;

/// <summary>
/// EF Core'un ürettiği her komutu (SQL, bind değerleri, süre, hata) Oracle izine yazar.
/// Tek örnek; hangi isteğe yazacağını OracleIzBaglami'ndan (AsyncLocal) okur.
/// </summary>
public sealed class EfIzInterceptor : DbCommandInterceptor
{
    public override DbDataReader ReaderExecuted(DbCommand command, CommandExecutedEventData eventData, DbDataReader result)
    {
        Yaz(command, eventData.Duration, null, null);
        return result;
    }

    public override ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command, CommandExecutedEventData eventData, DbDataReader result, CancellationToken cancellationToken = default)
    {
        Yaz(command, eventData.Duration, null, null);
        return ValueTask.FromResult(result);
    }

    public override int NonQueryExecuted(DbCommand command, CommandExecutedEventData eventData, int result)
    {
        Yaz(command, eventData.Duration, result, null);
        return result;
    }

    public override ValueTask<int> NonQueryExecutedAsync(DbCommand command, CommandExecutedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        Yaz(command, eventData.Duration, result, null);
        return ValueTask.FromResult(result);
    }

    public override object? ScalarExecuted(DbCommand command, CommandExecutedEventData eventData, object? result)
    {
        Yaz(command, eventData.Duration, 1, null);
        return result;
    }

    public override ValueTask<object?> ScalarExecutedAsync(DbCommand command, CommandExecutedEventData eventData, object? result, CancellationToken cancellationToken = default)
    {
        Yaz(command, eventData.Duration, 1, null);
        return ValueTask.FromResult(result);
    }

    public override void CommandFailed(DbCommand command, CommandErrorEventData eventData)
        => Yaz(command, eventData.Duration, null, eventData.Exception);

    public override Task CommandFailedAsync(DbCommand command, CommandErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        Yaz(command, eventData.Duration, null, eventData.Exception);
        return Task.CompletedTask;
    }

    private static void Yaz(DbCommand komut, TimeSpan sure, int? satir, Exception? hata)
    {
        if (OracleIzBaglami.Gecerli is not { } baglam) return;
        var sql = komut.CommandText.Trim();
        baglam.Ekle(new IzGirdisi
        {
            Katman = sql.Contains("VW_", StringComparison.Ordinal) ? "View" : "EF Core",
            Baslik = IzBasligi.Cikar(sql),
            Sql = sql,
            Parametreler = komut.Parameters.Cast<DbParameter>()
                .Select(p => new IzParametresi(p.ParameterName.TrimStart(':'), IzDegeri.Yaz(p.Value))).ToList(),
            SureMs = sure.TotalMilliseconds,
            Satir = satir is >= 0 ? satir : null,
            Hata = hata is null ? null : IzDegeri.Hata(hata)
        });
    }
}
