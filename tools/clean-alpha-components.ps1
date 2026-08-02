param(
  [Parameter(Mandatory = $true)]
  [string]$Pattern,
  [int]$AlphaThreshold = 8,
  [double]$MinComponentRatio = 0.015
)

Add-Type -AssemblyName System.Drawing

$files = Get-ChildItem -Path (Get-Location) -Recurse -Filter $Pattern
foreach ($file in $files) {
  $bmp = [System.Drawing.Bitmap]::new($file.FullName)
  $w = $bmp.Width
  $h = $bmp.Height
  $visited = [bool[]]::new($w * $h)
  $components = [System.Collections.Generic.List[object]]::new()

  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $idx = $y * $w + $x
      if ($visited[$idx]) { continue }
      $visited[$idx] = $true
      if ($bmp.GetPixel($x, $y).A -le $AlphaThreshold) { continue }

      $queue = [System.Collections.Generic.Queue[System.Drawing.Point]]::new()
      $pts = [System.Collections.Generic.List[System.Drawing.Point]]::new()
      $queue.Enqueue([System.Drawing.Point]::new($x, $y))
      while ($queue.Count -gt 0) {
        $p = $queue.Dequeue()
        $pts.Add($p)
        foreach ($d in @(
          [System.Drawing.Point]::new(1, 0),
          [System.Drawing.Point]::new(-1, 0),
          [System.Drawing.Point]::new(0, 1),
          [System.Drawing.Point]::new(0, -1)
        )) {
          $nx = $p.X + $d.X
          $ny = $p.Y + $d.Y
          if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $w -or $ny -ge $h) { continue }
          $nidx = $ny * $w + $nx
          if ($visited[$nidx]) { continue }
          $visited[$nidx] = $true
          if ($bmp.GetPixel($nx, $ny).A -gt $AlphaThreshold) {
            $queue.Enqueue([System.Drawing.Point]::new($nx, $ny))
          }
        }
      }
      $components.Add($pts)
    }
  }

  if ($components.Count -eq 0) {
    $bmp.Dispose()
    continue
  }

  $largest = $components | Sort-Object Count -Descending | Select-Object -First 1
  $minKeep = [Math]::Max(24, [int]($largest.Count * $MinComponentRatio))
  $removed = 0
  foreach ($component in $components) {
    if ($component.Count -ge $minKeep) { continue }
    foreach ($p in $component) {
      $bmp.SetPixel($p.X, $p.Y, [System.Drawing.Color]::Transparent)
      $removed++
    }
  }

  $tmpPath = "$($file.FullName).clean.tmp.png"
  $bmp.Save($tmpPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Move-Item -LiteralPath $tmpPath -Destination $file.FullName -Force
  Write-Output "$($file.Name): removed $removed stray pixels from $($components.Count) components"
}
