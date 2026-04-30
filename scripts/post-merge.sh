#!/bin/bash
set -e

on_failure() {
  local exit_code=$?
  echo ""
  echo "=========================================="
  echo "POST-MERGE FAILED (exit code: ${exit_code})"
  echo "The merged changes broke setup. See the log"
  echo "above for the failing step (install, db push,"
  echo "seed, or setup:check)."
  echo "=========================================="
  exit "${exit_code}"
}
trap on_failure ERR

pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
# Idempotent demo-data seed: only inserts into tables that are still empty.
# Ensures a freshly-imported account has demo blog posts, testimonials,
# services, pricing, authors, and site stats without waiting for the
# api-server to start.
pnpm --filter @workspace/scripts run seed:auto

echo ""
echo "=========================================="
echo "Post-merge setup report (pnpm run setup:check)"
echo "=========================================="
pnpm run setup:check
echo "=========================================="
echo "End of post-merge setup report"
echo "=========================================="
