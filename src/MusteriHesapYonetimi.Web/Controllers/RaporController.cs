using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Application.Raporlar;
using MusteriHesapYonetimi.Domain;
using MusteriHesapYonetimi.Web.Altyapi;
using MusteriHesapYonetimi.Web.Models;

namespace MusteriHesapYonetimi.Web.Controllers;

/// <summary>
/// Raporlar (S10): aylık işlem özeti, bakiye değişimi, en aktif. Parametreler GET sorgu dizesinde; adres paylaşılabilir,
/// CSV bağlantısı aynı sorguyu taşır. Kayıt seçilmemişse rapor çalışmaz, seçim ekranı gösterilir.
/// </summary>
public sealed class RaporController(IRaporSorgusu raporlar) : Controller
{
    [HttpGet]
    public IActionResult Index() => RedirectToAction(nameof(AylikOzet));

    [HttpGet]
    public async Task<IActionResult> AylikOzet(AylikOzetFiltre filtre, CancellationToken ct)
    {
        var (yil, ay) = RaporDonemleri.Ay(filtre.Yil, filtre.Ay, DateTime.Today);
        if (filtre.Id is not { } id) return View(new AylikOzetSayfasi(filtre.Kapsam, yil, ay, null));
        var ozet = await raporlar.AylikOzetAsync(filtre.Kapsam, id, yil, ay, ct);
        return ozet is null ? NotFound() : View(new AylikOzetSayfasi(filtre.Kapsam, yil, ay, ozet));
    }

    [HttpGet]
    public async Task<IActionResult> AylikOzetCsv(AylikOzetFiltre filtre, CancellationToken ct)
    {
        var (yil, ay) = RaporDonemleri.Ay(filtre.Yil, filtre.Ay, DateTime.Today);
        if (filtre.Id is not { } id || await raporlar.AylikOzetAsync(filtre.Kapsam, id, yil, ay, ct) is not { } ozet) return NotFound();

        string?[] baslik = ["ISLEM_TIPI", "ISLEM_ADEDI", "TOPLAM_TUTAR"];
        return CsvDosyasi.Olustur($"aylik-ozet-{ozet.HesapNo ?? $"musteri-{ozet.Id}"}-{yil}-{ay:00}.csv",
            ozet.Satirlar.Select(s => new string?[]
            {
                VeritabaniKodu.Yaz(s.Tip),
                s.Adet.ToString(CultureInfo.InvariantCulture),
                CsvDosyasi.Tutar(s.Toplam)
            }).Prepend(baslik));
    }

    [HttpGet]
    public async Task<IActionResult> BakiyeDegisimi(BakiyeDegisimiFiltre filtre, CancellationToken ct)
    {
        var (donem, bas, bit) = RaporDonemleri.Bakiye(filtre, DateTime.Today);
        if (filtre.Id is not { } id) return View(new BakiyeDegisimiSayfasi(donem, bas, bit, null));
        var rapor = await raporlar.BakiyeDegisimiAsync(id, bas, bit, ct);
        return rapor is null ? NotFound() : View(new BakiyeDegisimiSayfasi(donem, bas, bit, rapor));
    }

    [HttpGet]
    public async Task<IActionResult> BakiyeDegisimiCsv(BakiyeDegisimiFiltre filtre, CancellationToken ct)
    {
        var (_, bas, bit) = RaporDonemleri.Bakiye(filtre, DateTime.Today);
        if (filtre.Id is not { } id || await raporlar.BakiyeDegisimiAsync(id, bas, bit, ct) is not { } rapor) return NotFound();

        string?[] baslik = ["ISLEM_ID", "ISLEM_TARIHI", "ISLEM_TIPI", "ACIKLAMA", "TUTAR", "BAKIYE"];
        return CsvDosyasi.Olustur($"bakiye-degisimi-{rapor.HesapNo}-{bas:yyyyMMdd}-{bit:yyyyMMdd}.csv",
            rapor.Hareketler.Select(s => new string?[]
            {
                s.Id.ToString(CultureInfo.InvariantCulture),
                TurkceBicim.TarihSaatSaniye(s.Tarih),
                VeritabaniKodu.Yaz(s.Tip),
                Csv.Metin(s.Aciklama),
                CsvDosyasi.Tutar(s.IsaretliTutar),
                CsvDosyasi.Tutar(s.BakiyeSonra ?? 0)
            }).Prepend(baslik));
    }

    [HttpGet]
    public async Task<IActionResult> EnAktif(EnAktifFiltre filtre, CancellationToken ct)
        => View(new EnAktifSayfasi(filtre, await EnAktifOkuAsync(filtre, ct)));

    [HttpGet]
    public async Task<IActionResult> EnAktifCsv(EnAktifFiltre filtre, CancellationToken ct)
    {
        var hesap = filtre.Tur == EnAktifTuru.Hesap;
        string?[] baslik = ["SIRA", hesap ? "HESAP_NO" : "MUSTERI_NO", "AD_SOYAD", "TOPLAM_ISLEM", "HACIM", "SON_ISLEM"];
        return CsvDosyasi.Olustur($"en-aktif-{(hesap ? "hesap" : "musteri")}-{filtre.Donem.ToString().ToLowerInvariant()}.csv",
            (await EnAktifOkuAsync(filtre, ct)).Select(s => new string?[]
            {
                s.Sira.ToString(CultureInfo.InvariantCulture),
                hesap ? s.Ad : s.MusteriNo,
                Csv.Metin(s.MusteriAd),
                s.IslemAdedi.ToString(CultureInfo.InvariantCulture),
                CsvDosyasi.Tutar(s.Hacim),
                TurkceBicim.TarihSaatSaniye(s.SonIslem)
            }).Prepend(baslik));
    }

    private Task<IReadOnlyList<EnAktifSatir>> EnAktifOkuAsync(EnAktifFiltre filtre, CancellationToken ct)
        => raporlar.EnAktifAsync(filtre.Tur, RaporDonemleri.EnAktifBaslangic(filtre.Donem, DateTime.Today), filtre.Adet, ct);
}
