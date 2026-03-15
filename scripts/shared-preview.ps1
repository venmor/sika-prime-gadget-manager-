param(
  [ValidateSet("interactive", "prepare", "bootstrap-db", "show", "help")]
  [string]$Action = "interactive"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$PreviewEnvFile = Join-Path $RepoRoot "deploy/railway-preview.local.env"
$PreviewEnvExample = Join-Path $RepoRoot "deploy/railway-preview.local.env.example"
$PreviewVarsFile = Join-Path $RepoRoot "deploy/railway-preview.variables.txt"
$PreviewDbEnvFile = Join-Path $RepoRoot "deploy/railway-preview-db.local.env"
$DefaultPreviewPassword = "TeamTest123!"

function Stop-WithMessage {
  param([string]$Message)

  Write-Warning $Message
  exit 1
}

function Ensure-RepoContext {
  if (-not (Test-Path (Join-Path $RepoRoot "deploy/railway.md"))) {
    Stop-WithMessage "deploy/railway.md was not found. Run this helper from the repository."
  }

  if (-not (Test-Path (Join-Path $RepoRoot "backend/node_modules"))) {
    Stop-WithMessage "backend/node_modules is missing. Run npm install in backend first."
  }
}

function Get-EnvValue {
  param(
    [string]$FilePath,
    [string]$Key
  )

  if (-not (Test-Path $FilePath)) {
    return $null
  }

  $Line = Get-Content $FilePath | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
  if (-not $Line) {
    return $null
  }

  return ($Line -split "=", 2)[1]
}

function Set-EnvValue {
  param(
    [string]$FilePath,
    [string]$Key,
    [string]$Value
  )

  $Lines = @()
  $Updated = $false

  if (Test-Path $FilePath) {
    foreach ($Line in Get-Content $FilePath) {
      if ($Line -match "^$Key=") {
        $Lines += "$Key=$Value"
        $Updated = $true
      } else {
        $Lines += $Line
      }
    }
  }

  if (-not $Updated) {
    $Lines += "$Key=$Value"
  }

  Set-Content -Path $FilePath -Value $Lines
}

function Ensure-PreviewEnv {
  if (Test-Path $PreviewEnvFile) {
    return
  }

  Copy-Item $PreviewEnvExample $PreviewEnvFile
}

function Prompt-WithDefault {
  param(
    [string]$Label,
    [string]$DefaultValue
  )

  $Reply = Read-Host "$Label [$DefaultValue]"
  if ([string]::IsNullOrWhiteSpace($Reply)) {
    return $DefaultValue
  }

  return $Reply
}

function Prompt-Secret-WithDefault {
  param(
    [string]$Label,
    [string]$DefaultValue
  )

  $SecureReply = Read-Host "$Label [hidden, press Enter to keep default]" -AsSecureString
  $Bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureReply)

  try {
    $Reply = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr)
  }

  if ([string]::IsNullOrWhiteSpace($Reply)) {
    return $DefaultValue
  }

  return $Reply
}

function New-SessionSecret {
  Push-Location $RepoRoot
  try {
    return (node -e "const crypto=require('crypto'); console.log(crypto.randomBytes(32).toString('hex'))")
  } finally {
    Pop-Location
  }
}

function New-PasswordHash {
  param([string]$Password)

  Push-Location $RepoRoot
  try {
    $env:PREVIEW_ADMIN_PASSWORD = $Password
    return (node -e "require('./backend/node_modules/bcryptjs').hash(process.env.PREVIEW_ADMIN_PASSWORD, 10).then(console.log)")
  } finally {
    Remove-Item Env:PREVIEW_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    Pop-Location
  }
}

function Write-PreviewVariablesFile {
  param(
    [string]$MysqlService,
    [string]$DbConnectionLimit,
    [string]$SessionSecret,
    [string]$AdminUsername,
    [string]$AdminEmail,
    [string]$AdminPasswordHash
  )

  $Lines = @(
    "# Paste these values into the Railway web service Variables page."
    "DB_HOST=`${{$MysqlService.MYSQLHOST}}"
    "DB_PORT=`${{$MysqlService.MYSQLPORT}}"
    "DB_USER=`${{$MysqlService.MYSQLUSER}}"
    "DB_PASS=`${{$MysqlService.MYSQLPASSWORD}}"
    "DB_NAME=`${{$MysqlService.MYSQLDATABASE}}"
    "DB_CONNECTION_LIMIT=$DbConnectionLimit"
    "SESSION_SECRET=$SessionSecret"
    "AUTO_RUN_MIGRATIONS=true"
    "AUTO_SEED_DEMO_DATA=true"
    "ADMIN_USERNAME=$AdminUsername"
    "ADMIN_EMAIL=$AdminEmail"
    "ADMIN_PASSWORD_HASH=$AdminPasswordHash"
    "UPLOADS_DIR=`${{RAILWAY_VOLUME_MOUNT_PATH}}/uploads"
    "SESSIONS_DIR=`${{RAILWAY_VOLUME_MOUNT_PATH}}/sessions"
  )

  Set-Content -Path $PreviewVarsFile -Value $Lines
}

