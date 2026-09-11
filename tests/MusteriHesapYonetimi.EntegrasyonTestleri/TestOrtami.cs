using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MusteriHesapYonetimi.Data;
using MusteriHesapYonetimi.Data.Kimlik;
using Oracle.EntityFrameworkCore.Infrastructure;

namespace MusteriHesapYonetimi.EntegrasyonTestleri;

/// <summary>
/// Gerçek Oracle şemasına bağlanan testlerin ortamı. Bağlantı cümlesi Web projesinin user-secrets deposundan
/// (ConnectionStrings:HesapMasasi) ya da ConnectionStrings__HesapMasasi ortam değişkeninden okunur; ikisi de yoksa
/// testler atlanır. Testler veriyi değiştirmez: yalnız okur ya da paketin reddettiği (geri alınan) işlemleri dener.
/// Tohum veriye göre yazılmıştır (db\kur.ps1).
/// </summary>
internal static class TestOrtami
{
    // Web projesinin UserSecretsId'si: geliştirici testler için ikinci bir gizli ayar tanımlamaz
    private const string WebUserSecretsId = "60ca70c6-76cc-4d49-a1c5-57dbfa1e6897";

    /// <summary>Tohum veride Göksu Mobilya'nın (aktif müşteri 88) aktif vadesiz hesabı 1001-55510734-02; en çok hareketli hesap.</summary>
    public const int GoksuHesabi = 5132;
    public const int GoksuMusterisi = 88;

    public static readonly string? BaglantiCumlesi = new ConfigurationBuilder()
        .AddUserSecrets(WebUserSecretsId)
        .AddEnvironmentVariables()
        .Build()
        .GetConnectionString("HesapMasasi");

    public static OracleBaglantiFabrikasi Fabrika() => new(BaglantiCumlesi!);

    public static HesapMasasiDbContext Veritabani() => new(new DbContextOptionsBuilder<HesapMasasiDbContext>()
        .UseOracle(BaglantiCumlesi, o => o.UseOracleSQLCompatibility(OracleSQLCompatibility.DatabaseVersion19)).Options);

    public static KimlikDbContext Kimlik() => new(new DbContextOptionsBuilder<KimlikDbContext>()
        .UseOracle(BaglantiCumlesi, o => o.UseOracleSQLCompatibility(OracleSQLCompatibility.DatabaseVersion19)).Options);

    /// <summary>Tek değerli kontrol sorgusu (sayım, kimlik); parametreler adla bağlanır.</summary>
    public static async Task<T> DegerAsync<T>(string sql, OracleParametreleri? parametreler = null)
    {
        await using var baglanti = await Fabrika().AcAsync();
        return (await baglanti.ExecuteScalarAsync<T>(sql, parametreler))!;
    }

    /// <summary>Hesabın bakiyesi ve işlem sayısı: reddedilen işlemin hiçbir şey yazmadığını göstermek için.</summary>
    public static async Task<(decimal Bakiye, int IslemSayisi)> HesapDurumuAsync(int hesapId)
    {
        await using var baglanti = await Fabrika().AcAsync();
        var d = await baglanti.QuerySingleAsync<HesapDurumu>(
            "SELECT h.BAKIYE AS Bakiye, (SELECT COUNT(*) FROM ISLEM i WHERE i.HESAP_ID = h.HESAP_ID) AS IslemSayisi FROM HESAP h WHERE h.HESAP_ID = :id",
            new OracleParametreleri().Girdi("id", hesapId));
        return (d.Bakiye, d.IslemSayisi);
    }

    private sealed class HesapDurumu
    {
        public decimal Bakiye { get; set; }
        public int IslemSayisi { get; set; }
    }
}

/// <summary>Oracle bağlantısı tanımlı değilse test çalışmaz, "atlandı" olarak raporlanır (Oracle olmayan CI).</summary>
public sealed class OracleFactAttribute : FactAttribute
{
    public OracleFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(TestOrtami.BaglantiCumlesi))
            Skip = "Oracle bağlantısı tanımlı değil: ConnectionStrings:HesapMasasi (Web user-secrets) ya da ConnectionStrings__HesapMasasi.";
    }
}
