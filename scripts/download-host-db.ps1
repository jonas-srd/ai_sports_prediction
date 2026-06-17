param(
  [string]$HostUrl = "",
  [string]$Token = "",
  [string]$Filename = "",
  [string]$DbPath = "",
  [switch]$KeepDownloaded
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Import-DotEnv {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  foreach ($rawLine in Get-Content -LiteralPath $Path) {
    $line = $rawLine.Trim()
    if ($line.Length -eq 0 -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      continue
    }

    $separator = $line.IndexOf("=")
    $name = $line.Substring(0, $separator).Trim()
    $value = $line.Substring($separator + 1).Trim().Trim('"').Trim("'")

    if ($name -and -not [Environment]::GetEnvironmentVariable($name, "Process")) {
      [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }
}

function Get-EnvValue {
  param([string[]]$Names)

  foreach ($name in $Names) {
    $value = [Environment]::GetEnvironmentVariable($name, "Process")
    if ($value) {
      return $value
    }
  }

  return ""
}

function Normalize-HostUrl {
  param([string]$Value)

  if (-not $Value) {
    return ""
  }

  $normalized = $Value.Trim().TrimEnd("/")
  if ($normalized -notmatch "^https?://") {
    $normalized = "https://$normalized"
  }

  return $normalized
}

function Expand-GzipFile {
  param(
    [string]$Source,
    [string]$Destination
  )

  $inputStream = [System.IO.File]::OpenRead($Source)
  try {
    $gzipStream = [System.IO.Compression.GZipStream]::new($inputStream, [System.IO.Compression.CompressionMode]::Decompress)
    try {
      $outputStream = [System.IO.File]::Create($Destination)
      try {
        $gzipStream.CopyTo($outputStream)
      } finally {
        $outputStream.Dispose()
      }
    } finally {
      $gzipStream.Dispose()
    }
  } finally {
    $inputStream.Dispose()
  }
}

function Assert-SqliteFile {
  param([string]$Path)

  $expected = [System.Text.Encoding]::ASCII.GetBytes("SQLite format 3")
  $bytes = [System.IO.File]::ReadAllBytes($Path)

  if ($bytes.Length -lt $expected.Length) {
    throw "Downloaded backup is too small to be a SQLite database."
  }

  for ($i = 0; $i -lt $expected.Length; $i++) {
    if ($bytes[$i] -ne $expected[$i]) {
      throw "Downloaded backup did not decompress to a SQLite database."
    }
  }
}

$repoRoot = Get-RepoRoot
Import-DotEnv (Join-Path $repoRoot ".env")

if (-not $HostUrl) {
  $HostUrl = Get-EnvValue @("WORLD_CUP_HOST_URL", "BACKUP_HOST_URL", "RAILWAY_PUBLIC_DOMAIN")
}
$HostUrl = Normalize-HostUrl $HostUrl

if (-not $Token) {
  $Token = Get-EnvValue @("BACKUP_DOWNLOAD_TOKEN")
}

if (-not $DbPath) {
  $DbPath = Get-EnvValue @("SQLITE_DB_PATH")
}
if (-not $DbPath) {
  $DbPath = Join-Path $repoRoot "data/world-cup.db"
}
if (-not [System.IO.Path]::IsPathRooted($DbPath)) {
  $DbPath = Join-Path $repoRoot $DbPath
}
$DbPath = [System.IO.Path]::GetFullPath($DbPath)

if (-not $HostUrl) {
  throw "Missing host URL. Set WORLD_CUP_HOST_URL in .env or pass -HostUrl https://your-railway-domain."
}
if (-not $Token) {
  throw "Missing backup token. Set BACKUP_DOWNLOAD_TOKEN in .env or pass -Token."
}

$headers = @{ Authorization = "Bearer $Token" }
$backupListUrl = "$HostUrl/api/admin/backups"
$backupList = Invoke-RestMethod -Uri $backupListUrl -Headers $headers -Method Get

if (-not $Filename) {
  $latest = @($backupList.backups) | Sort-Object -Property name -Descending | Select-Object -First 1
  if (-not $latest) {
    throw "No server backups were returned by $backupListUrl."
  }
  $Filename = $latest.name
}

if ($Filename -notmatch "^world-cup-\d{4}-\d{2}-\d{2}T[\w-]+\.db\.gz$") {
  throw "Refusing unexpected backup filename: $Filename"
}

$backupDir = Join-Path $repoRoot "data/backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$downloadPath = Join-Path $backupDir $Filename
$tempDbPath = Join-Path $backupDir ($Filename -replace "\.gz$", ".download.tmp")
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH-mm-ss-fffZ")
$localBackupPath = Join-Path $backupDir "local-world-cup-before-host-$timestamp.db"

Write-Host "Downloading $Filename from $HostUrl"
Invoke-WebRequest -Uri "$HostUrl/api/admin/backups/$([System.Uri]::EscapeDataString($Filename))" -Headers $headers -OutFile $downloadPath

Write-Host "Decompressing backup"
Expand-GzipFile -Source $downloadPath -Destination $tempDbPath
Assert-SqliteFile -Path $tempDbPath

$dbDir = Split-Path -Parent $DbPath
New-Item -ItemType Directory -Force -Path $dbDir | Out-Null

if (Test-Path -LiteralPath $DbPath) {
  Write-Host "Saving current local DB to $localBackupPath"
  Copy-Item -LiteralPath $DbPath -Destination $localBackupPath -Force
  foreach ($suffix in @("-wal", "-shm")) {
    $sidecar = "$DbPath$suffix"
    if (Test-Path -LiteralPath $sidecar) {
      Copy-Item -LiteralPath $sidecar -Destination "$localBackupPath$suffix" -Force
    }
  }
}

try {
  Move-Item -LiteralPath $tempDbPath -Destination $DbPath -Force
  foreach ($suffix in @("-wal", "-shm")) {
    $sidecar = "$DbPath$suffix"
    if (Test-Path -LiteralPath $sidecar) {
      Remove-Item -LiteralPath $sidecar -Force
    }
  }
} catch {
  throw "Could not replace $DbPath. Stop the local dev server or any SQLite browser using it, then run this again. Original error: $($_.Exception.Message)"
}

if (-not $KeepDownloaded) {
  Remove-Item -LiteralPath $downloadPath -Force
}

Write-Host "Replaced local SQLite DB: $DbPath"
if (Test-Path -LiteralPath $localBackupPath) {
  Write-Host "Previous local DB backup: $localBackupPath"
}
