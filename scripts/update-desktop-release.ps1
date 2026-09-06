[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$SourcePath = (Join-Path $PSScriptRoot "..\release\HireLevel-windows"),
  [string]$ArchivePath = (Join-Path $PSScriptRoot "..\release\HireLevel-windows.zip"),
  [string]$DestinationPath = "C:\Users\Danie\OneDrive\Desktop\HireLevel-windows"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-CloudPlaceholder($Item) {
  # OneDrive uses non-redirecting cloud reparse tags. These are not junctions.
  # Reject everything except the documented IO_REPARSE_TAG_CLOUD family.
  if ($Item.LinkType) { return $false }
  $reparseInfo = & fsutil reparsepoint query $Item.FullName 2>&1
  if ($LASTEXITCODE -ne 0) { return $false }
  $tagMatch = [regex]::Match(($reparseInfo -join "`n"), '0x[0-9a-fA-F]{8}')
  return $tagMatch.Success -and $tagMatch.Value -match '^0x9000[0-9a-fA-F]01[aA]$'
}

function Get-AbsolutePath([string]$Path) {
  $fullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path)
  return [IO.Path]::GetFullPath($fullPath).TrimEnd([IO.Path]::DirectorySeparatorChar)
}

function Assert-NoReparseAncestors([string]$Path) {
  $currentPath = $Path
  while ($currentPath) {
    if (Test-Path -LiteralPath $currentPath) {
      $item = Get-Item -LiteralPath $currentPath -Force
      if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -and -not (Test-CloudPlaceholder $item)) {
        throw "Refusing a symbolic link, junction, or other reparse point: $currentPath"
      }
    }
    $parentPath = [IO.Path]::GetDirectoryName($currentPath)
    if ($parentPath -eq $currentPath) { break }
    $currentPath = $parentPath
  }
}

function Get-ResolvedSourcePath([string]$Path) {
  # The owner's checkout is itself a junction. Resolve read-only ancestors first;
  # package contents and every destination ancestor must remain free of links.
  $resolvedPath = Get-AbsolutePath $Path
  for ($attempt = 0; $attempt -lt 16; $attempt++) {
    $ancestor = [IO.Path]::GetDirectoryName($resolvedPath)
    $changed = $false
    while ($ancestor) {
      if (Test-Path -LiteralPath $ancestor) {
        $item = Get-Item -LiteralPath $ancestor -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -and -not (Test-CloudPlaceholder $item)) {
          $targets = @($item.Target)
          if ($item.LinkType -notin @('Junction', 'SymbolicLink') -or $targets.Count -ne 1 -or -not $targets[0]) {
            throw "Cannot resolve the read-only source ancestor: $ancestor"
          }
          $linkTarget = [string]$targets[0]
          if (-not [IO.Path]::IsPathRooted($linkTarget)) { $linkTarget = Join-Path ([IO.Path]::GetDirectoryName($ancestor)) $linkTarget }
          $suffix = $resolvedPath.Substring($ancestor.Length).TrimStart([IO.Path]::DirectorySeparatorChar)
          $resolvedPath = Get-AbsolutePath (Join-Path $linkTarget $suffix)
          $changed = $true
          break
        }
      }
      $ancestor = [IO.Path]::GetDirectoryName($ancestor)
    }
    if (-not $changed) { return $resolvedPath }
  }
  throw "Too many source ancestor links: $Path"
}

