/**
 * components/modal.js — Task creation & editing modal for WhatsApp Task Layer
 */

"use strict";

window.WTL = window.WTL || {};

WTL.modal = (() => {
  let _modalEl = null;
  let _backdropEl = null;
  let _currentCallback = null;

  /**
   * Build the modal DOM (once) and append to document body.
   */
  function _buildModal() {
    if (_modalEl) return;

    _backdropEl = document.createElement('div');
    _backdropEl.className = 'wtl-backdrop';
    _backdropEl.addEventListener('click', close);

    _modalEl = document.createElement('div');
    _modalEl.className = 'wtl-modal';
    _modalEl.setAttribute('role', 'dialog');
    _modalEl.setAttribute('aria-modal', 'true');
    _modalEl.setAttribute('aria-label', 'Add Task');
    _modalEl.innerHTML = `
      <div class="wtl-modal-header">
        <div class="wtl-modal-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
        </div>
        <h3 class="wtl-modal-title">Add Task</h3>
        <button class="wtl-modal-close" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="wtl-modal-preview">
        <div class="wtl-preview-label">Message</div>
        <div class="wtl-preview-text" id="wtl-preview-text"></div>
      </div>

      <div class="wtl-modal-body">
        <div class="wtl-form-group">
          <label class="wtl-form-label">Task Type</label>
          <div class="wtl-type-toggle">
            <button class="wtl-type-btn active" data-type="todo">
              <span class="wtl-type-icon">✅</span>
              <span>To-do</span>
            </button>
            <button class="wtl-type-btn" data-type="waiting">
              <span class="wtl-type-icon">⏳</span>
              <span>Waiting</span>
            </button>
          </div>
        </div>

        <div class="wtl-form-group">
          <label class="wtl-form-label" for="wtl-deadline">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Deadline <span class="wtl-optional">(optional)</span>
          </label>
          <input class="wtl-input" type="date" id="wtl-deadline" />
        </div>

        <div class="wtl-form-group">
          <label class="wtl-form-label" for="wtl-notes">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Notes <span class="wtl-optional">(optional)</span>
          </label>
          <textarea class="wtl-input wtl-textarea" id="wtl-notes" rows="2" placeholder="Add context, next steps…"></textarea>
        </div>
      </div>

      <div class="wtl-modal-footer">
        <button class="wtl-btn wtl-btn-secondary" id="wtl-cancel-btn">Cancel</button>
        <button class="wtl-btn wtl-btn-primary" id="wtl-save-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
          Save Task
        </button>
      </div>
    `;

    // Wire up close button
    _modalEl.querySelector('.wtl-modal-close').addEventListener('click', close);
    _modalEl.querySelector('#wtl-cancel-btn').addEventListener('click', close);

    // Type toggle buttons
    _modalEl.querySelectorAll('.wtl-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _modalEl.querySelectorAll('.wtl-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Save button
    _modalEl.querySelector('#wtl-save-btn').addEventListener('click', _handleSave);

    // Keyboard handling
    _modalEl.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) _handleSave();
    });

    document.body.appendChild(_backdropEl);
    document.body.appendChild(_modalEl);
  }

  function _handleSave() {
    const typeBtn = _modalEl.querySelector('.wtl-type-btn.active');
    const taskType = typeBtn ? typeBtn.dataset.type : 'todo';
    const deadline = _modalEl.querySelector('#wtl-deadline').value || null;
    const notes = _modalEl.querySelector('#wtl-notes').value.trim() || null;

    if (_currentCallback) {
      _currentCallback({ taskType, deadline, notes });
    }
    close();
  }

  /**
   * Open the modal for a new task.
   * @param {Object} opts
   * @param {string} opts.messageText - Preview text to show
   * @param {Object} [opts.existingTask] - If editing an existing task
   * @param {Function} opts.onSave - Called with { taskType, deadline, notes }
   */
  function open({ messageText, existingTask, onSave }) {
    _buildModal();
    _currentCallback = onSave;

    // Populate preview
    const preview = _modalEl.querySelector('#wtl-preview-text');
    preview.textContent = WTL.utils.truncate(messageText, 120) || '(No text)';

    // Set title
    const title = _modalEl.querySelector('.wtl-modal-title');
    title.textContent = existingTask ? 'Edit Task' : 'Add Task';

    // Pre-fill if editing
    const deadline = _modalEl.querySelector('#wtl-deadline');
    const notes = _modalEl.querySelector('#wtl-notes');
    const typeBtns = _modalEl.querySelectorAll('.wtl-type-btn');

    if (existingTask) {
      typeBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.type === existingTask.taskType);
      });
      deadline.value = existingTask.deadline || '';
      notes.value = existingTask.notes || '';
    } else {
      typeBtns[0].classList.add('active');
      typeBtns[1].classList.remove('active');
      deadline.value = '';
      notes.value = '';
    }

    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    deadline.min = today;

    // Show
    _backdropEl.classList.add('wtl-visible');
    _modalEl.classList.add('wtl-visible');

    // Focus first interactive element
    setTimeout(() => deadline.focus(), 50);
  }

  function close() {
    if (_modalEl) _modalEl.classList.remove('wtl-visible');
    if (_backdropEl) _backdropEl.classList.remove('wtl-visible');
    _currentCallback = null;
  }

  return { open, close };
})();
