# Commit + push (+ optional deploy) without Cursor Co-authored-by.
# Cursor injects the trailer via cmd\git.exe wrapper on `git commit`.
# This script creates commits with mingw64 git commit-tree instead.
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
  $parents = @(Get-GitOut @("rev-list", "--parents", "-n", "1", "HEAD") -split " " | Select-Object -Skip 1)
} else {
  $tree = Get-GitOut @("write-tree")
  $parents = @(Get-GitOut @("rev-parse", "HEAD"))
}

$msgFile = Join-Path $env:TEMP ("git-ship-{0}.txt" -f [guid]::NewGuid().ToString("n"))
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($msgFile, ($Message.TrimEnd() + "`n"), $utf8)

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

$commitArgs = @("commit-tree", $tree)
foreach ($p in $parents) {
  if ($p) { $commitArgs += @("-p", $p) }
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

if (-not $DokployUrl -or -not $DokployToken) {
  Write-Host "deploy: missing DOKPLOY_URL/DOKPLOY_TOKEN; deploy from agent/UI"
  Write-Host "deploy appId: $DokployAppId"
  exit 0
}

$endpoint = $DokployUrl.TrimEnd("/") + "/api/application.deploy"
$payload = @{ applicationId = $DokployAppId; title = $Message } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri $endpoint -Headers @{
  Authorization = "Bearer $DokployToken"
  "Content-Type" = "application/json"
} -Body $payload | Out-Null
Write-Host "deploy: ok ($DokployAppId)"
