"""Offline scenarios for the bundled read-only Git operation inspector."""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[2] / "skills/integrate-work/scripts/inspect-git-state.py"


class GitStateScenarios(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="skills-git-state-")
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name) / "repo"
        self.repo.mkdir()
        self.env = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
        self.env.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull, GIT_OPTIONAL_LOCKS="0")
        self.git("-c", "init.templateDir=", "init", "-q", "-b", "main")
        self.git("config", "user.name", "Skills Eval")
        self.git("config", "user.email", "eval@example.invalid")
        self.git("config", "commit.gpgSign", "false")
        self.write("owned.txt", "base\n")
        self.write("other.txt", "base\n")
        self.git("add", ".")
        self.git("commit", "-qm", "base")

    def write(self, name, value):
        (self.repo / name).write_text(value)

    def git(self, *args, check=True):
        return subprocess.run(["git", "-C", str(self.repo), *args], env=self.env,
                              capture_output=True, check=check).stdout.decode().strip()

    def inspect(self):
        index = Path(self.git("rev-parse", "--path-format=absolute", "--git-path", "index"))
        before = index.read_bytes()
        head = self.git("rev-parse", "HEAD")
        result = subprocess.run(["python3", str(SCRIPT), "--repo", str(self.repo)],
                                env=self.env, capture_output=True, text=True, check=True)
        self.assertEqual(index.read_bytes(), before, "inspection must not refresh or rewrite the index")
        self.assertEqual(self.git("rev-parse", "HEAD"), head)
        return json.loads(result.stdout)

    def diverge(self):
        self.git("switch", "-qc", "incoming")
        for name in ["owned.txt", "other.txt"]:
            self.write(name, "incoming\n")
        self.git("commit", "-qam", "incoming")
        self.git("switch", "main")
        for name in ["owned.txt", "other.txt"]:
            self.write(name, "current\n")
        self.git("commit", "-qam", "current")

    def test_ordinary_dirty_work_is_a_candidate_without_altering_staging(self):
        self.write("owned.txt", "staged\n")
        self.git("add", "owned.txt")
        self.write("other.txt", "unstaged\n")
        result = self.inspect()
        self.assertEqual(result["operations"], [])
        self.assertEqual(result["branch"], "main")
        self.assertEqual(Path(result["repo"]), self.repo.resolve())
        self.assertTrue(result["ordinary_commit_candidate"])
        self.assertEqual(self.git("show", ":owned.txt"), "staged")
        self.assertEqual((self.repo / "other.txt").read_text(), "unstaged\n")

    def test_merge_remains_active_after_every_conflict_is_staged(self):
        self.diverge()
        self.git("merge", "incoming", check=False)
        original_merge = self.git("rev-parse", "MERGE_HEAD")
        result = self.inspect()
        self.assertEqual(result["operations"], ["merge"])
        self.assertEqual(result["unmerged_paths"], ["other.txt", "owned.txt"])
        self.assertFalse(result["ordinary_commit_candidate"])
        for name in ["owned.txt", "other.txt"]:
            self.write(name, "resolved\n")
            self.git("add", name)
        resolved = self.inspect()
        self.assertEqual(resolved["operations"], ["merge"])
        self.assertEqual(resolved["unmerged_paths"], [])
        self.assertFalse(resolved["ordinary_commit_candidate"])
        self.assertEqual(self.git("rev-parse", "MERGE_HEAD"), original_merge)

    def test_linked_worktree_has_its_own_operation_and_index(self):
        self.diverge()
        main = self.repo
        linked = Path(self.temp.name) / "linked worktree"
        self.git("worktree", "add", "-q", "-b", "linked", str(linked), "main")
        main_index = self.inspect()["index_path"]
        self.repo = linked
        self.git("merge", "incoming", check=False)
        result = self.inspect()
        self.assertEqual(result["operations"], ["merge"])
        self.assertNotEqual(result["index_path"], main_index)
        self.assertEqual(result["branch"], "linked")
        self.repo = main
        self.assertTrue(self.inspect()["ordinary_commit_candidate"])

    def test_unmerged_index_without_merge_metadata_is_not_a_candidate(self):
        self.diverge()
        self.git("merge", "incoming", check=False)
        Path(self.git("rev-parse", "--path-format=absolute", "--git-path", "MERGE_HEAD")).unlink()
        result = self.inspect()
        self.assertEqual(result["operations"], [])
        self.assertEqual(len(result["unmerged_paths"]), 2)
        self.assertFalse(result["ordinary_commit_candidate"])

    def test_rebase_is_not_an_ordinary_commit(self):
        self.diverge()
        self.git("rebase", "incoming", check=False)
        result = self.inspect()
        self.assertIn("rebase", result["operations"])
        self.assertFalse(result["ordinary_commit_candidate"])

    def test_cherry_pick_can_also_have_sequencer_state(self):
        self.diverge()
        self.git("switch", "incoming")
        self.write("other.txt", "second incoming\n")
        self.git("commit", "-qam", "second incoming")
        self.git("switch", "main")
        self.git("cherry-pick", "incoming~2..incoming", check=False)
        result = self.inspect()
        self.assertEqual(result["operations"], ["cherry-pick", "sequencer"])
        self.assertFalse(result["ordinary_commit_candidate"])

    def test_revert_is_not_an_ordinary_commit(self):
        self.write("owned.txt", "first change\n")
        self.git("commit", "-qam", "first change")
        self.write("owned.txt", "second change\n")
        self.git("commit", "-qam", "second change")
        self.git("revert", "--no-edit", "HEAD~1", check=False)
        self.assertIn("revert", self.inspect()["operations"])

    def test_bisect_is_preserved(self):
        self.write("owned.txt", "bad\n")
        self.git("commit", "-qam", "bad")
        self.git("bisect", "start", "HEAD", "HEAD~1")
        result = self.inspect()
        self.assertEqual(result["operations"], ["bisect"])
        self.assertFalse(result["ordinary_commit_candidate"])

    def test_unusual_paths_are_not_split_into_false_conflicts(self):
        name = "a tab\tand newline\n.txt"
        self.write(name, "base\n")
        self.git("add", name)
        self.git("commit", "-qm", "unusual path")
        self.git("switch", "-qc", "incoming")
        self.write(name, "incoming\n")
        self.git("commit", "-qam", "incoming")
        self.git("switch", "main")
        self.write(name, "current\n")
        self.git("commit", "-qam", "current")
        self.git("merge", "incoming", check=False)
        self.assertEqual(self.inspect()["unmerged_paths"], [name])

    def test_alternate_repository_or_index_environment_is_rejected(self):
        for variable in ["GIT_INDEX_FILE", "GIT_DIR", "GIT_WORK_TREE"]:
            with self.subTest(variable=variable):
                result = subprocess.run(["python3", str(SCRIPT), "--repo", str(self.repo)],
                                        env={**self.env, variable: "/unrelated"}, capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(variable, json.loads(result.stderr)["error"])

    def test_non_repository_reports_an_error_instead_of_a_candidate(self):
        result = subprocess.run(["python3", str(SCRIPT), "--repo", self.temp.name],
                                env=self.env, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("error", json.loads(result.stderr))


if __name__ == "__main__":
    unittest.main()
