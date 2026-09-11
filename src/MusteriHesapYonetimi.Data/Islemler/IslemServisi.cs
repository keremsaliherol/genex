using System.Data.Common;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MusteriHesapYonetimi.Application.Islemler;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Data.Izleme;
using MusteriHesapYonetimi.Domain;
using Oracle.ManagedDataAccess.Client;

namespace MusteriHesapYonetimi.Data.Islemler;

/// <summary>
/// Para hareketleri Dapper ile PKG_ISLEM'e gider. Paketler COMMIT etmez; transaction burada açılır ve kapanır,
/// paket hata verirse ROLLBACK: transferin iki kaydı birlikte yazılır ya da hiçbiri yazılmaz.
/// Okumalar (form bilgisi, dekont) EF Core ile.
/// </summary>
public sealed class IslemServisi(OracleBaglantiFabrikasi fabrika, HesapMasasiDbContext db) : IIslemServisi
{
    // Oracle izinde gösterilen trigger gövdesinin özeti (istemci trigger'ın UPDATE'ini göremez)
    private const string TriggerOzeti = """
        -- ISLEM'e eklenen her satır için çalışır (gövde özeti)
        UPDATE HESAP
           SET BAKIYE = BAKIYE + CASE WHEN :NEW.ISLEM_TIPI IN ('YATIRMA', 'TRANSFER_GELEN', 'SATIM')
                                      THEN :NEW.TUTAR ELSE -:NEW.TUTAR END
         WHERE HESAP_ID = :NEW.HESAP_ID
        """;

    public async Task<Sonuc<IslemSonucu>> YapAsync(IslemKaydi kayit, CancellationToken ct = default)
    {
        var hatalar = IslemKurallari.Dogrula(kayit, out var tutar);
        if (hatalar.Count > 0) return Sonuc<IslemSonucu>.Hata(hatalar);

        var (sql, parametreler) = PaketCagrisi(kayit, tutar);
        int[] hesaplar = kayit.Tur == IslemTuru.Transfer ? [kayit.HesapId!.Value, kayit.HedefHesapId!.Value] : [kayit.HesapId!.Value];

        await using var baglanti = await fabrika.AcAsync(ct);
        await using var tx = await baglanti.BeginTransactionAsync(ct);

        // İz açıksa trigger'ın etkisini göstermek için bakiye çağrıdan önce ve sonra okunur
        var iz = OracleIzBaglami.Gecerli;
        var once = iz is null ? null : await BakiyelerAsync(baglanti, tx, hesaplar, "Bakiye, işlem öncesi", ct);
        try
        {
            await baglanti.ExecuteIzliAsync(PaketAdi(kayit.Tur), new CommandDefinition(sql, parametreler, tx, cancellationToken: ct));
            if (iz is not null && once is not null)
                TriggerIzi(iz, once, await BakiyelerAsync(baglanti, tx, hesaplar, "Bakiye, işlem sonrası", ct));
            await tx.CommitAsync(ct);
            iz?.Ekle(new IzGirdisi { Katman = "ODP.NET", Baslik = "COMMIT", Sql = "COMMIT", Not = "Paketler COMMIT etmez; transaction .NET'te (OracleTransaction) açılıp kapanır." });
        }
        catch (OracleException ex) when (OracleHatalari.UygulamaHatasiMi(ex))
        {
            await tx.RollbackAsync(ct);
            iz?.Ekle(new IzGirdisi { Katman = "ODP.NET", Baslik = "ROLLBACK", Sql = "ROLLBACK", Not = "Paket işlemi reddetti; transaction geri alındı, hiçbir kayıt yazılmadı." });
            var mesaj = OracleHatalari.UygulamaMesaji(ex);
            return Sonuc<IslemSonucu>.Hata([new AlanHatasi(PaketHatalari.Alan(ex.Number, mesaj, kayit.Tur), mesaj, PaketHatalari.Kod(ex.Number))]);
        }

        return kayit.Tur == IslemTuru.Transfer
            ? Sonuc<IslemSonucu>.Tamam(new IslemSonucu(parametreler.Oku<int>("giden_islem_id"), parametreler.Oku<string>("referans")))
            : Sonuc<IslemSonucu>.Tamam(new IslemSonucu(parametreler.Oku<int>("islem_id"), null));
    }

    private static string PaketAdi(IslemTuru tur) => tur switch
    {
        IslemTuru.Yatirma => "PKG_ISLEM.YATIR",
        IslemTuru.Cekme => "PKG_ISLEM.CEK",
        IslemTuru.Transfer => "PKG_ISLEM.TRANSFER",
        IslemTuru.Alim => "PKG_ISLEM.HISSE_AL",
        _ => "PKG_ISLEM.HISSE_SAT"
    };

