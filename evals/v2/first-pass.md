# First-pass evaluation: 11 September 2026

Draft: `feat/intent-led-workflow-v2`, plugin `2.0.0-alpha.1`.
Three Sol agents wrote disjoint parts; the coordinator integrated them. Three
fresh Sol agents then exercised bounded scenarios without the assessment rubric
or prior conclusions. Reasoning effort was inherited, not independently pinned.
The scenarios used different instruction snapshots during integration; hashes
below identify the files actually read, not a claim that every final file was
executed after every wording change.

## Observed behaviour

| Exercise | Observed result | Limits |
| --- | --- | --- |
| Required recovery behaviour despite green tests | Reviewer flagged clearing the entered URL as a blocker, reclassified OBS-1 from optional to open-in-scope, retained unrelated footer work as follow-up, and verified the missing-message observation addressed. | Supplied code and test assertions; no full application or browser. |
| Stale handoff and nonportable merge | Agent inspected actual history/status and operation metadata, identified no live merge, switched safely to the existing descendant branch, changed only connection.py, preserved the user's dirty README, and passed a runtime assertion and diff check. | Synthetic temporary Git repository; no cross-machine transport was performed. |
| Focused timeout assignment | Builder changed connection.py only, retained the URL, enabled retry, left login and theme untouched, and returned the copy observation for integration review. Coordinator selected compatibility/copy review as the next action. | Result model only; no real retry transport. The new status value was an explicit assumption requiring compatibility review. |
| LangWatch previously deferred | Coordinator continued with source/test evidence and did not suggest setup again. | Response exercise with supplied availability facts; no model-generated code was executed. |
| LangWatch result belongs to another session | Coordinator rejected attribution from the wrong branch/time/session, recorded missing coverage, and chose local handoff evidence rather than repeating the lookup. | Simulated query result; no live telemetry calls. |
| LangWatch absent at effort start | Coordinator suggested the missing plugin and CLI, recorded the suggestion, and continued preparing the feature without installation or authentication. | Response exercise; no real installation or discovery across hosts. |

The timeout fixture had no pytest installation. Its focused assertion, existing
success test invoked directly, Python compilation, and diff check passed. The
failed runner invocations were reported, not counted as test successes. Generated
`__pycache__` remained in that temporary fixture and was reported as untracked;
no fixture artifacts entered this repository.

## Corrections made during integration

- Separated the bundled work-record contract from each effort's live record.
- Aligned observation dispositions and required unresolved entries to reach review.
- Made read-only reviewers return record updates rather than edit project files.
- Preserved existing authority without letting PR feedback or setup suggestions
  grant new authority to send messages, merge, or enable telemetry.
- Corrected the pre-existing tone-of-voice YAML description, which failed the
  native plugin validator because it contained an unquoted colon.
- Added the LangWatch preference and bounded in-session query guidance after
  the user's follow-up; retained deferrals across handoffs.

## Structural and regression checks

- Claude Code 2.1.223 validated the plugin and marketplace manifests.
- All 25 skills passed skill-creator `quick_validate.py` using an ephemeral
  `uv --with pyyaml` environment; no project dependency was added for it.
- Four agent frontmatters, skill catalogue coverage, and active Markdown links
  were checked separately.
- Legacy helper suite: 99 tests across 10 files passed; TypeScript checking
  passed; one legacy contract fixture passed.
- `git diff --check` passed.

The legacy passes establish parser/helper continuity after moving their old
contracts. They do not validate the new workflow. Native session startup with
this installed plugin, all 25 skills in live tasks, preparation/exploration
behaviour, actual LangWatch queries by the new roles, and measured usage savings
remain untested. The earlier design research did read personal traces; these
forward-tests did not query private data.

## Instruction snapshots

SHA-256 values recorded by independent evaluators. Source paths are relative to
this repository. Later additions to a file can change its current hash.

```text
Standards and resume:
d79f9e9d518ecadef3e10eac018a0f1a04b90e1957767d2694e267b34f8b2deb  agents/reviewer.md
295a65e65a438bdfe8b22c926ceba4ea908fd1fac3ae4ad848eb5ead48fdf879  skills/review-change/SKILL.md
5fddf385a6ef045e22cc5018a183d119ec86403c94c2c70d6f6ea14b2b9e306f  skills/resume-work/SKILL.md

Focus:
b6c464724d6c29656c9b5d0bccb31740a05237abe24be607ad30fb14e222f8de  agents/builder.md
f3e88ed80e0aaccacc76c2fb05f03d50f4ccad1bb9ae7b011db6c764507d3637  agents/coordinator.md
ad2d37b0ec64ee979d656efacbba5422abf6f48f4fb2de113eaf9c51d987631d  skills/implement-change/SKILL.md
b5781a093471559714bb7864c343d128709ecb83d7226af1a10b6f6bc66a13db  skills/track-observations/SKILL.md
4dbc822932d21bc56441dbda6e5ea6daf5af8ef4e299962d2e9d20504bf447d9  skills/handoff/SKILL.md
4cc5e2c46dcb297ceaf51b6508ce215c03fc1ff00d53fc454f58494481b386d8  skills/review-change/SKILL.md

LangWatch:
5174f7670d6ba1b07ae261603e454448d7464700300b761b7d2459536a9d996b  agents/coordinator.md
d8a08924e415a0a048722b9b9006d7764d70b043782a909a8c9221c55a3dff86  skills/assess-usage/SKILL.md
c1806f18356d0960310ace1e288ce1f568f2d96fa2925a40e9e1465014f4c31b  skills/assess-usage/references/langwatch.md
```
