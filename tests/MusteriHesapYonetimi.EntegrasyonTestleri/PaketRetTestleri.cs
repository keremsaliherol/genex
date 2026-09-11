using Dapper;
using MusteriHesapYonetimi.Application.Islemler;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Data;
using MusteriHesapYonetimi.Data.Islemler;

namespace MusteriHesapYonetimi.EntegrasyonTestleri;

/// <summary>
/// Para hareketi kuralları yalnız PKG_ISLEM'de. Uygulama bu işlemleri pakete gönderir (ön kontrol yalnız biçim); paket
/// RAISE_APPLICATION_ERROR ile reddeder, servis ROLLBACK yapar ve kodu doğru form alanına eşler. Her testte hesapların
/// bakiyesi ve işlem sayısı değişmemelidir: reddedilen işlem yarım kayıt bırakmaz.
/// </summary>
public class PaketRetTestleri
{
    [OracleFact]
    public async Task Yetersiz_bakiye_ORA_20001_tutar_alanina_eslenir_kayit_yazilmaz()
    {
        var once = await TestOrtami.HesapDurumuAsync(TestOrtami.GoksuHesabi);

        var sonuc = await YapAsync(new IslemKaydi
        {
            HesapId = TestOrtami.GoksuHesabi,
            Tur = IslemTuru.Cekme,
            Tutar = TurkceBicim.TutarGirdi(once.Bakiye + 1)
        });

        var hata = Assert.Single(sonuc.Hatalar);
        Assert.Equal(("ORA-20001", nameof(IslemKaydi.Tutar)), (hata.Kod, hata.Alan));
        Assert.Contains(TurkceBicim.Para(once.Bakiye), hata.Mesaj);
        Assert.Equal(once, await TestOrtami.HesapDurumuAsync(TestOrtami.GoksuHesabi));
    }

    [OracleFact]
    public async Task Ayni_hesaba_transfer_ORA_20012_hedef_alanina_eslenir()
    {
        var once = await TestOrtami.HesapDurumuAsync(TestOrtami.GoksuHesabi);

        var sonuc = await YapAsync(new IslemKaydi
        {
            HesapId = TestOrtami.GoksuHesabi,
            HedefHesapId = TestOrtami.GoksuHesabi,
            Tur = IslemTuru.Transfer,
            Tutar = "1,00"
        });

        var hata = Assert.Single(sonuc.Hatalar);
        Assert.Equal(("ORA-20012", nameof(IslemKaydi.HedefHesapId)), (hata.Kod, hata.Alan));
        Assert.Equal(once, await TestOrtami.HesapDurumuAsync(TestOrtami.GoksuHesabi));
    }

    [OracleFact]
    public async Task Pasif_hesaba_transfer_ORA_20002_iki_hesapta_da_kayit_yazmaz()
    {
        var pasif = await TestOrtami.DegerAsync<int>("SELECT MIN(HESAP_ID) FROM HESAP WHERE AKTIF = 0");
        var kaynakOnce = await TestOrtami.HesapDurumuAsync(TestOrtami.GoksuHesabi);
        var hedefOnce = await TestOrtami.HesapDurumuAsync(pasif);

        var sonuc = await YapAsync(new IslemKaydi
        {
            HesapId = TestOrtami.GoksuHesabi,
            HedefHesapId = pasif,
            Tur = IslemTuru.Transfer,
            Tutar = "1,00"
        });

        var hata = Assert.Single(sonuc.Hatalar);
        Assert.Equal(("ORA-20002", nameof(IslemKaydi.HedefHesapId)), (hata.Kod, hata.Alan));
        Assert.Equal(kaynakOnce, await TestOrtami.HesapDurumuAsync(TestOrtami.GoksuHesabi));
        Assert.Equal(hedefOnce, await TestOrtami.HesapDurumuAsync(pasif));
    }

    [OracleFact]
    public async Task Vadesiz_hesapta_hisse_alimi_ORA_20006_islem_tipi_alanina_eslenir()
    {
        var vadesiz = await TestOrtami.DegerAsync<int>("""
            SELECT MIN(h.HESAP_ID) FROM HESAP h JOIN MUSTERI m ON m.MUSTERI_ID = h.MUSTERI_ID
             WHERE h.HESAP_TIPI = 'VADESIZ' AND h.AKTIF = 1 AND m.AKTIF = 1
            """);
        var hisse = await TestOrtami.DegerAsync<string>("SELECT MIN(HISSE_KODU) FROM HISSE");
        var once = await TestOrtami.HesapDurumuAsync(vadesiz);

        var sonuc = await YapAsync(new IslemKaydi { HesapId = vadesiz, Tur = IslemTuru.Alim, HisseKodu = hisse, Adet = 1 });

        var hata = Assert.Single(sonuc.Hatalar);
        Assert.Equal(("ORA-20006", nameof(IslemKaydi.Tur)), (hata.Kod, hata.Alan));
        Assert.Equal(once, await TestOrtami.HesapDurumuAsync(vadesiz));
    }

    [OracleFact]
    public async Task Pozisyondan_fazla_satis_ORA_20003_adet_alanina_eslenir()
    {
        Pozisyon pozisyon;
        await using (var baglanti = await TestOrtami.Fabrika().AcAsync())
        {
            pozisyon = await baglanti.QuerySingleAsync<Pozisyon>("""
                SELECT p.HESAP_ID AS HesapId, p.HISSE_KODU AS HisseKodu, p.NET_ADET AS NetAdet
                  FROM VW_PORTFOY p
                  JOIN HESAP h ON h.HESAP_ID = p.HESAP_ID
                  JOIN MUSTERI m ON m.MUSTERI_ID = h.MUSTERI_ID
                 WHERE p.NET_ADET > 0 AND h.AKTIF = 1 AND m.AKTIF = 1
                 ORDER BY p.HESAP_ID, p.HISSE_KODU
                 FETCH FIRST 1 ROWS ONLY
                """);
        }
        var once = await TestOrtami.HesapDurumuAsync(pozisyon.HesapId);

        var sonuc = await YapAsync(new IslemKaydi
        {
            HesapId = pozisyon.HesapId,
            Tur = IslemTuru.Satim,
            HisseKodu = pozisyon.HisseKodu,
            Adet = pozisyon.NetAdet + 1
        });

        var hata = Assert.Single(sonuc.Hatalar);
        Assert.Equal(("ORA-20003", nameof(IslemKaydi.Adet)), (hata.Kod, hata.Alan));
        Assert.Equal(once, await TestOrtami.HesapDurumuAsync(pozisyon.HesapId));
    }

    private static async Task<Sonuc<IslemSonucu>> YapAsync(IslemKaydi kayit)
    {
        await using var db = TestOrtami.Veritabani();
        return await new IslemServisi(TestOrtami.Fabrika(), db).YapAsync(kayit);
    }

    private sealed class Pozisyon
    {
        public int HesapId { get; set; }
        public string HisseKodu { get; set; } = string.Empty;
        public long NetAdet { get; set; }
    }
}
