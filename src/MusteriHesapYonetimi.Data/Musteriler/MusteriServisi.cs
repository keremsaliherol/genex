using Microsoft.EntityFrameworkCore;
using MusteriHesapYonetimi.Application.Hesaplar;
using MusteriHesapYonetimi.Application.Musteriler;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Domain;
using static MusteriHesapYonetimi.Data.OracleFonksiyonlari;

namespace MusteriHesapYonetimi.Data.Musteriler;

/// <summary>Müşteri CRUD, EF Core ile. Silme yok: pasife alma AKTIF = 0 yazar.</summary>
public sealed class MusteriServisi(HesapMasasiDbContext db) : IMusteriServisi
{
    public async Task<SayfaSonucu<MusteriListeOgesi>> ListeleAsync(MusteriFiltre f, CancellationToken ct = default)
    {
        var sorgu = db.Musteriler.AsNoTracking();
        sorgu = f.Durum switch
        {
            DurumFiltresi.Aktif => sorgu.Where(m => m.Aktif),
            DurumFiltresi.Pasif => sorgu.Where(m => !m.Aktif),
            _ => sorgu
        };
        if (f.Tip is { } tip) sorgu = sorgu.Where(m => m.MusteriTipi == tip);
        if (!string.IsNullOrWhiteSpace(f.Q)) sorgu = Ara(sorgu, f.Q);

        var toplam = await sorgu.TagWith("Müşteri sayısı (filtre)").CountAsync(ct);
        var satirlar = sorgu.TagWith("Müşteri listesi (sayfa, Türkçe sıralama)").Select(m => new MusteriListeOgesi
        {
            Id = m.MusteriId,
            MusteriNo = m.MusteriNo,
            AdSoyad = m.AdSoyad,
            Eposta = m.Eposta,
            Telefon = m.Telefon,
            Tip = m.MusteriTipi,
            KayitTarihi = m.KayitTarihi,
            Aktif = m.Aktif,
            HesapSayisi = m.Hesaplar.Count(),
            ToplamBakiye = m.Hesaplar.Sum(h => h.Bakiye)
        });
        var sirali = f.Sirala switch
        {
            MusteriSiralama.No => satirlar.Sirali(x => x.MusteriNo, f.Yon),
            MusteriSiralama.Hesap => satirlar.Sirali(x => x.HesapSayisi, f.Yon),
            MusteriSiralama.Bakiye => satirlar.Sirali(x => x.ToplamBakiye, f.Yon),
            MusteriSiralama.Kayit => satirlar.Sirali(x => x.KayitTarihi, f.Yon),
            _ => satirlar.Sirali(x => NlsSort(x.AdSoyad, Turkce), f.Yon)
        };
        return await sirali.ThenBy(x => x.Id).SayfalaAsync(toplam, f.Sayfa, f.Boyut, ct);
    }

    public async Task<MusteriDetay?> DetayAsync(int id, CancellationToken ct = default)
    {
        var musteri = await db.Musteriler.AsNoTracking().TagWith("Müşteri").FirstOrDefaultAsync(m => m.MusteriId == id, ct);
        if (musteri is null) return null;

        var hesaplar = await db.Hesaplar.AsNoTracking()
            .TagWith("Müşterinin hesapları")
            .Where(h => h.MusteriId == id)
            .OrderBy(h => h.EkNo)
            .Select(h => new HesapOzeti
            {
                Id = h.HesapId,
                HesapNo = h.HesapNo,
                Tip = h.HesapTipi,
                Bakiye = h.Bakiye,
                AcilisTarihi = h.AcilisTarihi,
                Aktif = h.Aktif,
                SonHareket = h.Islemler.Max(i => (DateTime?)i.IslemTarihi)
            })
            .ToListAsync(ct);

        var sonIslemler = await db.Islemler.AsNoTracking()
            .TagWith("Müşterinin son 15 işlemi")
            .Where(i => i.Hesap!.MusteriId == id)
            .OrderByDescending(i => i.IslemTarihi).ThenByDescending(i => i.IslemId)
            .Take(15)
            .Select(SorguYardimcilari.IslemSatiri)
            .ToListAsync(ct);

        var pozisyonlar = await PozisyonSayilariAsync(id, ct);
        var engel = MusteriKurallari.PasifeAlmaEngeli(musteri.Aktif,
            hesaplar.Select(h => new HesapDurumu(h.HesapNo, h.Aktif, h.Bakiye, pozisyonlar.GetValueOrDefault(h.Id))));

        return new MusteriDetay { Musteri = musteri, Hesaplar = hesaplar, SonIslemler = sonIslemler, PasifeAlmaEngeli = engel };
    }

