using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using MusteriHesapYonetimi.Application.Hesaplar;
using MusteriHesapYonetimi.Application.Musteriler;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Data.Izleme;
using MusteriHesapYonetimi.Domain;
using Oracle.ManagedDataAccess.Client;
using static MusteriHesapYonetimi.Data.OracleFonksiyonlari;

namespace MusteriHesapYonetimi.Data.Hesaplar;

/// <summary>
/// Hesap okumaları ve kayıtları EF Core ile. Açılış tutarı aynı OracleTransaction içinde Dapper ile
/// PKG_ISLEM.YATIR'a gider: hesap satırı ve açılış işlemi birlikte yazılır ya da hiçbiri yazılmaz.
/// </summary>
public sealed class HesapServisi(HesapMasasiDbContext db) : IHesapServisi
{
    private const string YatirSql =
        "BEGIN PKG_ISLEM.YATIR(p_hesap_id => :hesap_id, p_tutar => :tutar, p_aciklama => :aciklama, p_islem_id => :islem_id); END;";

    private static readonly DateTime HareketYok = new(1900, 1, 1);

    public async Task<HesapListesi> ListeleAsync(HesapFiltre f, CancellationToken ct = default)
    {
        var sorgu = db.Hesaplar.AsNoTracking();
        sorgu = f.Durum switch
        {
            DurumFiltresi.Aktif => sorgu.Where(h => h.Aktif),
            DurumFiltresi.Pasif => sorgu.Where(h => !h.Aktif),
            _ => sorgu
        };
        if (f.Tip is { } tip) sorgu = sorgu.Where(h => h.HesapTipi == tip);
        if (f.MusteriId is { } musteriId) sorgu = sorgu.Where(h => h.MusteriId == musteriId);
        if (!string.IsNullOrWhiteSpace(f.Q)) sorgu = Ara(sorgu, f.Q);

        var toplam = await sorgu.TagWith("Hesap sayısı (filtre)").CountAsync(ct);
        var toplamBakiye = toplam == 0 ? 0 : await sorgu.TagWith("Filtrelenen hesapların toplam bakiyesi").SumAsync(h => h.Bakiye, ct);
        var satirlar = sorgu.TagWith("Hesap listesi (sayfa)").Select(h => new HesapListeOgesi
        {
            Id = h.HesapId,
            HesapNo = h.HesapNo,
            MusteriId = h.MusteriId,
            MusteriAd = h.Musteri!.AdSoyad,
            MusteriTipi = h.Musteri.MusteriTipi,
            Tip = h.HesapTipi,
            Bakiye = h.Bakiye,
            AcilisTarihi = h.AcilisTarihi,
            Aktif = h.Aktif,
            MusteriAktif = h.Musteri.Aktif,
            SonHareket = h.Islemler.Max(i => (DateTime?)i.IslemTarihi)
        });
        var sirali = f.Sirala switch
        {
            HesapSiralama.Musteri => satirlar.Sirali(x => NlsSort(x.MusteriAd, Turkce), f.Yon),
            HesapSiralama.Bakiye => satirlar.Sirali(x => x.Bakiye, f.Yon),
            HesapSiralama.Acilis => satirlar.Sirali(x => x.AcilisTarihi, f.Yon),
            // Oracle azalan sıralamada NULL'ları başa koyar; hareketsiz hesaplar sona düşsün
            HesapSiralama.Son => satirlar.Sirali(x => x.SonHareket ?? HareketYok, f.Yon),
            _ => satirlar.Sirali(x => x.HesapNo, f.Yon)
        };
        var sayfa = await sirali.ThenBy(x => x.Id).SayfalaAsync(toplam, f.Sayfa, f.Boyut, ct);

        string? musteriAd = null;
        if (f.MusteriId is { } id)
            musteriAd = await db.Musteriler.Where(m => m.MusteriId == id).Select(m => m.AdSoyad).FirstOrDefaultAsync(ct);

        return new HesapListesi { Sayfa = sayfa, ToplamBakiye = toplamBakiye, MusteriAd = musteriAd };
    }

