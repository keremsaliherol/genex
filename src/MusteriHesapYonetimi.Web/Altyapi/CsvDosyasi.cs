using System.Text;
using Microsoft.AspNetCore.Mvc;
using MusteriHesapYonetimi.Application.Ortak;

namespace MusteriHesapYonetimi.Web.Altyapi;

/// <summary>Ekstre ve rapor CSV'leri: noktalı virgül, UTF-8 BOM, tr-TR ondalık virgül (Türkçe Excel doğrudan açar).</summary>
public static class CsvDosyasi
{
    public static FileContentResult Olustur(string dosyaAdi, IEnumerable<IEnumerable<string?>> satirlar)
    {
        var metin = new StringBuilder();
        foreach (var satir in satirlar) metin.AppendLine(Csv.Satir(satir));
        var icerik = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(metin.ToString())).ToArray();
        return new FileContentResult(icerik, "text/csv; charset=utf-8") { FileDownloadName = dosyaAdi };
    }

    /// <summary>Tutar sütunu: 1234,56 (binlik ayırıcı yok, Excel sayı olarak okur).</summary>
    public static string Tutar(decimal tutar) => tutar.ToString("0.00", TurkceBicim.Kultur);
}
