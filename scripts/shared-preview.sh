#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PREVIEW_ENV_FILE="${REPO_ROOT}/deploy/railway-preview.local.env"
PREVIEW_ENV_EXAMPLE="${REPO_ROOT}/deploy/railway-preview.local.env.example"
PREVIEW_VARS_FILE="${REPO_ROOT}/deploy/railway-preview.variables.txt"
PREVIEW_DB_ENV_FILE="${REPO_ROOT}/deploy/railway-preview-db.local.env"
DEFAULT_PREVIEW_PASSWORD="TeamTest123!"
ACTION="${1:-interactive}"

print_line() {
  printf '%s\n' "${1:-}"
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
  warn "The shared preview helper stopped before it finished."
  warn "Any generated local files were kept, so you can continue from where you left off."
  exit "${exit_code}"
}

trap handle_error ERR

ensure_repo_context() {
  [[ -f "${REPO_ROOT}/deploy/railway.md" ]] || die "deploy/railway.md was not found. Run this helper from the repository."
  [[ -d "${REPO_ROOT}/backend/node_modules" ]] || die "backend/node_modules is missing. Run npm install in backend first."
}

read_env_value() {
  local file_path="$1"
  local key="$2"

  if [[ ! -f "${file_path}" ]]; then
    return 0
  fi

  awk -F= -v key="${key}" '$1 == key { print substr($0, index($0, "=") + 1); exit }' "${file_path}"
}

