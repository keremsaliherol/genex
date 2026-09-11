-- =====================================================================
-- Hesap Masası: trigger, view ve paketler (Oracle 19c+ uyumlu)
--
-- İşlem kuralı: paketler COMMIT etmez. Transaction'ı çağıran taraf (.NET OracleTransaction)
-- yönetir; hata olursa ROLLBACK eder, yarım kalan transfer olmaz.
-- Hata kodları arayüzdeki eşlemeyle aynıdır (docs/arayuz-plani.md, "Hata eşleme").
-- =====================================================================

-- ---------------------------------------------------------------------
-- Trigger: işlem eklenince bakiye güncellenir (şartname 5.1)
-- ---------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_ISLEM_BAKIYE_GUNCELLE
AFTER INSERT ON ISLEM
FOR EACH ROW
BEGIN
    IF :NEW.ISLEM_TIPI IN ('YATIRMA', 'TRANSFER_GELEN', 'SATIM') THEN
        UPDATE HESAP SET BAKIYE = BAKIYE + :NEW.TUTAR WHERE HESAP_ID = :NEW.HESAP_ID;
    ELSE
        UPDATE HESAP SET BAKIYE = BAKIYE - :NEW.TUTAR WHERE HESAP_ID = :NEW.HESAP_ID;
    END IF;
END;
/

-- İşlem defteri değiştirilemez: düzeltme ters kayıtla yapılır.
CREATE OR REPLACE TRIGGER TRG_ISLEM_DEGISMEZ
BEFORE UPDATE OR DELETE ON ISLEM
BEGIN
    RAISE_APPLICATION_ERROR(-20020, 'İşlem kayıtları değiştirilemez veya silinemez. Düzeltme için ters kayıt girin.');
END;
/

-- ---------------------------------------------------------------------
-- View'lar. Şartnamedeki VW_EN_AKTIF_MUSTERILER içindeki ORDER BY çıkarıldı:
-- view içindeki sıralama, view'ı kullanan sorgu için garanti edilmez. Sıralama sorguda yapılır.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW VW_EN_AKTIF_MUSTERILER AS
SELECT m.MUSTERI_ID,
       m.AD_SOYAD,
       COUNT(i.ISLEM_ID)   AS TOPLAM_ISLEM,
       SUM(i.TUTAR)        AS HACIM,
       MAX(i.ISLEM_TARIHI) AS SON_ISLEM
  FROM MUSTERI m
  JOIN HESAP h ON h.MUSTERI_ID = m.MUSTERI_ID
  JOIN ISLEM i ON i.HESAP_ID = h.HESAP_ID
 GROUP BY m.MUSTERI_ID, m.AD_SOYAD;

CREATE OR REPLACE VIEW VW_EN_AKTIF_HESAPLAR AS
SELECT h.HESAP_ID,
       h.HESAP_NO,
       h.MUSTERI_ID,
       COUNT(i.ISLEM_ID)   AS TOPLAM_ISLEM,
       SUM(i.TUTAR)        AS HACIM,
       MAX(i.ISLEM_TARIHI) AS SON_ISLEM
  FROM HESAP h
  JOIN ISLEM i ON i.HESAP_ID = h.HESAP_ID
 GROUP BY h.HESAP_ID, h.HESAP_NO, h.MUSTERI_ID;

-- Açık hisse pozisyonları; ortalama maliyet = ağırlıklı ortalama alış fiyatı.
CREATE OR REPLACE VIEW VW_PORTFOY AS
SELECT p.HESAP_ID,
       p.HISSE_KODU,
       s.AD                                        AS HISSE_AD,
       p.NET_ADET,
       ROUND(p.ALIS_TUTARI / p.ALIS_ADEDI, 4)      AS ORT_MALIYET,
       s.TEMSILI_FIYAT,
       ROUND(p.NET_ADET * s.TEMSILI_FIYAT, 2)      AS PIYASA_DEGERI
  FROM (SELECT HESAP_ID,
               HISSE_KODU,
               SUM(CASE ISLEM_TIPI WHEN 'ALIM' THEN ADET ELSE -ADET END) AS NET_ADET,
               SUM(CASE ISLEM_TIPI WHEN 'ALIM' THEN TUTAR ELSE 0 END)   AS ALIS_TUTARI,
               SUM(CASE ISLEM_TIPI WHEN 'ALIM' THEN ADET ELSE 0 END)    AS ALIS_ADEDI
          FROM ISLEM
         WHERE ISLEM_TIPI IN ('ALIM', 'SATIM')
         GROUP BY HESAP_ID, HISSE_KODU) p
  JOIN HISSE s ON s.HISSE_KODU = p.HISSE_KODU
 WHERE p.NET_ADET > 0;

