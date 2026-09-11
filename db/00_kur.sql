-- =====================================================================
-- Hesap Masası: tam kurulum (temizle, şema, PL/SQL, kimlik tabloları, tohum veri, doğrulama)
-- Kullanım: db/kur.ps1  (konteynere kopyalar ve NLS_LANG=AL32UTF8 ile çalıştırır)
-- =====================================================================
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET ECHO OFF
SET FEEDBACK OFF
SET DEFINE OFF
SET SERVEROUTPUT ON SIZE UNLIMITED
SET SQLBLANKLINES ON

PROMPT [1/6] Mevcut nesneler siliniyor
@@99_temizle.sql
PROMPT [2/6] Şema oluşturuluyor
@@01_schema.sql
PROMPT [3/6] Trigger, view ve paketler derleniyor
@@02_plsql.sql
PROMPT [4/6] Kimlik tabloları oluşturuluyor (ASP.NET Core Identity)
@@05_identity.sql
PROMPT [5/6] Tohum veri yükleniyor
@@03_seed.sql
-- Tohumun sonundaki ALTER TABLE (kimlik başlangıcı) bağımlı trigger, view ve paketleri
-- geçersiz işaretler; ilk kullanımda kendiliğinden derlenirler ama doğrulama öncesi derlenir.
EXEC DBMS_UTILITY.COMPILE_SCHEMA(schema => USER, compile_all => FALSE)
PROMPT [6/6] Doğrulama
@@04_dogrula.sql
EXIT
