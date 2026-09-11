using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;
using MusteriHesapYonetimi.Application.Ortak;
using MusteriHesapYonetimi.Domain;
using MusteriHesapYonetimi.Web.Altyapi;

namespace MusteriHesapYonetimi.Web.TagHelpers;

// Prototipteki util.js yardımcılarının Razor karşılıkları; HTML çıktıları aynıdır.

/// <summary><c>&lt;tutar deger="@x" isaretli="true" /&gt;</c> → ₺1.234,56, işaretliyse +/− ve giriş/çıkış rengi.</summary>
[HtmlTargetElement("tutar", TagStructure = TagStructure.WithoutEndTag)]
public sealed class TutarTagHelper : TagHelper
{
    public decimal Deger { get; set; }
    public bool Isaretli { get; set; }
    public bool Renk { get; set; } = true;

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        var sinif = !Renk ? "" : Deger > 0 && Isaretli ? " tutar--giris" : Deger < 0 ? " tutar--cikis" : "";
        output.TagName = "span";
        output.TagMode = TagMode.StartTagAndEndTag;
        output.Attributes.SetAttribute("class", "tutar" + sinif);
        output.Content.SetContent(TurkceBicim.Para(Deger, Isaretli));
    }
}

[HtmlTargetElement("islem-tipi", TagStructure = TagStructure.WithoutEndTag)]
public sealed class IslemTipiTagHelper(IFileVersionProvider surum) : IkonluTagHelper(surum)
{
    public IslemTipi Deger { get; set; }

    public override void Process(TagHelperContext context, TagHelperOutput output)
        => Rozet(output, Etiketler.IslemEtiketi(Deger));

    internal void Rozet(TagHelperOutput output, (string Ad, string Ikon) etiket)
    {
        output.TagName = "span";
        output.TagMode = TagMode.StartTagAndEndTag;
        output.Attributes.SetAttribute("class", "rozet");
        output.Content.SetHtmlContent(Ikon(etiket.Ikon) + HtmlEncoder.Default.Encode(etiket.Ad));
    }
}

[HtmlTargetElement("musteri-tipi", TagStructure = TagStructure.WithoutEndTag)]
public sealed class MusteriTipiTagHelper(IFileVersionProvider surum) : IkonluTagHelper(surum)
{
    public MusteriTipi Deger { get; set; }

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        var (ad, ikon) = Etiketler.MusteriTipiEtiketi(Deger);
        output.TagName = "span";
        output.TagMode = TagMode.StartTagAndEndTag;
        output.Attributes.SetAttribute("class", "rozet");
        output.Content.SetHtmlContent(Ikon(ikon) + HtmlEncoder.Default.Encode(ad));
    }
}

[HtmlTargetElement("hesap-tipi", TagStructure = TagStructure.WithoutEndTag)]
public sealed class HesapTipiTagHelper(IFileVersionProvider surum) : IkonluTagHelper(surum)
{
    public HesapTipi Deger { get; set; }

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        var (ad, ikon) = Etiketler.HesapTipiEtiketi(Deger);
        output.TagName = "span";
        output.TagMode = TagMode.StartTagAndEndTag;
        output.Attributes.SetAttribute("class", "rozet");
        output.Content.SetHtmlContent(Ikon(ikon) + HtmlEncoder.Default.Encode(ad));
    }
}

/// <summary><c>&lt;durum aktif="@x" /&gt;</c> → Aktif (soluk yeşil zemin) / Pasif.</summary>
[HtmlTargetElement("durum", TagStructure = TagStructure.WithoutEndTag)]
public sealed class DurumTagHelper : TagHelper
{
    public bool Aktif { get; set; }

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        output.TagName = "span";
        output.TagMode = TagMode.StartTagAndEndTag;
        output.Attributes.SetAttribute("class", Aktif ? "rozet rozet--aktif" : "rozet rozet--pasif");
        output.Content.SetContent(Aktif ? "Aktif" : "Pasif");
    }
}

/// <summary>Baş harf rozeti + ad (bağlantı) + alt satır. Kurumsal müşteride rozet vurgu renginde.</summary>
[HtmlTargetElement("kimlik", TagStructure = TagStructure.WithoutEndTag)]
public sealed class KimlikTagHelper : TagHelper
{
    public string Ad { get; set; } = string.Empty;
    public MusteriTipi Tip { get; set; }
    public string? Href { get; set; }
    public string? Alt { get; set; }

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        var e = HtmlEncoder.Default;
        var harfSinifi = Tip == MusteriTipi.Kurumsal ? "kimlik-harf kimlik-harf--kurumsal" : "kimlik-harf";
        var ad = Href is null ? $"<span>{e.Encode(Ad)}</span>" : $"<a href=\"{e.Encode(Href)}\">{e.Encode(Ad)}</a>";
        var alt = string.IsNullOrEmpty(Alt) ? "" : $"<small>{e.Encode(Alt)}</small>";
        output.TagName = "div";
        output.TagMode = TagMode.StartTagAndEndTag;
        output.Attributes.SetAttribute("class", "kimlik");
        output.Content.SetHtmlContent(
            $"<span class=\"{harfSinifi}\" aria-hidden=\"true\">{e.Encode(Etiketler.Harfler(Ad))}</span><div class=\"text-truncate\">{ad}{alt}</div>");
    }
}