function Assert-ChildPath([string]$Path, [string]$Root) {
  $resolvedPath = Get-AbsolutePath $Path
  if (-not $resolvedPath.StartsWith($Root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Path is outside the intended directory '$Root': $resolvedPath"
  }
  Assert-NoReparseAncestors $resolvedPath
}

function Get-SafeTree([string]$Root) {
  Assert-NoReparseAncestors $Root
  $pending = [Collections.Generic.Stack[string]]::new()
  $pending.Push($Root)
  while ($pending.Count -gt 0) {
    foreach ($entry in Get-ChildItem -LiteralPath $pending.Pop() -Force) {
      Assert-ChildPath $entry.FullName $Root
      $entry
      if ($entry.PSIsContainer) { $pending.Push($entry.FullName) }
    }
  }
}

function Get-RelativeName([string]$Path, [string]$Root) {
  return $Path.Substring($Root.Length + 1).Replace('\', '/')
}

$sourceRoot = Get-ResolvedSourcePath $SourcePath
$destinationRoot = Get-AbsolutePath $DestinationPath
$archiveFile = Get-ResolvedSourcePath $ArchivePath
if ([IO.Path]::GetFileName($destinationRoot) -ne 'HireLevel-windows') {
  throw 'The destination must be an explicitly named HireLevel-windows directory.'
}
if ($sourceRoot -eq $destinationRoot -or
    $sourceRoot.StartsWith($destinationRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or
    $destinationRoot.StartsWith($sourceRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'The source and destination must be separate, non-overlapping directories.'
}
if ($archiveFile.StartsWith($destinationRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'The release ZIP must be outside the directory being replaced.'
}
foreach ($path in @($sourceRoot, $destinationRoot, $archiveFile)) { Assert-NoReparseAncestors $path }
if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) { throw "Missing package: $sourceRoot" }
if (-not (Test-Path -LiteralPath $archiveFile -PathType Leaf)) { throw "Missing release ZIP: $archiveFile" }
if ((Test-Path -LiteralPath $destinationRoot) -and -not (Test-Path -LiteralPath $destinationRoot -PathType Container)) {
  throw "Destination is not a directory: $destinationRoot"
}

$sourceTree = @(Get-SafeTree $sourceRoot)
$sourceFiles = @{}
foreach ($entry in $sourceTree | Where-Object { -not $_.PSIsContainer }) {
  $relativeName = Get-RelativeName $entry.FullName $sourceRoot
  if ($entry.Name -like '*data*.json') { throw "A release must not contain user data JSON: $relativeName" }
  $sourceFiles[$relativeName] = (Get-FileHash -LiteralPath $entry.FullName -Algorithm SHA256).Hash
}
foreach ($requiredFile in @('HireLevel.html', 'app.js', 'styles.css', 'statistics.js', 'statistics-view.js', 'statistics.css', 'README.md', 'LICENSE', 'VERSION', 'windows-release-readme.txt', 'extension/manifest.json')) {
  if (-not $sourceFiles.ContainsKey($requiredFile) -or (Get-Item -LiteralPath (Join-Path $sourceRoot $requiredFile)).Length -eq 0) {
    throw "Incomplete package: missing or empty $requiredFile"
  }
}
foreach ($requiredDirectory in @('assets', 'extension')) {
  if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot $requiredDirectory) -PathType Container)) {
    throw "Incomplete package: missing directory $requiredDirectory"
  }
}
$version = (Get-Content -LiteralPath (Join-Path $sourceRoot 'VERSION') -Raw).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$') { throw 'Package VERSION is invalid.' }

# Verify the unpacked source is exactly the ZIP being released before changing the desktop.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($archiveFile)
$archiveFiles = @{}
try {
  foreach ($entry in $archive.Entries) {
    $entryName = $entry.FullName.Replace('\', '/')
    if (-not $entryName.StartsWith('HireLevel-windows/', [StringComparison]::Ordinal) -or $entryName -match '(^|/)\.\.?(/|$)') {
      throw "Unexpected ZIP path: $entryName"
    }
    if ($entryName.EndsWith('/')) { continue }
    $relativeName = $entryName.Substring('HireLevel-windows/'.Length)
    if ($archiveFiles.ContainsKey($relativeName)) { throw "Duplicate ZIP entry: $relativeName" }
    $stream = $entry.Open()
    $hasher = [Security.Cryptography.SHA256]::Create()
    try { $archiveFiles[$relativeName] = [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-', '') }
    finally { $stream.Dispose(); $hasher.Dispose() }
  }
} finally { $archive.Dispose() }
if ($archiveFiles.Count -ne $sourceFiles.Count) { throw 'ZIP and unpacked package have different file counts.' }
foreach ($relativeName in $sourceFiles.Keys) {
  if ($archiveFiles[$relativeName] -ne $sourceFiles[$relativeName]) { throw "ZIP/package mismatch: $relativeName" }
}
$archiveHash = (Get-FileHash -LiteralPath $archiveFile -Algorithm SHA256).Hash

$destinationTree = @()
if (Test-Path -LiteralPath $destinationRoot) { $destinationTree = @(Get-SafeTree $destinationRoot) }
$protectedFiles = @{}
foreach ($entry in $destinationTree | Where-Object { -not $_.PSIsContainer }) {
  $relativeName = Get-RelativeName $entry.FullName $destinationRoot
  # Keep all user JSON absent from the release, in addition to every *data*.json.
  if ($entry.Extension -eq '.json' -and ($entry.Name -like '*data*.json' -or -not $sourceFiles.ContainsKey($relativeName))) {
    foreach ($packageDirectory in $sourceTree | Where-Object { $_.PSIsContainer }) {
      if ((Get-RelativeName $packageDirectory.FullName $sourceRoot) -eq $relativeName) {
        throw "Package directory collides with protected JSON: $relativeName"
      }
    }
    foreach ($packageName in $sourceFiles.Keys) {
      if ($relativeName -eq $packageName -or
          $relativeName.StartsWith($packageName + '/', [StringComparison]::OrdinalIgnoreCase) -or
          $packageName.StartsWith($relativeName + '/', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Package path collides with protected JSON: $relativeName"
      }
    }
    $protectedFiles[$relativeName] = (Get-FileHash -LiteralPath $entry.FullName -Algorithm SHA256).Hash
  }
}

Write-Host "Verified release $version ($($sourceFiles.Count) files); desktop target: $destinationRoot"
foreach ($relativeName in $protectedFiles.Keys) { Write-Host "Preserving $relativeName; SHA256 before: $($protectedFiles[$relativeName])" }
if (-not $PSCmdlet.ShouldProcess($destinationRoot, "Replace app files with verified HireLevel $version; preserve user JSON")) { return }

Assert-NoReparseAncestors $destinationRoot
if (-not (Test-Path -LiteralPath $destinationRoot)) { New-Item -ItemType Directory -Path $destinationRoot | Out-Null }
# Delete files individually, then only empty directories. Never recursively delete a data-bearing folder.
foreach ($entry in $destinationTree | Where-Object { -not $_.PSIsContainer }) {
  $relativeName = Get-RelativeName $entry.FullName $destinationRoot
  if ($protectedFiles.ContainsKey($relativeName)) { continue }
  Assert-ChildPath $entry.FullName $destinationRoot
  Remove-Item -LiteralPath $entry.FullName -Force
}
foreach ($entry in $destinationTree | Where-Object { $_.PSIsContainer } | Sort-Object { $_.FullName.Length } -Descending) {
  Assert-ChildPath $entry.FullName $destinationRoot
  if (@(Get-ChildItem -LiteralPath $entry.FullName -Force).Count -eq 0) { Remove-Item -LiteralPath $entry.FullName -Force }
}
foreach ($entry in $sourceTree | Where-Object { $_.PSIsContainer } | Sort-Object { $_.FullName.Length }) {
  $target = Join-Path $destinationRoot (Get-RelativeName $entry.FullName $sourceRoot)
  Assert-ChildPath $target $destinationRoot
  New-Item -ItemType Directory -Path $target -Force | Out-Null
}
foreach ($relativeName in $sourceFiles.Keys) {
  $sourceFile = Join-Path $sourceRoot $relativeName
  $target = Join-Path $destinationRoot $relativeName
  Assert-ChildPath $sourceFile $sourceRoot
  Assert-ChildPath $target $destinationRoot
  if ((Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256).Hash -ne $sourceFiles[$relativeName]) {
    throw "Source package changed during update: $relativeName"
  }
  Copy-Item -LiteralPath $sourceFile -Destination $target -Force
}

$finalFiles = @(Get-SafeTree $destinationRoot | Where-Object { -not $_.PSIsContainer })
if ($finalFiles.Count -ne $sourceFiles.Count + $protectedFiles.Count) { throw 'Unexpected files remain after desktop update.' }
foreach ($relativeName in $sourceFiles.Keys) {
  if ((Get-FileHash -LiteralPath (Join-Path $destinationRoot $relativeName) -Algorithm SHA256).Hash -ne $sourceFiles[$relativeName]) {
    throw "Desktop verification failed: $relativeName"
  }
}
foreach ($relativeName in $protectedFiles.Keys) {
  $afterHash = (Get-FileHash -LiteralPath (Join-Path $destinationRoot $relativeName) -Algorithm SHA256).Hash
  if ($afterHash -ne $protectedFiles[$relativeName]) { throw "Protected JSON changed during update: $relativeName" }
  Write-Host "Preserved $relativeName; SHA256 after: $afterHash"
}
if ((Get-FileHash -LiteralPath $archiveFile -Algorithm SHA256).Hash -ne $archiveHash) { throw 'Release ZIP changed during update.' }
[pscustomobject]@{
  Version = $version
  Destination = $destinationRoot
  PackageFilesVerified = $sourceFiles.Count
  ProtectedJsonFilesVerified = $protectedFiles.Count
  ReleaseZipSHA256 = $archiveHash
}
