/**
 * MH-Quantum — Service Worker (Option B: Dynamic Scripting Injection)
 * Handles commands, storage, context menus, and dynamically injects scripts.
 */
let lastPayload = null;

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Dynamically inject scripts if not already injected
async function ensureInjected(tabId) {
  if (!tabId) return false;
  try {
    const status = await chrome.tabs.sendMessage(tabId, { type: 'GET_STATUS' });
    if (status) return true;
  } catch (_) {
    // Content script not loaded, proceed with injection
  }

  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['inspector.css']
    });

    await chrome.scripting.executeScript({
      target: { tabId },
      files: [
        'utils/dom-crawler.js',
        'utils/prompt-generator.js',
        'utils/payload-schema.js',
        'content.js'
      ]
    });
    return true;
  } catch (err) {
    console.error('Dynamic script injection failed:', err);
    return false;
  }
}

async function sendToActiveTab(message) {
  const tab = await getActiveTab();
  if (!tab?.id) return null;
  const ok = await ensureInjected(tab.id);
  if (!ok) return null;
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
        await chrome.storage.local.set({
          lastPayload: msg.payload,
          lastInspected: new Date().toISOString()
        });
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
        await sendToActiveTab({ type: 'ACTIVATE_INSPECTOR' });
        break;
      case 'mhq-copy-last':
        await sendToActiveTab({ type: 'COPY_LAST_PROMPT', template: 'debug' });
        break;
    }
  } catch (_) { /* content script may not exist on restricted pages */ }
});
