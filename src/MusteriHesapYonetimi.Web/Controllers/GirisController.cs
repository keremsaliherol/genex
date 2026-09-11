using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MusteriHesapYonetimi.Web.Altyapi;
using MusteriHesapYonetimi.Web.Models;

namespace MusteriHesapYonetimi.Web.Controllers;

/// <summary>
/// Oturum açma (S0) ve kapatma. Tek yönetici hesabı; art arda hatalı denemelerde hesap kilitlenir (Identity lockout).
/// Hata mesajı hesabın var olup olmadığını ele vermez; kalan deneme sayısı gösterilmez.
/// </summary>
public sealed class GirisController(SignInManager<IdentityUser> oturum, ILogger<GirisController> gunluk) : Controller
{
    [AllowAnonymous]
    [HttpGet("/Giris")]
    public IActionResult Index(string? donus)
    {
        if (User.Identity?.IsAuthenticated == true) return Don(donus);
        return View(new GirisKaydi { Donus = donus });
    }

    [AllowAnonymous]
    [HttpPost("/Giris")]
    public async Task<IActionResult> Index(GirisKaydi kayit)
    {
        if (ModelState.IsValid)
        {
            var sonuc = await oturum.PasswordSignInAsync(kayit.Eposta.Trim(), kayit.Parola, kayit.BeniHatirla, lockoutOnFailure: true);
            if (sonuc.Succeeded) return Don(kayit.Donus);
            if (sonuc.IsLockedOut)
            {
                gunluk.LogWarning("Kilitli hesaba giriş denemesi: {Eposta}", kayit.Eposta);
                ViewData["Kilitli"] = true;
            }
            else
            {
                ViewData["Hatali"] = true;
            }
        }
        kayit.Parola = string.Empty;
        return View(kayit);
    }

    [HttpPost("/Cikis")]
    public async Task<IActionResult> Cikis()
    {
        await oturum.SignOutAsync();
        TempData.Basari("Oturum kapatıldı.");
        return Redirect("/Giris");
    }

    /// <summary>Giriş öncesi istenen sayfaya dön; açık yönlendirmeye karşı yalnız yerel adres.</summary>
    private IActionResult Don(string? donus) => Url.IsLocalUrl(donus) ? LocalRedirect(donus) : Redirect("/");
}
