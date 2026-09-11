using Dapper;
using Microsoft.EntityFrameworkCore;
using MusteriHesapYonetimi.Application.Ozet;
using MusteriHesapYonetimi.Application.Raporlar;
using MusteriHesapYonetimi.Data.Izleme;
using MusteriHesapYonetimi.Domain;
using Oracle.ManagedDataAccess.Client;

namespace MusteriHesapYonetimi.Data.Ozet;

public sealed class GenelBakisSorgusu(HesapMasasiDbContext db, OracleBaglantiFabrikasi fabrika, IRaporSorgusu raporlar) : IGenelBakisSorgusu
{
    // Günlük toplam veritabanında: TRUNC gruplamada, süzgeçte değil; ISLEM_TARIHI >= :bas koşulu IDX_ISLEM_TARIH'i kullanır.
    private const string NakitAkisiSql = """
        SELECT TRUNC(ISLEM_TARIHI) AS Gun,
               SUM(CASE WHEN ISLEM_TIPI = 'YATIRMA' THEN TUTAR ELSE 0 END) AS Giris,
               SUM(CASE WHEN ISLEM_TIPI = 'CEKME' THEN TUTAR ELSE 0 END) AS Cikis
          FROM ISLEM
         WHERE ISLEM_TARIHI >= :bas
           AND ISLEM_TIPI IN ('YATIRMA', 'CEKME')
         GROUP BY TRUNC(ISLEM_TARIHI)
         ORDER BY Gun
        """;

    public async Task<GenelBakisOzeti> OkuAsync(CancellationToken ct = default)
    {
        var bugun = DateTime.Today;
        var otuzGunOnce = bugun.AddDays(-(NakitAkisi.GunSayisi - 1));

        var musteriler = await db.Musteriler
            .TagWith("Aktif müşteriler (tipe göre)")
            .Where(m => m.Aktif)
            .GroupBy(m => m.MusteriTipi)
            .Select(g => new { Tip = g.Key, Adet = g.Count() })
            .ToListAsync(ct);

        var hesaplar = await db.Hesaplar
            .TagWith("Açık hesaplar ve toplam bakiye (tipe göre)")
            .Where(h => h.Aktif)
            .GroupBy(h => h.HesapTipi)
            .Select(g => new { Tip = g.Key, Adet = g.Count(), Bakiye = g.Sum(h => h.Bakiye) })
            .ToListAsync(ct);

        // Transfer iki kayıttır; gelen ayak sayılmaz, yoksa adet ve hacim iki kez eklenir.
        var bugunku = db.Islemler.Where(i => i.IslemTarihi >= bugun && i.IslemTipi != IslemTipi.TransferGelen);
        var bugunIslem = await bugunku.TagWith("Bugünkü işlem sayısı").CountAsync(ct);
        var bugunHacim = bugunIslem == 0 ? 0 : await bugunku.TagWith("Bugünkü işlem hacmi").SumAsync(i => i.Tutar, ct);

        List<AkisSatiri> akis;
        await using (var baglanti = await fabrika.AcAsync(ct))
        {
            akis = await baglanti.QueryIzliAsync<AkisSatiri>("Nakit akışı, son 30 gün (günlük yatırma ve çekme)",
                new CommandDefinition(NakitAkisiSql,
                    new OracleParametreleri().Girdi("bas", otuzGunOnce, OracleDbType.TimeStamp),
                    cancellationToken: ct));
        }

        var enAktif = await raporlar.EnAktifAsync(EnAktifTuru.Musteri, otuzGunOnce, 5, ct);

        var sonIslemler = await db.Islemler.AsNoTracking()
            .TagWith("Son işlemler")
            .OrderByDescending(i => i.IslemTarihi).ThenByDescending(i => i.IslemId)
            .Take(10)
            .Select(SorguYardimcilari.IslemSatiri)
            .ToListAsync(ct);

        return new GenelBakisOzeti
        {
            Bugun = bugun,
            AktifMusteri = musteriler.Sum(x => x.Adet),
            KurumsalMusteri = musteriler.Where(x => x.Tip == MusteriTipi.Kurumsal).Sum(x => x.Adet),
            AcikHesap = hesaplar.Sum(x => x.Adet),
            YatirimHesabi = hesaplar.Where(x => x.Tip == HesapTipi.Yatirim).Sum(x => x.Adet),
            ToplamBakiye = hesaplar.Sum(x => x.Bakiye),
            BugunIslem = bugunIslem,
            BugunHacim = bugunHacim,
            NakitAkisi = NakitAkisi.Doldur(bugun, akis.Select(a => new GunlukAkis(a.Gun, a.Giris, a.Cikis))),
            EnAktifMusteriler = enAktif,
            SonIslemler = sonIslemler
        };
    }

    private sealed class AkisSatiri
    {
        public DateTime Gun { get; set; }
        public decimal Giris { get; set; }
        public decimal Cikis { get; set; }
    }
}
