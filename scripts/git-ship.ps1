# Commit + push without Cursor Co-authored-by.
# Cursor injects the trailer via cmd\git.exe wrapper on `git commit`.
# This script creates commits with mingw64 git commit-tree instead.
#
# Deploy: Dokploy autoDeploy на push в av4 — флаг -Deploy только для
# совместимости вызовов, второй API-deploy не запускает (иначе дубль).
#
# Usage:
#   powershell -File scripts/git-ship.ps1 -Message "Short description" -Deploy
#   powershell -File scripts/git-ship.ps1 -Message "..." -Paths "a.tsx,b.tsx" -Deploy
#   powershell -File scripts/git-ship.ps1 -Amend -Message "Rewrite message only"

param(
  [Parameter(Mandatory = $true)]
  [string]$Message,

  [string[]]$Paths = @(),

  [switch]$Deploy,

  [switch]$Amend,

  [switch]$Force,

  [string]$Remote = "origin",

  [string]$DokployUrl = $env:DOKPLOY_URL,
  [string]$DokployToken = $env:DOKPLOY_TOKEN,
  [string]$DokployAppId = $(if ($env:DOKPLOY_APP_ID) { $env:DOKPLOY_APP_ID } else { "ZtzJoz1z-rCdGZjJ9Iqg6" })
)

$ErrorActionPreference = "Stop"

function Find-RealGit {
  $candidates = @(
    "C:\Program Files\Git\mingw64\bin\git.exe",
    "C:\Program Files\Git\mingw64\libexec\git-core\git.exe",
    "C:\Program Files\Git\bin\git.exe"
  )
  foreach ($path in $candidates) {
    if (Test-Path $path) { return $path }
  }
  throw "mingw64 git.exe not found; Cursor would inject Co-authored-by again."
}

# Always pass args as a single string[] so PowerShell does not eat flags like -p / -n.
function Invoke-Git([string[]]$GitArgs) {
  & $script:Git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed with exit $LASTEXITCODE"
  }
}

function Get-GitOut([string[]]$GitArgs) {
  $out = & $script:Git @GitArgs 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed with exit $LASTEXITCODE : $out"
  }
  return ($out | Out-String).Trim()
}

$script:Git = Find-RealGit
Write-Host "git: $script:Git"

if ($Paths.Count -eq 1 -and $Paths[0] -match ",") {
  $Paths = @($Paths[0] -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

if ($Paths.Count -gt 0) {
  Invoke-Git (@("add", "--") + $Paths)
} elseif (-not $Amend) {
  $status = Get-GitOut @("status", "--porcelain")
  if (-not $status) {
    throw "Nothing to commit. Pass -Paths or -Amend."
  }
  Invoke-Git @("add", "-A")
}

if ($Amend) {
  $tree = Get-GitOut @("rev-parse", "HEAD^{tree}")
  $parentLine = Get-GitOut @("rev-list", "--parents", "-n", "1", "HEAD")
  $parents = @($parentLine -split "\s+" | Select-Object -Skip 1 | Where-Object { $_ -match '^[0-9a-f]{40}$' })
  if ($parents.Count -eq 0) {
    throw "Cannot amend: HEAD has no parents ($parentLine)."
  }
} else {
  $tree = Get-GitOut @("write-tree")
  $parents = @(Get-GitOut @("rev-parse", "HEAD"))
}

$msgFile = Join-Path $env:TEMP ("git-ship-{0}.txt" -f [guid]::NewGuid().ToString("n"))
[System.IO.File]::WriteAllLines($msgFile, @(($Message.TrimEnd() -split "`r?`n")))

$authorName = Get-GitOut @("config", "user.name")
$authorEmail = Get-GitOut @("config", "user.email")
if (-not $authorName -or -not $authorEmail) {
  throw "Set git user.name and user.email first."
}

$env:GIT_AUTHOR_NAME = $authorName
$env:GIT_AUTHOR_EMAIL = $authorEmail
$env:GIT_COMMITTER_NAME = $authorName
$env:GIT_COMMITTER_EMAIL = $authorEmail

if ($Amend) {
  $epoch = Get-GitOut @("log", "-1", "--format=%at")
  $env:GIT_AUTHOR_DATE = $epoch
  Remove-Item Env:GIT_COMMITTER_DATE -ErrorAction SilentlyContinue
} else {
  Remove-Item Env:GIT_AUTHOR_DATE -ErrorAction SilentlyContinue
  Remove-Item Env:GIT_COMMITTER_DATE -ErrorAction SilentlyContinue
}

if ($Amend -and $parents.Count -eq 0) {
  throw "Amend would create an orphan commit (no parents). Aborting."
}

$commitArgs = @("commit-tree", $tree)
foreach ($p in $parents) {
  if ($p -match '^[0-9a-f]{40}$') { $commitArgs += @("-p", $p) }
}
if ($Amend -and ($commitArgs -notcontains "-p")) {
  throw "Amend lost parent oid. Aborting."
}
$commitArgs += @("-F", $msgFile)

$commit = Get-GitOut $commitArgs
if ($commit -notmatch '^[0-9a-f]{40}$') {
  throw "commit-tree returned unexpected value: $commit"
}

$body = Get-GitOut @("cat-file", "-p", $commit)
if ($body -match "(?m)^Co-authored-by:") {
  throw "Co-authored-by still present; aborting."
}
if ($Amend -and $body -notmatch "(?m)^parent ") {
  throw "Amend produced orphan commit; aborting."
}

Invoke-Git @("update-ref", "HEAD", $commit)
Remove-Item $msgFile -ErrorAction SilentlyContinue

Write-Host "commit: $commit"
Write-Host (Get-GitOut @("log", "-1", "--format=%B"))

$branch = Get-GitOut @("rev-parse", "--abbrev-ref", "HEAD")
$refspec = "HEAD:refs/heads/$branch"
if ($Amend -or $Force) {
  Invoke-Git @("push", "--force-with-lease", $Remote, $refspec)
} else {
  Invoke-Git @("push", "-u", $Remote, $refspec)
}
Write-Host "pushed: $branch -> $Remote"

if (-not $Deploy) {
  Write-Host "deploy: skipped (no -Deploy)"
  exit 0
}

# В Dokploy у приложения autoDeploy=true на push в av4. Повторный
# application.deploy после push даёт второй одинаковый билд в истории.
Write-Host "deploy: уже идёт через Dokploy autoDeploy на push; API-вызов пропущен ($DokployAppId)"
exit 0
