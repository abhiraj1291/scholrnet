/* Global Search */
var searchTimeout = null;

function initSearch() {
  // Global search bar (header dropdown)
  var input = document.getElementById('global-search');
  var panel = document.getElementById('search-panel');
  if (input && panel) {
    input.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      var q = this.value.trim();
      if (q.length < 2) { panel.classList.add('hidden'); return; }
      searchTimeout = setTimeout(function() {
        doSearch(q, function(html) {
          panel.classList.remove('hidden');
          panel.innerHTML = html;
          if (typeof lucide !== 'undefined') lucide.createIcons();
        });
      }, 300);
    });
    document.addEventListener('click', function(e) {
      if (!panel.contains(e.target) && e.target !== input) {
        panel.classList.add('hidden');
      }
    });
  }

  // Search page (full results)
  var searchInput = document.getElementById('searchInput');
  var resultsEl = document.getElementById('searchResults');
  var emptyEl = document.getElementById('searchEmpty');
  if (searchInput && resultsEl) {
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      var q = this.value.trim();
      if (q.length < 2) {
        resultsEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
      }
      if (emptyEl) emptyEl.style.display = 'none';
      searchTimeout = setTimeout(function() {
        doSearch(q, function(html) {
          resultsEl.innerHTML = html;
          if (typeof lucide !== 'undefined') lucide.createIcons();
        });
      }, 300);
    });
  }
}

function doSearch(q, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/search?q=' + encodeURIComponent(q), true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var data = JSON.parse(xhr.responseText);
      var html = '';
      if (data.users && data.users.length) {
        html += '<div class="p-3" style="border-bottom:1px solid var(--border);"><div class="text-xs font-bold text-muted mb-2">People</div>';
        data.users.forEach(function(u) {
          html += '<a href="/profile/' + u.id + '" class="flex items-center gap-2 p-2" style="text-decoration:none;color:inherit;border-radius:8px;transition:background 0.15s;" onmouseover="this.style.background=\'var(--bg-hover)\'" onmouseout="this.style.background=\'transparent\'"><div class="avatar avatar-sm">' + (u.avatar || u.name[0]) + '</div><div><div class="text-xs font-bold">' + u.name + '</div><div class="text-xs text-muted">' + (u.school || '') + '</div></div></a>';
        });
        html += '</div>';
      }
      if (data.achievements && data.achievements.length) {
        html += '<div class="p-3" style="border-bottom:1px solid var(--border);"><div class="text-xs font-bold text-muted mb-2">Achievements</div>';
        data.achievements.forEach(function(a) {
          html += '<div class="flex items-center justify-between p-2" style="border-radius:8px;transition:background 0.15s;" onmouseover="this.style.background=\'var(--bg-hover)\'" onmouseout="this.style.background=\'transparent\'"><span class="text-xs font-bold">' + a.title + '</span><span class="badge ' + (a.verification_status === 'Verified' ? 'badge-success' : 'badge-muted') + '">' + a.verification_status + '</span></div>';
        });
        html += '</div>';
      }
      if (data.schools && data.schools.length) {
        html += '<div class="p-3"><div class="text-xs font-bold text-muted mb-2">Schools</div>';
        data.schools.forEach(function(s) {
          html += '<div class="flex items-center gap-2 p-2" style="border-radius:8px;transition:background 0.15s;" onmouseover="this.style.background=\'var(--bg-hover)\'" onmouseout="this.style.background=\'transparent\'"><span class="text-sm">\uD83C\uDFEB</span><div><div class="text-xs font-bold">' + s.name + '</div><div class="text-xs text-muted">' + (s.location || '') + '</div></div></div>';
        });
        html += '</div>';
      }
      if (!html) html = '<div class="p-4 text-center text-xs text-muted">No results found</div>';
      callback(html);
    }
  };
  xhr.send();
}

document.addEventListener('DOMContentLoaded', initSearch);