    public Task<Musteri?> GetirAsync(int id, CancellationToken ct = default)
        => db.Musteriler.AsNoTracking().Include(m => m.Hesaplar).FirstOrDefaultAsync(m => m.MusteriId == id, ct);

    public async Task<Sonuc<int>> EkleAsync(MusteriKaydi kayit, CancellationToken ct = default)
    {
        // Kural ve benzersizlik hataları birlikte döner; kullanıcı formu bir kez düzeltir
        var hatalar = MusteriKurallari.Dogrula(kayit).ToList();
        if (MusteriKurallari.MusteriNoGecerli(kayit.MusteriNo) && await NoSahibiAsync(kayit.MusteriNo, haric: null, ct) is { } kayitli)
            hatalar.Add(new AlanHatasi(nameof(MusteriKaydi.MusteriNo), kayitli));
        if (hatalar.Count > 0) return Sonuc<int>.Hata(hatalar);

        var musteri = new Musteri
        {
            MusteriNo = kayit.MusteriNo,
            AdSoyad = kayit.AdSoyad,
            Eposta = kayit.Eposta,
            Telefon = kayit.Telefon,
            MusteriTipi = kayit.Tip,
            Aktif = true
        };
        db.Musteriler.Add(musteri);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (OracleHatalari.KisitMi(ex, OracleHatalari.Benzersizlik, "UQ_MUSTERI_NO"))
        {
            // Ön kontrolden sonra aynı numara başka bir oturumda kaydedilmiş
            return Sonuc<int>.Hata($"Bu müşteri no kayıtlı: {kayit.MusteriNo}.", nameof(MusteriKaydi.MusteriNo));
        }
        return Sonuc<int>.Tamam(musteri.MusteriId);
    }

    public async Task<Sonuc> GuncelleAsync(int id, MusteriKaydi kayit, CancellationToken ct = default)
    {
        var musteri = await db.Musteriler.FirstOrDefaultAsync(m => m.MusteriId == id, ct);
        if (musteri is null) return Sonuc.Hata("Müşteri bulunamadı.");

        var hatalar = MusteriKurallari.Dogrula(kayit).ToList();
        if (MusteriKurallari.MusteriNoGecerli(kayit.MusteriNo) && kayit.MusteriNo != musteri.MusteriNo)
        {
            var hesapSayisi = await db.Hesaplar.CountAsync(h => h.MusteriId == id, ct);
            var noHatasi = MusteriKurallari.MusteriNoDegisikligiHatasi(hesapSayisi)
                ?? await NoSahibiAsync(kayit.MusteriNo, haric: id, ct);
            if (noHatasi is not null) hatalar.Add(new AlanHatasi(nameof(MusteriKaydi.MusteriNo), noHatasi));
        }
        if (hatalar.Count > 0) return Sonuc.Hata(hatalar);

        musteri.MusteriTipi = kayit.Tip;
        musteri.AdSoyad = kayit.AdSoyad;
        musteri.MusteriNo = kayit.MusteriNo;
        musteri.Eposta = kayit.Eposta;
        musteri.Telefon = kayit.Telefon;
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (OracleHatalari.KisitMi(ex, OracleHatalari.Benzersizlik, "UQ_MUSTERI_NO"))
        {
            return Sonuc.Hata($"Bu müşteri no kayıtlı: {kayit.MusteriNo}.", nameof(MusteriKaydi.MusteriNo));
        }
        return Sonuc.Tamam();
    }

    public async Task<Sonuc> PasifeAlAsync(int id, CancellationToken ct = default)
    {
        var musteri = await db.Musteriler.FirstOrDefaultAsync(m => m.MusteriId == id, ct);
        if (musteri is null) return Sonuc.Hata("Müşteri bulunamadı.");

        var hesaplar = await db.Hesaplar.AsNoTracking()
            .Where(h => h.MusteriId == id)
            .Select(h => new { h.HesapId, h.HesapNo, h.Aktif, h.Bakiye })
            .ToListAsync(ct);
        var pozisyonlar = await PozisyonSayilariAsync(id, ct);
        var engel = MusteriKurallari.PasifeAlmaEngeli(musteri.Aktif,
            hesaplar.Select(h => new HesapDurumu(h.HesapNo, h.Aktif, h.Bakiye, pozisyonlar.GetValueOrDefault(h.HesapId))));
        if (engel is not null) return Sonuc.Hata(engel);

        musteri.Aktif = false;
        await db.SaveChangesAsync(ct);
        return Sonuc.Tamam();
    }

