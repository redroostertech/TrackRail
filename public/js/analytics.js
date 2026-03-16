async function loadAnalytics() {
  try {
    const res = await api.get('/analytics/overview');
    const data = res.data;

    // Stats
    document.getElementById('overview-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Total Streams</div>
        <div class="stat-value">${formatNumber(data.totalStreams)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Est. Revenue</div>
        <div class="stat-value">${formatCurrency(data.totalRevenue)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Saves</div>
        <div class="stat-value">${formatNumber(data.totalSaves)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Platforms</div>
        <div class="stat-value">${data.platformBreakdown.length}</div>
      </div>
    `;

    // Platform breakdown (bar chart using divs)
    renderPlatformChart(data.platformBreakdown);

    // Top tracks
    renderTopTracks(data.topTracks);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderPlatformChart(platforms) {
  const el = document.getElementById('platform-chart');
  if (!platforms.length) {
    el.innerHTML = '<p class="text-sm text-muted">No streaming data yet. Click "Seed Demo Data" to generate sample analytics.</p>';
    return;
  }

  const maxStreams = Math.max(...platforms.map(p => p.total_streams));
  const colors = {
    spotify: '#1DB954',
    apple_music: '#FA243C',
    amazon_music: '#25D1DA',
    youtube_music: '#FF0000',
    tidal: '#7c3aed',
    deezer: '#A238FF',
    soundcloud: '#FF5500',
    bandcamp: '#1DA0C3'
  };

  const labels = {
    spotify: 'Spotify',
    apple_music: 'Apple Music',
    amazon_music: 'Amazon Music',
    youtube_music: 'YouTube Music',
    tidal: 'Tidal',
    deezer: 'Deezer',
    soundcloud: 'SoundCloud',
    bandcamp: 'Bandcamp'
  };

  el.innerHTML = platforms.map(p => {
    const pct = (p.total_streams / maxStreams) * 100;
    const color = colors[p.platform] || '#666';
    const label = labels[p.platform] || p.platform;

    return `
      <div class="flex items-center gap-3" style="margin-bottom:8px">
        <span class="text-xs" style="width:100px;text-align:right;color:var(--text-secondary)">${label}</span>
        <div style="flex:1;height:24px;background:var(--bg-primary);border-radius:4px;overflow:hidden;position:relative">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width 0.5s ease"></div>
        </div>
        <span class="text-xs font-mono" style="width:60px;color:var(--text-secondary)">${formatNumber(p.total_streams)}</span>
        <span class="text-xs" style="width:60px;color:var(--success)">${formatCurrency(p.total_revenue)}</span>
      </div>
    `;
  }).join('');
}

function renderTopTracks(tracks) {
  const el = document.getElementById('top-tracks');

  if (!tracks.length) {
    el.innerHTML = '<p class="text-sm text-muted">No track data yet.</p>';
    return;
  }

  el.innerHTML = `<table>
    <thead><tr><th>#</th><th>Track</th><th>Release</th><th>Streams</th><th>Revenue</th></tr></thead>
    <tbody>
      ${tracks.map((t, i) => `<tr>
        <td>${i + 1}</td>
        <td><strong>${t.title}</strong></td>
        <td class="text-sm text-secondary">${t.release_title}</td>
        <td class="font-mono">${formatNumber(t.total_streams)}</td>
        <td class="font-mono" style="color:var(--success)">${formatCurrency(t.total_revenue)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

async function seedData() {
  showToast('Generating demo analytics data...', 'info');
  try {
    const res = await api.post('/analytics/seed');
    showToast(`Seeded ${res.data.seeded} data points!`, 'success');
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadAnalytics);
