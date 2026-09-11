using Microsoft.EntityFrameworkCore;

namespace MusteriHesapYonetimi.EntegrasyonTestleri;

/// <summary>
/// Şema SQL betikleriyle yönetildiği için EF modeli ile tablolar ayrı yerlerde tanımlıdır. Her sorgu varlığın bütün
/// kolonlarını seçer; betikte eksik ya da farklı adlı bir kolon ORA-00904, eksik tablo ORA-00942 ile testi düşürür.
/// </summary>
public class ModelUyumuTestleri
{
    [OracleFact]
    public async Task Is_modeli_sema_tablolariyla_uyumlu()
    {
        await using var db = TestOrtami.Veritabani();

        Assert.NotEmpty(await db.Musteriler.AsNoTracking().Take(1).ToListAsync());
        Assert.NotEmpty(await db.Hesaplar.AsNoTracking().Take(1).ToListAsync());
        Assert.NotEmpty(await db.Islemler.AsNoTracking().Take(1).ToListAsync());
        Assert.NotEmpty(await db.Hisseler.AsNoTracking().Take(1).ToListAsync());
        Assert.NotEmpty(await db.Portfoy.AsNoTracking().Take(1).ToListAsync());
    }

    [OracleFact]
    public async Task Kimlik_modeli_05_identity_tablolariyla_uyumlu()
    {
        await using var db = TestOrtami.Kimlik();

        // Yönetici hesabı uygulama açılışında oluşur; kur.ps1 sonrası tablo boş olabilir, burada yalnız şema denetlenir.
        await db.Users.AsNoTracking().Take(1).ToListAsync();
        await db.UserClaims.AsNoTracking().Take(1).ToListAsync();
        await db.UserLogins.AsNoTracking().Take(1).ToListAsync();
        await db.UserTokens.AsNoTracking().Take(1).ToListAsync();
    }
}
