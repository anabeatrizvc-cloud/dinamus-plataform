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
TARGET_LESSON_ID="${ECO_LESSON_ID:-${1:-}}"

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  BACKUP_ROOT="${DNMS_BACKUP_ROOT:-/opt/dnms-backups}"
else
  BACKUP_ROOT="${DNMS_BACKUP_ROOT:-$PROJECT_DIR/backups}"
fi

log() {
  printf '\n[dnms-eco-photos] %s\n' "$*"
}

fail() {
  printf '\n[dnms-eco-photos] ERRO: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<EOF
Uso:
  ./scripts/purge-eco-reviewed-photos.sh [eco-2026-09-01]

Variaveis opcionais:
  ECO_LESSON_ID=eco-2026-09-01
  DNMS_ENV_FILE=/caminho/.env.production
  DNMS_COMPOSE_FILE=/caminho/docker-compose.vps.generated.yml
  DNMS_BACKUP_ROOT=/opt/dnms-backups
  DNMS_CONFIRM_PURGE_ECO_PHOTOS=APAGAR_FOTOS_ECO

O script remove apenas payload.photoDataUrl das presencas Eco com status
VALIDATED ou REJECTED. Nomes, telefones, datas e status sao preservados.
Se uma aula for informada, somente aquela aula sera limpa.
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

confirm_cleanup() {
  if [[ "${DNMS_CONFIRM_PURGE_ECO_PHOTOS:-}" == "APAGAR_FOTOS_ECO" ]]; then
    return
  fi

  printf '\nIsto vai apagar fotos de presencas Eco ja revisadas'
  if [[ -n "$TARGET_LESSON_ID" ]]; then
    printf ' da aula %s' "$TARGET_LESSON_ID"
  fi
  printf '. Os registros serao preservados.\n'
  printf 'Digite APAGAR_FOTOS_ECO para confirmar: '
  read -r confirmation
  [[ "$confirmation" == "APAGAR_FOTOS_ECO" ]] || fail "confirmacao invalida. Nada foi apagado."
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
  printf 'Aula: %s\n' "${TARGET_LESSON_ID:-todas}"

  docker_compose ps "$COUCHDB_SERVICE" | grep -q "Up" || fail "container $COUCHDB_SERVICE nao esta ativo."
  couchdb_curl "http://127.0.0.1:5984/_up" >/dev/null || fail "nao foi possivel autenticar no CouchDB."
  confirm_cleanup

  local backup_dir="$BACKUP_ROOT/eco-photo-purge-$(date +%Y%m%d-%H%M%S)"
  local updates_dir="$backup_dir/updates"
  mkdir -p "$updates_dir"
  chmod 700 "$backup_dir"

  log "Gerando backup dos documentos Eco"
  local all_docs="$backup_dir/eco-attendance-before.json"
  couchdb_curl "http://127.0.0.1:5984/${COUCHDB_DATABASE}/_all_docs?include_docs=true&startkey=%22eco-attendance%3A%22&endkey=%22eco-attendance%3A%EF%BF%B0%22" >"$all_docs"

  local manifest="$backup_dir/updates.tsv"
  python3 - "$all_docs" "$updates_dir" "$TARGET_LESSON_ID" >"$manifest" <<'PY'
import base64
import json
import os
import sys

source_path, updates_dir, target_lesson = sys.argv[1], sys.argv[2], sys.argv[3]
with open(source_path, "r", encoding="utf-8") as source:
    rows = json.load(source).get("rows", [])

for row in rows:
    doc = row.get("doc") or {}
    payload = doc.get("payload") or {}
    if doc.get("type") != "eco-attendance":
        continue
    if target_lesson and payload.get("lessonId") != target_lesson:
        continue
    if payload.get("status") not in {"VALIDATED", "REJECTED"}:
        continue
    if not payload.get("photoDataUrl"):
        continue

    payload["photoDataUrl"] = ""
    doc["payload"] = payload
    filename = base64.urlsafe_b64encode(doc["_id"].encode("utf-8")).decode("ascii") + ".json"
    path = os.path.join(updates_dir, filename)
    with open(path, "w", encoding="utf-8") as output:
        json.dump(doc, output, ensure_ascii=True, separators=(",", ":"))
    print(f"{doc['_id']}\t{path}")
PY

  local count
  count="$(wc -l <"$manifest" | tr -d ' ')"
  if [[ "$count" == "0" ]]; then
    log "Nada para limpar"
    printf 'Nenhuma foto revisada encontrada.\n'
    printf 'Backup salvo em: %s\n' "$backup_dir"
    exit 0
  fi

  log "Removendo fotos revisadas"
  while IFS=$'\t' read -r doc_id file_path; do
    local encoded_id="${doc_id//:/%3A}"
    couchdb_put_file "$file_path" "http://127.0.0.1:5984/${COUCHDB_DATABASE}/${encoded_id}" >/dev/null
  done <"$manifest"

  log "Finalizado"
  printf '%s documento(s) Eco tiveram a foto removida.\n' "$count"
  printf 'Backup salvo em: %s\n' "$backup_dir"
}

main "$@"
