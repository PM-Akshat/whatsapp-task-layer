# WhatsApp Task Layer

> Tasks where the conversation happens. A Chrome extension that turns
> WhatsApp Web messages into tracked to-dos, without leaving the chat.

---

## Product Brief

### Problem

WhatsApp is the operating system of small-business coordination across
much of the world — particularly in markets like India, Brazil, the UAE,
and Southeast Asia. Freelancers, agencies, and small operators run
client work, supplier relationships, and team logistics in WhatsApp
threads. Action items live inside conversations: *"can you send the
invoice by Friday?"*, *"need this approved before the meeting"*, *"will
get back to you tomorrow."*

These commitments get buried under the next 50 messages, and people
forget. The cost is real: missed deadlines, dropped balls with clients,
the slow erosion of "I forgot, sorry" exchanges.

### Target user

The primary user is the **small-business operator who runs ops on
WhatsApp** — agency founders, freelancers, traders, supply-chain
coordinators. They have 5-30 active conversations across personal and
group chats, each carrying a few open commitments at any time. They are
WhatsApp-native; they tried Notion or Trello once and it didn't stick
because their counterparts aren't there.

A secondary user is the **WhatsApp-heavy team operator** — someone
running a small ops team where Slack hasn't been adopted because
half the people are external (vendors, contractors).

### Insight

People don't want another task app. They want their existing chat
behaviour, instrumented. Every "task app for WhatsApp" attempt I've seen
fails the moment it asks the user to forward messages, copy-paste, or
maintain a parallel system. The only way this works is if tasks live
**in** WhatsApp — visible at the message, manageable in a side panel,
zero context switching.

### Hypothesis

If users can mark a message as a task in one click without leaving
WhatsApp Web, and if the system gently surfaces things they're waiting
on, follow-through rates on commitments will improve. They will not
abandon the tool the way they abandon standalone task apps, because the
incremental cost is near-zero.

### Key product decisions (and the alternatives I considered)

**Two task types, no priority levels: "To-do" vs "Waiting".**
The simplest distinction that maps to the actual emotional difference:
*it's on me* vs *it's on someone else*. I considered High/Med/Low
priority but rejected it — small operators don't triage, they react.
Adding priority would slow down the "one click to capture" promise.
"Waiting" earns its place because being blocked on a human is a
distinct state that needs a distinct workflow (see: nudges, below).

**Local-first storage, opt-in telemetry.**
All tasks live in `chrome.storage.local`. There is no account, no login,
no sync server. This is a *feature*, not a limitation: it means zero
trust burden on the user, zero privacy risk, zero "they'll see my
chats" paranoia (legitimate, given the user base). The cost is that
data doesn't sync across browsers — an acceptable trade for v1. I added
opt-in anonymous telemetry in v2 to learn which features people actually
use; users decline the prompt and the extension behaves identically.

**Nudges for stale "Waiting" tasks, not "To-do" tasks.**
A "To-do" you haven't done is on you — surfacing it adds nag without
information. A "Waiting" task that's gone 3+ days without an update is
genuinely actionable: *you need to follow up with that person*. The
distinction matters. The nudge is a soft surface ("Follow up?") not an
alarm — the user knows context we don't (the recipient is on holiday;
the matter is no longer urgent).

**No automated follow-ups.**
The extension does not send WhatsApp messages on the user's behalf,
even when nudging. This was tempting — "auto-draft a follow-up message"
would be a great demo — but it would (a) require the extension to
inject text into another person's conversation, which is a trust
violation, and (b) create the worst kind of false-confidence: the user
thinks they followed up when really a generic template went out. Manual
follow-up, surfaced at the right moment, is the right product.

### What I'd do differently / open questions

**The 3-day stale threshold is a guess.** I picked 3 days based on
intuition about business-message cadence (people don't reply same-day,
weekends exist). Real usage data will tell me whether this is too eager
or too slow. The threshold is a single constant — easy to ship a v3
that learns it per-chat.

