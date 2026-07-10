/** MH-Quantum — Popup Controller (Awwwards-Tier Dashboard) */
let currentTab = null;
let inspectorActive = false;

async function init() {
  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await refreshStatus();
  bindEvents();
}

async function refreshStatus() {
  if (!currentTab?.id) return setStatus(false);
  try {
    const resp = await chrome.tabs.sendMessage(currentTab.id, { type: 'GET_STATUS' });
    setStatus(!!resp?.active);
  } catch (_) {
    setStatus(false);
  }
}

function setStatus(active) {
  inspectorActive = active;
  
  // Status Nav Pill
  const dot = document.getElementById('mhq-status-dot');
  const txt = document.getElementById('mhq-status-text');
  if (dot && txt) {
    if (active) {
      dot.classList.add('active');
      txt.textContent = 'System Online';
      txt.style.color = '#10B981';
    } else {
      dot.classList.remove('active');
      txt.textContent = 'System Offline';
      txt.style.color = 'var(--color-text-muted)';
    }
  }

  // Toggle Button
  const btn = document.getElementById('btn-toggle-inspector');
  const btnTxt = document.getElementById('toggle-text');
  const icon = document.getElementById('toggle-icon');
  
  if (btn && btnTxt && icon) {
    if (active) {
      // Switch to STOP mode
      btn.style.background = '#EF4444';
      btn.style.boxShadow = '0 12px 24px -8px rgba(239,68,68,0.4)';
      btnTxt.textContent = 'Stop Inspecting';
      icon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><rect x="9" y="9" width="6" height="6"></rect>';
    } else {
      // Switch to START mode
      btn.style.background = 'var(--color-text-main)';
      btn.style.boxShadow = '0 12px 24px -8px rgba(15,17,21,0.4)';
      btnTxt.textContent = 'Start Inspecting';
      icon.innerHTML = '<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>';
    }
  }
}

function bindEvents() {
  const toggleBtn = document.getElementById('btn-toggle-inspector');
  toggleBtn?.addEventListener('click', async () => {
    if (!currentTab?.id) return;
    try {
      const msgType = inspectorActive ? 'DEACTIVATE_INSPECTOR' : 'ACTIVATE_INSPECTOR';
      await chrome.tabs.sendMessage(currentTab.id, { type: msgType });
      setStatus(!inspectorActive);
      showToast(inspectorActive ? 'Công cụ đã ĐƯỢC BẬT!' : 'Công cụ đã TẮT!', inspectorActive ? 'success' : 'info');
    } catch (_) {
      showToast('⚠️ Không thể thao tác trên trang này', 'error');
    }
  });

  const guideBtn = document.getElementById('btn-guide-main');
  guideBtn?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('README.md') });
  });

  const viewDashboard = document.getElementById('view-dashboard');
  const viewMcp = document.getElementById('view-mcp');

  const mcpBtn = document.getElementById('btn-open-mcp');
  mcpBtn?.addEventListener('click', () => {
    viewDashboard.style.display = 'none';
    viewMcp.style.display = 'flex';
    viewMcp.style.flexDirection = 'column';
    
    // Auto populate the correct command format
    const mcpText = document.getElementById('mcp-cmd-text');
    if (mcpText) {
      mcpText.textContent = `node [Đường-dẫn-của-bạn]/MH-QUANTUM-INSPECTOR/mcp/mcp-server.js`;
    }
  });

  const backBtn = document.getElementById('btn-back-dashboard');
  backBtn?.addEventListener('click', () => {
    viewMcp.style.display = 'none';
    viewDashboard.style.display = 'flex';
    viewDashboard.style.flexDirection = 'column';
  });

  // Copy command logic
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-copy');
      const text = document.getElementById(targetId)?.textContent;
      if (text) {
        navigator.clipboard.writeText(text);
        showToast('Command copied to clipboard!', 'success');
      }
    });
  });

  const closeBtn = document.getElementById('btn-close');
  closeBtn?.addEventListener('click', () => {
    window.close();
  });
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  
  if (type === 'error') t.style.background = 'rgba(239, 68, 68, 0.9)';
  if (type === 'success') t.style.background = 'rgba(16, 185, 129, 0.9)';

  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('fade-out');
    t.addEventListener('animationend', () => t.remove());
  }, 2500);
}

document.addEventListener('DOMContentLoaded', init);
