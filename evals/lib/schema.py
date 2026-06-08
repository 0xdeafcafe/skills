"""
Schema validator for finding-format.

Pure-stdlib JSON Schema Draft 2020-12 validator for the subset we use in
finding-format.schema.json — keeps tier-1 contract tests dependency-free. If
the schema ever grows beyond what this validator handles, swap in `jsonschema`
(pip install jsonschema) and delete the stdlib fallback.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


SCHEMA_PATH = Path(__file__).resolve().parents[2] / "references" / "finding-format.schema.json"


def load_schema() -> dict[str, Any]:
    with SCHEMA_PATH.open() as f:
        return json.load(f)


class ValidationError(Exception):
    def __init__(self, message: str, path: str = "") -> None:
        super().__init__(f"{path}: {message}" if path else message)
        self.path = path
        self.raw_message = message


def validate(finding: dict[str, Any], schema: dict[str, Any] | None = None) -> list[ValidationError]:
    """
    Validate a single finding against the schema. Returns a list of errors;
    empty list means valid. Doesn't raise on the first error so callers can
    surface every problem at once.
    """
    schema = schema or load_schema()
    errors: list[ValidationError] = []

    _validate_object(finding, schema, "", errors)
    return errors


def _validate_object(value: Any, schema: dict[str, Any], path: str, errors: list[ValidationError]) -> None:
    if schema.get("type") == "object":
        if not isinstance(value, dict):
            errors.append(ValidationError(f"expected object, got {type(value).__name__}", path))
            return

        required = schema.get("required", [])
        for key in required:
            if key not in value:
                errors.append(ValidationError(f"missing required property '{key}'", path))

        properties = schema.get("properties", {})
        additional = schema.get("additionalProperties", True)

        for key, val in value.items():
            sub_path = f"{path}.{key}" if path else key
            if key in properties:
                _validate_value(val, properties[key], sub_path, errors)
            elif additional is False:
                errors.append(ValidationError(f"unexpected property '{key}'", path))
        return

    _validate_value(value, schema, path, errors)


def _validate_value(value: Any, schema: dict[str, Any], path: str, errors: list[ValidationError]) -> None:
    if "enum" in schema:
        if value not in schema["enum"]:
            errors.append(ValidationError(f"value {value!r} not in enum {schema['enum']}", path))
        return

    t = schema.get("type")
    if t == "string":
        if not isinstance(value, str):
            errors.append(ValidationError(f"expected string, got {type(value).__name__}", path))
            return
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(ValidationError(f"string shorter than minLength {schema['minLength']}", path))
        if "pattern" in schema:
            if not re.match(schema["pattern"], value):
                errors.append(ValidationError(f"string {value!r} does not match pattern {schema['pattern']!r}", path))
        return

    if t == "integer":
        if not isinstance(value, int) or isinstance(value, bool):
            errors.append(ValidationError(f"expected integer, got {type(value).__name__}", path))
            return
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(ValidationError(f"integer {value} below minimum {schema['minimum']}", path))
        return

    if t == "boolean":
        if not isinstance(value, bool):
            errors.append(ValidationError(f"expected boolean, got {type(value).__name__}", path))
        return

    if t == "array":
        if not isinstance(value, list):
            errors.append(ValidationError(f"expected array, got {type(value).__name__}", path))
            return
        items_schema = schema.get("items")
        if items_schema:
            for i, item in enumerate(value):
                _validate_value(item, items_schema, f"{path}[{i}]", errors)
        return

    if t == "object":
        _validate_object(value, schema, path, errors)
        return


def parse_finding_block(block: str) -> dict[str, Any] | None:
    """
    Parse a finding-format block (the markdown shape reviewers emit) into the
    JSON object shape the merger validates against. Returns None if the block
    doesn't match the expected first-line pattern; raises ValueError if it
    matches but is malformed.

    Block shape:
        [P0] [security] auth/session.ts:147 — refresh tokens stored in localStorage
        why: XSS-readable; one DOM injection exfiltrates every active session.
        fix: replace localStorage.setItem(...) at line 147 with cookieStore.set
        kind: aggregate                                  # optional
        tool: prettier                                   # optional
        files_affected: ["a.ts", "b.ts"]                 # optional, JSON array
        files_affected_count: 8                          # optional, integer
        violations_count: 230                            # optional, integer
        evidence: screenshots/01-empty.png               # optional
    """
    lines = block.strip().splitlines()
    if not lines:
        return None

    head_pattern = re.compile(
        r"^\[(?P<severity>P[0-3])\]\s+"
        r"\[(?P<category>[a-z]+)\]\s+"
        r"(?P<file>[^:\s]+):(?P<line>\d+)\s+"
        r"[—-]\s+(?P<summary>.+?)\s*$"
    )
    match = head_pattern.match(lines[0])
    if not match:
        return None

    out: dict[str, Any] = {
        "severity": match.group("severity"),
        "category": match.group("category"),
        "file": match.group("file"),
        "line": int(match.group("line")),
        "summary": match.group("summary").strip(),
    }

    # The remaining lines are key: value pairs. Some values are JSON-encoded
    # (arrays); some are plain strings; some are integers. The reviewer prompts
    # are explicit about which keys appear, so we don't accept arbitrary keys
    # silently — anything unrecognized is an error so reviewer drift is loud.
    known_string_keys = {"why", "fix", "tool", "evidence", "kind"}
    known_int_keys = {"files_affected_count", "violations_count"}
    known_array_keys = {"files_affected", "originating_reviewers"}

    for raw in lines[1:]:
        line = raw.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        if key in known_string_keys:
            out[key] = value
        elif key in known_int_keys:
            out[key] = int(value)
        elif key in known_array_keys:
            out[key] = json.loads(value)
        else:
            raise ValueError(f"unknown finding field: {key!r}")

    return out


if __name__ == "__main__":
    # Smoke test — run as a script for a quick sanity check.
    import sys

    schema = load_schema()
    print(f"loaded schema from {SCHEMA_PATH}")
    print(f"required fields: {schema['required']}")
    print(f"severities: {schema['properties']['severity']['enum']}")

    sample = {
        "severity": "P0",
        "category": "security",
        "file": "auth/session.ts",
        "line": 147,
        "summary": "refresh tokens stored in localStorage",
        "why": "XSS-readable; one DOM injection exfiltrates every active session.",
        "fix": "replace localStorage.setItem(...) at line 147 with cookieStore.set",
    }
    errors = validate(sample)
    if errors:
        print(f"sample failed validation: {errors}")
        sys.exit(1)
    print("sample finding validates")

    bad = {**sample, "severity": "P9"}
    errors = validate(bad)
    if not errors:
        print("BUG: invalid severity passed validation")
        sys.exit(1)
    print(f"invalid finding rejected (expected): {errors[0]}")
