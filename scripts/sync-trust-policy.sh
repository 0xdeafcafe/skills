#!/usr/bin/env bash
# Sync the canonical trust policy to every drive-* skill that reads it.
#
# The six drive-* skills each ship their own copy of references/trust-policy.md
# so that a standalone CLI install of a single skill still has the policy
# locally (the SKILL.md tells Claude to re-read references/trust-policy.md at
# the start of any run that handles PR comments). That self-contained promise
# is at odds with keeping six copies in lockstep, so the canonical lives in
# one skill and this script propagates it to the rest.
#
# Canonical: skills/drive-pr/references/trust-policy.md
# Targets:   the other five drive-* skills
#
# Run this before committing any change to the trust policy.

set -euo pipefail

cd "$(dirname "$0")/.."

CANONICAL="skills/drive-pr/references/trust-policy.md"

if [ ! -f "$CANONICAL" ]; then
  echo "error: canonical trust policy not found at $CANONICAL" >&2
  exit 1
fi

TARGETS=(
  "skills/drive-code/references/trust-policy.md"
  "skills/drive-feature/references/trust-policy.md"
  "skills/drive-test/references/trust-policy.md"
  "skills/drive-security/references/trust-policy.md"
  "skills/drive-ux/references/trust-policy.md"
)

changed=0
for target in "${TARGETS[@]}"; do
  if [ ! -f "$target" ]; then
    echo "warn: target missing, creating: $target" >&2
    mkdir -p "$(dirname "$target")"
  fi
  if ! cmp -s "$CANONICAL" "$target"; then
    cp "$CANONICAL" "$target"
    echo "updated $target"
    changed=$((changed + 1))
  fi
done

if [ "$changed" -eq 0 ]; then
  echo "all five targets already in sync with $CANONICAL"
else
  echo "synced $changed file(s) from $CANONICAL"
  echo
  echo "stage them with: git add ${TARGETS[*]}"
fi
