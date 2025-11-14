#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Building backend..."
cd backend
npm install
npm run build
docker build -t minha-registry/nfe-api:latest .
docker push minha-registry/nfe-api:latest

echo "Building frontend..."
cd "$ROOT/frontend"
npm install
npm run build
docker build -t minha-registry/nfe-frontend:latest .
docker push minha-registry/nfe-frontend:latest

echo "Redeploying stack"
cd "$ROOT"
docker stack deploy -c stack-nfe.yml nfe
