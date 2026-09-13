---
name: tone-of-voice
description: Write or revise clear, direct prose for a specific audience, channel, and purpose. Use when wording, tone, structure, or consistency matters; use alex-tone-of-voice only when the user explicitly wants Alex's personal voice.
---

# Tone of voice

Make the writing easy for its intended reader to understand and act on. Establish the author, audience, channel, purpose, and desired response before choosing a register.

## Set the register

Use the user's brief, existing text, publication context, and organisation or repository conventions as evidence. Preserve established terminology and intentional voice choices. If the user corrects a tone choice, treat that correction as the strongest local signal for the rest of the task.

Choose formality, warmth, detail, and structure to fit the situation. A private message can rely on shared context; public writing must carry enough context to stand alone. A code review should describe observable behavior and the action needed. A technical document should optimise for accuracy and retrieval.

Do not infer a named person's voice from ownership, account identity, or prior conversation. Authorship authority and writing style are separate. Use `alex-tone-of-voice` only when Alex's voice is explicitly requested or the task clearly asks to draft as Alex.

## Write clearly

- Lead with the point, decision, or requested action.
- Prefer concrete facts and active verbs over abstract claims.
- Give reasons where they help the reader judge or act.
- Use headings and lists only when they improve navigation or comparison.
- Cut throat-clearing, repeated conclusions, empty transitions, and unsupported hype.
- Keep qualifications close to the claim they limit.
- Match spelling, punctuation, terminology, and formatting already established by the relevant source.

Do not impose a fixed paragraph rhythm or manufacture anecdotes, numbers, opinions, intimacy, humour, or certainty. Correct obvious typing errors unless preserving them is materially relevant; do not imitate errors as voice.

## Respect the channel

For messages, make the ask and necessary context visible without turning them into memos. For public posts, make claims specific and support them appropriately. For long-form writing, build a coherent argument and use headings that help the reader. For code review, identify the affected behavior, evidence, severity or impact, and a concrete next action; distinguish blocking findings from optional suggestions and remain respectful.

Neutral documentation, code comments, release notes, and repository records should follow the project's house style. Personal flourishes should not reduce precision or make maintained text depend on knowing the author.

## Revise and deliver

Check the draft against the requested outcome and the source facts. Remove claims the evidence does not support. Preserve meaning while tightening language, and explain any substantive interpretation that the user may need to approve.

For substantial writing, identify the author's intended argument, the reader payoff, and the evidence that earns it. Preserve that argument while improving the piece; do not replace it with the reviewer's favorite finding. If the stated intent and draft materially conflict, surface the choice for clarification. Develop a revealing concrete example enough for the reader to understand what happened and why it matters. Put uncertainty beside any claim it materially changes. Before polishing sentences, read the whole draft for connective logic, momentum, and reader payoff; a complete inventory of facts can still fail to make a persuasive or interesting piece.

Return the draft in the requested format. Do not send, post, publish, or impersonate the author externally unless the user separately authorizes that action.

## Avoid manufactured contrasts

Do not build a paragraph around “X is not the interesting bit. The interesting
bit is Y”, “this is not about X; it is about Y”, or the same pivot in different
words. Alex explicitly identified this framing as sounding AI-generated. State
the substantive point directly. Keep a contrast only when both sides are
relevant and the distinction helps the reader understand the facts.

When writing a file, resolve its destination against the project's verified
working directory. A loaded skill's directory contains instructions and
references; it is not the destination for project drafts.
