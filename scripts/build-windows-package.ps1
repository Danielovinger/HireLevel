$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $repoRoot "release"
$packageRoot = Join-Path $releaseRoot "HireLevel-windows"
$zipPath = Join-Path $releaseRoot "HireLevel-windows.zip"

# Validate the exact generated targets before recursively replacing a build.
$expectedPackageRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot "release\HireLevel-windows"))
if ([System.IO.Path]::GetFullPath($packageRoot) -ne $expectedPackageRoot) { throw "Unexpected package destination." }
foreach ($target in @($releaseRoot, $packageRoot, $zipPath)) {
  if (Test-Path -LiteralPath $target) {
    if ((Get-Item -LiteralPath $target -Force).Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw "Build target cannot be a link: $target" }
  }
}
if (Test-Path -LiteralPath $packageRoot) {
  if (Get-ChildItem -LiteralPath $packageRoot -Recurse -Force | Where-Object { $_.Attributes -band [System.IO.FileAttributes]::ReparsePoint }) { throw "Package contains a link; refusing recursive replacement." }
}

if (Test-Path $packageRoot) {
  Remove-Item -LiteralPath $packageRoot -Recurse -Force
}

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null

Copy-Item (Join-Path $repoRoot "index.html") (Join-Path $packageRoot "HireLevel.html")
Copy-Item (Join-Path $repoRoot "app.js") (Join-Path $packageRoot "app.js")
Copy-Item (Join-Path $repoRoot "styles.css") (Join-Path $packageRoot "styles.css")
Copy-Item (Join-Path $repoRoot "statistics.js") (Join-Path $packageRoot "statistics.js")
Copy-Item (Join-Path $repoRoot "statistics-view.js") (Join-Path $packageRoot "statistics-view.js")
Copy-Item (Join-Path $repoRoot "statistics.css") (Join-Path $packageRoot "statistics.css")

Copy-Item (Join-Path $repoRoot "assets") (Join-Path $packageRoot "assets") -Recurse
Copy-Item (Join-Path $repoRoot "extension") (Join-Path $packageRoot "extension") -Recurse
Copy-Item (Join-Path $repoRoot "README.md") (Join-Path $packageRoot "README.md")
Copy-Item (Join-Path $repoRoot "LICENSE") (Join-Path $packageRoot "LICENSE")
Copy-Item (Join-Path $repoRoot "VERSION") (Join-Path $packageRoot "VERSION")
Copy-Item (Join-Path $repoRoot "docs\windows-release-readme.txt") (Join-Path $packageRoot "windows-release-readme.txt")

Compress-Archive -Path $packageRoot -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "Built $zipPath"
