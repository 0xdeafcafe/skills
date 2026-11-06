import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "build-plugin.py"
SPEC = importlib.util.spec_from_file_location("build_plugin", SCRIPT)
assert SPEC and SPEC.loader
BUILD_PLUGIN = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD_PLUGIN)


class BuildPluginTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="skills-plugin-test-")
        self.addCleanup(self.temporary.cleanup)
        self.parent = Path(self.temporary.name)

    def run_build(self, *arguments: str, output_name: str = "plugin") -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--output", str(self.parent / output_name), *arguments],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

    def assert_manifest(self, output_name: str = "plugin") -> None:
        self.assertEqual(
            (self.parent / output_name / "LICENSE").read_bytes(),
            (ROOT / "LICENSE").read_bytes(),
        )
        self.assertTrue((self.parent / output_name / ".claude-plugin" / "plugin.json").is_file())

    def test_exports_one_standalone_skill(self) -> None:
        result = self.run_build("--skill", "write-spec")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_manifest()
        self.assertTrue((self.parent / "plugin" / "skills" / "write-spec" / "SKILL.md").is_file())
        self.assertTrue(
            (self.parent / "plugin" / "skills" / "write-spec" / "references" / "gherkin-reference.md").is_file()
        )
        self.assertFalse((self.parent / "plugin" / "agents").exists())
        manifest = json.loads(
            (self.parent / "plugin" / ".claude-plugin" / "plugin.json").read_text()
        )
        self.assertEqual(manifest["name"], "skills")
        self.assertEqual(
            manifest["description"],
            "Intent-led software work: 1 reusable skill and 0 agents.",
        )

    def test_exports_all_skills_without_agents(self) -> None:
        result = self.run_build("--all", "--skills-only")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_manifest()
        self.assertEqual(
            {path.name for path in (self.parent / "plugin" / "skills").iterdir()},
            {path.name for path in (ROOT / "skills").iterdir() if path.is_dir()},
        )
        self.assertFalse((self.parent / "plugin" / "agents").exists())

    def test_exports_an_agent_with_its_skills_and_shared_references(self) -> None:
        result = self.run_build("--agent", "shaper")

        self.assertEqual(result.returncode, 0, result.stderr)
        output = self.parent / "plugin"
        self.assertTrue((output / "agents" / "shaper.md").is_file())
        self.assertTrue((output / "skills" / "start-discussion" / "SKILL.md").is_file())
        self.assertTrue((output / "skills" / "write-spec" / "SKILL.md").is_file())
        self.assertTrue((output / "references" / "work-record.md").is_file())
        self.assertFalse((output / "agents" / "builder.md").exists())
        manifest = json.loads((output / ".claude-plugin" / "plugin.json").read_text())
        self.assertEqual(manifest["name"], "skills")
        self.assertEqual(
            manifest["description"],
            "Intent-led software work: 10 reusable skills and 1 agent.",
        )

    def test_exports_every_component(self) -> None:
        result = self.run_build("--all")

        self.assertEqual(result.returncode, 0, result.stderr)
        output = self.parent / "plugin"
        self.assert_manifest()
        self.assertEqual(len(list((output / "skills").iterdir())), 28)
        self.assertEqual(len(list((output / "agents").glob("*.md"))), 4)
        self.assertTrue((output / "references" / "work-primitives.md").is_file())

    def test_rejects_unknown_selections_and_existing_outputs(self) -> None:
        unknown = self.run_build("--skill", "does-not-exist", output_name="unknown")
        self.assertNotEqual(unknown.returncode, 0)
        self.assertIn("unknown skill", unknown.stderr)
        self.assertFalse((self.parent / "unknown").exists())

        output = self.parent / "existing"
        output.mkdir()
        marker = output / "keep.txt"
        marker.write_text("keep\n")
        existing = self.run_build("--skill", "write-spec", output_name="existing")
        self.assertNotEqual(existing.returncode, 0)
        self.assertEqual(marker.read_text(), "keep\n")

        nested_output = ROOT / ".build-plugin-test-output"
        nested = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--output",
                str(nested_output),
                "--skill",
                "write-spec",
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(nested.returncode, 0)
        self.assertIn("outside the source checkout", nested.stderr)
        self.assertFalse(nested_output.exists())

    def test_rejects_an_existing_markdown_link_target_outside_the_export(self) -> None:
        result = self.run_build("--skill", "write-spec")
        self.assertEqual(result.returncode, 0, result.stderr)
        output = self.parent / "plugin"
        outside = self.parent / "outside.md"
        outside.write_text("outside\n")
        skill = output / "skills" / "write-spec" / "SKILL.md"
        skill.write_text(f"{skill.read_text()}\n[escape](../../../outside.md)\n")

        with self.assertRaisesRegex(SystemExit, "broken Markdown link"):
            BUILD_PLUGIN.validate_export(output, {"write-spec"}, set())


if __name__ == "__main__":
    unittest.main()
