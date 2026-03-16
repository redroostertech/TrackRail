let currentDate = new Date();
let allMilestones = [];

async function loadCalendarPage() {
  try {
    const res = await api.get('/releases');
    const select = document.getElementById('cal-release');
    for (const r of res.data) {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.title;
      select.appendChild(opt);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }

  loadCalendar();
}

async function loadCalendar() {
  try {
    const releaseId = document.getElementById('cal-release').value;
    let path = '/calendar';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    path += `?from=${firstDay.toISOString().split('T')[0]}&to=${lastDay.toISOString().split('T')[0]}`;

    const res = await api.get(path);
    allMilestones = res.data;

    if (releaseId) {
      allMilestones = allMilestones.filter(m => m.release_id === releaseId);
    }

    renderCalendar();
    renderUpcoming();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  document.getElementById('month-label').textContent =
    currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Group milestones by date
  const byDate = {};
  for (const m of allMilestones) {
    const d = m.due_date.split('T')[0];
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(m);
  }

  let html = '<div class="cal-grid">';

  // Headers
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (const d of days) {
    html += `<div class="cal-header">${d}</div>`;
  }

  // Empty cells before first day
  for (let i = 0; i < startDay; i++) {
    html += '<div class="cal-day other-month"></div>';
  }

  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const events = byDate[dateStr] || [];

    html += `<div class="cal-day ${isToday ? 'today' : ''}">
      <div class="cal-day-num">${d}</div>
      ${events.map(e => `
        <div class="cal-event cal-event-${e.milestone_type} ${e.completed ? 'completed' : ''}"
          onclick="toggleMilestone('${e.id}', ${e.completed ? 0 : 1})"
          title="${e.title}${e.release_title ? ' (' + e.release_title + ')' : ''}">
          ${e.title}
        </div>
      `).join('')}
    </div>`;
  }

  // Fill remaining cells
  const totalCells = startDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < remaining; i++) {
    html += '<div class="cal-day other-month"></div>';
  }

  html += '</div>';
  document.getElementById('calendar').innerHTML = html;
}

function renderUpcoming() {
  const el = document.getElementById('upcoming-list');
  const now = new Date().toISOString().split('T')[0];
  const upcoming = allMilestones
    .filter(m => !m.completed && m.due_date >= now)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 10);

  if (!upcoming.length) {
    el.innerHTML = '<p class="text-sm text-muted">No upcoming milestones</p>';
    return;
  }

  el.innerHTML = upcoming.map(m => `
    <div class="flex items-center justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div class="flex items-center gap-3">
        <div class="checklist-dot" onclick="toggleMilestone('${m.id}', 1)" style="cursor:pointer"></div>
        <div>
          <strong class="text-sm">${m.title}</strong>
          ${m.release_title ? `<span class="text-xs text-muted"> - ${m.release_title}</span>` : ''}
          ${m.description ? `<p class="text-xs text-muted">${m.description}</p>` : ''}
        </div>
      </div>
      <span class="text-xs text-muted">${formatDate(m.due_date)}</span>
    </div>
  `).join('');
}

function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  loadCalendar();
}

async function toggleMilestone(id, completed) {
  try {
    if (completed) {
      await api.put('/milestones/' + id + '/complete');
    } else {
      await api.put('/milestones/' + id + '/uncomplete');
    }
    loadCalendar();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function generateTimeline() {
  const releaseId = document.getElementById('cal-release').value;
  if (!releaseId) { showToast('Select a release first', 'error'); return; }

  showToast('AI generating timeline...', 'info');
  try {
    await api.post('/releases/' + releaseId + '/milestones/generate');
    showToast('Timeline generated!', 'success');
    loadCalendar();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadCalendarPage);
