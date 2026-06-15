/* Profile interactions */

function addAchievement(form) {
  const data = {
    title: form.querySelector('[name=title]').value,
    description: form.querySelector('[name=description]').value,
    category: form.querySelector('[name=category]').value,
    institution: form.querySelector('[name=institution]').value,
    year: form.querySelector('[name=year]').value,
    certificateFile: form.querySelector('[name=certificate]')?.value || ''
  };
  if (!data.title) { showToast('Title is required', 'info'); return; }
  apiPost('/api/achievement/create', data, function() {
    showToast('Achievement added!');
    form.reset();
    setTimeout(function() { location.reload(); }, 500);
  });
}

function addProject(form) {
  const data = {
    title: form.querySelector('[name=title]').value,
    description: form.querySelector('[name=description]').value,
    collaborators: form.querySelector('[name=collaborators]')?.value || '',
    link: form.querySelector('[name=link]')?.value || '',
    skills: form.querySelector('[name=skills]')?.value || ''
  };
  if (!data.title) { showToast('Title is required', 'info'); return; }
  apiPost('/api/project/create', data, function() {
    showToast('Project added!');
    form.reset();
    setTimeout(function() { location.reload(); }, 500);
  });
}

function requestVerification(title, category, institution, certificateFile) {
  const data = {
    title: title,
    category: category,
    institution: institution,
    certificateFile: certificateFile || '',
    details: 'Verification requested for: ' + title
  };
  apiPost('/api/verification-request', data, function() {
    showToast('Verification request submitted!');
    setTimeout(function() { location.reload(); }, 500);
  });
}

function deleteAchievement(id) {
  if (!confirm('Delete this achievement?')) return;
  apiPost('/api/achievement/' + id + '/delete', {}, function() {
    showToast('Achievement deleted');
    document.getElementById('ach-' + id)?.remove();
  });
}

function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  apiPost('/api/project/' + id + '/delete', {}, function() {
    showToast('Project deleted');
    document.getElementById('proj-' + id)?.remove();
  });
}
