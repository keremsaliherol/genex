using MusteriHesapYonetimi.Application.Hesaplar;
using MusteriHesapYonetimi.Application.Islemler;
using MusteriHesapYonetimi.Application.Musteriler;
using MusteriHesapYonetimi.Web.Altyapi;

namespace MusteriHesapYonetimi.Web.Api;

/// <summary>Arayüzdeki arama kutularının JSON uçları (üst çubuk araması, müşteri seçici, form yardımcıları).</summary>
public static class AramaUclari
{
    public static IEndpointRouteBuilder MapAramaUclari(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api");

        // Üst çubuk (Ctrl+K): müşteri adı/no ve hesap no
        api.MapGet("/ara", async (string? q, IMusteriServisi musteriler, IHesapServisi hesaplar, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
                return Results.Ok(new { musteriler = Array.Empty<object>(), hesaplar = Array.Empty<object>() });
            var m = await musteriler.AraAsync(q, 5, ct);
            var h = await hesaplar.AraAsync(q, 5, ct);
            return Results.Ok(new
            {
                musteriler = m.Select(x => new { x.Id, no = x.MusteriNo, ad = x.AdSoyad, x.Aktif }),
                hesaplar = h.Select(x => new { x.Id, no = x.HesapNo, ad = x.MusteriAd, x.Aktif })
            });
        });

        // Hesap aç formundaki müşteri seçici
        api.MapGet("/musteri/ara", async (string? q, IMusteriServisi musteriler, CancellationToken ct) =>
            Results.Ok((await musteriler.AraAsync(q ?? string.Empty, 8, ct)).Select(x => new
            {
                x.Id,
                no = x.MusteriNo,
                ad = x.AdSoyad,
                tip = Etiketler.MusteriTipiEtiketi(x.Tip).Ad,
                x.Aktif
            })));

        api.MapGet("/musteri/yeni-no", async (IMusteriServisi musteriler, CancellationToken ct) =>
            Results.Ok(new { no = await musteriler.YeniMusteriNoAsync(ct) }));

        api.MapGet("/hesap/no-onizle", async (int musteriId, IHesapServisi hesaplar, CancellationToken ct) =>
            Results.Ok(new { no = await hesaplar.HesapNoOnizleAsync(musteriId, ct) }));

        // İşlem formundaki kaynak ve hedef hesap seçicileri
        api.MapGet("/hesap/ara", async (string? q, int? haric, IHesapServisi hesaplar, CancellationToken ct) =>
            Results.Ok((await hesaplar.AraAsync(q ?? string.Empty, 8, ct)).Where(x => x.Id != haric).Select(x => new
            {
                x.Id,
                no = x.HesapNo,
                ad = x.MusteriAd,
                tipAd = Etiketler.HesapTipiEtiketi(x.Tip).Ad,
                x.Bakiye,
                x.Aktif,
                x.MusteriAktif
            })));

        api.MapGet("/hesap/{id:int}/islem", async (int id, IIslemServisi islemler, CancellationToken ct) =>
            await islemler.HesapAsync(id, ct) is { } hesap ? Results.Ok(IslemApi.Hesap(hesap)) : Results.NotFound());

        return app;
    }
}
