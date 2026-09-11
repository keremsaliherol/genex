using Oracle.ManagedDataAccess.Client;

namespace MusteriHesapYonetimi.Data;

/// <summary>OracleException'ı istisna zincirinden (ör. DbUpdateException → OracleException) çıkarır ve yorumlar.</summary>
internal static class OracleHatalari
{
    public const int Benzersizlik = 1;     // ORA-00001
    public const int CheckIhlali = 2290;   // ORA-02290

    public static OracleException? Bul(Exception hata)
    {
        for (Exception? e = hata; e is not null; e = e.InnerException)
        {
            if (e is OracleException oracle) return oracle;
        }
        return null;
    }

    /// <summary>ORA-00001 ve ORA-02290 mesajı kısıt adını içerir, ör. "unique constraint (HESAP.UQ_MUSTERI_NO) violated".</summary>
    public static bool KisitMi(Exception hata, int numara, string kisit)
        => Bul(hata) is { } o && o.Number == numara && o.Message.Contains(kisit, StringComparison.OrdinalIgnoreCase);

    /// <summary>RAISE_APPLICATION_ERROR (-20000..-20999) hatası mı: iş kuralı ihlali, kullanıcıya gösterilebilir.</summary>
    public static bool UygulamaHatasiMi(OracleException hata) => hata.Number is >= 20000 and <= 20999;

    /// <summary>"ORA-20001: Yetersiz bakiye. ...\nORA-06512: at ..." → "Yetersiz bakiye. ..."</summary>
    public static string UygulamaMesaji(OracleException hata)
    {
        var ilkSatir = hata.Message.Split('\n', 2)[0].Trim();
        var ayrac = ilkSatir.IndexOf(": ", StringComparison.Ordinal);
        return ilkSatir.StartsWith("ORA-", StringComparison.Ordinal) && ayrac > 0 ? ilkSatir[(ayrac + 2)..] : ilkSatir;
    }
}
