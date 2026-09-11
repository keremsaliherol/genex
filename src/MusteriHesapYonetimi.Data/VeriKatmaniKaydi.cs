using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MusteriHesapYonetimi.Application.Hesaplar;
using MusteriHesapYonetimi.Application.Musteriler;
using MusteriHesapYonetimi.Application.Ozet;
using MusteriHesapYonetimi.Application.Sistem;
using MusteriHesapYonetimi.Data.Hesaplar;
using MusteriHesapYonetimi.Data.Musteriler;
using MusteriHesapYonetimi.Data.Ozet;
using MusteriHesapYonetimi.Data.Sistem;
using Oracle.EntityFrameworkCore.Infrastructure;

namespace MusteriHesapYonetimi.Data;

public static class VeriKatmaniKaydi
{
    public static IServiceCollection AddVeriKatmani(this IServiceCollection services, string baglantiCumlesi)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(baglantiCumlesi);

        // Geliştirme veritabanı 26ai, hedef 19c: SQL üretimi 19c'ye sabitlenir
        // (ör. bool alanlar BOOLEAN değil NUMBER(1) olarak kalır, 23ai'ye özel söz dizimi üretilmez).
        services.AddDbContext<HesapMasasiDbContext>(o => o.UseOracle(baglantiCumlesi,
            oracle => oracle.UseOracleSQLCompatibility(OracleSQLCompatibility.DatabaseVersion19)));

        services.AddSingleton(new OracleBaglantiFabrikasi(baglantiCumlesi));
        services.AddScoped<ISistemDurumuSorgusu, SistemDurumuSorgusu>();
        services.AddScoped<IMusteriServisi, MusteriServisi>();
        services.AddScoped<IHesapServisi, HesapServisi>();
        services.AddScoped<IGenelBakisSorgusu, GenelBakisSorgusu>();
        return services;
    }
}
