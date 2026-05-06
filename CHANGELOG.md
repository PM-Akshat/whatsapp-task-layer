# Changelog — WhatsApp Task Layer

## [2.0.2] — 2026-05-05 (Bugfix follow-up)

### Fixed
- **Timestamp suffix REALLY removed now.** v2.0.1 didn't fix the bug because:
  - WhatsApp concatenates timestamps without whitespace ("Friday6:28 PM"), but the regex required a leading space
  - Tasks already saved with the bad text remained in storage even after the extraction fix
  
- **Two-part fix:**
  1. **Better extraction (`utils.js`):** Now prefers `span.selectable-text` (the actual message container) over `copyable-text` (which includes metadata). Updated regex to handle the no-whitespace case: `/\s*\d{1,2}:\d{2}\s*(AM|PM|am|pm)?\s*$/` (note `\s*` instead of `\s+`)
  2. **Cleanup migration (`storage.js`):** New `cleanupTimestampSuffixes()` function runs once on extension load, scrubbing existing tasks that were saved with the bug. Idempotent and safe.

### Result
**Before (v2.0.0/v2.0.1):** "Can you send the invoice by Friday?6:28 PM"  
**After (v2.0.2):** "Can you send the invoice by Friday?"

Existing tasks in your storage are also cleaned up automatically on next extension load.

---

## [2.0.1] — 2026-05-05 (Attempted fix — incomplete)

### Fixed (partially)
- First attempt at fixing the timestamp suffix bug. Did not fully resolve because the regex required whitespace before the timestamp, but WhatsApp concatenates without space.

---

## [2.0.0] — 2026-05-04 (Initial Release)

- Follow-up nudges for stale Waiting tasks (3+ days)
- Cross-chat navigation via search box
- Sidebar with filters (All / Due Today / Overdue, All / To-do / Waiting)
- Local-only storage, zero telemetry in v2.0
- Chrome Web Store ready
