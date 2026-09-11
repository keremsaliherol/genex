using MusteriHesapYonetimi.Application.Ortak;

namespace MusteriHesapYonetimi.Application.Hesaplar;

/// <summary>Pasife alma kararı için bir hesabın durumu.</summary>
public sealed record HesapDurumu(string HesapNo, bool Aktif, decimal Bakiye, int PozisyonSayisi);

public static class HesapKurallari
{
    public const string AcilisAciklamasi = "Açılış bakiyesi";

    /// <summary>HESAP.EK_NO NUMBER(3).</summary>
    public const int EnBuyukEkNo = 999;

    /// <summary>Müşterinin sıradaki ek numarası: en büyük + 1 (pasif hesapların numarası da dolu sayılır).</summary>
    public static int SonrakiEkNo(int? enBuyukEkNo) => (enBuyukEkNo ?? 0) + 1;

    /// <summary>
    /// Hesap yalnız bakiyesi sıfırsa ve açık hisse pozisyonu yoksa pasife alınır.
    /// Veritabanındaki CK_HESAP_PASIF_BAKIYE kısıtı aynı kuralın son güvencesidir. null: alınabilir.
    /// </summary>
    public static string? PasifeAlmaEngeli(HesapDurumu hesap)
    {
        if (!hesap.Aktif) return "Hesap zaten pasif.";
        if (hesap.Bakiye != 0)
            return $"Bakiye sıfırlanmadan hesap pasife alınamaz. Mevcut bakiye: {TurkceBicim.Para(hesap.Bakiye)}.";
        if (hesap.PozisyonSayisi > 0)
            return $"Hesapta {hesap.PozisyonSayisi} açık hisse pozisyonu var. Önce pozisyonlar satılmalı.";
        return null;
    }

    /// <summary>Açılış tutarı isteğe bağlıdır; girilirse sıfırdan büyük ve en fazla 2 ondalık olmalı.</summary>
    public static string? AcilisTutariHatasi(string? metin, out decimal? tutar)
    {
        tutar = null;
        if (string.IsNullOrWhiteSpace(metin)) return null;
        if (!TutarMetni.TryAyristir(metin, out var t))
            return "Tutarı 1.250,00 biçiminde, en fazla 2 ondalıkla girin.";
        if (t == 0) return null;
        tutar = t;
        return null;
    }
}