-- ---------------------------------------------------------------------
-- PKG_ISLEM: tüm para hareketleri buradan geçer
-- ---------------------------------------------------------------------
CREATE OR REPLACE PACKAGE PKG_ISLEM AS
    HATA_YETERSIZ_BAKIYE CONSTANT PLS_INTEGER := -20001;
    HATA_HESAP_PASIF     CONSTANT PLS_INTEGER := -20002;
    HATA_YETERSIZ_ADET   CONSTANT PLS_INTEGER := -20003;
    HATA_HISSE_HESABI    CONSTANT PLS_INTEGER := -20006;
    HATA_HESAP_YOK       CONSTANT PLS_INTEGER := -20008;
    HATA_HISSE_YOK       CONSTANT PLS_INTEGER := -20009;
    HATA_GECERSIZ_ADET   CONSTANT PLS_INTEGER := -20010;
    HATA_GECERSIZ_TUTAR  CONSTANT PLS_INTEGER := -20011;
    HATA_AYNI_HESAP      CONSTANT PLS_INTEGER := -20012;

    PROCEDURE YATIR(p_hesap_id IN NUMBER, p_tutar IN NUMBER, p_aciklama IN VARCHAR2, p_islem_id OUT NUMBER);
    PROCEDURE CEK(p_hesap_id IN NUMBER, p_tutar IN NUMBER, p_aciklama IN VARCHAR2, p_islem_id OUT NUMBER);
    PROCEDURE TRANSFER(p_kaynak IN NUMBER, p_hedef IN NUMBER, p_tutar IN NUMBER, p_aciklama IN VARCHAR2,
                       p_referans OUT VARCHAR2, p_giden_islem_id OUT NUMBER);
    PROCEDURE HISSE_AL(p_hesap_id IN NUMBER, p_hisse_kodu IN VARCHAR2, p_adet IN NUMBER, p_islem_id OUT NUMBER);
    PROCEDURE HISSE_SAT(p_hesap_id IN NUMBER, p_hisse_kodu IN VARCHAR2, p_adet IN NUMBER, p_islem_id OUT NUMBER);
END PKG_ISLEM;
/

