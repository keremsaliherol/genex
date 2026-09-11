using Dapper;
using Microsoft.EntityFrameworkCore;
using MusteriHesapYonetimi.Application.Islemler;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Data.Izleme;
using MusteriHesapYonetimi.Domain;
using Oracle.ManagedDataAccess.Client;

namespace MusteriHesapYonetimi.Data.Islemler;

/// <summary>
/// Ekstre Dapper ile: dönem başı bakiye ve yürüyen bakiye veritabanında hesaplanır (SUM() OVER).
/// Tarih koşulu aralık olarak yazılır (>= :bas AND &lt; :bit_ertesi); kolon fonksiyona sokulmadığı için
/// IDX_ISLEM_HESAP_TARIH kullanılır.
/// </summary>
public sealed class EkstreSorgusu(OracleBaglantiFabrikasi fabrika, HesapMasasiDbContext db) : IEkstreSorgusu
{
    // TRG_ISLEM_BAKIYE_GUNCELLE ile aynı işaret kuralı
    private const string IsaretliTutar = "CASE WHEN i.ISLEM_TIPI IN ('YATIRMA', 'TRANSFER_GELEN', 'SATIM') THEN i.TUTAR ELSE -i.TUTAR END";

    private const string AcilisSql = $"""
        SELECT NVL(SUM({IsaretliTutar}), 0)
          FROM ISLEM i
         WHERE i.HESAP_ID = :hesap_id
           AND i.ISLEM_TARIHI < :bas
        """;

    private const string HareketSql = $"""
        SELECT i.ISLEM_ID       AS Id,
               i.ISLEM_TARIHI   AS Tarih,
               i.ISLEM_TIPI     AS TipKodu,
               i.TUTAR          AS Tutar,
               i.ACIKLAMA       AS Aciklama,
               i.KARSI_HESAP_ID AS KarsiHesapId,
               k.HESAP_NO       AS KarsiHesapNo,
               :acilis + SUM({IsaretliTutar})
                         OVER (ORDER BY i.ISLEM_TARIHI, i.ISLEM_ID ROWS UNBOUNDED PRECEDING) AS BakiyeSonra
          FROM ISLEM i
          LEFT JOIN HESAP k ON k.HESAP_ID = i.KARSI_HESAP_ID
         WHERE i.HESAP_ID = :hesap_id
           AND i.ISLEM_TARIHI >= :bas
           AND i.ISLEM_TARIHI <  :bit_ertesi
         ORDER BY i.ISLEM_TARIHI, i.ISLEM_ID
        """;

    public async Task<Ekstre?> OkuAsync(int hesapId, EkstreFiltre filtre, CancellationToken ct = default)
    {
        var hesap = await db.Hesaplar.AsNoTracking()
            .TagWith("Ekstre: hesap ve sahibi")
            .Where(h => h.HesapId == hesapId)
            .Select(h => new { h.HesapNo, h.HesapTipi, h.MusteriId, MusteriAd = h.Musteri!.AdSoyad })
            .FirstOrDefaultAsync(ct);
        if (hesap is null) return null;

        var (donem, bas, bit) = EkstreDonemleri.Coz(filtre, DateTime.Today);

        await using var baglanti = await fabrika.AcAsync(ct);
        var acilis = await baglanti.ExecuteScalarIzliAsync<decimal>("Dönem başı bakiye", new CommandDefinition(AcilisSql,
            new OracleParametreleri().Girdi("hesap_id", hesapId).Girdi("bas", bas, OracleDbType.TimeStamp),
            cancellationToken: ct));
        var hareketler = (await baglanti.QueryIzliAsync<HareketSatiri>("Ekstre satırları, yürüyen bakiye (SUM() OVER)", new CommandDefinition(HareketSql,
                new OracleParametreleri()
                    .Girdi("hesap_id", hesapId)
                    .Girdi("bas", bas, OracleDbType.TimeStamp)
                    .Girdi("bit_ertesi", bit.AddDays(1), OracleDbType.TimeStamp)
                    .Girdi("acilis", acilis),
                cancellationToken: ct)))
            .Select(s => new IslemSatiri
            {
                Id = s.Id,
                Tarih = s.Tarih,
                HesapId = hesapId,
                HesapNo = hesap.HesapNo,
                Tip = VeritabaniKodu.Oku<IslemTipi>(s.TipKodu),
                Tutar = s.Tutar,
                Aciklama = s.Aciklama,
                KarsiHesapId = s.KarsiHesapId,
                KarsiHesapNo = s.KarsiHesapNo,
                BakiyeSonra = s.BakiyeSonra
            })
            .ToList();

        var tipler = filtre.Tip.Distinct().ToList();
        return new Ekstre
        {
            HesapId = hesapId,
            HesapNo = hesap.HesapNo,
            HesapTipi = hesap.HesapTipi,
            MusteriId = hesap.MusteriId,
            MusteriAd = hesap.MusteriAd,
            Donem = donem,
            Bas = bas,
            Bit = bit,
            Tipler = tipler,
            Ozet = EkstreOzeti.Hesapla(acilis, hareketler),
            Satirlar = tipler.Count == 0 ? hareketler : hareketler.Where(s => tipler.Contains(s.Tip)).ToList()
        };
    }

    private sealed class HareketSatiri
    {
        public int Id { get; set; }
        public DateTime Tarih { get; set; }
        public string TipKodu { get; set; } = string.Empty;
        public decimal Tutar { get; set; }
        public string? Aciklama { get; set; }
        public int? KarsiHesapId { get; set; }
        public string? KarsiHesapNo { get; set; }
        public decimal BakiyeSonra { get; set; }
    }
}
