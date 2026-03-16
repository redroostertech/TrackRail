const urlParams = new URLSearchParams(window.location.search);
const preselectedRelease = urlParams.get('release');

async function loadUploadPage() {
  // Load releases for dropdown
  try {
    const res = await api.get('/releases');
    const select = document.getElementById('release-select');
    for (const r of res.data) {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `${r.title} (${r.release_type})`;
      if (r.id === preselectedRelease) opt.selected = true;
      select.appendChild(opt);
    }

    if (preselectedRelease) loadTracks(preselectedRelease);
  } catch (err) {
    showToast(err.message, 'error');
  }

  // Release change handler
  document.getElementById('release-select').addEventListener('change', (e) => {
    if (e.target.value) loadTracks(e.target.value);
  });

  // Upload zone
  const zone = document.getElementById('upload-area');
  const input = document.getElementById('file-input');

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  input.addEventListener('change', (e) => handleFiles(e.target.files));
}

async function handleFiles(files) {
  const releaseId = document.getElementById('release-select').value;
  if (!releaseId) {
    showToast('Please select a release first', 'error');
    return;
  }

  const progressEl = document.getElementById('upload-progress');
  progressEl.classList.remove('hidden');

  for (const file of files) {
    progressEl.innerHTML = `<div class="card"><p>Uploading <strong>${file.name}</strong>...</p></div>`;

    const formData = new FormData();
    formData.append('audio', file);

    try {
      await api.upload('/releases/' + releaseId + '/tracks', formData);
      showToast(`Uploaded: ${file.name}`, 'success');
    } catch (err) {
      showToast(`Failed: ${file.name} - ${err.message}`, 'error');
    }
  }

  progressEl.classList.add('hidden');
  loadTracks(releaseId);
}

async function loadTracks(releaseId) {
  try {
    const res = await api.get('/releases/' + releaseId + '/tracks');
    renderUploadedTracks(res.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderUploadedTracks(tracks) {
  const el = document.getElementById('tracks-table');

  if (!tracks.length) {
    el.innerHTML = '<p class="text-sm text-muted">No tracks yet. Upload some files above.</p>';
    return;
  }

  el.innerHTML = `<table>
    <thead><tr>
      <th>#</th><th>Title</th><th>Format</th><th>Size</th><th>BPM</th><th>Key</th><th>Genre</th><th>Mood</th><th>ISRC</th><th>Actions</th>
    </tr></thead>
    <tbody>
      ${tracks.map(t => `<tr>
        <td>${t.track_number}</td>
        <td><input type="text" value="${t.title}" style="width:150px" onchange="updateTrack('${t.id}', 'title', this.value)"></td>
        <td class="text-xs text-muted">${(t.file_format || '-').toUpperCase()}</td>
        <td class="text-xs text-muted">${t.file_size ? (t.file_size / 1024 / 1024).toFixed(1) + ' MB' : '-'}</td>
        <td>${t.bpm || '<span class="text-muted">-</span>'}</td>
        <td>${t.musical_key || '<span class="text-muted">-</span>'}</td>
        <td>${t.genre || '<span class="text-muted">-</span>'}</td>
        <td>${t.mood || '<span class="text-muted">-</span>'}</td>
        <td><span class="font-mono text-xs">${t.isrc_code || '<span class="text-muted">-</span>'}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm" onclick="analyzeTrack('${t.id}')">
              ${icon('sparkle', 12)} AI Analyze
            </button>
            <button class="btn btn-secondary btn-sm" onclick="assignISRC('${t.id}')">ISRC</button>
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="mt-4">
    <button class="btn btn-primary" onclick="analyzeAll()">
      ${icon('sparkle', 14)} Analyze All Tracks
    </button>
  </div>`;
}

async function updateTrack(trackId, field, value) {
  try {
    await api.put('/tracks/' + trackId, { [field]: value });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function analyzeTrack(trackId) {
  showToast('Running AI analysis...', 'info');
  try {
    await api.post('/tracks/' + trackId + '/analyze');
    showToast('Analysis complete!', 'success');
    const releaseId = document.getElementById('release-select').value;
    loadTracks(releaseId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function assignISRC(trackId) {
  try {
    await api.post('/tracks/' + trackId + '/isrc');
    showToast('ISRC assigned!', 'success');
    const releaseId = document.getElementById('release-select').value;
    loadTracks(releaseId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function analyzeAll() {
  const releaseId = document.getElementById('release-select').value;
  if (!releaseId) return;

  showToast('Analyzing all tracks...', 'info');
  try {
    const res = await api.get('/releases/' + releaseId + '/tracks');
    for (const track of res.data) {
      if (!track.ai_analyzed) {
        await api.post('/tracks/' + track.id + '/analyze');
      }
      if (!track.isrc_code) {
        await api.post('/tracks/' + track.id + '/isrc');
      }
    }
    showToast('All tracks analyzed!', 'success');
    loadTracks(releaseId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadUploadPage);
