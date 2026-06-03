# UX audit checklist — long form

Load this when you need a structured reminder of what to look at. Most
audits only touch a subset; the goal is not to mechanically tick every box,
it's to make sure you didn't miss a category because you didn't think of it.

## Visual hierarchy

- The most important action on the screen is the most prominent button.
- Primary vs. secondary vs. tertiary actions are visually distinct.
- Headings are sized in a way that maps to the information hierarchy
  (`h1 > h2 > h3` is reflected visually, not just semantically).
- Important information is not hidden behind hover, a click, or a scroll.

## Affordances

- Buttons look like buttons. Links look like links. Don't dress a `div` up
  as a button without `role=button` and keyboard handlers.
- Disabled states actually look disabled (lower contrast, no hover effect,
  cursor:not-allowed).
- Read-only fields are visually distinct from editable ones.
- Drag handles, resize handles, sort handles are discoverable.

## State coverage

For any screen that renders dynamic data, check that **all five** of these
states are designed:

1. **Loading** — shown while data is fetching. Skeleton for content; spinner
   for actions. No raw "Loading…" text on a critical screen.
2. **Empty** — no data yet. Designed empty state with a clear CTA, not
   a blank screen.
3. **Partial / pending** — some data, more coming, or some pending writes.
4. **Populated** — the main happy state. Verify layout with realistic
   amounts of data.
5. **Error** — fetch failed, validation failed, permission denied. Each
   error message should be specific, recoverable, and not a stack trace.

Bonus: **Stale / offline** — what does the UI do when the network is gone
and there's cached data?

## Forms

- Required vs. optional fields are clearly marked.
- Inline validation appears next to the field, not just in a toast.
- Errors clear when the user fixes them — don't make the user resubmit to
  find out.
- The first invalid field gets focused on submit.
- Submit button is disabled or shows a spinner while submitting; doesn't
  allow double-submission.
- Long forms have section headers or a progress indicator.
- Auto-focus the first field on load (only when appropriate — not on a
  form below the fold).
- Use the right input types (`email`, `tel`, `number`, `url`) so mobile
  keyboards are sensible.
- Sensible `autocomplete` values on every input that takes user identity
  data.
- Don't put cancel and submit in the same visual weight — submit is
  primary, cancel is text-link or ghost.

## Destructive actions

- Confirmation dialog with explicit, specific text — not "Are you sure?"
  but "Delete the project 'Q3 launch'? This cannot be undone."
- Confirmation button is destructive-colored (red) and the default-focused
  button is the *non*-destructive one.
- Where possible, undo is offered instead of (or in addition to)
  confirmation. Undo is better UX than confirmation, when feasible.

## Feedback

- Every action provides feedback within 100ms (a press state, a focus
  ring, a loading indicator).
- Operations longer than 1s show a progress indicator.
- Operations longer than 10s show progress *and* an estimate or cancel
  affordance.
- Success states are visible and dismissable — toast, inline confirmation,
  state transition.
- Failures are explicit. Silent failures are the worst UX.

## Keyboard

- Tab order matches visual reading order.
- Focus is visible everywhere (no `outline: none` without a replacement).
- Modal dialogs trap focus and return it to the trigger on close.
- Route changes move focus to the new page's heading or main landmark.
- `Esc` closes modals/popovers/dropdowns.
- `Enter` submits the focused form.
- All interactive elements are reachable by keyboard.
- Skip-link to main content if there's a long header / nav.

## Touch / mobile

- Tap targets are ≥ 44×44 CSS pixels.
- Adjacent tap targets have spacing between them.
- Pinch-zoom isn't disabled.
- Forms don't get covered by the on-screen keyboard (scroll the focused
  field into view).
- Hover-only affordances have a touch equivalent.

## Responsive

- 320px wide (smallest reasonable phone): no horizontal scroll. Content is
  legible.
- 375px (iPhone SE-class): primary actions accessible without scrolling.
- 768px (tablet portrait): layout adapts, doesn't just stretch the phone
  layout.
- 1024px+ (desktop): doesn't feel sparse on big screens — content has a
  max-width but the surrounding area isn't visually broken.

## Color & contrast

- Text contrast ≥ 4.5:1 against background (WCAG AA for normal text).
- Large text (18pt+ or 14pt bold) ≥ 3:1.
- Don't convey meaning by color alone. A red dot is "error" + an icon /
  label, not just red.
- Charts and graphs work in greyscale (use shape + color, not color alone).
- Dark mode (if supported): no hard-coded `#fff`/`#000`; component shadows
  visible without being harsh.

## Motion

- Respect `prefers-reduced-motion`. Animations that move things around
  should be replaced with fades or instant transitions.
- No animation longer than ~300ms blocks user interaction.
- No autoplay video with sound.
- Avoid layout shift (CLS). Reserve space for images and async-loaded
  content.

## Content

- Empty states have helpful, specific copy — not "No data."
- Error messages are specific — "Couldn't save: title is required" beats
  "Error."
- Don't use jargon or internal terminology in user-facing strings.
- Numbers, dates, and currency are localized (or at least format-aware).
- Time zones are explicit ("3pm UTC" not just "3pm" for global apps).

## Performance

- LCP (Largest Contentful Paint) < 2.5s on the route's primary content.
- No long tasks (> 50ms) on initial load that would block input.
- Images have explicit dimensions to prevent layout shift.
- Critical fonts are preloaded; non-critical fonts use `font-display: swap`.
- JS bundle for the route is reasonable for what it does (a 2MB bundle to
  show a list of 3 items is a smell).

## Accessibility (a11y) basics

- Every interactive element has an accessible name (`aria-label`, visible
  text, `aria-labelledby`).
- Form fields are labelled with `<label for>` or `aria-labelledby`.
- Decorative icons have `aria-hidden="true"`.
- Pages have one `<h1>`.
- Landmarks (`<main>`, `<nav>`, `<header>`, `<footer>`) are present and
  used correctly.
- Live regions (`aria-live`) for dynamic updates that the user wouldn't
  otherwise notice.
- Color is never the only signal for state.

## Confirmation patterns (escalation ladder)

In order of intrusiveness — use the lightest one that fits the risk:

1. **No confirmation, with undo** — for reversible actions.
2. **Inline confirmation** — "Click again to confirm" for moderate-risk
   actions.
3. **Modal confirmation** — for destructive or expensive actions.
4. **Modal with typed confirmation** — typing the resource name — for
   irreversible, high-blast-radius actions (deleting a project, dropping
   a database).

## Smells to flag

- `Loading…` text on a hero-level data fetch.
- Spinners that flash for < 200ms (use a delay).
- Toasts as the only error-reporting mechanism.
- Confirmation dialogs with default-focused destructive button.
- Form submits that POST to a different page (full reload) when SPA is
  expected.
- Layout that breaks at 320px width.
- Anchor tags styled as buttons but missing `role="button"`.
- Buttons with no text and no `aria-label`.
- Form fields with placeholder text instead of a label.
- Click handlers on `<div>`s without keyboard support.
- Hard-coded colors for status — red for "live data feed", green for
  "stopped" (always check with someone color-blind in mind).
