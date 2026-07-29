# =============================================================================
# BackupCommon.ps1 — shared config + helpers for Aura Roadmap backups.
# Dot-sourced by backup.ps1 and restore-test.ps1:
#     . "$PSScriptRoot\BackupCommon.ps1"
#
# Target shell: Windows PowerShell 5.1 (Task Scheduler default) — so NO `&&`,
# no `?:`, no `??`, no other PS7-only constructs.
#
# Security model:
#   * DB credentials are read at run time from .env (never logged, never echoed).
#     The root password is passed to the container via MYSQL_PWD in the exec
#     environment, so it never appears in a command line / process list.
#   * Dumps are plain .sql in a gitignored folder. No 7z encryption, no OneDrive
#     copy — both are out of scope for this sprint (contract §5).
# =============================================================================

$ErrorActionPreference = 'Stop'

# --- Paths and names (the only place to edit when the environment changes) ----
$script:RepoRoot    = 'C:\Aura\aura-roadmap'
$script:EnvFile     = Join-Path $script:RepoRoot '.env'

$script:DbContainer = 'aura-roadmap-db'

$script:BackupRoot  = Join-Path $script:RepoRoot 'backups'
$script:StatusFile  = Join-Path $script:BackupRoot 'backup-status.json'
$script:LogFile     = Join-Path $script:BackupRoot 'backup.log'

$script:DumpPrefix  = 'aura-roadmap-'

# --- Retention ----------------------------------------------------------------
# Contract §5 / #90: keep the LAST 3 dumps per project (not 14 like the family
# reference — this DB is small and has no real data yet).
$script:KeepDumps   = 3

# A dump smaller than this is treated as a failed dump and aborts the run
# (mysqldump can exit 0 while writing only a header if the DB is unreachable).
$script:MinDumpBytes = 1024

$script:StatusHistoryMax = 20

# =============================================================================
# Logging
# =============================================================================

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $dir = Split-Path -Parent $script:LogFile
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    # Simple rotation: over 2 MB, roll to .1 (one generation is enough).
    if ((Test-Path $script:LogFile) -and ((Get-Item $script:LogFile).Length -gt 2MB)) {
        Move-Item -Force $script:LogFile "$($script:LogFile).1"
    }
    $line = '{0} [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    Add-Content -Path $script:LogFile -Value $line -Encoding UTF8
    Write-Host $line
}

# =============================================================================
# .env reading and credentials
# =============================================================================

# Reads KEY=VALUE lines from .env (skips comments and blank lines).
function Read-EnvFile {
    if (-not (Test-Path $script:EnvFile)) { throw ".env not found: $($script:EnvFile)" }
    $vars = @{}
    foreach ($line in (Get-Content $script:EnvFile)) {
        $t = $line.Trim()
        if ($t -eq '' -or $t.StartsWith('#')) { continue }
        $idx = $t.IndexOf('=')
        if ($idx -lt 1) { continue }
        $k = $t.Substring(0, $idx).Trim()
        $v = $t.Substring($idx + 1).Trim()
        # Drop surrounding quotes if present.
        if ($v.Length -ge 2 -and (($v[0] -eq '"' -and $v[-1] -eq '"') -or ($v[0] -eq "'" -and $v[-1] -eq "'"))) {
            $v = $v.Substring(1, $v.Length - 2)
        }
        $vars[$k] = $v
    }
    return $vars
}

function Get-DbCreds {
    $vars = Read-EnvFile
    foreach ($k in @('DB_ROOT_PASSWORD', 'DB_DATABASE')) {
        if (-not $vars.ContainsKey($k) -or $vars[$k] -eq '') { throw "$k is missing in .env" }
    }
    return @{ RootPassword = $vars['DB_ROOT_PASSWORD']; Database = $vars['DB_DATABASE'] }
}

# =============================================================================
# Docker helpers
# =============================================================================

function Test-DbHealthy {
    # stderr is redirected by cmd, not PowerShell: `2>$null` on a native command
    # under $ErrorActionPreference='Stop' would wrap stderr in a terminating error.
    $status = cmd /c "docker inspect -f {{.State.Health.Status}} $($script:DbContainer) 2>nul"
    if ($LASTEXITCODE -ne 0) { return $false }
    return (("$status").Trim() -eq 'healthy')
}

function Wait-DbHealthy {
    param([int]$TimeoutMinutes = 5)
    $deadline = (Get-Date).AddMinutes($TimeoutMinutes)
    while ((Get-Date) -lt $deadline) {
        if (Test-DbHealthy) { return $true }
        Write-Log "Kontajner $($script:DbContainer) ešte nie je healthy — čakám..." 'INFO'
        Start-Sleep -Seconds 10
    }
    return (Test-DbHealthy)
}

# =============================================================================
# Status JSON (backups/backup-status.json) — read by Settings → Backups
# =============================================================================

function Read-BackupStatus {
    if (Test-Path $script:StatusFile) {
        try { return (Get-Content -Raw $script:StatusFile | ConvertFrom-Json) } catch { }
    }
    return $null
}

# Merges $Updates into the existing status and prepends $HistoryEntry to history.
function Update-BackupStatus {
    param([hashtable]$Updates, [hashtable]$HistoryEntry = $null)

    $prev = Read-BackupStatus
    $status = [ordered]@{
        lastRunAt     = $null
        lastStatus    = $null
        lastError     = $null
        lastSuccessAt = $null
        lastDump      = $null
        lastSizeBytes = $null
        keptDumps     = $null
        restoreTest   = $null
        history       = @()
    }
    if ($prev) {
        foreach ($p in $prev.PSObject.Properties) {
            if ($status.Contains($p.Name)) { $status[$p.Name] = $p.Value }
        }
    }
    foreach ($k in $Updates.Keys) { $status[$k] = $Updates[$k] }

    if ($HistoryEntry) {
        $hist = @($HistoryEntry)
        foreach ($h in @($status['history'])) { if ($h) { $hist += $h } }
        if ($hist.Count -gt $script:StatusHistoryMax) { $hist = $hist[0..($script:StatusHistoryMax - 1)] }
        $status['history'] = $hist
    }

    $json = $status | ConvertTo-Json -Depth 8
    $dir = Split-Path -Parent $script:StatusFile
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    [IO.File]::WriteAllText($script:StatusFile, $json, (New-Object Text.UTF8Encoding($false)))
}
