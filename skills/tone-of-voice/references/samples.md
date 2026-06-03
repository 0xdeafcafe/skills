# Annotated samples from Alex's own writing

Characteristic passages from three pieces, with notes on the voice
moves at work. Use this for cadence calibration when the SKILL.md
rules feel abstract.

The three sources:

1. **"Eat Sleep Append Repeat…"** (Apr 2026) - LangWatch event
   sourcing announcement. Marketing-flavoured blog post.
2. **Snapchat API interview** - older Q&A about reverse-engineering
   Snapchat's API. Conversational technical piece.
3. **"A warm welcome to LangWatch"** - onboarding-style blog about
   joining LangWatch and the OpenTelemetry SDK rewrite. First-person.

The samples cover three different registers - broad blog, technical
interview, personal onboarding. The voice is consistent across all
three.

---

## Sample 1 - Opening hook (Eat Sleep Append Repeat)

> For the past couple of months we have been busy shovelling coal in
> the LangWatch engine room. Late last year - perhaps during a foul
> lapse in judgement - we decided to embark on the long and arduous
> journey to re-architect our platform to be event driven. Fast
> forward many late nights, a few sweaty migrations, and increasing
> the market cap of Red Bull by several percentage points, we're
> live and excited to share what this means for you, and how it
> super-charges us for 2026 and beyond 🚀.

**What's working:**

- **Concrete metaphor in the opener**: "shovelling coal in the engine
  room" lands the "we've been working" message in three words instead
  of a sentence of throat-clearing.
- **Hyphen-with-spaces aside**: "- perhaps during a foul lapse in
  judgement -" is the dry joke. The main sentence stays intact; the
  joke lives in the bracketed clause.
- **Dry hyperbole**: "increasing the market cap of Red Bull by several
  percentage points" - works because it's sandwiched between concrete
  things ("many late nights", "a few sweaty migrations").
- **The earned emoji**: the 🚀 lands because the paragraph has
  earned the energy.

**What an LLM default would have produced** (do not write like this):

> Over the past few months, our team has been hard at work on a
> significant initiative. We made the strategic decision late last
> year to re-architect our platform around event-driven principles.
> After extensive engineering effort, we're thrilled to announce
> that this work is now live, setting us up for an exciting 2026.

Same facts. No voice.

---

## Sample 2 - The throwaway "not a typo" (Eat Sleep Append Repeat)

> Before this re-architecture, our platform could process 10-20 events
> per second. That's not a typo, but it got us to where we are today.
> The bottleneck was ElasticSearch - slow on inserts, which
> constricted how many jobs we could process concurrently.

**What's working:**

- **Confess the embarrassing number first.** Not 10,000 per second,
  not 1,000 - 10 to 20. The brag (300x improvement) only works
  because the starting point is honest.
- **"That's not a typo, but it got us to where we are today."** - a
  one-liner that defuses the "10-20?? really??" reaction the reader
  would have had anyway. Acknowledges and moves on.
- **No transition word.** No "Furthermore". No "Now,". Just the next
  sentence.

The general move: **acknowledge what the reader is thinking, in fewer
words than they'd expect.**

---

## Sample 3 - GenAI compared to people (Warm welcome to LangWatch)

> GenAI really is like people. It's not deterministic, they don't
> behave, they even answer back and negotiate. The same prompt can
> cost twice as many tokens between two almost identical requests,
> stall and require multiple retries, or just go on an absolute acid
> trip and reinvent reality. Without rich traces recording prompt
> content, generations params, token counts, model version, latency,
> tool calls, and the ever growing list of features, keeping this
> portion in a black box is unsustainable.

**What's working:**

- **"GenAI really is like people"** - declarative, opens by stating
  the comparison without ramp-up.
- **"they don't behave, they even answer back and negotiate"** -
  anthropomorphising for the joke, with the joke landing in the
  cumulative ("answer back AND negotiate") rather than in a
  punchline.
- **"absolute acid trip and reinvent reality"** - "absolute" as a
  British intensifier, then concrete hyperbole that nobody would
  write neutrally. An LLM would say "produce unexpected output" or
  "generate inaccurate responses".
- **Dense technical list, no buffering**: "prompt content, generations
  params, token counts, model version, latency, tool calls" - six
  items, no "for example", no "namely". Six commas.
