#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${REPO_ROOT}/team-test.env"
ENV_EXAMPLE="${REPO_ROOT}/team-test.env.example"
DEFAULT_PASSWORD="TeamTest123!"
ACTION="${1:-interactive}"
RESET_FLAG="${2:-}"
COMPOSE_CMD=()

print_line() {
  printf '%s\n' "${1:-}"
}

print_header() {
  print_line
  print_line "Sika Prime Gadget Manager - Team Test Helper"
  print_line "Repository: ${REPO_ROOT}"
  print_line
}

warn() {
  printf 'Warning: %s\n' "$1" >&2
}

die() {
  warn "$1"
  exit 1
}

handle_error() {
  local exit_code=$?
  warn "The setup stopped before it finished."
  warn "Your current files and Docker data were kept, so you can continue from where you left off."
  warn "Run this helper again and choose Start or Resume after fixing the issue above."
  exit "${exit_code}"
}

trap handle_error ERR

ensure_repo_context() {
  [[ -f "${REPO_ROOT}/compose.yaml" ]] || die "compose.yaml was not found. Run this script from the cloned repository."
}

read_env_value() {
  local key="$1"
  if [[ ! -f "${ENV_FILE}" ]]; then
    return 0
  fi

  awk -F= -v key="${key}" '$1 == key { print substr($0, index($0, "=") + 1); exit }' "${ENV_FILE}"
}

upsert_env_value() {
  local key="$1"
  local value="$2"
  local temp_file
  temp_file="$(mktemp)"

  if [[ -f "${ENV_FILE}" ]]; then
    awk -v key="${key}" -v value="${value}" '
      BEGIN { updated = 0 }
      index($0, key "=") == 1 {
        print key "=" value
        updated = 1
        next
      }
      { print }
      END {
        if (!updated) {
          print key "=" value
        }
      }
    ' "${ENV_FILE}" > "${temp_file}"
  else
    printf '%s=%s\n' "${key}" "${value}" > "${temp_file}"
  fi

  mv "${temp_file}" "${ENV_FILE}"
}

ensure_env_file() {
  if [[ -f "${ENV_FILE}" ]]; then
    return
  fi

  cp "${ENV_EXAMPLE}" "${ENV_FILE}"
  print_line "Created team-test.env from team-test.env.example."
}

set_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    return 0
  fi

  return 1
}

compose() {
  "${COMPOSE_CMD[@]}" --env-file "${ENV_FILE}" "$@"
}

show_doctor() {
  local issues=0

  print_line
  print_line "Checking your local team test setup..."

  if command -v git >/dev/null 2>&1; then
    print_line "  [OK] Git is installed."
  else
    warn "Git is not installed. Install Git first: https://git-scm.com/downloads"
    issues=$((issues + 1))
  fi

  if command -v docker >/dev/null 2>&1; then
    print_line "  [OK] Docker is installed."
  else
    warn "Docker is not installed. Install Docker Desktop or Docker Engine first."
    issues=$((issues + 1))
  fi

  if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
      print_line "  [OK] Docker is running."
    else
      warn "Docker is installed but not running. Open Docker Desktop and wait until it says Docker is running."
      issues=$((issues + 1))
    fi
  fi

  if command -v docker >/dev/null 2>&1; then
    if set_compose_cmd; then
      print_line "  [OK] Docker Compose is available."
    else
      warn "Docker Compose is not available. Install or enable Docker Compose."
      issues=$((issues + 1))
    fi
  fi

  if [[ -f "${ENV_FILE}" ]]; then
    print_line "  [OK] team-test.env already exists. Your last local setup can be reused."
  else
    print_line "  [INFO] team-test.env does not exist yet. It will be created from the example when you continue."
  fi

  if (( issues == 0 )); then
    print_line "All required checks passed."
    return 0
  fi

  print_line "Fix the items above, then run this helper again."
  return 1
}

require_prerequisites() {
  show_doctor || die "Setup checks failed."
}

prompt_with_default() {
  local label="$1"
  local current_value="$2"
  local reply
  read -r -p "${label} [${current_value}]: " reply || true

  if [[ -z "${reply}" ]]; then
    printf '%s\n' "${current_value}"
  else
    printf '%s\n' "${reply}"
  fi
}

ask_yes_no() {
  local label="$1"
  local default_answer="${2:-y}"
  local reply

  while true; do
    if [[ "${default_answer}" == "y" ]]; then
      read -r -p "${label} [Y/n]: " reply || true
      reply="${reply:-y}"
    else
      read -r -p "${label} [y/N]: " reply || true
      reply="${reply:-n}"
    fi

    case "${reply}" in
      y|Y|yes|YES)
        return 0
        ;;
      n|N|no|NO)
        return 1
        ;;
      *)
        print_line "Please answer y or n."
        ;;
    esac
  done
}

validate_port() {
  local value="$1"
  [[ "${value}" =~ ^[0-9]+$ ]] && (( value >= 1 && value <= 65535 ))
}

print_environment_summary() {
  local app_port admin_username
  app_port="$(read_env_value "APP_PORT")"
  admin_username="$(read_env_value "ADMIN_USERNAME")"
  app_port="${app_port:-3000}"
  admin_username="${admin_username:-admin}"

  print_line
  print_line "Current local settings"
  print_line "  App URL: http://localhost:${app_port}/login.html"
  print_line "  Admin username: ${admin_username}"
  print_line "  Shared password: ${DEFAULT_PASSWORD}"
  print_line "  Demo data: users, gadgets, sales, and deleted history"
}

