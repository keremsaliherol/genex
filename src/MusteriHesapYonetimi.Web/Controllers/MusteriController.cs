using Microsoft.AspNetCore.Mvc;
using MusteriHesapYonetimi.Application.Musteriler;
using MusteriHesapYonetimi.Application.Raporlar;
using MusteriHesapYonetimi.Domain;
using MusteriHesapYonetimi.Web.Altyapi;
using MusteriHesapYonetimi.Web.Models;

namespace MusteriHesapYonetimi.Web.Controllers;

/// <summary>Müşteri ekranları (S2-S4). İş kuralları serviste; controller yalnız akışı yönetir.</summary>
public sealed class MusteriController(IMusteriServisi servis, IRaporSorgusu raporlar) : Controller
{
    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] MusteriFiltre filtre, CancellationToken ct)
        => View(new MusteriListeSayfasi(filtre, await servis.ListeleAsync(filtre, ct)));

    [HttpGet]
    public async Task<IActionResult> Detay(int id, string? sekme, CancellationToken ct)
    {
        var detay = await servis.DetayAsync(id, ct);
        if (detay is null) return NotFound();
        sekme = sekme is "islemler" or "ozet" ? sekme : "hesaplar";
        ViewData["Sekme"] = sekme;
        // Aylık özet sekmesi: bu ayın PKG_RAPOR.AYLIK_OZET_MUSTERI sonucu (tüm hesaplar)
        if (sekme == "ozet")
            ViewData["AylikOzet"] = await raporlar.AylikOzetAsync(RaporKapsami.Musteri, id, DateTime.Today.Year, DateTime.Today.Month, ct);
        return View(detay);
    }

    [HttpGet]
    public async Task<IActionResult> Yeni(CancellationToken ct)
        => View("Form", new MusteriKaydi { MusteriNo = await servis.YeniMusteriNoAsync(ct) });

    [HttpPost]
    public async Task<IActionResult> Yeni(MusteriKaydi kayit, CancellationToken ct)
    {
        if (!ModelState.IsValid) return View("Form", kayit);

        var sonuc = await servis.EkleAsync(kayit, ct);
        if (!sonuc.Basarili)
        {
            ModelState.SonucuAktar(sonuc);
            return View("Form", kayit);
        }
        TempData.Basari("Müşteri kaydedildi.");
        return RedirectToAction(nameof(Detay), new { id = sonuc.Deger });
    }

    [HttpGet]
    public async Task<IActionResult> Duzenle(int id, CancellationToken ct)
    {
        var musteri = await servis.GetirAsync(id, ct);
        if (musteri is null) return NotFound();

        FormBaglami(musteri);
        return View("Form", new MusteriKaydi
        {
            Tip = musteri.MusteriTipi,
            AdSoyad = musteri.AdSoyad,
            MusteriNo = musteri.MusteriNo,
            Eposta = musteri.Eposta,
            Telefon = musteri.Telefon
        });
    }

    [HttpPost]
    public async Task<IActionResult> Duzenle(int id, MusteriKaydi kayit, CancellationToken ct)
    {
        var musteri = await servis.GetirAsync(id, ct);
        if (musteri is null) return NotFound();

        FormBaglami(musteri);
        if (!ModelState.IsValid) return View("Form", kayit);

        var sonuc = await servis.GuncelleAsync(id, kayit, ct);
        if (!sonuc.Basarili)
        {
            ModelState.SonucuAktar(sonuc);
            return View("Form", kayit);
        }
        TempData.Basari("Değişiklikler kaydedildi.");
        return RedirectToAction(nameof(Detay), new { id });
    }

    [HttpPost]
    public async Task<IActionResult> PasifeAl(int id, string? donus, CancellationToken ct)
    {
        var sonuc = await servis.PasifeAlAsync(id, ct);
        if (sonuc.Basarili)
            TempData.Basari("Müşteri pasife alındı.", Url.Action(nameof(Aktiflestir), new { id, donus }));
        else
            TempData.Hata($"Pasife alınamadı. {sonuc.Mesaj}");
        return Don(donus, id);
    }

    [HttpPost]
    public async Task<IActionResult> Aktiflestir(int id, string? donus, CancellationToken ct)
    {
        var sonuc = await servis.AktiflestirAsync(id, ct);
        if (sonuc.Basarili) TempData.Basari("Müşteri aktifleştirildi.");
        else TempData.Hata(sonuc.Mesaj!);
        return Don(donus, id);
    }

    /// <summary>Düzenleme formunun salt okunur bağlamı: kayıt tarihi, başlıktaki ad, müşteri no kilidi.</summary>
    private void FormBaglami(Musteri musteri)
    {
        ViewData["MusteriId"] = musteri.MusteriId;
        ViewData["KayitTarihi"] = musteri.KayitTarihi;
        ViewData["AsilAd"] = musteri.AdSoyad;
        ViewData["NoKilitli"] = MusteriKurallari.MusteriNoDegisikligiHatasi(musteri.Hesaplar.Count);
    }

    /// <summary>Listeden gelindiyse aynı filtrelere dön; açık yönlendirmeye karşı yalnız yerel adres.</summary>
    private IActionResult Don(string? donus, int id)
        => Url.IsLocalUrl(donus) ? LocalRedirect(donus) : RedirectToAction(nameof(Detay), new { id });
}
