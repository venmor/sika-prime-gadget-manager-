param(
  [ValidateSet("interactive", "setup", "doctor", "start", "resume", "stop", "reset", "logs", "status", "help")]
  [string]$Action = "interactive",
  [switch]$Yes
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $RepoRoot "team-test.env"
$EnvExample = Join-Path $RepoRoot "team-test.env.example"
$DefaultPassword = "TeamTest123!"
$script:ComposeMode = ""

function Write-Section {
  Write-Host ""
  Write-Host "Sika Prime Gadget Manager - Team Test Helper"
  Write-Host "Repository: $RepoRoot"
  Write-Host ""
}

function Stop-WithMessage {
  param([string]$Message)

  Write-Warning $Message
  exit 1
}

function Get-EnvValue {
  param([string]$Key)

  if (-not (Test-Path $EnvFile)) {
    return $null
  }

  $Line = Get-Content $EnvFile | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
  if (-not $Line) {
    return $null
  }

  return ($Line -split "=", 2)[1]
}

function Set-EnvValue {
  param(
    [string]$Key,
    [string]$Value
  )

  $Lines = @()
  $Updated = $false

  if (Test-Path $EnvFile) {
    foreach ($Line in Get-Content $EnvFile) {
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

  Set-Content -Path $EnvFile -Value $Lines
}

function Ensure-RepoContext {
  if (-not (Test-Path (Join-Path $RepoRoot "compose.yaml"))) {
    Stop-WithMessage "compose.yaml was not found. Run this script from the cloned repository."
  }
}

function Ensure-EnvFile {
  if (Test-Path $EnvFile) {
    return
  }

  Copy-Item $EnvExample $EnvFile
  Write-Host "Created team-test.env from team-test.env.example."
}

function Resolve-ComposeCommand {
  try {
    docker compose version | Out-Null
    $script:ComposeMode = "docker-compose-v2"
    return $true
  } catch {
  }

  if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $script:ComposeMode = "docker-compose-v1"
    return $true
  }

  $script:ComposeMode = ""
  return $false
}

function Invoke-Compose {
  param([string[]]$Arguments)

  if (-not $script:ComposeMode) {
    if (-not (Resolve-ComposeCommand)) {
      throw "Docker Compose is not available."
    }
  }

  if ($script:ComposeMode -eq "docker-compose-v1") {
    & docker-compose --env-file $EnvFile @Arguments
  } else {
    & docker compose --env-file $EnvFile @Arguments
  }
}

function Show-Doctor {
  $Issues = 0

  Write-Host ""
  Write-Host "Checking your local team test setup..."

  if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Host "  [OK] Git is installed."
  } else {
    Write-Warning "Git is not installed. Install Git first: https://git-scm.com/downloads"
    $Issues += 1
  }

  if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "  [OK] Docker is installed."
  } else {
    Write-Warning "Docker is not installed. Install Docker Desktop first."
    $Issues += 1
  }

  if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
      docker info | Out-Null
      Write-Host "  [OK] Docker is running."
    } catch {
      Write-Warning "Docker is installed but not running. Open Docker Desktop and wait until it says Docker is running."
      $Issues += 1
    }
  }

  if (Get-Command docker -ErrorAction SilentlyContinue) {
    if (Resolve-ComposeCommand) {
      Write-Host "  [OK] Docker Compose is available."
    } else {
      Write-Warning "Docker Compose is not available. Install or enable Docker Compose."
      $Issues += 1
    }
  }

  if (Test-Path $EnvFile) {
    Write-Host "  [OK] team-test.env already exists. Your last local setup can be reused."
  } else {
    Write-Host "  [INFO] team-test.env does not exist yet. It will be created from the example when you continue."
  }

  if ($Issues -eq 0) {
    Write-Host "All required checks passed."
    return $true
  }

  Write-Host "Fix the items above, then run this helper again."
  return $false
}

function Ensure-Prerequisites {
  if (-not (Show-Doctor)) {
    throw "Setup checks failed."
  }
}

function Get-ValidatedPort {
  param([string]$CurrentPort)

  $Port = Read-Host "Local port for the app [$CurrentPort]"
  if ([string]::IsNullOrWhiteSpace($Port)) {
    $Port = $CurrentPort
  }

  while (($Port -notmatch '^\d+$') -or ([int]$Port -lt 1) -or ([int]$Port -gt 65535)) {
    Write-Warning "Enter a valid port number between 1 and 65535."
    $Port = Read-Host "Local port for the app [$CurrentPort]"
    if ([string]::IsNullOrWhiteSpace($Port)) {
      $Port = $CurrentPort
    }
  }

  return $Port
}

function Get-ValidatedUsername {
  param([string]$CurrentUsername)

  $Username = Read-Host "Admin username [$CurrentUsername]"
  if ([string]::IsNullOrWhiteSpace($Username)) {
    $Username = $CurrentUsername
  }

  while ([string]::IsNullOrWhiteSpace($Username)) {
    Write-Warning "Admin username cannot be empty."
    $Username = Read-Host "Admin username [$CurrentUsername]"
    if ([string]::IsNullOrWhiteSpace($Username)) {
      $Username = $CurrentUsername
    }
  }

  return $Username
}

function Confirm-Action {
  param(
    [string]$Prompt,
    [bool]$DefaultYes = $false
  )

  while ($true) {
    if ($DefaultYes) {
      $Reply = Read-Host "$Prompt [Y/n]"
      if ([string]::IsNullOrWhiteSpace($Reply)) {
        $Reply = "y"
      }
    } else {
      $Reply = Read-Host "$Prompt [y/N]"
      if ([string]::IsNullOrWhiteSpace($Reply)) {
        $Reply = "n"
      }
    }

    switch -Regex ($Reply) {
      '^(y|yes)$' { return $true }
      '^(n|no)$' { return $false }
      default { Write-Host "Please answer y or n." }
    }
  }
}

