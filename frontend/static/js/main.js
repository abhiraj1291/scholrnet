/* ScholrNet v2 - Main Application JS */

let toastTimer = null;

function showToast(text, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  if (toastTimer) clearTimeout(toastTimer);

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = text;
  document.body.appendChild(toast);

  toastTimer = setTimeout(() => toast.remove(), 4000);
}

function apiPost(url, data, callback) {
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(r => r.json())
  .then(d => {
    if (d.success !== false) {
      if (callback) callback(d);
    } else {
      showToast(d.error || 'Something went wrong', 'info');
    }
  })
  .catch(() => showToast('Network error', 'info'));
}

function apiGet(url, callback) {
  fetch(url)
  .then(r => r.json())
  .then(d => { if (callback) callback(d); })
  .catch(() => {});
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById('tab-' + tabId);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.querySelectorAll(`.tab-btn[data-tab="${tabId}"]`).forEach(el => el.classList.add('active'));

  document.querySelectorAll('.bottom-nav-btn').forEach(el => el.classList.remove('active'));
  document.querySelectorAll(`.bottom-nav-btn[data-tab="${tabId}"]`).forEach(el => el.classList.add('active'));

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleDark(enable) {
  document.documentElement.classList.toggle('dark', enable);
  document.cookie = `theme=${enable ? 'dark' : 'light'}; path=/; max-age=31536000`;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Theme toggle (also handled in base.html inline, safe to double-bind)
  const themeToggle = document.getElementById('themeToggle');
  const settingsThemeToggle = document.getElementById('settingsThemeToggle');
  function setTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    document.cookie = 'theme=' + (dark ? 'dark' : 'light') + '; path=/; max-age=' + 60*60*24*365;
    if (themeToggle) themeToggle.checked = dark;
    if (settingsThemeToggle) settingsThemeToggle.checked = dark;
  }
  if (themeToggle) themeToggle.addEventListener('change', function() { setTheme(this.checked); });
  if (settingsThemeToggle) settingsThemeToggle.addEventListener('change', function() { setTheme(this.checked); });

  // Settings modal controls
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });
  }

  // More menu (mobile)
  const moreBtn = document.getElementById('more-btn');
  const moreOverlay = document.getElementById('more-overlay');
  if (moreBtn && moreOverlay) {
    moreBtn.addEventListener('click', () => moreOverlay.classList.remove('hidden'));
    moreOverlay.addEventListener('click', (e) => {
      if (e.target === moreOverlay) moreOverlay.classList.add('hidden');
    });
  }

  // Notifications dropdown
  const notifBtn = document.getElementById('notif-btn');
  const notifPanel = document.getElementById('notif-panel');
  if (notifBtn && notifPanel) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifPanel.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!notifPanel.contains(e.target) && e.target !== notifBtn) {
        notifPanel.classList.add('hidden');
      }
    });
  }

  // Chat drawer toggle
  const chatToggle = document.getElementById('chat-toggle');
  const chatDrawer = document.getElementById('chat-drawer');
  const chatBody = document.getElementById('chat-body');
  if (chatToggle && chatDrawer) {
    chatToggle.addEventListener('click', () => {
      chatDrawer.classList.toggle('minimized');
      if (chatBody) chatBody.classList.toggle('hidden');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });
  }

  // Account dropdown
  const accountBtn = document.getElementById('account-btn');
  const accountDropdown = document.getElementById('account-dropdown');
  if (accountBtn && accountDropdown) {
    accountBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      accountDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!accountDropdown.contains(e.target) && e.target !== accountBtn) {
        accountDropdown.classList.add('hidden');
      }
    });
  }
});
