---
name: write-spec
description: Write a concrete behavioral specification in the repository's existing format, including observable success, boundaries, and failure cases. Use for Gherkin or other acceptance specs.
---

# Write a behavioral specification

Turn an idea, plan, ADR, issue, or implemented behavior into a reviewable agreement. Preserve the user's intent; a spec defines observable behavior and should not invent product decisions.

## Discover the convention

Read repository instructions and locate specs, feature files, templates, step definitions, and related ADRs or plans. Read representative nearby examples. If no convention exists and Gherkin is appropriate, use [references/gherkin-reference.md](references/gherkin-reference.md) and choose a simple discoverable location, stating the assumption.

Establish actor, goal, value, inputs, boundaries, permissions, observable outputs, side effects, errors, retries, recovery, concurrency, and exclusions as each applies. Ask only about gaps that would materially change the agreement. Draft reasonable assumptions explicitly for review.

## Draft behavior

Write concrete independent scenarios covering the golden path and material negative or boundary cases. Prefer domain language and observable outcomes over routes, selectors, database tables, or internal call sequences unless those are contractual.

For Gherkin:

- keep one coherent feature per file;
- give each scenario its own starting state and a clear action;
- make outcomes specific enough to distinguish success from failure;
- use Background only for state shared by every scenario;
- use Scenario Outline only for true parameter variation;
- reuse established step phrasing and tags where it improves executability.

Link related decisions and plans when local conventions allow. The idea → plan → spec → implementation chain is useful context, not a forced sequence.

Compare the draft with known implementation and existing agreements. Record incidental observations and reconcile each as reflected in the spec, relevant for review, unrelated follow-up, or disproved with evidence. Surface implementation drift without editing code unless asked.

## Write and verify

Write the file in local style. Do not commit unless requested. Run the repository's parser or dry-run when configured; do not assume every runner accepts the same flags. Report the path, scenarios covered, assumptions, verification result, and coverage gaps.
