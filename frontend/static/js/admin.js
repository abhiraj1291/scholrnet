/* Admin & Super Admin interactions */

function processVerification(reqId, action) {
  apiPost('/api/verification/' + reqId + '/action', { action: action }, function(data) {
    showToast('Request ' + (action === 'approve' ? 'approved' : 'rejected') + '!');
    setTimeout(function() { location.reload(); }, 500);
  });
}

function createAnnouncement(form) {
  const schoolId = form.dataset.schoolId;
  const data = {
    title: form.querySelector('[name=title]').value,
    content: form.querySelector('[name=content]').value,
    badgeText: form.querySelector('[name=badge]')?.value || 'Bulletin',
    type: form.querySelector('[name=type]')?.value || 'announcement'
  };
  if (!data.title) { showToast('Title is required', 'info'); return; }
  apiPost('/api/school/' + schoolId + '/announcement', data, function() {
    showToast('Announcement published!');
    form.reset();
    setTimeout(function() { location.reload(); }, 500);
  });
}

function deleteAnnouncement(schoolId, annId) {
  if (!confirm('Delete this announcement?')) return;
  apiPost('/api/school/' + schoolId + '/announcement/' + annId + '/delete', {}, function() {
    showToast('Announcement deleted');
    document.getElementById('ann-' + annId)?.remove();
  });
}

function createAd(form) {
  const data = {
    title: form.querySelector('[name=title]').value,
    company: form.querySelector('[name=company]').value,
    content: form.querySelector('[name=content]').value,
    ctaUrl: form.querySelector('[name=ctaUrl]')?.value || '#',
    ctaText: form.querySelector('[name=ctaText]')?.value || 'Learn More',
    placement: form.querySelector('[name=placement]').value
  };
  if (!data.title) { showToast('Title is required', 'info'); return; }
  apiPost('/api/ad/create', data, function() {
    showToast('Ad created!');
    form.reset();
    setTimeout(function() { location.reload(); }, 500);
  });
}

function deleteAd(id) {
  if (!confirm('Delete this ad?')) return;
  apiPost('/api/ad/' + id + '/delete', {}, function() {
    showToast('Ad deleted');
    document.getElementById('ad-' + id)?.remove();
  });
}

function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  apiPost('/api/post/' + id + '/delete', {}, function() {
    showToast('Post deleted');
    document.getElementById('post-' + id)?.remove();
  });
}
