param(
    [string]$Message = "Update deploy build"
)

$ErrorActionPreference = "Stop"

$SrcDir    = "C:\work\astro-microcms-poc"
$DeployDir = "C:\work\astro-microcms-poc-deploy"
$Branch    = "deploy"

function Step {
    param([string]$Text)
    Write-Host ""
    Write-Host "=== $Text ===" -ForegroundColor Cyan
}

function Require-Cmd {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Command not found: $Name"
    }
}

Step "Check prerequisites"

Require-Cmd "git"
Require-Cmd "npm"

if (-not (Test-Path $SrcDir)) {
    throw "Source directory not found: $SrcDir"
}

if (-not (Test-Path $DeployDir)) {
    throw "Deploy directory not found: $DeployDir"
}

if (-not (Test-Path (Join-Path $SrcDir "package.json"))) {
    throw "package.json not found in: $SrcDir"
}

if (-not (Test-Path (Join-Path $DeployDir ".git"))) {
    throw ".git not found in deploy directory: $DeployDir"
}

Step "Build"

Push-Location $SrcDir
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed"
    }
}
finally {
    Pop-Location
}

$DistDir = Join-Path $SrcDir "dist"
if (-not (Test-Path $DistDir)) {
    throw "dist directory not found: $DistDir"
}

Step "Clean deploy directory"

Get-ChildItem $DeployDir -Force |
    Where-Object { $_.Name -ne ".git" } |
    Remove-Item -Recurse -Force

Step "Copy dist files"

Copy-Item "$DistDir\*" $DeployDir -Recurse -Force

Step "Git check"

Push-Location $DeployDir
try {
    $CurrentBranch = (& git rev-parse --abbrev-ref HEAD).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to get current branch"
    }

    if ($CurrentBranch -ne $Branch) {
        throw "Current branch is '$CurrentBranch', expected '$Branch'"
    }

    & git add -A
    if ($LASTEXITCODE -ne 0) {
        throw "git add failed"
    }

    $Status = & git status --porcelain
    if ($LASTEXITCODE -ne 0) {
        throw "git status failed"
    }

    if (-not $Status) {
        Write-Host ""
        Write-Host "No changes to commit." -ForegroundColor Yellow
        exit 0
    }

    Step "Commit"
    & git commit -m $Message
    if ($LASTEXITCODE -ne 0) {
        throw "git commit failed"
    }

    Step "Push"
    & git push origin $Branch
    if ($LASTEXITCODE -ne 0) {
        throw "git push failed"
    }
}
finally {
    Pop-Location
}

Step "Done"
Write-Host "Deploy branch updated successfully." -ForegroundColor Green
Write-Host "EC2 cron should sync changes within a few minutes." -ForegroundColor Green