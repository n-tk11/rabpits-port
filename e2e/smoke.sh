#!/usr/bin/env bash
set -e

echo "=== Smoke Test: app loads on localhost:3000 ==="

npx agent-browser open http://localhost:3000
npx agent-browser wait --load networkidle

# Assert no uncaught JS errors
ERRORS=$(npx agent-browser errors)
if [ -n "$ERRORS" ]; then
  echo "FAIL: Uncaught JS errors found:"
  echo "$ERRORS"
  npx agent-browser close
  exit 1
fi

mkdir -p e2e/screenshots
npx agent-browser screenshot e2e/screenshots/smoke.png
npx agent-browser close

echo "=== Smoke test PASSED ==="