    /// <summary>İsimli bağlama (p_x => :x): parametre sırası paket imzasından bağımsız.</summary>
    private static (string Sql, OracleParametreleri Parametreler) PaketCagrisi(IslemKaydi k, decimal tutar)
    {
        var p = new OracleParametreleri();
        var aciklama = string.IsNullOrWhiteSpace(k.Aciklama) ? null : k.Aciklama.Trim();
        switch (k.Tur)
        {
            case IslemTuru.Transfer:
                p.Girdi("kaynak", k.HesapId).Girdi("hedef", k.HedefHesapId).Girdi("tutar", tutar).Girdi("aciklama", aciklama)
                 .Cikti("referans", OracleDbType.Varchar2, 20).Cikti("giden_islem_id", OracleDbType.Int64);
                return ("BEGIN PKG_ISLEM.TRANSFER(p_kaynak => :kaynak, p_hedef => :hedef, p_tutar => :tutar, "
                      + "p_aciklama => :aciklama, p_referans => :referans, p_giden_islem_id => :giden_islem_id); END;", p);

            case IslemTuru.Alim or IslemTuru.Satim:
                p.Girdi("hesap_id", k.HesapId).Girdi("hisse_kodu", k.HisseKodu).Girdi("adet", k.Adet)
                 .Cikti("islem_id", OracleDbType.Int64);
                return ($"BEGIN PKG_ISLEM.{(k.Tur == IslemTuru.Alim ? "HISSE_AL" : "HISSE_SAT")}(p_hesap_id => :hesap_id, "
                      + "p_hisse_kodu => :hisse_kodu, p_adet => :adet, p_islem_id => :islem_id); END;", p);

            default:
                p.Girdi("hesap_id", k.HesapId).Girdi("tutar", tutar).Girdi("aciklama", aciklama)
                 .Cikti("islem_id", OracleDbType.Int64);
                return ($"BEGIN PKG_ISLEM.{(k.Tur == IslemTuru.Yatirma ? "YATIR" : "CEK")}(p_hesap_id => :hesap_id, "
                      + "p_tutar => :tutar, p_aciklama => :aciklama, p_islem_id => :islem_id); END;", p);
        }
    }

    private static async Task<Dictionary<int, BakiyeSatiri>> BakiyelerAsync(OracleConnection baglanti, DbTransaction tx, int[] hesaplar, string baslik, CancellationToken ct)
    {
        var p = new OracleParametreleri().Girdi("h1", hesaplar[0]).Girdi("h2", hesaplar[^1]);
        var satirlar = await baglanti.QueryIzliAsync<BakiyeSatiri>(baslik, new CommandDefinition(
            "SELECT HESAP_ID AS HesapId, HESAP_NO AS HesapNo, BAKIYE AS Bakiye FROM HESAP WHERE HESAP_ID IN (:h1, :h2)",
            p, tx, cancellationToken: ct));
        return satirlar.ToDictionary(s => s.HesapId);
    }

    private static void TriggerIzi(OracleIzBaglami iz, Dictionary<int, BakiyeSatiri> once, Dictionary<int, BakiyeSatiri> sonra)
    {
        var degisim = string.Join("; ", once.Values.Select(o =>
            $"{o.HesapNo}: {TurkceBicim.Para(o.Bakiye)} → {TurkceBicim.Para(sonra.TryGetValue(o.HesapId, out var s) ? s.Bakiye : o.Bakiye)}"));
        iz.Ekle(new IzGirdisi
        {
            Katman = "Trigger",
            Baslik = "TRG_ISLEM_BAKIYE_GUNCELLE",
            Sql = TriggerOzeti,
            Not = $"Uygulama BAKIYE'yi yazmadı; değişimi trigger yaptı. {degisim}"
        });
    }

    private sealed class BakiyeSatiri
    {
        public int HesapId { get; set; }
        public string HesapNo { get; set; } = string.Empty;
        public decimal Bakiye { get; set; }
    }

