namespace MusteriHesapYonetimi.Application.Ortak;

public enum DurumFiltresi { Aktif, Pasif, Tumu }

public enum SiralamaYonu { Artan, Azalan }

/// <summary>Bir sayfalık sonuç ve toplam kayıt. Sayfa her zaman 1..SonSayfa aralığındadır.</summary>
public sealed record SayfaSonucu<T>(IReadOnlyList<T> Ogeler, int Toplam, int Sayfa, int Boyut)
{
    public int SonSayfa => Sayfalama.SonSayfa(Toplam, Boyut);
    public int Bas => Toplam == 0 ? 0 : (Sayfa - 1) * Boyut + 1;
    public int Bit => Math.Min(Toplam, Sayfa * Boyut);
}

public static class Sayfalama
{
    public static readonly int[] Boyutlar = [10, 25, 50];
    public const int VarsayilanBoyut = 25;

    public static int BoyutDuzelt(int boyut) => Boyutlar.Contains(boyut) ? boyut : VarsayilanBoyut;

    public static int SonSayfa(int toplam, int boyut) => Math.Max(1, (toplam + boyut - 1) / boyut);

    /// <summary>Filtre daralınca eski sayfa numarası boş sayfa göstermesin diye son sayfaya sıkıştırılır.</summary>
    public static int SayfaDuzelt(int sayfa, int toplam, int boyut) => Math.Clamp(sayfa, 1, SonSayfa(toplam, boyut));
}
