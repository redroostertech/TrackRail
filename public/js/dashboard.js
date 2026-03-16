const PIPELINE_STEPS = ['draft', 'metadata', 'splits', 'copyright', 'pro', 'distribution', 'scheduled', 'released'];

async function loadDashboard() {
  try {
    const [releasesRes, statsRes] = await Promise.all([
      api.get('/releases'),
      api.get('/releases/stats')
    ]);

    const releases = releasesRes.data;
    const stats = statsRes.data;

    renderStats(stats);
    renderReleases(releases);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderStats(stats) {
  const el = document.getElementById('stats');
  const byStatus = {};
  for (const s of stats.byStatus) byStatus[s.status] = s.count;

  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Releases</div>
      <div class="stat-value">${stats.total}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Tracks</div>
      <div class="stat-value">${stats.totalTracks}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">In Progress</div>
      <div class="stat-value">${(stats.total || 0) - (byStatus.released || 0)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Released</div>
      <div class="stat-value">${byStatus.released || 0}</div>
    </div>
  `;
}

function renderReleases(releases) {
  const el = document.getElementById('releases');
  const empty = document.getElementById('empty');

  if (!releases.length) {
    el.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  el.innerHTML = releases.map(r => {
    const stepIndex = PIPELINE_STEPS.indexOf(r.status);
    const pipeline = PIPELINE_STEPS.map((s, i) => {
      const cls = i < stepIndex ? 'completed' : i === stepIndex ? 'current' : '';
      return `<div class="pipeline-step ${cls}"></div>`;
    }).join('');

    return `
      <div class="card" style="cursor:pointer" onclick="window.location='/release.html?id=${r.id}'">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-muted">${r.release_type.toUpperCase()}</span>
          ${statusBadge(r.status)}
        </div>
        <h3 style="font-size:16px;font-weight:600;margin-bottom:4px">${r.title}</h3>
        ${r.genre ? `<p class="text-sm text-secondary">${r.genre}${r.subgenre ? ' / ' + r.subgenre : ''}</p>` : ''}
        <div class="pipeline">${pipeline}</div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">${r.release_date ? formatDate(r.release_date) : 'No release date'}</span>
          <span class="text-xs text-muted">${formatDate(r.updated_at)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function createRelease() {
  const modal = showModal('New Release', `
    <div class="form-group">
      <label>Title</label>
      <input type="text" id="release-title" placeholder="My New Song" autofocus>
    </div>
    <div class="form-group">
      <label>Type</label>
      <select id="release-type">
        <option value="single">Single</option>
        <option value="ep">EP</option>
        <option value="album">Album</option>
      </select>
    </div>
    <div class="form-group">
      <label>Genre</label>
      <input type="text" id="release-genre" placeholder="Pop, Hip-Hop, R&B...">
    </div>
    <div class="form-group">
      <label>Release Date</label>
      <input type="date" id="release-date">
    </div>
  `, [
    { id: 'cancel', label: 'Cancel', class: 'btn-secondary' },
    { id: 'create', label: 'Create Release', class: 'btn-primary', onClick: async (overlay) => {
      const title = overlay.querySelector('#release-title').value.trim();
      if (!title) { showToast('Title is required', 'error'); return; }
      try {
        const res = await api.post('/releases', {
          title,
          release_type: overlay.querySelector('#release-type').value,
          genre: overlay.querySelector('#release-genre').value || undefined,
          release_date: overlay.querySelector('#release-date').value || undefined
        });
        closeModal(overlay);
        showToast('Release created!', 'success');
        window.location = '/release.html?id=' + res.data.id;
      } catch (err) {
        showToast(err.message, 'error');
      }
    }}
  ]);

  // Focus the title input
  setTimeout(() => modal.querySelector('#release-title').focus(), 100);
}

document.addEventListener('DOMContentLoaded', loadDashboard);
