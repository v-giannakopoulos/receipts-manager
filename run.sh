#!/bin/bash

cd "$(dirname "$0")"

echo "=========================================="
echo "Receipt & Warranty Manager (standalone)"
echo "=========================================="
echo ""

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

# 1) python3
if ! need_cmd python3; then
  echo "Error: python3 is not installed or not in PATH."
  read -p "Press Enter to exit..."
  exit 1
fi

echo -n "Python 3 found: "
python3 --version || true
echo ""

echo "Starting built-in HTTP server on http://127.0.0.1:5000 ..."
echo "Press Ctrl+C in this terminal to stop."
echo ""

# Activate venv if it exists
if [ -f "venv/bin/activate" ]; then
  source venv/bin/activate
fi

# Run with venv python if available, otherwise python3
python3 app.py
status=$?

if [ $status -ne 0 ]; then
  echo ""
  echo "Application exited with error (status $status)."
  read -p "Press Enter to exit..."
fi