    public async Task<IslemHesabi?> HesapAsync(int hesapId, CancellationToken ct = default)
    {
        var h = await db.Hesaplar.AsNoTracking()
            .TagWith("İşlem formu: hesap ve sahibi")
            .Where(x => x.HesapId == hesapId)
            .Select(x => new { x.HesapId, x.HesapNo, x.MusteriId, MusteriAd = x.Musteri!.AdSoyad, x.HesapTipi, x.Bakiye, x.Aktif, MusteriAktif = x.Musteri.Aktif })
            .FirstOrDefaultAsync(ct);
        if (h is null) return null;

        var portfoy = h.HesapTipi == HesapTipi.Yatirim
            ? await db.Portfoy.AsNoTracking().TagWith("İşlem formu: portföy (VW_PORTFOY)")
                .Where(p => p.HesapId == hesapId).OrderBy(p => p.HisseKodu)
                .Select(p => new Pozisyon(p.HisseKodu, p.NetAdet)).ToListAsync(ct)
            : [];

        return new IslemHesabi
        {
            Id = h.HesapId,
            HesapNo = h.HesapNo,
            MusteriId = h.MusteriId,
            MusteriAd = h.MusteriAd,
            Tip = h.HesapTipi,
            Bakiye = h.Bakiye,
            Aktif = h.Aktif,
            MusteriAktif = h.MusteriAktif,
            Portfoy = portfoy
        };
    }

    public async Task<IReadOnlyList<HisseFiyati>> HisselerAsync(CancellationToken ct = default)
        => await db.Hisseler.AsNoTracking().TagWith("Hisse fiyatları (temsili)").OrderBy(h => h.HisseKodu)
            .Select(h => new HisseFiyati(h.HisseKodu, h.Ad, h.TemsiliFiyat)).ToListAsync(ct);

    public async Task<Dekont?> DekontAsync(int islemId, CancellationToken ct = default)
    {
        var dekont = await db.Islemler.AsNoTracking()
            .TagWith("Dekont")
            .Where(i => i.IslemId == islemId)
            .Select(i => new Dekont
            {
                Id = i.IslemId,
                Tarih = i.IslemTarihi,
                Tip = i.IslemTipi,
                Tutar = i.Tutar,
                Aciklama = i.Aciklama,
                ReferansNo = i.ReferansNo,
                HisseKodu = i.HisseKodu,
                Adet = i.Adet,
                BirimFiyat = i.BirimFiyat,
                HesapId = i.HesapId,
                HesapNo = i.Hesap!.HesapNo,
                IslemYapilabilir = i.Hesap.Aktif && i.Hesap.Musteri!.Aktif,
                MusteriId = i.Hesap.MusteriId,
                MusteriAd = i.Hesap.Musteri!.AdSoyad,
                MusteriNo = i.Hesap.Musteri.MusteriNo,
                KarsiHesapId = i.KarsiHesapId,
                KarsiHesapNo = i.KarsiHesap!.HesapNo,
                KarsiMusteriAd = i.KarsiHesap.Musteri!.AdSoyad
            })
            .FirstOrDefaultAsync(ct);
        if (dekont is null) return null;

        // Transferde aynı referanslı iki kayıt (giden + gelen) birlikte gösterilir
        var kayitlar = dekont.ReferansNo is { } referans
            ? await db.Islemler.AsNoTracking().TagWith("Dekont: transfer çifti (REFERANS_NO)")
                .Where(i => i.ReferansNo == referans).OrderBy(i => i.IslemId).Select(SorguYardimcilari.IslemSatiri).ToListAsync(ct)
            : await db.Islemler.AsNoTracking().TagWith("Dekont: kayıt")
                .Where(i => i.IslemId == islemId).Select(SorguYardimcilari.IslemSatiri).ToListAsync(ct);
        foreach (var k in kayitlar) k.BakiyeSonra = await BakiyeSonraAsync(k.HesapId, k.Tarih, k.Id, ct);

        dekont.Kayitlar = kayitlar;
        dekont.BakiyeSonra = kayitlar.First(k => k.Id == islemId).BakiyeSonra ?? 0;
        return dekont;
    }

    /// <summary>İşlemden sonraki bakiye = güncel bakiye − sonraki hareketlerin işaretli toplamı (trigger kuralı).</summary>
    private async Task<decimal> BakiyeSonraAsync(int hesapId, DateTime tarih, int islemId, CancellationToken ct)
    {
        var guncel = await db.Hesaplar.TagWith("Dekont: güncel bakiye").Where(h => h.HesapId == hesapId).Select(h => h.Bakiye).FirstAsync(ct);
        var sonraki = await db.Islemler.TagWith("Dekont: sonraki hareketlerin toplamı")
            .Where(i => i.HesapId == hesapId && (i.IslemTarihi > tarih || (i.IslemTarihi == tarih && i.IslemId > islemId)))
            .SumAsync(i => i.IslemTipi == IslemTipi.Yatirma || i.IslemTipi == IslemTipi.TransferGelen || i.IslemTipi == IslemTipi.Satim
                ? i.Tutar : -i.Tutar, ct);
        return guncel - sonraki;
    }
}
