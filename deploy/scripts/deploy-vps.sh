#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./deploy/scripts/deploy-vps.sh git@github.com:YOUR_ORG/YOUR_REPO.git main

REPO_URL="${1:-}"
BRANCH="${2:-main}"
APP_USER="${APP_USER:-veloura}"
APP_ROOT="${APP_ROOT:-/opt/veloura-venue}"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
SHARED_DIR="$APP_ROOT/shared"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
NEW_RELEASE="$RELEASES_DIR/$TIMESTAMP"

if [[ -z "$REPO_URL" ]]; then
  echo "Missing REPO_URL argument."
  echo "Example: ./deploy/scripts/deploy-vps.sh git@github.com:org/repo.git main"
  exit 1
fi

echo "==> Preparing directories"
sudo mkdir -p "$RELEASES_DIR" "$SHARED_DIR"
sudo chown -R "$APP_USER:$APP_USER" "$APP_ROOT"

if [[ ! -f "$SHARED_DIR/.env.production" ]]; then
  echo "ERROR: $SHARED_DIR/.env.production is missing."
  echo "Copy deploy/systemd/.env.production.example and set real values first."
  exit 1
fi

echo "==> Cloning release $TIMESTAMP"
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$NEW_RELEASE"
cd "$NEW_RELEASE"

echo "==> Installing dependencies and building release"
npm ci
npm run build:release

echo "==> Linking shared env"
ln -sfn "$SHARED_DIR/.env.production" "$NEW_RELEASE/.env"

echo "==> Switching current symlink"
ln -sfn "$NEW_RELEASE" "$CURRENT_LINK"

echo "==> Reloading systemd unit"
sudo systemctl daemon-reload
sudo systemctl restart veloura-venue
sudo systemctl status veloura-venue --no-pager

echo "==> Cleaning old releases (keep latest 5)"
ls -1dt "$RELEASES_DIR"/* | tail -n +6 | xargs -r rm -rf

echo "Deployment completed."
