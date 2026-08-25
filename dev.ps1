$ErrorActionPreference = 'Stop'

$phpDir = 'C:\php85'
$phpExe = Join-Path $phpDir 'php.exe'
$composerExe = 'C:\ProgramData\ComposerSetup\bin\composer.bat'
$phpIniScanDir = Join-Path $PSScriptRoot '.tools\php-conf.d'

if (-not (Test-Path -LiteralPath $phpExe)) {
    throw "PHP runtime is missing at $phpExe."
}

if (-not (Test-Path -LiteralPath $composerExe)) {
    throw "Composer is missing at $composerExe."
}

$env:Path = "$phpDir;$env:Path"
$env:PHP_INI_SCAN_DIR = $phpIniScanDir

Set-Location $PSScriptRoot
& $composerExe run dev