- **Flat declarative closer**: "keeping this portion in a black box
  is unsustainable." No "we believe" / "it's clear" hedging. The
  paragraph lands on a claim.

---

## Sample 4 - The afternoon-of-work brag (Eat Sleep Append Repeat)

> Our billing usage tracking (counting every billable event per
> project per day across the entire platform) was an afternoon of
> work. Not a sprint, or a big project. An afternoon.

**What's working:**

- **Specific scope in parens**: "(counting every billable event per
  project per day across the entire platform)". The parenthetical
  qualifies the claim - without it, "billing tracking" would be
  vague.
- **The three-word punch**: "An afternoon." It's the third repetition
  of the same word, and it lands.
- **Restraint**: no exclamation marks. No "imagine that!". The
  understatement carries the brag.

---

## Sample 5 - Daft Punk closer (Eat Sleep Append Repeat)

> Say we improve our trace processing pipeline. Better cost
> calculation, smarter input/output extraction, whatever (or even fix
> a bug, shocking). In a traditional system, that improvement only
> applies to new data. Everything you've already sent? Tough luck
> mate.
>
> With event sourcing, we can replay your entire history through the
> new logic. Your old traces get the benefit of every improvement we
> ship, automatically. No data loss, no "oopsie, just wait for new
> data." The raw events are the source of truth, and the views we
> build from them can always be rebuilt. Harder. Better. Faster.
> Stronger.

**What's working:**

- **"whatever (or even fix a bug, shocking)"** - parenthetical with
  self-aware aside. The "shocking" is the dry voice.
- **"Tough luck mate."** - British colloquialism doing the work that
  a longer sentence would do worse.
- **"oopsie, just wait for new data"** - quoting the response that
  customers usually get, in mock-tone. No "many vendors say...";
  just the imagined quote.
- **Closing with the lyric**: "Harder. Better. Faster. Stronger." -
  Daft Punk reference that fits the rhythm of the paragraph (which
  is itself about iterative improvement). Not announced, just
  dropped.

**The reference test**: a Daft Punk lyric works here because the
paragraph is *about* iterative improvement of the same thing. If the
paragraph had been about, say, a new auth method, the lyric wouldn't
have landed. References work when they map.

---

## Sample 6 - The "Already live" list (Eat Sleep Append Repeat)

> We have some quick wins already live on production just as a side
> effect of the new system. These aren't roadmapped or a loosey
> goosey todo list, but ready for you now.
>
> - **Live trace updates**: your browser updates the moment a span
>   arrives. No refresh, no polling.
> - **Real-time simulations**: agentic simulations, via the scenario
>   library, are now realtime. No more excuses to get a coffee here,
>   sorry.
> - **Usage tracking**: real-time billing and usage calculations, per
>   project, per day.
> - **Supercharged evaluations and experiments**: these should all be
>   running noticeably faster now, which is always nice.
> - **Fast is the only mode**: the entire platform should be all round
>   snappier, almost instant loading compared to before too.

**What's working:**

- **The opening line uses "loosey goosey"**, which sets the register -
  this is a list, but it's not a corporate roadmap.
- **Each bullet has a small aside or characterisation**, not just a
  feature name. "No more excuses to get a coffee here, sorry." adds
  voice to what would otherwise be a sterile bullet.
- **"Fast is the only mode"** as a bullet label - Apple-style product
  framing without the corporate stiffness.

**Note:** lists in Alex's writing usually have personality in the bullets
themselves, not just in the surrounding paragraph.

---

## Sample 7 - The closing (Eat Sleep Append Repeat)

> If you want to know how the sausage is made, stay tuned. We've got
> a proper technical deep-dive coming next, going into the guts of
> the event sourcing system, what we learned working with ClickHouse,
> and all the architectural decisions (and regrets) along the way.
>
> We'll also be sharing how we built the internal tooling to manage
> all of this infrastructure. Turns out, building developer tools
> inside a developer tool is its own kind of sadistic adventure.

**What's working:**

- **"how the sausage is made"** - earned colloquialism.
- **"(and regrets)"** - the parenthetical that's the actual reason a
  reader will click through. Honesty about the messy parts is the
  draw.
- **"its own kind of sadistic adventure"** - the closer is also a
  setup for the next piece. The phrase characterises without
  complaining.

---

