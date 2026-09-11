using Dapper;
using Microsoft.EntityFrameworkCore;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Application.Raporlar;
using MusteriHesapYonetimi.Data.Izleme;
using MusteriHesapYonetimi.Domain;
using Oracle.ManagedDataAccess.Client;

namespace MusteriHesapYonetimi.Data.Raporlar;

/// <summary>
/// PKG_RAPOR çağrıları Dapper ile. SYS_REFCURSOR çıktısı (OracleParametreleri.RefCursor) ODP.NET'te komutun sonuç
/// kümesi olarak döner; Dapper onu sıradan bir SELECT gibi okur. Başlık bilgileri (hesap no, müşteri adı) EF Core'dan.
/// </summary>
public sealed class RaporSorgusu(OracleBaglantiFabrikasi fabrika, HesapMasasiDbContext db) : IRaporSorgusu
{
    private const string AylikOzetHesapSql =
        "BEGIN PKG_RAPOR.AYLIK_OZET_HESAP(p_hesap_id => :id, p_yil => :yil, p_ay => :ay, p_sonuc => :sonuc); END;";
    private const string AylikOzetMusteriSql =
        "BEGIN PKG_RAPOR.AYLIK_OZET_MUSTERI(p_musteri_id => :id, p_yil => :yil, p_ay => :ay, p_sonuc => :sonuc); END;";
    private const string BakiyeDegisimiSql =
        "BEGIN PKG_RAPOR.BAKIYE_DEGISIMI(p_hesap_id => :hesap_id, p_bas => :bas, p_bit => :bit, p_acilis => :acilis, p_sonuc => :sonuc); END;";
    private const string EnAktifSql =
        "BEGIN PKG_RAPOR.EN_AKTIF(p_tur => :tur, p_bas => :bas, p_adet => :adet, p_sonuc => :sonuc); END;";

    // Tüm kayıtlar seçilince tarih süzgeci yoktur: şartnamedeki view'lar okunur. Kolonlar paketin REF CURSOR'uyla
    // aynı adlara çevrilir; sıralama view'da değil burada (view içindeki ORDER BY okuyan sorgu için garanti edilmez).
    private const string EnAktifMusteriViewSql = """
        SELECT MUSTERI_ID AS ID, AD_SOYAD AS AD, TOPLAM_ISLEM, HACIM, SON_ISLEM
          FROM VW_EN_AKTIF_MUSTERILER
         ORDER BY TOPLAM_ISLEM DESC, HACIM DESC
         FETCH FIRST :adet ROWS ONLY
        """;
    private const string EnAktifHesapViewSql = """
        SELECT HESAP_ID AS ID, HESAP_NO AS AD, TOPLAM_ISLEM, HACIM, SON_ISLEM
          FROM VW_EN_AKTIF_HESAPLAR
         ORDER BY TOPLAM_ISLEM DESC, HACIM DESC
         FETCH FIRST :adet ROWS ONLY
        """;

    public async Task<AylikOzet?> AylikOzetAsync(RaporKapsami kapsam, int id, int yil, int ay, CancellationToken ct = default)
    {
        var musteriKapsami = kapsam == RaporKapsami.Musteri;
        var baslik = musteriKapsami
            ? await db.Musteriler.AsNoTracking()
                .TagWith("Rapor: müşteri ve hesap sayısı")
                .Where(m => m.MusteriId == id)
                .Select(m => new { m.MusteriId, MusteriAd = m.AdSoyad, HesapNo = (string?)null, HesapSayisi = m.Hesaplar.Count })
                .FirstOrDefaultAsync(ct)
            : await db.Hesaplar.AsNoTracking()
                .TagWith("Rapor: hesap ve sahibi")
                .Where(h => h.HesapId == id)
                .Select(h => new { h.MusteriId, MusteriAd = h.Musteri!.AdSoyad, HesapNo = (string?)h.HesapNo, HesapSayisi = 1 })
                .FirstOrDefaultAsync(ct);
        if (baslik is null) return null;

        await using var baglanti = await fabrika.AcAsync(ct);
        var satirlar = await baglanti.QueryIzliAsync<OzetSatiri>(
            musteriKapsami ? "PKG_RAPOR.AYLIK_OZET_MUSTERI, REF CURSOR" : "PKG_RAPOR.AYLIK_OZET_HESAP, REF CURSOR",
            new CommandDefinition(musteriKapsami ? AylikOzetMusteriSql : AylikOzetHesapSql,
                new OracleParametreleri().Girdi("id", id).Girdi("yil", yil).Girdi("ay", ay).RefCursor("sonuc"),
                cancellationToken: ct),
            "SYS_REFCURSOR, Dapper'da sonuç kümesi olarak okundu. Paket ayı aralık koşuluyla süzer (ISLEM_TARIHI >= ay başı " +
            "AND < ADD_MONTHS(ay başı, 1)); şartnamedeki EXTRACT(YEAR/MONTH FROM ISLEM_TARIHI) kolonu fonksiyona soktuğu için tarih indeksini kullanamazdı.");

        return new AylikOzet
        {
            Kapsam = kapsam,
            Id = id,
            MusteriId = baslik.MusteriId,
            MusteriAd = baslik.MusteriAd,
            HesapNo = baslik.HesapNo,
            HesapSayisi = baslik.HesapSayisi,
            Yil = yil,
            Ay = ay,
            // Paket ISLEM_TIPI koduna göre (alfabetik) sıralar; ekranda işlem tipi sırası kullanılır
            Satirlar = satirlar
                .Select(s => new AylikOzetSatiri(VeritabaniKodu.Oku<IslemTipi>(s.ISLEM_TIPI), s.ISLEM_ADEDI, s.TOPLAM_TUTAR))
                .OrderBy(s => s.Tip)
                .ToList()
        };
    }

