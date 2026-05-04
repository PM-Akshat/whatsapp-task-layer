/**
 * components/sidebar.js — "My Tasks" floating sidebar for WhatsApp Task Layer
 */

"use strict";

window.WTL = window.WTL || {};

WTL.sidebar = (() => {
  let _sidebarEl = null;
  let _toggleBtnEl = null;
  let _isOpen = false;
  let _activeFilter = 'all';
  let _activeTypeFilter = 'all';

  // ─── BUILD ─────────────────────────────────────────────────────────────────

  function _buildSidebar() {
    if (_sidebarEl) return;

    // Toggle button (floating pill)
    _toggleBtnEl = document.createElement('button');
    _toggleBtnEl.className = 'wtl-toggle-btn';
    _toggleBtnEl.setAttribute('aria-label', 'Toggle My Tasks (Alt+T)');
    _toggleBtnEl.setAttribute('title', 'My Tasks (Alt+T)');
    _toggleBtnEl.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
      <span class="wtl-toggle-label">Tasks</span>
      <span class="wtl-badge" id="wtl-badge" style="display:none">0</span>
    `;
    _toggleBtnEl.addEventListener('click', toggle);

    // Sidebar panel
    _sidebarEl = document.createElement('div');
    _sidebarEl.className = 'wtl-sidebar';
    _sidebarEl.setAttribute('role', 'complementary');
    _sidebarEl.setAttribute('aria-label', 'My Tasks');
    _sidebarEl.innerHTML = `
      <div class="wtl-sidebar-header">
        <div class="wtl-sidebar-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          My Tasks
        </div>
        <button class="wtl-sidebar-close" aria-label="Close sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="wtl-sidebar-filters">
        <div class="wtl-filter-row">
          <button class="wtl-filter-chip active" data-filter="all">All</button>
          <button class="wtl-filter-chip" data-filter="today">Due Today</button>
          <button class="wtl-filter-chip" data-filter="overdue">Overdue</button>
        </div>
        <div class="wtl-filter-row">
          <button class="wtl-type-filter active" data-type="all">All Types</button>
          <button class="wtl-type-filter" data-type="todo">✅ To-do</button>
          <button class="wtl-type-filter" data-type="waiting">⏳ Waiting</button>
        </div>
      </div>

      <div class="wtl-sidebar-stats" id="wtl-stats"></div>

      <div class="wtl-task-list" id="wtl-task-list">
        <div class="wtl-empty-state">
          <div class="wtl-empty-icon">📋</div>
          <div class="wtl-empty-text">No tasks yet</div>
          <div class="wtl-empty-sub">Hover over any message and click "Add Task"</div>
        </div>
      </div>

      <div class="wtl-sidebar-footer">
        <button class="wtl-footer-link" id="wtl-privacy-link">Privacy</button>
        <span class="wtl-footer-sep">·</span>
        <span class="wtl-footer-version">v2.0</span>
      </div>
    `;

    // Wire filter chips
    _sidebarEl.querySelectorAll('.wtl-filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        _sidebarEl.querySelectorAll('.wtl-filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeFilter = btn.dataset.filter;
        refresh();
      });
    });

    _sidebarEl.querySelectorAll('.wtl-type-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        _sidebarEl.querySelectorAll('.wtl-type-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeTypeFilter = btn.dataset.type;
        refresh();
      });
    });

    _sidebarEl.querySelector('.wtl-sidebar-close').addEventListener('click', close);

    // ── Privacy footer link ──
    const privacyLink = _sidebarEl.querySelector('#wtl-privacy-link');
    if (privacyLink) {
      privacyLink.addEventListener('click', _showPrivacyDetails);
    }

    document.body.appendChild(_toggleBtnEl);
    document.body.appendChild(_sidebarEl);
  }

  // ─── CONSENT UI ────────────────────────────────────────────────────────────

  /**
   * Show the consent card if the user hasn't responded yet.
   * Called every time the sidebar opens — we want it visible until decided.
   *
   * v2.0 NOTE: Telemetry is dormant (no backend deployed). We hide the
   * consent prompt to avoid asking permission for something we're not
   * actually doing. When v2.1 ships with a live backend, restore the
   * original logic by removing the early `return`.
   */
  async function _maybeShowConsentCard() {
    return; // v2.0: telemetry dormant
    /*
    if (!WTL.analytics) return;
    const consent = await WTL.analytics.getConsent();
    const card = _sidebarEl.querySelector('#wtl-consent-card');
    if (!card) return;
    if (consent === 'unset' || consent === undefined || consent === null) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
    */
  }

  function _hideConsentCard() {
    // v2.0: no-op (consent card is not rendered).
    // Restored in v2.1 when the consent flow returns.
  }

  /**
   * Open the privacy details panel.
   *
   * v2.0: Since telemetry is dormant, the panel just confirms that nothing
   * leaves the user's device. The full panel (with consent toggle and
   * event-by-event disclosure) returns in v2.1 when the backend is live.
   */
  async function _showPrivacyDetails() {
    let panel = document.querySelector('.wtl-privacy-panel');
    if (panel) panel.remove();
    let backdrop = document.querySelector('.wtl-privacy-backdrop');
    if (backdrop) backdrop.remove();

    backdrop = document.createElement('div');
    backdrop.className = 'wtl-backdrop wtl-privacy-backdrop wtl-visible';
    backdrop.addEventListener('click', () => {
      backdrop.remove();
      panel.remove();
    });

    panel = document.createElement('div');
    panel.className = 'wtl-modal wtl-privacy-panel wtl-visible';
    panel.innerHTML = `
      <div class="wtl-modal-header">
        <div class="wtl-modal-icon">🔒</div>
        <h3 class="wtl-modal-title">Privacy</h3>
        <button class="wtl-modal-close" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="wtl-modal-body wtl-privacy-body">
        <p class="wtl-privacy-intro">
          <strong>Your tasks live entirely on your device.</strong>
          Nothing is transmitted anywhere.
        </p>

        <div class="wtl-privacy-section">
          <div class="wtl-privacy-section-title">What's stored locally</div>
          <ul class="wtl-privacy-list">
            <li>Your tasks (in chrome.storage.local)</li>
            <li>The chat name and sender, extracted from the page</li>
            <li>Task notes and deadlines you create</li>
          </ul>
        </div>

        <div class="wtl-privacy-section">
          <div class="wtl-privacy-section-title">What's never collected</div>
          <ul class="wtl-privacy-list wtl-privacy-list-no">
            <li>Nothing leaves your device. There is no server.</li>
            <li>No account, no login, no analytics, no tracking.</li>
          </ul>
        </div>

        <div class="wtl-privacy-section">
          <div class="wtl-privacy-section-title">Questions or feedback?</div>
          <ul class="wtl-privacy-list">
            <li>Email: <a href="mailto:akshat1603gupta@gmail.com">akshat1603gupta@gmail.com</a></li>
            <li>Source code: <a href="https://github.com/PM-Akshat/whatsapp-task-layer" target="_blank" rel="noopener">GitHub</a></li>
          </ul>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    panel.querySelector('.wtl-modal-close').addEventListener('click', () => {
      backdrop.remove();
      panel.remove();
    });
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────

  async function refresh() {
    if (!_sidebarEl) return;

    let tasks = await WTL.storage.getAllTasksArray();

    // Separate open and done
    const openTasks = tasks.filter(t => t.status === 'open');
    const doneTasks = tasks.filter(t => t.status === 'done');

    // Update badge
    _updateBadge(openTasks.length);

    // Compute stale Waiting tasks BEFORE filters so the "Follow up?" pin
    // is independent of which filter the user has set. (A user filtering
    // to "Due Today" should still see follow-ups they need to do.)
    const staleWaiting = WTL.nudge
      ? WTL.nudge.getStaleWaitingTasks(openTasks)
      : [];
    const staleIds = new Set(staleWaiting.map(t => t.id));

    // Apply filters to open tasks
    let filtered = openTasks;

    if (_activeFilter === 'today') {
      filtered = filtered.filter(t => WTL.utils.isDueToday(t.deadline));
    } else if (_activeFilter === 'overdue') {
      filtered = filtered.filter(t => WTL.utils.isOverdue(t.deadline));
    }

    if (_activeTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.taskType === _activeTypeFilter);
    }

    // Sort: overdue first, then by deadline, then by creation
    filtered.sort((a, b) => {
      const aOver = WTL.utils.isOverdue(a.deadline) ? -1 : 0;
      const bOver = WTL.utils.isOverdue(b.deadline) ? -1 : 0;
      if (aOver !== bOver) return aOver - bOver;
      if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return b.createdAt - a.createdAt;
    });

    // Render stats
    const statsEl = _sidebarEl.querySelector('#wtl-stats');
    statsEl.innerHTML = `
      <span class="wtl-stat">${openTasks.length} open</span>
      <span class="wtl-stat-sep">·</span>
      <span class="wtl-stat">${doneTasks.length} done</span>
      ${openTasks.filter(t => WTL.utils.isOverdue(t.deadline)).length > 0
        ? `<span class="wtl-stat-sep">·</span><span class="wtl-stat wtl-stat-overdue">${openTasks.filter(t => WTL.utils.isOverdue(t.deadline)).length} overdue</span>`
        : ''}
      ${staleWaiting.length > 0
        ? `<span class="wtl-stat-sep">·</span><span class="wtl-stat wtl-stat-followup">${staleWaiting.length} to follow up</span>`
        : ''}
    `;

    // Show consent card if needed (non-blocking)
    _maybeShowConsentCard();

    // Render list
    const listEl = _sidebarEl.querySelector('#wtl-task-list');

    if (filtered.length === 0 && doneTasks.length === 0 && staleWaiting.length === 0) {
      listEl.innerHTML = `
        <div class="wtl-empty-state">
          <div class="wtl-empty-icon">📋</div>
          <div class="wtl-empty-text">No tasks yet</div>
          <div class="wtl-empty-sub">Hover over any message and click "Add Task"</div>
        </div>
      `;
      return;
    }

    // Build the list HTML in sections.
    let html = '';

    // ── "Follow up?" section: stale Waiting tasks pinned at top ──
    if (staleWaiting.length > 0) {
      html += `
        <div class="wtl-followup-section">
          <div class="wtl-followup-header">
            <span class="wtl-followup-icon">⏳</span>
            <span class="wtl-followup-title">Follow up?</span>
            <span class="wtl-followup-count">${staleWaiting.length}</span>
          </div>
          <div class="wtl-followup-sub">
            These have been waiting ${WTL.nudge.STALE_THRESHOLD_DAYS}+ days. Nudge the person, or mark as nudged to revisit later.
          </div>
          ${staleWaiting.map(t => _renderTaskCard(t, false, { showStaleBadge: true, showNudgeBtn: true })).join('')}
        </div>
      `;
    }

    if (filtered.length === 0) {
      // Stale section may exist; don't show empty-filter UI in that case
      if (staleWaiting.length === 0) {
        html += `
          <div class="wtl-empty-state">
            <div class="wtl-empty-icon">🔍</div>
            <div class="wtl-empty-text">No matching tasks</div>
            <div class="wtl-empty-sub">Try changing your filters</div>
          </div>
        `;
      }
    } else {
      // Render filtered list, but skip tasks already in the stale section
      // to avoid showing them twice.
      const dedup = filtered.filter(t => !staleIds.has(t.id));
      if (dedup.length > 0) {
        html += dedup.map(task => _renderTaskCard(task, false, {
          showStaleBadge: false,
          showNudgeBtn: false
        })).join('');
      }
    }

    listEl.innerHTML = html;

    // Done tasks section (always show if any)
    if (doneTasks.length > 0) {
      const doneSection = document.createElement('div');
      doneSection.className = 'wtl-done-section';
      doneSection.innerHTML = `
        <div class="wtl-done-header" id="wtl-done-toggle">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          Completed (${doneTasks.length})
        </div>
        <div class="wtl-done-list" id="wtl-done-list">
          ${doneTasks.slice(0, 10).map(task => _renderTaskCard(task, true)).join('')}
          ${doneTasks.length > 10 ? `<div class="wtl-done-more">+${doneTasks.length - 10} more</div>` : ''}
        </div>
      `;
      listEl.appendChild(doneSection);

      // Toggle collapse
      const toggle = doneSection.querySelector('#wtl-done-toggle');
      const doneList = doneSection.querySelector('#wtl-done-list');
      toggle.addEventListener('click', () => {
        doneList.classList.toggle('wtl-collapsed');
        toggle.classList.toggle('wtl-collapsed');
      });
    }

    // Attach card event listeners
    _attachCardListeners(listEl);
  }

  function _renderTaskCard(task, isDone = false, opts = {}) {
    const isOverdue = WTL.utils.isOverdue(task.deadline);
    const isToday = WTL.utils.isDueToday(task.deadline);
    const typeLabel = task.taskType === 'todo' ? '✅ To-do' : '⏳ Waiting';
    const deadlineStr = WTL.utils.formatDeadline(task.deadline);
    const showStaleBadge = !!opts.showStaleBadge;
    const showNudgeBtn = !!opts.showNudgeBtn;

    // Compute days waiting for the badge label (only relevant for stale Waiting tasks)
    let daysStaleLabel = '';
    if (showStaleBadge && WTL.nudge) {
      const days = WTL.nudge.daysSinceLastEngagement(task);
      daysStaleLabel = days + 'd waiting';
    }

    return `
      <div class="wtl-task-card ${isDone ? 'wtl-task-done' : ''} ${isOverdue && !isDone ? 'wtl-task-overdue' : ''} ${showStaleBadge ? 'wtl-task-stale' : ''}"
           data-task-id="${WTL.utils.escapeHtml(task.id)}"
           data-message-id="${WTL.utils.escapeHtml(task.messageId)}">
        <div class="wtl-task-card-header">
          <button class="wtl-check-btn ${isDone ? 'wtl-checked' : ''}"
                  data-action="toggle"
                  aria-label="${isDone ? 'Mark as open' : 'Mark as done'}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
          <div class="wtl-task-text">${WTL.utils.escapeHtml(WTL.utils.truncate(task.messageText, 90))}</div>
          <div class="wtl-task-actions">
            <button class="wtl-icon-btn" data-action="edit" aria-label="Edit task" title="Edit">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="wtl-icon-btn wtl-icon-btn-danger" data-action="delete" aria-label="Delete task" title="Delete">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="wtl-task-meta">
          <span class="wtl-type-tag wtl-type-${task.taskType}">${typeLabel}</span>
          ${deadlineStr ? `<span class="wtl-deadline-tag ${isOverdue && !isDone ? 'wtl-overdue-tag' : isToday ? 'wtl-today-tag' : ''}">${WTL.utils.escapeHtml(deadlineStr)}</span>` : ''}
          ${showStaleBadge ? `<span class="wtl-stale-badge" title="No update in ${WTL.nudge.STALE_THRESHOLD_DAYS}+ days">${WTL.utils.escapeHtml(daysStaleLabel)}</span>` : ''}
        </div>

        <div class="wtl-task-chat-row">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span class="wtl-chat-tag">${WTL.utils.escapeHtml(task.chatName || 'Unknown Chat')}</span>
          ${task.sender ? `<span class="wtl-sender-tag">from ${WTL.utils.escapeHtml(WTL.utils.truncate(task.sender, 20))}</span>` : ''}
          ${task.timestamp ? `<span class="wtl-time-tag">${WTL.utils.escapeHtml(task.timestamp)}</span>` : ''}
        </div>

        ${task.notes ? `<div class="wtl-task-notes">${WTL.utils.escapeHtml(WTL.utils.truncate(task.notes, 100))}</div>` : ''}

        <div class="wtl-task-actions-row">
          <button class="wtl-scroll-btn" data-action="scroll" title="Jump to message in chat">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            View in chat
          </button>
          ${showNudgeBtn ? `
            <button class="wtl-nudge-btn" data-action="nudge" title="Mark as nudged — hides for ${WTL.nudge.STALE_THRESHOLD_DAYS} more days">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Mark as nudged
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  function _attachCardListeners(container) {
    container.querySelectorAll('.wtl-task-card').forEach(card => {
      const taskId = card.dataset.taskId;
      const messageId = card.dataset.messageId;

      // Toggle done
      card.querySelector('[data-action="toggle"]')?.addEventListener('click', async e => {
        e.stopPropagation();
        const task = await WTL.storage.getTask(taskId);
        if (!task) return;
        const newStatus = task.status === 'done' ? 'open' : 'done';
        await WTL.storage.updateTask(taskId, { status: newStatus });
        refresh();
        // Update inline button on original message if visible
        WTL.content && WTL.content.refreshMessageButton && WTL.content.refreshMessageButton(messageId);

        // Analytics: only fire on completion (open → done), not reopen
        if (WTL.analytics && newStatus === 'done') {
          WTL.analytics.track('task_completed', {
            taskType: task.taskType,
            hadDeadline: !!task.deadline
          });
        }
      });

      // Edit
      card.querySelector('[data-action="edit"]')?.addEventListener('click', async e => {
        e.stopPropagation();
        const task = await WTL.storage.getTask(taskId);
        if (!task) return;
        WTL.modal.open({
          messageText: task.messageText,
          existingTask: task,
          onSave: async ({ taskType, deadline, notes }) => {
            await WTL.storage.updateTask(taskId, { taskType, deadline, notes });
            refresh();
            if (WTL.analytics) {
              WTL.analytics.track('task_edited', {
                taskType,
                hasDeadline: !!deadline,
                hasNotes: !!notes,
                source: 'sidebar'
              });
            }
          }
        });
      });

      // Delete
      card.querySelector('[data-action="delete"]')?.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm('Delete this task?')) return;
        const task = await WTL.storage.getTask(taskId);
        await WTL.storage.deleteTask(taskId);
        refresh();
        WTL.content && WTL.content.refreshMessageButton && WTL.content.refreshMessageButton(messageId);
        if (WTL.analytics && task) {
          WTL.analytics.track('task_deleted', { taskType: task.taskType });
        }
      });

      // Scroll to message
      card.querySelector('[data-action="scroll"]')?.addEventListener('click', e => {
        e.stopPropagation();
        _scrollToMessage(taskId);   // taskId so we can load the full task object
      });

      // Mark as nudged (only present on stale Waiting cards)
      card.querySelector('[data-action="nudge"]')?.addEventListener('click', async e => {
        e.stopPropagation();
        if (!WTL.nudge) return;
        try {
          await WTL.nudge.markAsNudged(taskId);
          _showToast('Nudged. Will resurface in ' + WTL.nudge.STALE_THRESHOLD_DAYS + ' days.');
          refresh();
        } catch (err) {
          console.error('[WTL] Nudge failed:', err);
          _showToast('Could not mark as nudged.');
        }
      });
    });
  }

  /**
   * Navigate to the task's original chat and scroll to the message.
   * Delegates to WTL.content.navigateToChat which handles cross-chat routing.
   */
  async function _scrollToMessage(taskId) {
    const task = await WTL.storage.getTask(taskId);
    if (!task) {
      _showToast('Task not found.');
      return;
    }
    if (WTL.content && WTL.content.navigateToChat) {
      WTL.content.navigateToChat(task);
    } else {
      _showToast('Could not navigate — please reload the page.');
    }
  }

  // ─── BADGE ─────────────────────────────────────────────────────────────────

  function _updateBadge(count) {
    if (!_toggleBtnEl) return;
    const badge = _toggleBtnEl.querySelector('#wtl-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }

    // Send badge to background service worker for extension icon
    try {
      chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', count });
    } catch (e) { /* background may not be active */ }
  }

  // ─── TOAST ─────────────────────────────────────────────────────────────────

  function _showToast(msg) {
    const existing = document.querySelector('.wtl-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'wtl-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('wtl-toast-visible'));
    setTimeout(() => {
      toast.classList.remove('wtl-toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  function open() {
    _buildSidebar();
    _sidebarEl.classList.add('wtl-sidebar-open');
    _toggleBtnEl.classList.add('wtl-toggle-active');
    _isOpen = true;
    refresh();
    if (WTL.analytics) WTL.analytics.track('sidebar_opened', {});
  }

  function close() {
    if (_sidebarEl) _sidebarEl.classList.remove('wtl-sidebar-open');
    if (_toggleBtnEl) _toggleBtnEl.classList.remove('wtl-toggle-active');
    _isOpen = false;
  }

  function toggle() {
    _buildSidebar();
    if (_isOpen) close();
    else open();
  }

  function isOpen() { return _isOpen; }

  function init() {
    _buildSidebar();
    // Listen for storage changes to auto-refresh
    WTL.storage.onChange(() => {
      if (_isOpen) refresh();
      else {
        // Still update badge
        WTL.storage.getPendingCount().then(_updateBadge);
      }
    });
    // Initial badge
    WTL.storage.getPendingCount().then(_updateBadge);
  }

  return { init, open, close, toggle, refresh, isOpen, _showToastPublic: _showToast };
})();
