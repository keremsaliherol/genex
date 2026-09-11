-- =====================================================================
-- Hesap Masası: kurulum doğrulaması
-- 1) Geçersiz (derlenemeyen) nesne yok
-- 2) Her hesabın bakiyesi = işlemlerinin trigger kuralına göre toplamı
-- 3) Her transfer referansında tam iki kayıt var ve tutarları dengeli
-- 4) PKG_ISLEM duman testi: transfer ve yetersiz bakiye kontrolü (sonra geri alınır)
-- =====================================================================
DECLARE
    v_gecersiz  NUMBER;
    v_bakiye    NUMBER;
    v_transfer  NUMBER;
    v_musteri   NUMBER;
    v_hesap     NUMBER;
    v_islem     NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_gecersiz FROM USER_OBJECTS WHERE STATUS <> 'VALID';
    IF v_gecersiz > 0 THEN
        FOR r IN (SELECT NAME, TYPE, LINE, TEXT FROM USER_ERRORS ORDER BY NAME, SEQUENCE) LOOP
            DBMS_OUTPUT.PUT_LINE(r.NAME || ' (' || r.TYPE || ') satır ' || r.LINE || ': ' || r.TEXT);
        END LOOP;
        RAISE_APPLICATION_ERROR(-20900, v_gecersiz || ' geçersiz nesne var.');
    END IF;

    SELECT COUNT(*) INTO v_bakiye
      FROM HESAP h
     WHERE h.BAKIYE <> (SELECT NVL(SUM(CASE WHEN i.ISLEM_TIPI IN ('YATIRMA', 'TRANSFER_GELEN', 'SATIM') THEN i.TUTAR ELSE -i.TUTAR END), 0)
                          FROM ISLEM i
                         WHERE i.HESAP_ID = h.HESAP_ID);

    SELECT COUNT(*) INTO v_transfer
      FROM (SELECT REFERANS_NO
              FROM ISLEM
             WHERE REFERANS_NO IS NOT NULL
             GROUP BY REFERANS_NO
            HAVING COUNT(*) <> 2
                OR SUM(CASE ISLEM_TIPI WHEN 'TRANSFER_GIDEN' THEN -TUTAR ELSE TUTAR END) <> 0);

    SELECT COUNT(*) INTO v_musteri FROM MUSTERI;
    SELECT COUNT(*) INTO v_hesap FROM HESAP;
    SELECT COUNT(*) INTO v_islem FROM ISLEM;
    DBMS_OUTPUT.PUT_LINE('  Müşteri: ' || v_musteri || ', hesap: ' || v_hesap || ', işlem: ' || v_islem);
    DBMS_OUTPUT.PUT_LINE('  Bakiye tutarsızlığı: ' || v_bakiye || ', hatalı transfer çifti: ' || v_transfer);
    IF v_bakiye > 0 OR v_transfer > 0 THEN
        RAISE_APPLICATION_ERROR(-20901, 'Tutarlılık kontrolü başarısız.');
    END IF;
END;
/

DECLARE
    v_kaynak  NUMBER;
    v_hedef   NUMBER;
    v_once    NUMBER;
    v_sonra   NUMBER;
    v_hedef_once  NUMBER;
    v_hedef_sonra NUMBER;
    v_ref     VARCHAR2(20);
    v_id      NUMBER;
BEGIN
    SAVEPOINT duman_testi;

    SELECT MIN(h.HESAP_ID) INTO v_kaynak
      FROM HESAP h JOIN MUSTERI m ON m.MUSTERI_ID = h.MUSTERI_ID
     WHERE h.AKTIF = 1 AND m.AKTIF = 1 AND h.BAKIYE > 1000;
    SELECT MIN(h.HESAP_ID) INTO v_hedef
      FROM HESAP h JOIN MUSTERI m ON m.MUSTERI_ID = h.MUSTERI_ID
     WHERE h.AKTIF = 1 AND m.AKTIF = 1 AND h.HESAP_ID <> v_kaynak;

    SELECT BAKIYE INTO v_once FROM HESAP WHERE HESAP_ID = v_kaynak;
    SELECT BAKIYE INTO v_hedef_once FROM HESAP WHERE HESAP_ID = v_hedef;
    PKG_ISLEM.TRANSFER(v_kaynak, v_hedef, 100, 'Kurulum doğrulaması', v_ref, v_id);
    SELECT BAKIYE INTO v_sonra FROM HESAP WHERE HESAP_ID = v_kaynak;
    SELECT BAKIYE INTO v_hedef_sonra FROM HESAP WHERE HESAP_ID = v_hedef;
    IF v_once - v_sonra <> 100 OR v_hedef_sonra - v_hedef_once <> 100 THEN
        RAISE_APPLICATION_ERROR(-20902, 'Transfer bakiyeleri yanlış güncelledi.');
    END IF;

    BEGIN
        PKG_ISLEM.CEK(v_kaynak, 999999999, NULL, v_id);
        RAISE_APPLICATION_ERROR(-20903, 'Yetersiz bakiye kontrolü çalışmadı.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE <> PKG_ISLEM.HATA_YETERSIZ_BAKIYE THEN
                RAISE;
            END IF;
            DBMS_OUTPUT.PUT_LINE('  Beklenen hata alındı: ' || SQLERRM);
    END;

    ROLLBACK TO duman_testi;
    DBMS_OUTPUT.PUT_LINE('  PKG_ISLEM duman testi tamam (transfer ' || v_ref || ' geri alındı).');
END;
/
