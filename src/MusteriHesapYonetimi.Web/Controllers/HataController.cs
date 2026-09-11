using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Oracle.ManagedDataAccess.Client;

namespace MusteriHesapYonetimi.Web.Controllers;

/// <summary>404 ve beklenmeyen hata sayfaları (S11). İstek kimliği destek için gösterilir.</summary>
[Route("Hata")]
[ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
public sealed class HataController : Controller
{
    [Route("{kod:int?}")]
    public IActionResult Index(int? kod)
    {
        ViewData["IstekKimligi"] = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        if (kod == StatusCodes.Status404NotFound)
        {
            Response.StatusCode = StatusCodes.Status404NotFound;
            return View("Bulunamadi");
        }

        var hata = HttpContext.Features.Get<IExceptionHandlerPathFeature>()?.Error;
        // Yalnız Oracle hata kodu gösterilir (ör. ORA-12541); diğer istisnaların ayrıntısı günlükte kalır.
        if (hata is OracleException oracle)
        {
            ViewData["Teknik"] = $"ORA-{oracle.Number:00000}";
            ViewData["BaglantiHatasi"] = oracle.Number is 12541 or 12514 or 12170 or 1017 or 12528;
        }
        Response.StatusCode = kod ?? StatusCodes.Status500InternalServerError;
        ViewData["Kod"] = Response.StatusCode;
        return View();
    }
}
