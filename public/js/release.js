const params = new URLSearchParams(window.location.search);
const releaseId = params.get('id');

const PIPELINE_STEPS = ['draft', 'metadata', 'splits', 'copyright', 'pro', 'distribution', 'scheduled', 'released'];
let currentRelease = null;

async function loadRelease() {
  if (!releaseId) { window.location = '/'; return; }

  try {
    const [releaseRes, tracksRes, checklistRes, validationRes] = await Promise.all([
      api.get('/releases/' + releaseId),
      api.get('/releases/' + releaseId + '/tracks'),
      api.get('/releases/' + releaseId + '/checklist'),
      api.get('/releases/' + releaseId + '/validation').catch(() => ({ data: null }))
    ]);

    currentRelease = releaseRes.data;
    renderRelease(currentRelease);
    renderTracks(tracksRes.data);
    renderChecklist(checklistRes.data.checklist);
    renderValidation(validationRes.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderRelease(r) {
  document.getElementById('release-title').textContent = r.title;
  document.title = `TrackRail - ${r.title}`;

  document.getElementById('release-meta').innerHTML = `
    ${statusBadge(r.status)}
    <span class="text-sm text-secondary">${r.release_type.toUpperCase()}</span>
    ${r.genre ? `<span class="text-sm text-secondary">${r.genre}</span>` : ''}
    ${r.release_date ? `<span class="text-sm text-secondary">Release: ${formatDate(r.release_date)}</span>` : ''}
    ${r.upc_code ? `<span class="text-sm text-secondary font-mono">UPC: ${r.upc_code}</span>` : ''}
  `;

  const stepIndex = PIPELINE_STEPS.indexOf(r.status);
  document.getElementById('release-pipeline').innerHTML = `
    <div class="pipeline" style="max-width:600px">
      ${PIPELINE_STEPS.map((s, i) => {
        const cls = i < stepIndex ? 'completed' : i === stepIndex ? 'current' : '';
        return `<div class="pipeline-step ${cls}" title="${s}"></div>`;
      }).join('')}
    </div>
    <div class="flex justify-between text-xs text-muted" style="max-width:600px">
      <span>Draft</span><span>Released</span>
    </div>
    ${stepIndex < PIPELINE_STEPS.length - 1 ? `
      <button class="btn btn-primary btn-sm mt-2" onclick="advanceStatus()">
        Advance to ${PIPELINE_STEPS[stepIndex + 1].replace(/_/g, ' ')} &rarr;
      </button>
    ` : ''}
  `;
}

function renderTracks(tracks) {
  const el = document.getElementById('tracks-list');

  if (!tracks.length) {
    el.innerHTML = `<div class="empty-state">
      <p class="text-sm text-muted">No tracks uploaded yet</p>
      <button class="btn btn-primary btn-sm mt-2" onclick="window.location='/upload.html?release=${releaseId}'">Upload Track</button>
    </div>`;
    return;
  }

  el.innerHTML = `<table>
    <thead><tr>
      <th>#</th><th>Title</th><th>BPM</th><th>Key</th><th>Genre</th><th>ISRC</th><th>Actions</th>
    </tr></thead>
    <tbody>
      ${tracks.map(t => `<tr>
        <td>${t.track_number}</td>
        <td><strong>${t.title}</strong>${t.file_name ? `<br><span class="text-xs text-muted">${t.file_name}</span>` : ''}</td>
        <td>${t.bpm || '-'}</td>
        <td>${t.musical_key || '-'}</td>
        <td>${t.genre || '-'}</td>
        <td><span class="font-mono text-xs">${t.isrc_code || '-'}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm" onclick="analyzeTrack('${t.id}')" title="AI Analyze">
              ${icon('sparkle', 14)} Analyze
            </button>
            <button class="btn btn-ghost btn-sm" onclick="generateISRC('${t.id}')" title="Generate ISRC">ISRC</button>
            <button class="btn btn-ghost btn-sm btn-danger" onclick="deleteTrack('${t.id}')">
              ${icon('trash', 14)}
            </button>
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function renderChecklist(checklist) {
  const el = document.getElementById('checklist');
  el.innerHTML = Object.entries(checklist).map(([key, item]) => `
    <div class="checklist-item">
      <div class="checklist-dot ${item.done ? 'done' : ''}">
        ${item.done ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </div>
      <span>${item.label}</span>
      ${item.count !== undefined ? `<span class="text-xs text-muted">(${item.count})</span>` : ''}
    </div>
  `).join('');
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('tab-tracks').classList.toggle('hidden', tab !== 'tracks');
  document.getElementById('tab-validation').classList.toggle('hidden', tab !== 'validation');
  document.getElementById('tab-checklist').classList.toggle('hidden', tab !== 'checklist');
}

async function advanceStatus() {
  const stepIndex = PIPELINE_STEPS.indexOf(currentRelease.status);
  const next = PIPELINE_STEPS[stepIndex + 1];
  if (!next) return;

  try {
    await api.put('/releases/' + releaseId + '/status', { status: next });
    showToast(`Status updated to ${next}`, 'success');
    loadRelease();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function analyzeTrack(trackId) {
  showToast('Analyzing track with AI...', 'info');
  try {
    await api.post('/tracks/' + trackId + '/analyze');
    showToast('AI analysis complete!', 'success');
    loadRelease();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function generateISRC(trackId) {
  try {
    await api.post('/tracks/' + trackId + '/isrc');
    showToast('ISRC code assigned!', 'success');
    loadRelease();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTrack(trackId) {
  const ok = await confirmAction('Delete Track', 'Are you sure you want to delete this track? This action cannot be undone.', {
    confirmLabel: 'Delete Track',
    icon: 'trash'
  });
  if (!ok) return;
  try {
    await api.delete('/tracks/' + trackId);
    showToast('Track deleted', 'success');
    loadRelease();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function editRelease() {
  const r = currentRelease;
  const modal = showModal('Edit Release', `
    <div class="form-group">
      <label>Title</label>
      <input type="text" id="edit-title" value="${r.title}">
    </div>
    <div class="form-group">
      <label>Type</label>
      <select id="edit-type">
        <option value="single" ${r.release_type === 'single' ? 'selected' : ''}>Single</option>
        <option value="ep" ${r.release_type === 'ep' ? 'selected' : ''}>EP</option>
        <option value="album" ${r.release_type === 'album' ? 'selected' : ''}>Album</option>
      </select>
    </div>
    <div class="form-group">
      <label>Genre</label>
      <input type="text" id="edit-genre" value="${r.genre || ''}">
    </div>
    <div class="form-group">
      <label>Release Date</label>
      <input type="date" id="edit-date" value="${r.release_date || ''}">
    </div>
    <div class="form-group">
      <label>UPC Code</label>
      <input type="text" id="edit-upc" value="${r.upc_code || ''}" placeholder="Optional">
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="edit-desc">${r.description || ''}</textarea>
    </div>
  `, [
    { id: 'cancel', label: 'Cancel', class: 'btn-secondary' },
    { id: 'save', label: 'Save', class: 'btn-primary', onClick: async (overlay) => {
      try {
        await api.put('/releases/' + releaseId, {
          title: overlay.querySelector('#edit-title').value,
          release_type: overlay.querySelector('#edit-type').value,
          genre: overlay.querySelector('#edit-genre').value || undefined,
          release_date: overlay.querySelector('#edit-date').value || undefined,
          upc_code: overlay.querySelector('#edit-upc').value || undefined,
          description: overlay.querySelector('#edit-desc').value || undefined
        });
        closeModal(overlay);
        showToast('Release updated', 'success');
        loadRelease();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }}
  ]);
}

async function deleteRelease() {
  const ok = await confirmAction('Delete Release', 'Delete this release and all its tracks? This action cannot be undone.', {
    confirmLabel: 'Delete Release',
    icon: 'trash'
  });
  if (!ok) return;
  try {
    await api.delete('/releases/' + releaseId);
    showToast('Release deleted', 'success');
    window.location = '/';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---- Validation Panel ----

function renderValidation(data) {
  const el = document.getElementById('validation-panel');

  if (!data) {
    el.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 style="font-size:14px;font-weight:600">Validation</h3>
        <button class="btn btn-primary btn-sm" onclick="runValidation()">
          ${icon('sparkle', 14)} Run Validation
        </button>
      </div>
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <h3>No validation runs yet</h3>
        <p>Run validation to check your release metadata against industry standards.</p>
      </div>
    `;
    return;
  }

  const { run, results, decision } = data;
  const errors = results.filter(r => r.status === 'fail');
  const warnings = results.filter(r => r.status === 'warning');
  const infos = results.filter(r => r.status === 'info');
  const passed = results.filter(r => r.status === 'pass');
  const skipped = results.filter(r => r.status === 'skipped');

  const decisionBadge = decision
    ? `<span class="badge badge-${decision.outcome}">${decision.outcome}</span>`
    : '';

  const scoreColor = run.score >= 80 ? 'var(--success)' : run.score >= 50 ? 'var(--warning)' : 'var(--error)';

  el.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h3 style="font-size:14px;font-weight:600">Validation</h3>
        <span class="validation-score" style="color:${scoreColor}">${run.score}</span>
        ${decisionBadge}
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-muted">Last run: ${formatDate(run.run_at)}</span>
        <button class="btn btn-primary btn-sm" onclick="runValidation()">
          ${icon('sparkle', 14)} Re-run
        </button>
      </div>
    </div>

    <div class="stat-grid mb-4">
      <div class="stat-card"><div class="stat-label">Errors</div><div class="stat-value" style="color:var(--error)">${run.failed}</div></div>
      <div class="stat-card"><div class="stat-label">Warnings</div><div class="stat-value" style="color:var(--warning)">${run.warnings}</div></div>
      <div class="stat-card"><div class="stat-label">Passed</div><div class="stat-value" style="color:var(--success)">${run.passed}</div></div>
      <div class="stat-card"><div class="stat-label">Score</div><div class="stat-value" style="color:${scoreColor}">${run.score}%</div></div>
    </div>

    ${errors.length ? renderResultSection('Errors', errors, 'error') : ''}
    ${warnings.length ? renderResultSection('Warnings', warnings, 'warning') : ''}
    ${infos.length ? renderResultSection('Info', infos, 'info') : ''}
    ${passed.length ? `
      <details class="mt-4">
        <summary class="text-sm text-muted" style="cursor:pointer">Passed (${passed.length})</summary>
        <div class="mt-2">${passed.map(r => renderResultItem(r, 'pass')).join('')}</div>
      </details>
    ` : ''}
    ${skipped.length ? `
      <details class="mt-4">
        <summary class="text-xs text-muted" style="cursor:pointer">Skipped (${skipped.length})</summary>
        <div class="mt-2">${skipped.map(r => renderResultItem(r, 'skipped')).join('')}</div>
      </details>
    ` : ''}
  `;
}

function renderResultSection(title, results, type) {
  return `
    <div class="mb-4">
      <div class="flex items-center gap-2 mb-2">
        <h4 style="font-size:13px;font-weight:600">${title}</h4>
        <span class="badge badge-${type === 'error' ? 'rejected' : type === 'warning' ? 'submitted' : 'metadata'}">${results.length}</span>
      </div>
      ${results.map(r => renderResultItem(r, type)).join('')}
    </div>
  `;
}

function renderResultItem(r, type) {
  const borderClass = type === 'error' ? 'validation-result-error'
    : type === 'warning' ? 'validation-result-warning'
    : type === 'info' ? 'validation-result-info'
    : type === 'pass' ? 'validation-result-pass'
    : 'validation-result-skipped';

  const ackButton = (type === 'warning' || type === 'info') && !r.acknowledged
    ? `<button class="btn btn-ghost btn-sm" onclick="acknowledgeResult('${r.id}')">Dismiss</button>`
    : r.acknowledged
    ? '<span class="text-xs text-muted">Dismissed</span>'
    : '';

  return `
    <div class="validation-result ${borderClass}">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="result-code">${r.result_code}</span>
          <span class="text-sm">${r.message}</span>
        </div>
        ${ackButton}
      </div>
      <div class="flex items-center gap-3 mt-1">
        ${r.field_path ? `<span class="validation-field-path">${r.field_path}</span>` : ''}
        ${r.actual_value !== null && r.actual_value !== undefined ? `<span class="text-xs text-muted">Value: "${r.actual_value}"</span>` : ''}
      </div>
      ${r.suggested_fix && type !== 'pass' ? `<div class="validation-fix">${r.suggested_fix}</div>` : ''}
    </div>
  `;
}

async function runValidation() {
  showToast('Running validation...', 'info');
  try {
    const res = await api.post('/releases/' + releaseId + '/validate');
    showToast('Validation complete!', 'success');
    renderValidation(res.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function acknowledgeResult(resultId) {
  try {
    await api.put('/validation/results/' + resultId + '/acknowledge');
    showToast('Result dismissed', 'success');
    // Reload validation data
    const res = await api.get('/releases/' + releaseId + '/validation');
    renderValidation(res.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadRelease);
