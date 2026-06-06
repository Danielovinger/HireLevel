$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$dist = Join-Path $root "desktop-dist"

if (Test-Path $dist) {
  Remove-Item -LiteralPath $dist -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $dist | Out-Null

Copy-Item -Path (Join-Path $root "index.html") -Destination $dist
Copy-Item -Path (Join-Path $root "app.js") -Destination $dist
Copy-Item -Path (Join-Path $root "styles.css") -Destination $dist