    public async Task<Sonuc> AktiflestirAsync(int id, CancellationToken ct = default)
    {
        var musteri = await db.Musteriler.FirstOrDefaultAsync(m => m.MusteriId == id, ct);
        if (musteri is null) return Sonuc.Hata("Müşteri bulunamadı.");
        if (musteri.Aktif) return Sonuc.Hata("Müşteri zaten aktif.");

        musteri.Aktif = true;
        await db.SaveChangesAsync(ct);
        return Sonuc.Tamam();
    }

    public async Task<string> YeniMusteriNoAsync(CancellationToken ct = default)
    {
        // 90 milyon olası numarada çakışma çok seyrek; yine de her aday kontrol edilir.
        for (var deneme = 0; deneme < 20; deneme++)
        {
            var aday = MusteriKurallari.RastgeleMusteriNo(Random.Shared);
            if (!await db.Musteriler.AnyAsync(m => m.MusteriNo == aday, ct)) return aday;
        }
        throw new InvalidOperationException("Boş müşteri numarası üretilemedi.");
    }

    public async Task<IReadOnlyList<MusteriAramaSonucu>> AraAsync(string q, int adet, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q)) return [];
        return await Ara(db.Musteriler.AsNoTracking(), q)
            .OrderByDescending(m => m.Aktif).ThenBy(m => NlsSort(m.AdSoyad, Turkce))
            .Take(adet)
            .Select(m => new MusteriAramaSonucu(m.MusteriId, m.MusteriNo, m.AdSoyad, m.MusteriTipi, m.Aktif))
            .ToListAsync(ct);
    }

    /// <summary>
    /// Ad (Türkçe büyük harfle, "ilker" = "İlker"), e-posta; en az 3 rakam yazıldıysa müşteri no ve telefon.
    /// </summary>
    private static IQueryable<Musteri> Ara(IQueryable<Musteri> sorgu, string q)
    {
        var buyuk = q.Trim().ToUpper(TurkceBicim.Kultur);
        var kucuk = q.Trim().ToLowerInvariant();
        var rakam = MusteriKurallari.Rakamlar(q);
        return rakam.Length >= 3
            ? sorgu.Where(m => NlsUpper(m.AdSoyad, Turkce).Contains(buyuk) || m.Eposta!.Contains(kucuk)
                || m.MusteriNo.Contains(rakam) || m.Telefon!.Replace(" ", "").Contains(rakam))
            : sorgu.Where(m => NlsUpper(m.AdSoyad, Turkce).Contains(buyuk) || m.Eposta!.Contains(kucuk));
    }

    private async Task<string?> NoSahibiAsync(string musteriNo, int? haric, CancellationToken ct)
    {
        var sorgu = db.Musteriler.Where(m => m.MusteriNo == musteriNo);
        if (haric is { } h) sorgu = sorgu.Where(m => m.MusteriId != h);
        var ad = await sorgu.Select(m => m.AdSoyad).FirstOrDefaultAsync(ct);
        return ad is null ? null : $"Bu müşteri no kayıtlı: {musteriNo} ({ad}).";
    }

    /// <summary>Müşterinin hesaplarındaki açık hisse pozisyonu sayısı (VW_PORTFOY), hesap id'sine göre.</summary>
    private Task<Dictionary<int, int>> PozisyonSayilariAsync(int musteriId, CancellationToken ct)
        => db.Portfoy
            .TagWith("Açık pozisyon sayısı (VW_PORTFOY)")
            .Where(p => db.Hesaplar.Any(h => h.HesapId == p.HesapId && h.MusteriId == musteriId))
            .GroupBy(p => p.HesapId)
            .Select(g => new { HesapId = g.Key, Adet = g.Count() })
            .ToDictionaryAsync(x => x.HesapId, x => x.Adet, ct);
}
