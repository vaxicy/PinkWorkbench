param(
  [Parameter(Mandatory = $true)]
  [string]$Source
)

Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::new($Source)
$cols = 3
$rows = 2
$cw = [int]($img.Width / $cols)
$ch = [int]($img.Height / $rows)
$keyColor = $img.GetPixel(0, 0)

$items = @(
  @{ id = 'bow-pink'; col = 0; row = 0; max = 210 },
  @{ id = 'crown-gold'; col = 1; row = 0; max = 190 },
  @{ id = 'collar-heart'; col = 2; row = 0; max = 218 },
  @{ id = 'collar-bell'; col = 0; row = 1; max = 218 },
  @{ id = 'toy-yarn'; col = 1; row = 1; max = 200 },
  @{ id = 'rug-flower'; col = 2; row = 1; max = 218 }
)

function Test-KeyColor($c) {
  if ($script:keyColor.G -gt 200 -and $script:keyColor.B -gt 200 -and $script:keyColor.R -lt 80) {
    return ($c.R -lt 130 -and $c.G -gt 145 -and $c.B -gt 145)
  }
  return ([Math]::Abs($c.R - $script:keyColor.R) -lt 42 -and [Math]::Abs($c.G - $script:keyColor.G) -lt 42 -and [Math]::Abs($c.B - $script:keyColor.B) -lt 42)
}

foreach ($item in $items) {
  $ox = $item.col * $cw
  $oy = $item.row * $ch
  $minX = $cw
  $minY = $ch
  $maxX = -1
  $maxY = -1

  for ($y = 0; $y -lt $ch; $y++) {
    for ($x = 0; $x -lt $cw; $x++) {
      $c = $img.GetPixel($ox + $x, $oy + $y)
      if (-not (Test-KeyColor $c)) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  $cropW = $maxX - $minX + 1
  $cropH = $maxY - $minY + 1
  if ($cropW -le 0 -or $cropH -le 0) {
    throw "No pixels detected for $($item.id)."
  }

  $tmp = [System.Drawing.Bitmap]::new($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($cy = 0; $cy -lt $cropH; $cy++) {
    for ($cx = 0; $cx -lt $cropW; $cx++) {
      $pc = $img.GetPixel($ox + $minX + $cx, $oy + $minY + $cy)
      if (Test-KeyColor $pc) {
        $tmp.SetPixel($cx, $cy, [System.Drawing.Color]::Transparent)
      } else {
        $tmp.SetPixel($cx, $cy, $pc)
      }
    }
  }

  $scale = [Math]::Min($item.max / $cropW, $item.max / $cropH)
  $dw = [int][Math]::Round($cropW * $scale)
  $dh = [int][Math]::Round($cropH * $scale)
  $canvas = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $dest = [System.Drawing.Rectangle]::new([int][Math]::Round((256 - $dw) / 2), [int][Math]::Round((256 - $dh) / 2), $dw, $dh)
  $g.DrawImage($tmp, $dest, 0, 0, $cropW, $cropH, [System.Drawing.GraphicsUnit]::Pixel)

  $out = Join-Path (Get-Location) "generated-images\shop-$($item.id).png"
  $canvas.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "shop-$($item.id).png ${cropW}x${cropH} -> ${dw}x${dh}"

  $g.Dispose()
  $tmp.Dispose()
  $canvas.Dispose()
}

$img.Dispose()
