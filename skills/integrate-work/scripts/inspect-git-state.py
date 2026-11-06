#!/usr/bin/env python3
"""Report integration-relevant Git state without changing the worktree or index."""

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys


def inspect(repo):
    env = {**os.environ, "GIT_OPTIONAL_LOCKS": "0"}
    if env.get("GIT_INDEX_FILE") or env.get("GIT_DIR") or env.get("GIT_WORK_TREE"):
        raise ValueError("unset GIT_INDEX_FILE, GIT_DIR and GIT_WORK_TREE to inspect the named worktree")

    def git(*args, optional=False):
        result = subprocess.run(
            ["git", "-C", str(repo), *args], env=env, capture_output=True
        )
        if result.returncode and not optional:
            raise ValueError(result.stderr.decode("utf-8", "replace").strip())
        return result.stdout if result.returncode == 0 else b""

    root = Path(os.fsdecode(git("rev-parse", "--show-toplevel").rstrip(b"\n")))

    def git_path(name):
        raw = os.fsdecode(git("rev-parse", "--path-format=absolute", "--git-path", name).rstrip(b"\n"))
        return Path(raw)

    markers = {
        "merge": ("MERGE_HEAD",),
        "rebase": ("rebase-merge", "rebase-apply"),
        "cherry-pick": ("CHERRY_PICK_HEAD",),
        "revert": ("REVERT_HEAD",),
        "bisect": ("BISECT_START",),
        "sequencer": ("sequencer",),
    }
    operations = [
        operation for operation, names in markers.items()
        if any(git_path(name).exists() for name in names)
    ]
    unmerged = sorted({
        os.fsdecode(entry.split(b"\t", 1)[1])
        for entry in git("ls-files", "--unmerged", "-z").split(b"\0") if entry
    })
    head = git("rev-parse", "--verify", "HEAD", optional=True).decode().strip() or None
    branch = git("symbolic-ref", "--quiet", "--short", "HEAD", optional=True).decode().strip() or None
    return {
        "repo": str(root),
        "head": head,
        "branch": branch,
        "operations": operations,
        "unmerged_paths": unmerged,
        "index_path": str(git_path("index")),
        "git_dir": os.fsdecode(git("rev-parse", "--absolute-git-dir").rstrip(b"\n")),
        "ordinary_commit_candidate": bool(head) and not operations and not unmerged,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".", type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(inspect(args.repo), indent=2))
    except (OSError, ValueError) as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
