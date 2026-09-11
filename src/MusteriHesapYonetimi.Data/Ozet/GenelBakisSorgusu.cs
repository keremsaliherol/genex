using Microsoft.EntityFrameworkCore;
using MusteriHesapYonetimi.Application.Ozet;
using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Data.Ozet;

public sealed class GenelBakisSorgusu(HesapMasasiDbContext db) : IGenelBakisSorgusu
{
    public async Task<GenelBakisOzeti> OkuAsync(CancellationToken ct = default)
    {
        var bugun = DateTime.Today;

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
            SonIslemler = sonIslemler
        };
    }
}
