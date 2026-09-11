using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Web.Altyapi;

namespace MusteriHesapYonetimi.Web.TagHelpers;

/// <summary>
/// Sıralanabilir tablo başlığı: <c>&lt;th sirala="Bakiye" sirala-aktif="@f.Sirala" sirala-yon="@f.Yon" sirala-ilk="Azalan"&gt;</c>.
/// Başlık bir GET bağlantısına dönüşür; aria-sort ekran okuyucuya mevcut sıralamayı söyler.
/// </summary>
[HtmlTargetElement("th", Attributes = "sirala")]
public sealed class SiralaTagHelper(IFileVersionProvider surum) : IkonluTagHelper(surum)
{
    public string Sirala { get; set; } = string.Empty;

    [HtmlAttributeName("sirala-aktif")]
    public object? AktifAnahtar { get; set; }

    [HtmlAttributeName("sirala-yon")]
    public SiralamaYonu Yon { get; set; }

    /// <summary>Sütuna ilk tıklamadaki yön (tutar ve tarihte büyükten küçüğe daha kullanışlı).</summary>
    [HtmlAttributeName("sirala-ilk")]
    public SiralamaYonu IlkYon { get; set; } = SiralamaYonu.Artan;

    public override async Task ProcessAsync(TagHelperContext context, TagHelperOutput output)
    {
        var etiket = (await output.GetChildContentAsync()).GetContent();
        var aktif = string.Equals(AktifAnahtar?.ToString(), Sirala, StringComparison.OrdinalIgnoreCase);
        var azalan = Yon == SiralamaYonu.Azalan;
        var yeniYon = aktif ? (azalan ? SiralamaYonu.Artan : SiralamaYonu.Azalan) : IlkYon;
        var adres = SorguDizesi.Degistir(ViewContext.HttpContext.Request,
            ("sirala", Sirala.ToLowerInvariant()), ("yon", yeniYon), ("sayfa", null));
        var ikon = aktif ? (azalan ? "arrow-down" : "arrow-up") : "caret-up-down";

        output.Attributes.SetAttribute("scope", "col");
        output.Attributes.SetAttribute("aria-sort", aktif ? (azalan ? "descending" : "ascending") : "none");
        output.Attributes.RemoveAll("sirala");
        output.Content.SetHtmlContent(
            $"<a class=\"sirala\" href=\"{HtmlEncoder.Default.Encode(adres)}\" data-canli>{etiket}{Ikon(ikon, "ic-14")}</a>");
    }
}
