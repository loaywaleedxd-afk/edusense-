#!/bin/bash
# EduSense Python GUI — Linux/Mac launcher
echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   EduSense — Python GUI Launcher          ║"
echo "║   Classroom Emotion Detection System      ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[1/2] Installing GUI dependencies..."
pip3 install customtkinter Pillow opencv-python --quiet 2>/dev/null || \
pip3 install customtkinter Pillow opencv-python --break-system-packages --quiet

echo "[2/2] Starting EduSense GUI..."
cd "$SCRIPT_DIR"
python3 gui/app.py
