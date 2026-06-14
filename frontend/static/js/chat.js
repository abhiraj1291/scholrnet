/* Chat & Messaging */

let chatContacts = [];
let activeChatId = null;
let activeChatType = 'user';
let chatPollInterval = null;

// ===== Shared helpers =====

function roleBadge(role) {
  var colors = {student:'#3b82f6',teacher:'#8b5cf6',mentor:'#f59e0b',admin:'#10b981',super_admin:'#ef4444'};
  return '<span class="text-xs" style="color:' + (colors[role] || '#6b7280') + ';font-weight:600;">' + (role ? role.replace('_',' ').toUpperCase() : 'STUDENT') + '</span>';
}

function avatarHtml(c) {
  if (c.avatar_url) return '<div class="avatar avatar-sm" style="overflow:hidden;"><img src="' + c.avatar_url + '" alt="" style="width:100%;height:100%;object-fit:cover;"></div>';
  return '<div class="avatar avatar-sm">' + (c.avatar || (c.name ? c.name[0] : '?')) + '</div>';
}

function sendMessage() {
  var input = document.getElementById('chatMsgInput') || document.getElementById('chatInput');
  if (!input) return;
  var text = input.value.trim();
  if (!text || !activeChatId) return;
  var endpoint = activeChatType === 'club' ? '/api/club/' + activeChatId + '/messages/send' : '/api/messages/send';
  var payload = activeChatType === 'club' ? { text: text } : { receiver_id: activeChatId, text: text };
  apiPost(endpoint, payload, function() {
    input.value = '';
    refreshMessages(activeChatId);
  });
}

var typingTimer = null;
function sendTypingHeartbeat(contactId) {
  if (!contactId || activeChatType === 'club') return;
  fetch('/api/messages/typing', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({contact_id:contactId})}).catch(function(){});
}
function startChatPolling(contactId) {
  stopChatPolling();
  chatPollInterval = setInterval(function() {
    if (activeChatId === contactId) {
      var endpoint = activeChatType === 'club' ? '/api/club/' + contactId + '/messages' : '/api/messages?contact_id=' + contactId;
      apiGet(endpoint, function(data) {
        var container = document.getElementById('chat-messages-container');
        var pageContainer = document.getElementById('chatMessagesArea');
        var currentCount = container ? container.children.length : 0;
        var pageMsgCount = pageContainer ? pageContainer.querySelectorAll('.chat-msg').length : 0;
        var totalCurrent = currentCount || pageMsgCount;
        var newCount = (data.messages || []).length;
        if (newCount > totalCurrent) {
          refreshMessages(contactId);
        }
        // Typing indicator
        if (data.is_typing) {
          showTypingIndicator(contactId);
        } else {
          hideTypingIndicator();
        }
      });
    } else {
      stopChatPolling();
    }
  }, 3000);
}

function showTypingIndicator(contactId) {
  var containers = ['chatMessagesArea', 'chat-messages-container'];
  containers.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var existing = el.querySelector('.typing-indicator');
    if (existing) return;
    var div = document.createElement('div');
    div.className = 'typing-indicator';
    div.dataset.contact = contactId;
    div.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  });
}
function hideTypingIndicator() {
  document.querySelectorAll('.typing-indicator').forEach(function(el) { el.remove(); });
}

function stopChatPolling() {
  if (chatPollInterval) {
    clearInterval(chatPollInterval);
    chatPollInterval = null;
  }
}