    public async Task<BakiyeDegisimi?> BakiyeDegisimiAsync(int hesapId, DateTime bas, DateTime bit, CancellationToken ct = default)
    {
        var hesap = await db.Hesaplar.AsNoTracking()
            .TagWith("Rapor: hesap ve sahibi")
            .Where(h => h.HesapId == hesapId)
            .Select(h => new { h.HesapNo, h.HesapTipi, h.MusteriId, MusteriAd = h.Musteri!.AdSoyad })
            .FirstOrDefaultAsync(ct);
        if (hesap is null) return null;

        var parametreler = new OracleParametreleri()
            .Girdi("hesap_id", hesapId)
            .Girdi("bas", bas.Date, OracleDbType.Date)
            .Girdi("bit", bit.Date, OracleDbType.Date)
            .Cikti("acilis", OracleDbType.Decimal)
            .RefCursor("sonuc");
        await using var baglanti = await fabrika.AcAsync(ct);
        var satirlar = await baglanti.QueryIzliAsync<BakiyeSatiri>("PKG_RAPOR.BAKIYE_DEGISIMI, REF CURSOR",
            new CommandDefinition(BakiyeDegisimiSql, parametreler, cancellationToken: ct),
            "p_acilis OUT parametresi dönem başı bakiyedir. Her satırın BAKIYE'si paket içinde " +
            "p_acilis + SUM(...) OVER (ORDER BY ISLEM_TARIHI, ISLEM_ID) ile hesaplanır.");
        var acilis = parametreler.Oku<decimal>("acilis");

        var hareketler = satirlar.Select(s => new IslemSatiri
        {
            Id = s.ISLEM_ID,
            Tarih = s.ISLEM_TARIHI,
            HesapId = hesapId,
            HesapNo = hesap.HesapNo,
            Tip = VeritabaniKodu.Oku<IslemTipi>(s.ISLEM_TIPI),
            Tutar = s.TUTAR,
            Aciklama = s.ACIKLAMA,
            KarsiHesapId = s.KARSI_HESAP_ID,
            BakiyeSonra = s.BAKIYE
        }).ToList();

        return new BakiyeDegisimi
        {
            HesapId = hesapId,
            HesapNo = hesap.HesapNo,
            HesapTipi = hesap.HesapTipi,
            MusteriId = hesap.MusteriId,
            MusteriAd = hesap.MusteriAd,
            Bas = bas.Date,
            Bit = bit.Date,
            Hareketler = hareketler,
            Ozet = BakiyeDegisimOzeti.Hesapla(acilis, bas.Date, hareketler)
        };
    }

