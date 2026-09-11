using MusteriHesapYonetimi.Application.Hesaplar;
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

        return app;
    }
}
