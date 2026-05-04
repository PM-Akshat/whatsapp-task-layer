# Privacy Policy — WhatsApp Task Layer

**Version:** 2.0
**Effective:** 2026-05-04
**Last updated:** 2026-05-04

This privacy policy describes what data WhatsApp Task Layer ("the
extension") collects, why, and how you can control it.

## Summary in plain English

Your tasks live entirely on your device. **Nothing is transmitted to
me, to any server, or to any third party.** There is no account,
no login, no analytics, no tracking, no telemetry.

If this changes in a future version, the change will be opt-in,
clearly disclosed in this policy, and require explicit consent before
anything is sent.

## What's stored on your device

The extension stores the following in your browser's local storage
(`chrome.storage.local`), accessible only to the extension on your
own computer:

- Your tasks: message preview text, task type (To-do or Waiting),
  deadline, notes, status (open or done), the chat name and sender
  extracted from the visible WhatsApp page.
- A randomly-generated install ID (a UUID). This is reserved for a
  future opt-in telemetry feature; in v2.0 it is generated but never
  transmitted.

This data never leaves your computer. The extension cannot access
your encrypted WhatsApp messages — it only reads what's already
visible in the rendered web page.

## What's never collected

- The text of any WhatsApp message (beyond what you choose to save as
  a task on your device)
- Names of chats or contacts
- Your IP address
- Your name, email, phone number, WhatsApp account info, Google account
  info, or any other identifier
- Browsing history outside the extension
- Any data from any website other than `web.whatsapp.com`

## Permissions explained

The extension requests two permissions:

- **`storage`** — Required to save your tasks locally on your device
  via `chrome.storage.local`. Without this, no task data could persist
  between sessions.
- **`host_permissions: https://web.whatsapp.com/*`** — Required to
  inject the task UI (hover button, sidebar) into WhatsApp Web pages.
  The extension does not run on any other website.

The extension does not request, and does not have, permission to
access any other tab, site, or browser data.

## Third-party services

None. The extension uses zero analytics SDKs, zero trackers, zero
external libraries that phone home. The full source code is published
on GitHub and is auditable line-by-line.

## Changes coming in v2.1

A future version (v2.1) is planned to introduce **opt-in anonymous
usage telemetry** to help understand which features people actually
use. When v2.1 ships:

- The extension will show a clear consent prompt the first time the
  sidebar opens.
- Nothing will be transmitted unless and until you click "Help out"
  on that prompt.
- This privacy policy will be updated with full disclosure of every
  event collected and what fields it contains.
- You will be able to opt out at any time via a Privacy panel in
  the sidebar, and uninstalling the extension always severs all
  data flow.

If v2.0 is the version installed, none of the above is active. v2.0
remains a local-only extension.

## How to verify these claims

The extension is fully open source. You can:

- Read the source code at https://github.com/PM-Akshat/whatsapp-task-layer
- Open Chrome DevTools while using WhatsApp Web, switch to the Network
  tab, and confirm that the extension makes zero network requests
- Check the extension's permissions in `chrome://extensions/` and
  verify it only has access to `web.whatsapp.com`

## How to remove all stored data

Uninstalling the extension from `chrome://extensions/` deletes all
stored task data. There is no copy on any server because no copy
was ever transmitted.

## Contact

If you have questions, find a bug, or want to give feedback:

- Email: akshat1603gupta@gmail.com
- GitHub: https://github.com/PM-Akshat/whatsapp-task-layer/issues
- LinkedIn: https://www.linkedin.com/in/akshat-g16/

Built by Akshat Gupta.

---

This policy is intentionally written in plain English. If anything is
unclear, please reach out — I'll fix it.