## Sample 8 - Confident understatement (Snapchat interview)

> What protections does Snapchat have in place to prevent that?
>
> Like I previously said, all traffic is https (already better than
> Instagram, where a friend of mine Stevie Graham found a way to
> exploit it via a single http endpoint), but they have a binary
> pattern that is used to generate a unique key for every request.
> The issue is this binary pattern is stored in the application, and
> is always the same for every user - also someone had already
> posted it online so I didn't even need to look into the iOS
> executable to extract the key - so at this point, I was able to
> just start sending requests to snapchat and it had no idea the
> requests were not coming from the official clients.

**What's working** (the original used em-dashes for the asides; this
extract has them converted to hyphens-with-spaces, which is the
modern Alex-voice convention. Same content, ban-compliant
punctuation):

- **"already better than Instagram"** is a side-jab made via a
  factual aside, with attribution to a specific friend's work. Stays
  factual; doesn't editorialise.
- **"someone had already posted it online so I didn't even need to..."**
  confesses the easy path. The story is more compelling for the
  honesty.
- **"it had no idea the requests were not coming from the official
  clients"** is a flat statement of result. No "I was able to
  successfully", just "it had no idea".

If you see an em-dash in a piece of Alex's older writing while
calibrating, treat it as a historical artefact, not a licence to use
one yourself. Replace with ` - ` or restructure into parens.

---

## Sample 9 - "Hardly punishment at all" (Snapchat interview)

> With third-party apps, breaking the terms of service isn't risky at
> all. I could publish an app to the App Store that breaks my own
> terms or conditions, and the worst thing that will happen to me
> (depending on severity) will be my application gets pulled from
> the App Store. Hardly punishment at all.

**What's working:**

- **"Hardly punishment at all."** - three-word punch closing a longer
  paragraph. Carries the dry tone.
- **"(depending on severity)"** - parenthetical qualifier that
  acknowledges the rule's nuance without derailing the point.

---

## Sample 10 - Self-introduction (Warm welcome to LangWatch)

> Hey there 👋, I'm Alex - an Engineer at LangWatch. OpenTelemetry
> fetishist, and in a proud love/hate relationship with Python,
> especially after this project. I jumped aboard at the start of
> March, with my first week being the usual early stage startup
> scavenger hunt, learning about the business, mapping out the repo,
> finding where all the bodies are buried, and trying to figure out
> why Python won't install using the exact same command your
> colleague just used.

**What's working:**

- **"Hey there 👋"** - emoji used as punctuation. Sets the tone for an
  introduction without being twee.
- **"OpenTelemetry fetishist"** - characterising self in three words.
  Beats "passionate observability advocate" 100 times out of 100.
- **"proud love/hate relationship with Python"** - admission of
  ambivalence. An LLM would say "deep expertise in".
- **"finding where all the bodies are buried"** - colloquialism for
  "reading the codebase to understand the dark corners". Specific
  and useful.
- **"why Python won't install using the exact same command your
  colleague just used"** - a universally-relatable shared frustration.
  Makes the writer human.

---

## Sample 11 - Tech metaphor that earns it (Warm welcome to LangWatch)

> Think of OpenTelemetry as the USB-C of observability: one open,
> language & vendor-agnostic standard that works the first time, no
> flipping it round 3 times… Plug the LangWatch endpoint into any
> OpenTelemetry compatible collector and watch the spans flow.

**What's working:**

- **The metaphor maps**: USB-C is a standard, multi-vendor,
  multi-platform, works-without-fiddling. So is OpenTelemetry. The
  comparison earns its place.
- **"no flipping it round 3 times"** - the small extra detail that
  shows the writer knows what they're invoking. USB-C is universal,
  but more importantly it goes in the first time. That's the actual
  parallel.
- **"…"** - ellipsis used for a small narrative pause, not as a
  trailing-off cop-out.
- **"Plug ... watch the spans flow."** - direct second-person.

**Why this works as a tech metaphor**: it's a concrete, well-known
*thing* (USB-C) compared to another concrete *thing* (OpenTelemetry),
with the comparison rooted in a specific shared property (universal,
plug-and-play). Not "X is like a Swiss Army knife" - which is meaningless.

---

## Sample 12 - "Tired / Wired" framing (Warm welcome to LangWatch)

