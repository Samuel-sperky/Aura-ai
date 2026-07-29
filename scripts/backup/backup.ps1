# =============================================================================
# backup.ps1 — mysqldump of the Aura Roadmap database into .\backups\
# =============================================================================
# Usage:
#   powershell -ExecutionPolicy Bypass -File C:\Aura\aura-roadmap\scripts\backup\backup.ps1
#
# What it does:
#   1. waits for the `aura-roadmap-db` container to be healthy,
#   2. runs `mysqldump --single-transaction` inside it (consistent InnoDB snapshot
#      without locking writes),
#   3. writes backups\aura-roadmap-YYYY-MM-DD_HHmmss.sql,
#   4. ABORTS (and deletes the file) if the dump is < 1024 B — mysqldump can exit
#      0 having written only a header,
#   5. prunes all but the newest 3 dumps (contract §5 / #90),
#   6. records the outcome in backups\backup-status.json.
#
# Scope note: no 7z encryption and no OneDrive copy (out of scope, contract §5).
# The dump is plain SQL in a gitignored folder.
# =============================================================================

[CmdletBinding()]
param()

. "$PSScriptRoot\BackupCommon.ps1"

$stamp   = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$runAt   = (Get-Date).ToString('o')
$dumpName = "$($script:DumpPrefix)$stamp.sql"
$dumpPath = Join-Path $script:BackupRoot $dumpName

try {
    if (-not (Test-Path $script:BackupRoot)) {
        New-Item -ItemType Directory -Force -Path $script:BackupRoot | Out-Null
    }

    Write-Log "Záloha sa spúšťa → $dumpName"

    if (-not (Wait-DbHealthy -TimeoutMinutes 5)) {
        throw "Kontajner $($script:DbContainer) nie je healthy — záloha sa nespustila."
    }

    $creds = Get-DbCreds

    # MYSQL_PWD goes through the exec ENVIRONMENT, not the command line, so the
    # password never lands in a process list. --single-transaction gives a
    # consistent InnoDB snapshot without blocking writers.
    #
    # The dump is written INSIDE the container and then `docker cp`-ed out, rather
    # than piped through PowerShell. Piping would re-encode the stream (PS 5.1
    # adds a UTF-8 BOM and rewrites line endings), which can corrupt the SQL;
    # docker cp copies raw bytes.
    $inContainer = '/tmp/aura-roadmap-dump.sql'
    $dumpCmd = "mariadb-dump --single-transaction --quick --default-character-set=utf8mb4 " +
               "--routines --events --add-drop-table -uroot $($creds.Database) > $inContainer"

    docker exec -e "MYSQL_PWD=$($creds.RootPassword)" $script:DbContainer sh -c $dumpCmd
    if ($LASTEXITCODE -ne 0) { throw "mariadb-dump skončil s kódom $LASTEXITCODE" }

    docker cp "$($script:DbContainer):$inContainer" $dumpPath | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'docker cp dumpu z kontajnera zlyhal' }
    docker exec $script:DbContainer sh -c "rm -f $inContainer" | Out-Null

    if (-not (Test-Path $dumpPath)) { throw "Dump sa nevytvoril: $dumpPath" }
    $size = (Get-Item $dumpPath).Length
    if ($size -lt $script:MinDumpBytes) {
        Remove-Item $dumpPath -Force -ErrorAction SilentlyContinue
        throw "Dump je podozrivo malý ($size B < $($script:MinDumpBytes) B) — zahodený, záloha zlyhala."
    }

    Write-Log ("Dump hotový: {0} ({1:N0} B)" -f $dumpName, $size)

    # --- Prune: keep only the newest $KeepDumps dumps -------------------------
    $all = Get-ChildItem -Path $script:BackupRoot -Filter "$($script:DumpPrefix)*.sql" |
           Sort-Object LastWriteTime -Descending
    if ($all.Count -gt $script:KeepDumps) {
        foreach ($old in $all[$script:KeepDumps..($all.Count - 1)]) {
            Remove-Item $old.FullName -Force
            Write-Log "Zmazaná stará záloha: $($old.Name)"
        }
    }
    $kept = (Get-ChildItem -Path $script:BackupRoot -Filter "$($script:DumpPrefix)*.sql").Count

    Update-BackupStatus -Updates @{
        lastRunAt     = $runAt
        lastStatus    = 'ok'
        lastError     = $null
        lastSuccessAt = $runAt
        lastDump      = $dumpName
        lastSizeBytes = $size
        keptDumps     = $kept
    } -HistoryEntry @{
        at        = $runAt
        status    = 'ok'
        dump      = $dumpName
        sizeBytes = $size
    }

    Write-Log "Záloha úspešná. Uchovávaných záloh: $kept (limit $($script:KeepDumps))."
    exit 0
}
catch {
    $msg = $_.Exception.Message
    Write-Log "ZÁLOHA ZLYHALA: $msg" 'ERROR'
    try {
        Update-BackupStatus -Updates @{
            lastRunAt  = $runAt
            lastStatus = 'error'
            lastError  = $msg
        } -HistoryEntry @{
            at     = $runAt
            status = 'error'
            error  = $msg
        }
    } catch { }
    exit 1
}
