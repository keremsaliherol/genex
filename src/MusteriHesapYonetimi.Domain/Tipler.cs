using System.Text.RegularExpressions;

namespace MusteriHesapYonetimi.Domain;

public enum MusteriTipi { Bireysel, Kurumsal }

public enum HesapTipi { Vadesiz, Yatirim }

public enum IslemTipi { Yatirma, Cekme, TransferGelen, TransferGiden, Alim, Satim }

/// <summary>
/// Enum değerleri veritabanında CHECK kısıtlarındaki kodlarla saklanır:
/// TransferGelen ↔ TRANSFER_GELEN, Bireysel ↔ BIREYSEL. EF Core değer dönüştürücüsü ve Dapper aynı kuralı kullanır.
/// </summary>
public static partial class VeritabaniKodu
{
    public static string Yaz<TEnum>(TEnum deger) where TEnum : struct, Enum
        => BuyukHarfOncesi().Replace(deger.ToString(), "_$1").ToUpperInvariant();

    public static TEnum Oku<TEnum>(string kod) where TEnum : struct, Enum
    {
        foreach (var deger in Enum.GetValues<TEnum>())
        {
            if (Yaz(deger) == kod) return deger;
        }
        throw new ArgumentOutOfRangeException(nameof(kod), kod, $"{typeof(TEnum).Name} için bilinmeyen kod.");
    }

    [GeneratedRegex("(?<!^)([A-Z])")]
    private static partial Regex BuyukHarfOncesi();
}

public static class IslemTipiKurallari
{
    /// <summary>TRG_ISLEM_BAKIYE_GUNCELLE ile aynı kural: giriş işlemleri +1, çıkış işlemleri -1.</summary>
    public static int BakiyeEtkisi(this IslemTipi tip) => tip switch
    {
        IslemTipi.Yatirma or IslemTipi.TransferGelen or IslemTipi.Satim => 1,
        _ => -1
    };

    public static bool TransferMi(this IslemTipi tip) => tip is IslemTipi.TransferGelen or IslemTipi.TransferGiden;

    public static bool HisseIslemiMi(this IslemTipi tip) => tip is IslemTipi.Alim or IslemTipi.Satim;
}

public static class HesapNumarasi
{
    public const string SubeKodu = "1001";

    /// <summary>Şube + müşteri no + iki haneli ek no, ör. 1001-40218375-01.</summary>
    public static string Olustur(string musteriNo, int ekNo) => $"{SubeKodu}-{musteriNo}-{ekNo:00}";
}
