/**
 * utils.js — Shared utility functions for WhatsApp Task Layer
 */

"use strict";

window.WTL = window.WTL || {};

/**
 * ─── MESSAGE IDENTIFICATION STRATEGY ───────────────────────────────────────
 *
 * WhatsApp Web does NOT expose stable message IDs in the DOM reliably.
 * We use a tiered approach:
 *
 * Tier 1: data-id attribute on the message row (most reliable when present).
 *         WhatsApp sometimes sets this; format: "true_<phone>@s.whatsapp.net_<msgid>"
 *
 * Tier 2: Hash of (chatId + senderName + trimmed message text + timestamp string).
 *         Stable as long as the message isn't edited/deleted.
 *         Collision probability is negligible for practical use.
 *
 * Tier 3: DOM position index as last resort (fragile, not used for storage).
 *
 * TRADEOFFS:
 *  - Tier 1 is perfect but not always present.
 *  - Tier 2 breaks on message edit (WhatsApp appends "Edited" and changes text node).
 *    We handle this by storing original text at task creation time.
 *  - Deleted messages lose their DOM node; we keep task data but mark source as "deleted".
 */

WTL.utils = (() => {
  /**
   * Simple djb2-style hash for generating stable IDs from strings.
   * Not cryptographic — purely for collision-resistant short IDs.
   */
  function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
      hash = hash >>> 0; // keep unsigned 32-bit
    }
    return hash.toString(36);
  }

  /**
   * Derive a stable messageId from a message DOM element.
   * Returns { id, strategy } so callers know which tier was used.
   */
  function deriveMessageId(msgEl) {
    // Tier 1: data-id attribute
    const row = msgEl.closest('[data-id]');
    if (row && row.dataset.id) {
      return { id: 'did_' + row.dataset.id, strategy: 'data-id' };
    }

    // Tier 2: content hash
    const text = extractMessageText(msgEl) || '';
    const sender = extractSender(msgEl) || '';
    const time = extractTimestamp(msgEl) || '';
    const chatId = getCurrentChatId();
    const raw = `${chatId}|${sender}|${text.slice(0, 120)}|${time}`;
    return { id: 'hash_' + hashString(raw), strategy: 'hash' };
  }

  /**
   * Extract visible message text from a message element.
   * Handles plain text, emoji, and quoted messages.
   */
  function extractMessageText(msgEl) {
    // Primary: copyable text span used by WhatsApp internally
    const copyable = msgEl.querySelector('[class*="copyable-text"]');
    if (copyable) {
      // Clone before manipulating so we never mutate WhatsApp's live DOM
      const clone = copyable.cloneNode(true);
      const quoted = clone.querySelector('[class*="quoted-mention"]');
      if (quoted) quoted.remove();
      return (clone.innerText || clone.textContent || '').trim();
    }

    // Fallback: find the longest non-trivial span text
    const spans = msgEl.querySelectorAll('span[class]');
    for (const s of spans) {
      const t = (s.innerText || '').trim();
      if (t.length > 2) return t;
    }
    return '';
  }

  /**
   * Extract sender name from a message element.
   */
  function extractSender(msgEl) {
    // Outgoing messages — always "You"
    if (msgEl.closest('[class*="message-out"]')) return 'You';

    // data-pre-plain-text is the most reliable: "[HH:MM, DD/MM/YYYY] Sender Name:"
    const row = msgEl.closest('[data-pre-plain-text]');
    if (row) {
      const pre = row.getAttribute('data-pre-plain-text') || '';
      const match = pre.match(/\]\s*(.+?)\s*:/);
      if (match && match[1]) return match[1];
    }

    // Group chat author span (class name contains "author")
    const authorEl = msgEl.querySelector('[class*="author"]');
    if (authorEl) {
      const t = (authorEl.innerText || authorEl.textContent || '').trim();
      if (t && t.length < 60) return t;
    }

    return 'Unknown';
  }

  /**
   * Extract human-readable timestamp string from a message.
   */
  function extractTimestamp(msgEl) {
    const timeEl = msgEl.querySelector('[data-testid="msg-meta"] span') ||
                   msgEl.querySelector('span[class*="time"]') ||
                   msgEl.querySelector('[class*="PreviewTime"]');
    if (timeEl) return (timeEl.innerText || timeEl.textContent || '').trim();

    // data-pre-plain-text: "[HH:MM, DD/MM/YYYY] ..."
    const row = msgEl.closest('[data-pre-plain-text]');
    if (row) {
      const pre = row.getAttribute('data-pre-plain-text') || '';
      const match = pre.match(/\[([^\]]+)\]/);
      if (match) return match[1];
    }
    return new Date().toLocaleTimeString();
  }

  /**
   * Get a stable chat identifier from the current URL or DOM header.
   */
  function getCurrentChatId() {
    // WhatsApp Web uses URL fragment for some views
    if (window.location.hash) return window.location.hash;

    // Active chat header title
    const header = document.querySelector('[data-testid="conversation-header"] [data-testid="conversation-info-header-chat-title"]') ||
                   document.querySelector('header [title]');
    if (header) return 'chat_' + hashString(header.title || header.innerText || '');

    return 'chat_unknown';
  }

  /**
   * Get human-readable chat name for display in the sidebar.
   * Tries multiple selector strategies to survive WhatsApp UI updates.
   */
  function getCurrentChatName() {
    const candidates = [
      // Modern WhatsApp Web (2024+)
      document.querySelector('[data-testid="conversation-info-header-chat-title"]'),
      document.querySelector('[data-testid="conversation-header"] [data-testid="conversation-title"]'),
      // Span with title attribute inside the header
      document.querySelector('header span[title]'),
      document.querySelector('header [title]'),
      // Class-based fallbacks
      document.querySelector('header [class*="copyable-text"]'),
      document.querySelector('[class*="conversation-header"] [class*="title"]'),
      // The active chat item in the sidebar list
      document.querySelector('[aria-selected="true"] [class*="title"]'),
      document.querySelector('[data-testid="cell-frame-title"]'),
    ];

    for (const el of candidates) {
      if (!el) continue;
      const name = (el.title || el.getAttribute('title') || el.innerText || '').trim();
      if (name && name.length > 0 && name.length < 100) return name;
    }

    return 'Unknown Chat';
  }

  /**
   * Get the WhatsApp chat URL/anchor for the currently open chat.
   * Used to navigate back to a specific chat from the sidebar.
   * Returns null if we can't determine it.
   */
  function getCurrentChatAnchor() {
    // WhatsApp Web sometimes encodes the chat identity in the URL hash
    if (window.location.hash && window.location.hash.length > 1) {
      return window.location.hash;
    }
    return null;
  }

  /**
   * Format a date string for display.
   */
  function formatDeadline(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = (target - today) / (1000 * 60 * 60 * 24);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff < 7) return `In ${diff}d`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  /**
   * Check if a deadline is overdue.
   */
  function isOverdue(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  }

  /**
   * Check if a deadline is due today.
   */
  function isDueToday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d)) return false;
    const today = new Date();
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth() === today.getMonth() &&
           d.getDate() === today.getDate();
  }

  /**
   * Debounce utility.
   */
  function debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  /**
   * Generate a UUID v4 for task IDs.
   */
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  /**
   * Escape HTML for safe insertion.
   */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Truncate text to a max length.
   */
  function truncate(str, max = 80) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  return {
    hashString,
    deriveMessageId,
    extractMessageText,
    extractSender,
    extractTimestamp,
    getCurrentChatId,
    getCurrentChatName,
    getCurrentChatAnchor,
    formatDeadline,
    isOverdue,
    isDueToday,
    debounce,
    uuid,
    escapeHtml,
    truncate
  };
})();
