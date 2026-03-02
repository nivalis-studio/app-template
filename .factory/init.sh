#!/bin/bash
set -e

# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter=@nivalis/web exec prisma generate --no-hints 2>/dev/null || true

# Ensure .env exists
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "Created .env from .env.example — fill in your API keys"
  fi
fi
