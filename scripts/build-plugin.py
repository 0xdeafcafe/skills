#!/usr/bin/env python3
"""Build a self-contained local Claude plugin from selected skills and agents."""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SKILLS = ROOT / "skills"
AGENTS = ROOT / "agents"
MARKDOWN_LINK = re.compile(r"(?<!!)\[[^]]*\]\(([^)]+)\)")

AGENT_SKILLS = {
    "builder": {
        "assess-usage",
        "drive-change",
        "handoff",
        "implement-change",
        "resume-work",
        "review-hygiene",
        "track-observations",
    },
    "shaper": {
        "assess-usage",
        "backfill-feature",
        "handoff",
        "plan-change",
        "review-spec",
        "start-discussion",
        "start-feature",
        "track-observations",
        "write-adr",
        "write-spec",
    },
    "reviewer": {
        "assess-usage",
        "drive-change",
        "drive-pr",
        "review-change",
        "review-code",
        "review-feature",
        "review-hygiene",
        "review-pr",
        "review-security",
        "review-spec",
        "review-test",
        "review-ux",
        "track-observations",
    },
}


def available(directory: Path, suffix: str = "") -> set[str]:
    return {
        path.name.removesuffix(suffix)
        for path in directory.iterdir()
        if (path.is_dir() if not suffix else path.is_file()) and path.name.endswith(suffix)
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--skill", action="append", default=[], metavar="NAME")
    parser.add_argument("--agent", action="append", default=[], metavar="NAME")
    parser.add_argument("--all", action="store_true", help="export every skill and agent")
    parser.add_argument(
        "--skills-only",
        action="store_true",
        help="with --all, omit agents; otherwise reject selected agents",
    )
    return parser.parse_args()


def fail(message: str) -> None:
    raise SystemExit(f"build-plugin: {message}")


def validate_output(output: Path) -> Path:
    resolved = output.expanduser().resolve()
    if resolved == ROOT or ROOT in resolved.parents:
        fail("output must be outside the source checkout")
    if resolved.exists():
        fail("output already exists; refusing to overwrite it")
    return resolved


def selections(args: argparse.Namespace) -> tuple[set[str], set[str]]:
    skill_names = available(SKILLS)
    agent_names = available(AGENTS, ".md")
    requested_skills = set(args.skill)
    requested_agents = set(args.agent)

    if args.all and (requested_skills or requested_agents):
        fail("--all cannot be combined with --skill or --agent")
    if args.skills_only and requested_agents:
        fail("--skills-only cannot be combined with --agent")
    if not args.all and not requested_skills and not requested_agents:
        fail("select at least one --skill or --agent, or use --all")

    unknown_skills = requested_skills - skill_names
    unknown_agents = requested_agents - agent_names
    if unknown_skills:
        fail(f"unknown skill: {', '.join(sorted(unknown_skills))}")
    if unknown_agents:
        fail(f"unknown agent: {', '.join(sorted(unknown_agents))}")

    if args.all:
        return skill_names, set() if args.skills_only else agent_names

    selected_skills = requested_skills.copy()
    for agent in requested_agents:
        selected_skills.update(AGENT_SKILLS.get(agent, skill_names))
    return selected_skills, requested_agents


def copied_files(source: Path, destination: Path) -> set[Path]:
    return {
        destination / path.relative_to(source)
        for path in source.rglob("*")
        if path.is_file()
    }


def validate_export(output: Path, skill_names: set[str], agent_names: set[str]) -> None:
    expected = {output / ".claude-plugin" / "plugin.json", output / "LICENSE"}
    for name in skill_names:
        expected.update(copied_files(SKILLS / name, output / "skills" / name))
    if agent_names:
        expected.update(output / "agents" / f"{name}.md" for name in agent_names)
        expected.update(copied_files(ROOT / "references", output / "references"))

    actual = {path for path in output.rglob("*") if path.is_file()}
    if actual != expected:
        missing = sorted(str(path.relative_to(output)) for path in expected - actual)
        extra = sorted(str(path.relative_to(output)) for path in actual - expected)
        fail(f"export file mismatch (missing={missing}, extra={extra})")

    for markdown in sorted(actual):
        if markdown.suffix != ".md":
            continue
        for target in MARKDOWN_LINK.findall(markdown.read_text()):
            path = target.split("#", 1)[0]
            if not path or "://" in path or path.startswith("mailto:"):
                continue
            resolved = (markdown.parent / path).resolve()
            if not resolved.is_relative_to(output) or not resolved.exists():
                relative = markdown.relative_to(output)
                fail(f"broken Markdown link in {relative}: {target}")


def write_manifest(output: Path, skill_names: set[str], agent_names: set[str]) -> None:
    source = ROOT / ".claude-plugin" / "plugin.json"
    manifest = json.loads(source.read_text())
    skill_label = "skill" if len(skill_names) == 1 else "skills"
    agent_label = "agent" if len(agent_names) == 1 else "agents"
    manifest["description"] = (
        f"Intent-led software work: {len(skill_names)} reusable {skill_label} and "
        f"{len(agent_names)} {agent_label}."
    )
    target = output / ".claude-plugin" / "plugin.json"
    target.write_text(f"{json.dumps(manifest, indent=2)}\n")


def build(output: Path, skill_names: set[str], agent_names: set[str]) -> None:
    output.mkdir(parents=True)
    try:
        shutil.copy2(ROOT / "LICENSE", output / "LICENSE")
        manifest = output / ".claude-plugin"
        manifest.mkdir()
        write_manifest(output, skill_names, agent_names)

        for name in sorted(skill_names):
            shutil.copytree(SKILLS / name, output / "skills" / name)

        if agent_names:
            (output / "agents").mkdir()
            for name in sorted(agent_names):
                shutil.copy2(AGENTS / f"{name}.md", output / "agents" / f"{name}.md")
            shutil.copytree(ROOT / "references", output / "references")
        validate_export(output, skill_names, agent_names)
    except BaseException:
        shutil.rmtree(output, ignore_errors=True)
        raise


def main() -> None:
    args = parse_args()
    output = validate_output(args.output)
    skill_names, agent_names = selections(args)
    build(output, skill_names, agent_names)
    print(
        f"Built {output} with {len(skill_names)} skill(s) and "
        f"{len(agent_names)} agent(s)."
    )


if __name__ == "__main__":
    try:
        main()
    except (OSError, shutil.Error) as error:
        print(f"build-plugin: {error}", file=sys.stderr)
        raise SystemExit(1) from error
