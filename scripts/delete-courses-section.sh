#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_ENV_FILE="$PROJECT_DIR/.env.production"
[[ -f "$DEFAULT_ENV_FILE" ]] || DEFAULT_ENV_FILE="$PROJECT_DIR/.env"
DEFAULT_COMPOSE_FILE="$PROJECT_DIR/docker-compose.vps.generated.yml"
[[ -f "$DEFAULT_COMPOSE_FILE" ]] || DEFAULT_COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
ENV_FILE="${DNMS_ENV_FILE:-$DEFAULT_ENV_FILE}"
COMPOSE_FILE="${DNMS_COMPOSE_FILE:-$DEFAULT_COMPOSE_FILE}"
COUCHDB_SERVICE="${DNMS_COUCHDB_SERVICE:-couchdb}"
COUCHDB_DATABASE="${COUCHDB_DATABASE:-dnms_platform}"
ACADEMIC_DOC_ID="academic:state"
ACADEMIC_DOC_PATH="academic%3Astate"

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  BACKUP_ROOT="${DNMS_BACKUP_ROOT:-/opt/dnms-backups}"
else
  BACKUP_ROOT="${DNMS_BACKUP_ROOT:-$PROJECT_DIR/backups}"
fi

log() {
  printf '\n[dnms-delete-courses] %s\n' "$*"
}

fail() {
  printf '\n[dnms-delete-courses] ERRO: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<EOF
Uso:
  ./scripts/delete-courses-section.sh

Variaveis opcionais:
  DNMS_ENV_FILE=/caminho/.env.production
  DNMS_COMPOSE_FILE=/caminho/docker-compose.vps.generated.yml
  DNMS_BACKUP_ROOT=/opt/dnms-backups
  DNMS_CONFIRM_DELETE_COURSES=APAGAR_CURSOS

Este script apaga somente o documento academico "$ACADEMIC_DOC_ID":
  - cursos
  - disciplinas
  - matriculas
  - aulas
  - materiais
  - avaliacoes/notas
  - chamadas/presencas/QR
  - gravacoes
  - atividades

Ele preserva membros, eventos e outros documentos do CouchDB.
EOF
}

read_env_value() {
  local key="$1"
  local default_value="$2"

  if [[ -f "$ENV_FILE" ]]; then
    local line
    line="$(grep -m1 "^${key}=" "$ENV_FILE" || true)"
    if [[ -n "$line" ]]; then
      local value="${line#*=}"
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      printf '%s' "$value"
      return
    fi
  fi

  printf '%s' "$default_value"
}

compose_args() {
  if [[ -f "$ENV_FILE" ]]; then
    printf '%s\0%s\0%s\0%s\0' "--env-file" "$ENV_FILE" "-f" "$COMPOSE_FILE"
  else
    printf '%s\0%s\0' "-f" "$COMPOSE_FILE"
  fi
}

docker_compose() {
  local args=()
  while IFS= read -r -d '' item; do
    args+=("$item")
  done < <(compose_args)
  docker compose "${args[@]}" "$@"
}

couchdb_curl() {
  docker_compose exec -T "$COUCHDB_SERVICE" \
    curl -fsS -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" "$@"
}

couchdb_put_file() {
  local file_path="$1"
  local url="$2"

  docker_compose exec -T "$COUCHDB_SERVICE" \
    curl -fsS -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" \
    -X PUT \
    -H "Content-Type: application/json" \
    --data-binary @- \
    "$url" <"$file_path"
}

require_tools() {
  command -v docker >/dev/null 2>&1 || fail "docker nao encontrado."
  docker compose version >/dev/null 2>&1 || fail "docker compose plugin nao encontrado."
  command -v python3 >/dev/null 2>&1 || fail "python3 nao encontrado no host."
  [[ -f "$COMPOSE_FILE" ]] || fail "compose nao encontrado: $COMPOSE_FILE"
}

confirm_destruction() {
  if [[ "${DNMS_CONFIRM_DELETE_COURSES:-}" == "APAGAR_CURSOS" ]]; then
    return
  fi

  printf '\nIsto vai apagar TODOS os dados de cursos/disciplinas/aulas/presencas/notas/gravacoes.\n'
  printf 'Membros e eventos serao preservados.\n'
  printf 'Digite APAGAR_CURSOS para confirmar: '
  read -r confirmation
  [[ "$confirmation" == "APAGAR_CURSOS" ]] || fail "confirmacao invalida. Nada foi apagado."
}

