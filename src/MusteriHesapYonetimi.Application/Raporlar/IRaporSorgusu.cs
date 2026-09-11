using MusteriHesapYonetimi.Application.Hesaplar;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Application.Raporlar;

/// <summary>
/// Raporlar (S10). Sonuçlar PKG_RAPOR paketinin REF CURSOR'larından ve VW_EN_AKTIF_* view'larından okunur;
/// burada yalnız dönem hesabı ve özet kuralları var, veritabanına gitmeden test edilir.
/// </summary>
public interface IRaporSorgusu
{
    /// <summary>İşlem tipine göre adet ve toplam. Hesap veya müşteri yoksa null.</summary>
    Task<AylikOzet?> AylikOzetAsync(RaporKapsami kapsam, int id, int yil, int ay, CancellationToken ct = default);

    /// <summary>Dönem başı bakiye ve dönemdeki her işlemden sonraki bakiye. Hesap yoksa null.</summary>
    Task<BakiyeDegisimi?> BakiyeDegisimiAsync(int hesapId, DateTime bas, DateTime bit, CancellationToken ct = default);

    /// <summary>İşlem adedine göre ilk N müşteri ya da hesap. <paramref name="bas"/> null ise tüm kayıtlar.</summary>
    Task<IReadOnlyList<EnAktifSatir>> EnAktifAsync(EnAktifTuru tur, DateTime? bas, int adet, CancellationToken ct = default);
}

public enum RaporKapsami { Hesap, Musteri }

/// <summary>GET sorgu dizesi: ?kapsam=musteri&amp;id=42&amp;yil=2026&amp;ay=9</summary>
public sealed class AylikOzetFiltre
{
    public RaporKapsami Kapsam { get; set; } = RaporKapsami.Hesap;
    public int? Id { get; set; }
    public int? Yil { get; set; }
    public int? Ay { get; set; }
}

public sealed record AylikOzetSatiri(IslemTipi Tip, int Adet, decimal Toplam)
{
    /// <summary>Bakiyeye etkisiyle: giriş tipleri +, çıkış tipleri − (TRG_ISLEM_BAKIYE_GUNCELLE ile aynı kural).</summary>
    public decimal IsaretliToplam => Tip.BakiyeEtkisi() * Toplam;
}

public sealed class AylikOzet
{
    public RaporKapsami Kapsam { get; init; }
    public int Id { get; init; }
    public int MusteriId { get; init; }
    public string MusteriAd { get; init; } = string.Empty;

    /// <summary>Hesap kapsamında hesap no; müşteri kapsamında null.</summary>
    public string? HesapNo { get; init; }

    /// <summary>Müşteri kapsamında müşterinin hesap sayısı.</summary>
    public int HesapSayisi { get; init; }

    public int Yil { get; init; }
    public int Ay { get; init; }

    /// <summary>İşlem tipi sırasıyla (yatırma, çekme, transferler, hisse); tipi olmayan satır yok.</summary>
    public required IReadOnlyList<AylikOzetSatiri> Satirlar { get; init; }

    public string Paket => Kapsam == RaporKapsami.Musteri ? "PKG_RAPOR.AYLIK_OZET_MUSTERI" : "PKG_RAPOR.AYLIK_OZET_HESAP";
    public string Baslik => HesapNo is null ? MusteriAd : $"{MusteriAd}, {HesapNo}";
    public string AyAdi => RaporDonemleri.AyAdi(Yil, Ay);
    public int ToplamAdet => Satirlar.Sum(s => s.Adet);
    public decimal NetEtki => AylikOzetHesabi.NetEtki(Satirlar);
}

public static class AylikOzetHesabi
{
    /// <summary>Ayın bakiyeye net etkisi: giriş tiplerinin toplamı − çıkış tiplerinin toplamı.</summary>
    public static decimal NetEtki(IEnumerable<AylikOzetSatiri> satirlar) => satirlar.Sum(s => s.IsaretliToplam);
}

