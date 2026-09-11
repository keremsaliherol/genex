using Microsoft.EntityFrameworkCore;

namespace MusteriHesapYonetimi.Data;

/// <summary>
/// LINQ sorgularında kullanılan Oracle yerleşik fonksiyonları.
/// Türkçe sıralama ve Türkçe büyük harfle arama sorgunun içinde açıkça yazılır:
/// <c>ORDER BY NLSSORT(AD_SOYAD, 'NLS_SORT=XTURKISH')</c>. Oturum ayarı (ALTER SESSION SET NLS_SORT) yerine bu yol
/// seçildi: havuzdaki bağlantılarda durum taşımaz, her açılışta ek gidiş-dönüş gerektirmez, SQL'de görünür.
/// </summary>
public static class OracleFonksiyonlari
{
    public const string Turkce = "NLS_SORT=XTURKISH";

    /// <summary>NLSSORT(deger, ayar): dilbilimsel sıralama anahtarı (RAW). Yalnız ORDER BY'da kullanılır.</summary>
    public static string NlsSort(string deger, string ayar) => throw new InvalidOperationException("Yalnız LINQ sorgusunda kullanılır.");

    /// <summary>NLS_UPPER(deger, ayar): XTURKISH ile "i" → "İ", "ı" → "I" (UPPER bunu yapmaz).</summary>
    public static string NlsUpper(string deger, string ayar) => throw new InvalidOperationException("Yalnız LINQ sorgusunda kullanılır.");

    internal static void Kaydet(ModelBuilder modelBuilder)
    {
        foreach (var (metot, ad) in new[] { (nameof(NlsSort), "NLSSORT"), (nameof(NlsUpper), "NLS_UPPER") })
        {
            var fonksiyon = modelBuilder.HasDbFunction(typeof(OracleFonksiyonlari).GetMethod(metot)!).HasName(ad).IsBuiltIn();
            // Ayar sabiti N'...' değil '...' olarak yazılsın
            fonksiyon.HasParameter("ayar").HasStoreType("VARCHAR2(50)");
        }
    }
}
