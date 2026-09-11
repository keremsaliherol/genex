-- =====================================================================
-- Hesap Masası: şema nesnelerini siler (yeniden kurulum için).
-- 19c'de DROP ... IF EXISTS olmadığından "nesne yok" hataları yutulur.
-- =====================================================================
DECLARE
    PROCEDURE sil(p_komut VARCHAR2) IS
    BEGIN
        EXECUTE IMMEDIATE p_komut;
    EXCEPTION
        WHEN OTHERS THEN
            -- -942 tablo/view yok, -4043 nesne yok, -2289 sekans yok, -4080 trigger yok
            IF SQLCODE NOT IN (-942, -4043, -2289, -4080) THEN
                RAISE;
            END IF;
    END;
BEGIN
    sil('DROP PACKAGE PKG_RAPOR');
    sil('DROP PACKAGE PKG_ISLEM');
    sil('DROP PROCEDURE SP_AYLIK_ISLEM_OZETI');
    sil('DROP VIEW VW_EN_AKTIF_MUSTERILER');
    sil('DROP VIEW VW_EN_AKTIF_HESAPLAR');
    sil('DROP VIEW VW_PORTFOY');
    sil('DROP TABLE ISLEM CASCADE CONSTRAINTS PURGE');
    sil('DROP TABLE HESAP CASCADE CONSTRAINTS PURGE');
    sil('DROP TABLE HISSE CASCADE CONSTRAINTS PURGE');
    sil('DROP TABLE MUSTERI CASCADE CONSTRAINTS PURGE');
    sil('DROP SEQUENCE SEQ_REFERANS');
END;
/