setup_environment_interactive() {
  require_prerequisites
  ensure_env_file

  local current_port current_username new_port new_username
  current_port="$(read_env_value "APP_PORT")"
  current_username="$(read_env_value "ADMIN_USERNAME")"
  current_port="${current_port:-3000}"
  current_username="${current_username:-admin}"

  print_environment_summary
  print_line
  print_line "Interactive setup"
  print_line "This setup keeps your last team-test.env file, so you can resume later."
  print_line "Only the app port and admin username are changed here. The shared password stays ${DEFAULT_PASSWORD}."

  new_port="$(prompt_with_default "Local port for the app" "${current_port}")"
  until validate_port "${new_port}"; do
    warn "Enter a valid port number between 1 and 65535."
    new_port="$(prompt_with_default "Local port for the app" "${current_port}")"
  done

  new_username="$(prompt_with_default "Admin username" "${current_username}")"
  while [[ -z "${new_username}" ]]; do
    warn "Admin username cannot be empty."
    new_username="$(prompt_with_default "Admin username" "${current_username}")"
  done

  upsert_env_value "APP_PORT" "${new_port}"
  upsert_env_value "ADMIN_USERNAME" "${new_username}"

  print_line
  print_line "Saved your local settings to team-test.env."
  print_environment_summary
}

print_success_message() {
  print_line
  print_line "Team test environment is ready."
  print_line "If you had already started it before, this resumed from your last local setup."
  print_environment_summary
  print_line
  print_line "Useful examples"
  print_line "  bash ./scripts/team-test.sh logs"
  print_line "  bash ./scripts/team-test.sh status"
  print_line "  bash ./scripts/team-test.sh stop"
  print_line "  bash ./scripts/team-test.sh reset --yes"
}

start_environment() {
  require_prerequisites
  ensure_env_file

  print_line
  print_line "Starting or resuming the local team test environment..."
  compose up -d --build
  print_success_message
}

stop_environment() {
  require_prerequisites
  ensure_env_file
  compose down
  print_line "Team test environment stopped."
}

reset_environment() {
  require_prerequisites
  ensure_env_file

  if [[ "${RESET_FLAG}" != "--yes" ]]; then
    if [[ ! -t 0 ]]; then
      die "Reset needs confirmation. Re-run with: bash ./scripts/team-test.sh reset --yes"
    fi

    print_line
    warn "Reset removes your local Docker data for this project."
    ask_yes_no "Continue with reset?" "n" || {
      print_line "Reset cancelled."
      return 0
    }
  fi

  compose down -v
  print_line "Team test environment reset. All local test data was removed."
}

show_status() {
  require_prerequisites
  ensure_env_file
  compose ps
}

show_logs() {
  require_prerequisites
  ensure_env_file
  compose logs -f
}

print_usage() {
  print_line "Usage:"
  print_line "  bash ./scripts/team-test.sh"
  print_line "  bash ./scripts/team-test.sh setup"
  print_line "  bash ./scripts/team-test.sh doctor"
  print_line "  bash ./scripts/team-test.sh start"
  print_line "  bash ./scripts/team-test.sh resume"
  print_line "  bash ./scripts/team-test.sh status"
  print_line "  bash ./scripts/team-test.sh logs"
  print_line "  bash ./scripts/team-test.sh stop"
  print_line "  bash ./scripts/team-test.sh reset --yes"
}

interactive_menu() {
  while true; do
    print_header
    if [[ -f "${ENV_FILE}" ]]; then
      print_environment_summary
    else
      print_line "No team-test.env file yet. Choose Setup first, or Start/Resume to create it automatically."
    fi

    print_line
    print_line "Choose an option"
    print_line "  1. Setup or update local settings"
    print_line "  2. Start or resume the app"
    print_line "  3. Check setup"
    print_line "  4. Show status"
    print_line "  5. Show logs"
    print_line "  6. Stop the app"
    print_line "  7. Reset local test data"
    print_line "  8. Exit"
    print_line

    local choice
    read -r -p "Enter 1-8: " choice || true

    case "${choice}" in
      1)
        setup_environment_interactive
        ;;
      2)
        start_environment
        ;;
      3)
        show_doctor || true
        ;;
      4)
        show_status
        ;;
      5)
        show_logs
        ;;
      6)
        stop_environment
        ;;
      7)
        reset_environment
        ;;
      8)
        print_line "Goodbye."
        break
        ;;
      *)
        warn "Please choose a number from 1 to 8."
        ;;
    esac
  done
}

ensure_repo_context
cd "${REPO_ROOT}"

case "${ACTION}" in
  interactive)
    interactive_menu
    ;;
  setup)
    print_header
    setup_environment_interactive
    ;;
  doctor)
    print_header
    show_doctor || exit 1
    ;;
  start|resume)
    print_header
    start_environment
    ;;
  stop)
    print_header
    stop_environment
    ;;
  reset)
    print_header
    reset_environment
    ;;
  logs)
    print_header
    show_logs
    ;;
  status)
    print_header
    show_status
    ;;
  help|-h|--help)
    print_header
    print_usage
    ;;
  *)
    print_header
    warn "Unknown action: ${ACTION}"
    print_usage
    exit 1
    ;;
esac
