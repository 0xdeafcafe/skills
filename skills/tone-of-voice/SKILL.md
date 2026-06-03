---
name: tone-of-voice
description: Use when writing prose that will go out under Alex Forbes-Reed's name - blog posts, marketing copy, launch announcements, release notes, PR descriptions, internal slack messages, customer emails, X/LinkedIn posts, conference abstracts, anything ghost-written. Triggers on "write a blog post", "draft this for me", "in my voice", "polish this", "make this sound like me", "rewrite as me", "/tone-of-voice", or any explicit request to produce text Alex will publish. Does NOT apply to Claude's own conversational replies, code comments, neutral technical docs, or PR comments Claude posts as itself.
allowed-tools: Read, Edit, Write, Grep, Glob
---

# tone-of-voice - write like Alex, not like an LLM

This skill applies whenever Claude is **ghost-writing**: producing prose
that Alex will publish under his own name. Blog posts, marketing copy,
slack messages, customer emails, PR descriptions, all of it.

It does **not** apply to Claude's normal conversational replies. Those
are Claude-to-Alex; they stay in Claude's default register.

Two halves: things to **never do** (the LLM-tells), and patterns Alex
actually uses. The first is non-negotiable. The second is the voice.

For long-form rules, examples, the full banned vocabulary table, the
worked voice patterns, and excerpts from Alex's own writing, see
[`references/style-guide.md`](references/style-guide.md) and
[`references/samples.md`](references/samples.md). Read both at the
start of any non-trivial ghost-writing task.

## Hard bans - phrases and habits that get cut on sight

### Punctuation

- **No em-dashes (`—`).** Use a hyphen with spaces (` - `), parentheses,
  commas, or restructure. Em-dashes are the single loudest LLM
  fingerprint.
- **No semicolons stitching half-thoughts.** If two clauses earn a
  semicolon, they usually earn a full stop more.
- **No oxford-comma evangelism either direction.** Match the
  surrounding text. (Alex tends to use them, but it's not religious.)

### LLM-cliché vocabulary - highest-signal entries

These are the words that immediately scream "AI-generated". Cut on
sight. Full banned list with reasons in
[`references/style-guide.md`](references/style-guide.md).

| Banned | Why |
| --- | --- |
| `delve`, `delves into` | LLM tic. Use "look at", "dig into", "get into". |
| `leverage` (as a verb) | "Use." Almost always "use". |
| `superpower` (when describing a feature) | Use literally never. Explicitly banned. |
| `it's not just X, it's Y` | Classic LLM pattern. Restructure. |
| `groundbreaking`, `game-changer`, `unlock`, `harness`, `seamless`, `robust` | Filler / unearned hyperbole. |

### Structural anti-patterns

- **No "Picture this:" / "Imagine if..."** openers. Open with the point.
- **No bullet-everything.** If a thought reads as a sentence, make it a
  sentence. Bullets are for genuine lists.
- **No lowercase-only writing**, except for the occasional opener or
  header where the surrounding text earns it.
- **No "trying-too-hard" humour.** Observational and dry; it never
  announces itself. If a draft nudges the reader saying "look how
  funny", cut the joke.
- **No three-sentence paragraphs that each open with "And then..."**

## The voice - patterns Alex actually uses

Use these where they fit, not as a checklist. Each is explained with
quoted examples in
[`references/style-guide.md`](references/style-guide.md).

- **British English.** `optimise`, `colour`, `behaviour`, `realise`,
  `analyse`, `centre`. Contractions fine. Colloquialisms (`mate`,
  `lame-o`, `ghastly`, `tldr`) only when they fit naturally.
- **"Quite some"** in place of "a lot" or "a few". A Dutch-ism Alex
  has picked up living in the Netherlands ("we process quite some
  traces", "quite some late nights"). Slightly off-spec English that
  nobody else uses; lean into it where it fits. Don't translate it
  out.
- **Open with the actual point.** No throat-clearing. Lead with the
  claim, the stat, or the punchline.
- **Parenthetical asides** carry the humour. Main sentence is the
  claim; the parenthetical is the wink.
- **Hyphens with spaces, not em-dashes.** Everywhere.
- **Concrete numbers and specifics.** "6,000 events per second" beats
  "fast". Hyperbole only works when surrounded by precision.
- **Section headers with personality**, not labels.
- **Confident understatement.** "Pretty sure" carries more weight than
  "we're proud to announce".
- **Self-aware genre callouts.** Acknowledge what kind of post this
  is, so the reader knows you know.
- **Pop culture references, lightly.** Only when they fit naturally.
- **Honesty about pain.** Show the sweaty migrations and late nights.
- **Direct address, short sentences** at the close. "We're ready.
  Send us everything."
- **Emoji used as punctuation, not garnish.** Default: none.

## The shape of an Alex paragraph

Most paragraphs follow this beat:

1. A flat declarative claim.
2. A qualifier, a stat, or a contrast.
3. The aside (often in parens, occasionally hyphen-bracketed).
4. The next claim or paragraph.

Worked example with breakdown in
[`references/style-guide.md`](references/style-guide.md).

## Workflow

When asked to ghost-write:

1. **Read what was asked.** Blog, slack, customer email, PR? The
   register shifts - slack is shorter, blogs have headers, customer
   emails are less colloquial.
2. **Draft normally first**, then audit.
3. **Audit pass 1 - banned vocabulary**: grep for the banned phrases.
   Replace or restructure each.
4. **Audit pass 2 - em-dashes**: replace every `—` with a
   hyphen-with-spaces, parens, comma, or sentence break.
5. **Audit pass 3 - voice**: parenthetical aside present (in
   non-trivial pieces), concrete number where possible, confident
   understatement in any claim.
6. **Audit pass 4 - fluff**: cut "very", "really", "actually",
   "basically", "literally" unless earning their place.
7. **Show the user.** They'll usually want one more pass.

## Operating rules

- **The voice is a contract; the bans are a cliff.** You can be more
  formal, terse, or longer than the samples and still sound like
  Alex. You cannot use an em-dash and sound like Alex.
- **British spelling is non-negotiable.** Including in code comments
  and docs Alex publishes.
- **Hyperbole only works when surrounded by precision.** Don't
  exaggerate generally - exaggerate one specific thing in a sentence
  full of real numbers.
- **Don't sign with "Best, Alex" or similar form-letter closings.**
  Closing lines either land or get cut. "Signing off." works. "Let
  us know what you think!" does not.
- **When in doubt, check the samples.** Load
  [`references/samples.md`](references/samples.md) and read the
  closest analog.
