async function loadProPage() {
  try {
    const [releasesRes, prosRes] = await Promise.all([
      api.get('/releases'),
      api.get('/pro-registrations')
    ]);

    const select = document.getElementById('pro-release');
    for (const r of releasesRes.data) {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.title;
      select.appendChild(opt);
    }

    renderProRegs(prosRes.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadProTracks() {
  const releaseId = document.getElementById('pro-release').value;
  const trackSelect = document.getElementById('pro-track');
  trackSelect.innerHTML = '<option value="">-- Select --</option>';

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

async function createProReg() {
  const trackId = document.getElementById('pro-track').value;
  const proName = document.getElementById('pro-name').value;

  if (!trackId) { showToast('Select a track', 'error'); return; }

  try {
    await api.post('/tracks/' + trackId + '/pro-registrations', { pro_name: proName });
    showToast('PRO registration created', 'success');
    const res = await api.get('/pro-registrations');
    renderProRegs(res.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderProRegs(regs) {
  const el = document.getElementById('pro-table');

  if (!regs.length) {
    el.innerHTML = '<p class="text-sm text-muted">No PRO registrations yet.</p>';
    return;
  }

  el.innerHTML = `<table>
    <thead><tr><th>Track</th><th>Release</th><th>PRO</th><th>Work ID</th><th>ISWC</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>
      ${regs.map(r => `<tr>
        <td>${r.track_title}</td>
        <td class="text-sm text-secondary">${r.release_title}</td>
        <td><span class="badge badge-metadata">${r.pro_name.toUpperCase()}</span></td>
        <td><span class="font-mono text-xs">${r.work_id || '-'}</span></td>
        <td><span class="font-mono text-xs">${r.iswc_code || '-'}</span></td>
        <td>${statusBadge(r.status)}</td>
        <td>
          <select class="select-inline" onchange="updateProStatus('${r.id}', this.value)">
            <option value="not_started" ${r.status === 'not_started' ? 'selected' : ''}>Not Started</option>
            <option value="submitted" ${r.status === 'submitted' ? 'selected' : ''}>Submitted</option>
            <option value="pending" ${r.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="registered" ${r.status === 'registered' ? 'selected' : ''}>Registered</option>
          </select>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

async function updateProStatus(id, status) {
  try {
    const body = { status };
    if (status === 'submitted') body.submitted_date = new Date().toISOString().split('T')[0];
    if (status === 'registered') body.registered_date = new Date().toISOString().split('T')[0];
    await api.put('/pro-registrations/' + id, body);
    showToast('Status updated', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadProPage);