public enum BakiyeDonemi { Son30, Son90, Son180, Ozel }

/// <summary>GET sorgu dizesi: ?id=5012&amp;on=son90 veya ?id=5012&amp;bas=2026-06-01&amp;bit=2026-09-11</summary>
public sealed class BakiyeDegisimiFiltre
{
    public int? Id { get; set; }
    public BakiyeDonemi? On { get; set; }
    public DateTime? Bas { get; set; }
    public DateTime? Bit { get; set; }
}

public sealed class BakiyeDegisimi
{
    public int HesapId { get; init; }
    public string HesapNo { get; init; } = string.Empty;
    public HesapTipi HesapTipi { get; init; }
    public int MusteriId { get; init; }
    public string MusteriAd { get; init; } = string.Empty;
    public DateTime Bas { get; init; }
    public DateTime Bit { get; init; }

    /// <summary>Dönemin hareketleri, eskiden yeniye; BakiyeSonra paketin SUM() OVER ile hesapladığı yürüyen bakiyedir.</summary>
    public required IReadOnlyList<IslemSatiri> Hareketler { get; init; }

    public required BakiyeDegisimOzeti Ozet { get; init; }

    /// <summary>
    /// Basamaklı grafik noktaları: dönem başı, her işlemden sonraki bakiye ve dönem sonu (bugünse şu an).
    /// Bakiye yalnız işlem anında değişir; iki nokta arasında sabittir.
    /// </summary>
    public IReadOnlyList<BakiyeNoktasi> GrafikNoktalari(DateTime simdi)
    {
        var son = Bit.Date.AddDays(1) < simdi ? Bit.Date.AddDays(1) : simdi;
        var noktalar = new List<BakiyeNoktasi>(Hareketler.Count + 2) { new(Bas.Date, Ozet.Acilis) };
        noktalar.AddRange(Hareketler.Select(h => new BakiyeNoktasi(h.Tarih, h.BakiyeSonra ?? 0)));
        noktalar.Add(new BakiyeNoktasi(son < noktalar[^1].Zaman ? noktalar[^1].Zaman : son, Ozet.Kapanis));
        return noktalar;
    }
}

public sealed record BakiyeUcu(decimal Bakiye, DateTime Zaman);

/// <summary>Dönem başı + net değişim = dönem sonu. En yüksek ve en düşük bakiye dönem başı dahil hesaplanır.</summary>
public sealed record BakiyeDegisimOzeti(decimal Acilis, decimal Kapanis, int IslemAdedi, BakiyeUcu EnYuksek, BakiyeUcu EnDusuk)
{
    public decimal NetDegisim => Kapanis - Acilis;

    /// <summary>
    /// Yürüyen bakiye burada, tetikleyiciyle aynı işaret kuralıyla yeniden hesaplanır; paketin döndürdüğü BAKIYE
    /// kolonu tabloda gösterilir. İkisinin aynı çıkması raporun tutarlılık kontrolüdür.
    /// </summary>
    public static BakiyeDegisimOzeti Hesapla(decimal acilis, DateTime bas, IEnumerable<IslemSatiri> hareketler)
    {
        var bakiye = acilis;
        var enYuksek = new BakiyeUcu(acilis, bas);
        var enDusuk = enYuksek;
        var adet = 0;
        foreach (var h in hareketler)
        {
            bakiye += h.IsaretliTutar;
            adet++;
            if (bakiye > enYuksek.Bakiye) enYuksek = new BakiyeUcu(bakiye, h.Tarih);
            if (bakiye < enDusuk.Bakiye) enDusuk = new BakiyeUcu(bakiye, h.Tarih);
        }
        return new BakiyeDegisimOzeti(acilis, bakiye, adet, enYuksek, enDusuk);
    }
}

public enum EnAktifTuru { Musteri, Hesap }

public enum EnAktifDonemi { Son30Gun, BuYil, Tumu }

