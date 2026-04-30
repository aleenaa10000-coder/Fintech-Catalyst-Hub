#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
# Idempotent demo-data seed: only inserts into tables that are still empty.
# Ensures a freshly-imported account has demo blog posts, testimonials,
# services, pricing, authors, and site stats without waiting for the
# api-server to start.
pnpm --filter @workspace/scripts run seed:auto
