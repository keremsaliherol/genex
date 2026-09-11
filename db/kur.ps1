<#
.SYNOPSIS
    Hesap Masası veritabanını sıfırdan kurar: temizlik, şema, PL/SQL, tohum veri, doğrulama.
.DESCRIPTION
    db klasörünü Oracle konteynerine kopyalar ve sqlplus'ı NLS_LANG=AL32UTF8 ile çalıştırır
    (aksi halde Türkçe karakterler bozulur). Şifre koda yazılmaz; ortam değişkeninden okunur.
.EXAMPLE
    $env:HESAP_DB_SIFRE = '<hesap kullanıcısının şifresi>'
    ./db/kur.ps1
#>
param(
    [string]$Konteyner = 'hesap-oracle',
    [string]$Kullanici = 'hesap',
    [string]$Servis = 'FREEPDB1',
    [string]$Sifre = $env:HESAP_DB_SIFRE
)
$ErrorActionPreference = 'Stop'

if (-not $Sifre) { throw 'Şifre bulunamadı. HESAP_DB_SIFRE ortam değişkenini ayarlayın ya da -Sifre parametresi verin.' }
if (-not (Test-Path (Join-Path $PSScriptRoot '03_seed.sql'))) { throw '03_seed.sql yok. Önce çalıştırın: node db/tools/tohum-uret.mjs' }

$docker = (Get-Command docker -ErrorAction SilentlyContinue).Source
if (-not $docker) { $docker = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' }

$hedef = '/tmp/hesap-db'
& $docker exec $Konteyner mkdir -p $hedef
& $docker cp "$PSScriptRoot\." "${Konteyner}:$hedef"
if ($LASTEXITCODE -ne 0) { throw 'Betikler konteynere kopyalanamadı. Konteyner çalışıyor mu? (docker start hesap-oracle)' }

$sure = [System.Diagnostics.Stopwatch]::StartNew()
& $docker exec -e NLS_LANG=AMERICAN_AMERICA.AL32UTF8 -w $hedef $Konteyner sqlplus -s -L "$Kullanici/$Sifre@//localhost:1521/$Servis" '@00_kur.sql'
if ($LASTEXITCODE -ne 0) { throw "Kurulum başarısız (sqlplus çıkış kodu $LASTEXITCODE). Yukarıdaki hata mesajına bakın." }
Write-Host ("Kurulum tamam ({0:N0} sn)." -f $sure.Elapsed.TotalSeconds)
