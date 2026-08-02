param(
  [string]$Pattern = 'pet-cat-anim-*-happy-v4.png'
)

Add-Type -AssemblyName System.Drawing

$files = Get-ChildItem -Path (Join-Path (Get-Location) 'generated-images') -Filter $Pattern
foreach ($file in $files) {
  $bmp = [System.Drawing.Bitmap]::new($file.FullName)
  $removed = 0
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $clearLeftStray = ($x -lt 170 -and $y -lt 310)
      $clearLowerRightStray = ($x -gt 400 -and $y -gt 300)
      if (($clearLeftStray -or $clearLowerRightStray) -and $bmp.GetPixel($x, $y).A -gt 0) {
        $bmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        $removed++
      }
    }
  }
  $tmpPath = "$($file.FullName).edge.tmp.png"
  $bmp.Save($tmpPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Move-Item -LiteralPath $tmpPath -Destination $file.FullName -Force
  Write-Output "$($file.Name): removed $removed edge stray pixels"
}
