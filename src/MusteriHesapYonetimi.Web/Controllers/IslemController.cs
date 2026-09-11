using Microsoft.AspNetCore.Mvc;
using MusteriHesapYonetimi.Application.Islemler;
using MusteriHesapYonetimi.Web.Altyapi;

namespace MusteriHesapYonetimi.Web.Controllers;

/// <summary>İşlem yap (S8) ve dekont. İş kuralları PKG_ISLEM'de; controller akışı ve hata gösterimini yönetir.</summary>
public sealed class IslemController(IIslemServisi servis) : Controller
{
    [HttpGet]
    public async Task<IActionResult> Yeni(int? hesapId, IslemTuru? tip, CancellationToken ct)
    {
        var kayit = new IslemKaydi { HesapId = hesapId, Tur = tip ?? IslemTuru.Yatirma };
        await Baglam(kayit, ct);

        // Pasif hesap bağlamdan seçili gelmez; hisse işlemi yalnız yatırım hesabında
        if (ViewData["Hesap"] is IslemHesabi hesap)
        {
            if (!hesap.IslemYapilabilir) { kayit.HesapId = null; ViewData["Hesap"] = null; }
            else if (kayit.Tur.HisseIslemi() && hesap.Tip != Domain.HesapTipi.Yatirim) kayit.Tur = IslemTuru.Yatirma;
        }
        return View(kayit);
    }

    [HttpPost]
    public async Task<IActionResult> Yeni(IslemKaydi kayit, CancellationToken ct)
    {
        if (ModelState.IsValid)
        {
            var sonuc = await servis.YapAsync(kayit, ct);
            if (sonuc.Basarili && sonuc.Deger is { } islem)
            {
                TempData.Basari(islem.ReferansNo is null
                    ? "İşlem tamamlandı. Dekont oluşturuldu."
                    : $"Transfer tamamlandı. Referans no {islem.ReferansNo}.");
                return RedirectToAction(nameof(Dekont), new { id = islem.IslemId });
            }
            ModelState.SonucuAktar(sonuc);
            // Veritabanı reddi formun üstünde ayrıca gösterilir: hiçbir kayıt yazılmadı
            ViewData["DbHatasi"] = sonuc.Hatalar.FirstOrDefault(h => h.Kod is not null);
        }
        await Baglam(kayit, ct);
        return View(kayit);
    }

    [HttpGet]
    public async Task<IActionResult> Dekont(int id, CancellationToken ct)
        => await servis.DekontAsync(id, ct) is { } dekont ? View(dekont) : NotFound();

    private async Task Baglam(IslemKaydi kayit, CancellationToken ct)
    {
        ViewData["Hisseler"] = await servis.HisselerAsync(ct);
        if (kayit.HesapId is { } hesapId) ViewData["Hesap"] = await servis.HesapAsync(hesapId, ct);
        if (kayit.HedefHesapId is { } hedefId) ViewData["Hedef"] = await servis.HesapAsync(hedefId, ct);
    }
}
