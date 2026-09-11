-- =====================================================================
-- Hesap Masası: tam kurulum (temizle, şema, PL/SQL, tohum veri, doğrulama)
-- Kullanım: db/kur.ps1  (konteynere kopyalar ve NLS_LANG=AL32UTF8 ile çalıştırır)
-- =====================================================================
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET ECHO OFF
SET FEEDBACK OFF
SET DEFINE OFF
SET SERVEROUTPUT ON SIZE UNLIMITED
SET SQLBLANKLINES ON

PROMPT [1/5] Mevcut nesneler siliniyor
@@99_temizle.sql
PROMPT [2/5] Şema oluşturuluyor
@@01_schema.sql
PROMPT [3/5] Trigger, view ve paketler derleniyor
@@02_plsql.sql
PROMPT [4/5] Tohum veri yükleniyor
@@03_seed.sql
-- Tohumun sonundaki ALTER TABLE (kimlik başlangıcı) bağımlı trigger, view ve paketleri
-- geçersiz işaretler; ilk kullanımda kendiliğinden derlenirler ama doğrulama öncesi derlenir.
EXEC DBMS_UTILITY.COMPILE_SCHEMA(schema => USER, compile_all => FALSE)
PROMPT [5/5] Doğrulama
@@04_dogrula.sql
EXIT
