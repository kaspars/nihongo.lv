#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==> Pulling latest changes..."
git pull

echo "==> Installing dependencies..."
npm ci

echo "==> Building..."
npm run build

echo "==> Copying static assets..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "==> Fixing permissions..."
sudo chown -R nihongo:nihongo .next/standalone
sudo chmod -R o+rX .next/standalone/.next/static .next/standalone/public
sudo chmod o+x .next/standalone .next/standalone/.next

echo "==> Restarting service..."
sudo systemctl restart nihongo

echo "==> Done."
