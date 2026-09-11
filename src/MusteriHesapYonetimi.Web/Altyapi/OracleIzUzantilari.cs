using MusteriHesapYonetimi.Data.Izleme;

namespace MusteriHesapYonetimi.Web.Altyapi;

/// <summary>
/// Oracle izi (arayüzün imza öğesi): her sayfa isteğine bir iz bağlamı açılır, tarayıcı çerezle tanınır.
/// /api ve statik dosya istekleri izlenmez. Varsayılan olarak yalnız Development'ta açıktır (OracleIzi:Acik).
/// </summary>
public static class OracleIzUzantilari
{
    public const string Cerez = "hm-iz";
    private const string IstemciAnahtari = "OracleIziIstemci";

    public static IApplicationBuilder UseOracleIzi(this IApplicationBuilder app) => app.Use(async (ctx, next) =>
    {
        var yol = ctx.Request.Path;
        if (yol.StartsWithSegments("/api") || Path.HasExtension(yol.Value))
        {
            await next(ctx);
            return;
        }

        var istemci = ctx.Request.Cookies[Cerez];
        if (string.IsNullOrEmpty(istemci) || istemci.Length > 64)
        {
            istemci = Guid.NewGuid().ToString("N");
            ctx.Response.Cookies.Append(Cerez, istemci, new CookieOptions { HttpOnly = true, SameSite = SameSiteMode.Lax, IsEssential = true });
        }
        ctx.Items[IstemciAnahtari] = istemci;

        var depo = ctx.RequestServices.GetRequiredService<OracleIzDeposu>();
        using (OracleIzBaglami.Baslat(new OracleIzBaglami(depo, istemci, $"{ctx.Request.Method} {yol}{ctx.Request.QueryString}")))
        {
            await next(ctx);
        }
    });

    /// <summary>Bu tarayıcının iz geçmişi (yeniden eskiye); iz kapalıysa null.</summary>
    public static IReadOnlyList<IzGirdisi>? Girdiler(HttpContext ctx)
        => ctx.Items[IstemciAnahtari] is string istemci && ctx.RequestServices.GetService<OracleIzDeposu>() is { } depo
            ? depo.Oku(istemci)
            : null;

    /// <summary>Panelin "Temizle" düğmesi. Yalnız kendi tarayıcısının geçmişini siler.</summary>
    public static IEndpointRouteBuilder MapOracleIzi(this IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/iz", (HttpContext ctx, OracleIzDeposu depo) =>
        {
            if (ctx.Request.Cookies[Cerez] is { } istemci) depo.Temizle(istemci);
            return Results.NoContent();
        });
        return app;
    }
}
