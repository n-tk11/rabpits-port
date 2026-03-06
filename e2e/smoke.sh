#!/usr/bin/env bash
set -e

echo "=== Smoke Test: app loads on localhost:3000 ==="

agent-browser open http://localhost:3000
agent-browser wait --load networkidle

# Assert no uncaught JS errors
ERRORS=$(agent-browser errors)
if [ -n "$ERRORS" ]; then
  echo "FAIL: Uncaught JS errors found:"
  echo "$ERRORS"
  agent-browser close
  exit 1
fi

mkdir -p e2e/screenshots
agent-browser screenshot e2e/screenshots/smoke.png
agent-browser close

echo "=== Smoke test PASSED ==="
