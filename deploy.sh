#!/bin/bash
# EduSense — one-command VPS deployment (IP mode, no domain required)
# Usage: bash deploy.sh
set -e

REPO="https://github.com/loaywaleedxd-afk/edusense-.git"
INSTALL_DIR="/opt/edusense"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${GREEN}=== EduSense Deployment ===${NC}"

# ── 1. Install Docker if missing ─────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo -e "${YELLOW}Installing Docker...${NC}"
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo -e "${GREEN}✓ Docker already installed${NC}"
fi

# ── 2. Clone / update repo ───────────────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  echo -e "${YELLOW}Updating existing installation...${NC}"
  git -C "$INSTALL_DIR" pull
else
  echo -e "${YELLOW}Cloning repository...${NC}"
  git clone "$REPO" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"

# ── 3. Create .env if missing ────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo -e "${YELLOW}Generating .env file...${NC}"
  JWT=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
  cat > .env <<EOF
POSTGRES_DB=edusense
POSTGRES_USER=edusense
POSTGRES_PASSWORD=EduSense$(openssl rand -hex 6)!
JWT_SECRET=$JWT
ALLOWED_ORIGINS=*
SMTP_USER=
SMTP_PASS=
EOF
  echo -e "${GREEN}✓ .env created with auto-generated secrets${NC}"
else
  echo -e "${GREEN}✓ .env already exists${NC}"
fi

# ── 4. Stop old containers if any ────────────────────────────────────────────
docker compose -f docker-compose.ip.yml down 2>/dev/null || true

# ── 5. Build and start ───────────────────────────────────────────────────────
echo -e "${YELLOW}Building and starting containers...${NC}"
docker compose -f docker-compose.ip.yml up -d --build

# ── 6. Wait for DB to be healthy ─────────────────────────────────────────────
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
for i in {1..30}; do
  if docker compose -f docker-compose.ip.yml exec -T db pg_isready -U edusense &>/dev/null; then
    echo -e "${GREEN}✓ Database is ready${NC}"
    break
  fi
  sleep 2
done

# ── 7. Show status ───────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
docker compose -f docker-compose.ip.yml ps
echo ""

# Get public IP
IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-vps-ip")
echo -e "${GREEN}🚀 EduSense is running at: http://${IP}${NC}"
echo ""
echo "Useful commands:"
echo "  docker compose -f docker-compose.ip.yml logs -f backend   # backend logs"
echo "  docker compose -f docker-compose.ip.yml logs -f db        # DB logs"
echo "  docker compose -f docker-compose.ip.yml restart backend   # restart backend"
