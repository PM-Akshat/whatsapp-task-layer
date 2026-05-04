# Chrome Web Store — Pre-publish Checklist (v2.0)

A step-by-step guide to publishing this extension as **unlisted**, so
you can share a private install link in your LinkedIn post / interviews
without subjecting yourself to the wider Chrome Web Store discovery
algorithm yet.

## Why unlisted first?

- **Real:** "Published on the Chrome Web Store" is more credible than
  "load unpacked from a GitHub zip." Recruiters can install in 2 clicks.
- **Controlled:** Only people with the link can find it. No exposure
  to bad reviews, support requests, or random installs while you're
  still iterating.
- **Free upgrade path:** Flipping unlisted → public is one toggle when
  you're ready.

## Step 1 — Pay the $5 developer registration fee

1. Go to https://chrome.google.com/webstore/devconsole/
2. Sign in with the Google account you want associated with this
   extension. Use a personal account, not a work account.
3. Pay the one-time $5 USD fee.
4. Complete the developer profile (name, email, optional URL).

This unlocks publishing for life across all extensions.

## Step 2 — Prepare the package

The Chrome Web Store accepts a ZIP file. Build it like this:

```bash
cd /path/to/whatsapp-task-layer

# Zip the CONTENTS of the folder, not the folder itself.
# This way manifest.json sits at the root of the ZIP.
zip -r ../whatsapp-task-layer-v2.0.zip . \
  -x "docs/CHROME_WEB_STORE.md" \
  -x ".git/*" \
  -x "*.DS_Store"
```

**Verify the structure:**
```bash
unzip -l ../whatsapp-task-layer-v2.0.zip | head
```

You should see `manifest.json` listed without any folder prefix. If
you see `whatsapp-task-layer/manifest.json`, the zip is wrong —
recreate from inside the folder, not from above it.

We're excluding `docs/CHROME_WEB_STORE.md` because this guide is for
you, not the user. We're keeping `docs/PRIVACY.md` in the zip so
users can read it from their installed extension folder if they're
curious.

## Step 3 — Capture screenshots (1280×800)

Chrome requires at least 1 screenshot, max 5. I recommend 4:

1. **The hover button** — message bubble with "+ Task" appearing.
   Pick a "task-able" message like "Can you send the invoice by
   Friday?"
2. **The task modal** — open, with type/deadline/notes visible
3. **The sidebar populated** — 4-5 tasks across types, mix of
   overdue/today/upcoming
4. **The Follow-up section** — your v2 differentiator. Force-trigger
   it via DevTools → Application → chrome.storage.local → edit a
   Waiting task's `createdAt` to 4 days ago.

Tools:
- macOS: Cmd+Shift+4 + Space, click window
- Windows: Win+Shift+S
- Resize to exactly 1280×800: https://www.iloveimg.com/resize-image

**Use fake-but-realistic data.** Don't show actual personal chats.
Create a test conversation specifically for screenshots.

## Step 4 — Submit on the developer console

1. Go to https://chrome.google.com/webstore/devconsole/
2. Click **"New Item"** (top right)
3. Upload the ZIP — wait ~30 seconds for processing

You'll land on the listing form. Fill in each tab:

### Store listing tab

**Title:** WhatsApp Task Layer
*(If reviewer flags trademark, fall back to "Task Layer for WhatsApp")*

**Summary** (132 char max):
> Turn WhatsApp Web messages into tracked tasks. To-dos and Waiting items, with follow-up nudges. Local-only, fully private.

(126 chars — fits.)

**Description** (paste this):

```
WhatsApp is the operating system of small-business coordination — and
action items get buried in chat threads. WhatsApp Task Layer adds a
lightweight task tracker directly into WhatsApp Web, so commitments
turn into trackable to-dos without leaving the conversation.

KEY FEATURES

→ One-click task capture
Hover any message and click "+ Task". Set the type (To-do or Waiting),
optional deadline, optional notes. Done.

→ Two task types that reflect reality
"To-do" = it's on you. "Waiting" = it's on someone else. Different
states, different workflows.

→ Follow-up nudges for Waiting tasks
If a Waiting task has been idle for 3+ days, it surfaces in a
"Follow up?" pinned section. Soft surface, not nag — the user knows
context the extension doesn't.

→ Cross-chat navigation
"View in chat" jumps you to the original message in any chat — even
if the chat isn't currently visible in your sidebar.

→ Sidebar with filters
All your tasks in one panel. Filter by Due Today / Overdue / type.
Mark as done with one click. Toggle with Alt+T.

→ Privacy-first, fully local
Tasks stored locally in your browser. No account, no login, no sync
server, no analytics, no tracking. Nothing leaves your device.

→ Zero dependencies
~15KB of vanilla JavaScript. No React, no jQuery, no tracking SDKs.

WHO IT'S FOR

Small-business operators, freelancers, agency folks, and anyone who
runs ops in WhatsApp. If "I forgot, sorry" is a phrase you've used
in a client thread, this is for you.

PRIVACY

This extension reads only the rendered DOM of WhatsApp Web. It cannot
access your encrypted messages, your contacts, or anything outside
the active page. All task data lives in your browser. Nothing is
transmitted to any server.

This extension is not affiliated with WhatsApp or Meta.
```

