/**
 * storage.js — Chrome storage abstraction for WhatsApp Task Layer
 * Wraps chrome.storage.local with a simple async API and in-memory cache.
 */

"use strict";

window.WTL = window.WTL || {};

WTL.storage = (() => {
  const STORAGE_KEY = 'wtl_tasks';
  
  // In-memory cache to avoid redundant storage reads within a session.
  // Invalidated on every write.
  let _cache = null;
  let _listeners = [];

  /**
   * Notify all registered listeners of a change.
   */
  function _notify(tasks) {
    _listeners.forEach(fn => {
      try { fn(tasks); } catch (e) { console.error('[WTL] Listener error:', e); }
    });
  }

  /**
   * Load all tasks from storage. Uses cache when available.
   * @returns {Promise<Object>} Map of taskId → task object
   */
  async function loadAll() {
    if (_cache !== null) return _cache;
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(STORAGE_KEY, result => {
        if (chrome.runtime.lastError) {
          console.error('[WTL] Storage read error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        _cache = result[STORAGE_KEY] || {};
        resolve(_cache);
      });
    });
  }

  /**
   * Persist the current cache to storage.
   * @param {Object} tasks
   */
  async function _persist(tasks) {
    _cache = tasks;
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY]: tasks }, () => {
        if (chrome.runtime.lastError) {
          console.error('[WTL] Storage write error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        _notify(tasks);
        resolve(tasks);
      });
    });
  }

  /**
   * Save or update a task.
   * @param {Object} task - Full task object
   */
  async function saveTask(task) {
    const tasks = await loadAll();
    tasks[task.id] = {
      ...task,
      updatedAt: Date.now()
    };
    return _persist(tasks);
  }

  /**
   * Update specific fields of an existing task.
   * @param {string} taskId
   * @param {Object} updates - Partial task object
   */
  async function updateTask(taskId, updates) {
    const tasks = await loadAll();
    if (!tasks[taskId]) throw new Error(`Task ${taskId} not found`);
    tasks[taskId] = { ...tasks[taskId], ...updates, updatedAt: Date.now() };
    return _persist(tasks);
  }

  /**
   * Delete a task by ID.
   * @param {string} taskId
   */
  async function deleteTask(taskId) {
    const tasks = await loadAll();
    delete tasks[taskId];
    return _persist(tasks);
  }

  /**
   * Get a single task by ID.
   * @param {string} taskId
   */
  async function getTask(taskId) {
    const tasks = await loadAll();
    return tasks[taskId] || null;
  }

  /**
   * Get all tasks as an array, sorted by creation date (newest first).
   */
  async function getAllTasksArray() {
    const tasks = await loadAll();
    return Object.values(tasks).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Find a task by its messageId (used to check if a message is already a task).
   * @param {string} messageId
   */
  async function findByMessageId(messageId) {
    const tasks = await loadAll();
    return Object.values(tasks).find(t => t.messageId === messageId) || null;
  }

  /**
   * Get pending task count (open tasks only).
   */
  async function getPendingCount() {
    const tasks = await loadAll();
    return Object.values(tasks).filter(t => t.status === 'open').length;
  }

  /**
   * Register a listener for storage changes.
   * Called with the full tasks map whenever tasks are saved.
   * @param {Function} fn
   */
  function onChange(fn) {
    _listeners.push(fn);
    // Also listen for cross-tab changes via chrome.storage events
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEY]) {
        _cache = changes[STORAGE_KEY].newValue || {};
        _notify(_cache);
      }
    });
    return () => {
      _listeners = _listeners.filter(l => l !== fn);
    };
  }

  /**
   * Invalidate cache (useful after cross-tab storage changes).
   */
  function invalidateCache() {
    _cache = null;
  }

  return {
    loadAll,
    saveTask,
    updateTask,
    deleteTask,
    getTask,
    getAllTasksArray,
    findByMessageId,
    getPendingCount,
    onChange,
    invalidateCache
  };
})();