    public async Task<HesapDetay?> DetayAsync(int id, CancellationToken ct = default)
    {
        var hesap = await db.Hesaplar.AsNoTracking().TagWith("Hesap ve sahibi").Include(h => h.Musteri).FirstOrDefaultAsync(h => h.HesapId == id, ct);
        if (hesap?.Musteri is null) return null;

        var simdi = DateTime.Now;
        var doksanGunOnce = DateTime.Today.AddDays(-89);
        var otuzGunOnce = DateTime.Today.AddDays(-29);

        var sonHareketler = await db.Islemler.AsNoTracking()
            .TagWith("Son 20 hareket")
            .Where(i => i.HesapId == id)
            .OrderByDescending(i => i.IslemTarihi).ThenByDescending(i => i.IslemId)
            .Take(20)
            .Select(SorguYardimcilari.IslemSatiri)
            .ToListAsync(ct);
        BakiyeGecmisi.BakiyeleriDoldur(hesap.Bakiye, sonHareketler);

        // Son 90 gün: bakiye çizgisi ve son 30 günün giriş/çıkış toplamı (IDX_ISLEM_HESAP_TARIH)
        var doksanGun = await db.Islemler.AsNoTracking()
            .TagWith("Son 90 günün hareketleri (bakiye çizgisi)")
            .Where(i => i.HesapId == id && i.IslemTarihi >= doksanGunOnce)
            .OrderByDescending(i => i.IslemTarihi).ThenByDescending(i => i.IslemId)
            .Select(i => new { i.IslemTarihi, i.IslemTipi, i.Tutar })
            .ToListAsync(ct);
        var hareketler = doksanGun.Select(i => (Zaman: i.IslemTarihi, IsaretliTutar: i.IslemTipi.BakiyeEtkisi() * i.Tutar)).ToList();
        var otuzGun = hareketler.Where(h => h.Zaman >= otuzGunOnce).ToList();

        var portfoy = hesap.HesapTipi == HesapTipi.Yatirim
            ? await db.Portfoy.AsNoTracking().TagWith("Portföy (VW_PORTFOY)").Where(p => p.HesapId == id).OrderBy(p => p.HisseKodu).ToListAsync(ct)
            : [];

        return new HesapDetay
        {
            Hesap = hesap,
            Musteri = hesap.Musteri,
            SonHareketler = sonHareketler,
            Portfoy = portfoy,
            BakiyeGecmisi = BakiyeGecmisi.Noktalar(hesap.Bakiye, hareketler, doksanGunOnce, simdi),
            Giris30 = otuzGun.Where(h => h.IsaretliTutar > 0).Sum(h => h.IsaretliTutar),
            Cikis30 = -otuzGun.Where(h => h.IsaretliTutar < 0).Sum(h => h.IsaretliTutar),
            ToplamHareket = await db.Islemler.TagWith("Toplam hareket sayısı").CountAsync(i => i.HesapId == id, ct),
            PasifeAlmaEngeli = HesapKurallari.PasifeAlmaEngeli(new HesapDurumu(hesap.HesapNo, hesap.Aktif, hesap.Bakiye, portfoy.Count))
        };
    }

    public async Task<string?> HesapNoOnizleAsync(int musteriId, CancellationToken ct = default)
    {
        var musteri = await db.Musteriler.AsNoTracking()
            .Where(m => m.MusteriId == musteriId)
            .Select(m => new { m.MusteriNo, m.Aktif, EnBuyukEkNo = m.Hesaplar.Max(h => (int?)h.EkNo) })
            .FirstOrDefaultAsync(ct);
        return musteri is null || !musteri.Aktif
            ? null
            : HesapNumarasi.Olustur(musteri.MusteriNo, HesapKurallari.SonrakiEkNo(musteri.EnBuyukEkNo));
    }

