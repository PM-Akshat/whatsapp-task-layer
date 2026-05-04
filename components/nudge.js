/**
 * components/nudge.js — Stale "Waiting" task detection
 *
 * PRODUCT INTENT:
 * "Waiting" tasks represent things you're blocked on someone else for.
 * Without a follow-up mechanism, they rot in the sidebar — defeating the
 * purpose of using a task type that explicitly means "blocked on a human".
 *
 * This module surfaces Waiting tasks that are >= STALE_THRESHOLD_DAYS old
 * (measured from createdAt OR lastNudgedAt, whichever is more recent) so
 * the user is prompted to follow up.
 *
 * The user can "Mark as nudged" which sets lastNudgedAt to now, hiding the
 * task from the stale list for another STALE_THRESHOLD_DAYS. The actual
 * follow-up is manual (a WhatsApp message); this module just surfaces the
 * intent at the right time.
 *
 * KEY DECISIONS:
 *   - 3 days, not 2: matches the cadence of business communication on
 *     WhatsApp (people don't reply same-day, weekends exist).
 *   - Only Waiting tasks, not To-do: To-dos are on YOU. Stale Waiting tasks
 *     are on someone else, which is the actionable insight.
 *   - We don't auto-close or auto-message: surfacing > automating, because
 *     the user knows context we don't.
 */

"use strict";

window.WTL = window.WTL || {};

WTL.nudge = (() => {
  const STALE_THRESHOLD_DAYS = 3;
  const STALE_THRESHOLD_MS = STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

  /**
   * Determine the "freshness anchor" for a task — the most recent moment
   * the user actively engaged with it. Used to decide if it's stale.
   */
  function _getFreshnessAnchor(task) {
    return Math.max(
      task.lastNudgedAt || 0,
      task.updatedAt    || 0,
      task.createdAt    || 0
    );
  }

  /**
   * Compute how many days have passed since the freshness anchor.
   */
  function daysSinceLastEngagement(task) {
    const anchor = _getFreshnessAnchor(task);
    if (!anchor) return 0;
    const diffMs = Date.now() - anchor;
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  }

  /**
   * Is this task a stale Waiting task that needs surfacing?
   *
   * Rules:
   *   - taskType === 'waiting'
   *   - status === 'open' (done tasks don't need nudging)
   *   - freshness anchor is older than STALE_THRESHOLD_MS
   */
  function isStaleWaiting(task) {
    if (!task) return false;
    if (task.taskType !== 'waiting') return false;
    if (task.status !== 'open') return false;
    const anchor = _getFreshnessAnchor(task);
    if (!anchor) return false;
    return (Date.now() - anchor) >= STALE_THRESHOLD_MS;
  }

  /**
   * Filter a tasks array to return only stale Waiting tasks,
   * sorted by stalest-first (oldest anchor first).
   */
  function getStaleWaitingTasks(tasks) {
    return tasks
      .filter(isStaleWaiting)
      .sort((a, b) => _getFreshnessAnchor(a) - _getFreshnessAnchor(b));
  }

  /**
   * Mark a task as nudged — resets its freshness anchor to now.
   * Returns the updated task. Caller is responsible for persisting.
   */
  async function markAsNudged(taskId) {
    const task = await WTL.storage.getTask(taskId);
    if (!task) throw new Error('Task not found: ' + taskId);
    const daysStale = daysSinceLastEngagement(task);
    await WTL.storage.updateTask(taskId, { lastNudgedAt: Date.now() });
    // Fire-and-forget analytics
    if (WTL.analytics) {
      WTL.analytics.track('nudge_followed_up', { daysStale });
    }
    return WTL.storage.getTask(taskId);
  }

  /**
   * Backfill lastNudgedAt for any task missing it. Idempotent.
   * Run once at init so existing v1 tasks don't all surface as stale.
   */
  async function migrateExistingTasks() {
    const tasks = await WTL.storage.getAllTasksArray();
    let migrated = 0;
    for (const task of tasks) {
      if (task.lastNudgedAt === undefined) {
        await WTL.storage.updateTask(task.id, {
          lastNudgedAt: task.createdAt || Date.now()
        });
        migrated++;
      }
    }
    if (migrated > 0) {
      console.log('[WTL/nudge] Migrated ' + migrated + ' tasks with lastNudgedAt');
    }
    return migrated;
  }

  return {
    STALE_THRESHOLD_DAYS,
    isStaleWaiting,
    getStaleWaitingTasks,
    daysSinceLastEngagement,
    markAsNudged,
    migrateExistingTasks
  };
})();