function Show-EnvironmentSummary {
  $AppPort = Get-EnvValue "APP_PORT"
  $AdminUsername = Get-EnvValue "ADMIN_USERNAME"
  if (-not $AppPort) { $AppPort = "3000" }
  if (-not $AdminUsername) { $AdminUsername = "admin" }

  Write-Host ""
  Write-Host "Current local settings"
  Write-Host "  App URL: http://localhost:$AppPort/login.html"
  Write-Host "  Admin username: $AdminUsername"
  Write-Host "  Shared password: $DefaultPassword"
  Write-Host "  Demo data: users, gadgets, sales, and deleted history"
}

function Setup-EnvironmentInteractive {
  Ensure-Prerequisites
  Ensure-EnvFile

  $CurrentPort = Get-EnvValue "APP_PORT"
  $CurrentUsername = Get-EnvValue "ADMIN_USERNAME"
  if (-not $CurrentPort) { $CurrentPort = "3000" }
  if (-not $CurrentUsername) { $CurrentUsername = "admin" }

  Show-EnvironmentSummary
  Write-Host ""
  Write-Host "Interactive setup"
  Write-Host "This setup keeps your last team-test.env file, so you can resume later."
  Write-Host "Only the app port and admin username are changed here. The shared password stays $DefaultPassword."

  $NewPort = Get-ValidatedPort -CurrentPort $CurrentPort
  $NewUsername = Get-ValidatedUsername -CurrentUsername $CurrentUsername

  Set-EnvValue -Key "APP_PORT" -Value $NewPort
  Set-EnvValue -Key "ADMIN_USERNAME" -Value $NewUsername

  Write-Host ""
  Write-Host "Saved your local settings to team-test.env."
  Show-EnvironmentSummary
}

function Show-SuccessMessage {
  Show-EnvironmentSummary
  Write-Host ""
  Write-Host "Team test environment is ready."
  Write-Host "If you had already started it before, this resumed from your last local setup."
  Write-Host ""
  Write-Host "Useful examples"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 logs"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 status"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 stop"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 reset -Yes"
}

function Start-Environment {
  Ensure-Prerequisites
  Ensure-EnvFile
  Write-Host ""
  Write-Host "Starting or resuming the local team test environment..."
  Invoke-Compose -Arguments @("up", "-d", "--build")
  Show-SuccessMessage
}

function Stop-Environment {
  Ensure-Prerequisites
  Ensure-EnvFile
  Invoke-Compose -Arguments @("down")
  Write-Host "Team test environment stopped."
}

function Reset-Environment {
  Ensure-Prerequisites
  Ensure-EnvFile

  if (-not $Yes) {
    Write-Warning "Reset removes your local Docker data for this project."
    if (-not (Confirm-Action -Prompt "Continue with reset?" -DefaultYes:$false)) {
      Write-Host "Reset cancelled."
      return
    }
  }

  Invoke-Compose -Arguments @("down", "-v")
  Write-Host "Team test environment reset. All local test data was removed."
}

function Show-Status {
  Ensure-Prerequisites
  Ensure-EnvFile
  Invoke-Compose -Arguments @("ps")
}

function Show-Logs {
  Ensure-Prerequisites
  Ensure-EnvFile
  Invoke-Compose -Arguments @("logs", "-f")
}

function Show-Usage {
  Write-Host "Usage:"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 setup"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 doctor"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 start"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 resume"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 status"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 logs"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 stop"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 reset -Yes"
}

function Start-InteractiveMenu {
  while ($true) {
    Write-Section

    if (Test-Path $EnvFile) {
      Show-EnvironmentSummary
    } else {
      Write-Host "No team-test.env file yet. Choose Setup first, or Start/Resume to create it automatically."
    }

    Write-Host ""
    Write-Host "Choose an option"
    Write-Host "  1. Setup or update local settings"
    Write-Host "  2. Start or resume the app"
    Write-Host "  3. Check setup"
    Write-Host "  4. Show status"
    Write-Host "  5. Show logs"
    Write-Host "  6. Stop the app"
    Write-Host "  7. Reset local test data"
    Write-Host "  8. Exit"
    Write-Host ""

    $Choice = Read-Host "Enter 1-8"

    switch ($Choice) {
      "1" { Setup-EnvironmentInteractive }
      "2" { Start-Environment }
      "3" { [void](Show-Doctor) }
      "4" { Show-Status }
      "5" { Show-Logs }
      "6" { Stop-Environment }
      "7" { Reset-Environment }
      "8" {
        Write-Host "Goodbye."
        break
      }
      default {
        Write-Warning "Please choose a number from 1 to 8."
      }
    }
  }
}

Ensure-RepoContext
Push-Location $RepoRoot

try {
  switch ($Action) {
    "interactive" {
      Start-InteractiveMenu
    }
    "setup" {
      Write-Section
      Setup-EnvironmentInteractive
    }
    "doctor" {
      Write-Section
      if (-not (Show-Doctor)) {
        exit 1
      }
    }
    "start" {
      Write-Section
      Start-Environment
    }
    "resume" {
      Write-Section
      Start-Environment
    }
    "stop" {
      Write-Section
      Stop-Environment
    }
    "reset" {
      Write-Section
      Reset-Environment
    }
    "logs" {
      Write-Section
      Show-Logs
    }
    "status" {
      Write-Section
      Show-Status
    }
    "help" {
      Write-Section
      Show-Usage
    }
  }
} catch {
  Write-Warning "The setup stopped before it finished."
  Write-Warning "Your current files and Docker data were kept, so you can continue from where you left off."
  Write-Warning $_.Exception.Message
  exit 1
} finally {
  Pop-Location
}
