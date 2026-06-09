#!/usr/bin/env bash
# Sets up the tiny-token-leak fixture in the directory passed as $1.
# Creates a tiny git repo, commits a baseline `src/config/payment.ts`, then
# applies the diff that introduces the planted smells.

set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "usage: setup.sh <target-dir>" >&2
  exit 1
fi

FIXTURE_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$TARGET"
cd "$TARGET"

git init --quiet --initial-branch=main
git config user.email eval@example.com
git config user.name eval

mkdir -p src/config
# Baseline: clean payment config that reads a key from env.
cat > src/config/payment.ts <<'EOF'
import { config } from "../lib/env";

export const paymentConfig = {
  publishableKey: config.STRIPE_PUBLISHABLE_KEY,
  apiVersion: "2024-11-20.acacia",
};
EOF

mkdir -p src/lib
cat > src/lib/env.ts <<'EOF'
export const config = {
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
};
EOF

git add -A
git commit --quiet -m "baseline"

# Apply the planted-smell diff. This produces the under-review state.
git apply "$FIXTURE_DIR/diff.patch"

echo "fixture set up at $TARGET (branch: main, diff applied to working tree)"
