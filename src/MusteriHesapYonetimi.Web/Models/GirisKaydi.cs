using System.ComponentModel.DataAnnotations;

namespace MusteriHesapYonetimi.Web.Models;

/// <summary>Giriş formu (S0). Parola hiçbir zaman forma geri yazılmaz.</summary>
public sealed class GirisKaydi
{
    [Required(ErrorMessage = "E-posta adresini girin.")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi girin.")]
    [StringLength(256, ErrorMessage = "En fazla 256 karakter girin.")]
    public string Eposta { get; set; } = string.Empty;

    [Required(ErrorMessage = "Parolayı girin.")]
    [StringLength(128, ErrorMessage = "En fazla 128 karakter girin.")]
    [DataType(DataType.Password)]
    public string Parola { get; set; } = string.Empty;

    public bool BeniHatirla { get; set; } = true;

    /// <summary>Oturum gerektiren sayfadan gelindiyse o sayfanın yerel adresi.</summary>
    public string? Donus { get; set; }
}
