param(
  [Parameter(Mandatory = $true)]
  [string]$Source,
  [Parameter(Mandatory = $true)]
  [string]$Pet,
  [Parameter(Mandatory = $true)]
  [string]$NamesCsv,
  [int]$Cols = 4,
  [int]$Rows = 2,
  [string]$Action = 'idle',
  [string]$Version = 'v3'
)

Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::new($Source)
$cwBase = [Math]::Floor($img.Width / $Cols)
$chBase = [Math]::Floor($img.Height / $Rows)
$keyColor = $img.GetPixel(0, 0)
$Names = $NamesCsv.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }

function Test-KeyColor($c) {
  if ($script:keyColor.G -gt 200 -and $script:keyColor.B -gt 200 -and $script:keyColor.R -lt 80) {
    $cyanLike = ($c.R -lt 95 -and $c.G -gt 145 -and $c.B -gt 145 -and ([Math]::Abs($c.G - $c.B) -lt 95))
    $brightCyan = ($c.R -lt 120 -and $c.G -gt 175 -and $c.B -gt 175 -and ([Math]::Abs($c.G - $c.B) -lt 75))
    return ($cyanLike -or $brightCyan)
  }
  return ([Math]::Abs($c.R - $script:keyColor.R) -lt 45 -and [Math]::Abs($c.G - $script:keyColor.G) -lt 45 -and [Math]::Abs($c.B - $script:keyColor.B) -lt 45)
}

for ($idx = 0; $idx -lt $Names.Count; $idx++) {
  $row = [Math]::Floor($idx / $Cols)
  $col = $idx % $Cols
  $name = $Names[$idx]
  $ox = [int]($col * $cwBase)
  $oy = [int]($row * $chBase)
  $cw = if ($col -eq ($Cols - 1)) { $img.Width - $ox } else { [int]$cwBase }
  $ch = if ($row -eq ($Rows - 1)) { $img.Height - $oy } else { [int]$chBase }

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
    throw "No sprite pixels detected for $Pet $name."
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

  $scale = [Math]::Min(500 / $cropW, 500 / $cropH)
  $dw = [int][Math]::Round($cropW * $scale)
  $dh = [int][Math]::Round($cropH * $scale)
  $canvas = [System.Drawing.Bitmap]::new(520, 520, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $destX = [int][Math]::Round((520 - $dw) / 2)
  $destY = 510 - $dh
  $g.DrawImage($tmp, [System.Drawing.Rectangle]::new($destX, $destY, $dw, $dh), 0, 0, $cropW, $cropH, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()

  $edgePixels = [System.Collections.Generic.List[object]]::new()
  for ($py = 1; $py -lt 519; $py++) {
    for ($px = 1; $px -lt 519; $px++) {
      $pc = $canvas.GetPixel($px, $py)
      if ($pc.A -eq 0) { continue }
      $cyanFringe = ($pc.R -lt 110 -and $pc.G -gt 135 -and $pc.B -gt 135 -and (($pc.G - $pc.R) -gt 45 -and ($pc.B - $pc.R) -gt 45) -and [Math]::Abs($pc.G - $pc.B) -lt 105)
      if (-not $cyanFringe) { continue }
      $touchesTransparent = $false
      for ($ny = -1; $ny -le 1; $ny++) {
        for ($nx = -1; $nx -le 1; $nx++) {
          if ($nx -eq 0 -and $ny -eq 0) { continue }
          if ($canvas.GetPixel($px + $nx, $py + $ny).A -lt 20) { $touchesTransparent = $true }
        }
      }
      if ($touchesTransparent) { $edgePixels.Add([System.Drawing.Point]::new($px, $py)) }
    }
  }
  foreach ($pt in $edgePixels) {
    $canvas.SetPixel($pt.X, $pt.Y, [System.Drawing.Color]::Transparent)
  }

  $out = Join-Path (Get-Location) "generated-images\pet-$Pet-$Action-$name-$Version.png"
  $canvas.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "pet-$Pet-$Action-$name-$Version.png ${cropW}x${cropH} -> ${dw}x${dh}"

  $tmp.Dispose()
  $canvas.Dispose()
}

$img.Dispose()