    public async Task<IReadOnlyList<EnAktifSatir>> EnAktifAsync(EnAktifTuru tur, DateTime? bas, int adet, CancellationToken ct = default)
    {
        var hesapRaporu = tur == EnAktifTuru.Hesap;
        List<EnAktifHam> ham;
        await using (var baglanti = await fabrika.AcAsync(ct))
        {
            ham = bas is { } baslangic
                ? await baglanti.QueryIzliAsync<EnAktifHam>("PKG_RAPOR.EN_AKTIF, REF CURSOR",
                    new CommandDefinition(EnAktifSql,
                        new OracleParametreleri()
                            .Girdi("tur", hesapRaporu ? "HESAP" : "MUSTERI")
                            .Girdi("bas", baslangic.Date, OracleDbType.Date)
                            .Girdi("adet", adet)
                            .RefCursor("sonuc"),
                        cancellationToken: ct),
                    "Dönem süzgeci (ISLEM_TARIHI >= p_bas), sıralama ve FETCH FIRST p_adet ROWS ONLY paket sorgusunda.")
                : await baglanti.QueryIzliAsync<EnAktifHam>(hesapRaporu ? "VW_EN_AKTIF_HESAPLAR" : "VW_EN_AKTIF_MUSTERILER",
                    new CommandDefinition(hesapRaporu ? EnAktifHesapViewSql : EnAktifMusteriViewSql,
                        new OracleParametreleri().Girdi("adet", adet), cancellationToken: ct),
                    "Tüm kayıtlar: şartnamedeki view okunur. Sıralama view'da değil sorguda; view içindeki ORDER BY okuyan sorgu için garanti edilmez.");
        }
        if (ham.Count == 0) return [];

        var idler = ham.Select(h => h.ID).ToList();
        if (hesapRaporu)
        {
            var sahipler = (await db.Hesaplar.AsNoTracking()
                    .TagWith("Rapor: hesapların sahipleri")
                    .Where(h => idler.Contains(h.HesapId))
                    .Select(h => new { h.HesapId, h.MusteriId, h.Musteri!.AdSoyad, h.Musteri.MusteriNo, h.Musteri.MusteriTipi })
                    .ToListAsync(ct))
                .ToDictionary(s => s.HesapId);
            return ham.Select((h, i) =>
            {
                var s = sahipler[h.ID];
                return Satir(i, h, s.MusteriId, s.AdSoyad, s.MusteriNo, s.MusteriTipi);
            }).ToList();
        }

        var musteriler = (await db.Musteriler.AsNoTracking()
                .TagWith("Rapor: müşteri no ve tipi")
                .Where(m => idler.Contains(m.MusteriId))
                .Select(m => new { m.MusteriId, m.MusteriNo, m.MusteriTipi })
                .ToListAsync(ct))
            .ToDictionary(m => m.MusteriId);
        return ham.Select((h, i) =>
        {
            var m = musteriler[h.ID];
            return Satir(i, h, h.ID, h.AD, m.MusteriNo, m.MusteriTipi);
        }).ToList();
    }

    private static EnAktifSatir Satir(int sira, EnAktifHam h, int musteriId, string musteriAd, string musteriNo, MusteriTipi musteriTipi) => new()
    {
        Sira = sira + 1,
        Id = h.ID,
        Ad = h.AD,
        MusteriId = musteriId,
        MusteriAd = musteriAd,
        MusteriNo = musteriNo,
        MusteriTipi = musteriTipi,
        IslemAdedi = h.TOPLAM_ISLEM,
        Hacim = h.HACIM,
        SonIslem = h.SON_ISLEM
    };

    // Özellik adları REF CURSOR kolon adlarıyla aynı: paket sorgusunun kolonları burada yeniden adlandırılamaz,
    // Dapper kolonu özelliğe adıyla eşler.
    private sealed class OzetSatiri
    {
        public string ISLEM_TIPI { get; set; } = string.Empty;
        public int ISLEM_ADEDI { get; set; }
        public decimal TOPLAM_TUTAR { get; set; }
    }

    private sealed class BakiyeSatiri
    {
        public int ISLEM_ID { get; set; }
        public DateTime ISLEM_TARIHI { get; set; }
        public string ISLEM_TIPI { get; set; } = string.Empty;
        public decimal TUTAR { get; set; }
        public string? ACIKLAMA { get; set; }
        public int? KARSI_HESAP_ID { get; set; }
        public decimal BAKIYE { get; set; }
    }

    private sealed class EnAktifHam
    {
        public int ID { get; set; }
        public string AD { get; set; } = string.Empty;
        public int TOPLAM_ISLEM { get; set; }
        public decimal HACIM { get; set; }
        public DateTime SON_ISLEM { get; set; }
    }
}
