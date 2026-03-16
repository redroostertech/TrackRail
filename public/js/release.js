const params = new URLSearchParams(window.location.search);
const releaseId = params.get('id');

const PIPELINE_STEPS = ['draft', 'metadata', 'splits', 'copyright', 'pro', 'distribution', 'scheduled', 'released'];
let currentRelease = null;

async function loadRelease() {
  if (!releaseId) { window.location = '/'; return; }

  try {
    const [releaseRes, tracksRes, checklistRes] = await Promise.all([
      api.get('/releases/' + releaseId),
      api.get('/releases/' + releaseId + '/tracks'),
      api.get('/releases/' + releaseId + '/checklist')
    ]);

    currentRelease = releaseRes.data;
    renderRelease(currentRelease);
    renderTracks(tracksRes.data);
    renderChecklist(checklistRes.data.checklist);
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

document.addEventListener('DOMContentLoaded', loadRelease);
