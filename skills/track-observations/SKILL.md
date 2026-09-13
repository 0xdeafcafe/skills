---
name: track-observations
description: Record, triage, and disposition findings noticed during focused work without derailing the active assignment. Use for adjacent defects, risks, opportunities, and review findings that need accountable follow-through.
---

# Track Observations

Keep useful findings from being lost while protecting the reasoning and momentum of the current task.

## Record an observation

Capture observations in the effort’s live work record when authorised to update it, otherwise return compact entries to its owner. Never put project state in a bundled template. Reuse existing observation IDs and merge true duplicates without losing their evidence. Each entry should contain:

```markdown
- ID: OBS-<stable-id>
  Observation: <specific claim>
  Evidence: <path, line, command result, or reproducible behavior>
  Confidence: high | medium | low
  Impact: <effect on current outcome or later work>
  Disposition: open-in-scope | addressed | follow-up | disproved
  Owner/next step: <when useful>
```

Evidence may be incomplete; match confidence to it. Do not promote inference into fact or turn a preference into a defect.

## Protect the active task

Choose the least disruptive response:

- Record silently when the observation is unrelated or low impact.
- Give a mild, brief nudge when it meaningfully affects a nearby decision but does not block current work.
- Interrupt when evidence shows a material blocker, likely harm, invalid acceptance criteria, destructive collision, or security/correctness issue that makes continuing unsound.

Preserve expensive reasoning already in progress. Do not abandon a coherent implementation thread to investigate every adjacent curiosity. A bounded read-only check is reasonable when it determines whether interruption is warranted.

## Revisit and close

Revisit observations at planning boundaries, before final build completion, and during final review. Every recorded observation needs a disposition; every observation does not need a fix.

- `addressed`: verified resolution and evidence.
- `open-in-scope`: still required for the current acceptance criteria; name the owner or blocker.
- `follow-up`: valid but outside current scope; preserve a concrete next step and rationale.
- `disproved`: evidence no longer supports the observation; state why.

Do not mark an item addressed because code changed. Verify the relevant behavior, check, or artifact. Do not use `follow-up` to hide work required by agreed acceptance criteria.

At handoff or final review, route unresolved relevant entries to the reviewer with a concrete question. Track the assessment through disposition; assigning review is not resolution. Report `open-in-scope` items first; counts are optional. Retain enough evidence that a later owner can assess the finding without replaying the whole session.
