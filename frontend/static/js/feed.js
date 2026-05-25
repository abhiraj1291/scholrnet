/* Feed interactions */

function likePost(postId, btn) {
  apiPost('/api/post/' + postId + '/like', {}, function(data) {
    const countEl = btn.querySelector('.like-count');
    if (countEl) countEl.textContent = data.likes;
    btn.classList.toggle('liked', data.liked);
  });
}

function toggleComments(postId) {
  const section = document.getElementById('comments-' + postId);
  if (!section) return;
  section.classList.toggle('hidden');
  if (!section.classList.contains('hidden') && section.querySelectorAll('.comment').length === 0) {
    apiGet('/api/post/' + postId + '/comments', function(data) {
      const list = section.querySelector('.comments-list');
      if (!list) return;
      list.innerHTML = '';
      data.comments.forEach(function(c) {
        list.innerHTML += '<div class="comment"><div class="avatar avatar-sm">' + (c.avatar || c.author[0]) + '</div><div class="comment-body"><div class="comment-author">' + c.author + '</div><div class="comment-text">' + c.text + '</div></div></div>';
      });
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });
  }
}

function submitComment(postId, input) {
  const text = input.value.trim();
  if (!text) return;
  apiPost('/api/post/' + postId + '/comment', { text: text }, function(data) {
    const list = document.querySelector('#comments-' + postId + ' .comments-list');
    if (list) {
      list.innerHTML += '<div class="comment"><div class="avatar avatar-sm">' + (data.comment.avatar || data.comment.author[0]) + '</div><div class="comment-body"><div class="comment-author">' + data.comment.author + '</div><div class="comment-text">' + data.comment.text + '</div></div></div>';
    }
    input.value = '';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    showToast('Comment added!');
  });
}

function createPost(form) {
  const data = {
    title: form.querySelector('[name=title]')?.value || '',
    content: form.querySelector('[name=content]')?.value || '',
    badgeText: form.querySelector('[name=badge]')?.value || '',
    type: form.querySelector('[name=type]')?.value || 'achievement'
  };
  apiPost('/api/post/create', data, function() {
    showToast('Post created!');
    form.reset();
    setTimeout(function() { location.reload(); }, 500);
  });
}
