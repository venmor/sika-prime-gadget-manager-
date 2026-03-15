#!/bin/sh
set -eu

if [ "${AUTO_RUN_MIGRATIONS:-false}" = "true" ]; then
  node scripts/run-migrations.js
fi

if [ "${AUTO_SEED_DEMO_DATA:-false}" = "true" ]; then
  node scripts/seed-demo-data.js
fi

exec node server.js