**Editing a WhatsApp message breaks the link.** The hash-based message
ID changes when the source text changes. The task data is preserved
(it's keyed by task ID, not message ID), but "View in chat" may fail
to scroll. A future fix is to store the hash *and* the data-id
fingerprint, and allow either to match.

**Group chats are second-class.** The sender extraction works, but the
"someone else needs to do something" framing of "Waiting" doesn't
distinguish *which* group member you're waiting on. This is fine for
1:1 conversations; in group chats, users have to put the name in
notes. A v3 could let you tag the awaited person.

---

## What's new in v2.0

- **Follow-up nudges** — Stale "Waiting" tasks (3+ days with no update)
  surface in a pinned "Follow up?" section at the top of the sidebar,
  with an inline "X days waiting" badge. Click "Mark as nudged" after
  you message the person, and the task hides for another 3 days.
- **Cross-chat navigation via search box** — "View in chat" now works
  across all your chats, not just the currently open one. The
  extension uses WhatsApp's own search box to navigate, which survives
  WhatsApp's virtualized chat list.
- **Sidebar footer** — Privacy info and version, always reachable.

> **Coming in v2.1 (post cousin-testing):** opt-in anonymous usage
> telemetry to instrument the three product questions in
> [What I'm measuring](#what-im-measuring-cousin-test-plan). The
> infrastructure is built but dormant — telemetry ships only after
> qualitative validation that the extension itself is solid.

---

## Setup (for local development / unlisted install)

### 1. Clone or download

```bash
unzip whatsapp-task-layer.zip -d ~/Extensions/whatsapp-task-layer
```

### 2. Load the extension

1. Open Chrome → `chrome://extensions/`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked** and pick the project folder

### 3. Open WhatsApp Web

Hover any message → **+ Task** appears. Click it → fill the modal →
**Save Task**. Press **Alt+T** for the sidebar.

---

## Project structure

```
whatsapp-task-layer/
├── manifest.json          Manifest V3 config
├── background.js          Service worker: badge, install detection
├── content.js             Main orchestrator: button injection, navigation
├── utils.js               Helpers: ID derivation, text extraction, dates
├── storage.js             chrome.storage.local abstraction + cache
├── styles.css             All UI styles (zero frameworks)
├── components/
│   ├── modal.js           Task creation/edit modal
│   ├── nudge.js           Stale Waiting detection                  ★ new in v2
│   └── sidebar.js         "My Tasks" sidebar (with v2 follow-up section)
├── icons/                 Extension icons (16/32/48/128)
└── docs/
    ├── PRIVACY.md         Full privacy policy
    └── CHROME_WEB_STORE.md  Pre-publish checklist + listing copy
```

---

## Design decisions & tradeoffs

A reviewer reading the code will find these, but they're worth
surfacing as deliberate choices, not implementation accidents.

**Message identification — tiered fallback (`utils.js`).**
WhatsApp doesn't expose stable message IDs in the DOM. We use a
two-tier approach: Tier 1 is the `data-id` attribute when WhatsApp
sets it (most reliable). Tier 2 is a djb2 hash of `chatId | sender |
text | timestamp`. *Tradeoff:* edited messages break the Tier 2 link
(hash changes), but the task data is preserved by task-ID, not
message-ID, so the worst case is a failed "View in chat" — never lost
data. *Alternatives considered:* DOM position index (too fragile);
WhatsApp's internal Redux store (would require breaking out of the
content script sandbox, not worth the risk).

**Virtualized message list — accept the limit.**
WhatsApp Web only renders messages currently in the viewport. We
cannot scroll to messages that aren't in the DOM. *Decision:* show a
toast ("scroll up to find the message") instead of trying to coerce
WhatsApp's scroller into loading specific messages. *Alternative
considered:* hijacking WhatsApp's "search in chat" feature to jump to
the message — rejected because it's brittle and creates a bad
fallback (search-in-chat shows partial matches, not exact matches).

**Cross-chat navigation — search-box automation (`content.js`).**
v1 could only "View in chat" within the currently open chat. v2 uses
WhatsApp's own search box: programmatically click it, type the chat
name, wait for results, click the matching row, clear the search.
*Tradeoff:* depends on WhatsApp not changing its search box DOM
shape — but the search box is one of the most stable parts of
WhatsApp Web (it's been the same shape since 2020).

**Storage architecture — local + cache + cross-tab sync.**
`chrome.storage.local` with an in-memory cache that's invalidated on
every write. Cross-tab updates fire via `chrome.storage.onChanged`.
*Why not IndexedDB?* Tasks fit in a single small JSON object;
IndexedDB would be over-engineering for the data model. *Why not
sync storage?* `chrome.storage.sync` has a 100KB quota, which a heavy
user would hit in months.

**No framework, no dependencies.**
Zero React, zero Vue, zero jQuery. ~15KB total bundle. *Why:* the
extension lives inside someone else's app (WhatsApp Web), and adding
a framework increases attack surface, slows startup, and risks
conflicts with WhatsApp's own React tree. Vanilla DOM is also
honestly faster for the modest UI we're building.

**Telemetry — deliberately deferred to v2.1.**
v2.0 ships local-only: no backend, nothing transmitted. The infrastructure
for opt-in anonymous telemetry is built but dormant — it will ship in v2.1
once cousin testing validates the extension is actually solid. *Why this
order:* if v2.0 has bugs, telemetry will mostly capture friction with bugs,
not signal about features. Better to validate the product qualitatively
first, then instrument the right questions.

---

## What I'm measuring (cousin-test plan)

v2.0 ships without telemetry — I'm validating qualitatively first, with
5 cousins running small businesses on WhatsApp. Three questions to learn
from:

1. **Are both task types being used?** If 95% of created tasks are
   "To-do" and 5% are "Waiting", the type distinction is dead weight
   and I'd simplify in v3.
2. **Does "View in chat" actually work?** The cross-chat search-box
   navigation depends on WhatsApp's selectors. If success rate dips
   noticeably, I need to ship a fallback.
3. **Does the nudge change behaviour?** If people ignore the "Follow
   up?" section or find it noisy, the feature doesn't earn its place.

Method: 7-10 days of usage, then a feedback form + a 15-minute call
with the most engaged 1-2 users. Quantitative telemetry comes in v2.1
once these qualitative answers tell me what to instrument and why.

---

## Privacy

**TL;DR:** Tasks live entirely on your device. There is no backend,
no account, no telemetry in v2.0. See [`docs/PRIVACY.md`](docs/PRIVACY.md)
for the full policy.

---

## Contributing / feedback

This is a learning project. If you spot a bug, a UX gap, or a
selector that breaks after a WhatsApp update, please open an issue or
ping me on LinkedIn.

---

*Built as a portfolio project to explore product instincts: minimal
scope, deliberate trade-offs, real users.*