upsert_env_value() {
  local file_path="$1"
  local key="$2"
  local value="$3"
  local temp_file
  temp_file="$(mktemp)"

  if [[ -f "${file_path}" ]]; then
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
    ' "${file_path}" > "${temp_file}"
  else
    printf '%s=%s\n' "${key}" "${value}" > "${temp_file}"
  fi

  mv "${temp_file}" "${file_path}"
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

prompt_secret_with_default() {
  local label="$1"
  local current_value="$2"
  local reply
  read -r -s -p "${label} [hidden, press Enter to keep default]: " reply || true
  print_line

  if [[ -z "${reply}" ]]; then
    printf '%s\n' "${current_value}"
  else
    printf '%s\n' "${reply}"
  fi
}

generate_session_secret() {
  node -e "const crypto=require('crypto'); console.log(crypto.randomBytes(32).toString('hex'))"
}

generate_password_hash() {
  local admin_password="$1"
  PREVIEW_ADMIN_PASSWORD="${admin_password}" node -e "require('./backend/node_modules/bcryptjs').hash(process.env.PREVIEW_ADMIN_PASSWORD, 10).then(console.log)"
}

ensure_preview_env() {
  if [[ -f "${PREVIEW_ENV_FILE}" ]]; then
    return
  fi

  cp "${PREVIEW_ENV_EXAMPLE}" "${PREVIEW_ENV_FILE}"
}

write_preview_variables_file() {
  local mysql_service="$1"
  local db_connection_limit="$2"
  local session_secret="$3"
  local admin_username="$4"
  local admin_email="$5"
  local admin_password_hash="$6"

  local temp_file
  temp_file="$(mktemp)"

  {
    printf '# Paste these values into the Railway web service Variables page.\n'
    printf 'DB_HOST=${{%s.MYSQLHOST}}\n' "${mysql_service}"
    printf 'DB_PORT=${{%s.MYSQLPORT}}\n' "${mysql_service}"
    printf 'DB_USER=${{%s.MYSQLUSER}}\n' "${mysql_service}"
    printf 'DB_PASS=${{%s.MYSQLPASSWORD}}\n' "${mysql_service}"
    printf 'DB_NAME=${{%s.MYSQLDATABASE}}\n' "${mysql_service}"
    printf 'DB_CONNECTION_LIMIT=%s\n' "${db_connection_limit}"
    printf 'SESSION_SECRET=%s\n' "${session_secret}"
    printf 'AUTO_RUN_MIGRATIONS=true\n'
    printf 'AUTO_SEED_DEMO_DATA=true\n'
    printf 'ADMIN_USERNAME=%s\n' "${admin_username}"
    printf 'ADMIN_EMAIL=%s\n' "${admin_email}"
    printf 'ADMIN_PASSWORD_HASH=%s\n' "${admin_password_hash}"
    printf 'UPLOADS_DIR=${{RAILWAY_VOLUME_MOUNT_PATH}}/uploads\n'
    printf 'SESSIONS_DIR=${{RAILWAY_VOLUME_MOUNT_PATH}}/sessions\n'
  } > "${temp_file}"

  mv "${temp_file}" "${PREVIEW_VARS_FILE}"
}

prepare_preview() {
  ensure_repo_context
  ensure_preview_env

  local current_service current_limit current_username current_email admin_password
  local mysql_service db_connection_limit admin_username admin_email session_secret admin_password_hash

  current_service="$(read_env_value "${PREVIEW_ENV_FILE}" "RAILWAY_MYSQL_SERVICE")"
  current_limit="$(read_env_value "${PREVIEW_ENV_FILE}" "DB_CONNECTION_LIMIT")"
  current_username="$(read_env_value "${PREVIEW_ENV_FILE}" "ADMIN_USERNAME")"
  current_email="$(read_env_value "${PREVIEW_ENV_FILE}" "ADMIN_EMAIL")"

  current_service="${current_service:-MySQL}"
  current_limit="${current_limit:-10}"
  current_username="${current_username:-admin}"
  current_email="${current_email:-admin@example.com}"

  print_line
  print_line "Preparing local Railway preview settings..."

  mysql_service="$(prompt_with_default "Railway MySQL service name" "${current_service}")"
  db_connection_limit="$(prompt_with_default "Database connection limit" "${current_limit}")"
  admin_username="$(prompt_with_default "Preview admin username" "${current_username}")"
  admin_email="$(prompt_with_default "Preview admin email" "${current_email}")"
  admin_password="$(prompt_secret_with_default "Preview admin password" "${DEFAULT_PREVIEW_PASSWORD}")"

  session_secret="$(generate_session_secret)"
  admin_password_hash="$(generate_password_hash "${admin_password}")"

  upsert_env_value "${PREVIEW_ENV_FILE}" "RAILWAY_MYSQL_SERVICE" "${mysql_service}"
  upsert_env_value "${PREVIEW_ENV_FILE}" "DB_CONNECTION_LIMIT" "${db_connection_limit}"
  upsert_env_value "${PREVIEW_ENV_FILE}" "SESSION_SECRET" "${session_secret}"
  upsert_env_value "${PREVIEW_ENV_FILE}" "ADMIN_USERNAME" "${admin_username}"
  upsert_env_value "${PREVIEW_ENV_FILE}" "ADMIN_EMAIL" "${admin_email}"
  upsert_env_value "${PREVIEW_ENV_FILE}" "ADMIN_PASSWORD_HASH" "${admin_password_hash}"

  write_preview_variables_file \
    "${mysql_service}" \
    "${db_connection_limit}" \
    "${session_secret}" \
    "${admin_username}" \
    "${admin_email}" \
    "${admin_password_hash}"

  print_line
  print_line "Local preview files updated:"
  print_line "  ${PREVIEW_ENV_FILE}"
  print_line "  ${PREVIEW_VARS_FILE}"
  print_line
  print_line "Preview login for the shared site:"
  print_line "  Username: ${admin_username}"
  print_line "  Password: ${admin_password}"
  print_line
  print_line "Next manual step:"
  print_line "  Open Railway, create the project and MySQL service, then paste the values from:"
  print_line "  ${PREVIEW_VARS_FILE}"
  print_line "  The hosted app will auto-run migrations and seed demo data on first boot."
}

bootstrap_preview_database() {
  ensure_repo_context

  [[ -f "${PREVIEW_ENV_FILE}" ]] || die "Preview settings not found. Run: bash ./scripts/shared-preview.sh prepare"

  local current_host current_port current_user current_name current_limit
  local db_host db_port db_user db_pass db_name admin_username admin_email admin_password_hash db_connection_limit

  current_host="$(read_env_value "${PREVIEW_DB_ENV_FILE}" "DB_HOST")"
  current_port="$(read_env_value "${PREVIEW_DB_ENV_FILE}" "DB_PORT")"
  current_user="$(read_env_value "${PREVIEW_DB_ENV_FILE}" "DB_USER")"
  current_name="$(read_env_value "${PREVIEW_DB_ENV_FILE}" "DB_NAME")"
  current_limit="$(read_env_value "${PREVIEW_ENV_FILE}" "DB_CONNECTION_LIMIT")"

  current_host="${current_host:-}"
  current_port="${current_port:-3306}"
  current_user="${current_user:-root}"
  current_name="${current_name:-railway}"
  current_limit="${current_limit:-10}"

  print_line
  print_line "Bootstrap the shared Railway database"
  print_line "Use the Railway MySQL TCP proxy/public connection values here."

  db_host="$(prompt_with_default "DB host" "${current_host}")"
  db_port="$(prompt_with_default "DB port" "${current_port}")"
  db_user="$(prompt_with_default "DB user" "${current_user}")"
  db_name="$(prompt_with_default "DB name" "${current_name}")"
  db_pass="$(prompt_secret_with_default "DB password" "")"

  [[ -n "${db_host}" ]] || die "DB host is required."
  [[ -n "${db_port}" ]] || die "DB port is required."
  [[ -n "${db_user}" ]] || die "DB user is required."
  [[ -n "${db_name}" ]] || die "DB name is required."

  upsert_env_value "${PREVIEW_DB_ENV_FILE}" "DB_HOST" "${db_host}"
  upsert_env_value "${PREVIEW_DB_ENV_FILE}" "DB_PORT" "${db_port}"
  upsert_env_value "${PREVIEW_DB_ENV_FILE}" "DB_USER" "${db_user}"
  upsert_env_value "${PREVIEW_DB_ENV_FILE}" "DB_PASS" "${db_pass}"
  upsert_env_value "${PREVIEW_DB_ENV_FILE}" "DB_NAME" "${db_name}"

  admin_username="$(read_env_value "${PREVIEW_ENV_FILE}" "ADMIN_USERNAME")"
  admin_email="$(read_env_value "${PREVIEW_ENV_FILE}" "ADMIN_EMAIL")"
  admin_password_hash="$(read_env_value "${PREVIEW_ENV_FILE}" "ADMIN_PASSWORD_HASH")"
  db_connection_limit="$(read_env_value "${PREVIEW_ENV_FILE}" "DB_CONNECTION_LIMIT")"

  print_line
  print_line "Checking the remote database connection..."

  (
    cd "${REPO_ROOT}/backend"
    DB_HOST="${db_host}" \
    DB_PORT="${db_port}" \
    DB_USER="${db_user}" \
    DB_PASS="${db_pass}" \
    DB_NAME="${db_name}" \
    DB_CONNECTION_LIMIT="${db_connection_limit}" \
    node scripts/check-db.js

    print_line "Running migrations on the shared preview database..."
    DB_HOST="${db_host}" \
    DB_PORT="${db_port}" \
    DB_USER="${db_user}" \
    DB_PASS="${db_pass}" \
    DB_NAME="${db_name}" \
    DB_CONNECTION_LIMIT="${db_connection_limit}" \
    node scripts/run-migrations.js

    print_line "Seeding demo data into the shared preview database..."
    DB_HOST="${db_host}" \
    DB_PORT="${db_port}" \
    DB_USER="${db_user}" \
    DB_PASS="${db_pass}" \
    DB_NAME="${db_name}" \
    DB_CONNECTION_LIMIT="${db_connection_limit}" \
    ADMIN_USERNAME="${admin_username}" \
    ADMIN_EMAIL="${admin_email}" \
    ADMIN_PASSWORD_HASH="${admin_password_hash}" \
    node scripts/seed-demo-data.js
  )

  print_line
  print_line "Shared preview database bootstrap complete."
  print_line "If Railway already deployed the web service, redeploy it once so it starts against the initialized database."
}

show_preview_files() {
  [[ -f "${PREVIEW_ENV_FILE}" ]] || die "Preview settings not found yet. Run prepare first."

  print_line
  print_line "Local preview settings file:"
  print_line "  ${PREVIEW_ENV_FILE}"
  print_line
  print_line "Paste-ready Railway variables:"
  print_line "  ${PREVIEW_VARS_FILE}"

  if [[ -f "${PREVIEW_VARS_FILE}" ]]; then
    print_line
    sed -n '1,200p' "${PREVIEW_VARS_FILE}"
  fi
}

print_usage() {
  print_line "Usage:"
  print_line "  bash ./scripts/shared-preview.sh"
  print_line "  bash ./scripts/shared-preview.sh prepare"
  print_line "  bash ./scripts/shared-preview.sh bootstrap-db"
  print_line "  bash ./scripts/shared-preview.sh show"
  print_line "  bash ./scripts/shared-preview.sh help"
}

interactive_menu() {
  while true; do
    print_line
    print_line "Shared Preview Helper"
    print_line "  1. Prepare Railway preview variables"
    print_line "  2. Bootstrap Railway database"
    print_line "  3. Show current preview files"
    print_line "  4. Exit"
    print_line

    local choice
    read -r -p "Enter 1-4: " choice || true

    case "${choice}" in
      1)
        prepare_preview
        ;;
      2)
        bootstrap_preview_database
        ;;
      3)
        show_preview_files
        ;;
      4)
        break
        ;;
      *)
        warn "Please choose a number from 1 to 4."
        ;;
    esac
  done
}

cd "${REPO_ROOT}"

case "${ACTION}" in
  interactive)
    interactive_menu
    ;;
  prepare)
    prepare_preview
    ;;
  bootstrap-db)
    bootstrap_preview_database
    ;;
  show)
    show_preview_files
    ;;
  help|-h|--help)
    print_usage
    ;;
  *)
    warn "Unknown action: ${ACTION}"
    print_usage
    exit 1
    ;;
esac
