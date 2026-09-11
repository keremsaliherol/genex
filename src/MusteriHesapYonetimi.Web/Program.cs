using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.Mvc;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Application.Sistem;
using MusteriHesapYonetimi.Data;
using MusteriHesapYonetimi.Web.Altyapi;
using MusteriHesapYonetimi.Web.Api;

var builder = WebApplication.CreateBuilder(args);

// Bağlantı cümlesi koda yazılmaz: geliştirmede user-secrets, sunucuda ortam değişkeni
// (ConnectionStrings__HesapMasasi) kullanılır.
var baglantiCumlesi = builder.Configuration.GetConnectionString("HesapMasasi");
if (string.IsNullOrWhiteSpace(baglantiCumlesi))
{
    throw new InvalidOperationException(
        "ConnectionStrings:HesapMasasi tanımlı değil. Geliştirmede şu komutla ekleyin: " +
        "dotnet user-secrets set \"ConnectionStrings:HesapMasasi\" \"User Id=hesap;Password=...;Data Source=localhost:1521/FREEPDB1\" " +
        "--project src/MusteriHesapYonetimi.Web");
}

builder.Services.AddControllersWithViews(o =>
{
    // POST eylemlerinin hepsinde antiforgery doğrulaması; tek tek [ValidateAntiForgeryToken] yazılmaz
    o.Filters.Add(new AutoValidateAntiforgeryTokenAttribute());
    o.ModelBindingMessageProvider.Turkcelestir();
});
// Oracle izi: her ekranın çalıştırdığı SQL/PL-SQL alt panelde. Varsayılan yalnız Development'ta açık.
var oracleIzi = builder.Configuration.GetValue("OracleIzi:Acik", builder.Environment.IsDevelopment());
builder.Services.AddVeriKatmani(baglantiCumlesi, oracleIzi);
// Oturum: tek yönetici (ASP.NET Core Identity, çerez). Tüm uç noktalar varsayılan olarak oturum ister.
builder.Services.AddKimlik();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Hata");
}
// 404 ve diğer durum kodları arayüzün hata sayfasında (Hata/404)
app.UseStatusCodePagesWithReExecute("/Hata/{0}");

// tr-TR: ₺1.234,56, 10.09.2026. Tek dil; tarayıcı dili ne olursa olsun Türkçe biçim.
app.UseRequestLocalization(new RequestLocalizationOptions
{
    DefaultRequestCulture = new RequestCulture(TurkceBicim.Kultur),
    SupportedCultures = [TurkceBicim.Kultur],
    SupportedUICultures = [TurkceBicim.Kultur]
});

if (oracleIzi) app.UseOracleIzi();

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
// Giriş sayfası stil ve betiklerini oturumsuz yükler
app.MapStaticAssets().AllowAnonymous();

// Sağlık kontrolü: Oracle bağlantısı, şema durumu ve iki erişim yolu (Dapper + EF Core). İzleme araçları için anonim.
app.MapGet("/saglik", async (ISistemDurumuSorgusu sorgu, CancellationToken ct) =>
    Results.Ok(await sorgu.OkuAsync(ct))).AllowAnonymous();

app.MapAramaUclari();
if (oracleIzi) app.MapOracleIzi();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();

// İlk çalıştırmada ve db\kur.ps1 sonrasında yönetici hesabı (Yonetici:Eposta, Yonetici:Parola)
await app.YoneticiHesabiniHazirlaAsync();

app.Run();
