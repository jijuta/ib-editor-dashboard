#!/bin/bash
# Cron Job Wrapper Script
# Runs incident investigation cron job with proper environment

# Change to project directory
cd "$(dirname "$0")/.." || exit 1

# Load environment variables
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Set default cron config
export CRON_INTERVAL="${CRON_INTERVAL:-60}"
export CRON_LOOKBACK="${CRON_LOOKBACK:-24h}"
export CRON_MAX_INCIDENTS="${CRON_MAX_INCIDENTS:-10}"

# Run cron job
npx tsx script/cron-investigate.ts "$@"
