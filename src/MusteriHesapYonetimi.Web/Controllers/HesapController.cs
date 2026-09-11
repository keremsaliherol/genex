using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using MusteriHesapYonetimi.Application.Hesaplar;
using MusteriHesapYonetimi.Application.Islemler;
using MusteriHesapYonetimi.Application.Musteriler;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Application.Raporlar;
using MusteriHesapYonetimi.Domain;
using MusteriHesapYonetimi.Web.Altyapi;
using MusteriHesapYonetimi.Web.Models;

namespace MusteriHesapYonetimi.Web.Controllers;

/// <summary>Hesap ekranları (S5-S7) ve ekstre (S9).</summary>
public sealed class HesapController(IHesapServisi servis, IMusteriServisi musteriler, IEkstreSorgusu ekstreler, IRaporSorgusu raporlar) : Controller
{
    /// <summary>/Hesap/Ekstre: hesap seçimi. /Hesap/Ekstre/{id}?on=gecenay&amp;tip=Yatirma: ekstre.</summary>
    [HttpGet]
    public async Task<IActionResult> Ekstre(int? id, [FromQuery] EkstreFiltre filtre, CancellationToken ct)
    {
        if (id is null) return View("EkstreSec");
        return await ekstreler.OkuAsync(id.Value, filtre, ct) is { } ekstre ? View(ekstre) : NotFound();
    }

    /// <summary>Ekranda görünen satırların CSV'si: noktalı virgül, UTF-8 BOM, tr-TR ondalık virgül (Excel doğrudan açar).</summary>
    [HttpGet]
    public async Task<IActionResult> EkstreCsv(int id, [FromQuery] EkstreFiltre filtre, CancellationToken ct)
    {
        if (await ekstreler.OkuAsync(id, filtre, ct) is not { } ekstre) return NotFound();

        string?[] baslik = ["ISLEM_ID", "ISLEM_TARIHI", "ISLEM_TIPI", "ACIKLAMA", "KARSI_HESAP_NO", "TUTAR", "BAKIYE"];
        return CsvDosyasi.Olustur($"ekstre-{ekstre.HesapNo}-{ekstre.Bas:yyyyMMdd}-{ekstre.Bit:yyyyMMdd}.csv",
            ekstre.Satirlar.Select(s => new string?[]
            {
                s.Id.ToString(CultureInfo.InvariantCulture),
                TurkceBicim.TarihSaatSaniye(s.Tarih),
                VeritabaniKodu.Yaz(s.Tip),
                Csv.Metin(s.Aciklama),
                s.KarsiHesapNo,
                CsvDosyasi.Tutar(s.IsaretliTutar),
                CsvDosyasi.Tutar(s.BakiyeSonra ?? 0)
            }).Prepend(baslik));
    }

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] HesapFiltre filtre, CancellationToken ct)
        => View(new HesapListeSayfasi(filtre, await servis.ListeleAsync(filtre, ct)));

    [HttpGet]
    public async Task<IActionResult> Detay(int id, string? sekme, CancellationToken ct)
    {
        var detay = await servis.DetayAsync(id, ct);
        if (detay is null) return NotFound();
        sekme = sekme switch
        {
            "portfoy" when detay.Hesap.HesapTipi == HesapTipi.Yatirim => "portfoy",
            "ozet" => "ozet",
            _ => "hareket"
        };
        ViewData["Sekme"] = sekme;
        // Aylık özet sekmesi: bu ayın PKG_RAPOR.AYLIK_OZET_HESAP sonucu; tam rapor /Rapor/AylikOzet'te
        if (sekme == "ozet")
            ViewData["AylikOzet"] = await raporlar.AylikOzetAsync(RaporKapsami.Hesap, id, DateTime.Today.Year, DateTime.Today.Month, ct);
        return View(detay);
    }

    [HttpGet]
    public async Task<IActionResult> Yeni(int? musteriId, CancellationToken ct)
    {
        var kayit = new HesapAcmaKaydi { MusteriId = musteriId };
        await YeniBaglami(kayit, ct);
        return View(kayit);
    }

    [HttpPost]
    public async Task<IActionResult> Yeni(HesapAcmaKaydi kayit, CancellationToken ct)
    {
        if (ModelState.IsValid)
        {
            var sonuc = await servis.AcAsync(kayit, ct);
            if (sonuc.Basarili && sonuc.Deger is { } acilan)
            {
                var ek = acilan.AcilisTutari is { } t ? $" Açılış bakiyesi {TurkceBicim.Para(t)} olarak işlendi." : "";
                TempData.Basari($"Hesap açıldı: {acilan.HesapNo}.{ek}");
                return RedirectToAction(nameof(Detay), new { id = acilan.HesapId });
            }
            ModelState.SonucuAktar(sonuc);
        }
        await YeniBaglami(kayit, ct);
        return View(kayit);
    }

    [HttpPost]
    public async Task<IActionResult> PasifeAl(int id, CancellationToken ct)
    {
        var sonuc = await servis.PasifeAlAsync(id, ct);
        if (sonuc.Basarili) TempData.Basari("Hesap pasife alındı.");
        else TempData.Hata($"Pasife alınamadı. {sonuc.Mesaj}");
        return RedirectToAction(nameof(Detay), new { id });
    }

    /// <summary>Seçili müşteri ve hesap no önizlemesi. Pasif müşteri bağlamdan seçili gelmez.</summary>
    private async Task YeniBaglami(HesapAcmaKaydi kayit, CancellationToken ct)
    {
        if (kayit.MusteriId is not { } musteriId) return;
        var musteri = await musteriler.GetirAsync(musteriId, ct);
        if (musteri is null || !musteri.Aktif)
        {
            if (Request.Method == HttpMethods.Get) kayit.MusteriId = null;
            return;
        }
        ViewData["Musteri"] = musteri;
        ViewData["HesapNo"] = await servis.HesapNoOnizleAsync(musteriId, ct);
    }
}
