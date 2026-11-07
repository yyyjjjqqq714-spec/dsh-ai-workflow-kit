<#
  Compress style stills to 640x360 JPEG for package distribution.
  Source map: content/styles/_sources.json (written by tools/prepare-content.mjs)
  Output:     content/styles/stills/<id>.jpg

  Pure ASCII on purpose: Windows PowerShell 5.1 decodes BOM-less UTF-8 as ANSI,
  which corrupts CJK string literals and breaks parsing.
#>
param(
  [int]$Width = 640,
  [int]$Height = 360,
  [int]$Quality = 80
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$mapFile = Join-Path $root 'tools\_build\stills-sources.json'
$outDir = Join-Path $root 'content\styles\stills'

if (-not (Test-Path $mapFile)) { throw "Missing $mapFile - run: node tools/prepare-content.mjs" }
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$map = Get-Content $mapFile -Raw -Encoding UTF8 | ConvertFrom-Json

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters 1
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

$done = 0
$skip = 0
$fail = @()

foreach ($item in $map) {
  $out = Join-Path $outDir ($item.id + '.jpg')
  if (Test-Path $out) { $skip++; continue }
  if (-not $item.source) { $fail += ($item.id + ': no source'); continue }

  try {
    $img = [System.Drawing.Image]::FromFile($item.source)
    try {
      $bmp = New-Object System.Drawing.Bitmap $Width, $Height
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      try {
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

        # cover crop: fill the box, centre-crop the overflow
        $scale = [Math]::Max($Width / $img.Width, $Height / $img.Height)
        $w = [int]($img.Width * $scale)
        $h = [int]($img.Height * $scale)
        $x = [int](($w - $Width) / 2)
        $y = [int](($h - $Height) / 2)
        $dest = New-Object System.Drawing.Rectangle 0, 0, $Width, $Height
        $g.DrawImage($img, $dest, $x, $y, $w, $h, [System.Drawing.GraphicsUnit]::Pixel)
      } finally { $g.Dispose() }

      $bmp.Save($out, $codec, $encParams)
      $bmp.Dispose()
      $done++
    } finally { $img.Dispose() }
  } catch {
    $fail += ($item.id + ': ' + $_.Exception.Message)
  }
}

Write-Host ("compressed=" + $done + " skipped=" + $skip + " failed=" + $fail.Count)
if ($fail.Count -gt 0) { $fail | Select-Object -First 10 | ForEach-Object { Write-Host ("  " + $_) } }

$bytes = (Get-ChildItem $outDir -File | Measure-Object Length -Sum).Sum
$mb = [math]::Round($bytes / 1MB, 2)
Write-Host ("stills total: " + $mb + " MB")