**Category:** Productivity

**Language:** English

### Graphics tab

- Upload your 4 screenshots (1280×800 each)
- **Small promotional tile (440×280):** Required. Make a simple
  banner with the extension icon + "WhatsApp Task Layer" text. Use
  Canva (free, has Chrome extension banner templates) or Figma.
- **Marquee promo tile (1400×560):** Optional, skip for now.

### Privacy practices tab (most important)

**Single purpose statement:**
> Add task management to WhatsApp Web messages.

**Permission justifications:**

- **`storage`:** *Stores user-created tasks locally on the user's
  device via chrome.storage.local. Without this permission, no task
  data could persist between browser sessions.*

- **`host_permissions: web.whatsapp.com`:** *Required to inject the
  task UI (hover button, sidebar) into WhatsApp Web pages so users
  can create and view tasks from messages. The extension only runs
  on web.whatsapp.com.*

**Data usage disclosures:**

The form will ask if you collect any of these data types: PII,
financial info, health info, etc. **Check NONE of them.** v2.0
collects nothing.

The form may also ask:
- "Is data transferred to third parties?" → No
- "Is data sold?" → No
- "Is data used for advertising?" → No

**Privacy policy URL:** Paste the GitHub URL of your
`docs/PRIVACY.md` file. Format:
```
https://github.com/YOUR_USERNAME/whatsapp-task-layer/blob/main/docs/PRIVACY.md
```

**Certify** the data usage disclosures are accurate.

### Distribution tab

- **Visibility: Unlisted** ← CRITICAL
- **Regions:** All regions

Click **"Submit for review"**.

## Step 5 — Wait for the email

Chrome's reviewers typically respond in 1-3 business days. You'll
get one of:

- ✅ **Approved:** You receive an install URL like
  `https://chrome.google.com/webstore/detail/whatsapp-task-layer/abc...`
  Save it.

- ⚠️ **Rejected with feedback:** They'll tell you what's wrong. Fix
  and resubmit; subsequent reviews are usually faster.

## Common rejection reasons (read once, save yourself a week)

1. **Vague permission justifications.** "For functionality" is not
   enough. Be specific about which feature uses each permission.
   (The justifications above are specific enough — copy them
   verbatim.)

2. **Privacy policy doesn't match the extension.** If your policy
   mentions data collection but `permissions` doesn't include
   network access, that's contradictory. Ours doesn't have this
   problem (no network permissions, no data collection claimed).

3. **Trademark issues.** "WhatsApp" in your extension name. Meta has
   tolerated extension names with "WhatsApp" for years (e.g.,
   "WhatsApp Web Plus", "Booster for WhatsApp"). To be safe, have
   "Task Layer for WhatsApp" ready as a fallback name.

4. **Screenshots don't match the extension.** If your screenshots
   look like a different product or are heavily edited, reviewers
   reject. Take real screenshots from a live install.

5. **Description over-promises.** Don't claim features you don't
   have. Stick to what's actually in v2.0.

## Step 6 — After approval

- **Test the install URL** in a fresh Chrome profile (or incognito
  with extensions enabled) to confirm it installs and works for
  someone other than you.
- **Save the URL.** This is what goes in:
  - Your LinkedIn post
  - Your portfolio
  - Cousin invite messages
  - Resume

## When to flip from Unlisted to Public

Wait until you have:
- 10+ unsolicited users beyond friends/family
- Zero serious bugs reported in 2 consecutive weeks
- A working support email (or "report issue" link in the extension)
- A clearer answer on whether you'll keep maintaining it

Then toggle visibility to public from the developer console. Don't
rush this — public extensions get random installs, random bug
reports, and random 1-star reviews from people who didn't read the
description.

---

Ship it.
