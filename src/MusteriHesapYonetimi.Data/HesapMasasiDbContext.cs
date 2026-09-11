using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using MusteriHesapYonetimi.Application.Hesaplar;
using MusteriHesapYonetimi.Domain;

namespace MusteriHesapYonetimi.Data;

/// <summary>
/// EF Core eşlemesi. Şema veritabanı betikleriyle yönetilir (db/01_schema.sql); migration kullanılmaz.
/// CRUD okumaları ve müşteri/hesap kayıtları EF Core ile, para hareketleri PKG_ISLEM ile (Dapper) yapılır.
/// </summary>
public class HesapMasasiDbContext(DbContextOptions<HesapMasasiDbContext> options) : DbContext(options)
{
    public DbSet<Musteri> Musteriler => Set<Musteri>();
    public DbSet<Hesap> Hesaplar => Set<Hesap>();
    public DbSet<Islem> Islemler => Set<Islem>();
    public DbSet<Hisse> Hisseler => Set<Hisse>();
    public DbSet<PortfoyPozisyonu> Portfoy => Set<PortfoyPozisyonu>();

    private static ValueConverter<TEnum, string> Kod<TEnum>() where TEnum : struct, Enum
        => new(v => VeritabaniKodu.Yaz(v), s => VeritabaniKodu.Oku<TEnum>(s));

    // 19c'de BOOLEAN kolon yok; AKTIF NUMBER(1) olarak 0/1 tutulur. Oracle sağlayıcısı bool'u NUMBER(1)'e
    // kendisi eşler (19c uyumluluk modunda). Ek bir dönüştürücü eklenmez: sağlayıcının bool eşlemesiyle
    // çakışır ve sorgu üretiminde "Int32 → Boolean" dönüşüm hatası verir.
    private static PropertyBuilder<bool> Bayrak(PropertyBuilder<bool> p) => p.HasColumnType("NUMBER(1)");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Musteri>(e =>
        {
            e.ToTable("MUSTERI");
            e.HasKey(x => x.MusteriId);
            e.Property(x => x.MusteriId).HasColumnName("MUSTERI_ID").ValueGeneratedOnAdd();
            e.Property(x => x.MusteriNo).HasColumnName("MUSTERI_NO").HasMaxLength(20).IsRequired();
            e.Property(x => x.AdSoyad).HasColumnName("AD_SOYAD").HasMaxLength(150).IsRequired();
            e.Property(x => x.Eposta).HasColumnName("EPOSTA").HasMaxLength(150);
            e.Property(x => x.Telefon).HasColumnName("TELEFON").HasMaxLength(20);
            e.Property(x => x.MusteriTipi).HasColumnName("MUSTERI_TIPI").HasMaxLength(20).HasConversion(Kod<MusteriTipi>());
            e.Property(x => x.KayitTarihi).HasColumnName("KAYIT_TARIHI").HasColumnType("DATE").HasDefaultValueSql("SYSDATE");
            Bayrak(e.Property(x => x.Aktif).HasColumnName("AKTIF"));
            e.HasIndex(x => x.MusteriNo).IsUnique();
            e.HasMany(x => x.Hesaplar).WithOne(h => h.Musteri).HasForeignKey(h => h.MusteriId);
        });

