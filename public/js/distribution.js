const PLATFORM_ICONS = {
  spotify: { color: '#1DB954', label: 'Spotify' },
  apple_music: { color: '#FA243C', label: 'Apple Music' },
  amazon_music: { color: '#25D1DA', label: 'Amazon Music' },
  tidal: { color: '#000000', label: 'Tidal' },
  deezer: { color: '#A238FF', label: 'Deezer' },
  youtube_music: { color: '#FF0000', label: 'YouTube Music' },
  soundcloud: { color: '#FF5500', label: 'SoundCloud' },
  bandcamp: { color: '#1DA0C3', label: 'Bandcamp' }
};

async function loadDistPage() {
  try {
    const res = await api.get('/releases');
    const select = document.getElementById('dist-release');
    for (const r of res.data) {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `${r.title} (${r.release_type})`;
      select.appendChild(opt);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadDistributions() {
  const releaseId = document.getElementById('dist-release').value;
  if (!releaseId) { document.getElementById('dist-grid').innerHTML = ''; return; }

  try {
    const res = await api.get('/releases/' + releaseId + '/distributions');
    renderDistributions(res.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderDistributions(dists) {
  const el = document.getElementById('dist-grid');

  if (!dists.length) {
    el.innerHTML = '<div class="empty-state"><p class="text-sm text-muted">No distributions yet. Click "Add All Platforms" to get started.</p></div>';
    return;
  }

  el.innerHTML = dists.map(d => {
    const info = PLATFORM_ICONS[d.platform] || { color: '#666', label: d.platform };
    return `
      <div class="card">
        <div class="flex items-center gap-3 mb-2">
          <div style="width:32px;height:32px;border-radius:8px;background:${info.color};display:flex;align-items:center;justify-content:center">
            ${icon('music', 16)}
          </div>
          <div>
            <strong style="font-size:14px">${info.label}</strong>
            <div>${statusBadge(d.status)}</div>
          </div>
        </div>

        ${d.distributor ? `<p class="text-xs text-muted mb-2">via ${d.distributor}</p>` : ''}
        ${d.external_url ? `<a href="${d.external_url}" target="_blank" class="text-xs" style="color:var(--accent)">View on platform</a>` : ''}

        <div class="mt-2">
          <select class="select-inline" style="width:100%" onchange="updateDist('${d.id}', this.value)">
            <option value="not_submitted" ${d.status === 'not_submitted' ? 'selected' : ''}>Not Submitted</option>
            <option value="submitted" ${d.status === 'submitted' ? 'selected' : ''}>Submitted</option>
            <option value="in_review" ${d.status === 'in_review' ? 'selected' : ''}>In Review</option>
            <option value="live" ${d.status === 'live' ? 'selected' : ''}>Live</option>
            <option value="rejected" ${d.status === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>
      </div>
    `;
  }).join('');
}

async function addAllPlatforms() {
  const releaseId = document.getElementById('dist-release').value;
  if (!releaseId) { showToast('Select a release first', 'error'); return; }

  try {
    await api.post('/releases/' + releaseId + '/distributions/all', {});
    showToast('All platforms added!', 'success');
    loadDistributions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateDist(id, status) {
  try {
    const body = { status };
    if (status === 'submitted') body.submitted_date = new Date().toISOString().split('T')[0];
    if (status === 'live') body.live_date = new Date().toISOString().split('T')[0];
    await api.put('/distributions/' + id, body);
    showToast('Updated', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadDistPage);
