# Samples from Alex's own writing

These excerpts come from three pieces:

- **"Eat Sleep Append Repeat…"** (April 2026): LangWatch's event-sourcing announcement.
- **Snapchat API interview**: a conversational technical Q&A.
- **"A warm welcome to LangWatch"**: joining LangWatch and rewriting the OpenTelemetry SDK.

Read the passages for how Alex explains something he knows to a particular
reader. Their details, opinions and experiences belong to those pieces. Do not
borrow them as facts for a new draft.

Alex rejected drafts made from prescribed asides, short punches and neatly
staged lessons. These samples therefore have no paragraph recipe or required
stylistic devices. A source may contain a phrase or structure that he has since
rejected; his current corrections take precedence. The existing excerpts use
spaced hyphens where the original had em dashes.

## Sample 1 - Opening hook (Eat Sleep Append Repeat)

> For the past couple of months we have been busy shovelling coal in
> the LangWatch engine room. Late last year - perhaps during a foul
> lapse in judgement - we decided to embark on the long and arduous
> journey to re-architect our platform to be event driven. Fast
> forward many late nights, a few sweaty migrations, and increasing
> the market cap of Red Bull by several percentage points, we're
> live and excited to share what this means for you, and how it
> super-charges us for 2026 and beyond 🚀.

## Sample 2 - The throwaway "not a typo" (Eat Sleep Append Repeat)

> Before this re-architecture, our platform could process 10-20 events
> per second. That's not a typo, but it got us to where we are today.
> The bottleneck was ElasticSearch - slow on inserts, which
> constricted how many jobs we could process concurrently.

## Sample 3 - GenAI compared to people (Warm welcome to LangWatch)

> GenAI really is like people. It's not deterministic, they don't
> behave, they even answer back and negotiate. The same prompt can
> cost twice as many tokens between two almost identical requests,
> stall and require multiple retries, or just go on an absolute acid
> trip and reinvent reality. Without rich traces recording prompt
> content, generations params, token counts, model version, latency,
> tool calls, and the ever growing list of features, keeping this
> portion in a black box is unsustainable.

## Sample 4 - The afternoon-of-work brag (Eat Sleep Append Repeat)

> Our billing usage tracking (counting every billable event per
> project per day across the entire platform) was an afternoon of
> work. Not a sprint, or a big project. An afternoon.

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

## Sample 7 - The closing (Eat Sleep Append Repeat)

> If you want to know how the sausage is made, stay tuned. We've got
> a proper technical deep-dive coming next, going into the guts of
> the event sourcing system, what we learned working with ClickHouse,
> and all the architectural decisions (and regrets) along the way.
>
> We'll also be sharing how we built the internal tooling to manage
> all of this infrastructure. Turns out, building developer tools
> inside a developer tool is its own kind of sadistic adventure.

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

## Sample 9 - "Hardly punishment at all" (Snapchat interview)

> With third-party apps, breaking the terms of service isn't risky at
> all. I could publish an app to the App Store that breaks my own
> terms or conditions, and the worst thing that will happen to me
> (depending on severity) will be my application gets pulled from
> the App Store. Hardly punishment at all.

## Sample 10 - Self-introduction (Warm welcome to LangWatch)

> Hey there 👋, I'm Alex - an Engineer at LangWatch. OpenTelemetry
> fetishist, and in a proud love/hate relationship with Python,
> especially after this project. I jumped aboard at the start of
> March, with my first week being the usual early stage startup
> scavenger hunt, learning about the business, mapping out the repo,
> finding where all the bodies are buried, and trying to figure out
> why Python won't install using the exact same command your
> colleague just used.

## Sample 11 - Tech metaphor that earns it (Warm welcome to LangWatch)

> Think of OpenTelemetry as the USB-C of observability: one open,
> language & vendor-agnostic standard that works the first time, no
> flipping it round 3 times… Plug the LangWatch endpoint into any
> OpenTelemetry compatible collector and watch the spans flow.

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

## Sample 13 - Honest about the awkward (Warm welcome to LangWatch)

> As someone we all have weird feelings about now used to say "The
> best part is no part". Being able to strip out all the additional
> overhead we were maintaining and growing means we can spend much
> more time shipping the features that matter, and give you the
> confidence you need to ship as quick as you like.

## Sample 14 - Looking forward (Warm welcome to LangWatch)

> As I mentioned briefly at the start of this blog post that I hope
> found you well, the longer-term win of this project is the new
> base we have to launch new products, improvements to our existing
> ones, as well as a much deeper integration across the whole
> platform. We have a few very exciting goodies coming, and sooner
> than you might think.
