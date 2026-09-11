using System.ComponentModel.DataAnnotations;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Application.Islemler;

/// <summary>
/// Para hareketleri. Her işlem PKG_ISLEM'den geçer; bakiye, pasif hesap, pozisyon ve aynı hesaba transfer
/// kuralları pakette çalışır. Bakiyeyi TRG_ISLEM_BAKIYE_GUNCELLE günceller.
/// </summary>
public interface IIslemServisi
{
    Task<Sonuc<IslemSonucu>> YapAsync(IslemKaydi kayit, CancellationToken ct = default);

    /// <summary>İşlem formundaki hesap bilgisi (bakiye, durum, portföy); yoksa null.</summary>
    Task<IslemHesabi?> HesapAsync(int hesapId, CancellationToken ct = default);

    Task<IReadOnlyList<HisseFiyati>> HisselerAsync(CancellationToken ct = default);
    Task<Dekont?> DekontAsync(int islemId, CancellationToken ct = default);
}

/// <summary>Formdaki işlem türü. Transfer veritabanında iki kayıttır: TRANSFER_GIDEN ve TRANSFER_GELEN.</summary>
public enum IslemTuru { Yatirma, Cekme, Transfer, Alim, Satim }

/// <summary>İşlem formu. Türle ilgisiz alanlar (ör. yatırmada hisse) yok sayılır.</summary>
public sealed class IslemKaydi
{
    public int? HesapId { get; set; }
    public IslemTuru Tur { get; set; } = IslemTuru.Yatirma;
    public int? HedefHesapId { get; set; }

    /// <summary>Metin olarak alınır (bkz. TutarMetni).</summary>
    [StringLength(30, ErrorMessage = "Tutar en fazla 30 karakter olabilir.")]
    public string? Tutar { get; set; }

    [StringLength(10, ErrorMessage = "Geçersiz hisse kodu.")]
    public string? HisseKodu { get; set; }

    public long? Adet { get; set; }

    [StringLength(300, ErrorMessage = "Açıklama en fazla 300 karakter olabilir.")]
    public string? Aciklama { get; set; }
}

/// <summary>Oluşan işlemin numarası; transferde giden kaydın numarası ve iki kaydı bağlayan referans.</summary>
public sealed record IslemSonucu(int IslemId, string? ReferansNo);

/// <summary>İşlem formunun hesap bilgisi: seçici, önizleme ve istemci doğrulaması bununla çalışır.</summary>
public sealed class IslemHesabi
{
    public int Id { get; init; }
    public string HesapNo { get; init; } = string.Empty;
    public int MusteriId { get; init; }
    public string MusteriAd { get; init; } = string.Empty;
    public HesapTipi Tip { get; init; }
    public decimal Bakiye { get; init; }
    public bool Aktif { get; init; }
    public bool MusteriAktif { get; init; }
    public IReadOnlyList<Pozisyon> Portfoy { get; init; } = [];

    public bool IslemYapilabilir => Aktif && MusteriAktif;
}

public sealed record Pozisyon(string HisseKodu, long Adet);

public sealed record HisseFiyati(string Kod, string Ad, decimal Fiyat);

/// <summary>İşlem dekontu; transferde aynı referanslı iki kayıt da listelenir.</summary>
public sealed class Dekont
{
    public int Id { get; init; }
    public DateTime Tarih { get; init; }
    public IslemTipi Tip { get; init; }
    public decimal Tutar { get; init; }
    public string? Aciklama { get; init; }
    public string? ReferansNo { get; init; }
    public string? HisseKodu { get; init; }
    public long? Adet { get; init; }
    public decimal? BirimFiyat { get; init; }
    public int HesapId { get; init; }
    public string HesapNo { get; init; } = string.Empty;
    public bool IslemYapilabilir { get; init; }
    public int MusteriId { get; init; }
    public string MusteriAd { get; init; } = string.Empty;
    public string MusteriNo { get; init; } = string.Empty;
    public int? KarsiHesapId { get; init; }
    public string? KarsiHesapNo { get; init; }
    public string? KarsiMusteriAd { get; init; }

    /// <summary>Bu işlemden hemen sonraki bakiye.</summary>
    public decimal BakiyeSonra { get; set; }

    public IReadOnlyList<IslemSatiri> Kayitlar { get; set; } = [];
}
