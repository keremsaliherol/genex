using Dapper;
using Microsoft.EntityFrameworkCore;
using MusteriHesapYonetimi.Application.Sistem;
using MusteriHesapYonetimi.Data.Izleme;

namespace MusteriHesapYonetimi.Data.Sistem;

public sealed class SistemDurumuSorgusu(OracleBaglantiFabrikasi fabrika, HesapMasasiDbContext db) : ISistemDurumuSorgusu
{
    private const string Sql = """
        SELECT (SELECT BANNER_FULL FROM V$VERSION WHERE ROWNUM = 1)         AS Surum,
               SYSDATE                                                     AS SunucuSaati,
               TO_CHAR(SYSTIMESTAMP, 'TZR')                                AS SaatDilimi,
               (SELECT COUNT(*) FROM HESAP)                                AS Hesap,
               (SELECT COUNT(*) FROM ISLEM)                                AS Islem,
               (SELECT COUNT(*) FROM USER_OBJECTS WHERE STATUS <> 'VALID') AS GecersizNesne
          FROM DUAL
        """;

    public async Task<VeritabaniDurumu> OkuAsync(CancellationToken ct = default)
    {
        await using var baglanti = await fabrika.AcAsync(ct);
        var durum = await baglanti.QuerySingleIzliAsync<VeritabaniDurumu>("Sağlık kontrolü", new CommandDefinition(Sql, cancellationToken: ct));

        // Aynı veriyi EF Core ile de oku: iki erişim yolu (Dapper + EF Core) aynı şemayı görüyor.
        durum.AktifMusteri = await db.Musteriler.CountAsync(m => m.Aktif, ct);
        durum.ToplamBakiye = await db.Hesaplar.Where(h => h.Aktif).SumAsync(h => h.Bakiye, ct);
        return durum;
    }
}
