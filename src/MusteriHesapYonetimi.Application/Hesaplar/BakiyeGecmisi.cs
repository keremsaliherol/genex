using MusteriHesapYonetimi.Application.Ortak;

namespace MusteriHesapYonetimi.Application.Hesaplar;

/// <summary>
/// Güncel bakiyeden geriye yürüyerek her hareketten sonraki bakiyeyi bulur. İşaret kuralı trigger'la aynıdır
/// (BakiyeEtkisi). Ekstredeki SUM() OVER sorgusunun (Faz 3) küçük listeler için uygulama içi karşılığı.
/// </summary>
public static class BakiyeGecmisi
{
    /// <param name="yenidenEskiye">Hesabın en son hareketleri, yeniden eskiye sıralı ve arada boşluk olmadan.</param>
    public static void BakiyeleriDoldur(decimal guncelBakiye, IReadOnlyList<IslemSatiri> yenidenEskiye)
    {
        var bakiye = guncelBakiye;
        foreach (var islem in yenidenEskiye)
        {
            islem.BakiyeSonra = bakiye;
            bakiye -= islem.IsaretliTutar;
        }
    }

    /// <summary>Basamaklı bakiye çizgisinin noktaları, eskiden yeniye: dönem başı, her hareketin sonrası, şimdi.</summary>
    public static IReadOnlyList<BakiyeNoktasi> Noktalar(
        decimal guncelBakiye, IEnumerable<(DateTime Zaman, decimal IsaretliTutar)> yenidenEskiye, DateTime bas, DateTime simdi)
    {
        var noktalar = new List<BakiyeNoktasi> { new(simdi, guncelBakiye) };
        var bakiye = guncelBakiye;
        foreach (var (zaman, isaretliTutar) in yenidenEskiye)
        {
            noktalar.Add(new(zaman, bakiye));
            bakiye -= isaretliTutar;
        }
        noktalar.Add(new(bas, bakiye));
        noktalar.Reverse();
        return noktalar;
    }
}
