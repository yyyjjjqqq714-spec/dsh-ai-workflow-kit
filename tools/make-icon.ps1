<#
  Render assets/icon-180.png - the 180x180 icon used by plugin markets.
  Pure ASCII so Windows PowerShell 5.1 parses it safely.
#>
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'assets'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$out = Join-Path $outDir 'icon-180.png'

$size = 180
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# transparent canvas
$g.Clear([System.Drawing.Color]::Transparent)

# rounded background with vertical gradient
$radius = 40
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$d = $radius * 2
$rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
$path.AddArc(0, 0, $d, $d, 180, 90)
$path.AddArc($size - $d, 0, $d, $d, 270, 90)
$path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
$path.AddArc(0, $size - $d, $d, $d, 90, 90)
$path.CloseFigure()

$c1 = [System.Drawing.Color]::FromArgb(255, 79, 124, 255)
$c2 = [System.Drawing.Color]::FromArgb(255, 139, 92, 246)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $c1, $c2, 45.0
$g.FillPath($brush, $path)
$brush.Dispose()

# glyph: two blocks on the left, a block on top right, plus a plus sign
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 9
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

# top wide block
$g.DrawRectangle($pen, 42, 40, 96, 26)
# bottom-left block
$g.DrawRectangle($pen, 42, 80, 46, 58)
# plus sign, bottom-right
$g.DrawLine($pen, 128, 92, 128, 126)
$g.DrawLine($pen, 111, 109, 145, 109)

$pen.Dispose()
$g.Dispose()

$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

$info = Get-Item $out
Write-Host ("wrote " + $info.FullName + " (" + $info.Length + " bytes)")
