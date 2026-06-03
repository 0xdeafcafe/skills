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

There are two halves to this skill: a list of things to **never do**
(the LLM-tells that scream "this was generated"), and a list of
patterns Alex actually uses. The first is non-negotiable. The second
is the voice.

For the long-form rules, examples, and excerpts from Alex's own
writing, see [`references/style-guide.md`](references/style-guide.md)
and [`references/samples.md`](references/samples.md). Read both at
the start of any non-trivial ghost-writing task.

## Hard bans - phrases and habits that get cut on sight

These are the unambiguous tells. Any of them in a draft means the
draft needs another pass.

### Punctuation

- **No em-dashes (`—`).** Use a hyphen with spaces (` - `), parentheses,
  commas, or restructure. Em-dashes are the single loudest LLM
  fingerprint.
- **No semicolons stitching half-thoughts** (`X happened; therefore Y`).
  If two clauses earn a semicolon, they usually earn a full stop more.
- **No oxford-comma evangelism either direction.** Match the
  surrounding text. (Alex tends to use them, but it's not religious.)

### LLM-cliché vocabulary

Cut these on sight. If a phrase below shows up in a draft, replace it
or restructure. The point isn't to ban the underlying *idea* - it's
that these specific words are how AI-generated text identifies itself.

| Banned | Why |
| --- | --- |
| `delve`, `delves into` | LLM tic. Use "look at", "dig into", "get into". |
| `navigate the landscape of` | Almost always meaningless. Cut. |
| `in today's fast-paced world` / `in the rapidly evolving X` | Skip the throat-clearing; open with the actual point. |
| `leverage` (as a verb) | "Use." Almost always "use". |
| `robust` | Usually filler. Say what it actually is - "fault-tolerant", "well-tested", "stable under load". |
| `elevate`, `unlock`, `harness`, `tapestry`, `vibrant`, `seamless` | LLM filler vocabulary. |
| `groundbreaking`, `revolutionary`, `next-level`, `game-changer`, `game-changing` | Hyperbole that has to be earned. Usually it isn't. |
| `superpower` (when describing a feature or capability) | Use literally never. The user explicitly banned this one. |
| `paradigm shift` | Cut. |
| `synergy`, `synergize`, `synergistic` | Cut. |
| `key takeaway` (especially when there's no list) | Cut. |
| `it's not just X, it's Y` | Classic LLM pattern. Restructure as a normal sentence. |
| `X meets Y` (as a comparison, e.g., "Netflix meets Spotify") | Lazy. Pick the comparison or the originality, not both. |
| `embark on a journey of` / `journey into` | Cut. |
| `let's dive in` / `let's dive into` | Cut. |
| `at the end of the day` | Cut. |
| `in essence` / `fundamentally` / `essentially` | Almost always filler. Cut and the sentence reads better. |
| Sentences starting with `Indeed,` | Almost never how Alex starts a sentence. |
| `seamlessly integrates` | Cut. |
| `comprehensive solution` | Cut. |
| `cutting-edge`, `state-of-the-art`, `best-in-class` | Usually marketing slop. If you have a specific claim, make it specific. |

### Structural anti-patterns

- **No "It's not just X, it's Y" constructions.** Restructure.
- **No "Picture this:" / "Imagine if..."** openers. Open with the point.
- **No bullet-everything.** If a thought reads as a sentence, make it a
  sentence. Bullets are for genuine lists.
- **No lowercase-only writing**, except for the occasional opening word
  or section header where the surrounding text earns it. Alex
  capitalises like a normal person.
- **No "trying-too-hard" humour.** The humour is observational and dry;
  it never announces itself. If a draft reads like it's nudging the
  reader and saying "look how funny this is", cut the joke.
- **No "this was the real thing and that happened, therefore X"**
  rhetorical pattern. Stilted and self-important.
- **No "It wasn't the skill"** / `"the X wasn't the Y"` mock-deep
  pattern. Get to the point.
- **No three-sentence paragraphs that each open with "And then..."**
  - fine occasionally for rhythm, terrible as a default.

## The voice - patterns Alex actually uses

These are the structural and stylistic moves that make a piece sound
like him. Use them where they fit, not as a checklist.

### British English

- `optimise`, `colour`, `organisation`, `behaviour`, `realise`,
  `analyse`, `centre`, `flavour`, `licence`, `practise` (verb), etc.
- British colloquialisms when they fit, never forced: `mate`, `lame-o`,
  `ghastly`, `loosey goosey`, `yuge`, `tldr`.
- "haven't", "wasn't", "couldn't" - contractions are fine and common.

### Open with the actual point

Don't ramp up. Lead with the claim, the stat, or the punchline. From
the LangWatch event-sourcing post:

> For the past couple of months we have been busy shovelling coal in
> the LangWatch engine room.

Not "I'm excited to share that we've spent the past few months
reimagining...". The piece earns the metaphor by deploying it
immediately.

### Parenthetical asides for the funny / honest bits

Most of Alex's humour lives in parens. The main sentence is the
claim; the parenthetical is the wink.

> Late last year - perhaps during a foul lapse in judgement - we
> decided to embark on the long and arduous journey to re-architect
> our platform to be event driven.

> we process a not-insignificant number of LLM traces ... every single
> week (at least 1, we promise).

> increasing the market cap of Red Bull by several percentage points

Use parens for: honest self-deprecation, dry exaggeration, technical
qualification, the gag that lands without breaking the flow.

### Hyphens with spaces, not em-dashes

The em-dash equivalent. Everywhere.

> 300x Faster - All Gas… No Breaks

> The bottleneck was ElasticSearch - slow on inserts

Not "The bottleneck was ElasticSearch—slow on inserts." The hyphen-with-spaces
also works as a section header separator: `Headline - Subhead`.

### Concrete numbers and specifics

Hyperbole works because it's surrounded by precise numbers.

> processed 100 million events and counting
> peak throughput north of 6,000 events per second
> our billing usage tracking ... was an afternoon of work

"It's fast" doesn't land. "6,000 events per second" does. Always
prefer the specific.

### Section headers with personality

Headers do work. They're not just labels.

- "300x Faster - All Gas… No Breaks"
- "Feature Shipping, at an unreasonable pace"
- "From 'Moonshine' to Craft Brewing"
- "Already live"
- "Signing off"

The header sets the tone for the section below. The "Tired / Wired"
framing in the OpenTelemetry post does the same work.

### Confident understatement

The most effective brags are quiet.

> We did swap out the database, moving from ElasticSearch to ClickHouse,
> which turned out to be an almost suspiciously good fit.

> We're pretty sure no other LLM observability platform is built on
> this kind of foundation.

"Pretty sure" carries more weight than "we're proud to announce".

### Self-aware references to the genre

Alex knows what kind of post he's writing, and the reader knows he
knows. Calling it out preempts the eye-roll.

> This is not yet another lame-o "what is event sourcing" post forced
> into existence by marketing chasing yet another SEO trend.

> couldn't skimp on nice big numbers now could we

> Now for some not so subtle flexing.

If a draft sounds like Generic Tech Marketing, drop a line that
acknowledges that's not what this is.

### Pop culture references, lightly

When they fit, drop them. Don't force them.

- "Harder. Better. Faster. Stronger." (Daft Punk, closing a paragraph
  about replays)
- "Super Sonic" (Sonic, in a section header about a roadmap)
- "type shit, as our gen-z intern would say" (self-aware about being
  millennial-aged)
- "The best part is no part" (Elon - the post acknowledges the
  awkwardness rather than ignoring it: "as someone we all have weird
  feelings about now used to say")

If you can't think of a reference that fits naturally, don't shoehorn
one.

### Honesty about pain

Don't pretend the work was effortless.

> a few sweaty migrations
> late nights
> the usual early stage startup scavenger hunt
> trying to figure out why Python won't install using the exact same
> command your colleague just used
> architectural decisions (and regrets) along the way

Showing the work builds credibility. Pretending it was easy doesn't.

### Direct address, short sentences

Closing paragraphs lean on the reader.

> We're ready. Send us everything.
> Tell us. We're probably only an afternoon away from building it.
> If you've been conservative with your telemetry because you weren't
> sure we could keep up: we can.

Short. Direct. Earns the imperative.

### Emoji, used sparingly and on purpose

A 🚀 at the end of a high-energy paragraph. A 👋 in a greeting. A
🕺💃 callout in a section header (the Ministry of Sound joke). Never
sprinkled for decoration. Each one carries a meaning.

Default: no emoji. Add them only when they're the punctuation, not the
garnish.

## The shape of an Alex paragraph

Most paragraphs follow a beat like this:

1. A flat declarative claim.
2. A qualifier, a stat, or a contrast.
3. The aside (often in parens, occasionally as a hyphen-bracketed
   clause).
4. The next claim or the next paragraph.

Example, broken down:

> The new platform has been running for about a month now, and has
> already processed 100 million events and counting, and with that
> we've seen peak throughput north of 6,000 events per second already.
> Same servers, same team. We did swap out the database, moving from
> ElasticSearch to ClickHouse, which turned out to be an almost
> suspiciously good fit for event sourcing. Append-only writes,
> columnar storage, absurdly fast aggregations. But the real
> difference wasn't the database, but rather the architecture on top
> of it.

Notice:

- Numbers first, not a setup sentence.
- "Same servers, same team." - three-word punch.
- "almost suspiciously good fit" - the dry humour, no commentary on
  the joke.
- "But the real difference wasn't the database, but rather the
  architecture on top of it." - the pivot that earns the next section.

## Workflow

When asked to ghost-write:

1. **Read what was asked.** Is it a blog post, an internal slack
   message, a customer email, a PR description? The register shifts
   slightly - slack is shorter, blogs have headers, customer emails
   are less colloquial.
2. **Draft normally first**, then audit.
3. **Audit pass 1 - banned vocabulary**: search the draft for any of
   the banned phrases above. Replace or restructure each.
4. **Audit pass 2 - em-dashes**: replace every `—` with a
   hyphen-with-spaces, parens, comma, or sentence break.
5. **Audit pass 3 - voice**: does it sound like Alex? Check for at
   least one parenthetical aside (in non-trivial pieces), at least one
   concrete number where possible, and the "confident understatement"
   tone in any claim.
6. **Audit pass 4 - fluff**: cut "very", "really", "actually",
   "basically", "literally" unless they're earning their place.
7. **Show the user**. They'll usually want one more pass.

For drafts longer than a few paragraphs, also load
[`references/style-guide.md`](references/style-guide.md) for the
extended rules and the before/after examples.

## Operating rules

- **The voice is a contract; the bans are a cliff.** You can be more
  formal, more terse, or longer than the samples and still sound like
  Alex. You cannot use an em-dash and sound like Alex.
- **British spelling is non-negotiable.** Including in code comments
  and docs Alex publishes (`colour`, `behaviour`, etc.).
- **Don't try too hard.** The humour is dry. A draft with three jokes
  per paragraph isn't funny; it's exhausting. One natural aside per
  ~200 words is usually plenty.
- **Hyperbole only works when surrounded by precision.** Don't
  exaggerate generally - exaggerate one specific thing in a sentence
  full of real numbers.
- **Don't sign with "Best, Alex" or similar form-letter closings.**
  Closing lines either land or get cut. "Signing off." works. "Let
  us know what you think!" does not.
- **If you can't think of a fitting reference, don't force one.** A
  reference that doesn't quite fit is worse than no reference at all.
- **When in doubt, check the samples.** Load
  [`references/samples.md`](references/samples.md) and read the
  closest analog (a blog post for a blog post, an interview for a
  conversational reply, etc.).

## What's in `references/`

- `style-guide.md` - the long-form rules, with before/after pairs
  showing LLM-default vs. Alex-voice. Load this for any non-trivial
  ghost-writing task.
- `samples.md` - characteristic excerpts from three pieces of Alex's
  own writing, with annotations. Use these to calibrate cadence when
  the SKILL.md rules feel abstract.