function Prepare-Preview {
  Ensure-RepoContext
  Ensure-PreviewEnv

  $CurrentService = Get-EnvValue -FilePath $PreviewEnvFile -Key "RAILWAY_MYSQL_SERVICE"
  $CurrentLimit = Get-EnvValue -FilePath $PreviewEnvFile -Key "DB_CONNECTION_LIMIT"
  $CurrentUsername = Get-EnvValue -FilePath $PreviewEnvFile -Key "ADMIN_USERNAME"
  $CurrentEmail = Get-EnvValue -FilePath $PreviewEnvFile -Key "ADMIN_EMAIL"

  if (-not $CurrentService) { $CurrentService = "MySQL" }
  if (-not $CurrentLimit) { $CurrentLimit = "10" }
  if (-not $CurrentUsername) { $CurrentUsername = "admin" }
  if (-not $CurrentEmail) { $CurrentEmail = "admin@example.com" }

  Write-Host ""
  Write-Host "Preparing local Railway preview settings..."

  $MysqlService = Prompt-WithDefault -Label "Railway MySQL service name" -DefaultValue $CurrentService
  $DbConnectionLimit = Prompt-WithDefault -Label "Database connection limit" -DefaultValue $CurrentLimit
  $AdminUsername = Prompt-WithDefault -Label "Preview admin username" -DefaultValue $CurrentUsername
  $AdminEmail = Prompt-WithDefault -Label "Preview admin email" -DefaultValue $CurrentEmail
  $AdminPassword = Prompt-Secret-WithDefault -Label "Preview admin password" -DefaultValue $DefaultPreviewPassword

  $SessionSecret = New-SessionSecret
  $AdminPasswordHash = New-PasswordHash -Password $AdminPassword

  Set-EnvValue -FilePath $PreviewEnvFile -Key "RAILWAY_MYSQL_SERVICE" -Value $MysqlService
  Set-EnvValue -FilePath $PreviewEnvFile -Key "DB_CONNECTION_LIMIT" -Value $DbConnectionLimit
  Set-EnvValue -FilePath $PreviewEnvFile -Key "SESSION_SECRET" -Value $SessionSecret
  Set-EnvValue -FilePath $PreviewEnvFile -Key "ADMIN_USERNAME" -Value $AdminUsername
  Set-EnvValue -FilePath $PreviewEnvFile -Key "ADMIN_EMAIL" -Value $AdminEmail
  Set-EnvValue -FilePath $PreviewEnvFile -Key "ADMIN_PASSWORD_HASH" -Value $AdminPasswordHash

  Write-PreviewVariablesFile `
    -MysqlService $MysqlService `
    -DbConnectionLimit $DbConnectionLimit `
    -SessionSecret $SessionSecret `
    -AdminUsername $AdminUsername `
    -AdminEmail $AdminEmail `
    -AdminPasswordHash $AdminPasswordHash

  Write-Host ""
  Write-Host "Local preview files updated:"
  Write-Host "  $PreviewEnvFile"
  Write-Host "  $PreviewVarsFile"
  Write-Host ""
  Write-Host "Preview login for the shared site:"
  Write-Host "  Username: $AdminUsername"
  Write-Host "  Password: $AdminPassword"
  Write-Host ""
  Write-Host "Next manual step:"
  Write-Host "  Open Railway, create the project and MySQL service, then paste the values from:"
  Write-Host "  $PreviewVarsFile"
  Write-Host "  The hosted app will auto-run migrations and seed demo data on first boot."
}

function Invoke-BackendScript {
  param(
    [string]$ScriptName,
    [hashtable]$Environment
  )

  Push-Location (Join-Path $RepoRoot "backend")
  try {
    foreach ($Key in $Environment.Keys) {
      Set-Item -Path "Env:$Key" -Value $Environment[$Key]
    }

    node $ScriptName
  } finally {
    foreach ($Key in $Environment.Keys) {
      Remove-Item "Env:$Key" -ErrorAction SilentlyContinue
    }

    Pop-Location
  }
}

