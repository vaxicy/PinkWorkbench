Add-Type -AssemblyName System.Drawing

Get-ChildItem -Path "generated-images" -Filter "plant-*-stage-*-clean-v3.png" | ForEach-Object {
  $bmp = [System.Drawing.Bitmap]::new($_.FullName)
  try {
    $minX = $bmp.Width
    $minY = $bmp.Height
    $maxX = -1
    $maxY = -1
    for ($y = 0; $y -lt $bmp.Height; $y++) {
      for ($x = 0; $x -lt $bmp.Width; $x++) {
        if ($bmp.GetPixel($x, $y).A -gt 16) {
          if ($x -lt $minX) { $minX = $x }
          if ($x -gt $maxX) { $maxX = $x }
          if ($y -lt $minY) { $minY = $y }
          if ($y -gt $maxY) { $maxY = $y }
        }
      }
    }
    $cx = ($minX + $maxX) / 2
    $cy = ($minY + $maxY) / 2
    [pscustomobject]@{
      Name = $_.Name
      Size = "$($bmp.Width)x$($bmp.Height)"
      Bounds = "$minX,$minY-$maxX,$maxY"
      OffsetX = [math]::Round($cx - ($bmp.Width / 2), 1)
      OffsetY = [math]::Round($cy - ($bmp.Height / 2), 1)
    }
  }
  finally {
    $bmp.Dispose()
  }
} | Format-Table -AutoSize
