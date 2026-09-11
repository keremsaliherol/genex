using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace MusteriHesapYonetimi.Web.TagHelpers;

/// <summary>İkon üreten TagHelper'ların ortak tabanı. Sprite sürümlü adresle istenir, tarayıcı önbelleğe alır.</summary>
public abstract class IkonluTagHelper(IFileVersionProvider surum) : TagHelper
{
    public const string SpriteYolu = "/icons/sprite.svg";

    [ViewContext, HtmlAttributeNotBound]
    public ViewContext ViewContext { get; set; } = null!;

    protected string SpriteAdresi() => surum.AddFileVersionToPath(ViewContext.HttpContext.Request.PathBase, SpriteYolu);

    protected string Ikon(string ad, string? sinif = null)
        => $"<svg class=\"ic{(string.IsNullOrEmpty(sinif) ? "" : " " + sinif)}\" aria-hidden=\"true\" focusable=\"false\">"
         + $"<use href=\"{HtmlEncoder.Default.Encode(SpriteAdresi())}#i-{HtmlEncoder.Default.Encode(ad)}\"></use></svg>";
}

/// <summary><c>&lt;ikon ad="users" class="ic-16" /&gt;</c> → Phosphor SVG sembolü.</summary>
[HtmlTargetElement("ikon", TagStructure = TagStructure.WithoutEndTag)]
public sealed class IkonTagHelper(IFileVersionProvider surum) : IkonluTagHelper(surum)
{
    public string Ad { get; set; } = string.Empty;
    public string? Class { get; set; }

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        output.TagName = null;
        output.Content.SetHtmlContent(Ikon(Ad, Class));
    }
}
