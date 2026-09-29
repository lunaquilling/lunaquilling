param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot 'dist')
)

$ErrorActionPreference = 'Stop'
$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
$supportedExtensions = @('.jpg', '.jpeg', '.png', '.webp')
$catalogs = [ordered]@{}

function Get-ImageCategory([string]$name) {
  switch -Regex ($name.ToLowerInvariant()) {
    'birthday|anniversary|wedding|engagement|teacher|occasion|celebration|farewell|festival|diya' { return 'Celebrations' }
    'name|initial|monogram' { return 'Names & Initials' }
    'portrait|couple|family|baby|child|mother|father|friend|person' { return 'People & Portraits' }
    'flower|floral|rose|garden|nature|bird|moon' { return 'Floral & Nature' }
    'quill|paper|art|frame|design|gift|memory|box|lamp' { return 'Quilling Art' }
  }
  return 'Other'
}

foreach ($catalog in @(
  @{ Key = 'work'; Folder = 'works'; Title = 'Artwork'; Prefix = 'WK'; IdFile = 'work-ids.json' }
  @{ Key = 'references'; Folder = 'refences'; Title = 'Reference'; Prefix = 'RF'; IdFile = 'reference-ids.json' }
)) {
  $folderPath = Join-Path $PSScriptRoot $catalog.Folder
  $idPath = Join-Path $PSScriptRoot $catalog.IdFile
  $ids = @{}
  $idsChanged = $false

  if (Test-Path -LiteralPath $idPath -PathType Leaf) {
    $storedIds = Get-Content -LiteralPath $idPath -Raw | ConvertFrom-Json
    foreach ($property in $storedIds.PSObject.Properties) {
      if ($property.Value -match "^$($catalog.Prefix)\d{3}$") {
        $ids[$property.Name] = $property.Value
      }
    }
  }

  $nextId = 0
  foreach ($assignedId in $ids.Values) {
    $number = [int]($assignedId -replace "^$($catalog.Prefix)", '')
    if ($number -gt $nextId) { $nextId = $number }
  }

  $files = @(Get-ChildItem -LiteralPath $folderPath -File |
    Where-Object { $supportedExtensions -contains $_.Extension.ToLowerInvariant() } |
    Sort-Object Name)
  $images = @(
    foreach ($file in $files) {
      if (-not $ids.ContainsKey($file.Name)) {
        $nextId += 1
        if ($nextId -gt 999) { throw "The $($catalog.Key) catalogue has reached its 999-ID limit." }
        $ids[$file.Name] = '{0}{1:D3}' -f $catalog.Prefix, $nextId
        $idsChanged = $true
      }

      [PSCustomObject][ordered]@{
        filename = $file.Name
        src = "./$($catalog.Folder)/$([System.Uri]::EscapeDataString($file.Name))"
        title = "$($catalog.Title) $($file.BaseName)"
        category = Get-ImageCategory $file.BaseName
        catalogId = $ids[$file.Name]
      }
    }
  )

  if ($idsChanged) {
    ConvertTo-Json -InputObject $ids -Depth 3 | Set-Content -LiteralPath $idPath -Encoding UTF8
  }
  $catalogs[$catalog.Key] = $images
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$catalogJson = ConvertTo-Json -InputObject $catalogs -Depth 6
[System.IO.File]::WriteAllText(
  (Join-Path $PSScriptRoot 'catalog.json'),
  $catalogJson,
  [System.Text.UTF8Encoding]::new($false)
)
[System.IO.File]::WriteAllText(
  (Join-Path $OutputDirectory 'catalog.json'),
  $catalogJson,
  [System.Text.UTF8Encoding]::new($false)
)

foreach ($file in @('index.html', 'styles.css', 'script.js', 'config.js')) {
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination $OutputDirectory -Force
}
foreach ($folder in @('assets', 'works', 'refences')) {
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot $folder) -Destination $OutputDirectory -Recurse -Force
}

foreach ($folder in @('works', 'refences')) {
  $sourceFolder = Join-Path $PSScriptRoot $folder
  $outputFolder = Join-Path $OutputDirectory $folder
  $sourceImageNames = @(
    Get-ChildItem -LiteralPath $sourceFolder -File |
      Where-Object { $supportedExtensions -contains $_.Extension.ToLowerInvariant() } |
      ForEach-Object { $_.Name }
  )
  Get-ChildItem -LiteralPath $outputFolder -File |
    Where-Object {
      ($supportedExtensions -contains $_.Extension.ToLowerInvariant()) -and
      ($sourceImageNames -notcontains $_.Name)
    } |
    Remove-Item -Force
}

Write-Host "Built $($catalogs.work.Count) artwork images and $($catalogs.references.Count) reference images in $OutputDirectory."