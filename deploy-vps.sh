#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="dnms-platform"
APP_PORT="127.0.0.1:8088"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$PROJECT_DIR/.env.production"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.vps.generated.yml"
NGINX_SITE="/etc/nginx/sites-available/$APP_NAME"
NGINX_LINK="/etc/nginx/sites-enabled/$APP_NAME"
ACME_ROOT="/var/www/letsencrypt"

log() {
  printf '\n[%s] %s\n' "$APP_NAME" "$*"
}

fail() {
  printf '\n[%s] ERRO: %s\n' "$APP_NAME" "$*" >&2
  exit 1
}

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    exec sudo -E bash "$0" "$@"
  fi
}

normalize_domain() {
  local value="$1"
  value="${value#http://}"
  value="${value#https://}"
  value="${value%%/*}"
  value="${value%%:*}"
  printf '%s' "$value"
}

read_settings() {
  DOMAIN="$(normalize_domain "${DOMAIN:-}")"

  if [[ -z "$DOMAIN" ]]; then
    read -rp "Dominio da plataforma, exemplo app.seudominio.com: " DOMAIN
    DOMAIN="$(normalize_domain "$DOMAIN")"
  fi

  if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
    fail "dominio invalido: $DOMAIN"
  fi

  if [[ -z "${EMAIL:-}" ]]; then
    read -rp "Email para o certificado SSL/Let's Encrypt: " EMAIL
  fi

  if [[ ! "$EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
    fail "email invalido: $EMAIL"
  fi
}

check_project() {
  cd "$PROJECT_DIR"

  [[ -f frontend/Dockerfile ]] || fail "frontend/Dockerfile nao encontrado. Execute este script na raiz do projeto."
  [[ -f backend/Dockerfile ]] || fail "backend/Dockerfile nao encontrado. Execute este script na raiz do projeto."
  [[ -f infrastructure/nginx/reverse-proxy.conf ]] || fail "config interna do Nginx nao encontrada."
}

install_system_packages() {
  export DEBIAN_FRONTEND=noninteractive

  log "Instalando pacotes base"
  apt-get update
  apt-get install -y ca-certificates curl gnupg openssl ufw nginx certbot

  if ! command -v docker >/dev/null 2>&1; then
    log "Instalando Docker Engine"
    . /etc/os-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL "https://download.docker.com/linux/${ID}/gpg" | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" >/etc/apt/sources.list.d/docker.list
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi

  docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin nao esta disponivel."

  systemctl enable --now docker
  systemctl enable --now nginx
}

ensure_env_value() {
  local key="$1"
  local value="$2"

  touch "$ENV_FILE"
  chmod 600 "$ENV_FILE"

  if grep -q "^${key}=" "$ENV_FILE"; then
    return
  fi

  printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
}

write_env_file() {
  log "Preparando variaveis sensiveis"
  ensure_env_value "COUCHDB_USER" "dnms_app"
  ensure_env_value "COUCHDB_PASSWORD" "$(openssl rand -hex 32)"
  ensure_env_value "JWT_GENERATOR_SIGNATURE_SECRET" "$(openssl rand -hex 64)"

  if grep -q '^CORS_ALLOWED_ORIGINS=' "$ENV_FILE"; then
    sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://$DOMAIN|" "$ENV_FILE"
  else
    printf 'CORS_ALLOWED_ORIGINS=https://%s\n' "$DOMAIN" >>"$ENV_FILE"
  fi

  chmod 600 "$ENV_FILE"
}

write_compose_file() {
  log "Gerando compose de producao"
  cat >"$COMPOSE_FILE" <<'YAML'
services:
  couchdb:
    image: couchdb:3.4
    restart: unless-stopped
    environment:
      COUCHDB_USER: ${COUCHDB_USER}
      COUCHDB_PASSWORD: ${COUCHDB_PASSWORD}
    expose:
      - "5984"
    volumes:
      - couchdb-data:/opt/couchdb/data
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS \"http://$${COUCHDB_USER}:$${COUCHDB_PASSWORD}@localhost:5984/_up\" >/dev/null"]
      interval: 10s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./backend
    restart: unless-stopped
    environment:
      SERVER_PORT: 8080
      JWT_GENERATOR_SIGNATURE_SECRET: ${JWT_GENERATOR_SIGNATURE_SECRET}
      COUCHDB_ENABLED: "true"
      COUCHDB_URL: http://couchdb:5984
      COUCHDB_DATABASE: dnms_platform
      COUCHDB_USER: ${COUCHDB_USER}
      COUCHDB_PASSWORD: ${COUCHDB_PASSWORD}
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS}
    depends_on:
      couchdb:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 10

  frontend:
    build:
      context: ./frontend
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1/healthz"]
      interval: 10s
      timeout: 5s
      retries: 10

  reverse-proxy:
    image: nginx:1.27-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:8088:80"
    volumes:
      - ./infrastructure/nginx/reverse-proxy.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      frontend:
        condition: service_healthy
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1/healthz"]
      interval: 10s
      timeout: 5s
      retries: 10

volumes:
  couchdb-data:
YAML
}

write_nginx_http_config() {
  log "Preparando Nginx para emissao do SSL"
  mkdir -p "$ACME_ROOT"

  cat >"$NGINX_SITE" <<NGINX
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN;

  location /.well-known/acme-challenge/ {
    root $ACME_ROOT;
  }

  location / {
    proxy_pass http://$APP_PORT;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINX

  rm -f /etc/nginx/sites-enabled/default
  ln -sf "$NGINX_SITE" "$NGINX_LINK"
  nginx -t
  systemctl reload nginx
}

write_nginx_ssl_config() {
  log "Ativando Nginx com HTTPS"
  cat >"$NGINX_SITE" <<NGINX
limit_req_zone \$binary_remote_addr zone=dnms_rate:10m rate=10r/s;

server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN;

  location /.well-known/acme-challenge/ {
    root $ACME_ROOT;
  }

  location / {
    return 301 https://\$host\$request_uri;
  }
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name $DOMAIN;

  ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

  client_max_body_size 10m;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options DENY always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

  location / {
    limit_req zone=dnms_rate burst=40 nodelay;
    proxy_pass http://$APP_PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
NGINX

  ln -sf "$NGINX_SITE" "$NGINX_LINK"
  nginx -t
  systemctl reload nginx
}

configure_ssl() {
  write_nginx_http_config

  if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
    log "Emitindo certificado Let's Encrypt para $DOMAIN"
    certbot certonly \
      --webroot \
      --webroot-path "$ACME_ROOT" \
      --domain "$DOMAIN" \
      --email "$EMAIL" \
      --agree-tos \
      --non-interactive \
      --rsa-key-size 4096
  else
    log "Certificado existente encontrado; renovacao sera gerenciada pelo Certbot"
    certbot renew --quiet || true
  fi

  write_nginx_ssl_config
  systemctl list-timers | grep -q certbot || systemctl enable --now certbot.timer || true
}

configure_firewall() {
  log "Configurando firewall"
  ufw allow OpenSSH
  ufw allow "Nginx Full"
  ufw --force enable
}

deploy_containers() {
  log "Subindo containers"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --remove-orphans
}

print_summary() {
  log "Deploy concluido"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
  printf '\nAcesse: https://%s\n' "$DOMAIN"
  printf 'Arquivo de ambiente: %s\n' "$ENV_FILE"
  printf 'Compose gerado: %s\n' "$COMPOSE_FILE"
}

main() {
  require_root "$@"
  read_settings
  check_project
  install_system_packages
  write_env_file
  write_compose_file
  deploy_containers
  configure_ssl
  configure_firewall
  print_summary
}

main "$@"
