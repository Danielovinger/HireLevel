$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$port = 8765
$prefix = "http://127.0.0.1:$port/"
$listener = New-Object System.Net.HttpListener

try {
  $listener.Prefixes.Add($prefix)
  $listener.Start()
} catch {
  Write-Host "HireLevel could not start on $prefix"
  Write-Host "Another app may already be using port $port."
  Write-Host ""
  Write-Host "Press Enter to close."
  [void][Console]::ReadLine()
  exit 1
}

Write-Host "HireLevel is running at $prefix"
Write-Host "Keep this window open while using HireLevel."
Write-Host "Close this window to stop the local app server."
Write-Host ""

Start-Process $prefix

function Get-ContentType($path) {
  switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8"; break }
    ".css" { "text/css; charset=utf-8"; break }
    ".js" { "text/javascript; charset=utf-8"; break }
    ".json" { "application/json; charset=utf-8"; break }
    ".png" { "image/png"; break }
    ".svg" { "image/svg+xml"; break }
    default { "application/octet-stream" }
  }
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $requestPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = "index.html"
    }

    $fullPath = Join-Path $root $requestPath
    $resolvedPath = $null
    if (Test-Path $fullPath -PathType Leaf) {
      $resolvedPath = (Resolve-Path $fullPath).Path
    }

    if ($resolvedPath -and $resolvedPath.StartsWith($root.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
      $bytes = [System.IO.File]::ReadAllBytes($resolvedPath)
      $context.Response.StatusCode = 200
      $context.Response.ContentType = Get-ContentType $resolvedPath
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
      $context.Response.StatusCode = 404
      $context.Response.ContentType = "text/plain; charset=utf-8"
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    }

    $context.Response.OutputStream.Close()
  }
} finally {
  $listener.Stop()
}
