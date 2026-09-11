using Microsoft.AspNetCore.Mvc;
using MusteriHesapYonetimi.Application.Ozet;

namespace MusteriHesapYonetimi.Web.Controllers;

public sealed class HomeController(IGenelBakisSorgusu genelBakis) : Controller
{
    public async Task<IActionResult> Index(CancellationToken ct) => View(await genelBakis.OkuAsync(ct));
}