> Tired: Our existing Python SDK used a custom interpretation of the
> trace and span pluming that OpenTelemetry standardises. This felt
> like a good option at the start, especially as OpenTelemetry at
> the time had no GenAI standards defined and the ecosystem was
> moving so quickly. But this has ended up with some less than
> ideal problems for us, and users alike. Hand-rolled spans,
> inconsistent and non-portable data structures, and a full
> exporter-collector we had to babysit.
>
> Wired: Now we're pulling up to the function with native
> OpenTelemetry spans, context propagation, baggage, battle-tested
> exporters and processors that "just work". Not to mention
> incredible documentation to boot.

**What's working:**

- **The "Tired/Wired" framing** is itself a reference (the Wired
  magazine column), used as a structural device. It works because
  it's a clean before/after structure that doesn't require the
  writer to say "before/after".
- **"This felt like a good option at the start"** - honest about why
  the old choice existed. Doesn't paint the previous-self as foolish.
- **"a full exporter-collector we had to babysit"** - characterises
  the old pain in five words.
- **"pulling up to the function"** - slang. "Function" as a place
  you arrive at, not a thing you call. Sets the tone.

---

## Sample 13 - Honest about the awkward (Warm welcome to LangWatch)

> As someone we all have weird feelings about now used to say "The
> best part is no part". Being able to strip out all the additional
> overhead we were maintaining and growing means we can spend much
> more time shipping the features that matter, and give you the
> confidence you need to ship as quick as you like.

**What's working:**

- **"someone we all have weird feelings about now"** - refers to a
  contentious public figure (Elon Musk, in this case) without
  naming them, while acknowledging the awkwardness of the
  reference. Lets the reader fill in the blank and chuckle. An LLM
  would either avoid the quote entirely or attribute it neutrally.
- **The quote is good and lands**: "The best part is no part."
  Quoting it advances the paragraph's argument.

This is a delicate move and not always advisable, but when the
reference is widely-known and the paragraph genuinely benefits from
the quote, the acknowledgement-with-side-eye is more honest than
either pretending the source is uncontroversial or pretending the
quote came from nowhere.

---

## Sample 14 - Looking forward (Warm welcome to LangWatch)

> As I mentioned briefly at the start of this blog post that I hope
> found you well, the longer-term win of this project is the new
> base we have to launch new products, improvements to our existing
> ones, as well as a much deeper integration across the whole
> platform. We have a few very exciting goodies coming, and sooner
> than you might think.

**What's working:**

- **"this blog post that I hope found you well"** - a small joke that
  also gestures at the standard email opener ("I hope this email
  finds you well"). Self-aware about the genre.
- **"goodies"** - informal noun that does work. "Initiatives" would
  be the LLM choice. "Goodies" implies wrapped, slightly fun, gifts.
- **"sooner than you might think"** - earned because the rest of the
  paragraph is concrete enough that the tease feels honest.

---

## Distilled - the moves that show up across all three pieces

Read across the samples and the same handful of techniques keep
appearing:

1. **Concrete first, abstract second.** "Shovelling coal" before
   "re-architect". "10-20 events per second" before "improved
   throughput". "USB-C" before "OpenTelemetry".
2. **Asides for the honest / funny bits.** Always in parens or
   hyphen-bracketed clauses, never as their own sentence.
3. **Three-word punches** for paragraph closers. "An afternoon."
   "Hardly punishment at all." "Tough luck mate."
4. **British, plain, contracted.** "We did", "we've got", "it's not",
   "couldn't". Never "we have done", "we have to", "it is not", "could
   not".
5. **References when they map.** Daft Punk for iterative
   improvement; Sonic for speed; USB-C for universal plug-in;
   Wired magazine for before/after. The reference earns its
   inclusion by mapping cleanly to the point being made.
6. **Honesty about the messy parts.** "Sweaty migrations",
   "regrets along the way", "scavenger hunt", "why Python won't
   install". The credibility comes from showing the seams.
7. **Confident understatement on the brags.** "Pretty sure".
   "Suspiciously good fit". "Hardly punishment at all". The
   restraint is what makes the claim land.

When ghost-writing for Alex, the question to ask paragraph by
paragraph: *which of these moves is appropriate here?* If none are,
the paragraph might still be fine. But across a piece, several of
them should be present - that's what makes it sound like him.
