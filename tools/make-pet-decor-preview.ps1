Add-Type -AssemblyName System.Drawing

$animals = @('cat', 'dog', 'rabbit', 'fox')
$decorItems = @(
  @{ id = 'crown-gold'; kind = 'head' },
  @{ id = 'bow-pink'; kind = 'bow' },
  @{ id = 'collar-heart'; kind = 'collar' },
  @{ id = 'collar-bell'; kind = 'collar' }
)
$anchors = @{
  cat = @{ head = @(0.50, 0.35, 0.058); collar = @(0.50, 0.635, 0.060); bow = @(0.50, 0.58, 0.070) }
  dog = @{ head = @(0.50, 0.36, 0.064); collar = @(0.50, 0.64, 0.068); bow = @(0.50, 0.59, 0.075) }
  rabbit = @{ head = @(0.50, 0.30, 0.055); collar = @(0.50, 0.60, 0.058); bow = @(0.50, 0.56, 0.068) }
  fox = @{ head = @(0.50, 0.33, 0.062); collar = @(0.50, 0.635, 0.065); bow = @(0.50, 0.58, 0.072) }
}

function Draw-ImageContain($g, $img, $x, $y, $w, $h) {
  $scale = [Math]::Min($w / $img.Width, $h / $img.Height)
  $dw = [int][Math]::Round($img.Width * $scale)
  $dh = [int][Math]::Round($img.Height * $scale)
  $dx = [int][Math]::Round($x + ($w - $dw) / 2)
  $dy = [int][Math]::Round($y + ($h - $dh) / 2)
  $g.DrawImage($img, [System.Drawing.Rectangle]::new($dx, $dy, $dw, $dh), 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel)
}

$cellW = 360
$cellH = 230
$out = [System.Drawing.Bitmap]::new($cellW * $decorItems.Count, $cellH * $animals.Count, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gOut = [System.Drawing.Graphics]::FromImage($out)
$gOut.Clear([System.Drawing.Color]::FromArgb(255, 255, 245, 248))
$gOut.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gOut.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$room = [System.Drawing.Bitmap]::new((Join-Path (Get-Location) 'generated-images\pet-room-layered-empty.png'))
foreach ($r in 0..($animals.Count - 1)) {
  $animal = $animals[$r]
  $pet = [System.Drawing.Bitmap]::new((Join-Path (Get-Location) "generated-images\pet-$animal-idle-v2.png"))
  foreach ($c in 0..($decorItems.Count - 1)) {
    $item = $decorItems[$c]
    $x = $c * $cellW
    $y = $r * $cellH
    Draw-ImageContain $gOut $room $x $y $cellW $cellH
    $petW = if ($animal -eq 'rabbit') { 118 } elseif ($animal -eq 'dog') { 138 } elseif ($animal -eq 'fox') { 132 } else { 126 }
    $petH = 170
    Draw-ImageContain $gOut $pet ($x + ($cellW - $petW) / 2) ($y + 55) $petW $petH
    $decor = [System.Drawing.Bitmap]::new((Join-Path (Get-Location) "generated-images\wear-$animal-$($item.id).png"))
    $kind = $item.kind
    $a = $anchors[$animal][$kind]
    $dw = [int][Math]::Round($cellW * $a[2])
    $dh = $dw
    Draw-ImageContain $gOut $decor ($x + $cellW * $a[0] - $dw / 2) ($y + $cellH * $a[1] - $dh / 2) $dw $dh
    $decor.Dispose()
  }
  $pet.Dispose()
}
$room.Dispose()
$out.Save((Join-Path (Get-Location) 'generated-images\pet-decor-preview-v68.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$gOut.Dispose()
$out.Dispose()
Write-Output 'generated-images\pet-decor-preview-v68.png'
