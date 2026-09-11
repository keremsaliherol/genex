using MusteriHesapYonetimi.Application.Islemler;
using MusteriHesapYonetimi.Web.Altyapi;

namespace MusteriHesapYonetimi.Web.Api;

/// <summary>İşlem formundaki hesabın JSON biçimi; API ucu ve sayfaya gömülen ilk değer aynı şekli kullanır.</summary>
public static class IslemApi
{
    public static object Hesap(IslemHesabi h) => new
    {
        h.Id,
        no = h.HesapNo,
        musteriAd = h.MusteriAd,
        tip = h.Tip.ToString(),
        tipAd = Etiketler.HesapTipiEtiketi(h.Tip).Ad,
        bakiye = h.Bakiye,
        aktif = h.Aktif,
        musteriAktif = h.MusteriAktif,
        portfoy = h.Portfoy.Select(p => new { kod = p.HisseKodu, adet = p.Adet })
    };
}
