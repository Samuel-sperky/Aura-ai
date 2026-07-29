# =============================================================================
# restore-test.ps1 — verifies the newest dump can actually be restored.
# =============================================================================
# A backup you have never restored is not a backup. This script restores the
# newest dump into a THROWAWAY database inside the same container
# (`<db>_restoretest`), counts the tables, then DROPS it.
#
# It NEVER touches the live database — the restore target name is derived and the
# script refuses to run if it would equal DB_DATABASE.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File C:\Aura\aura-roadmap\scripts\backup\restore-test.ps1
# =============================================================================

[CmdletBinding()]
param([string]$DumpFile)

. "$PSScriptRoot\BackupCommon.ps1"

$runAt = (Get-Date).ToString('o')

try {
    if (-not (Wait-DbHealthy -TimeoutMinutes 5)) {
        throw "Kontajner $($script:DbContainer) nie je healthy — test obnovy sa nespustil."
    }

    $creds = Get-DbCreds
    $testDb = "$($creds.Database)_restoretest"
    if ($testDb -eq $creds.Database) {
        throw 'Bezpečnostná kontrola: testovacia DB sa nesmie rovnať produkčnej.'
    }

    if ($DumpFile) {
        $dump = Get-Item $DumpFile
    } else {
        $dump = Get-ChildItem -Path $script:BackupRoot -Filter "$($script:DumpPrefix)*.sql" |
                Sort-Object LastWriteTime -Descending | Select-Object -First 1
    }
    if (-not $dump) { throw "V $($script:BackupRoot) nie je žiadny dump na otestovanie." }

    Write-Log "Test obnovy: $($dump.Name) → databáza $testDb"

    $inContainer = "/tmp/restore-test.sql"
    docker cp $dump.FullName "$($script:DbContainer):$inContainer" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'docker cp dumpu zlyhal' }

    $sh = "mariadb -uroot -e 'DROP DATABASE IF EXISTS ``$testDb``; CREATE DATABASE ``$testDb`` " +
          "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;' && " +
          "mariadb -uroot --default-character-set=utf8mb4 $testDb < $inContainer"
    docker exec -e "MYSQL_PWD=$($creds.RootPassword)" $script:DbContainer sh -c $sh
    if ($LASTEXITCODE -ne 0) { throw "Obnova dumpu zlyhala (kód $LASTEXITCODE)" }

    $countCmd = "mariadb -uroot -N -B -e ""SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$testDb';"""
    $tables = docker exec -e "MYSQL_PWD=$($creds.RootPassword)" $script:DbContainer sh -c $countCmd
    $tableCount = 0
    [void][int]::TryParse(("$tables").Trim(), [ref]$tableCount)

    # Clean up the throwaway DB and the copied dump regardless of the count.
    $cleanup = "mariadb -uroot -e 'DROP DATABASE IF EXISTS ``$testDb``;'; rm -f $inContainer"
    docker exec -e "MYSQL_PWD=$($creds.RootPassword)" $script:DbContainer sh -c $cleanup | Out-Null

    if ($tableCount -lt 1) { throw "Obnova prebehla, ale v $testDb nie je ani jedna tabuľka." }

    Write-Log "Test obnovy OK — obnovených tabuliek: $tableCount."
    Update-BackupStatus -Updates @{
        restoreTest = @{ at = $runAt; status = 'ok'; dump = $dump.Name; tables = $tableCount }
    }
    exit 0
}
catch {
    $msg = $_.Exception.Message
    Write-Log "TEST OBNOVY ZLYHAL: $msg" 'ERROR'
    try {
        Update-BackupStatus -Updates @{
            restoreTest = @{ at = $runAt; status = 'error'; error = $msg }
        }
    } catch { }
    exit 1
}
