/**
 * MH-Quantum — Service Worker
 * Handles commands, storage, context menus.
 */
let lastPayload = null;

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToActiveTab(message) {
  const tab = await getActiveTab();
  if (!tab?.id) return null;
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (_) {
    return null;
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle-inspector':
      await sendToActiveTab({ type: 'TOGGLE_INSPECTOR' });
      break;
    case 'copy-last-context':
      await sendToActiveTab({ type: 'COPY_LAST_PROMPT', template: 'debug' });
      break;
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case 'STORE_PAYLOAD':
        lastPayload = msg.payload;
        // 1. Sync to local storage for persistence
        await chrome.storage.local.set({
          lastPayload: msg.payload,
          lastInspected: new Date().toISOString()
        });
        
        // 2. Sync to local MCP Server Bridge immediately
        try {
          await fetch('http://127.0.0.1:3747/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msg.payload)
          });
        } catch (e) {
          // It's okay if the MCP server isn't currently running
          console.log('MCP Server bridge not active:', e.message);
        }

        sendResponse({ ok: true });
        break;

      case 'GET_LAST_PAYLOAD': {
        if (!lastPayload) {
          const data = await chrome.storage.local.get('lastPayload');
          lastPayload = data.lastPayload || null;
        }
        sendResponse({ payload: lastPayload });
        break;
      }

      case 'OPEN_POPUP':
        try { await chrome.action.openPopup?.(); } catch (_) { /* user gesture restrictions */ }
        sendResponse({ ok: true });
        break;

      case 'ACTIVATE_TAB_INSPECTOR':
        await sendToActiveTab({ type: 'ACTIVATE_INSPECTOR' });
        sendResponse({ ok: true });
        break;

      default:
        sendResponse({ ok: false, error: 'Unknown message type' });
    }
  })();
  return true;
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  chrome.contextMenus.create({
    id: 'mhq-inspect',
    title: '🔍 MH-Quantum: Inspect Element',
    contexts: ['all']
  });

  chrome.contextMenus.create({
    id: 'mhq-copy-last',
    title: '📋 MH-Quantum: Copy Last Context',
    contexts: ['all']
  });

  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') + '?welcome=1' });
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  try {
    switch (info.menuItemId) {
      case 'mhq-inspect':
        await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_INSPECTOR' });
        break;
      case 'mhq-copy-last':
        await chrome.tabs.sendMessage(tab.id, { type: 'COPY_LAST_PROMPT', template: 'debug' });
        break;
    }
  } catch (_) { /* content script may not exist on restricted pages */ }
});
