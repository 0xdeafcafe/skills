---
name: implement-change
description: Implement a prepared change from its intent, decisions, standards, and acceptance evidence. Use when enough context exists to build, whether that context is conversational or captured in a plan, ADR, spec, issue, or work record.
---

# Implement a change

Translate the current contract into working code and evidence. No particular artifact is mandatory; the implementation must remain traceable to intent and applicable standards.

## Recover the contract

Read the user request and relevant repository sources. Extract:

- objective and non-goals;
- decided behavior and architectural constraints;
- applicable repository and domain standards;
- acceptance evidence, edge cases, and compatibility expectations;
- open questions that could materially change the build.

Sources may include a work record, plan, ADR, behavioral spec, issue, prototype results, tests, or conversation. Resolve conflicts by checking recency and authority; do not silently choose whichever source is easiest to implement.

If essential intent is missing, do the smallest useful investigation or ask for the material decision. Do not demand a spec or ADR solely because none exists.

## Map and build

Inspect the affected code, callers, tests, and local conventions. Form a file or interface-level implementation approach proportional to the change. Share it when it exposes a consequential interpretation; routine implementation details do not need another approval after the user authorized the work.

Read each changed code unit as a whole before finalizing it, not only the edited hunks. Make the unit a coherent, clean functional design for its purpose, with clear names, direct control flow, and spacing that exposes structure. Comments should explain non-obvious intent, constraints, or tradeoffs rather than narrate the code. Use the design that fits the problem and local conventions; do not add patterns or abstractions merely to satisfy a style ideal.

Implement coherent slices and validate each risky boundary as it lands. Keep production behavior, tests, documentation, migrations, and observability aligned where relevant. Treat prototypes as evidence; harden or replace them before including them in the final build.

For sustained work, maintain the repository's preferred work record or an equivalent concise state with objective, non-goals, decisions, standards references, acceptance evidence, open questions, tasks, and observations. Update decisions and tasks when implementation reveals new facts.

Agents may handle bounded independent slices when the host supports them. Provide minimal relevant context, explicit ownership, expected evidence, and a stop condition. Do not require agents, prescribe models, or delegate integration-sensitive contracts without coordination.

## Handle findings

Fix scope-relevant defects and required-standard violations discovered during implementation. Record unrelated UX, quality, or maintenance issues; briefly flag meaningful nonblocking observations and continue. Revisit them when touching their boundary or during final review, then mark a disposition rather than assuming every observation needs a fix.

## Validate and hand off

Run the focused checks that demonstrate acceptance and the repository checks appropriate to the touched surface. Passing tests are necessary evidence where applicable, but they do not establish design quality, clarity, or complete behavior by themselves. Re-read the resulting units and inspect their behavior as part of validation. Manual evidence is valid where automation is impractical, but identify it clearly. Do not claim completion while a scope-relevant blocker, failed acceptance case, or required standard remains unresolved.

Report the implemented behavior, decisions interpreted or changed, validation evidence, touched surface, observations, and any remaining question. If broader integration review is authorized, continue with `drive-change` or `drive-plan`; if companion skills are unavailable, perform or describe the same handoff directly.

Do not weaken an applicable standard, redefine acceptance, or mark a decision accepted merely to make the work pass. Record a proposed change to the agreement and resolve it through the appropriate owner; existing user authorisation still governs.

Prefer an available LangWatch plugin and CLI for targeted trace checks when
repeated failures, unexpected latency, context pressure, or handoff rework leave
a question that could change the next action. Use `assess-usage` when available;
otherwise use the installed LangWatch guidance and bounded read-only queries.
If missing, suggest setup once per effort and continue the task. Preserve any
prior decline or deferral, and leave installation/sign-in/capture changes to
user authorisation. Never make telemetry availability a completion requirement.
