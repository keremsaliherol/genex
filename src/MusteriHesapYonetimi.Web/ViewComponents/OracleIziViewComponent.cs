using Microsoft.AspNetCore.Mvc;
using MusteriHesapYonetimi.Web.Altyapi;

namespace MusteriHesapYonetimi.Web.ViewComponents;

/// <summary>Alt kenardaki Oracle izi paneli. İz kapalıysa (üretim) hiçbir şey çizmez.</summary>
public sealed class OracleIziViewComponent : ViewComponent
{
    public IViewComponentResult Invoke()
        => OracleIzUzantilari.Girdiler(HttpContext) is { } girdiler ? View(girdiler) : Content(string.Empty);
}