        modelBuilder.Entity<Hesap>(e =>
        {
            e.ToTable("HESAP");
            e.HasKey(x => x.HesapId);
            e.Property(x => x.HesapId).HasColumnName("HESAP_ID").ValueGeneratedOnAdd();
            e.Property(x => x.MusteriId).HasColumnName("MUSTERI_ID");
            e.Property(x => x.HesapNo).HasColumnName("HESAP_NO").HasMaxLength(30).IsRequired();
            e.Property(x => x.EkNo).HasColumnName("EK_NO");
            e.Property(x => x.HesapTipi).HasColumnName("HESAP_TIPI").HasMaxLength(20).HasConversion(Kod<HesapTipi>());
            e.Property(x => x.AcilisTarihi).HasColumnName("ACILIS_TARIHI").HasColumnType("DATE").HasDefaultValueSql("SYSDATE");
            Bayrak(e.Property(x => x.Aktif).HasColumnName("AKTIF"));

            // Bakiyeyi yalnız TRG_ISLEM_BAKIYE_GUNCELLE değiştirir: EF Core okur, INSERT/UPDATE'e hiç koymaz.
            var bakiye = e.Property(x => x.Bakiye).HasColumnName("BAKIYE").HasColumnType("NUMBER(18,2)").ValueGeneratedOnAddOrUpdate();
            bakiye.Metadata.SetBeforeSaveBehavior(PropertySaveBehavior.Ignore);
            bakiye.Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Ignore);

            e.HasIndex(x => x.HesapNo).IsUnique();
            e.HasIndex(x => new { x.MusteriId, x.EkNo }).IsUnique();
        });

        modelBuilder.Entity<Islem>(e =>
        {
            e.ToTable("ISLEM");
            e.HasKey(x => x.IslemId);
            e.Property(x => x.IslemId).HasColumnName("ISLEM_ID").ValueGeneratedOnAdd();
            e.Property(x => x.HesapId).HasColumnName("HESAP_ID");
            e.Property(x => x.IslemTipi).HasColumnName("ISLEM_TIPI").HasMaxLength(20).HasConversion(Kod<IslemTipi>());
            e.Property(x => x.Tutar).HasColumnName("TUTAR").HasColumnType("NUMBER(18,2)");
            e.Property(x => x.IslemTarihi).HasColumnName("ISLEM_TARIHI").HasColumnType("TIMESTAMP").HasDefaultValueSql("SYSTIMESTAMP");
            e.Property(x => x.Aciklama).HasColumnName("ACIKLAMA").HasMaxLength(300);
            e.Property(x => x.KarsiHesapId).HasColumnName("KARSI_HESAP_ID");
            e.Property(x => x.ReferansNo).HasColumnName("REFERANS_NO").HasMaxLength(20);
            e.Property(x => x.HisseKodu).HasColumnName("HISSE_KODU").HasMaxLength(10);
            e.Property(x => x.Adet).HasColumnName("ADET").HasColumnType("NUMBER(12)");
            e.Property(x => x.BirimFiyat).HasColumnName("BIRIM_FIYAT").HasColumnType("NUMBER(18,4)");
            e.Ignore(x => x.IsaretliTutar);

            e.HasOne(x => x.Hesap).WithMany(h => h.Islemler).HasForeignKey(x => x.HesapId);
            e.HasOne(x => x.KarsiHesap).WithMany().HasForeignKey(x => x.KarsiHesapId);
            e.HasIndex(x => new { x.HesapId, x.IslemTarihi });
        });

        modelBuilder.Entity<Hisse>(e =>
        {
            e.ToTable("HISSE");
            e.HasKey(x => x.HisseKodu);
            e.Property(x => x.HisseKodu).HasColumnName("HISSE_KODU").HasMaxLength(10);
            e.Property(x => x.Ad).HasColumnName("AD").HasMaxLength(100).IsRequired();
            e.Property(x => x.TemsiliFiyat).HasColumnName("TEMSILI_FIYAT").HasColumnType("NUMBER(18,4)");
            e.Property(x => x.GuncellemeTarihi).HasColumnName("GUNCELLEME_TARIHI").HasColumnType("DATE").HasDefaultValueSql("SYSDATE");
        });

        // Açık hisse pozisyonları: anahtarsız, yalnız okunur view
        modelBuilder.Entity<PortfoyPozisyonu>(e =>
        {
            e.HasNoKey().ToView("VW_PORTFOY");
            e.Property(x => x.HesapId).HasColumnName("HESAP_ID");
            e.Property(x => x.HisseKodu).HasColumnName("HISSE_KODU");
            e.Property(x => x.HisseAd).HasColumnName("HISSE_AD");
            e.Property(x => x.NetAdet).HasColumnName("NET_ADET");
            e.Property(x => x.OrtMaliyet).HasColumnName("ORT_MALIYET");
            e.Property(x => x.TemsiliFiyat).HasColumnName("TEMSILI_FIYAT");
            e.Property(x => x.PiyasaDegeri).HasColumnName("PIYASA_DEGERI");
        });

        OracleFonksiyonlari.Kaydet(modelBuilder);
    }
}
