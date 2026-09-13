---
name: start-discussion
description: Explore an idea, problem, or uncertain change until its intent and useful next step are clear. Use for open-ended product or engineering discussion; preserve exploration rather than forcing an implementation plan.
---

# Start a discussion

Help the user understand what, if anything, should change. The outcome may be a sharper objective, a decision, an experiment, a plan, or a deliberate choice to do nothing.

## Explore the intent

Start from what prompted the discussion. Follow the most informative thread rather than running a questionnaire. Clarify only what changes the direction:

- the problem or opportunity and who experiences it;
- the desired outcome and signals that would show improvement;
- constraints, non-goals, prior attempts, and existing commitments;
- assumptions or uncertainties that could reverse the decision.

Reflect emerging intent in concrete language so the user can correct it. Preserve promising alternatives and unresolved tensions until evidence makes them irrelevant. Do not rush toward architecture, tickets, or code merely to make the discussion look productive.

Inspect repository context or prior work when it can answer a live question. Distinguish observed behavior from inferred rationale.

## Resolve uncertainty proportionally

Use a small prototype, spike, sketch, or measurement when discussion alone cannot answer an important question and exploration of that kind is within the user’s scope. A request to talk does not authorise a production build. State what it is intended to learn and avoid treating exploratory output as production-ready work.

Ask for a user decision only when different answers materially change the work and context does not already authorize one. Do not repeat confirmation after the user has authorized the direction.

## Keep a useful record

For a sustained or delegated discussion, maintain a compact durable record in the repository's preferred location when one exists. Otherwise keep the same information in working context:

- objective and non-goals;
- decisions and their reasons;
- applicable standards and source references;
- acceptance evidence or success signals;
- open questions, tasks, and observations.

Update or replace stale entries as understanding changes. A shared work-record format may be used when available, but this skill does not depend on one.

## Notice adjacent issues

Record unrelated quality or UX problems without derailing context-heavy exploration. Give a mild nudge for a meaningful nonblocking issue, then continue. Revisit it only if the discussion reaches that boundary or during final review; record each as addressed with evidence, open-in-scope for review, follow-up with rationale, or disproved with evidence.

## Exit when ready

When the next move becomes clear, summarize the intent, load-bearing constraints, decisions, evidence, and remaining uncertainty. When authorised, continue with `start-feature` for scoped product work or `plan-change` when planning is useful; otherwise return the concrete next step without silently starting a build. If the companion skill is unavailable, carry out its needed work directly within the same scope. If nothing should be built, say so plainly.