/// <summary>GET sorgu dizesi: ?tur=hesap&amp;n=20&amp;donem=buyil</summary>
public sealed class EnAktifFiltre
{
    public static readonly int[] Adetler = [5, 10, 20];

    public EnAktifTuru Tur { get; set; } = EnAktifTuru.Musteri;
    public int N { get; set; } = 10;
    public EnAktifDonemi Donem { get; set; } = EnAktifDonemi.Son30Gun;

    /// <summary>Listede olmayan adet varsayılana (10) döner; sorguya keyfi büyüklük gitmez.</summary>
    public int Adet => Adetler.Contains(N) ? N : 10;
}

public sealed class EnAktifSatir
{
    public int Sira { get; init; }

    /// <summary>Müşteri raporunda MUSTERI_ID, hesap raporunda HESAP_ID.</summary>
    public int Id { get; init; }

    /// <summary>Müşteri raporunda ad soyad, hesap raporunda hesap no.</summary>
    public string Ad { get; init; } = string.Empty;

    public int MusteriId { get; init; }
    public string MusteriAd { get; init; } = string.Empty;
    public string MusteriNo { get; init; } = string.Empty;
    public MusteriTipi MusteriTipi { get; init; }
    public int IslemAdedi { get; init; }
    public decimal Hacim { get; init; }
    public DateTime SonIslem { get; init; }
}

public static class RaporDonemleri
{
    /// <summary>Raporda seçilebilen en eski yıl, bugünden geriye.</summary>
    public const int GeriyeYil = 2;

    /// <summary>Eksik yıl ve ay bugünle tamamlanır; ay 1-12 aralığına, yıl seçilebilen aralığa çekilir.</summary>
    public static (int Yil, int Ay) Ay(int? yil, int? ay, DateTime bugun)
    {
        var y = Math.Clamp(yil ?? bugun.Year, bugun.Year - GeriyeYil, bugun.Year);
        var a = Math.Clamp(ay ?? bugun.Month, 1, 12);
        return (y, a);
    }

    public static string AyAdi(int yil, int ay) => new DateTime(yil, ay, 1).ToString("MMMM yyyy", TurkceBicim.Kultur);

    /// <summary>
    /// Bakiye değişimi dönemi (bitiş günü dahil). Hazır dönemler bugünle biter; özel dönemde eksik uç son 90 gün
    /// ve bugünle tamamlanır, ters tarihler yer değiştirir. Tarih verilip ön ayar verilmediyse dönem özeldir.
    /// </summary>
    public static (BakiyeDonemi Donem, DateTime Bas, DateTime Bit) Bakiye(BakiyeDegisimiFiltre filtre, DateTime bugun)
    {
        bugun = bugun.Date;
        var donem = filtre.On ?? (filtre.Bas is not null || filtre.Bit is not null ? BakiyeDonemi.Ozel : BakiyeDonemi.Son90);
        var (bas, bit) = donem switch
        {
            BakiyeDonemi.Son30 => (bugun.AddDays(-29), bugun),
            BakiyeDonemi.Son180 => (bugun.AddDays(-179), bugun),
            BakiyeDonemi.Ozel => ((filtre.Bas ?? bugun.AddDays(-89)).Date, (filtre.Bit ?? bugun).Date),
            _ => (bugun.AddDays(-89), bugun)
        };
        if (bas > bit) (bas, bit) = (bit, bas);
        return (donem, bas, bit);
    }

    /// <summary>En aktif raporunun başlangıcı; tüm kayıtlarda null (tarih süzgeci yok).</summary>
    public static DateTime? EnAktifBaslangic(EnAktifDonemi donem, DateTime bugun) => donem switch
    {
        EnAktifDonemi.BuYil => new DateTime(bugun.Year, 1, 1),
        EnAktifDonemi.Tumu => null,
        _ => bugun.Date.AddDays(-29)
    };
}
