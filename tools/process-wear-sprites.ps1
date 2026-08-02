param(
  [Parameter(Mandatory = $true)]
  [string]$Source
)

Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::new($Source)
$cols = 4
$rows = 4
$cwBase = [Math]::Floor($img.Width / $cols)
$chBase = [Math]::Floor($img.Height / $rows)
$keyColor = $img.GetPixel(0, 0)
$animals = @('cat', 'dog', 'rabbit', 'fox')
$items = @('crown-gold', 'bow-pink', 'collar-heart', 'collar-bell')

function Test-KeyColor($c) {
  if ($script:keyColor.G -gt 200 -and $script:keyColor.B -gt 200 -and $script:keyColor.R -lt 80) {
    return ($c.R -lt 135 -and $c.G -gt 140 -and $c.B -gt 140)
  }
  return ([Math]::Abs($c.R - $script:keyColor.R) -lt 42 -and [Math]::Abs($c.G - $script:keyColor.G) -lt 42 -and [Math]::Abs($c.B - $script:keyColor.B) -lt 42)
}

for ($row = 0; $row -lt $rows; $row++) {
  for ($col = 0; $col -lt $cols; $col++) {
    $animal = $animals[$col]
    $item = $items[$row]
    $ox = [int]($col * $cwBase)
    $oy = [int]($row * $chBase)
    $cw = if ($col -eq ($cols - 1)) { $img.Width - $ox } else { [int]$cwBase }
    $ch = if ($row -eq ($rows - 1)) { $img.Height - $oy } else { [int]$chBase }
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
      throw "No pixels detected for $animal $item."
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

    $max = if ($item -eq 'crown-gold') { 180 } elseif ($item -eq 'bow-pink') { 190 } else { 200 }
    $scale = [Math]::Min($max / $cropW, $max / $cropH)
    $dw = [int][Math]::Round($cropW * $scale)
    $dh = [int][Math]::Round($cropH * $scale)
    $canvas = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $dest = [System.Drawing.Rectangle]::new([int][Math]::Round((256 - $dw) / 2), [int][Math]::Round((256 - $dh) / 2), $dw, $dh)
    $g.DrawImage($tmp, $dest, 0, 0, $cropW, $cropH, [System.Drawing.GraphicsUnit]::Pixel)

    $out = Join-Path (Get-Location) "generated-images\wear-$animal-$item.png"
    $canvas.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "wear-$animal-$item.png ${cropW}x${cropH} -> ${dw}x${dh}"

    $g.Dispose()
    $tmp.Dispose()
    $canvas.Dispose()
  }
}

$img.Dispose()
