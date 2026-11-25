# Instalacion segura del proyecto unificado para Windows PowerShell y Laragon.
# No modifica MySQL, ni elimina una instalacion previa.
param(
    [string]$Destino = 'C:\laragon\www\piramide_senati_fusion',
    [switch]$OmitirCompilacion
)
$ErrorActionPreference = 'Stop'
$Origen = [System.IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')
$Destino = [System.IO.Path]::GetFullPath($Destino).TrimEnd('\')
$raizLaragon = 'C:\laragon\www'
Write-Host '=== PIRAMIDE SENATI | INSTALACION UNIFICADA ===' -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath (Join-Path $Origen 'config\auth.php'))) {
    throw 'ZIP/carpeta incorrecta: falta config\auth.php en la raiz extraida.'
}
foreach ($nombre in @('registro.php','login.php','src\piramide-senati.js','database\schema.sql','PANEL_UNIFICADO.html','COMPROBAR_INSTALACION.php','modulos\fachada-original\FACHADA_EXTERIOR.html')) {
    if (-not (Test-Path -LiteralPath (Join-Path $Origen $nombre))) {
        throw ('Falta archivo del paquete: ' + $nombre)
    }
}
if (-not (Test-Path -LiteralPath $raizLaragon -PathType Container)) {
    throw 'No se encuentra C:\laragon\www. Instala Laragon o indica un destino correcto con -Destino.'
}
$igual = [string]::Equals($Origen,$Destino,[StringComparison]::OrdinalIgnoreCase)
if (-not $igual) {
    if ($Origen.StartsWith($Destino+'\',[StringComparison]::OrdinalIgnoreCase) -or
        $Destino.StartsWith($Origen+'\',[StringComparison]::OrdinalIgnoreCase)) {
        throw 'No se puede copiar una carpeta dentro de si misma. Extrae el ZIP fuera del destino o ejecuta desde la raiz correcta.'
    }
    if (Test-Path -LiteralPath $Destino) {
        $respaldo=$Destino+'-respaldo-'+(Get-Date -Format 'yyyyMMdd-HHmmss')
        if(Test-Path -LiteralPath $respaldo){throw ('Ya existe el respaldo '+$respaldo)}
        Move-Item -LiteralPath $Destino -Destination $respaldo
        Write-Host ('Respaldo conservado: '+$respaldo) -ForegroundColor Yellow
    }
    New-Item -ItemType Directory -Path $Destino -Force | Out-Null
    Get-ChildItem -LiteralPath $Origen -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $Destino -Recurse -Force
    }
}
foreach ($f in @('config\auth.php','config\database.php','login.php','registro.php','index.php','recorrer.php','database\schema.sql','public\assets\recorrer.js')) {
    if(-not(Test-Path -LiteralPath (Join-Path $Destino $f))){
        throw ('Instalacion incompleta. Falta: '+$f)
    }
}
Write-Host ('Archivos del proyecto verificados en: '+$Destino) -ForegroundColor Green
$npm=Get-Command npm.cmd -ErrorAction SilentlyContinue
if(-not $OmitirCompilacion){
    if($npm){
        Push-Location $Destino
        try{
            & $npm.Source ci
            if($LASTEXITCODE -ne 0){throw 'npm ci fallo. Comprueba Node.js e Internet.'}
            & $npm.Source run check
            if($LASTEXITCODE -ne 0){throw 'npm run check detecto un error. Revisa la consola.'}
            & $npm.Source run build
            if($LASTEXITCODE -ne 0){throw 'npm run build fallo. Revisa la consola.'}
        }finally{Pop-Location}
        Write-Host 'Compilacion finalizada.' -ForegroundColor Green
    }else{
        Write-Warning 'npm no esta disponible. Instala Node.js LTS y ejecuta npm ci, npm run check y npm run build en la carpeta del proyecto. Las escenas 3D compiladas pueden estar desactualizadas.'
    }
}
Write-Host ''
Write-Host '1) Inicia Apache y MySQL en Laragon.'
Write-Host '2) En MySQL NUEVO, importa database\schema.sql (base aula3d).'
Write-Host '3) Abre el panel:'
Write-Host '   http://localhost/piramide_senati_fusion/PANEL_UNIFICADO.html'
Write-Host '   http://localhost:8080/piramide_senati_fusion/PANEL_UNIFICADO.html'
Write-Host '4) Abre registro.php para crear la primera cuenta admin, si la tabla users esta vacia.'
Write-Host 'Nota: una base antigua requiere exportacion/importacion independiente; GitHub no contiene datos privados.'
