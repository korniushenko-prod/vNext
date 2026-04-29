$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$editorWebDir = Join-Path $repoRoot "apps/editor-web"
$editorDistDir = Join-Path $editorWebDir "dist"
$shipcontrollerDataDir = Join-Path $repoRoot "targets/shipcontroller-esp32/data"
$shipcontrollerEditorDir = Join-Path $shipcontrollerDataDir "editor"

if (-not (Test-Path $editorWebDir)) {
    throw "editor-web directory not found: $editorWebDir"
}

if (-not (Test-Path $shipcontrollerDataDir)) {
    throw "shipcontroller data directory not found: $shipcontrollerDataDir"
}

Write-Host "Building editor-web bundle..."
& "C:\Program Files\nodejs\corepack.cmd" pnpm --dir $editorWebDir build
if ($LASTEXITCODE -ne 0) {
    throw "editor-web build failed"
}

if (Test-Path $shipcontrollerEditorDir) {
    Remove-Item -LiteralPath $shipcontrollerEditorDir -Recurse -Force
}

New-Item -ItemType Directory -Path $shipcontrollerEditorDir | Out-Null
Copy-Item -Path (Join-Path $editorDistDir "*") -Destination $shipcontrollerEditorDir -Recurse -Force

Write-Host "Published editor-web to $shipcontrollerEditorDir"
