#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  EduSense — VPS First-Time Setup
#  Run this as root on your fresh Hostinger VPS after choosing
#  "Docker and Traefik" (or any Ubuntu/Debian OS).
#
#  Usage:
#    chmod +x vps_setup.sh && ./vps_setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "=== [1/5] Updating system packages ==="
apt-get update -y && apt-get upgrade -y

echo "=== [2/5] Installing Docker (if not already installed) ==="
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

echo "=== [3/5] Installing Docker Compose plugin ==="
apt-get install -y docker-compose-plugin

echo "=== [4/5] Cloning / uploading your project ==="
# If you're using git:
#   git clone https://github.com/yourusername/edusense.git /root/portal
# OR upload via WinSCP/SFTP to /root/portal and skip this step.

mkdir -p /root/portal

echo "=== [5/5] Done! ==="
echo ""
echo "Next steps:"
echo "  1. Upload your project files to /root/portal/"
echo "     (or git clone your repo there)"
echo ""
echo "  2. Create /root/portal/.env from .env.example:"
echo "     cp /root/portal/.env.example /root/portal/.env"
echo "     nano /root/portal/.env   # fill in DOMAIN, JWT_SECRET, etc."
echo ""
echo "  3. Copy your SQLite database:"
echo "     cp /path/to/emotion_system.db /root/portal/emotion_system/backend/"
echo ""
echo "  4. Build and start everything:"
echo "     cd /root/portal"
echo "     docker compose up -d --build"
echo ""
echo "  5. Check logs:"
echo "     docker compose logs -f"
echo ""
echo "Your site will be live at https://yourdomain.com with auto-SSL!"
