namespace MusteriHesapYonetimi.Domain;

/// <summary>MUSTERI tablosu. Silinmez; Aktif = false soft delete'tir.</summary>
public class Musteri
{
    public int MusteriId { get; set; }
    public string MusteriNo { get; set; } = string.Empty;
    public string AdSoyad { get; set; } = string.Empty;
    public string? Eposta { get; set; }
    public string? Telefon { get; set; }
    public MusteriTipi MusteriTipi { get; set; } = MusteriTipi.Bireysel;
    public DateTime KayitTarihi { get; set; }
    public bool Aktif { get; set; } = true;

    public List<Hesap> Hesaplar { get; set; } = [];
}

/// <summary>HESAP tablosu. Bakiye yalnız TRG_ISLEM_BAKIYE_GUNCELLE ile değişir; uygulama okur, yazmaz.</summary>
public class Hesap
{
    public int HesapId { get; set; }
    public int MusteriId { get; set; }
    public string HesapNo { get; set; } = string.Empty;
    public int EkNo { get; set; }
    public HesapTipi HesapTipi { get; set; } = HesapTipi.Vadesiz;
    public decimal Bakiye { get; set; }
    public DateTime AcilisTarihi { get; set; }
    public bool Aktif { get; set; } = true;

    public Musteri? Musteri { get; set; }
    public List<Islem> Islemler { get; set; } = [];
}

/// <summary>ISLEM tablosu. Kayıtlar değiştirilemez (TRG_ISLEM_DEGISMEZ); yazma PKG_ISLEM üzerinden yapılır.</summary>
public class Islem
{
    public int IslemId { get; set; }
    public int HesapId { get; set; }
    public IslemTipi IslemTipi { get; set; }
    public decimal Tutar { get; set; }
    public DateTime IslemTarihi { get; set; }
    public string? Aciklama { get; set; }
    public int? KarsiHesapId { get; set; }
    public string? ReferansNo { get; set; }
    public string? HisseKodu { get; set; }
    public long? Adet { get; set; }
    public decimal? BirimFiyat { get; set; }

    public Hesap? Hesap { get; set; }
    public Hesap? KarsiHesap { get; set; }

    /// <summary>Bakiyeye işaretli etkisi: girişte +Tutar, çıkışta -Tutar.</summary>
    public decimal IsaretliTutar => IslemTipi.BakiyeEtkisi() * Tutar;
}

/// <summary>HISSE tablosu. Fiyatlar temsilidir, gerçek piyasa verisi değildir.</summary>
public class Hisse
{
    public string HisseKodu { get; set; } = string.Empty;
    public string Ad { get; set; } = string.Empty;
    public decimal TemsiliFiyat { get; set; }
    public DateTime GuncellemeTarihi { get; set; }
}
