using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using MusteriHesapYonetimi.Data.Kimlik;

namespace MusteriHesapYonetimi.Web.Altyapi;

/// <summary>
/// Oturum: ASP.NET Core Identity (tek yönetici, rol yok), çerezle. Tüm uç noktalar varsayılan olarak oturum ister
/// (FallbackPolicy); giriş ve hata sayfaları, statik dosyalar ve /saglik açıkça anonimdir.
/// </summary>
public static class KimlikKaydi
{
    public const int EnFazlaHataliDeneme = 5;
    public static readonly TimeSpan KilitSuresi = TimeSpan.FromMinutes(5);
    public const string VarsayilanEposta = "admin@hesapmasasi.local";

    public static IServiceCollection AddKimlik(this IServiceCollection services)
    {
        services.AddIdentityCore<IdentityUser>(o =>
            {
                o.User.RequireUniqueEmail = true;
                o.Password.RequiredLength = 10;
                o.Lockout.AllowedForNewUsers = true;
                o.Lockout.MaxFailedAccessAttempts = EnFazlaHataliDeneme;
                o.Lockout.DefaultLockoutTimeSpan = KilitSuresi;
            })
            .AddSignInManager()
            .AddEntityFrameworkStores<KimlikDbContext>();

        services.AddAuthentication(IdentityConstants.ApplicationScheme).AddIdentityCookies();
        services.ConfigureApplicationCookie(o =>
        {
            o.Cookie.Name = "hm-oturum";
            o.Cookie.HttpOnly = true;
            o.Cookie.SameSite = SameSiteMode.Lax;
            o.LoginPath = "/Giris";
            o.LogoutPath = "/Cikis";
            o.AccessDeniedPath = "/Giris";
            o.ReturnUrlParameter = "donus";
            o.ExpireTimeSpan = TimeSpan.FromHours(8);
            o.SlidingExpiration = true;
            // JSON uçları giriş sayfasına yönlendirmez, 401 döndürür: fetch HTML'i JSON diye okumaya çalışmaz
            o.Events.OnRedirectToLogin = ctx =>
            {
                if (ctx.Request.Path.StartsWithSegments("/api")) ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                else ctx.Response.Redirect(ctx.RedirectUri);
                return Task.CompletedTask;
            };
        });

        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
        return services;
    }

    /// <summary>
    /// Yönetici hesabı yoksa oluşturur (ilk çalıştırmada ve db\kur.ps1 sonrası). Parola koda yazılmaz: Yonetici:Parola
    /// (geliştirmede user-secrets, sunucuda ortam değişkeni). Veritabanı hazır değilse uygulama yine açılır; neden günlüğe yazılır.
    /// </summary>
    public static async Task YoneticiHesabiniHazirlaAsync(this WebApplication app)
    {
        var gunluk = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Kimlik");
        var eposta = app.Configuration["Yonetici:Eposta"] ?? VarsayilanEposta;
        try
        {
            using var kapsam = app.Services.CreateScope();
            var kullanicilar = kapsam.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
            if (await kullanicilar.FindByEmailAsync(eposta) is not null) return;

            var parola = app.Configuration["Yonetici:Parola"];
            if (string.IsNullOrWhiteSpace(parola))
            {
                gunluk.LogWarning("Yönetici hesabı yok ve Yonetici:Parola tanımlı değil; oturum açılamaz. Geliştirmede: " +
                    "dotnet user-secrets set \"Yonetici:Parola\" \"<parola>\" --project src/MusteriHesapYonetimi.Web");
                return;
            }
            var sonuc = await kullanicilar.CreateAsync(new IdentityUser { UserName = eposta, Email = eposta, EmailConfirmed = true }, parola);
            if (sonuc.Succeeded) gunluk.LogInformation("Yönetici hesabı oluşturuldu: {Eposta}", eposta);
            else gunluk.LogError("Yönetici hesabı oluşturulamadı: {Hatalar}", string.Join(" ", sonuc.Errors.Select(h => h.Description)));
        }
        catch (Exception hata)
        {
            gunluk.LogError(hata, "Yönetici hesabı hazırlanamadı. Kimlik tabloları kurulu mu? (db\\kur.ps1, 05_identity.sql)");
        }
    }
}