CREATE OR REPLACE PACKAGE BODY PKG_ISLEM AS

    FUNCTION tl(p_tutar IN NUMBER) RETURN VARCHAR2 IS
    BEGIN
        RETURN '₺' || TO_CHAR(p_tutar, 'FM999G999G999G990D00', 'NLS_NUMERIC_CHARACTERS='',.''');
    END tl;

    PROCEDURE tutar_kontrol(p_tutar IN NUMBER) IS
    BEGIN
        IF p_tutar IS NULL OR p_tutar <= 0 OR p_tutar <> ROUND(p_tutar, 2) THEN
            RAISE_APPLICATION_ERROR(HATA_GECERSIZ_TUTAR, 'Tutar sıfırdan büyük olmalı ve en fazla 2 ondalık içermeli.');
        END IF;
    END tutar_kontrol;

    PROCEDURE adet_kontrol(p_adet IN NUMBER) IS
    BEGIN
        IF p_adet IS NULL OR p_adet <= 0 OR p_adet <> TRUNC(p_adet) THEN
            RAISE_APPLICATION_ERROR(HATA_GECERSIZ_ADET, 'Adet 1 veya daha büyük tam sayı olmalı.');
        END IF;
    END adet_kontrol;

    -- Hesap satırını kilitler (FOR UPDATE) ve durumunu kontrol eder.
    PROCEDURE hesap_kilitle(p_hesap_id IN NUMBER, p_etiket IN VARCHAR2,
                            p_tip OUT VARCHAR2, p_bakiye OUT NUMBER) IS
        v_hesap_aktif   HESAP.AKTIF%TYPE;
        v_musteri_aktif MUSTERI.AKTIF%TYPE;
    BEGIN
        SELECT h.HESAP_TIPI, h.BAKIYE, h.AKTIF, m.AKTIF
          INTO p_tip, p_bakiye, v_hesap_aktif, v_musteri_aktif
          FROM HESAP h
          JOIN MUSTERI m ON m.MUSTERI_ID = h.MUSTERI_ID
         WHERE h.HESAP_ID = p_hesap_id
           FOR UPDATE OF h.BAKIYE;
        IF v_hesap_aktif = 0 THEN
            RAISE_APPLICATION_ERROR(HATA_HESAP_PASIF, p_etiket || ' pasif. İşlem yapılamaz.');
        END IF;
        IF v_musteri_aktif = 0 THEN
            RAISE_APPLICATION_ERROR(HATA_HESAP_PASIF, p_etiket || ' sahibi müşteri pasif. İşlem yapılamaz.');
        END IF;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(HATA_HESAP_YOK, p_etiket || ' bulunamadı (HESAP_ID = ' || p_hesap_id || ').');
    END hesap_kilitle;

    PROCEDURE YATIR(p_hesap_id IN NUMBER, p_tutar IN NUMBER, p_aciklama IN VARCHAR2, p_islem_id OUT NUMBER) IS
        v_tip    HESAP.HESAP_TIPI%TYPE;
        v_bakiye HESAP.BAKIYE%TYPE;
    BEGIN
        tutar_kontrol(p_tutar);
        hesap_kilitle(p_hesap_id, 'Bu hesap', v_tip, v_bakiye);
        INSERT INTO ISLEM (HESAP_ID, ISLEM_TIPI, TUTAR, ACIKLAMA)
        VALUES (p_hesap_id, 'YATIRMA', p_tutar, NVL(p_aciklama, 'Para yatırma'))
        RETURNING ISLEM_ID INTO p_islem_id;
    END YATIR;

    PROCEDURE CEK(p_hesap_id IN NUMBER, p_tutar IN NUMBER, p_aciklama IN VARCHAR2, p_islem_id OUT NUMBER) IS
        v_tip    HESAP.HESAP_TIPI%TYPE;
        v_bakiye HESAP.BAKIYE%TYPE;
    BEGIN
        tutar_kontrol(p_tutar);
        hesap_kilitle(p_hesap_id, 'Bu hesap', v_tip, v_bakiye);
        IF v_bakiye < p_tutar THEN
            RAISE_APPLICATION_ERROR(HATA_YETERSIZ_BAKIYE, 'Yetersiz bakiye. Kullanılabilir: ' || tl(v_bakiye));
        END IF;
        INSERT INTO ISLEM (HESAP_ID, ISLEM_TIPI, TUTAR, ACIKLAMA)
        VALUES (p_hesap_id, 'CEKME', p_tutar, NVL(p_aciklama, 'Para çekme'))
        RETURNING ISLEM_ID INTO p_islem_id;
    END CEK;

    PROCEDURE TRANSFER(p_kaynak IN NUMBER, p_hedef IN NUMBER, p_tutar IN NUMBER, p_aciklama IN VARCHAR2,
                       p_referans OUT VARCHAR2, p_giden_islem_id OUT NUMBER) IS
        v_tip            HESAP.HESAP_TIPI%TYPE;
        v_bakiye_kaynak  HESAP.BAKIYE%TYPE;
        v_bakiye_hedef   HESAP.BAKIYE%TYPE;
        v_sira           NUMBER;
        v_aciklama       ISLEM.ACIKLAMA%TYPE := NVL(p_aciklama, 'Hesaplar arası transfer');
    BEGIN
        tutar_kontrol(p_tutar);
        IF p_kaynak = p_hedef THEN
            RAISE_APPLICATION_ERROR(HATA_AYNI_HESAP, 'Aynı hesaba transfer yapılamaz.');
        END IF;

        -- Sabit kilit sırası: küçük HESAP_ID önce kilitlenir. Aynı iki hesap arasında
        -- ters yönde eşzamanlı iki transfer birbirini beklemez, deadlock oluşmaz.
        IF p_kaynak < p_hedef THEN
            hesap_kilitle(p_kaynak, 'Bu hesap', v_tip, v_bakiye_kaynak);
            hesap_kilitle(p_hedef, 'Hedef hesap', v_tip, v_bakiye_hedef);
        ELSE
            hesap_kilitle(p_hedef, 'Hedef hesap', v_tip, v_bakiye_hedef);
            hesap_kilitle(p_kaynak, 'Bu hesap', v_tip, v_bakiye_kaynak);
        END IF;

        IF v_bakiye_kaynak < p_tutar THEN
            RAISE_APPLICATION_ERROR(HATA_YETERSIZ_BAKIYE, 'Yetersiz bakiye. Kullanılabilir: ' || tl(v_bakiye_kaynak));
        END IF;

        v_sira := SEQ_REFERANS.NEXTVAL;
        p_referans := 'TRF' || TO_CHAR(SYSDATE, 'YYMMDD') || LPAD(v_sira, GREATEST(5, LENGTH(v_sira)), '0');

        INSERT INTO ISLEM (HESAP_ID, ISLEM_TIPI, TUTAR, ACIKLAMA, KARSI_HESAP_ID, REFERANS_NO)
        VALUES (p_kaynak, 'TRANSFER_GIDEN', p_tutar, v_aciklama, p_hedef, p_referans)
        RETURNING ISLEM_ID INTO p_giden_islem_id;

        INSERT INTO ISLEM (HESAP_ID, ISLEM_TIPI, TUTAR, ACIKLAMA, KARSI_HESAP_ID, REFERANS_NO)
        VALUES (p_hedef, 'TRANSFER_GELEN', p_tutar, v_aciklama, p_kaynak, p_referans);
    END TRANSFER;

    PROCEDURE hisse_hazirla(p_hesap_id IN NUMBER, p_hisse_kodu IN VARCHAR2, p_adet IN NUMBER,
                            p_bakiye OUT NUMBER, p_fiyat OUT NUMBER) IS
        v_tip HESAP.HESAP_TIPI%TYPE;
    BEGIN
        adet_kontrol(p_adet);
        hesap_kilitle(p_hesap_id, 'Bu hesap', v_tip, p_bakiye);
        IF v_tip <> 'YATIRIM' THEN
            RAISE_APPLICATION_ERROR(HATA_HISSE_HESABI, 'Hisse işlemi yalnız yatırım hesabında yapılır.');
        END IF;
        BEGIN
            SELECT TEMSILI_FIYAT INTO p_fiyat FROM HISSE WHERE HISSE_KODU = p_hisse_kodu;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(HATA_HISSE_YOK, 'Hisse bulunamadı: ' || p_hisse_kodu);
        END;
    END hisse_hazirla;

    PROCEDURE HISSE_AL(p_hesap_id IN NUMBER, p_hisse_kodu IN VARCHAR2, p_adet IN NUMBER, p_islem_id OUT NUMBER) IS
        v_bakiye HESAP.BAKIYE%TYPE;
        v_fiyat  HISSE.TEMSILI_FIYAT%TYPE;
        v_tutar  ISLEM.TUTAR%TYPE;
    BEGIN
        hisse_hazirla(p_hesap_id, p_hisse_kodu, p_adet, v_bakiye, v_fiyat);
        v_tutar := ROUND(p_adet * v_fiyat, 2);
        IF v_bakiye < v_tutar THEN
            RAISE_APPLICATION_ERROR(HATA_YETERSIZ_BAKIYE, 'Yetersiz bakiye. Kullanılabilir: ' || tl(v_bakiye));
        END IF;
        INSERT INTO ISLEM (HESAP_ID, ISLEM_TIPI, TUTAR, ACIKLAMA, HISSE_KODU, ADET, BIRIM_FIYAT)
        VALUES (p_hesap_id, 'ALIM', v_tutar, p_hisse_kodu || ' ' || p_adet || ' adet alım', p_hisse_kodu, p_adet, v_fiyat)
        RETURNING ISLEM_ID INTO p_islem_id;
    END HISSE_AL;

    PROCEDURE HISSE_SAT(p_hesap_id IN NUMBER, p_hisse_kodu IN VARCHAR2, p_adet IN NUMBER, p_islem_id OUT NUMBER) IS
        v_bakiye HESAP.BAKIYE%TYPE;
        v_fiyat  HISSE.TEMSILI_FIYAT%TYPE;
        v_pozisyon NUMBER;
    BEGIN
        hisse_hazirla(p_hesap_id, p_hisse_kodu, p_adet, v_bakiye, v_fiyat);
        -- Hesap satırı kilitli olduğu için aynı hesaptaki eşzamanlı satışlar sıraya girer.
        SELECT NVL(SUM(CASE ISLEM_TIPI WHEN 'ALIM' THEN ADET ELSE -ADET END), 0)
          INTO v_pozisyon
          FROM ISLEM
         WHERE HESAP_ID = p_hesap_id
           AND HISSE_KODU = p_hisse_kodu
           AND ISLEM_TIPI IN ('ALIM', 'SATIM');
        IF p_adet > v_pozisyon THEN
            RAISE_APPLICATION_ERROR(HATA_YETERSIZ_ADET, 'Satılabilir adet: ' || v_pozisyon);
        END IF;
        INSERT INTO ISLEM (HESAP_ID, ISLEM_TIPI, TUTAR, ACIKLAMA, HISSE_KODU, ADET, BIRIM_FIYAT)
        VALUES (p_hesap_id, 'SATIM', ROUND(p_adet * v_fiyat, 2), p_hisse_kodu || ' ' || p_adet || ' adet satım', p_hisse_kodu, p_adet, v_fiyat)
        RETURNING ISLEM_ID INTO p_islem_id;
    END HISSE_SAT;

