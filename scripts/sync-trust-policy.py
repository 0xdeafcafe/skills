#!/usr/bin/env python3
"""Check or update packaged copies of the canonical trust policy."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--check",
        action="store_true",
        help="report stale packaged copies without changing them (default)",
    )
    mode.add_argument(
        "--write",
        action="store_true",
        help="replace discovered packaged copies with the canonical policy",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parent.parent
    canonical = root / "references" / "trust-policy.md"
    if not canonical.is_file():
        print(f"canonical policy not found: {canonical}", file=sys.stderr)
        return 2

    packaged = sorted((root / "skills").glob("*/references/trust-policy.md"))
    if not packaged:
        print("no packaged trust-policy.md copies found", file=sys.stderr)
        return 2

    expected = canonical.read_bytes()
    stale = [path for path in packaged if path.read_bytes() != expected]

    if args.write:
        for path in stale:
            path.write_bytes(expected)
            print(f"updated {path.relative_to(root)}")
        print(f"trust policy synchronized: {len(packaged)} packaged copies")
        return 0

    if stale:
        for path in stale:
            print(f"stale {path.relative_to(root)}", file=sys.stderr)
        print("run with --write to synchronize", file=sys.stderr)
        return 1

    print(f"trust policy synchronized: {len(packaged)} packaged copies")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
