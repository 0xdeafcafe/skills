---
name: backfill-feature
description: Reconstruct the current intent, behavior, and constraints of an existing feature before changing it. Use when missing or stale documentation makes a planned modification unsafe or needlessly uncertain.
---

# Backfill a feature

Build the smallest trustworthy baseline needed for the intended change. Backfill evidence and rationale; do not invent historical certainty or document the whole subsystem.

## Bound the investigation

Start with the proposed change and identify which existing behavior, interfaces, data, and decisions it could disturb. Read the relevant implementation, tests, history, issues, and repository standards. Trace enough callers and consumers to expose compatibility boundaries.

Separate:

- facts demonstrated by code, tests, or observed behavior;
- rationale supported by records or history;
- plausible inference that still needs validation;
- behavior that appears accidental but is currently depended upon.

Keep the baseline focused on decisions the upcoming work must respect.

## Create evidence where it helps

Add characterization tests when current behavior is important, observable, and insufficiently protected. Use a focused experiment or prototype to answer uncertain runtime or integration questions. Preserve the existing behavior during this phase unless the user has also authorized the actual change.

Choose the artifact that fits the repository and risk: notes in the work record may be enough; a feature description, decision record, behavioral spec, diagram, or tests may be warranted. Follow local formats when present. Cross-link durable artifacts where that improves discovery.

## Record the baseline

Maintain a compact record containing:

- the objective and non-goals of the upcoming change;
- current behavior and evidence;
- known and inferred decisions, clearly labeled;
- applicable standards and references;
- compatibility boundaries and acceptance evidence;
- open questions, tasks, and observations.

Use the repository's preferred work record when available, otherwise keep an equivalent local artifact or working-state summary. Replace claims disproved by later evidence.

## Handle discoveries

Resolve scope-relevant blockers and required standards before declaring the baseline ready. Record unrelated quality or UX issues; briefly flag meaningful nonblocking ones and continue. Revisit them at a relevant boundary or final review, and give each an explicit disposition without assuming every observation must be fixed.

## Hand off

The baseline is sufficient when planning or implementation can distinguish intended compatibility from incidental structure. Summarize what is known, what is inferred, what is protected by tests, and what remains open. Continue with `plan-change` when design work remains, or with implementation when the intended delta and acceptance are already clear. Companion skills are optional; perform the next work directly if needed.
