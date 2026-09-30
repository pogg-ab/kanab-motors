#!/usr/bin/env bash
# ========================================================
# KANAB Motors - Hostinger VPS Deployment Script
# Target: Ubuntu 25.04 (IP: 69.62.109.18)
# ========================================================

set -e

echo "========================================================"
echo "  Deploying KANAB Motors on Hostinger VPS"
echo "========================================================"

# 1. Check or install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "[1/5] Installing Docker on Ubuntu..."
    apt-get update
    apt-get install -y curl ca-certificates
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
else
    echo "[1/5] Docker is already installed: $(docker --version)"
fi

# Ensure docker compose plugin is available
if ! docker compose version &> /dev/null; then
    echo "Installing docker-compose-plugin..."
    apt-get install -y docker-compose-plugin
fi

# 2. Setup application directory
APP_DIR="/opt/kanab-motors"
echo "[2/5] Setting up directory in ${APP_DIR}..."
mkdir -p ${APP_DIR}
cd ${APP_DIR}

# 3. Prompt for Docker Hub username if .env doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env configuration file..."
    read -p "Enter your Docker Hub username: " DOCKER_USER
    read -p "Enter a secure DB password [default: KanabSecure2026!]: " DB_PASS
    DB_PASS=${DB_PASS:-KanabSecure2026!}
    JWT_KEY=$(openssl rand -hex 32 2>/dev/null || echo "kanab_motors_jwt_secret_key_prod_2026_x99")

    cat <<EOF > .env
DOCKER_IMAGE_BACKEND=${DOCKER_USER}/kanab-backend:latest
DOCKER_IMAGE_FRONTEND=${DOCKER_USER}/kanab-frontend:latest
DB_USER=kanab_admin
DB_PASSWORD=${DB_PASS}
DB_NAME=kanab_motors
JWT_SECRET=${JWT_KEY}
JWT_EXPIRATION=86400s
EOF
    echo ".env created successfully."
fi

# 4. Pull latest Docker images
echo "[3/5] Pulling latest images from Docker Hub..."
docker compose -f docker-compose.prod.yml pull || true

# 5. Launch containers
echo "[4/5] Launching containers with Docker Compose..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 6. Verify service health
echo "[5/5] Verifying services..."
sleep 5
docker compose -f docker-compose.prod.yml ps

echo "========================================================"
echo "  KANAB Motors successfully deployed!"
echo "  Access the ERP Web Application at: http://69.62.109.18"
echo "  API endpoint at:                   http://69.62.109.18/api"
echo "========================================================"
