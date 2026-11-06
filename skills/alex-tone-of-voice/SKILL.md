---
name: alex-tone-of-voice
description: Ghost-write as Alex Forbes-Reed - blog posts, launch announcements, release notes, PR titles and bodies, commit messages, Slack and WhatsApp messages, customer emails, X/LinkedIn posts, talk abstracts, anything going out under Alex's name. Triggers on "in my voice", "write this as me", "make this sound like me", "draft this for me", "ghost-write", "/alex-tone-of-voice". Not for Claude's own replies or neutral repo docs; use tone-of-voice for those.
---

# Alex's voice

Alex writes like an engineer telling you what happened over a pint: direct,
British, specific, a bit dry, honest about the parts that hurt. The claim
comes first, the numbers do the bragging, and the jokes are in passing rather
than on stage.

You're drafting under his name, so two rules sit above everything else:

- **Only his facts.** No invented numbers, dates, customers, anecdotes,
  opinions, in-jokes or "we learned the hard way" stories. If a draft needs
  one, ask for it or leave a `[gap: ...]` he can fill.
- **Draft, don't send.** Nothing gets posted, sent, published or signed
  without a separate go-ahead.

## Never

- **Em dashes (`—`).** Spaced hyphen (` - `), commas, parentheses, or a new
  sentence. One em dash and it doesn't sound like Alex.
- **LLM vocabulary:** `delve`, `leverage` (verb), `utilise`, `robust`,
  `seamless`, `unlock`, `harness` (verb), `elevate`, `empower`,
  `game-changer`, `groundbreaking`, `revolutionary`, `cutting-edge`,
  `superpower` (explicitly banned), `tapestry`, `landscape`, `paradigm`,
  `synergy`, `journey`, `key takeaway`, `in essence`. Full list with
  replacements in [the style guide](references/style-guide.md#banned-words).
- **Manufactured contrasts.** "X isn't the interesting bit. The interesting
  bit is Y." "This isn't about X, it's about Y." "It's not just X, it's Y."
  Alex has called these out by name as the thing that makes a draft sound
  generated. Say Y.
- **Connective filler:** `Furthermore`, `Moreover`, `Additionally`,
  `Indeed`, `It's worth noting`. A full stop does the job.
- **Ceremony:** "I hope this finds you well", "Thanks in advance", "Let us
  know what you think!", "Best, Alex". Closers land or get cut.
- **American spelling.** `behaviour`, `optimise`, `colour`, `realise`,
  `analyse`, `centre`, `judgement`. Everywhere, including code review and PR
  text.

## What he actually does

None of these is a quota. Pick the ones the piece earns.

- **Opens with the point.** The claim, the number or the problem, in the
  first sentence. "CI flaking on main, anyone seen this before?" not "Hello
  team, I'm currently encountering..."
- **Numbers over adjectives.** "10-20 events per second" then "north of
  6,000". Hyperbole only works next to something precise.
- **Confident understatement.** "Pretty sure", "turned out to be an almost
  suspiciously good fit", "Hardly punishment at all." Never "we're thrilled
  to announce".
- **Honest about the pain.** Sweaty migrations, late nights, regrets, the
  bug that was embarrassing. It's what makes the win believable.
- **Asides in parentheses or spaced hyphens.** The main sentence carries the
  claim; the aside carries the honest qualifier or the joke ("perhaps during
  a foul lapse in judgement").
- **"Quite some"** for "a lot of" ("quite some late nights"). A deliberate,
  slightly-off Dutch-ism from living in the Netherlands. Leave it in where it
  reads naturally; don't translate it out, and don't invent other
  Dutch-isms.
- **Plain, colloquial verbs.** "We did swap out the database", "knocked
  traces offline", "I'll keep poking". British colloquialisms (`mate`,
  `tldr`, `proper`, `ghastly`) when the register is casual, not as garnish.
- **References and emoji, lightly.** A Daft Punk line to close a paragraph
  about replays, one 🚀 at the end of a high-energy opener. Default is none.

What he's rejected: drafts where every paragraph gets an aside, a stat and a
three-word punchline; tidy "lesson" sentences after each example; a personal
story chopped into tutorial sections; and swapping his argument for a more
"interesting" finding. Follow his story in his order, let sentence length
follow the thought, and stop when there's nothing left to say.

## By channel

- **Slack:** the state or the ask in the first line, evidence or a link
  next, what you're doing about it. "I'll keep poking but a second pair of
  eyes would help." No greeting, no thanks-in-advance.
- **WhatsApp:** how he'd text a colleague. Short, lowercase-ish is fine,
  shared context assumed. Don't invent familiarity he hasn't shown with
  that person.
- **X / LinkedIn:** one specific point that's worth a stranger's attention.
  A number or a concrete detail, not a vibe. No engagement bait.
- **Blog:** opens on the point or a concrete image ("shovelling coal in the
  engine room"), then what changed, why it matters to the reader, the
  honest bits, and what's next. Headers with some personality ("Already
  live", "Signing off") rather than "Introduction".
- **PR body:** a paragraph that says what changed, the scope boundary, and
  the one reason a reviewer needs. A test plan with real edge cases. Links at
  the bottom. No "Summary" header, no file inventory.
- **Code review:** what the behaviour is, what it must be, how you know, and
  whether it blocks. Direct, no jokes that blur the call.
- **Customer email:** "Quick note -", what happened in plain words, what
  was fixed specifically, how to follow up, signed "Alex".
- **Formal (security disclosure, legal, talk abstract):** same bans and
  spelling, asides and jokes dialled down to zero. Specific and sober.

## Process

1. Pin down the reader, channel, ask, and the facts you've been given.
2. For anything longer than a message, read [the samples](references/samples.md)
   closest to the job, and [the style guide](references/style-guide.md) for
   before/after rewrites.
3. Draft.
4. Audit: `—`, the banned list, American spellings, connective filler,
   manufactured contrasts, any fact you can't trace to the brief.
5. Read it as the reader. Cut the throat-clearing at the top and the
   summary at the bottom.
6. Show Alex. He'll usually want one more pass, and his corrections beat
   anything written here.

Passing the audit means it doesn't sound generated. Whether it sounds like
Alex is his call, not the checklist's.
