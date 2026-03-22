const params = new URLSearchParams(window.location.search);
const releaseId = params.get('id');

const PIPELINE_STEPS = ['draft', 'metadata', 'splits', 'copyright', 'pro', 'distribution', 'scheduled', 'released'];
let currentRelease = null;

async function loadRelease() {
  if (!releaseId) { window.location = '/'; return; }

  try {
    const [releaseRes, tracksRes, checklistRes, validationRes, normalizationRes] = await Promise.all([
      api.get('/releases/' + releaseId),
      api.get('/releases/' + releaseId + '/tracks'),
      api.get('/releases/' + releaseId + '/checklist'),
      api.get('/releases/' + releaseId + '/validation').catch(() => ({ data: null })),
      api.get('/releases/' + releaseId + '/normalization').catch(() => ({ data: null }))
    ]);

    currentRelease = releaseRes.data;
    renderRelease(currentRelease);
    renderTracks(tracksRes.data);
    renderChecklist(checklistRes.data.checklist);
    renderValidation(validationRes.data);
    renderNormalization(normalizationRes.data);
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
  document.getElementById('tab-normalize').classList.toggle('hidden', tab !== 'normalize');
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

// ---- Normalization Panel ----

function renderNormalization(data) {
  const el = document.getElementById('normalization-panel');

  if (!data) {
    el.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 style="font-size:14px;font-weight:600">Normalize Metadata</h3>
        <button class="btn btn-primary btn-sm" onclick="runNormalizationEngine()">
          ${icon('sparkle', 14)} Run Normalization
        </button>
      </div>
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <h3>No normalization runs yet</h3>
        <p>Normalize your metadata to match industry standards — genres, titles, moods, keys, and more.</p>
      </div>
    `;
    return;
  }

  const { run, suggestions } = data;
  const pending = suggestions.filter(s => s.status === 'pending');
  const accepted = suggestions.filter(s => s.status === 'accepted');
  const rejected = suggestions.filter(s => s.status === 'rejected');

  el.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h3 style="font-size:14px;font-weight:600">Normalize Metadata</h3>
        <span class="text-xs text-muted">${run.total_suggestions} suggestion${run.total_suggestions !== 1 ? 's' : ''}</span>
      </div>
      <div class="flex items-center gap-2">
        ${pending.length > 0 ? `<button class="btn btn-primary btn-sm" onclick="acceptAllNormalization()">Accept All (${pending.length})</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="runNormalizationEngine()">Re-run</button>
      </div>
    </div>

    <div class="stat-grid mb-4">
      <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">${run.total_suggestions}</div></div>
      <div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--warning)">${run.pending}</div></div>
      <div class="stat-card"><div class="stat-label">Accepted</div><div class="stat-value" style="color:var(--success)">${run.accepted}</div></div>
      <div class="stat-card"><div class="stat-label">Rejected</div><div class="stat-value" style="color:var(--text-muted)">${run.rejected}</div></div>
    </div>

    ${pending.length > 0 ? `
      <div class="mb-4">
        <h4 style="font-size:13px;font-weight:600;margin-bottom:8px">Pending Suggestions</h4>
        ${pending.map(s => renderSuggestionItem(s)).join('')}
      </div>
    ` : ''}

    ${accepted.length > 0 ? `
      <details class="mb-4">
        <summary class="text-sm text-muted" style="cursor:pointer">Accepted (${accepted.length})</summary>
        <div class="mt-2">${accepted.map(s => renderSuggestionItem(s)).join('')}</div>
      </details>
    ` : ''}

    ${rejected.length > 0 ? `
      <details class="mb-4">
        <summary class="text-sm text-muted" style="cursor:pointer">Rejected (${rejected.length})</summary>
        <div class="mt-2">${rejected.map(s => renderSuggestionItem(s)).join('')}</div>
      </details>
    ` : ''}

    ${suggestions.length === 0 ? '<p class="text-sm text-muted">No normalization suggestions — metadata looks clean!</p>' : ''}
  `;
}

function renderSuggestionItem(s) {
  const isPending = s.status === 'pending';
  const borderClass = isPending ? 'normalization-suggestion-pending'
    : s.status === 'accepted' ? 'normalization-suggestion-accepted'
    : 'normalization-suggestion-rejected';

  const confidenceBadge = s.confidence < 1.0
    ? `<span class="text-xs text-muted">${Math.round(s.confidence * 100)}% confidence</span>`
    : '';

  const actions = isPending ? `
    <div class="flex gap-2">
      <button class="btn btn-primary btn-sm" onclick="acceptNormSuggestion('${s.id}')">Accept</button>
      <button class="btn btn-ghost btn-sm" onclick="rejectNormSuggestion('${s.id}')">Reject</button>
    </div>
  ` : `<span class="badge badge-${s.status === 'accepted' ? 'released' : 'draft'}">${s.status}</span>`;

  return `
    <div class="normalization-suggestion ${borderClass}">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="result-code">${s.rule_applied}</span>
          ${s.field_path ? `<span class="validation-field-path">${s.field_path}</span>` : ''}
          ${confidenceBadge}
        </div>
        ${actions}
      </div>
      <div class="normalization-diff mt-2">
        <span class="norm-original">${s.original_value || '(empty)'}</span>
        <span class="norm-arrow">&rarr;</span>
        <span class="norm-normalized">${s.normalized_value}</span>
      </div>
      ${s.reasoning ? `<div class="text-xs text-muted mt-1">${s.reasoning}</div>` : ''}
    </div>
  `;
}

async function runNormalizationEngine() {
  showToast('Running normalization...', 'info');
  try {
    const res = await api.post('/releases/' + releaseId + '/normalize');
    showToast('Normalization complete! ' + res.data.suggestions.length + ' suggestions', 'success');
    renderNormalization(res.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function acceptNormSuggestion(id) {
  try {
    await api.put('/normalization/suggestions/' + id + '/accept');
    showToast('Suggestion accepted', 'success');
    const res = await api.get('/releases/' + releaseId + '/normalization');
    renderNormalization(res.data);
    loadRelease(); // Refresh release data since fields changed
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function rejectNormSuggestion(id) {
  try {
    await api.put('/normalization/suggestions/' + id + '/reject');
    showToast('Suggestion rejected', 'info');
    const res = await api.get('/releases/' + releaseId + '/normalization');
    renderNormalization(res.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function acceptAllNormalization() {
  try {
    const res = await api.post('/releases/' + releaseId + '/normalization/accept-all');
    showToast(res.data.accepted + ' suggestions accepted', 'success');
    const normRes = await api.get('/releases/' + releaseId + '/normalization');
    renderNormalization(normRes.data);
    loadRelease();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadRelease);
