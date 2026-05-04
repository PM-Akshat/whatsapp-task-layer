/**
 * content.js — Main orchestrator for WhatsApp Task Layer
 */

"use strict";

window.WTL = window.WTL || {};

WTL.content = (() => {

  const _injected = new WeakSet();
  let _observer = null;
  let _scan = null; // initialised inside init(), after WTL.utils is ready

  // ─── WHATSAPP READINESS ────────────────────────────────────────────────────

  function _waitForWhatsApp(callback, maxRetries) {
    maxRetries = maxRetries || 60;
    var retries = 0;
    function check() {
      var app = document.querySelector('#app') ||
                document.querySelector('[data-testid="default-user"]') ||
                document.querySelector('div[class*="app-wrapper"]');
      if (app) {
        callback();
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(check, 1000);
      } else {
        console.warn('[WTL] WhatsApp Web did not load in time.');
      }
    }
    check();
  }

  // ─── MESSAGE SELECTORS ────────────────────────────────────────────────────

  function _getMessageElements() {
    var byTestId = document.querySelectorAll('[data-testid="msg-container"]');
    if (byTestId.length > 0) return byTestId;

    var byDataId = document.querySelectorAll(
      '.message-in[data-id], .message-out[data-id], [class*="message-"][data-id]'
    );
    if (byDataId.length > 0) return byDataId;

    return document.querySelectorAll('[class*="focusable-list-item"]');
  }

  // ─── BUTTON INJECTION ─────────────────────────────────────────────────────

  async function _injectButton(msgEl) {
    if (_injected.has(msgEl)) return;
    if (!msgEl.isConnected) return;

    var derived = WTL.utils.deriveMessageId(msgEl);
    var messageId = derived.id;
    _injected.add(msgEl);

    var existingTask = await WTL.storage.findByMessageId(messageId);

    var wrapper = document.createElement('div');
    wrapper.className = 'wtl-btn-wrapper';
    wrapper.dataset.wtlMessageId = messageId;

    var btn = document.createElement('button');
    btn.className = 'wtl-add-task-btn' + (existingTask ? ' wtl-task-exists' : '');
    btn.setAttribute('aria-label', existingTask ? 'Edit Task' : 'Add Task');

    if (existingTask) {
      btn.title = 'Task: ' + (existingTask.taskType === 'todo' ? '✅ To-do' : '⏳ Waiting') +
                  (existingTask.deadline ? ' · ' + WTL.utils.formatDeadline(existingTask.deadline) : '');
      btn.innerHTML = '<span class="wtl-btn-icon">' + (existingTask.taskType === 'todo' ? '✅' : '⏳') + '</span>';
    } else {
      btn.title = 'Add as Task';
      btn.innerHTML = '<span class="wtl-btn-icon">+</span><span class="wtl-btn-text">Task</span>';
    }

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      _handleAddTask(msgEl, messageId, btn);
    });

    wrapper.appendChild(btn);
    msgEl.style.position = 'relative';
    msgEl.appendChild(wrapper);
  }

  async function _handleAddTask(msgEl, messageId, btn) {
    var messageText = WTL.utils.extractMessageText(msgEl);
    var sender      = WTL.utils.extractSender(msgEl);
    var timestamp   = WTL.utils.extractTimestamp(msgEl);
    var chatId      = WTL.utils.getCurrentChatId();
    var chatName    = WTL.utils.getCurrentChatName();
    var chatUrl     = window.location.href;

    var existingTask = await WTL.storage.findByMessageId(messageId);

    WTL.modal.open({
      messageText: messageText,
      existingTask: existingTask,
      onSave: async function(opts) {
        var taskType = opts.taskType;
        var deadline = opts.deadline;
        var notes    = opts.notes;

        var task = {
          id:         existingTask ? existingTask.id        : WTL.utils.uuid(),
          messageId:  messageId,
          chatId:     chatId,
          chatName:   chatName,
          chatUrl:    chatUrl,
          messageText: messageText,
          sender:     sender,
          timestamp:  timestamp,
          taskType:   taskType,
          deadline:   deadline || null,
          notes:      notes    || null,
          status:     existingTask ? existingTask.status    : 'open',
          createdAt:  existingTask ? existingTask.createdAt : Date.now(),
          idStrategy: existingTask ? existingTask.idStrategy : 'hash'
        };

        await WTL.storage.saveTask(task);
        _updateButtonState(btn, task);
        if (WTL.sidebar.isOpen()) WTL.sidebar.refresh();

        // ── Analytics ──
        // Distinguish create vs edit so we can measure feature usage cleanly.
        if (WTL.analytics) {
          if (existingTask) {
            WTL.analytics.track('task_edited', {
              taskType: task.taskType,
              hasDeadline: !!task.deadline,
              hasNotes: !!task.notes
            });
          } else {
            WTL.analytics.track('task_created', {
              taskType: task.taskType,
              hasDeadline: !!task.deadline,
              hasNotes: !!task.notes,
              source: 'message_button'
            });
          }
        }
      }
    });
  }

  function _updateButtonState(btn, task) {
    btn.className = 'wtl-add-task-btn wtl-task-exists';
    btn.innerHTML = '<span class="wtl-btn-icon">' + (task.taskType === 'todo' ? '✅' : '⏳') + '</span>';
    btn.title     = 'Task: ' + (task.taskType === 'todo' ? '✅ To-do' : '⏳ Waiting') +
                    (task.deadline ? ' · ' + WTL.utils.formatDeadline(task.deadline) : '');
    btn.setAttribute('aria-label', 'Edit Task');
  }

  async function refreshMessageButton(messageId) {
    var wrapper = document.querySelector('[data-wtl-message-id="' + CSS.escape(messageId) + '"]');
    if (!wrapper) return;
    var btn = wrapper.querySelector('.wtl-add-task-btn');
    if (!btn) return;

    var task = await WTL.storage.findByMessageId(messageId);
    if (task) {
      _updateButtonState(btn, task);
    } else {
      btn.className = 'wtl-add-task-btn';
      btn.innerHTML = '<span class="wtl-btn-icon">+</span><span class="wtl-btn-text">Task</span>';
      btn.title     = 'Add as Task';
      btn.setAttribute('aria-label', 'Add Task');
    }
  }

  // ─── SCAN & OBSERVER ──────────────────────────────────────────────────────

  function _doScan() {
    var msgs = _getMessageElements();
    msgs.forEach(function(el) { _injectButton(el); });
  }

  function _startObserver() {
    if (_observer) _observer.disconnect();

    _observer = new MutationObserver(function(mutations) {
      var shouldScan = false;
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        if (mutation.addedNodes.length === 0) continue;
        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var node = mutation.addedNodes[j];
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (
            (node.matches && (
              node.matches('[data-testid="msg-container"]') ||
              node.matches('[data-id]') ||
              node.matches('[class*="focusable-list-item"]')
            )) ||
            (node.querySelector && node.querySelector('[data-testid="msg-container"], [data-id]'))
          ) {
            shouldScan = true;
            break;
          }
        }
        if (shouldScan) break;
      }
      if (shouldScan) _scan();
    });

    var target = document.querySelector('#app') || document.body;
    _observer.observe(target, { childList: true, subtree: true });
  }

  // ─── CHAT NAVIGATION (v2 — search-box strategy) ───────────────────────────
  //
  // Approach: use WhatsApp's own search box to find any chat by name,
  // regardless of scroll position in the chat list. This works even if the
  // target chat has scrolled far out of the rendered list.
  //
  // Flow:
  //   1. Already in target chat → scroll to message immediately.
  //   2. Click the chat in the visible list (fast path, no UI flicker).
  //   3. Use WhatsApp's search box to find and open the chat (reliable path).
  //   4. After chat opens, scroll to the message.

  var _navInProgress = false; // prevent double-clicks

  async function navigateToChat(task) {
    if (_navInProgress) return;
    var currentChatId = WTL.utils.getCurrentChatId();

    // ── Already in the right chat ──
    if (currentChatId === task.chatId) {
      _scrollToMessageInCurrentChat(task.messageId);
      return;
    }

    // ── Fast path: chat already visible in the left panel list ──
    var clicked = _clickChatInVisibleList(task.chatName);
    if (clicked) {
      _waitForChatThenScroll(task.chatId, task.messageId, task.chatName);
      return;
    }

    // ── Main path: use WhatsApp's search box ──
    _navInProgress = true;
    _showNavigationToast('searching', task.chatName);
    var opened = await _openChatViaSearch(task.chatName);
    _navInProgress = false;

    if (opened) {
      _waitForChatThenScroll(task.chatId, task.messageId, task.chatName);
    } else {
      _showNavigationToast('failed', task.chatName);
    }
  }

  /**
   * Fast path — click a chat row that is already rendered in the left panel.
   * Returns true if found and clicked.
   */
  function _clickChatInVisibleList(chatName) {
    if (!chatName) return false;
    var selectors = ['[data-testid="cell-frame-title"]', 'span[title]'];
    for (var s = 0; s < selectors.length; s++) {
      var spans = document.querySelectorAll(selectors[s]);
      for (var i = 0; i < spans.length; i++) {
        var span = spans[i];
        var name = (span.title || span.innerText || '').trim();
        if (name.toLowerCase() === chatName.toLowerCase()) {
          var row = span.closest('[role="listitem"]') ||
                    span.closest('[data-testid="cell-frame-container"]') ||
                    span.closest('[class*="listItem"]') ||
                    (span.parentElement && span.parentElement.parentElement &&
                     span.parentElement.parentElement.parentElement);
          if (row) { row.click(); return true; }
        }
      }
    }
    return false;
  }

  /**
   * Main path — type the chat name into WhatsApp's search box, wait for results,
   * click the matching result, then clear the search.
   *
   * Returns a Promise<boolean> — true if the chat was opened successfully.
   */
  function _openChatViaSearch(chatName) {
    return new Promise(function(resolve) {
      // ── Step 1: find and click the search box ──
      var searchBox = _findSearchBox();
      if (!searchBox) {
        console.warn('[WTL] Search box not found');
        resolve(false);
        return;
      }

      // Focus the search input
      searchBox.click();
      searchBox.focus();

      // ── Step 2: type the chat name ──
      // Use execCommand for broadest compatibility with React's synthetic events
      setTimeout(function() {
        _typeIntoSearchBox(searchBox, chatName);

        // ── Step 3: wait for search results to appear, then click match ──
        _waitForSearchResult(chatName, 0, function(found) {
          // ── Step 4: clear the search box ──
          _clearSearchBox(searchBox);
          resolve(found);
        });
      }, 150);
    });
  }

  /**
   * Find WhatsApp's search input element.
   * Tries multiple selectors to handle different WA versions.
   */
  function _findSearchBox() {
    var candidates = [
      document.querySelector('[data-testid="chat-list-search"]'),
      document.querySelector('input[title="Search input textbox"]'),
      document.querySelector('[data-testid="search-input"]'),
      document.querySelector('div[contenteditable="true"][data-tab="3"]'),
      document.querySelector('div[contenteditable="true"][title*="Search"]'),
      // Broad fallback: any contenteditable in the left pane
      document.querySelector('[data-testid="chat-list"] div[contenteditable="true"]'),
      document.querySelector('aside div[contenteditable="true"]'),
    ];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i]) return candidates[i];
    }
    return null;
  }

  /**
   * Type text into the search box.
   * WhatsApp uses a contenteditable div or a React-controlled input,
   * so we need to set value AND fire the right events for React to notice.
   */
  function _typeIntoSearchBox(el, text) {
    // Clear first
    el.textContent = '';
    el.value = '';

    // For contenteditable divs
    if (el.contentEditable === 'true') {
      el.textContent = text;
      // Move caret to end
      var range = document.createRange();
      var sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      // For input elements
      var nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (nativeInputSetter) nativeInputSetter.set.call(el, text);
    }

    // Fire events React needs to update its state
    ['input', 'change', 'keydown', 'keyup'].forEach(function(evtType) {
      el.dispatchEvent(new Event(evtType, { bubbles: true }));
    });
  }

  /**
   * Poll for a search result matching chatName, then click it.
   * Gives up after ~4 seconds (20 × 200ms).
   */
  function _waitForSearchResult(chatName, attempts, callback) {
    if (attempts > 20) { callback(false); return; }

    // Search results appear in the chat list or in a dedicated results panel
    var resultSelectors = [
      '[data-testid="cell-frame-title"]',
      '[data-testid="chat-list"] span[title]',
      'span[title]',
    ];

    for (var s = 0; s < resultSelectors.length; s++) {
      var spans = document.querySelectorAll(resultSelectors[s]);
      for (var i = 0; i < spans.length; i++) {
        var span = spans[i];
        var name = (span.title || span.innerText || '').trim();
        if (name.toLowerCase() === chatName.toLowerCase()) {
          var row = span.closest('[role="listitem"]') ||
                    span.closest('[data-testid="cell-frame-container"]') ||
                    span.closest('[class*="listItem"]') ||
                    (span.parentElement && span.parentElement.parentElement &&
                     span.parentElement.parentElement.parentElement);
          if (row) {
            row.click();
            callback(true);
            return;
          }
        }
      }
    }

    setTimeout(function() {
      _waitForSearchResult(chatName, attempts + 1, callback);
    }, 200);
  }

  /**
   * Clear the search box and press Escape so WA returns to the normal chat list.
   */
  function _clearSearchBox(el) {
    try {
      if (el.contentEditable === 'true') {
        el.textContent = '';
      } else {
        var nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (nativeInputSetter) nativeInputSetter.set.call(el, '');
      }
      ['input', 'change'].forEach(function(evtType) {
        el.dispatchEvent(new Event(evtType, { bubbles: true }));
      });
      el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape', keyCode: 27 }));
      el.blur();
    } catch (_) {}
  }

  /**
   * Poll until the target chat is open, then scroll to the message.
   * Gives up after 5 s.
   */
  function _waitForChatThenScroll(targetChatId, messageId, chatName, attempts) {
    attempts = attempts || 0;
    if (attempts > 25) { _showNavigationToast('notfound', chatName); return; }
    var currentId = WTL.utils.getCurrentChatId();
    if (currentId === targetChatId) {
      setTimeout(function() { _scrollToMessageInCurrentChat(messageId); }, 400);
      return;
    }
    setTimeout(function() {
      _waitForChatThenScroll(targetChatId, messageId, chatName, attempts + 1);
    }, 200);
  }

  /**
   * Scroll to a specific message within the currently open chat.
   */
  function _scrollToMessageInCurrentChat(messageId) {
    // Tier 1: data-id attribute (most reliable)
    if (messageId.indexOf('did_') === 0) {
      var rawId = messageId.slice(4);
      var row = document.querySelector('[data-id="' + CSS.escape(rawId) + '"]');
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        _highlightElement(row);
        if (WTL.analytics) {
          WTL.analytics.track('view_in_chat_clicked', { outcome: 'success', tier: 'data-id' });
        }
        return;
      }
    }

    // Tier 2: re-derive IDs from visible messages and match
    var allMsgs = document.querySelectorAll(
      '[data-testid="msg-container"], [data-id], [class*="focusable-list-item"]'
    );
    for (var i = 0; i < allMsgs.length; i++) {
      var el = allMsgs[i];
      var derived = WTL.utils.deriveMessageId(el);
      if (derived.id === messageId) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        _highlightElement(el);
        if (WTL.analytics) {
          WTL.analytics.track('view_in_chat_clicked', { outcome: 'success', tier: 'hash' });
        }
        return;
      }
    }

    // Message not in current DOM (virtualized list — too old to be rendered)
    _showNavigationToast('notfound', null);
  }

  function _highlightElement(el) {
    el.classList.add('wtl-highlight');
    setTimeout(function() { el.classList.remove('wtl-highlight'); }, 2500);
  }

  /**
   * Show context-appropriate toast messages for navigation state.
   */
  function _showNavigationToast(state, chatName) {
    var msg;
    if (state === 'searching') {
      msg = 'Opening "' + chatName + '"…';
    } else if (state === 'failed') {
      msg = 'Could not find "' + chatName + '" — try opening it manually.';
    } else {
      msg = chatName
        ? 'Opened "' + chatName + '" — scroll up to find the message'
        : 'Message not visible — scroll up in this chat to find it';
    }
    if (WTL.sidebar && WTL.sidebar._showToastPublic) {
      WTL.sidebar._showToastPublic(msg);
    }

    // ── Analytics ──
    // We track terminal outcomes only ('searching' is interim, skip it).
    // Outcome buckets:
    //   - 'failed'    : couldn't even open the chat
    //   - 'not_found' : chat opened but message not in DOM (or no chatName given)
    //   - 'success'   : implicitly tracked from the success path elsewhere
    if (WTL.analytics && state !== 'searching') {
      var outcome = state === 'failed' ? 'failed' : 'not_found';
      WTL.analytics.track('view_in_chat_clicked', { outcome: outcome });
    }
  }

  function _checkPendingScroll() {
    try {
      var raw = sessionStorage.getItem('wtl_pending_scroll');
      if (!raw) return;
      var pending = JSON.parse(raw);
      sessionStorage.removeItem('wtl_pending_scroll');
      if (Date.now() - pending.ts > 10000) return;
      setTimeout(function() { _scrollToMessageInCurrentChat(pending.messageId); }, 800);
    } catch (_) {}
  }

  // ─── KEYBOARD ─────────────────────────────────────────────────────────────

  function _setupKeyboardShortcut() {
    document.addEventListener('keydown', function(e) {
      // Option+T on Mac (altKey) — toggle sidebar
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        WTL.sidebar.toggle();
      }
    });

    chrome.runtime.onMessage.addListener(function(msg) {
      if (msg.type === 'TOGGLE_SIDEBAR') WTL.sidebar.toggle();
      if (msg.type === 'OPEN_SIDEBAR')   WTL.sidebar.open();
    });
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────

  function init() {
    console.log('[WTL] WhatsApp Task Layer initializing…');

    // Create debounced scan here, after WTL.utils is guaranteed to be loaded
    _scan = WTL.utils.debounce(_doScan, 300);

    _waitForWhatsApp(function() {
      console.log('[WTL] WhatsApp detected, injecting UI…');
      // Initialize analytics first so other modules can fire events safely.
      // Analytics is opt-in: this only sets up the queue + flush timer;
      // nothing is sent until the user grants consent in the sidebar.
      if (WTL.analytics) WTL.analytics.init();
      // Backfill lastNudgedAt on existing tasks (idempotent)
      if (WTL.nudge) WTL.nudge.migrateExistingTasks();

      WTL.sidebar.init();
      _startObserver();
      _scan();
      _setupKeyboardShortcut();
      _checkPendingScroll();
      console.log('[WTL] WhatsApp Task Layer ready. Press Option+T (Mac) / Alt+T (Win) for My Tasks.');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { refreshMessageButton: refreshMessageButton, navigateToChat: navigateToChat };

})();
