$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $repoRoot "release"
$packageRoot = Join-Path $releaseRoot "HireLevel-windows"
$zipPath = Join-Path $releaseRoot "HireLevel-windows.zip"

if (Test-Path $packageRoot) {
  Remove-Item $packageRoot -Recurse -Force
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null

Copy-Item (Join-Path $repoRoot "index.html") (Join-Path $packageRoot "HireLevel.html")
Copy-Item (Join-Path $repoRoot "app.js") (Join-Path $packageRoot "app.js")
Copy-Item (Join-Path $repoRoot "styles.css") (Join-Path $packageRoot "styles.css")

Copy-Item (Join-Path $repoRoot "extension") (Join-Path $packageRoot "extension") -Recurse
Copy-Item (Join-Path $repoRoot "README.md") (Join-Path $packageRoot "README.md")
Copy-Item (Join-Path $repoRoot "LICENSE") (Join-Path $packageRoot "LICENSE")
Copy-Item (Join-Path $repoRoot "VERSION") (Join-Path $packageRoot "VERSION")
Copy-Item (Join-Path $repoRoot "docs\windows-release-readme.txt") (Join-Path $packageRoot "windows-release-readme.txt")

Compress-Archive -Path $packageRoot -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "Built $zipPath"
