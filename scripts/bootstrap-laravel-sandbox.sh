#!/usr/bin/env bash
# Creates sandbox/ Laravel app, links the path package, adds a demo route.
# Requires: PHP 8.2+ and Composer, OR Docker (composer:2 image).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

composer_cmd() {
  if command -v composer >/dev/null 2>&1; then
    composer "$@"
  elif command -v docker >/dev/null 2>&1; then
    docker run --rm \
      -e COMPOSER_CACHE_DIR=/tmp/composer-cache \
      -v "$ROOT:/app" \
      -w /app \
      composer:2 composer "$@"
  else
    echo "Install Composer (https://getcomposer.org) or Docker, then re-run." >&2
    exit 1
  fi
}

artisan() {
  if command -v php >/dev/null 2>&1; then
    (cd "$ROOT/sandbox" && php artisan "$@")
  elif command -v docker >/dev/null 2>&1; then
    docker run --rm \
      -v "$ROOT:/app" \
      -w /app/sandbox \
      composer:2 php artisan "$@"
  else
    echo "Install PHP 8.2+ or Docker, then re-run." >&2
    exit 1
  fi
}

echo "==> Installing package dependencies (laravel-response-trace)"
composer_cmd install --no-interaction --working-dir=packages/laravel-response-trace

if [[ ! -f sandbox/composer.json ]]; then
  echo "==> Creating Laravel app in sandbox/ (this may take a minute)"
  composer_cmd create-project laravel/laravel sandbox --no-interaction --prefer-dist
fi

echo "==> Linking path package"
composer_cmd --working-dir=sandbox config repositories.response-trace path ../packages/laravel-response-trace
composer_cmd --working-dir=sandbox require "code-to-visualization/laravel-response-trace:@dev" --no-interaction

echo "==> Copying demo resource"
mkdir -p sandbox/app/Http/Resources
cp -f scripts/sandbox-stubs/DemoResource.php sandbox/app/Http/Resources/DemoResource.php

MARKER="response-trace-demo"
ROUTES_FILE="sandbox/routes/web.php"
if ! grep -q "$MARKER" "$ROUTES_FILE" 2>/dev/null; then
  echo "==> Appending demo route to routes/web.php"
  {
    echo ""
    echo "// --- $MARKER ---"
    cat scripts/sandbox-stubs/web-routes-append.php
  } >> "$ROUTES_FILE"
fi

ENV_FILE="sandbox/.env"
if [[ -f "$ENV_FILE" ]] && ! grep -q "RESPONSE_TRACE_ENABLED" "$ENV_FILE"; then
  echo "==> Appending trace env vars to sandbox/.env"
  {
    echo ""
    echo "# --- $MARKER ---"
    echo "RESPONSE_TRACE_ENABLED=true"
    echo "RESPONSE_TRACE_REQUIRE_FLAG=true"
    echo "RESPONSE_TRACE_QUERY_PARAM=debug"
  } >> "$ENV_FILE"
fi

echo "==> Publishing package config (ignore errors if already published)"
artisan vendor:publish --tag=response-trace-config --force || true

echo "==> Clearing config cache"
artisan config:clear || true

echo ""
echo "Done."
echo ""
echo "Laravel Herd (macOS):"
echo "  cd sandbox && herd link response-trace   # any name you like"
echo "  open https://response-trace.test/trace-demo?debug=1"
echo "  (Or add the sandbox/ folder as a site in Herd; docroot is public/)"
echo ""
echo "Without Herd:"
echo "  cd sandbox && php artisan serve"
echo "  open http://127.0.0.1:8000/trace-demo?debug=1"
echo ""
echo "You should see JSON with data and _trace."
