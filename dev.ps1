$ErrorActionPreference = 'Stop'

$phpDir = Join-Path $PSScriptRoot '.tools\php-8.5.6'
$phpExe = Join-Path $phpDir 'php.exe'

if (-not (Test-Path -LiteralPath $phpExe)) {
    throw "Project PHP runtime is missing at $phpExe."
}

$env:Path = "$phpDir;$env:Path"

Set-Location $PSScriptRoot
composer run dev
