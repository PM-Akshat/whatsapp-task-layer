/**
 * background.js — Service Worker for WhatsApp Task Layer (Manifest V3)
 *
 * Responsibilities:
 *  1. Update extension icon badge with pending task count
 *  2. Handle keyboard command from manifest (toggle-sidebar)
 *  3. Listen for alarm events (future: deadline notifications)
 */

"use strict";

// ─── BADGE UPDATES ───────────────────────────────────────────────────────────

/**
 * Update the extension icon badge text and color.
 */
function updateBadge(count) {
  const text = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
  const color = count > 0 ? '#ef4444' : '#00000000';

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// Listen for badge update requests from content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'UPDATE_BADGE') {
    updateBadge(msg.count || 0);
    sendResponse({ ok: true });
  }
  return false;
});

// ─── KEYBOARD COMMANDS ───────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-sidebar') {
    // Send message to the active WhatsApp Web tab
    const tabs = await chrome.tabs.query({
      url: 'https://web.whatsapp.com/*',
      active: true
    });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch(() => {});
    }
  }
});

// ─── EXTENSION ICON CLICK ────────────────────────────────────────────────────

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url?.startsWith('https://web.whatsapp.com')) {
    // Open WhatsApp Web if not already open
    chrome.tabs.create({ url: 'https://web.whatsapp.com' });
    return;
  }
  // Toggle sidebar in current tab
  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch(() => {});
});

// ─── STORAGE SYNC (CROSS-TAB BADGE) ─────────────────────────────────────────

// When storage changes in any tab, recompute badge
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes['wtl_tasks']) return;

  const tasks = changes['wtl_tasks'].newValue || {};
  const pendingCount = Object.values(tasks).filter(t => t.status === 'open').length;
  updateBadge(pendingCount);
});

// ─── INSTALL / STARTUP ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[WTL] WhatsApp Task Layer installed.');
  updateBadge(0);

  // On first install (not update), set a flag the content script will see.
  // It will fire 'extension_installed' once analytics consent is granted.
  if (details.reason === 'install') {
    chrome.storage.local.set({ 'wtl_install_pending': true });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  // Recompute badge on browser start
  const result = await chrome.storage.local.get('wtl_tasks');
  const tasks = result['wtl_tasks'] || {};
  const pendingCount = Object.values(tasks).filter(t => t.status === 'open').length;
  updateBadge(pendingCount);
});