END PKG_ISLEM;
/

-- ---------------------------------------------------------------------
-- PKG_RAPOR: raporlar REF CURSOR döndürür (.NET tarafında Dapper ile okunur)
-- Tarih koşulları aralık olarak yazılır; şartnamedeki EXTRACT(YEAR/MONTH FROM ISLEM_TARIHI)
-- kolonu fonksiyona soktuğu için IDX_ISLEM_HESAP_TARIH indeksini kullanamaz.
-- ---------------------------------------------------------------------
CREATE OR REPLACE PACKAGE PKG_RAPOR AS
    PROCEDURE AYLIK_OZET_HESAP(p_hesap_id IN NUMBER, p_yil IN NUMBER, p_ay IN NUMBER, p_sonuc OUT SYS_REFCURSOR);
    PROCEDURE AYLIK_OZET_MUSTERI(p_musteri_id IN NUMBER, p_yil IN NUMBER, p_ay IN NUMBER, p_sonuc OUT SYS_REFCURSOR);
    PROCEDURE BAKIYE_DEGISIMI(p_hesap_id IN NUMBER, p_bas IN DATE, p_bit IN DATE,
                              p_acilis OUT NUMBER, p_sonuc OUT SYS_REFCURSOR);
    -- p_tur: 'MUSTERI' veya 'HESAP'
    PROCEDURE EN_AKTIF(p_tur IN VARCHAR2, p_bas IN DATE, p_adet IN NUMBER, p_sonuc OUT SYS_REFCURSOR);
