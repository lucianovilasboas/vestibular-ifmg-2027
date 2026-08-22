#!/usr/bin/env bash
# Executa uma coleta manual agora (scraper com retry + processa com gate de completude).
# Uso: ./coletar.sh
set -euo pipefail
cd "$(dirname "$0")"

# Escolhe o compose: produção (proxy/Traefik) se a rede existir, senão local (host mode)
if docker network inspect proxy >/dev/null 2>&1; then
  COMPOSE_FILE="docker-compose.yml"
else
  COMPOSE_FILE="docker-compose.local.yml"
fi

docker compose -f "$COMPOSE_FILE" run --rm worker python run_collect.py
