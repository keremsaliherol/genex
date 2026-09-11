using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MusteriHesapYonetimi.Data.Kimlik;

/// <summary>
/// ASP.NET Core Identity deposu: tek yönetici, rol yok (IdentityUserContext). Tablolar db/05_identity.sql ile kurulur;
/// migration kullanılmaz. Adlar şemanın geri kalanıyla aynı kuralda: tırnaksız büyük harf (ASPNET_USERS, USER_NAME),
/// metinler VARCHAR2, bayraklar NUMBER(1). Bu bağlamın komutları Oracle izine yazılmaz: bind değerlerinde parola özeti
/// ve güvenlik damgası görünürdü.
/// </summary>
public sealed partial class KimlikDbContext(DbContextOptions<KimlikDbContext> options) : IdentityUserContext<IdentityUser>(options)
{
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        foreach (var varlik in builder.Model.GetEntityTypes())
        {
            // IdentityUser → ASPNET_USERS, IdentityUserClaim<string> → ASPNET_USER_CLAIMS
            var ad = varlik.ClrType.Name.Split('`')[0].Replace("Identity", string.Empty);
            varlik.SetTableName($"ASPNET_{BuyukHarfliAd(ad)}S");
            foreach (var ozellik in varlik.GetProperties())
            {
                ozellik.SetColumnName(BuyukHarfliAd(ozellik.Name));
                if (ozellik.ClrType == typeof(string)) ozellik.SetIsUnicode(false);
                if (ozellik.ClrType == typeof(bool)) ozellik.SetColumnType("NUMBER(1)");
            }
        }
    }

    /// <summary>NormalizedUserName → NORMALIZED_USER_NAME</summary>
    private static string BuyukHarfliAd(string ad) => BuyukHarfOncesi().Replace(ad, "_$1").ToUpperInvariant();

    [GeneratedRegex("(?<!^)([A-Z])")]
    private static partial Regex BuyukHarfOncesi();
}
