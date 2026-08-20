param()

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Split-Path -Parent $MyInvocation.MyCommand.Path)).Path
$rootPrefix = "$($root.TrimEnd('\'))\"

# Reserve an ephemeral loopback port so multiple portable copies can coexist.
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = ([Net.IPEndPoint]$listener.LocalEndpoint).Port
$address = "http://127.0.0.1:$port/"

$mimeTypes = @{
  ".css" = "text/css; charset=utf-8"
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".mjs" = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".map" = "application/json; charset=utf-8"
  ".svg" = "image/svg+xml"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"
  ".ico" = "image/x-icon"
  ".woff2" = "font/woff2"
  ".webmanifest" = "application/manifest+json"
  ".wasm" = "application/wasm"
}

Start-Process $address
Write-Host "PokeRNGKit is running at $address"
Write-Host "Close this window to stop the local server."

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $null
    $reader = $null
    try {
      $stream = $client.GetStream()
      $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 4096, $true)
      $requestLine = $reader.ReadLine()
      while (($header = $reader.ReadLine()) -ne $null -and $header.Length -gt 0) { }

      $requestParts = $requestLine.Split(' ', 3)
      if ($requestParts.Count -lt 2) {
        throw "Invalid HTTP request."
      }
      $requestUri = [Uri]::new("http://127.0.0.1$requestParts[1]")
      $requestPath = [Uri]::UnescapeDataString($requestUri.AbsolutePath.TrimStart('/'))
      if ([string]::IsNullOrWhiteSpace($requestPath)) {
        $requestPath = "index.html"
      }

      $candidate = Join-Path $root ($requestPath -replace '/', '\')
      $filePath = [IO.Path]::GetFullPath($candidate)
      if (-not $filePath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        $body = [Text.Encoding]::UTF8.GetBytes("Forbidden")
        $response = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 403 Forbidden`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
        $stream.Write($response, 0, $response.Length)
        $stream.Write($body, 0, $body.Length)
        continue
      }

      if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        $body = [Text.Encoding]::UTF8.GetBytes("Not Found")
        $response = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
        $stream.Write($response, 0, $response.Length)
        $stream.Write($body, 0, $body.Length)
        continue
      }

      $bytes = [IO.File]::ReadAllBytes($filePath)
      $extension = [IO.Path]::GetExtension($filePath).ToLowerInvariant()
      $contentType = $mimeTypes[$extension]
      if ([string]::IsNullOrWhiteSpace($contentType)) {
        $contentType = "application/octet-stream"
      }
      $response = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n")
      $stream.Write($response, 0, $response.Length)
      $stream.Write($bytes, 0, $bytes.Length)
    } catch {
      if ($stream) {
        $body = [Text.Encoding]::UTF8.GetBytes("Internal Server Error")
        $response = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 500 Internal Server Error`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
        $stream.Write($response, 0, $response.Length)
        $stream.Write($body, 0, $body.Length)
      }
    } finally {
      if ($reader) { $reader.Dispose() }
      if ($stream) { $stream.Dispose() }
      $client.Dispose()
    }
  }
} finally {
  $listener.Stop()
  $listener.Dispose()
}
