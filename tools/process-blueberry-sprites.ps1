param(
  [Parameter(Mandatory = $true)]
  [string]$Source
)

Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::new($Source)
$qw = [int]($img.Width / 2)
$qh = [int]($img.Height / 2)
$keyColor = $img.GetPixel(0, 0)

$targets = @(
  @{ i = 1; x = 0;   y = 0;   mw = 150; mh = 150 },
  @{ i = 2; x = $qw; y = 0;   mw = 205; mh = 225 },
  @{ i = 3; x = 0;   y = $qh; mw = 285; mh = 285 },
  @{ i = 4; x = $qw; y = $qh; mw = 300; mh = 300 }
)

function Test-KeyColor($c) {
  if ($script:keyColor.G -gt 200 -and $script:keyColor.B -gt 200 -and $script:keyColor.R -lt 80) {
    return ($c.R -lt 130 -and $c.G -gt 140 -and $c.B -gt 140)
  }
  return ([Math]::Abs($c.R - $script:keyColor.R) -lt 42 -and [Math]::Abs($c.G - $script:keyColor.G) -lt 42 -and [Math]::Abs($c.B - $script:keyColor.B) -lt 42)
}

function Test-MagentaFringe($c) {
  return ($c.A -gt 0 -and $c.R -gt 80 -and $c.B -gt 80 -and $c.G -lt 105 -and [Math]::Abs($c.R - $c.B) -lt 90)
}

function Test-NearTransparent($bmp, $x, $y) {
  for ($dy = -2; $dy -le 2; $dy++) {
    for ($dx = -2; $dx -le 2; $dx++) {
      if ($dx -eq 0 -and $dy -eq 0) { continue }
      $nx = $x + $dx
      $ny = $y + $dy
      if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $bmp.Width -or $ny -ge $bmp.Height) {
        return $true
      }
      if ($bmp.GetPixel($nx, $ny).A -lt 8) {
        return $true
      }
    }
  }
  return $false
}

foreach ($t in $targets) {
  $minX = $qw
  $minY = $qh
  $maxX = -1
  $maxY = -1

  for ($yy = 0; $yy -lt $qh; $yy++) {
    for ($xx = 0; $xx -lt $qw; $xx++) {
      $c = $img.GetPixel($t.x + $xx, $t.y + $yy)
      if (-not (Test-KeyColor $c)) {
        if ($xx -lt $minX) { $minX = $xx }
        if ($yy -lt $minY) { $minY = $yy }
        if ($xx -gt $maxX) { $maxX = $xx }
        if ($yy -gt $maxY) { $maxY = $yy }
      }
    }
  }

  $cropW = $maxX - $minX + 1
  $cropH = $maxY - $minY + 1
  if ($cropW -le 0 -or $cropH -le 0) {
    throw "No sprite pixels detected for stage $($t.i)."
  }

  $scale = [Math]::Min($t.mw / $cropW, $t.mh / $cropH)
  $dw = [int][Math]::Round($cropW * $scale)
  $dh = [int][Math]::Round($cropH * $scale)
  $destX = [int][Math]::Round((360 - $dw) / 2)
  $destY = 338 - $dh

  $tmp = [System.Drawing.Bitmap]::new($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($cy = 0; $cy -lt $cropH; $cy++) {
    for ($cx = 0; $cx -lt $cropW; $cx++) {
      $pc = $img.GetPixel($t.x + $minX + $cx, $t.y + $minY + $cy)
      if (Test-KeyColor $pc) {
        $tmp.SetPixel($cx, $cy, [System.Drawing.Color]::Transparent)
      } else {
        $tmp.SetPixel($cx, $cy, $pc)
      }
    }
  }

  $canvas = [System.Drawing.Bitmap]::new(360, 360, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $destRect = [System.Drawing.Rectangle]::new($destX, $destY, $dw, $dh)
  $g.DrawImage($tmp, $destRect, 0, 0, $cropW, $cropH, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()

  for ($py = 0; $py -lt $canvas.Height; $py++) {
    for ($px = 0; $px -lt $canvas.Width; $px++) {
      $pc = $canvas.GetPixel($px, $py)
      if ((Test-MagentaFringe $pc) -and (Test-NearTransparent $canvas $px $py)) {
        $canvas.SetPixel($px, $py, [System.Drawing.Color]::Transparent)
      }
    }
  }

  $out = Join-Path (Get-Location) "generated-images\plant-blueberry-stage-$($t.i)-clean-v3.png"
  $canvas.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)

  $tmp.Dispose()
  $canvas.Dispose()

  Write-Output "stage $($t.i): source ${cropW}x${cropH}, output ${dw}x${dh}, anchor $destX,$destY"
}

$img.Dispose()
