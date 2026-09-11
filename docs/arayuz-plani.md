# Hesap Masası: arayüz planı ve tıklanabilir demo

## Bağlam
Genex Yazılım görüşmesi için `musteri_hesap_yonetim_proje_speq.md`'deki Müşteri/Hesap Yönetim Sistemi (ASP.NET Core MVC + Oracle + PL/SQL) portföy projesi. Bu görevin amacı, kodlamaya geçmeden önce (1) tüm ekranların detaylı arayüz planını çıkarmak, (2) bu planın tıklanabilir ve gerçekçi bir demosunu göstermek. Demo, sonraki fazda Razor view'larına birebir taşınacak şekilde kurulur: aynı Bootstrap 5.3 temeli, aynı tema token'ları, aynı rota yapısı, aynı ikon seti.

Ortam: Node v24 kurulu. .NET SDK, Docker ve Python yok (Python olmadığı için ui-ux-pro-max'in arama betiği çalışmadı, onun Quick Reference kuralları kullanılıyor). Claude Design (DesignSync) bu oturumda yetkisiz (interaktif terminalde `/design-login` gerekiyor); kullanıcı tercihiyle demo **Artifact** olarak sunulacak.

Ürün adı önerisi: **Hesap Masası** (değiştirilebilir).

## Bu görevin çıktıları
1. `genex/docs/arayuz-plani.md`: bu planın proje içindeki kopyası (README ve görüşme için).
2. `genex/DESIGN.md`: stitch-skill formatında tasarım sistemi (sonraki fazda `wwwroot/css/theme.css`'in kaynağı).
3. `genex/prototype/`: kaynak dosyalar + `build.mjs` → `dist/index.html` (tek başına açılır) ve `dist/artifact.html`.
4. Yayınlanmış Artifact "Hesap Masası": özel link, tıklanabilir, açık/koyu tema. Ekran görüntüleri de gönderilir.

Kapsam dışı (sonraki faz): .NET çözümü, Oracle şeması/PL-SQL, testler.

## Tasarım okuması ve skill kullanımı
**Okuma (taste-skill 0.B):** Aracı kurum/banka için iç operasyon konsolu. Kullanıcı operasyon personeli; izleyen kişi sermaye piyasası yazılımı yapan bir firmanın teknik yöneticisi. Dil güven veren, kesin, veri yoğun ama sakin. Temel olarak Bootstrap 5.3 + kendi token temamız, Geist + Geist Mono ve ölçülü hareket.
**Dial'lar:** DESIGN_VARIANCE 3, MOTION_INTENSITY 3, VISUAL_DENSITY 7.

| Skill | Nasıl uygulanıyor |
|---|---|
| taste-skill | Dashboard'ları kapsam dışı sayıyor (§13), bu yüzden yalnız genel kuralları: tek vurgu rengi kilidi, köşe yarıçapı kilidi, Inter yok, em-dash yasağı, tam durum döngüsü (yükleniyor/boş/hata), etiket inputun üstünde, sahte-kesin sayı yok (demo verisi etiketli), Bootstrap resmi paketi elle taklit edilmez (§2.A). |
| frontend-design | Token planı, tek imza öğesi (Oracle izi), metin kuralları, eleştiri turu. |
| stitch-skill | `DESIGN.md` formatı. Dashboard için yalnız sans (Geist/Geist Mono); yoğunluk > 7 olduğundan tutarlar mono. |
| design-system | 3 katmanlı token: primitive → semantic → component. `--bs-*` eşlemesi component katmanında. |
| ui-ux-pro-max | Quick Reference: 4.5:1 kontrast, focus ring, skip link, aria-sort, blur'da form doğrulama, geri alınamaz işlemde onay, grafiklerde tablo alternatifi, tr-TR sayı biçimi. |
| redesign-skill | Tabular rakamlar, saf siyah/beyaz yok, aktif menü durumu, kare-yuvarlak avatar, 404/hata sayfaları. |
| minimalist-skill | Durum rozetlerinde soluk zemin + koyu metin tekniği. |
| output-skill | Prototipte yer tutucu veya yarım ekran yok; her ekran ve durum eksiksiz. |
| dataviz, artifact-design (yerleşik) | Grafik kodundan ve Artifact yazımından önce yüklenecek. |
| Uygulanmayanlar | imagegen-frontend-web, gpt-tasteskill, soft-skill pazarlama sayfası odaklı (görsel/GSAP ağırlıklı), back-office'e uymaz. design-dna için referans görsel yok. brutalist-skill banka güven diline ters. |

## Görsel sistem (seçilen yön: "Kurumsal güven")
**Renk (tek vurgu: kobalt)**

| Token | Açık | Koyu | Kullanım |
|---|---|---|---|
| `--canvas` | #F3F5F8 | #0E121A | sayfa zemini |
| `--surface` | #FCFCFD | #151B25 | panel, tablo |
| `--surface-2` | #F7F8FA | #1B2230 | tablo başlığı, hover |
| `--line` | #E2E6ED | #273142 | 1px ayraçlar |
| `--ink` | #141A26 | #E6EAF1 | ana metin |
| `--ink-2` | #525C70 | #A6B0C2 | ikincil metin |
| `--ink-3` | #6B7489 | #8791A5 | yer tutucu, meta (yalnız yüzey üzerinde, AA) |
| `--accent` | #2446C8 | #7D96F2 | birincil eylem, odak, aktif menü |
| `--accent-soft` | #E9EEFC | #1C2748 | seçili satır, aktif menü zemini |
| `--credit` | #17744A / #E7F4ED | #55C592 / #12291F | giriş (+) |
| `--debit` | #B42318 / #FCEBE9 | #F28B82 / #3A1A18 | çıkış (-) |
| `--warn` | #935A00 / #FDF3DB | #E8B45A / #33270F | uyarı |

- **Tipografi:** Geist 400/500/600 (arayüz, başlık); Geist Mono (tutar, hesap/müşteri no, SQL). Ölçek 12/13/14/16/20/24/30 px; gövde 14, tablo 13, sayfa başlığı 24/600; sayılar `tabular-nums`. Türkçe karakterler latin-ext ile; üretimde font self-host edilir.
- **Şekil kilidi:** kontroller (buton, input, select) 6px; paneller ve diyaloglar 10px; rozetler 4px. Pill yok.
- **Yükseklik:** düz. Paneller 1px çizgiyle ayrılır; gölge yalnız dropdown, modal ve drawer'da, mürekkep tonlu.
- **İkon:** Phosphor Regular, 20px (tabloda 16px), tek aile; `@phosphor-icons/core` npm paketinden inline SVG sprite. Logo işareti: kobalt kare içinde Phosphor `vault`.
- **Hareket:** hover/press 150-200ms ease-out (basışta `scale(.98)`), drawer/offcanvas 220ms, rota değişiminde 250ms iskelet. `prefers-reduced-motion`'da hepsi kapalı.
- **Yoğunluk:** tablo satırı 40px, hücre 8×12px, sayfa kenar boşluğu 24px, en fazla 1600px genişlik.

## İmza öğesi: Oracle izi
Alt kenara yapışık, açılıp kapanan panel (üst çubukta "Oracle izi" düğmesi). Ekranın veya aksiyonun veritabanında ne çalıştırdığını gösterir: katman etiketi (EF Core, Dapper, Paket, Trigger, View), renklendirilmiş SQL/PL-SQL, bind değerleri, etkilenen satır, temsili süre. Örnekler:
- Müşteri listesi: EF Core'un ürettiği `SELECT ... OFFSET :p0 ROWS FETCH NEXT :p1 ROWS ONLY`.
- Para yatırma: `INSERT INTO ISLEM` → `TRG_ISLEM_BAKIYE_GUNCELLE` → `UPDATE HESAP SET BAKIYE`, önce/sonra bakiye.
- Transfer: tek `PKG_ISLEM.TRANSFER` çağrısı. İki `HESAP` satırı `HESAP_ID` sırasıyla `FOR UPDATE` kilitlenir (deadlock önlemi), iki ISLEM kaydı, iki trigger, tek COMMIT.
- Aylık özet: `BEGIN PKG_RAPOR.AYLIK_OZET_HESAP(:id, :yil, :ay, :cur); END;` (Dapper + `OracleRefCursor`).

Görüşmedeki değeri: arayüz gezilirken veritabanı katmanı da anlatılmış olur. Sonraki fazdaki gerçek karşılığı: EF Core `DbCommandInterceptor` + Dapper sarmalayıcısı → istek kapsamlı toplayıcı → yalnız Development/Demo ortamında görünen `OracleIzi` ViewComponent.

## Bilgi mimarisi
Kabuk (`_Layout.cshtml`):
```
┌─────────────┬──────────────────────────────────────────────────────────────┐
│ ▣ Hesap     │ Müşteriler / Deniz Aksoy    [Ara  Ctrl+K]  [Oracle izi] [admin▾]│
│   Masası    ├──────────────────────────────────────────────────────────────┤
│ Genel bakış │ Sayfa başlığı                                [Birincil eylem] │
│ Müşteriler  │ ...içerik...                                                 │
│ Hesaplar    │                                                              │
│ İşlem yap   │                                                              │
│ Ekstre      │                                                              │
│ Raporlar    │                                                              │
│─────────────│                                                              │
│ ● XEPDB1    ├──────────────────────────────────────────────────────────────┤
│ Demo verisi │ ▸ Oracle izi                                                 │
└─────────────┴──────────────────────────────────────────────────────────────┘
```
- Sidebar 232px; 1024-1279px'de 64px ikon rayı; 768px altında offcanvas. Sidebar tercihi bilinçli: 6 modüllü back-office ve geniş ekran.
- Üst çubuk: breadcrumb, genel arama (müşteri no/ad, hesap no; Ctrl+K odaklar, açılır sonuç listesi), Oracle izi, kullanıcı menüsü (Görünüm: Sistem/Açık/Koyu, Demo kontrolleri, Çıkış).
- Sidebar altı: bağlantı durumu (tek semantik nokta) ve "Demo verisi, kurgusal" etiketi.

### Rota haritası
| Ekran | Rota | Controller.Action | Erişim | Oracle nesnesi |
|---|---|---|---|---|
| Giriş | `/Giris` | GirisController.Index | Identity | Identity tabloları |
| Genel bakış | `/` | HomeController.Index | Dapper | VW_EN_AKTIF_MUSTERILER, günlük hacim sorgusu |
| Müşteri listesi | `/Musteri` | MusteriController.Index | EF Core | MUSTERI |
| Müşteri detay | `/Musteri/Detay/{id}` | Detay | EF Core | MUSTERI, HESAP |
| Müşteri ekle/düzenle | `/Musteri/Yeni`, `/Musteri/Duzenle/{id}` | Yeni, Duzenle | EF Core | MUSTERI |
| Hesap listesi | `/Hesap` | HesapController.Index | EF Core | HESAP |
| Hesap detay | `/Hesap/Detay/{id}` | Detay | EF Core + Dapper | HESAP, VW_PORTFOY |
| Hesap aç | `/Hesap/Yeni?musteriId=` | Yeni | EF Core | HESAP |
| Ekstre | `/Hesap/Ekstre/{id}?bas=&bit=` | Ekstre | Dapper | ISLEM + `SUM() OVER` |
| İşlem yap | `/Islem/Yeni?hesapId=&tip=` | IslemController.Yeni | Dapper | PKG_ISLEM, TRG_ISLEM_BAKIYE_GUNCELLE |
| Dekont | `/Islem/Dekont/{id}` | Dekont | EF Core | ISLEM |
| Aylık özet | `/Rapor/AylikOzet` | RaporController.AylikOzet | Dapper, REF CURSOR | PKG_RAPOR.AYLIK_OZET_* |
| Bakiye değişimi | `/Rapor/BakiyeDegisimi` | BakiyeDegisimi | Dapper, REF CURSOR | PKG_RAPOR.BAKIYE_DEGISIMI |
| En aktif | `/Rapor/EnAktif` | EnAktif | Dapper | VW_EN_AKTIF_MUSTERILER, VW_EN_AKTIF_HESAPLAR |

## Ekranlar
### S0 Giriş `/Giris`
- İki kolon (5/7). Solda form: E-posta, Parola (göster/gizle), Beni hatırla, [Giriş yap]. Altında yardım metni: "Demo hesabı: admin@hesapmasasi.local / demo".
- Sağda koyu kobalt yüzey: ürün adı, tek cümle ("Müşteri, hesap ve işlem yönetimi. Oracle ve .NET ile.") ve soluk, mono bir ekstre dökümü dokusu (konunun kendi malzemesi, dekoratif çizim yok).
- Durumlar: hatalı giriş ("E-posta veya parola hatalı."), gönderiliyor (buton kilitli), 5 hatalı denemede kilit mesajı. 768px altında sağ panel gizlenir.

### S1 Genel bakış `/`
```
Genel bakış   10 Eylül 2026                                        [İşlem yap]
────────────────────────────────────────────────────────────────────────────────
Aktif müşteri  │ Açık hesap │ Toplam bakiye      │ Bugün: işlem / hacim
176            │ 318        │ ₺148.736.420,55    │ 41 / ₺1.284.310,00
────────────────────────────────────────────────────────────────────────────────
İşlem hacmi, son 30 gün (giriş/çıkış)          │ En aktif müşteriler
[ıraksak çubuk grafik]                         │ 1  Karadeniz Lojistik A.Ş.  84
                                               │ 2  Deniz Aksoy              61
Son işlemler                     Tümünü gör →  │ Hesap tipi dağılımı
zaman  hesap no  müşteri  tip  tutar  açıklama │ [vadesiz ▇▇▇▇▇▇ yatırım ▇▇▇]
```
- KPI şeridi: çizgiyle ayrılmış 4 metrik, tek satır (3 eş kart yok). Değerler veriden hesaplanır.
- Tek birincil eylem: İşlem yap. Durumlar: boş sistem ("Henüz müşteri yok. İlk müşteriyi ekleyin." + Yeni müşteri), iskelet, hata.

### S2 Müşteri listesi `/Musteri`
- Başlık + sayaç + [Yeni müşteri].
- Filtre çubuğu: arama (ad, müşteri no, e-posta, telefon; 300ms debounce), tip segmenti (Tümü/Bireysel/Kurumsal), durum (Aktif/Pasif/Tümü), kayıt tarihi aralığı. Filtreler URL sorgusunda (paylaşılabilir, geri tuşunda korunur).
- Tablo: Müşteri no, Ad soyad/Ünvan (baş harf rozeti), Tip, E-posta, Telefon, Hesap sayısı, Toplam bakiye (sağa hizalı mono), Kayıt tarihi, Durum, ⋯ (Detay, Düzenle, Hesap aç, Pasife al).
- Sıralanabilir başlıklar (aria-sort), yapışkan başlık, sayfalama "1-25 / 176" + sayfa boyutu.
- Pasife al: onay diyaloğu ("Hesaplar ve işlem geçmişi korunur."). Bakiyeli hesabı varsa engellenir ve nedeni yazılır. Başarıda "Müşteri pasife alındı" + Geri al.
- Durumlar: iskelet satırlar, "'xyz' için sonuç yok" + Filtreleri temizle, bağlantı hatası (ORA kodu katlanır detayda).

### S3 Müşteri detay `/Musteri/Detay/{id}`
- Başlık: ad, müşteri no (kopyala), tip, durum. [Hesap aç] birincil, [Düzenle] ikincil, ⋯ Pasife al.
- Sol (4/12) profil listesi: yalnız şemadaki alanlar (e-posta, telefon, tip, kayıt tarihi, durum) + hesaplananlar (toplam bakiye, hesap sayısı, son işlem).
- Sağ (8/12) sekmeler: Hesaplar (satırda Detay/Ekstre/İşlem yap), Son işlemler (tüm hesaplar), Aylık özet (rapora önceden doldurulmuş bağlantı + mini tablo).

### S4 Müşteri ekle/düzenle
- Tek kolon (en fazla 640px). Kimlik grubu: tip segmenti (kurumsalda etiket "Ünvan" olur), müşteri no + "Otomatik oluştur". İletişim grubu: e-posta (`type=email`), telefon (`type=tel`, +90 maskesi).
- Doğrulama: etiket üstte, zorunlu işareti, hata altta, blur'da kontrol. Gönderimde üstte hata özeti ve ilk hatalı alana odak. Benzersizlik hatası: "Bu müşteri no kayıtlı: 40218375 (Deniz Aksoy)" (ORA-00001 eşlemesi).
- Yapışkan alt eylem çubuğu: [Kaydet] + Vazgeç. Kaydedilmemiş değişiklikte ayrılma uyarısı. Düzenlemede kayıt tarihi salt okunur.

### S5 Hesap listesi `/Hesap`
- Tablo: Hesap no (mono), Müşteri (bağlantı), Tip, Bakiye, Açılış, Son hareket, Durum, ⋯. Filtre: arama, tip, durum, müşteri. Alt satırda filtrelenmiş toplam bakiye.

### S6 Hesap detay `/Hesap/Detay/{id}`
- Başlık: büyük mono hesap no (kopyala), tip, müşteri bağlantısı, durum. [İşlem yap ▾] (Yatır, Çek, Transfer, Hisse al/sat), [Ekstre], ⋯ Pasife al (bakiye sıfır değilse pasif ve gerekçesi gösterilir).
- Bakiye bloğu: büyük mono bakiye, son 30 gün giriş/çıkış, 90 günlük basamaklı bakiye sparkline.
- Sekmeler: Hareketler (son 20 + Ekstreye git), Portföy (yalnız YATIRIM: hisse, adet, ort. maliyet, temsili fiyat, piyasa değeri, K/Z), Aylık özet.

### S7 Hesap aç `/Hesap/Yeni?musteriId=`
- Müşteri seçici (bağlamdan dolu), hesap tipi seçim kartları (Vadesiz: yatır/çek/transfer; Yatırım: bunlara ek hisse alım-satım), hesap no önizlemesi `1001-40218375-03` (şube, müşteri no, ek no; salt okunur, açıklamalı), açılış tutarı (opsiyonel; 0'dan büyükse "Açılış bakiyesi" açıklamalı YATIRMA işlemi oluşur, BAKIYE'ye doğrudan yazılmaz).
- Başarı: "Hesap açıldı: 1001-40218375-03" + [İlk işlemi yap] / Hesaba git.

### S8 İşlem yap `/Islem/Yeni?hesapId=&tip=` (demonun merkezi)
```
İşlem yap
┌─ İşlem ──────────────────────────────────┐ ┌─ Önizleme ───────────────────────┐
│ Hesap     [1001-40218375-01          ▾]  │ │ Transfer, çift kayıt             │
│           Deniz Aksoy, Vadesiz           │ │ 1001-40218375-01  TRANSFER_GIDEN │
│           Bakiye ₺84.215,40              │ │   ₺84.215,40 → ₺76.075,15        │
│ Tip  (Yatır)(Çek)(Transfer)(Al)(Sat)     │ │ 1001-51720044-01  TRANSFER_GELEN │
│ Hedef     [1001-51720044-01          ▾]  │ │   ₺3.400,00 → ₺11.540,25         │
│ Tutar     ₺ [8.140,25]                   │ │ İki kayıt tek transaction içinde │
│ Açıklama  [Kira ödemesi       ] 13/300   │ │ yazılır ya da hiçbiri yazılmaz.  │
└──────────────────────────────────────────┘ │            [İşlemi onayla]       │
                                             └──────────────────────────────────┘
```
- Tip segmenti ikonlu; Vadesiz hesapta hisse seçenekleri pasif ve nedeni yazılı.
- Alanlar tipe göre: Yatır/Çek → tutar, açıklama (300 karakter sayacı). Transfer → hedef hesap (kaynak hariç, başka müşteri olabilir). Hisse al/sat → hisse (temsili fiyatlı liste), adet, hesaplanan tutar (salt okunur).
- Anlık doğrulama: yetersiz bakiye ("Kullanılabilir: ₺2.140,00"), tutar > 0 ve en fazla 2 ondalık, pasif hesap, aynı hesaba transfer, satışta adet ≤ pozisyon.
- Önizleme: tekli işlemde önce → sonra bakiye (işaret ve ok ikonu, yalnız renge dayanmaz); transferde çift kayıt önizlemesi.
- Akış: [İşlemi onayla] → özet onay diyaloğu → buton "İşleniyor" durumunda kilitli → dekont `/Islem/Dekont/{id}` (işlem no, referans no, zaman damgası, tip, tutar, hesap(lar), yeni bakiye; Yazdır, Yeni işlem, Hesaba git) ve Oracle izi güncellenir.
- Hata: veritabanı reddi (ör. eşzamanlı işlem sonrası ORA-20001) satır içi uyarı + katlanır teknik detay.

### S9 Hesap ekstresi `/Hesap/Ekstre/{id}?bas=&bit=&tip=`
- Başlık: hesap no, müşteri. Tarih aralığı ön ayarları (Bu ay, Geçen ay, Son 3 ay, Özel) + işlem tipi çoklu seçim. [Yazdır] [CSV indir].
- Özet şeridi: dönem başı bakiye, toplam giriş, toplam çıkış, dönem sonu bakiye (başı + giriş - çıkış = sonu, veriyle tutarlı).
- Tablo: Tarih-saat, İşlem no, Açıklama, Tip, Karşı hesap (transferde bağlantı), Tutar (±), Bakiye (yürüyen; Oracle izinde `SUM() OVER (ORDER BY ISLEM_TARIHI, ISLEM_ID)`); gün ayraç satırları.
- Yazdırma CSS'i: kurgusal kurum başlığı, hesap bilgileri, dönem, tablo, "Demo belgesidir" notu. Boş durum: "Bu aralıkta hareket yok." + Aralığı genişlet.

### S10 Raporlar `/Rapor/...` (üstte sekme gezinmesi)
- **Aylık özet:** parametre çubuğu (Kapsam: Hesap/Müşteri, seçici, Yıl, Ay) + [Raporu çalıştır] → işlem tipine göre adet/toplam tablosu + toplam satırı + yatay çubuk grafik. "Çalıştırılan: PKG_RAPOR.AYLIK_OZET_HESAP" çipi Oracle izini açar.
- **Bakiye değişimi:** hesap + tarih aralığı → basamaklı çizgi grafik (bakiye yalnız işlem anında değişir), özet (başlangıç, bitiş, net değişim, en yüksek/en düşük), "Tablo olarak göster" (erişilebilirlik alternatifi).
- **En aktif:** Müşteriler/Hesaplar anahtarı, N (5/10/20), dönem (Son 30 gün/Bu yıl/Tümü) → sıralı tablo (sıra, ad, işlem adedi, hacim, zeminsiz satır içi çubuk).
- Hepsinde CSV indir, Yazdır, iskelet/boş/hata durumları.

### S11 Yardımcı ekranlar
404 ("Sayfa bulunamadı" + Genel bakışa dön) ve Hata (istek kimliğiyle, ASP.NET `TraceIdentifier` gibi).

## Ortak bileşenler ve Razor karşılıkları
| Bileşen | Razor karşılığı |
|---|---|
| Sayfa başlığı (başlık, alt başlık, eylemler) | `_SayfaBasligi` partial |
| Veri tablosu, sıralama, sayfalama | `_Sayfalama` partial + sıralama TagHelper |
| Filtre çubuğu | GET form partial (URL sorgusu) |
| Tutar | `<tutar deger="" isaretli="true">` TagHelper (tr-TR, mono, işaret, renk sınıfı) |
| İşlem tipi rozeti | `<islem-tipi deger="TRANSFER_GIDEN">` (ikon + etiket) |
| Durum rozeti | `<durum aktif="true">` |
| Hesap/müşteri no + kopyala | partial + küçük JS |
| Hesap seçici (aramalı) | partial + `/api/hesap/ara?q=` JSON |
| Tarih aralığı + ön ayarlar | partial, native `input[type=date]` |
| Boş / iskelet / hata uyarısı | partial'lar |
| Onay diyaloğu, toast | Bootstrap modal/toast + `TempData` |
| Grafikler | Chart.js + küçük sarmalayıcı |
| Oracle izi | `OracleIzi` ViewComponent |
| İkon | `<ikon ad="vault">` TagHelper → SVG sprite |

İşlem tipi eşlemesi: YATIRMA (arrow-down-left), CEKME (arrow-up-right), TRANSFER_GELEN/TRANSFER_GIDEN (arrows-left-right), ALIM (trend-up), SATIM (trend-down). Tutarın rengi ve işareti bakiye etkisinden gelir; rozet işlemin türünü anlatır.

## Hata eşleme (Oracle → arayüz)
| Oracle | Mesaj | Yer |
|---|---|---|
| ORA-00001 (MUSTERI_NO) | "Bu müşteri no zaten kayıtlı." | alanın altı |
| ORA-20001 (paket) | "Yetersiz bakiye. Kullanılabilir: ₺..." | tutar alanı + önizleme |
| ORA-20002 (paket) | "Bu hesap pasif. İşlem yapılamaz." | form üstü |
| ORA-20003 (paket) | "Satılabilir adet: 120" | adet alanı |
| ORA-12541 / ORA-12514 | "Veritabanına ulaşılamıyor. Bağlantıyı kontrol edip tekrar deneyin." | sayfa içi uyarı + Tekrar dene |

ORA kodu ve istek kimliği katlanır "Teknik detay" alanında gösterilir.

## Arayüzün gerektirdiği şema notları (sonraki faza)
1. Hisse işlemleri: `HISSE(HISSE_KODU, AD, TEMSILI_FIYAT)`; `ISLEM`'e nullable `HISSE_KODU`, `ADET`, `BIRIM_FIYAT`; pozisyonlar için `VW_PORTFOY`. Şartnamedeki şema adet/fiyat tutmuyor, portföy ekranı bunları gerektiriyor.
2. `ISLEM.REFERANS_NO`: transferin iki ayağını bağlar, dekontta gösterilir.
3. `HESAP` üzerinde `CHECK (BAKIYE >= 0)`: paket kontrolüne ek güvence.
4. `PKG_ISLEM` (YATIR, CEK, TRANSFER, HISSE_AL, HISSE_SAT), `PKG_RAPOR` (AYLIK_OZET_HESAP = şartnamedeki SP, AYLIK_OZET_MUSTERI, BAKIYE_DEGISIMI), `VW_EN_AKTIF_HESAPLAR`.
5. İyileştirme: şartnamedeki `EXTRACT(YEAR/MONTH FROM ISLEM_TARIHI)` koşulu `IDX_ISLEM_TARIH` index'ini kullanamaz; aralık koşulu (`>= TRUNC(...)` ve `< ADD_MONTHS(...)`) kullanılacak. View içindeki `ORDER BY` sıralamayı garanti etmez; sıralama sorguya taşınacak. İkisi de Oracle izinde görünür ve görüşmede konuşulacak iyi detaylardır.

## İçerik ve dil
- Arayüz Türkçe, cümle düzeninde ("Yeni müşteri"), etken fiillerle ("Kaydet", "Hesabı aç", "İşlemi onayla"). Eylem adı akış boyunca aynı kalır ("Pasife al" → "Pasife alındı").
- Ünlem yok, em-dash/en-dash yok (taste 9.G). Hata mesajları neden ve çözümü söyler.
- Biçimler: `Intl.NumberFormat('tr-TR')` ile ₺1.234,56; tarih 10.09.2026 14:32, uzun tarih "10 Eylül 2026"; hesap ve müşteri no mono.
- Adlar gerçekçi ve çeşitli, klişe yok; şirketler kurgusal.

## Demo verisi
- Tohumlu üretici: yaklaşık 180 müşteri (%85 bireysel), 320 hesap, 1 Mart - 10 Eylül 2026 arası 6.000 işlem, temsili fiyatlı 8 BIST hissesi.
- Bakiyeler işlemlerden trigger kurallarıyla türetilir (doğrudan yazılmaz), böylece her ekran tutarlı.
- Kullanıcı eylemleri (yeni müşteri, işlem) localStorage'da olay günlüğü olarak tutulur ve tohum verinin üstüne yeniden oynatılır; "Demo verisini sıfırla" temizler. Görüşmede canlı işlem yapılıp etkisi tüm ekranlarda görülebilir.
- Aynı üretici sonraki fazda `db/seed.sql` üretir; README ekran görüntüleri ile gerçek uygulama aynı veriyi gösterir.
- Kişisel veri yok: e-postalar `example.com`, telefonlar kurgusal; ekranda "Demo verisi, kurgusal" etiketi.

## Prototip teknik yaklaşımı
```
genex/prototype/
  package.json      bootstrap@5.3, chart.js@4, @phosphor-icons/core (npm)
  build.mjs         her şeyi tek dosyaya gömer
  src/
    tokens.css      primitive → semantic → component, --bs-* eşlemesi, koyu tema
    app.css         kabuk, tablo, form, rozet, drawer, yazdırma CSS'i
    data.js         tohumlu üretici + tutarlılık doğrulaması
    store.js        olay günlüğü, localStorage (try/catch)
    router.js       #/Musteri/Detay/184 gibi MVC rotalarının aynası
    components.js   tutar, rozet, tablo, sayfalama, boş/iskelet/hata, diyalog, toast, hesap seçici
    oracle-izi.js   rota/aksiyon → SQL girdileri + basit sözdizimi renklendirme
    charts.js       Chart.js sarmalayıcıları
    views/*.js      ekran başına bir dosya (sonra .cshtml'e birebir)
  dist/index.html     tam belge, çevrimdışı açılır
  dist/artifact.html  <title> + <style> ile başlar, html/head/body yok
```
- Vanilla JS, framework yok: view fonksiyonları Razor'ın üreteceği HTML'i üretir, taşıması kolay olur.
- Artifact CSP'si nedeniyle Bootstrap CSS/JS, Chart.js ve ikonlar npm paketlerinden dosyaya gömülür. Yalnız Geist fontları Google Fonts'tan gelir (sistem fontu yedeğiyle).
- Tema: token'lar `:root` (açık), `@media (prefers-color-scheme: dark)` içinde `:root:not([data-theme="light"])` ve `:root[data-theme="dark"]` altında. JS `data-bs-theme`'i de eşler. Uygulama içi Görünüm menüsü tercihi localStorage'da tutar.
- Demo kontrolleri (kullanıcı menüsü): ekran durumu Normal/Yükleniyor/Boş/Hata, veriyi sıfırla.

## Uygulama sırası
1. `artifact-design` ve `dataviz` skill'lerini yükle; tasarım planını onlara göre son kez gözden geçir.
2. `docs/arayuz-plani.md` ve `DESIGN.md` yaz.
3. `prototype/` iskeleti + `npm install` (bootstrap, chart.js, @phosphor-icons/core; npm kayıt deposundan).
4. tokens.css, app.css, kabuk (layout, sidebar, üst çubuk, Oracle izi drawer).
5. data.js, store.js, tutarlılık doğrulamaları.
6. Ekranlar: Genel bakış → Müşteriler (liste/detay/form) → Hesaplar (liste/detay/aç) → İşlem + dekont → Ekstre → Raporlar → Giriş, 404, Hata.
7. build.mjs → dist; tarayıcı panelinde doğrulama; düzeltmeler.
8. Artifact olarak yayınla (favicon 🏦, başlık "Hesap Masası"); ekran görüntülerini gönder.
9. Hafızaya kullanıcı bağlamını kaydet (Genex görüşmesi, .NET + Oracle hedefi, tasarım skill tercihi).

## Doğrulama
- Tarayıcı paneli (`dist/index.html`): her rota hatasız açılır, konsol temiz, aktif menü ve breadcrumb doğru.
- Veri: her hesabın bakiyesi = işlemlerinin trigger kurallarına göre toplamı; ekstre başı + giriş - çıkış = sonu; dashboard sayıları = tablo sayıları (dev modunda otomatik assert).
- Akış: yeni müşteri → açılış bakiyeli hesap → yatır → transfer → dekont → ekstre ve dashboard güncel, Oracle izi girdileri doğru; yetersiz bakiye hatası; bakiyeli hesabı pasife alma engeli.
- Durumlar: demo kontrolüyle her liste ekranında yükleniyor/boş/hata.
- Duyarlılık: 1440, 1024 (ikon rayı), 375 (offcanvas; tablolar kendi kabında kayar); `scrollWidth <= innerWidth` kontrolü.
- Tema: açık ve koyu ekran görüntüsü; ana metin/zemin çiftleri JS ile ≥ 4.5:1.
- taste ön uçuş (uygun maddeler): dist'te `—`/`–` sayısı 0, tek vurgu, yarıçap kuralı, Inter yok, `prefers-reduced-motion`, görünür focus.
- Yazdırma: ekstre ve dekont yazdırma görünümü.

## Sonraki faz (bu görev dışında)
.NET SDK (Oracle EF Core sağlayıcısının desteklediği güncel LTS), Oracle Database XE 21c (Docker veya Windows kurulumu), şartnamedeki Faz 1-5. Prototip CSS'i `wwwroot/css/theme.css`'e, view fonksiyonları `.cshtml`'e, sprite `wwwroot/icons/`'a taşınır.
