---
name: tone-of-voice
description: Write prose that reads like a person wrote it, not an LLM. Use for any text a human will read - PR titles and bodies, commit messages, release notes, Slack messages, emails, docs, posts, review comments - and for Claude's own replies once loaded. Triggers on "write this up", "draft a message", "polish this", "make this less AI-sounding", "tighten this", "/tone-of-voice". For drafting as Alex Forbes-Reed specifically, use alex-tone-of-voice instead.
---

# Tone of voice

Write like someone who knows the subject, respects the reader's time, and has
something to say. The fastest way to lose a reader is to sound generated, so
most of this skill is the list of things that make text sound generated.

This covers anything a person will read, including your own replies in the
session. It doesn't cover reasoning, code comments (follow the repo), or text
in someone else's established voice (keep theirs).

## Before you write

Know who's reading, where, and what you want them to do afterwards. A Slack
message to a teammate, a public post and a blocking review comment are
different jobs. If you don't know the reader or the ask, find out first.

Only use facts you were given or can check. No invented numbers, dates,
anecdotes, quotes, opinions or "we've seen teams..." claims. If the draft
needs one, ask for it or leave a visible gap.

## Cut on sight

**Em dashes (`—`).** The loudest tell there is. Use a spaced hyphen
(` - `), a comma, parentheses, or two sentences.

**Stock LLM vocabulary.** `delve`, `leverage` (verb), `utilise`, `robust`,
`seamless(ly)`, `unlock`, `harness` (verb), `elevate`, `empower`,
`streamline`, `game-changer`, `groundbreaking`, `cutting-edge`,
`superpower`, `tapestry`, `landscape`, `paradigm`, `synergy`, `journey`,
`deep dive`, `key takeaway`, `in essence`, `at the end of the day`. There's
almost always a plain word that says it better: "use", "solid", "fast",
"lets you".

**Stock constructions.**

- "It's not just X, it's Y", "This isn't about X. It's about Y", "X isn't the
  interesting part. Y is." Say Y. Keep a contrast only when the reader
  actually believed X.
- "Here's the thing:", "Let's dive in", "Picture this:", "Imagine if...",
  "In today's fast-paced world..."
- Sentence-opening `Furthermore,`, `Moreover,`, `Additionally,`, `Indeed,`,
  `It's worth noting that`, `It's important to note`. Delete them and read it
  again; it almost always works.
- Triplets for rhythm ("fast, reliable, and scalable") when only one of the
  three is true or relevant.
- A one-line moral after every paragraph restating what it just said.
- Openers that thank, praise or restate the question ("Great question!",
  "I hope this finds you well"). Closers that offer more help, "Thanks in
  advance", "Let me know if you have any questions", "Hope this helps!".

**Shape.**

- Bullets for things that are actually lists. If it reads as a sentence,
  write the sentence.
- Headings when the reader will scan or come back. Not on a four-paragraph
  message.
- Bold for the one thing the reader mustn't miss, not decoration.
- No emoji unless the channel and the writer already use them.

## What to do instead

- **Lead with the point.** The decision, the problem, the ask, the number.
  Context comes after, and only as much as the reader needs.
- **Be specific.** "Fails about 1 in 5 runs on main" beats "intermittent
  issues". Names, numbers, file paths, links.
- **Plain verbs.** "We moved to ClickHouse" not "We made the strategic
  decision to migrate".
- **Let sentence length follow the thought.** Don't chop everything into
  punchy fragments, and don't stitch three ideas together with semicolons.
- **Keep caveats next to the claim they limit**, once. Not a disclaimer
  paragraph at the end.
- **Stop when you're done.** If the last paragraph only summarises, cut it.

## By channel

- **Chat (Slack, Teams, WhatsApp):** the ask or state in the first line.
  Evidence and a link after. No greeting ceremony, no sign-off.
- **PR body:** what changed and why, in a paragraph a reviewer can act on.
  Then a test plan that names real cases. No "Summary" header over one
  paragraph, no bulleted inventory of files the diff already shows.
- **Commit message:** imperative subject that says what the commit does.
  Body only if the why isn't obvious.
- **Code review:** the behaviour that's wrong, how you know, and what needs to
  change. Say whether it blocks. Be direct and decent; no sarcasm.
- **Email:** a short opener that gets to it ("Quick one -"), the specifics,
  one clear next step, a person's name at the bottom.
- **Public post:** one point, made specifically enough to be worth reading.
  No engagement bait, no manufactured hot takes.
- **Docs:** follow the project's house style. Accuracy and findability first.

## Before you hand it over

1. Search the draft for `—` and every word in the list above.
2. Read the first line on its own. Does it say the thing?
3. Read the last paragraph. Does it add anything?
4. Check every fact, figure and claim against what you were given.
5. Read it aloud in your head. Rewrite anywhere you'd stumble or cringe.

A clean pass on the checklist means the draft isn't obviously generated. It
doesn't mean it's good; only reading it as the reader tells you that.

Draft, don't send. Posting, emailing or publishing needs its own go-ahead.
