// ---- Sidebar Navigation ----
const NAV_ITEMS = [
  { section: 'Release', items: [
    { id: 'dashboard', label: 'Dashboard', href: '/', icon: 'grid' },
    { id: 'upload', label: 'Upload', href: '/upload.html', icon: 'upload' },
    { id: 'calendar', label: 'Calendar', href: '/calendar.html', icon: 'calendar' },
  ]},
  { section: 'Rights', items: [
    { id: 'copyright', label: 'Copyright', href: '/copyright.html', icon: 'shield' },
    { id: 'splits', label: 'Split Sheets', href: '/splits.html', icon: 'split' },
    { id: 'pro', label: 'PRO Registration', href: '/pro.html', icon: 'music' },
  ]},
  { section: 'Distribution', items: [
    { id: 'distribution', label: 'Distribution', href: '/distribution.html', icon: 'globe' },
    { id: 'analytics', label: 'Analytics', href: '/analytics.html', icon: 'chart' },
  ]},
];

const ICONS = {
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  split: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 009 9"/></svg>',
  music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
};

function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const currentPath = window.location.pathname;

  let html = `
    <div class="sidebar-logo">
      <img src="/img/logo.png" alt="TrackRail">
      <h1>Track<span>Rail</span></h1>
      <small>AI Release Infrastructure</small>
    </div>
    <nav class="sidebar-nav">
  `;

  for (const section of NAV_ITEMS) {
    html += `<div class="sidebar-section">
      <div class="sidebar-section-title">${section.section}</div>`;

    for (const item of section.items) {
      const isActive = currentPath === item.href || (item.href === '/' && (currentPath === '/index.html' || currentPath === '/'));
      html += `<a class="nav-item ${isActive ? 'active' : ''}" href="${item.href}">
        ${ICONS[item.icon] || ''}
        ${item.label}
      </a>`;
    }
    html += '</div>';
  }

  html += '</nav>';
  sidebar.innerHTML = html;
}

// ---- Toast notifications ----
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

// ---- Modal helper ----
function showModal(title, contentHtml, actions) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  let actionsHtml = '';
  if (actions) {
    actionsHtml = '<div class="modal-actions">' +
      actions.map(a => `<button class="btn ${a.class || 'btn-secondary'}" data-action="${a.id}">${a.label}</button>`).join('') +
      '</div>';
  }

  overlay.innerHTML = `<div class="modal">
    <h3>${title}</h3>
    <div class="modal-body">${contentHtml}</div>
    ${actionsHtml}
  </div>`;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
    const action = e.target.dataset.action;
    if (action === 'cancel') overlay.remove();
    if (action && actions) {
      const handler = actions.find(a => a.id === action);
      if (handler && handler.onClick) handler.onClick(overlay);
    }
  });

  return overlay;
}

function closeModal(overlay) {
  if (overlay) overlay.remove();
}

// ---- Confirm dialog (replaces native confirm()) ----
function confirmAction(title, message, { confirmLabel = 'Confirm', confirmClass = 'btn-danger', icon: iconName } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const iconHtml = iconName === 'trash'
      ? '<div class="confirm-icon confirm-icon-danger"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></div>'
      : iconName === 'warning'
      ? '<div class="confirm-icon confirm-icon-warning"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>'
      : '';

    overlay.innerHTML = `<div class="modal confirm-modal">
      ${iconHtml}
      <h3>${title}</h3>
      <p class="text-sm text-secondary" style="margin-bottom:20px">${message}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" data-action="cancel">Cancel</button>
        <button class="btn ${confirmClass}" data-action="confirm">${confirmLabel}</button>
      </div>
    </div>`;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'cancel' || e.target === overlay) {
        overlay.remove();
        resolve(false);
      } else if (action === 'confirm') {
        overlay.remove();
        resolve(true);
      }
    });

    // Focus confirm button
    setTimeout(() => overlay.querySelector('[data-action="confirm"]').focus(), 50);
  });
}

// ---- Helpers ----
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function formatCurrency(n) {
  return '$' + n.toFixed(2);
}

function statusBadge(status) {
  const label = status.replace(/_/g, ' ');
  return `<span class="badge badge-${status}">${label}</span>`;
}

function icon(name, size = 16) {
  const svg = ICONS[name] || '';
  return svg.replace('viewBox', `width="${size}" height="${size}" viewBox`);
}

// ---- Init sidebar on load ----
document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
});
