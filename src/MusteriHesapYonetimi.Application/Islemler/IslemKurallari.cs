using MusteriHesapYonetimi.Application.Ortak;

namespace MusteriHesapYonetimi.Application.Islemler;

public static class IslemKurallari
{
    public static bool HisseIslemi(this IslemTuru tur) => tur is IslemTuru.Alim or IslemTuru.Satim;

    /// <summary>
    /// Paket çağrısından önceki biçim kontrolü: zorunlu alanlar ve tutar biçimi. Bakiye, pasif hesap, pozisyon ve
    /// aynı hesaba transfer kuralları bilerek PKG_ISLEM'e bırakılır; kuralın tek kaynağı PL/SQL'dir.
    /// Arayüz aynı kontrolleri yalnız kullanıcıya erken haber vermek için yapar.
    /// </summary>
    public static IReadOnlyList<AlanHatasi> Dogrula(IslemKaydi kayit, out decimal tutar)
    {
        tutar = 0;
        var hatalar = new List<AlanHatasi>();
        if (kayit.HesapId is null)
            hatalar.Add(new(nameof(IslemKaydi.HesapId), "Listeden bir hesap seçin."));
        if (kayit.Tur == IslemTuru.Transfer && kayit.HedefHesapId is null)
            hatalar.Add(new(nameof(IslemKaydi.HedefHesapId), "Hedef hesabı seçin."));

        if (kayit.Tur.HisseIslemi())
        {
            if (string.IsNullOrWhiteSpace(kayit.HisseKodu))
                hatalar.Add(new(nameof(IslemKaydi.HisseKodu), "Bir hisse seçin."));
            if (kayit.Adet is null)
                hatalar.Add(new(nameof(IslemKaydi.Adet), "Adedi girin."));
        }
        else if (string.IsNullOrWhiteSpace(kayit.Tutar))
        {
            hatalar.Add(new(nameof(IslemKaydi.Tutar), "Tutarı girin."));
        }
        else if (!TutarMetni.TryAyristir(kayit.Tutar, out tutar))
        {
            hatalar.Add(new(nameof(IslemKaydi.Tutar), "Tutarı 1.250,00 biçiminde, en fazla 2 ondalıkla girin."));
        }
        return hatalar;
    }
}

/// <summary>PKG_ISLEM'in RAISE_APPLICATION_ERROR kodlarının form alanı karşılığı (arayüz planı, "Hata eşleme").</summary>
public static class PaketHatalari
{
    public static string? Alan(int oracleNo, string mesaj, IslemTuru tur) => oracleNo switch
    {
        20001 => tur.HisseIslemi() ? nameof(IslemKaydi.Adet) : nameof(IslemKaydi.Tutar),   // yetersiz bakiye
        20003 or 20010 => nameof(IslemKaydi.Adet),                                         // satılabilir adet, geçersiz adet
        20011 => nameof(IslemKaydi.Tutar),                                                 // geçersiz tutar
        20012 => nameof(IslemKaydi.HedefHesapId),                                          // aynı hesaba transfer
        20009 => nameof(IslemKaydi.HisseKodu),                                             // hisse bulunamadı
        20006 => nameof(IslemKaydi.Tur),                                                   // hisse yalnız yatırım hesabında
        // Pasif veya bulunamayan hesap: paket mesajı "Hedef hesap ..." ya da "Bu hesap ..." diye başlar
        20002 or 20008 => mesaj.StartsWith("Hedef", StringComparison.Ordinal) ? nameof(IslemKaydi.HedefHesapId) : nameof(IslemKaydi.HesapId),
        _ => null
    };

    public static string Kod(int oracleNo) => $"ORA-{oracleNo:00000}";
}