function refreshMessages(contactId) {
  var endpoint = activeChatType === 'club' ? '/api/club/' + contactId + '/messages' : '/api/messages?contact_id=' + contactId;
  apiGet(endpoint, function(data) {
    // Drawer container
    var drawerContainer = document.getElementById('chat-messages-container');
    if (drawerContainer) {
      drawerContainer.innerHTML = '';
      (data.messages || []).forEach(function(m) {
        var div = document.createElement('div');
        div.className = 'chat-msg ' + (m.sender_id === activeChatId ? 'received' : 'sent');
        if (activeChatType === 'club' && m.sender_id !== CURRENT_USER_ID) {
          div.innerHTML = '<div class="text-xs font-bold" style="color:var(--primary);">' + (m.sender_name || '') + '</div><div>' + escapeHtml(m.text) + '</div>';
        } else {
          div.textContent = m.text;
        }
        drawerContainer.appendChild(div);
      });
      drawerContainer.scrollTop = drawerContainer.scrollHeight;
    }
    // Page container
    var pageContainer = document.getElementById('chatMessagesArea');
    if (pageContainer) {
      pageContainer.innerHTML = '';
      (data.messages || []).forEach(function(m) {
        var div = document.createElement('div');
        div.className = 'chat-msg ' + (m.sender_id === activeChatId ? 'received' : 'sent');
        if (activeChatType === 'club' && m.sender_id !== CURRENT_USER_ID) {
          div.innerHTML = '<div class="text-xs font-bold" style="color:var(--primary);">' + (m.sender_name || '') + '</div><div>' + escapeHtml(m.text) + '</div>';
        } else {
          div.textContent = m.text;
        }
        pageContainer.appendChild(div);
      });
      pageContainer.scrollTop = pageContainer.scrollHeight;
    }
  });
}

// ===== Chat Drawer (footer drawer) =====

function loadChatContacts() {
  apiGet('/api/messages', function(data) {
    chatContacts = data.contacts || [];
    renderChatContacts();
  });
}

function renderChatContacts() {
  const list = document.getElementById('chat-contact-list');
  if (!list) return;
  list.innerHTML = '';
  if (chatContacts.length === 0) {
    list.innerHTML = '<div class="text-center text-muted text-xs py-6">No conversations yet.<br>Click <i data-lucide="plus" style="width:12px;height:12px;display:inline;"></i> to start a chat</div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }
  chatContacts.forEach(function(c) {
    const div = document.createElement('div');
    div.className = 'chat-contact';
    if (c.type === 'club') {
      div.innerHTML = '<div class="avatar avatar-sm" style="background:var(--primary-light);color:var(--primary);font-weight:700;">' + (c.avatar || c.name[0]) + '</div><div><div class="font-bold text-xs">' + c.name + ' <span class="text-xs text-muted">(' + (c.member_count || 0) + ' members)</span></div><div class="text-xs text-muted">Club Group</div></div>';
    } else {
      div.innerHTML = avatarHtml(c) + '<div><div class="font-bold text-xs">' + c.name + ' ' + roleBadge(c.role) + (c.verified ? ' <i data-lucide="badge-check" style="width:0.75rem;height:0.75rem;color:var(--primary);display:inline;"></i>' : '') + '</div><div class="text-xs text-muted">' + (c.school || '') + '</div></div>';
    }
    div.addEventListener('click', function() { openChat(c.id, c.name, c.avatar, c.avatar_url, c.role, c.type); });
    list.appendChild(div);
  });
}

function openChat(contactId, contactName, contactAvatar, contactAvatarUrl, contactRole, contactType) {
  activeChatId = contactId;
  activeChatType = contactType || 'user';
  fetch('/api/messages/mark-read', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({contact_id:contactId})}).then(function(){}).catch(function(){});
  updateChatBadge();
  const view = document.getElementById('chat-messages-view');
  const list = document.getElementById('chat-contact-list');
  const newChatView = document.getElementById('new-chat-view');
  if (list) list.classList.add('hidden');
  if (newChatView) newChatView.classList.add('hidden');
  if (view) {
    view.classList.remove('hidden');
    view.querySelector('.chat-contact-name').textContent = contactName || 'User';
    var roleEl = view.querySelector('.chat-contact-role');
    var headerAvatar = view.querySelector('.avatar');
    if (contactType === 'club') {
      if (roleEl) roleEl.innerHTML = '<span class="text-xs text-muted">Club Group</span>';
      if (headerAvatar) {
        headerAvatar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:auto;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
        headerAvatar.style.background = 'var(--primary-light)';
        headerAvatar.style.display = 'flex';
        headerAvatar.style.alignItems = 'center';
        headerAvatar.style.justifyContent = 'center';
      }
    } else {
      if (roleEl) roleEl.innerHTML = roleBadge(contactRole);
      if (headerAvatar) {
        if (contactAvatarUrl) {
          headerAvatar.innerHTML = '<img src="' + contactAvatarUrl + '" alt="" style="width:100%;height:100%;object-fit:cover;">';
          headerAvatar.style.overflow = 'hidden';
          headerAvatar.style.display = '';
          headerAvatar.style.alignItems = '';
          headerAvatar.style.justifyContent = '';
        } else {
          headerAvatar.textContent = contactAvatar || (contactName ? contactName[0] : '?');
          headerAvatar.style.overflow = '';
          headerAvatar.style.display = '';
          headerAvatar.style.alignItems = '';
          headerAvatar.style.justifyContent = '';
        }
      }
    }
    loadMessages(contactId);
    startChatPolling(contactId);
  }
}

