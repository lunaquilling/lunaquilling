$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot 'dist')).Path
$contentTypes = @{
  '.css' = 'text/css; charset=utf-8'
  '.html' = 'text/html; charset=utf-8'
  '.jpeg' = 'image/jpeg'
  '.jpg' = 'image/jpeg'
  '.js' = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png' = 'image/png'
  '.svg' = 'image/svg+xml'
  '.webp' = 'image/webp'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add('http://127.0.0.1:8001/')
$listener.Start()
Write-Host 'Serving the built website at http://127.0.0.1:8001 (press Ctrl+C to stop)'

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      $relativePath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/')
      if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = 'index.html'
      }
      $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))
      if (-not $filePath.StartsWith("$root$([System.IO.Path]::DirectorySeparatorChar)", [System.StringComparison]::OrdinalIgnoreCase)) {
        $context.Response.StatusCode = 403
        $body = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
        $context.Response.ContentType = 'text/plain; charset=utf-8'
      } elseif (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        $context.Response.StatusCode = 404
        $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
        $context.Response.ContentType = 'text/plain; charset=utf-8'
      } else {
        $body = [System.IO.File]::ReadAllBytes($filePath)
        $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
        $context.Response.ContentType = if ($contentTypes.ContainsKey($extension)) {
          $contentTypes[$extension]
        } else {
          'application/octet-stream'
        }
      }
      $context.Response.ContentLength64 = $body.Length
      $context.Response.OutputStream.Write($body, 0, $body.Length)
    } catch {
      Write-Host "Preview request failed: $_" -ForegroundColor Yellow
    } finally {
      $context.Response.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
