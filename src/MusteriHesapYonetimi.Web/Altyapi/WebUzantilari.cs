using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using MusteriHesapYonetimi.Application.Ortak;

namespace MusteriHesapYonetimi.Web.Altyapi;

public static class WebUzantilari
{
    /// <summary>Servis hatalarını forma aktarır: alanlı hata alanın altına, alansız hata formun üstündeki özete.</summary>
    public static void SonucuAktar(this ModelStateDictionary modelState, Sonuc sonuc)
    {
        foreach (var hata in sonuc.Hatalar) modelState.AddModelError(hata.Alan ?? string.Empty, hata.Mesaj);
    }

    /// <summary>POST → Redirect → GET sonrasında gösterilen bildirim (toast). Geri al adresi bir POST eylemidir.</summary>
    public static void Basari(this ITempDataDictionary tempData, string mesaj, string? geriAlAdresi = null)
    {
        tempData["Bildirim"] = mesaj;
        tempData["BildirimTur"] = "basari";
        if (geriAlAdresi is not null) tempData["BildirimGeriAl"] = geriAlAdresi;
    }

    public static void Hata(this ITempDataDictionary tempData, string mesaj)
    {
        tempData["Bildirim"] = mesaj;
        tempData["BildirimTur"] = "hata";
    }

    /// <summary>Model bağlama hatalarının Türkçe metinleri (varsayılanlar İngilizce).</summary>
    public static void Turkcelestir(this DefaultModelBindingMessageProvider m)
    {
        m.SetValueMustNotBeNullAccessor(_ => "Bu alan boş bırakılamaz.");
        m.SetMissingBindRequiredValueAccessor(_ => "Bu alan zorunlu.");
        m.SetMissingKeyOrValueAccessor(() => "Değer zorunlu.");
        m.SetMissingRequestBodyRequiredValueAccessor(() => "İstek gövdesi boş olamaz.");
        m.SetAttemptedValueIsInvalidAccessor((deger, _) => $"'{deger}' geçerli bir değer değil.");
        m.SetNonPropertyAttemptedValueIsInvalidAccessor(deger => $"'{deger}' geçerli bir değer değil.");
        m.SetUnknownValueIsInvalidAccessor(_ => "Girilen değer geçersiz.");
        m.SetNonPropertyUnknownValueIsInvalidAccessor(() => "Girilen değer geçersiz.");
        m.SetValueIsInvalidAccessor(deger => $"'{deger}' geçersiz.");
        m.SetValueMustBeANumberAccessor(_ => "Sayı girin.");
        m.SetNonPropertyValueMustBeANumberAccessor(() => "Sayı girin.");
    }
}
