#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "Buddy Shield: Runtime License Boundary Audit"
echo "=========================================="

DIST_CHROME="apps/buddy-shield/.output/chrome-mv3"
DIST_FIREFOX="apps/buddy-shield/.output/firefox-mv3"

if [ ! -d "$DIST_CHROME" ]; then
  echo "Error: $DIST_CHROME directory not found. Run 'pnpm --filter buddy-shield run build:chrome' first."
  exit 1
fi

echo "Inspecting Chrome MV3 bundle artifacts..."
if grep -r -i -E "(General Public License|GPLv|GPL-2|GPL-3|AGPL)" "$DIST_CHROME"/*.js "$DIST_CHROME"/chunks/*.js "$DIST_CHROME"/content-scripts/*.js 2>/dev/null; then
  echo "CRITICAL LEGAL VIOLATION: GPL code detected in Chrome runtime bundle!"
  exit 1
fi

echo "Chrome MV3 bundle: Clean (0 GPL references detected)."

if [ -d "$DIST_FIREFOX" ]; then
  echo "Inspecting Firefox MV3 bundle artifacts..."
  if grep -r -i -E "(General Public License|GPLv|GPL-2|GPL-3|AGPL)" "$DIST_FIREFOX"/*.js "$DIST_FIREFOX"/chunks/*.js "$DIST_FIREFOX"/content-scripts/*.js 2>/dev/null; then
    echo "CRITICAL LEGAL VIOLATION: GPL code detected in Firefox runtime bundle!"
    exit 1
  fi
  echo "Firefox MV3 bundle: Clean (0 GPL references detected)."
fi

echo "=========================================="
echo "PASSED: Zero GPL Runtime Contamination."
echo "=========================================="
exit 0