END PKG_RAPOR;
/

CREATE OR REPLACE PACKAGE BODY PKG_RAPOR AS

    FUNCTION ay_basi(p_yil IN NUMBER, p_ay IN NUMBER) RETURN DATE IS
    BEGIN
        RETURN TO_DATE(p_yil || '-' || LPAD(p_ay, 2, '0') || '-01', 'YYYY-MM-DD');
    END ay_basi;

    PROCEDURE AYLIK_OZET_HESAP(p_hesap_id IN NUMBER, p_yil IN NUMBER, p_ay IN NUMBER, p_sonuc OUT SYS_REFCURSOR) IS
        v_bas DATE := ay_basi(p_yil, p_ay);
    BEGIN
        OPEN p_sonuc FOR
            SELECT ISLEM_TIPI, COUNT(*) AS ISLEM_ADEDI, SUM(TUTAR) AS TOPLAM_TUTAR
              FROM ISLEM
             WHERE HESAP_ID = p_hesap_id
               AND ISLEM_TARIHI >= v_bas
               AND ISLEM_TARIHI <  ADD_MONTHS(v_bas, 1)
             GROUP BY ISLEM_TIPI
             ORDER BY ISLEM_TIPI;
    END AYLIK_OZET_HESAP;

    PROCEDURE AYLIK_OZET_MUSTERI(p_musteri_id IN NUMBER, p_yil IN NUMBER, p_ay IN NUMBER, p_sonuc OUT SYS_REFCURSOR) IS
        v_bas DATE := ay_basi(p_yil, p_ay);
    BEGIN
        OPEN p_sonuc FOR
            SELECT i.ISLEM_TIPI, COUNT(*) AS ISLEM_ADEDI, SUM(i.TUTAR) AS TOPLAM_TUTAR
              FROM ISLEM i
              JOIN HESAP h ON h.HESAP_ID = i.HESAP_ID
             WHERE h.MUSTERI_ID = p_musteri_id
               AND i.ISLEM_TARIHI >= v_bas
               AND i.ISLEM_TARIHI <  ADD_MONTHS(v_bas, 1)
             GROUP BY i.ISLEM_TIPI
             ORDER BY i.ISLEM_TIPI;
    END AYLIK_OZET_MUSTERI;

    PROCEDURE BAKIYE_DEGISIMI(p_hesap_id IN NUMBER, p_bas IN DATE, p_bit IN DATE,
                              p_acilis OUT NUMBER, p_sonuc OUT SYS_REFCURSOR) IS
        v_bas DATE := TRUNC(p_bas);
        v_bit DATE := TRUNC(p_bit) + 1;
    BEGIN
        SELECT NVL(SUM(CASE WHEN ISLEM_TIPI IN ('YATIRMA', 'TRANSFER_GELEN', 'SATIM') THEN TUTAR ELSE -TUTAR END), 0)
          INTO p_acilis
          FROM ISLEM
         WHERE HESAP_ID = p_hesap_id
           AND ISLEM_TARIHI < v_bas;

        OPEN p_sonuc FOR
            SELECT ISLEM_ID, ISLEM_TARIHI, ISLEM_TIPI, TUTAR, ACIKLAMA, KARSI_HESAP_ID,
                   p_acilis + SUM(CASE WHEN ISLEM_TIPI IN ('YATIRMA', 'TRANSFER_GELEN', 'SATIM') THEN TUTAR ELSE -TUTAR END)
                              OVER (ORDER BY ISLEM_TARIHI, ISLEM_ID ROWS UNBOUNDED PRECEDING) AS BAKIYE
              FROM ISLEM
             WHERE HESAP_ID = p_hesap_id
               AND ISLEM_TARIHI >= v_bas
               AND ISLEM_TARIHI <  v_bit
             ORDER BY ISLEM_TARIHI, ISLEM_ID;
    END BAKIYE_DEGISIMI;

    PROCEDURE EN_AKTIF(p_tur IN VARCHAR2, p_bas IN DATE, p_adet IN NUMBER, p_sonuc OUT SYS_REFCURSOR) IS
    BEGIN
        IF p_tur = 'HESAP' THEN
            OPEN p_sonuc FOR
                SELECT h.HESAP_ID AS ID, h.HESAP_NO AS AD, COUNT(i.ISLEM_ID) AS TOPLAM_ISLEM,
                       SUM(i.TUTAR) AS HACIM, MAX(i.ISLEM_TARIHI) AS SON_ISLEM
                  FROM HESAP h
                  JOIN ISLEM i ON i.HESAP_ID = h.HESAP_ID
                 WHERE i.ISLEM_TARIHI >= p_bas
                 GROUP BY h.HESAP_ID, h.HESAP_NO
                 ORDER BY TOPLAM_ISLEM DESC, HACIM DESC
                 FETCH FIRST p_adet ROWS ONLY;
        ELSE
            OPEN p_sonuc FOR
                SELECT m.MUSTERI_ID AS ID, m.AD_SOYAD AS AD, COUNT(i.ISLEM_ID) AS TOPLAM_ISLEM,
                       SUM(i.TUTAR) AS HACIM, MAX(i.ISLEM_TARIHI) AS SON_ISLEM
                  FROM MUSTERI m
                  JOIN HESAP h ON h.MUSTERI_ID = m.MUSTERI_ID
                  JOIN ISLEM i ON i.HESAP_ID = h.HESAP_ID
                 WHERE i.ISLEM_TARIHI >= p_bas
                 GROUP BY m.MUSTERI_ID, m.AD_SOYAD
                 ORDER BY TOPLAM_ISLEM DESC, HACIM DESC
                 FETCH FIRST p_adet ROWS ONLY;
        END IF;
    END EN_AKTIF;

END PKG_RAPOR;
/

-- Şartnamedeki isimle geriye dönük uyumluluk (şartname 5.2)
CREATE OR REPLACE PROCEDURE SP_AYLIK_ISLEM_OZETI (
    p_hesap_id IN  NUMBER,
    p_yil      IN  NUMBER,
    p_ay       IN  NUMBER,
    p_sonuc    OUT SYS_REFCURSOR
) AS
BEGIN
    PKG_RAPOR.AYLIK_OZET_HESAP(p_hesap_id, p_yil, p_ay, p_sonuc);
END SP_AYLIK_ISLEM_OZETI;
/
