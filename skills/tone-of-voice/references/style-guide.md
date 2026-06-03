# Long-form style guide — before / after

Load this when you've drafted something and need to audit it, or when
the rules in SKILL.md feel abstract and you want worked examples.

The before-and-after pairs below take a generic LLM-default draft and
show what it looks like rewritten in Alex's voice. The point isn't
that the "before" is *bad* English — it's that it's invisible. The
"after" sounds like someone wrote it.

## Opening a blog post

### Before — LLM throat-clearing

> In today's rapidly evolving landscape of GenAI observability, the
> ability to process events at scale has become more critical than
> ever. We're excited to share that over the past several months,
> our team has been hard at work undertaking a comprehensive
> re-architecture of our platform to unlock new levels of performance.

Five sentences worth of nothing. The reader knows they're reading
marketing before the second comma.

### After

> For the past couple of months we have been busy shovelling coal in
> the LangWatch engine room. Late last year - perhaps during a foul
> lapse in judgement - we decided to embark on the long and arduous
> journey to re-architect our platform to be event driven.

Same information, lands in two sentences, has a voice, makes a small
joke without announcing the joke.

The moves:

- **Concrete metaphor** ("shovelling coal in the engine room") instead
  of abstract description ("hard at work").
- **Parenthetical aside** for the honest qualification ("perhaps during
  a foul lapse in judgement").
- **Hyphens with spaces**, not em-dashes.
- **Numbers and timelines stay flat**: "couple of months", "late last
  year" — neither of these gets dressed up as "the past few quarters".

## Product announcement

### Before — hyperbole with no support

> Our groundbreaking new event sourcing architecture is a game-changer
> for AI observability, unlocking unprecedented scale and enabling our
> customers to harness the full power of their telemetry data. This
> is a true superpower for modern AI teams.

Three banned words in the first sentence (`groundbreaking`,
`game-changer`, `unlocking`), one in the second (`harness`), one in
the third (`superpower`). The reader's eyes have already glazed.

### After

> Before this re-architecture, our platform could process 10-20 events
> per second. That's not a typo, but it got us to where we are today.
> The new platform has been running for about a month now and has
> already processed 100 million events and counting, with peak
> throughput north of 6,000 events per second.

Same claim, evidenced. The numbers carry the weight; you don't need
adjectives. Notice "That's not a typo, but it got us to where we are
today" — a small, dry acknowledgement that makes the brag credible.

The moves:

- **Lead with the precise number** for the old state. The contrast
  does the work.
- **Throwaway sentence** breaking the rhythm ("That's not a typo...").
- **Concrete stats**, no adjectives doing the lifting.

## Explaining a technical decision

### Before — over-explaining

> We made the strategic decision to migrate from ElasticSearch to
> ClickHouse because ClickHouse's columnar storage architecture and
> append-only write pattern align particularly well with the
> requirements of an event-sourced system, providing significant
> performance benefits especially in terms of aggregation queries
> and write throughput.

One sentence, 50 words, 3 nominal phrases. Reads like a vendor case
study.

### After

> We did swap out the database, moving from ElasticSearch to
> ClickHouse, which turned out to be an almost suspiciously good fit
> for event sourcing. Append-only writes, columnar storage, absurdly
> fast aggregations. But the real difference wasn't the database, but
> rather the architecture on top of it.

Same content, half the length, and the reader is now curious about
"the architecture on top of it" (which is the next paragraph).

The moves:

- "**We did**" instead of "We made the strategic decision to". The
  contraction-style "did" carries the same meaning with less weight.
- "**Almost suspiciously good fit**" — characterisation that's also
  honest about the surprise.
- **Three nouns in a row** ("Append-only writes, columnar storage,
  absurdly fast aggregations.") instead of a single ponderous clause.
- **Pivot at the end** ("But the real difference wasn't the database
  ...") that sets up the next section.

## Customer email — apologising for an outage

### Before — corporate-stiff

> Dear customer,
>
> We sincerely apologize for the disruption you may have experienced
> with our service yesterday between 14:00 and 16:00 UTC. Our team
> identified the root cause as an issue with our database failover
> mechanism and has implemented mitigations to prevent recurrence. We
> deeply value your trust and are committed to providing the highest
> level of service.
>
> Best regards,
> The Team

Templated, defensive, signed by no one.

### After

> Hi,
>
> Quick note — we had a database failover misbehave between 14:00 and
> 16:00 UTC yesterday, which knocked traces offline for about 90
> minutes for a chunk of you. Apologies, that's not great.
>
> What happened: the secondary didn't take over cleanly, so the
> primary got into a state where it would accept writes but couldn't
> persist them. We've put two fixes in: a smarter health check on
> the failover path, and a hard cap on how long the primary will
> tolerate the secondary being out of sync before bailing.
>
> If your traces between those hours look off, drop me an email and
> we'll figure out what was lost.
>
> Alex

Honest, specific, signed. The reader understands what actually
happened and what the fix is.

The moves:

- **"Quick note"** opener instead of "Dear customer".
- **Plain language** for what broke ("misbehave", "knocked traces
  offline").
- **Specific timeline and impact**.
- **Actual technical detail** in the "What happened" paragraph,
  written so a non-database-engineer could follow.
- **Real fix described**, not a vague "implemented mitigations".
- **Direct invitation** to follow up.
- **Signed by a person.**

## Slack message — asking for help

### Before — over-formal

> Hello team, I hope this message finds you well. I'm currently
> encountering an issue with the deployment pipeline where the CI
> step is failing intermittently. Would anyone be available to take a
> look when you have a moment? Thank you in advance for your time and
> assistance.

Reads like a memo. Slack messages aren't memos.

### After

> CI flaking on main, anyone seen this before? Failing about 1 in 5
> runs, doesn't seem tied to a specific commit. Stack here:
> <link>. I'll keep poking but a second pair of eyes would help.

Direct, specific, low ceremony. "I'll keep poking but..." carries the
right energy — the asker isn't just throwing the problem over the
wall.

The moves:

- **Lead with the problem.** "CI flaking on main."
- **Specific evidence** ("1 in 5 runs, doesn't seem tied to a specific
  commit, stack here").
- **Show you tried first** ("I'll keep poking").
- **Direct ask** ("a second pair of eyes would help").
- **No "thanks in advance"** — corporate slack noise.

## PR description

### Before — bullet-everything

> ## Summary
> This PR introduces several improvements to enhance the order
> cancellation feature.
>
> ## Changes
> - Added a new endpoint
> - Updated the service layer
> - Added tests
> - Updated documentation
> - Various improvements
>
> ## Testing
> - Tested locally
> - All tests pass

Empty. The reviewer learns nothing they couldn't get from the diff.

### After

> Adds cancellation for orders placed within the last 24h. Anything
> older still requires an admin (per ADR-0042). Refund kicks off
> automatically when the cancel succeeds; we surface "refund may
> take up to 5 business days" in the success state so customers
> aren't refreshing their card statement for a week.
>
> ## Test plan
> - [ ] Place an order, cancel within 24h - refund initiated
> - [ ] Try to cancel one older than 24h - rejected with a useful
>       message
> - [ ] Cancel one that's already cancelled - 409, not a crash
> - [ ] Admin cancels an old one - works, audit log entry created
>
> Refs: ADR-0042, LIN-1234

Tells the reviewer what changed *and* what to think about. The
checklist makes verification concrete.

The moves:

- **No "Summary" header** for a one-paragraph PR. The first paragraph
  IS the summary.
- **Specific scope statement**: 24h, admin path mentioned, refund
  timing called out.
- **One reason given** ("so customers aren't refreshing their card
  statement for a week") — humanises the choice.
- **Concrete checklist** with edge cases.
- **Links** at the bottom, not buried.

## Mid-paragraph transitions

LLMs love connective tissue. Alex doesn't.

### Cut these connectives

- "Furthermore,"
- "Moreover,"
- "Additionally,"
- "It's worth noting that"
- "It's important to note that"
- "As mentioned earlier,"
- "To put it simply,"
- "In conclusion,"
- "Last but not least,"

### Replace with

- A full stop.
- A new paragraph.
- Or nothing — read the draft aloud; if the transition reads fine
  without the word, the word is filler.

### Before

> The new architecture provides significant performance benefits.
> Furthermore, it enables real-time updates. Additionally, it makes
> feature development much faster. Moreover, the data quality
> improves over time as we refine the pipeline.

### After

> The new architecture is faster, updates in real time, and ships
> features faster. The data also gets retroactively better as we
> refine the pipeline — old traces benefit from every improvement.

Same four ideas. Five sentences down to two. Connective tissue cut.

## Three-word punches

Used for emphasis after a longer sentence. Don't over-use them, but
one or two per piece adds bite.

> Same servers, same team.

> We're ready. Send us everything.

> tldr;

The form: a short, declarative sentence that lands the previous point
with no qualification.

## Closing a piece

### Before — vague call to action

> Thank you for reading! If you have any questions or feedback, please
> don't hesitate to reach out. We're always happy to chat.

Cut. All of this is noise.

### After — earned closing

> If you want to know how the sausage is made, stay tuned. We've got
> a proper technical deep-dive coming next, going into the guts of
> the event sourcing system, what we learned working with ClickHouse,
> and all the architectural decisions (and regrets) along the way.

The closing line earns its place by promising something specific. "We
should chat sometime" is empty; "here's what we're publishing next"
is concrete.

Other workable closings:

- A direct ask, sharp: "Tell us. We're probably only an afternoon
  away from building it."
- A genre-aware sign-off: "Signing off."
- An ironic understatement: "Spoiler: it seems to have gone well
  (I'm still here…)"
- A specific next step: "Curious about event sourcing? Martin
  Fowler's overview is a great starting point."

## When the register is more formal

Not everything Alex writes is informal. Conference abstracts,
security disclosure emails, contract negotiations — these need a more
buttoned register. The voice still applies, just dialled:

- Em-dash ban still on.
- Banned LLM vocabulary still on.
- British spelling still on.
- Hyperbole and asides — dial down or remove.
- Self-aware genre callouts — usually keep one, just one, and only if
  it lands.

### Before — too informal for the context

> Hey just wanted to flag, lol, we found a small auth bug in
> production yesterday, our bad. Patched it within the hour
> though, so we're back to slinging tokens like nothing happened.
> Anyway, here's the writeup 💀.

Too jokey for a security disclosure to a customer.

### After — formal register, still in voice

> We identified an authentication issue in production yesterday and
> rolled out a fix within the hour. The bug allowed a session token
> issued in one tenant to be presented in another in a narrow
> request window. We have no evidence it was exploited, and the
> affected window was approximately 14 minutes.
>
> The full writeup, including timeline, root cause, and the
> follow-up work we're doing to prevent a recurrence, is attached.
>
> If you have questions, reply to this email or schedule time at
> <link>.

Direct, specific, sober. Still no em-dashes, still British, still
plain. The voice hasn't gone; it's just dressed appropriately.

## Long-form pieces — the rhythm

For anything longer than ~500 words, the rhythm matters as much as
any individual sentence. Aim for:

1. **Hook paragraph**: lead with the point, set the metaphor.
2. **First body section**: the "what changed" — concrete, specific.
3. **Second body section**: the "why it matters" — usually the
   reader-facing payoff. This is where you can earn the brag.
4. **Mid-piece detour**: a story, a specific example, a number. Keeps
   the piece from reading like a press release.
5. **Practical section**: what the reader can do with it now.
   ("Already live", "Send us everything".)
6. **Signing off**: gestures forward (what's next) or asks (what they
   want).

Each section header has personality (see SKILL.md for examples).

## Sanity check before sending

Read the draft once with these questions:

1. **Are there any em-dashes?** If yes, replace.
2. **Did I use any of the banned words?** Grep the draft for `delve`,
   `leverage`, `robust`, `superpower`, `game-change`, `unlock`,
   `harness`, `seamless`, `groundbreaking`, `revolutionary`,
   `paradigm`, `synergy`, `tapestry`. If any hit, rewrite.
3. **Did I start any paragraph with "Furthermore" / "Moreover" /
   "Additionally"?** Cut.
4. **Is there a parenthetical aside somewhere?** If the piece is
   longer than a few paragraphs and has zero asides, it probably
   reads flat. Add one if there's a natural place. Don't force.
5. **Is there a concrete number in the body?** Even a small one
   ("about a month", "three commits") beats the abstract version.
6. **Does the closing earn its place?** Or could it be cut without
   losing anything?
7. **Read it aloud.** Anywhere your voice does something unnatural is
   somewhere the writing does too. Rewrite that sentence.

When in doubt, [`samples.md`](samples.md) has Alex's own writing for
calibration.