function Bootstrap-PreviewDatabase {
  Ensure-RepoContext

  if (-not (Test-Path $PreviewEnvFile)) {
    Stop-WithMessage "Preview settings not found. Run: powershell -ExecutionPolicy Bypass -File .\scripts\shared-preview.ps1 prepare"
  }

  $CurrentHost = Get-EnvValue -FilePath $PreviewDbEnvFile -Key "DB_HOST"
  $CurrentPort = Get-EnvValue -FilePath $PreviewDbEnvFile -Key "DB_PORT"
  $CurrentUser = Get-EnvValue -FilePath $PreviewDbEnvFile -Key "DB_USER"
  $CurrentName = Get-EnvValue -FilePath $PreviewDbEnvFile -Key "DB_NAME"
  $CurrentLimit = Get-EnvValue -FilePath $PreviewEnvFile -Key "DB_CONNECTION_LIMIT"

  if (-not $CurrentPort) { $CurrentPort = "3306" }
  if (-not $CurrentUser) { $CurrentUser = "root" }
  if (-not $CurrentName) { $CurrentName = "railway" }
  if (-not $CurrentLimit) { $CurrentLimit = "10" }

  Write-Host ""
  Write-Host "Bootstrap the shared Railway database"
  Write-Host "Use the Railway MySQL TCP proxy or public connection values here."

  $DbHost = Prompt-WithDefault -Label "DB host" -DefaultValue $CurrentHost
  $DbPort = Prompt-WithDefault -Label "DB port" -DefaultValue $CurrentPort
  $DbUser = Prompt-WithDefault -Label "DB user" -DefaultValue $CurrentUser
  $DbName = Prompt-WithDefault -Label "DB name" -DefaultValue $CurrentName
  $DbPass = Prompt-Secret-WithDefault -Label "DB password" -DefaultValue ""

  if ([string]::IsNullOrWhiteSpace($DbHost)) { Stop-WithMessage "DB host is required." }
  if ([string]::IsNullOrWhiteSpace($DbPort)) { Stop-WithMessage "DB port is required." }
  if ([string]::IsNullOrWhiteSpace($DbUser)) { Stop-WithMessage "DB user is required." }
  if ([string]::IsNullOrWhiteSpace($DbName)) { Stop-WithMessage "DB name is required." }

  Set-EnvValue -FilePath $PreviewDbEnvFile -Key "DB_HOST" -Value $DbHost
  Set-EnvValue -FilePath $PreviewDbEnvFile -Key "DB_PORT" -Value $DbPort
  Set-EnvValue -FilePath $PreviewDbEnvFile -Key "DB_USER" -Value $DbUser
  Set-EnvValue -FilePath $PreviewDbEnvFile -Key "DB_PASS" -Value $DbPass
  Set-EnvValue -FilePath $PreviewDbEnvFile -Key "DB_NAME" -Value $DbName

  $Environment = @{
    DB_HOST = $DbHost
    DB_PORT = $DbPort
    DB_USER = $DbUser
    DB_PASS = $DbPass
    DB_NAME = $DbName
    DB_CONNECTION_LIMIT = $CurrentLimit
    ADMIN_USERNAME = (Get-EnvValue -FilePath $PreviewEnvFile -Key "ADMIN_USERNAME")
    ADMIN_EMAIL = (Get-EnvValue -FilePath $PreviewEnvFile -Key "ADMIN_EMAIL")
    ADMIN_PASSWORD_HASH = (Get-EnvValue -FilePath $PreviewEnvFile -Key "ADMIN_PASSWORD_HASH")
  }

  Write-Host ""
  Write-Host "Checking the remote database connection..."
  Invoke-BackendScript -ScriptName "scripts/check-db.js" -Environment $Environment

  Write-Host "Running migrations on the shared preview database..."
  Invoke-BackendScript -ScriptName "scripts/run-migrations.js" -Environment $Environment

  Write-Host "Seeding demo data into the shared preview database..."
  Invoke-BackendScript -ScriptName "scripts/seed-demo-data.js" -Environment $Environment

  Write-Host ""
  Write-Host "Shared preview database bootstrap complete."
  Write-Host "If Railway already deployed the web service, redeploy it once so it starts against the initialized database."
}

function Show-PreviewFiles {
  if (-not (Test-Path $PreviewEnvFile)) {
    Stop-WithMessage "Preview settings not found yet. Run prepare first."
  }

  Write-Host ""
  Write-Host "Local preview settings file:"
  Write-Host "  $PreviewEnvFile"
  Write-Host ""
  Write-Host "Paste-ready Railway variables:"
  Write-Host "  $PreviewVarsFile"

  if (Test-Path $PreviewVarsFile) {
    Write-Host ""
    Get-Content $PreviewVarsFile
  }
}

function Show-Usage {
  Write-Host "Usage:"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\shared-preview.ps1"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\shared-preview.ps1 prepare"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\shared-preview.ps1 bootstrap-db"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\shared-preview.ps1 show"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\shared-preview.ps1 help"
}

function Start-InteractiveMenu {
  while ($true) {
    Write-Host ""
    Write-Host "Shared Preview Helper"
    Write-Host "  1. Prepare Railway preview variables"
    Write-Host "  2. Bootstrap Railway database"
    Write-Host "  3. Show current preview files"
    Write-Host "  4. Exit"
    Write-Host ""

    $Choice = Read-Host "Enter 1-4"

    switch ($Choice) {
      "1" { Prepare-Preview }
      "2" { Bootstrap-PreviewDatabase }
      "3" { Show-PreviewFiles }
      "4" { break }
      default { Write-Warning "Please choose a number from 1 to 4." }
    }
  }
}

Push-Location $RepoRoot

try {
  switch ($Action) {
    "interactive" { Start-InteractiveMenu }
    "prepare" { Prepare-Preview }
    "bootstrap-db" { Bootstrap-PreviewDatabase }
    "show" { Show-PreviewFiles }
    "help" { Show-Usage }
  }
} catch {
  Write-Warning "The shared preview helper stopped before it finished."
  Write-Warning "Any generated local files were kept, so you can continue from where you left off."
  Write-Warning $_.Exception.Message
  exit 1
} finally {
  Pop-Location
}
