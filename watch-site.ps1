$ErrorActionPreference = 'Stop'
$buildScript = Join-Path $PSScriptRoot 'build-site.ps1'
$imageFolders = @('works', 'refences')
$supportedExtensions = @('.jpg', '.jpeg', '.png', '.webp')

function Get-ImageSnapshot {
  $entries = @(
    foreach ($folder in $imageFolders) {
      Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot $folder) -File |
        Where-Object { $supportedExtensions -contains $_.Extension.ToLowerInvariant() } |
        ForEach-Object { "$folder/$($_.Name)|$($_.Length)|$($_.LastWriteTimeUtc.Ticks)" }
    }
  )
  return $entries -join "`n"
}

& $buildScript
$lastBuiltSnapshot = Get-ImageSnapshot
$candidateSnapshot = $null
Write-Host 'Watching works/ and refences/ for image changes. Press Ctrl+C to stop.'

while ($true) {
  Start-Sleep -Seconds 1
  $currentSnapshot = Get-ImageSnapshot
  if ($currentSnapshot -eq $lastBuiltSnapshot) {
    $candidateSnapshot = $null
    continue
  }
  if ($currentSnapshot -ne $candidateSnapshot) {
    $candidateSnapshot = $currentSnapshot
    continue
  }

  Write-Host 'Image changes detected; rebuilding the website...'
  & $buildScript
  $lastBuiltSnapshot = $currentSnapshot
  $candidateSnapshot = $null
}
