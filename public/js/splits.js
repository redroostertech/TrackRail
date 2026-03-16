let currentSplits = [];
let collaborators = [];

async function loadSplitsPage() {
  try {
    const [releasesRes, collabRes] = await Promise.all([
      api.get('/releases'),
      api.get('/collaborators')
    ]);

    collaborators = collabRes.data;

    const select = document.getElementById('split-release');
    for (const r of releasesRes.data) {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.title;
      select.appendChild(opt);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadSplitTracks() {
  const releaseId = document.getElementById('split-release').value;
  const trackSelect = document.getElementById('split-track');
  trackSelect.innerHTML = '<option value="">-- Select track --</option>';
  document.getElementById('split-editor').classList.add('hidden');

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

async function loadSplits() {
  const trackId = document.getElementById('split-track').value;
  if (!trackId) { document.getElementById('split-editor').classList.add('hidden'); return; }

  document.getElementById('split-editor').classList.remove('hidden');

  try {
    const res = await api.get('/tracks/' + trackId + '/splits');
    currentSplits = res.data;
    renderSplits();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderSplits() {
  const el = document.getElementById('splits-list');

  if (!currentSplits.length) {
    el.innerHTML = '<p class="text-sm text-muted">No splits defined. Add collaborators or let AI suggest.</p>';
    document.getElementById('split-total').innerHTML = '';
    drawChart([]);
    return;
  }

  el.innerHTML = `<table>
    <thead><tr><th>Collaborator</th><th>Role</th><th>Share %</th><th>Agreed</th><th></th></tr></thead>
    <tbody>
      ${currentSplits.map(s => `<tr>
        <td>${s.collaborator_name}</td>
        <td>${s.role}</td>
        <td>
          <input type="number" value="${s.percentage}" min="0" max="100" step="0.5"
            style="width:80px" onchange="updateSplit('${s.id}', this.value)">
        </td>
        <td>${s.agreed ? '<span style="color:var(--success)">Yes</span>' : '<span class="text-muted">No</span>'}</td>
        <td>
          <button class="btn btn-ghost btn-sm btn-danger" onclick="removeSplit('${s.id}')">
            ${icon('trash', 12)}
          </button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;

  const total = currentSplits.reduce((sum, s) => sum + s.percentage, 0);
  const valid = Math.abs(total - 100) < 0.01;
  document.getElementById('split-total').innerHTML = `
    <div class="flex items-center gap-2">
      <strong>Total: ${total.toFixed(1)}%</strong>
      ${valid
        ? '<span style="color:var(--success)">Valid</span>'
        : '<span style="color:var(--error)">Must equal 100%</span>'}
    </div>
  `;

  drawChart(currentSplits);
}

function drawChart(splits) {
  const canvas = document.getElementById('split-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) - 10;

  ctx.clearRect(0, 0, w, h);

  if (!splits.length) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#27272a';
    ctx.fill();
    ctx.fillStyle = '#71717a';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('No splits', cx, cy);
    return;
  }

  const colors = ['#7c3aed', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
  let startAngle = -Math.PI / 2;

  splits.forEach((s, i) => {
    const sliceAngle = (s.percentage / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    // Label
    if (s.percentage > 5) {
      const mid = startAngle + sliceAngle / 2;
      const lx = cx + Math.cos(mid) * (r * 0.6);
      const ly = cy + Math.sin(mid) * (r * 0.6);
      ctx.fillStyle = '#fff';
      ctx.font = '11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`${s.percentage}%`, lx, ly);
    }

    startAngle += sliceAngle;
  });
}

function addSplit() {
  if (!collaborators.length) {
    showToast('Add collaborators first', 'error');
    return;
  }

  const modal = showModal('Add Split', `
    <div class="form-group">
      <label>Collaborator</label>
      <select id="add-collab">
        ${collaborators.map(c => `<option value="${c.id}">${c.name} (${c.role})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Role</label>
      <select id="add-role">
        <option value="writer">Writer</option>
        <option value="producer">Producer</option>
        <option value="publisher">Publisher</option>
      </select>
    </div>
    <div class="form-group">
      <label>Percentage</label>
      <input type="number" id="add-pct" value="50" min="0.5" max="100" step="0.5">
    </div>
  `, [
    { id: 'cancel', label: 'Cancel', class: 'btn-secondary' },
    { id: 'add', label: 'Add Split', class: 'btn-primary', onClick: async (overlay) => {
      const trackId = document.getElementById('split-track').value;
      try {
        await api.post('/tracks/' + trackId + '/splits', {
          collaborator_id: overlay.querySelector('#add-collab').value,
          role: overlay.querySelector('#add-role').value,
          percentage: parseFloat(overlay.querySelector('#add-pct').value)
        });
        closeModal(overlay);
        showToast('Split added', 'success');
        loadSplits();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }}
  ]);
}

async function updateSplit(splitId, value) {
  try {
    await api.put('/splits/' + splitId, { percentage: parseFloat(value) });
    loadSplits();
  } catch (err) {
    showToast(err.message, 'error');
    loadSplits();
  }
}

async function removeSplit(splitId) {
  try {
    await api.delete('/splits/' + splitId);
    showToast('Split removed', 'success');
    loadSplits();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function suggestSplits() {
  const trackId = document.getElementById('split-track').value;
  showToast('AI suggesting splits...', 'info');
  try {
    const res = await api.post('/tracks/' + trackId + '/splits/suggest');
    const suggestions = res.data;

    let html = '<p class="text-sm mb-4">AI-suggested split allocation:</p>';
    html += suggestions.map(s => `
      <div class="flex items-center justify-between" style="padding:6px 0;border-bottom:1px solid var(--border)">
        <span>${s.name} (${s.role})</span>
        <span><strong>${s.writer_share}%</strong> writing / <strong>${s.master_share}%</strong> master</span>
      </div>
      <p class="text-xs text-muted" style="padding:4px 0 8px">${s.reasoning}</p>
    `).join('');

    showModal('AI Split Suggestions', html, [
      { id: 'cancel', label: 'Dismiss', class: 'btn-secondary' }
    ]);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function validateSplits() {
  const trackId = document.getElementById('split-track').value;
  try {
    const res = await api.get('/tracks/' + trackId + '/splits/validate');
    const v = res.data;
    if (v.valid && v.allAgreed) {
      showToast('Splits are valid and all parties have agreed!', 'success');
    } else if (v.valid) {
      showToast('Splits sum to 100% but not all parties have agreed yet', 'info');
    } else {
      showToast(`Splits sum to ${v.total}% - must equal 100%`, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function exportSheet() {
  const trackId = document.getElementById('split-track').value;
  try {
    const res = await api.get('/tracks/' + trackId + '/splits/export');
    const json = JSON.stringify(res.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `split-sheet-${res.data.track.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Split sheet exported!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function manageCollaborators() {
  const modal = showModal('Manage Collaborators', `
    <div id="collab-list" class="mb-4"></div>
    <h4 style="font-size:13px;font-weight:600;margin-bottom:8px">Add Collaborator</h4>
    <div class="form-group">
      <label>Name</label>
      <input type="text" id="collab-name" placeholder="John Doe">
    </div>
    <div class="flex gap-2">
      <div class="form-group" style="flex:1">
        <label>Role</label>
        <select id="collab-role">
          <option value="songwriter">Songwriter</option>
          <option value="producer">Producer</option>
          <option value="featured_artist">Featured Artist</option>
          <option value="mixer">Mixer</option>
          <option value="engineer">Engineer</option>
        </select>
      </div>
      <div class="form-group" style="flex:1">
        <label>Email</label>
        <input type="email" id="collab-email" placeholder="optional">
      </div>
    </div>
    <div class="flex gap-2">
      <div class="form-group" style="flex:1">
        <label>PRO</label>
        <select id="collab-pro">
          <option value="none">None</option>
          <option value="ascap">ASCAP</option>
          <option value="bmi">BMI</option>
          <option value="sesac">SESAC</option>
        </select>
      </div>
      <div class="form-group" style="flex:1">
        <label>IPI Number</label>
        <input type="text" id="collab-ipi" placeholder="optional">
      </div>
    </div>
  `, [
    { id: 'cancel', label: 'Close', class: 'btn-secondary' },
    { id: 'add', label: 'Add Collaborator', class: 'btn-primary', onClick: async (overlay) => {
      const name = overlay.querySelector('#collab-name').value.trim();
      if (!name) { showToast('Name required', 'error'); return; }
      try {
        await api.post('/collaborators', {
          name,
          role: overlay.querySelector('#collab-role').value,
          email: overlay.querySelector('#collab-email').value || undefined,
          pro_affiliation: overlay.querySelector('#collab-pro').value,
          ipi_number: overlay.querySelector('#collab-ipi').value || undefined
        });
        showToast('Collaborator added!', 'success');
        const res = await api.get('/collaborators');
        collaborators = res.data;
        renderCollabList(overlay);
        overlay.querySelector('#collab-name').value = '';
        overlay.querySelector('#collab-email').value = '';
        overlay.querySelector('#collab-ipi').value = '';
      } catch (err) {
        showToast(err.message, 'error');
      }
    }}
  ]);

  renderCollabList(modal);
}

function renderCollabList(overlay) {
  const el = overlay.querySelector('#collab-list');
  if (!collaborators.length) {
    el.innerHTML = '<p class="text-sm text-muted">No collaborators yet.</p>';
    return;
  }
  el.innerHTML = collaborators.map(c => `
    <div class="flex items-center justify-between" style="padding:6px 0;border-bottom:1px solid var(--border)">
      <div>
        <strong class="text-sm">${c.name}</strong>
        <span class="text-xs text-muted"> (${c.role})</span>
        ${c.pro_affiliation !== 'none' ? `<span class="badge badge-metadata" style="margin-left:4px">${c.pro_affiliation}</span>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm btn-danger" onclick="deleteCollab('${c.id}', this)">
        ${icon('trash', 12)}
      </button>
    </div>
  `).join('');
}

async function deleteCollab(id, btn) {
  try {
    await api.delete('/collaborators/' + id);
    const res = await api.get('/collaborators');
    collaborators = res.data;
    const overlay = btn.closest('.modal-overlay');
    renderCollabList(overlay);
    showToast('Collaborator removed', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadSplitsPage);
