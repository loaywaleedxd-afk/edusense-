#!/bin/bash
# ─────────────────────────────────────────────────────────
# EduSense — Classroom Emotion Detection System
# Startup script for Linux / macOS
# ─────────────────────────────────────────────────────────

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo ""
echo -e "${CYAN}  ███████╗██████╗ ██╗   ██╗███████╗███████╗███╗   ██╗███████╗███████╗${NC}"
echo -e "${CYAN}  ██╔════╝██╔══██╗██║   ██║██╔════╝██╔════╝████╗  ██║██╔════╝██╔════╝${NC}"
echo -e "${CYAN}  █████╗  ██║  ██║██║   ██║███████╗█████╗  ██╔██╗ ██║███████╗█████╗  ${NC}"
echo -e "${CYAN}  ██╔══╝  ██║  ██║██║   ██║╚════██║██╔══╝  ██║╚██╗██║╚════██║██╔══╝  ${NC}"
echo -e "${CYAN}  ███████╗██████╔╝╚██████╔╝███████║███████╗██║ ╚████║███████║███████╗${NC}"
echo -e "${CYAN}  ╚══════╝╚═════╝  ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝${NC}"
echo ""
echo -e "  ${GREEN}Classroom Emotion Detection and Statistical Analysis System${NC}"
echo -e "  ──────────────────────────────────────────────────────────"
echo ""

# ── Check prerequisites ───────────────────────────────────
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}[ERROR]${NC} '$1' not found. $2"
    exit 1
  fi
  echo -e "${GREEN}[OK]${NC} $1 found"
}

check_optional() {
  if command -v "$1" &>/dev/null; then
    echo -e "${GREEN}[OK]${NC} $1 found"
    return 0
  else
    echo -e "${YELLOW}[WARN]${NC} '$1' not found — $2 will be skipped"
    return 1
  fi
}

echo "Checking prerequisites..."
check_cmd python3    "Install Python 3.10+ from https://python.org"
check_cmd pip3       "Install pip: python3 -m ensurepip --upgrade"
R_AVAILABLE=false
check_optional Rscript "R analysis" && R_AVAILABLE=true
echo ""

# ── Python setup ─────────────────────────────────────────
echo -e "${CYAN}[1/4]${NC} Installing Python dependencies..."
cd "$SCRIPT_DIR/backend"
pip3 install -r requirements.txt -q
echo -e "${GREEN}[OK]${NC} Python packages installed"
echo ""

# ── R setup ──────────────────────────────────────────────
if $R_AVAILABLE; then
  echo -e "${CYAN}[2/4]${NC} Installing R packages..."
  cd "$SCRIPT_DIR/r_analysis"
  Rscript install_packages.R
  echo -e "${GREEN}[OK]${NC} R packages ready"
else
  echo -e "${YELLOW}[2/4]${NC} Skipping R packages (R not installed)"
fi
echo ""

# ── Start Python backend ──────────────────────────────────
echo -e "${CYAN}[3/4]${NC} Starting Python backend on port 8000..."
cd "$SCRIPT_DIR/backend"
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
sleep 2
if kill -0 $BACKEND_PID 2>/dev/null; then
  echo -e "${GREEN}[OK]${NC} Backend running (PID $BACKEND_PID)"
else
  echo -e "${RED}[ERROR]${NC} Backend failed to start. Check errors above."
  exit 1
fi
echo ""

# ── Start R Shiny ─────────────────────────────────────────
if $R_AVAILABLE; then
  echo -e "${CYAN}[4/4]${NC} Starting R Shiny dashboard on port 3001..."
  cd "$SCRIPT_DIR/r_analysis"
  Rscript -e "shiny::runApp('shiny_dashboard.R', port=3001, host='0.0.0.0')" &
  SHINY_PID=$!
  sleep 2
  echo -e "${GREEN}[OK]${NC} Shiny running (PID $SHINY_PID)"
else
  echo -e "${YELLOW}[4/4]${NC} Skipping Shiny (R not available)"
fi
echo ""

# ── Open browser ──────────────────────────────────────────
echo ""
echo -e "══════════════════════════════════════════════"
echo -e "  ${GREEN}✅ EduSense is RUNNING${NC}"
echo -e "══════════════════════════════════════════════"
echo ""
echo -e "  🌐 Main Portal:        ${CYAN}file://$SCRIPT_DIR/frontend/index.html${NC}"
echo -e "  🔗 Python API:         ${CYAN}http://localhost:8000${NC}"
echo -e "  📊 API Docs:           ${CYAN}http://localhost:8000/docs${NC}"
echo -e "  📈 R Shiny Dashboard:  ${CYAN}http://localhost:3001${NC}"
echo ""
echo -e "  Demo Logins:"
echo -e "    Student  → ${GREEN}s001${NC}     / demo123"
echo -e "    Doctor   → ${GREEN}dr.smith${NC} / demo123"
echo -e "    Admin    → ${GREEN}admin${NC}    / demo123"
echo ""

# Open browser automatically
PORTAL="$SCRIPT_DIR/frontend/index.html"
if [[ "$OSTYPE" == "darwin"* ]]; then
  open "$PORTAL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xdg-open "$PORTAL" 2>/dev/null || true
fi

# ── Trap for cleanup ──────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  $R_AVAILABLE && kill $SHINY_PID 2>/dev/null || true
  echo -e "${GREEN}Goodbye!${NC}"
}
trap cleanup INT TERM

echo "Press Ctrl+C to stop all services."
wait
