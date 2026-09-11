using System.Globalization;
using System.Text.RegularExpressions;
using MusteriHesapYonetimi.Application.Hesaplar;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Application.Musteriler;

/// <summary>Müşteri kaydının iş kuralları. Veritabanından bağımsızdır, birim testle doğrulanır.</summary>
public static partial class MusteriKurallari
{
    /// <summary>CK_MUSTERI_NO_BICIM ile aynı: tam 8 rakam.</summary>
    public static bool MusteriNoGecerli(string? musteriNo) => musteriNo is not null && MusteriNoBicimi().IsMatch(musteriNo);

    /// <summary>İlk hanesi sıfır olmayan 8 haneli numara. Benzersizliği servis kontrol eder.</summary>
    public static string RastgeleMusteriNo(Random rastgele)
        => rastgele.Next(10_000_000, 100_000_000).ToString(CultureInfo.InvariantCulture);

    public static string AdDuzelt(string? ad) => Bosluklar().Replace((ad ?? string.Empty).Trim(), " ");

    public static string? AdHatasi(MusteriTipi tip, string? ad)
    {
        var a = AdDuzelt(ad);
        if (a.Length == 0) return tip == MusteriTipi.Kurumsal ? "Ünvanı girin." : "Ad ve soyadı girin.";
        if (a.Length < 3) return "En az 3 karakter girin.";
        if (tip == MusteriTipi.Bireysel && !a.Contains(' ')) return "Ad ve soyadı birlikte girin.";
        return null;
    }

    public static string? EpostaDuzelt(string? eposta)
        => string.IsNullOrWhiteSpace(eposta) ? null : eposta.Trim().ToLowerInvariant();

    public static string? EpostaHatasi(string? eposta)
        => eposta is null || EpostaBicimi().IsMatch(eposta) ? null : "Geçerli bir e-posta girin, örneğin ad.soyad@example.com.";

    /// <summary>"05354054591", "5354054591", "+90 535..." → "+90 535 405 45 91". Başka biçimdeki numara kırpılıp korunur.</summary>
    public static string? TelefonBicimle(string? telefon)
    {
        if (string.IsNullOrWhiteSpace(telefon)) return null;
        var d = Rakamlar(telefon);
        if (d.Length == 12 && d.StartsWith("90", StringComparison.Ordinal)) d = d[2..];
        if (d.Length == 11 && d.StartsWith('0')) d = d[1..];
        return d.Length == 10 ? $"+90 {d[..3]} {d[3..6]} {d[6..8]} {d[8..]}" : telefon.Trim();
    }

    public static string? TelefonHatasi(string? telefon)
        => telefon is null || Rakamlar(telefon).Length >= 10 ? null : "Telefon numarası en az 10 haneli olmalı.";

    /// <summary>Hesap numaraları müşteri numarasını içerir (1001-40218375-01); hesabı olan müşterinin numarası değişmez.</summary>
    public static string? MusteriNoDegisikligiHatasi(int hesapSayisi)
        => hesapSayisi > 0 ? "Hesabı olan müşterinin numarası değiştirilemez; hesap numaraları bu numarayı içerir." : null;

    /// <summary>
    /// Aktif hesaplarından birinde bakiye veya açık hisse pozisyonu olan müşteri pasife alınamaz
    /// (prototipteki -20004). Pasif müşterinin hesapları korunur; PKG_ISLEM yeni işlemi -20002 ile reddeder.
    /// </summary>
    public static string? PasifeAlmaEngeli(bool musteriAktif, IEnumerable<HesapDurumu> hesaplar)
    {
        if (!musteriAktif) return "Müşteri zaten pasif.";
        foreach (var h in hesaplar.Where(h => h.Aktif))
        {
            if (h.Bakiye != 0)
                return $"{h.HesapNo} hesabında {TurkceBicim.Para(h.Bakiye)} bakiye var. Önce bakiye çekilmeli veya aktarılmalı.";
            if (h.PozisyonSayisi > 0)
                return $"{h.HesapNo} hesabında açık hisse pozisyonu var. Önce pozisyonlar satılmalı.";
        }
        return null;
    }

    /// <summary>Kaydı kurallara göre düzeltir ve tüm alan hatalarını birlikte döner.</summary>
    public static IReadOnlyList<AlanHatasi> Dogrula(MusteriKaydi kayit)
    {
        kayit.AdSoyad = AdDuzelt(kayit.AdSoyad);
        kayit.MusteriNo = (kayit.MusteriNo ?? string.Empty).Trim();
        kayit.Eposta = EpostaDuzelt(kayit.Eposta);
        kayit.Telefon = TelefonBicimle(kayit.Telefon);

        var hatalar = new List<AlanHatasi>();
        if (AdHatasi(kayit.Tip, kayit.AdSoyad) is { } ad) hatalar.Add(new(nameof(MusteriKaydi.AdSoyad), ad));
        if (!MusteriNoGecerli(kayit.MusteriNo))
            hatalar.Add(new(nameof(MusteriKaydi.MusteriNo), "Müşteri no 8 haneli olmalı ve yalnız rakam içermeli."));
        if (EpostaHatasi(kayit.Eposta) is { } eposta) hatalar.Add(new(nameof(MusteriKaydi.Eposta), eposta));
        if (TelefonHatasi(kayit.Telefon) is { } telefon) hatalar.Add(new(nameof(MusteriKaydi.Telefon), telefon));
        return hatalar;
    }

    public static string Rakamlar(string metin) => new(metin.Where(char.IsAsciiDigit).ToArray());

    [GeneratedRegex("^[0-9]{8}$")]
    private static partial Regex MusteriNoBicimi();

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")]
    private static partial Regex EpostaBicimi();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Bosluklar();
}
