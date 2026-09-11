using Microsoft.AspNetCore.Mvc;
using MusteriHesapYonetimi.Application.Hesaplar;
using MusteriHesapYonetimi.Application.Musteriler;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Domain;
using MusteriHesapYonetimi.Web.Altyapi;
using MusteriHesapYonetimi.Web.Models;

namespace MusteriHesapYonetimi.Web.Controllers;

/// <summary>Hesap ekranları (S5-S7). Ekstre ve işlemler Faz 3'te.</summary>
public sealed class HesapController(IHesapServisi servis, IMusteriServisi musteriler) : Controller
{
    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] HesapFiltre filtre, CancellationToken ct)
        => View(new HesapListeSayfasi(filtre, await servis.ListeleAsync(filtre, ct)));

    [HttpGet]
    public async Task<IActionResult> Detay(int id, string? sekme, CancellationToken ct)
    {
        var detay = await servis.DetayAsync(id, ct);
        if (detay is null) return NotFound();
        ViewData["Sekme"] = sekme == "portfoy" && detay.Hesap.HesapTipi == HesapTipi.Yatirim ? "portfoy" : "hareket";
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
