#!/bin/sh
set -e

# Make sure the SQLite directory exists (it is normally a mounted volume)
mkdir -p /app/data

# Create or update the database schema. A change that would lose data
# makes this fail on purpose instead of silently dropping columns.
node_modules/.bin/prisma db push --skip-generate

exec "$@"