function loadMessages(contactId) {
  refreshMessages(contactId);
}

function loadPageMessages(contactId) {
  refreshMessages(contactId);
}

function sendChatMessage(input) {
  sendMessage();
}

// New Chat — search for users
function showNewChat() {
  document.getElementById('chat-contact-list').classList.add('hidden');
  document.getElementById('chat-messages-view').classList.add('hidden');
  document.getElementById('new-chat-view').classList.remove('hidden');
  document.getElementById('newChatSearch').value = '';
  document.getElementById('newChatResults').innerHTML = '';
  document.getElementById('newChatSearch').focus();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function hideNewChat() {
  document.getElementById('new-chat-view').classList.add('hidden');
  document.getElementById('chat-contact-list').classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function searchNewChatUsers(q) {
  const results = document.getElementById('newChatResults');
  if (!q.trim()) { results.innerHTML = ''; return; }
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/search?q=' + encodeURIComponent(q), true);
  xhr.onload = function() {
    var data = JSON.parse(xhr.responseText);
    results.innerHTML = '';
    if (!data.users || data.users.length === 0) {
      results.innerHTML = '<div class="text-center text-muted text-xs py-4">No users found</div>';
      return;
    }
    data.users.forEach(function(u) {
      var div = document.createElement('div');
      div.className = 'chat-contact';
      div.innerHTML = avatarHtml(u) + '<div><div class="font-bold text-xs">' + escapeHtml(u.name || '') + ' ' + roleBadge(u.role) + (u.verified ? ' <i data-lucide="badge-check" style="width:0.75rem;height:0.75rem;color:var(--primary);display:inline;"></i>' : '') + '</div><div class="text-xs text-muted">' + escapeHtml(u.school || '') + '</div></div>';
      div.addEventListener('click', function() {
        openChat(u.id, u.name, u.avatar, u.avatar_url, u.role);
      });
      results.appendChild(div);
    });
  };
  xhr.send();
}

function backToContacts() {
  activeChatId = null;
  stopChatPolling();
  hideNewChat();
  document.getElementById('chat-messages-view').classList.add('hidden');
  var list = document.getElementById('chat-contact-list');
  if (list) {
    list.classList.remove('hidden');
    list.innerHTML = '';
  }
  loadChatContacts();
}

// ===== Dedicated Chat Page (/chat) =====

function loadPageChatContacts() {
  apiGet('/api/messages', function(data) {
    var list = document.getElementById('chatContactList');
    if (!list) return;
    list.innerHTML = '';
    var contacts = data.contacts || [];
    if (contacts.length === 0) {
      list.innerHTML = '<div class="text-center text-muted text-xs py-6">No conversations yet.</div>';
      return;
    }
    contacts.forEach(function(c) {
      var div = document.createElement('div');
      div.className = 'chat-contact';
      if (c.type === 'club') {
        div.innerHTML = '<div class="avatar avatar-sm" style="background:var(--primary-light);color:var(--primary);font-weight:700;">' + (c.avatar || c.name[0]) + '</div><div><div class="font-bold text-xs">' + c.name + ' <span class="text-xs text-muted">(' + (c.member_count || 0) + ' members)</span></div><div class="text-xs text-muted">Club Group</div></div>';
      } else {
        div.innerHTML = avatarHtml(c) + '<div><div class="font-bold text-xs">' + escapeHtml(c.name || '') + ' ' + roleBadge(c.role) + (c.verified ? ' <i data-lucide="badge-check" style="width:0.75rem;height:0.75rem;color:var(--primary);display:inline;"></i>' : '') + '</div><div class="text-xs text-muted">' + escapeHtml(c.school || '') + '</div></div>';
      }
      div.addEventListener('click', function() { openPageChat(c.id, c.name, c.avatar, c.avatar_url, c.role, c.type); });
      list.appendChild(div);
    });
  });
}

function openPageChat(contactId, contactName, contactAvatar, contactAvatarUrl, contactRole, contactType) {
  var grid = document.getElementById('chatPageGrid');
  if (grid && window.innerWidth < 640) grid.classList.add('chat-active');
  activeChatId = contactId;
  activeChatType = contactType || 'user';
  var placeholder = document.getElementById('chatPlaceholder');
  var activeView = document.getElementById('chatActiveView');
  var nameEl = document.getElementById('chatActiveName');
  var roleEl = document.getElementById('chatActiveRole');
  var avatarEl = document.getElementById('chatActiveAvatar');
  if (placeholder) placeholder.classList.add('hidden');
  if (activeView) activeView.classList.remove('hidden');
  if (nameEl) nameEl.textContent = contactName || 'User';
  if (roleEl) {
    if (contactType === 'club') {
      roleEl.innerHTML = '<span class="text-xs text-muted">Club Group</span>';
    } else {
      roleEl.innerHTML = roleBadge(contactRole);
    }
  }
  if (avatarEl) {
    if (contactType === 'club') {
      avatarEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
      avatarEl.style.background = 'var(--primary-light)';
      avatarEl.style.display = 'flex';
      avatarEl.style.alignItems = 'center';
      avatarEl.style.justifyContent = 'center';
    } else if (contactAvatarUrl) {
      avatarEl.innerHTML = '<img src="' + contactAvatarUrl + '" alt="" style="width:100%;height:100%;object-fit:cover;">';
      avatarEl.style.overflow = 'hidden';
      avatarEl.style.display = '';
      avatarEl.style.alignItems = '';
      avatarEl.style.justifyContent = '';
    } else {
      avatarEl.innerHTML = contactAvatar || (contactName ? contactName[0] : '?');
      avatarEl.style.overflow = '';
      avatarEl.style.display = '';
      avatarEl.style.alignItems = '';
      avatarEl.style.justifyContent = '';
    }
  }
  loadPageMessages(contactId);
  startChatPolling(contactId);
  fetch('/api/messages/mark-read', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({contact_id:contactId})}).then(function(){}).catch(function(){});
  updateChatBadge();
}

// ===== Unread Badge =====

function updateChatBadge() {
  var badge = document.getElementById('chatBadge');
  if (!badge) return;
  fetch('/api/messages/unread-count')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.unread_count > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    })
    .catch(function(){});
}

// ===== Init =====

function initChat() {
  // Drawer contacts
  loadChatContacts();
  // Page contacts (if on /chat page)
  loadPageChatContacts();

  // New Chat + button — also opens the drawer if minimized
  var newChatBtn = document.getElementById('newChatBtn');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var drawer = document.getElementById('chat-drawer');
      var body = document.getElementById('chat-body');
      if (drawer) drawer.classList.remove('minimized');
      if (body) body.classList.remove('hidden');
      showNewChat();
    });
  }

  // New Chat search with debounce
  var newChatSearch = document.getElementById('newChatSearch');
  if (newChatSearch) {
    var debounceTimer;
    newChatSearch.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        searchNewChatUsers(newChatSearch.value);
      }, 300);
    });
  }

  // Chat page: Enter key on message input
  var pageInput = document.getElementById('chatMsgInput');
  if (pageInput) {
    pageInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });
    pageInput.addEventListener('input', function() {
      if (activeChatId) {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(function() { sendTypingHeartbeat(activeChatId); }, 500);
      }
    });
  }

  // Unread badge polling
  updateChatBadge();
  setInterval(updateChatBadge, 15000);
}

document.addEventListener('DOMContentLoaded', initChat);