backup_database() {
  local backup_dir="$BACKUP_ROOT/academic-reset-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$backup_dir"
  chmod 700 "$backup_dir"

  [[ -f "$ENV_FILE" ]] && cp "$ENV_FILE" "$backup_dir/env.production.bak"
  cp "$COMPOSE_FILE" "$backup_dir/compose.bak"
  docker_compose ps >"$backup_dir/compose-ps.txt" || true
  docker volume ls >"$backup_dir/volumes.txt" || true

  couchdb_curl "http://127.0.0.1:5984/${COUCHDB_DATABASE}/_all_docs?include_docs=true" \
    >"$backup_dir/${COUCHDB_DATABASE}-all-docs-before.json"

  if couchdb_curl "http://127.0.0.1:5984/${COUCHDB_DATABASE}/${ACADEMIC_DOC_PATH}" \
    >"$backup_dir/academic-state-before.json"; then
    :
  else
    printf '{}' >"$backup_dir/academic-state-before.json"
  fi

  printf '%s' "$backup_dir"
}

build_empty_academic_document() {
  local source_doc="$1"
  local output_doc="$2"

  python3 - "$source_doc" "$output_doc" <<'PY'
import json
import sys

source_path, output_path = sys.argv[1], sys.argv[2]
rev = ""
try:
    with open(source_path, "r", encoding="utf-8") as source:
        current = json.load(source)
        rev = current.get("_rev", "")
except Exception:
    rev = ""

payload = {
    "_id": "academic:state",
    "schemaVersion": 2,
    "courses": [],
    "disciplines": [],
    "enrollments": [],
    "lessons": [],
    "materials": [],
    "evaluations": [],
    "grades": [],
    "attendance": [],
    "attendanceSessions": [],
    "attendanceAudits": [],
    "recordings": [],
    "activities": [],
}

if rev:
    payload["_rev"] = rev

with open(output_path, "w", encoding="utf-8") as output:
    json.dump(payload, output, ensure_ascii=True, separators=(",", ":"))
PY
}

verify_empty_academic_state() {
  local output_doc="$1"

  python3 - "$output_doc" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as source:
    document = json.load(source)

keys = [
    "courses",
    "disciplines",
    "enrollments",
    "lessons",
    "materials",
    "evaluations",
    "grades",
    "attendance",
    "attendanceSessions",
    "attendanceAudits",
    "recordings",
    "activities",
]

not_empty = {key: len(document.get(key) or []) for key in keys if len(document.get(key) or [])}
if not_empty:
    print(f"Academic state ainda possui dados: {not_empty}", file=sys.stderr)
    raise SystemExit(1)

print("academic:state limpo com sucesso.")
PY
}

main() {
  if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
    exit 0
  fi

  require_tools

  COUCHDB_USER="${COUCHDB_USER:-$(read_env_value COUCHDB_USER admin)}"
  COUCHDB_PASSWORD="${COUCHDB_PASSWORD:-$(read_env_value COUCHDB_PASSWORD password)}"

  log "Alvo"
  printf 'Projeto: %s\n' "$PROJECT_DIR"
  printf 'Compose: %s\n' "$COMPOSE_FILE"
  printf 'Env: %s\n' "$ENV_FILE"
  printf 'Banco: %s\n' "$COUCHDB_DATABASE"
  printf 'Documento: %s\n' "$ACADEMIC_DOC_ID"

  docker_compose ps "$COUCHDB_SERVICE" | grep -q "Up" || fail "container $COUCHDB_SERVICE nao esta ativo."
  couchdb_curl "http://127.0.0.1:5984/_up" >/dev/null || fail "nao foi possivel autenticar no CouchDB."

  confirm_destruction

  log "Gerando backup antes de apagar cursos"
  local backup_dir
  backup_dir="$(backup_database)"
  printf 'Backup salvo em: %s\n' "$backup_dir"

  local empty_doc
  empty_doc="$(mktemp)"
  build_empty_academic_document "$backup_dir/academic-state-before.json" "$empty_doc"

  log "Limpando documento academico"
  couchdb_put_file "$empty_doc" "http://127.0.0.1:5984/${COUCHDB_DATABASE}/${ACADEMIC_DOC_PATH}" >/dev/null

  local after_doc="$backup_dir/academic-state-after.json"
  couchdb_curl "http://127.0.0.1:5984/${COUCHDB_DATABASE}/${ACADEMIC_DOC_PATH}" >"$after_doc"
  verify_empty_academic_state "$after_doc"

  rm -f "$empty_doc"

  log "Finalizado"
  printf 'Cursos, disciplinas, matriculas, aulas, materiais, notas, presencas, QR, gravacoes e atividades foram apagados.\n'
  printf 'Membros e eventos foram preservados.\n'
}

main "$@"
