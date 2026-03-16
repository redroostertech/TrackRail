async function loadCopyrightPage() {
  try {
    const [releasesRes, copyrightsRes] = await Promise.all([
      api.get('/releases'),
      api.get('/copyrights')
    ]);

    // Populate release dropdown
    const select = document.getElementById('copyright-release');
    for (const r of releasesRes.data) {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.title;
      select.appendChild(opt);
    }

    renderCopyrights(copyrightsRes.data);
    updateStats(copyrightsRes.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadReleaseTracks() {
  const releaseId = document.getElementById('copyright-release').value;
  const trackSelect = document.getElementById('copyright-track');
  trackSelect.innerHTML = '<option value="">-- Select track --</option>';

  if (!releaseId) return;

  try {
    const res = await api.get('/releases/' + releaseId + '/tracks');
    for (const t of res.data) {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.track_number}. ${t.title}`;
      trackSelect.appendChild(opt);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function prepareFiling() {
  const trackId = document.getElementById('copyright-track').value;
  if (!trackId) { showToast('Select a track first', 'error'); return; }

  showToast('AI preparing copyright filing...', 'info');

  try {
    const res = await api.post('/tracks/' + trackId + '/copyrights/prepare');
    const data = res.data;
    const filing = data.filing;

    document.getElementById('filing-result').classList.remove('hidden');
    document.getElementById('filing-result').innerHTML = `
      <h3 style="font-size:14px;font-weight:600;margin-bottom:16px">AI-Prepared Copyright Filing</h3>
      <p class="text-xs text-muted mb-4">Review all fields carefully. You must certify this information under penalty of perjury.</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label>Work Title</label>
          <input type="text" id="filing-title" value="${filing.title || ''}">
        </div>
        <div class="form-group">
          <label>Work Type</label>
          <input type="text" id="filing-type" value="${filing.work_type || 'Sound Recording'}">
        </div>
        <div class="form-group">
          <label>Author Name</label>
          <input type="text" id="filing-author" value="${filing.author_name || ''}">
        </div>
        <div class="form-group">
          <label>Claimant Name</label>
          <input type="text" id="filing-claimant" value="${filing.claimant_name || ''}">
        </div>
        <div class="form-group">
          <label>Year Completed</label>
          <input type="text" id="filing-year" value="${filing.year_completed || ''}">
        </div>
        <div class="form-group">
          <label>Year Published</label>
          <input type="text" id="filing-published" value="${filing.year_published || ''}" placeholder="Leave blank if unpublished">
        </div>
      </div>

      <div class="form-group">
        <label>Authorship Statement</label>
        <input type="text" id="filing-authorship" value="${filing.authorship_statement || ''}">
      </div>

      <div class="form-group">
        <label>Rights Statement</label>
        <textarea id="filing-rights">${filing.rights_statement || ''}</textarea>
      </div>

      ${filing.notes ? `<div class="card" style="background:var(--warning-light);border-color:var(--warning)">
        <p class="text-sm"><strong>AI Notes:</strong> ${filing.notes}</p>
      </div>` : ''}

      <div class="card mt-4" style="background:var(--bg-primary)">
        <h4 style="font-size:13px;font-weight:600;margin-bottom:8px">Filing Instructions</h4>
        <ol style="padding-left:20px;font-size:13px;color:var(--text-secondary)">
          ${data.instructions.map(i => `<li style="margin-bottom:4px">${i}</li>`).join('')}
        </ol>
      </div>

      <div class="flex gap-2 mt-4">
        <button class="btn btn-primary" onclick="saveFiling('${trackId}')">
          Save & Create Registration
        </button>
        <button class="btn btn-secondary" onclick="document.getElementById('filing-result').classList.add('hidden')">
          Cancel
        </button>
      </div>
    `;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveFiling(trackId) {
  try {
    await api.post('/tracks/' + trackId + '/copyrights', {
      copyright_type: 'sr',
      claimant_name: document.getElementById('filing-claimant').value,
      author_name: document.getElementById('filing-author').value,
      year_completed: document.getElementById('filing-year').value,
      year_published: document.getElementById('filing-published').value || undefined
    });

    document.getElementById('filing-result').classList.add('hidden');
    showToast('Copyright registration created!', 'success');

    // Reload
    const res = await api.get('/copyrights');
    renderCopyrights(res.data);
    updateStats(res.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateStats(copyrights) {
  const notStarted = copyrights.filter(c => c.status === 'not_started').length;
  const inProgress = copyrights.filter(c => ['form_generated', 'submitted', 'pending'].includes(c.status)).length;
  const registered = copyrights.filter(c => c.status === 'registered').length;

  document.getElementById('stat-not-started').textContent = notStarted;
  document.getElementById('stat-in-progress').textContent = inProgress;
  document.getElementById('stat-registered').textContent = registered;
}

function renderCopyrights(copyrights) {
  const el = document.getElementById('copyrights-table');

  if (!copyrights.length) {
    el.innerHTML = '<p class="text-sm text-muted">No copyright registrations yet. Use the form above to prepare one.</p>';
    return;
  }

  el.innerHTML = `<table>
    <thead><tr><th>Track</th><th>Release</th><th>Type</th><th>Claimant</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>
      ${copyrights.map(c => `<tr>
        <td>${c.track_title}</td>
        <td class="text-sm text-secondary">${c.release_title}</td>
        <td>${c.copyright_type === 'sr' ? 'Sound Recording' : 'Performing Arts'}</td>
        <td>${c.claimant_name || '-'}</td>
        <td>${statusBadge(c.status)}</td>
        <td>
          <select class="select-inline" onchange="updateCopyrightStatus('${c.id}', this.value)">
            <option value="not_started" ${c.status === 'not_started' ? 'selected' : ''}>Not Started</option>
            <option value="form_generated" ${c.status === 'form_generated' ? 'selected' : ''}>Form Generated</option>
            <option value="submitted" ${c.status === 'submitted' ? 'selected' : ''}>Submitted</option>
            <option value="pending" ${c.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="registered" ${c.status === 'registered' ? 'selected' : ''}>Registered</option>
          </select>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

async function updateCopyrightStatus(id, status) {
  try {
    const body = { status };
    if (status === 'submitted') body.submitted_date = new Date().toISOString().split('T')[0];
    if (status === 'registered') body.registered_date = new Date().toISOString().split('T')[0];
    await api.put('/copyrights/' + id, body);
    showToast('Status updated', 'success');

    const res = await api.get('/copyrights');
    updateStats(res.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadCopyrightPage);
