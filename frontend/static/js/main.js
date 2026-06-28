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

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function copyToClipboard(text) {
  if (!navigator.clipboard) { showToast('Copy not supported'); return; }
  navigator.clipboard.writeText(text).then(function() { showToast('Copied to clipboard!'); }).catch(function() { showToast('Could not copy'); });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Settings modal controls
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  var schoolsLoaded = false;
  function loadSchoolsSelect() {
    var sel = document.getElementById('verifySchoolSelect');
    if (!sel || schoolsLoaded) return;
    fetch('/api/schools/list')
      .then(function(r){return r.json()})
      .then(function(d){
        if (d.schools && d.schools.length > 0) {
          sel.innerHTML = '<option value="">Select your school...</option>';
          d.schools.forEach(function(s){ var o=document.createElement('option'); o.value=s.id; o.textContent=s.name; sel.appendChild(o); });
          schoolsLoaded = true;
        }
      }).catch(function(){});
  }
  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => { settingsModal.classList.remove('hidden'); loadSchoolsSelect(); });
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });
    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    }
  }

  // School verification
  const verifyBtn = document.getElementById('verifySchoolBtn');
  const verifyStatus = document.getElementById('verifySchoolStatus');
  if (verifyBtn && verifyStatus) {
    verifyBtn.addEventListener('click', () => {
      const schoolId = document.getElementById('verifySchoolSelect').value;
      const code = document.getElementById('verifySchoolCode').value.trim().toUpperCase();
      if (!schoolId || !code) { verifyStatus.textContent = 'Select a school and enter a code'; verifyStatus.style.color = 'var(--danger)'; return; }
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying...';
      fetch('/api/school/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({school_id: parseInt(schoolId), code: code})
      })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          verifyStatus.textContent = 'Verified at ' + d.school_name + '!';
          verifyStatus.style.color = 'var(--success)';
          setTimeout(() => location.reload(), 1500);
        } else {
          verifyStatus.textContent = d.error || 'Verification failed';
          verifyStatus.style.color = 'var(--danger)';
          verifyBtn.disabled = false;
          verifyBtn.textContent = 'Verify';
        }
      })
      .catch(() => {
        verifyStatus.textContent = 'Network error';
        verifyStatus.style.color = 'var(--danger)';
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify';
      });
    });
  }

  // Notifications dropdown
  const notifBtn = document.getElementById('notif-btn');
  const notifPanel = document.getElementById('notif-panel');
  if (notifBtn && notifPanel) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifPanel.classList.toggle('hidden');
      if (!notifPanel.classList.contains('hidden')) loadNotifications();
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

  // Tab more dropdown
  const tabMoreBtn = document.getElementById('tab-more-btn');
  const tabMoreDropdown = document.getElementById('tab-more-dropdown');
  if (tabMoreBtn && tabMoreDropdown) {
    tabMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      tabMoreDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!tabMoreDropdown.contains(e.target) && e.target !== tabMoreBtn) {
        tabMoreDropdown.classList.add('hidden');
      }
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

  // Save Settings button
  const saveBtn = document.getElementById('saveSettingsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      const activePalette = document.querySelector('.palette-option[style*="var(--primary)"]');
      const palette = activePalette ? activePalette.getAttribute('data-palette') : null;
      if (palette) {
        apiPost('/api/profile/update', {theme_color: palette}, function(d) {
          if (d.success) {
            showToast('Settings saved', 'success');
            setTimeout(function() { location.reload(); }, 800);
          }
        });
      } else {
        showToast('No changes to save', 'info');
      }
    });
  }

  // Palette picker click (in settings modal)
  document.querySelectorAll('.palette-option').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.palette-option').forEach(function(b) {
        b.style.borderColor = 'transparent';
      });
      this.style.borderColor = 'var(--primary)';
    });
  });

  // Load notifications
  function loadNotifications() {
    fetch('/api/notifications')
      .then(function(r){return r.json()})
      .then(function(data){
        var badge = document.getElementById('notifBadge');
        var panel = document.getElementById('notif-panel');
        if (!panel) return;
        if (badge) {
          if (data.unread_count > 0) {
            badge.textContent = data.unread_count > 9 ? '9+' : data.unread_count;
            badge.classList.remove('hidden');
          } else {
            badge.classList.add('hidden');
          }
        }
        panel.innerHTML = '';
        if (data.notifications && data.notifications.length > 0) {
          data.notifications.forEach(function(n){
            var d = document.createElement('div');
            d.className = 'notif-item' + (n.unread ? ' unread' : '');
            d.style.cssText = 'padding:0.6rem 0.75rem;border-bottom:1px solid var(--border);font-size:0.8rem;cursor:pointer;transition:background 0.15s;' + (n.unread ? 'background:rgba(37,99,235,0.04);' : '');
            d.innerHTML = '<div style="font-weight:' + (n.unread ? '600' : '400') + ';color:var(--text);">' + escapeHtml(n.title || '') + '</div><div style="font-size:0.65rem;color:var(--text-muted);margin-top:0.15rem;">' + escapeHtml(n.timestamp || '') + '</div>';
            panel.appendChild(d);
          });
          // Add mark-read button at bottom
          var markBtn = document.createElement('button');
          markBtn.textContent = 'Mark all as read';
          markBtn.className = 'btn btn-ghost btn-xs';
          markBtn.style.cssText = 'width:100%;padding:0.5rem;font-size:0.7rem;color:var(--text-muted);';
          markBtn.addEventListener('click', function(e){
            e.stopPropagation();
            fetch('/api/notifications/read', {method:'POST'})
              .then(function(r){return r.json()})
              .then(function(d){
                if(d.success) loadNotifications();
              });
          });
          panel.appendChild(markBtn);
        } else {
          panel.innerHTML = '<div class="text-center text-muted text-xs py-4">No notifications</div>';
        }
      })
      .catch(function(){});
  }

  // Poll for notifications every 30s (serverless-friendly: fewer cold starts)
  loadNotifications();
  setInterval(loadNotifications, 30000);
});