    public async Task<Sonuc<HesapAcildi>> AcAsync(HesapAcmaKaydi kayit, CancellationToken ct = default)
    {
        if (kayit.MusteriId is not { } musteriId)
            return Sonuc<HesapAcildi>.Hata("Listeden bir müşteri seçin.", nameof(HesapAcmaKaydi.MusteriId));
        if (HesapKurallari.AcilisTutariHatasi(kayit.AcilisTutari, out var acilisTutari) is { } tutarHatasi)
            return Sonuc<HesapAcildi>.Hata(tutarHatasi, nameof(HesapAcmaKaydi.AcilisTutari));

        // Transaction erken dönüşte commit edilmeden kapanır: ROLLBACK, kilit bırakılır.
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Müşteri satırı kilitlenir: aynı müşteriye eşzamanlı iki açılış aynı EK_NO'yu alamaz.
        var musteri = (await db.Musteriler
            .FromSql($"SELECT * FROM MUSTERI WHERE MUSTERI_ID = {musteriId} FOR UPDATE")
            .AsNoTracking()
            .ToListAsync(ct)).SingleOrDefault();
        if (musteri is null)
            return Sonuc<HesapAcildi>.Hata("Müşteri bulunamadı.", nameof(HesapAcmaKaydi.MusteriId));
        if (!musteri.Aktif)
            return Sonuc<HesapAcildi>.Hata("Pasif müşteriye hesap açılamaz. Önce müşteriyi aktifleştirin.", nameof(HesapAcmaKaydi.MusteriId));

        var ekNo = HesapKurallari.SonrakiEkNo(
            await db.Hesaplar.Where(h => h.MusteriId == musteriId).MaxAsync(h => (int?)h.EkNo, ct));
        if (ekNo > HesapKurallari.EnBuyukEkNo)
            return Sonuc<HesapAcildi>.Hata("Bu müşteri için hesap sınırına (999) ulaşıldı.");

        var hesap = new Hesap
        {
            MusteriId = musteriId,
            EkNo = ekNo,
            HesapNo = HesapNumarasi.Olustur(musteri.MusteriNo, ekNo),
            HesapTipi = kayit.Tip,
            Aktif = true
        };
        db.Hesaplar.Add(hesap);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (OracleHatalari.Bul(ex)?.Number == OracleHatalari.Benzersizlik)
        {
            return Sonuc<HesapAcildi>.Hata("Hesap numarası başka bir kayıtla çakıştı. Tekrar deneyin.");
        }

        if (acilisTutari is { } tutar)
        {
            // BAKIYE doğrudan yazılmaz: açılış tutarı da bir YATIRMA işlemidir, trigger bakiyeyi günceller.
            var parametreler = new OracleParametreleri()
                .Girdi("hesap_id", hesap.HesapId)
                .Girdi("tutar", tutar)
                .Girdi("aciklama", HesapKurallari.AcilisAciklamasi)
                .Cikti("islem_id", OracleDbType.Int64);
            try
            {
                await db.Database.GetDbConnection().ExecuteIzliAsync("PKG_ISLEM.YATIR (açılış bakiyesi)",
                    new CommandDefinition(YatirSql, parametreler, tx.GetDbTransaction(), cancellationToken: ct));
            }
            catch (OracleException ex) when (OracleHatalari.UygulamaHatasiMi(ex))
            {
                return Sonuc<HesapAcildi>.Hata(OracleHatalari.UygulamaMesaji(ex), nameof(HesapAcmaKaydi.AcilisTutari));
            }
        }

        await tx.CommitAsync(ct);
        return Sonuc<HesapAcildi>.Tamam(new HesapAcildi(hesap.HesapId, hesap.HesapNo, acilisTutari));
    }

    public async Task<Sonuc> PasifeAlAsync(int id, CancellationToken ct = default)
    {
        var hesap = await db.Hesaplar.FirstOrDefaultAsync(h => h.HesapId == id, ct);
        if (hesap is null) return Sonuc.Hata("Hesap bulunamadı.");

        var pozisyon = await db.Portfoy.CountAsync(p => p.HesapId == id, ct);
        if (HesapKurallari.PasifeAlmaEngeli(new HesapDurumu(hesap.HesapNo, hesap.Aktif, hesap.Bakiye, pozisyon)) is { } engel)
            return Sonuc.Hata(engel);

        hesap.Aktif = false;
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (OracleHatalari.KisitMi(ex, OracleHatalari.CheckIhlali, "CK_HESAP_PASIF_BAKIYE"))
        {
            // Kontrolden sonra hesaba para girdi; veritabanı kısıtı son güvence
            return Sonuc.Hata("Hesaba bu arada para girdi; bakiye sıfır olmadığı için pasife alınamadı.");
        }
        return Sonuc.Tamam();
    }

    public async Task<IReadOnlyList<HesapAramaSonucu>> AraAsync(string q, int adet, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q)) return [];
        return await Ara(db.Hesaplar.AsNoTracking(), q)
            .OrderByDescending(h => h.Aktif).ThenBy(h => h.HesapNo)
            .Take(adet)
            .Select(h => new HesapAramaSonucu(h.HesapId, h.HesapNo, h.Musteri!.AdSoyad, h.HesapTipi, h.Bakiye, h.Aktif, h.Musteri.Aktif))
            .ToListAsync(ct);
    }

    /// <summary>En az 3 rakam yazıldıysa tiresiz hesap no; her durumda müşteri adı (Türkçe büyük harfle).</summary>
    private static IQueryable<Hesap> Ara(IQueryable<Hesap> sorgu, string q)
    {
        var buyuk = q.Trim().ToUpper(TurkceBicim.Kultur);
        var rakam = MusteriKurallari.Rakamlar(q);
        return rakam.Length >= 3
            ? sorgu.Where(h => h.HesapNo.Replace("-", "").Contains(rakam) || NlsUpper(h.Musteri!.AdSoyad, Turkce).Contains(buyuk))
            : sorgu.Where(h => NlsUpper(h.Musteri!.AdSoyad, Turkce).Contains(buyuk));
    }
}
