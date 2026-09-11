namespace MusteriHesapYonetimi.Application.Ortak;

/// <summary>Alanı belli bir hata (form alanının altında) ya da alansız hata (formun üstünde veya bildirimde).</summary>
public sealed record AlanHatasi(string? Alan, string Mesaj);

/// <summary>
/// Servis sonucu. İş kuralı ihlalleri istisna değil sonuç olarak döner; Web katmanı alanlı hataları
/// ModelState'e, alansızları bildirime aktarır.
/// </summary>
public class Sonuc
{
    protected Sonuc(IReadOnlyList<AlanHatasi> hatalar) => Hatalar = hatalar;

    public IReadOnlyList<AlanHatasi> Hatalar { get; }
    public bool Basarili => Hatalar.Count == 0;
    public string? Mesaj => Hatalar.Count == 0 ? null : Hatalar[0].Mesaj;

    public static Sonuc Tamam() => new([]);
    public static Sonuc Hata(string mesaj, string? alan = null) => new([new AlanHatasi(alan, mesaj)]);
    public static Sonuc Hata(IReadOnlyList<AlanHatasi> hatalar) => new(hatalar);
}

public sealed class Sonuc<T> : Sonuc
{
    private Sonuc(T? deger, IReadOnlyList<AlanHatasi> hatalar) : base(hatalar) => Deger = deger;

    public T? Deger { get; }

    public static Sonuc<T> Tamam(T deger) => new(deger, []);
    public static new Sonuc<T> Hata(string mesaj, string? alan = null) => new(default, [new AlanHatasi(alan, mesaj)]);
    public static new Sonuc<T> Hata(IReadOnlyList<AlanHatasi> hatalar) => new(default, hatalar);
}
