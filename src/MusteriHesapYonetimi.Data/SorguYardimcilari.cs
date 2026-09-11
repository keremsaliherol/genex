using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Data;

internal static class SorguYardimcilari
{
    public static IOrderedQueryable<T> Sirali<T, TAnahtar>(this IQueryable<T> sorgu, Expression<Func<T, TAnahtar>> anahtar, SiralamaYonu yon)
        => yon == SiralamaYonu.Azalan ? sorgu.OrderByDescending(anahtar) : sorgu.OrderBy(anahtar);

    /// <summary>Toplamı sayar, sayfayı son sayfaya sıkıştırır ve yalnız o sayfayı çeker (Oracle: OFFSET/FETCH).</summary>
    public static async Task<SayfaSonucu<T>> SayfalaAsync<T>(
        this IOrderedQueryable<T> sirali, int toplam, int sayfa, int boyut, CancellationToken ct)
    {
        boyut = Sayfalama.BoyutDuzelt(boyut);
        sayfa = Sayfalama.SayfaDuzelt(sayfa, toplam, boyut);
        var ogeler = toplam == 0 ? [] : await sirali.Skip((sayfa - 1) * boyut).Take(boyut).ToListAsync(ct);
        return new SayfaSonucu<T>(ogeler, toplam, sayfa, boyut);
    }

    /// <summary>Hareket tablolarının ortak satırı. Karşı hesap yoksa LEFT JOIN null döner.</summary>
    public static readonly Expression<Func<Islem, IslemSatiri>> IslemSatiri = i => new IslemSatiri
    {
        Id = i.IslemId,
        Tarih = i.IslemTarihi,
        HesapId = i.HesapId,
        HesapNo = i.Hesap!.HesapNo,
        MusteriAd = i.Hesap.Musteri!.AdSoyad,
        Tip = i.IslemTipi,
        Tutar = i.Tutar,
        Aciklama = i.Aciklama,
        KarsiHesapId = i.KarsiHesapId,
        KarsiHesapNo = i.KarsiHesap!.HesapNo
    };
}
