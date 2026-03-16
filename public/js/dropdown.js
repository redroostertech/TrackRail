// Custom styled dropdown component
// Replaces native <select> elements with fully styled dark-themed dropdowns

class CustomDropdown {
  constructor(selectEl) {
    this.select = selectEl;
    this.isOpen = false;
    this.selectedIndex = selectEl.selectedIndex;
    this.id = selectEl.id;

    this.build();
    this.attachEvents();

    // Hide original select
    this.select.style.display = 'none';
    this.select.setAttribute('data-custom-dropdown', 'true');
  }

  build() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'dropdown';
    if (this.select.classList.contains('select-inline')) {
      this.wrapper.classList.add('dropdown-inline');
    }
    // Copy width style if present
    if (this.select.style.width) {
      this.wrapper.style.width = this.select.style.width;
    }

    // Trigger button
    this.trigger = document.createElement('button');
    this.trigger.type = 'button';
    this.trigger.className = 'dropdown-trigger';

    // Selected text
    this.label = document.createElement('span');
    this.label.className = 'dropdown-label';

    // Chevron
    this.chevron = document.createElement('span');
    this.chevron.className = 'dropdown-chevron';
    this.chevron.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';

    this.trigger.appendChild(this.label);
    this.trigger.appendChild(this.chevron);

    // Options menu
    this.menu = document.createElement('div');
    this.menu.className = 'dropdown-menu';

    this.wrapper.appendChild(this.trigger);
    this.wrapper.appendChild(this.menu);

    // Insert after the select
    this.select.parentNode.insertBefore(this.wrapper, this.select.nextSibling);

    this.renderOptions();
    this.updateLabel();
  }

  renderOptions() {
    this.menu.innerHTML = '';
    const options = this.select.options;

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      if (i === this.select.selectedIndex) item.classList.add('selected');
      if (opt.disabled) item.classList.add('disabled');
      item.dataset.index = i;
      item.dataset.value = opt.value;
      item.textContent = opt.textContent;
      this.menu.appendChild(item);
    }
  }

  updateLabel() {
    const selected = this.select.options[this.select.selectedIndex];
    if (selected) {
      this.label.textContent = selected.textContent;
      // Dim placeholder options
      if (!selected.value) {
        this.label.classList.add('placeholder');
      } else {
        this.label.classList.remove('placeholder');
      }
    }
  }

  attachEvents() {
    // Toggle open
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    });

    // Select option
    this.menu.addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown-item');
      if (!item || item.classList.contains('disabled')) return;

      const index = parseInt(item.dataset.index);
      this.select.selectedIndex = index;
      this.select.dispatchEvent(new Event('change', { bubbles: true }));
      this.updateLabel();
      this.renderOptions();
      this.close();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.wrapper.contains(e.target)) {
        this.close();
      }
    });

    // Keyboard navigation
    this.trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.isOpen ? this.close() : this.open();
      } else if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.moveSelection(-1);
      }
    });

    // Watch for dynamic option changes via MutationObserver
    this.observer = new MutationObserver(() => {
      this.renderOptions();
      this.updateLabel();
    });
    this.observer.observe(this.select, { childList: true, subtree: true });
  }

  moveSelection(dir) {
    let next = this.select.selectedIndex + dir;
    if (next < 0) next = 0;
    if (next >= this.select.options.length) next = this.select.options.length - 1;
    this.select.selectedIndex = next;
    this.select.dispatchEvent(new Event('change', { bubbles: true }));
    this.updateLabel();
    this.renderOptions();
  }

  open() {
    // Close any other open dropdowns first
    document.querySelectorAll('.dropdown.open').forEach(d => {
      if (d !== this.wrapper) d.classList.remove('open');
    });

    this.isOpen = true;
    this.wrapper.classList.add('open');

    // Position menu - check if it would overflow bottom of viewport
    const rect = this.wrapper.getBoundingClientRect();
    const menuHeight = this.menu.scrollHeight;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceBelow < menuHeight && rect.top > menuHeight) {
      this.menu.classList.add('dropdown-menu-up');
    } else {
      this.menu.classList.remove('dropdown-menu-up');
    }

    // Scroll selected item into view
    const selected = this.menu.querySelector('.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }

  close() {
    this.isOpen = false;
    this.wrapper.classList.remove('open');
  }

  // Refresh after programmatic changes
  refresh() {
    this.renderOptions();
    this.updateLabel();
  }

  destroy() {
    this.observer.disconnect();
    this.wrapper.remove();
    this.select.style.display = '';
    this.select.removeAttribute('data-custom-dropdown');
  }
}

// ---- Auto-initialize all selects ----
function initDropdowns(container) {
  const root = container || document;
  const selects = root.querySelectorAll('select:not([data-custom-dropdown])');
  selects.forEach(sel => new CustomDropdown(sel));
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Delay slightly to let page controllers populate options first
  setTimeout(() => initDropdowns(), 100);
});

// Re-init when modals are created (MutationObserver on body)
const dropdownBodyObserver = new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType === 1) {
        // Check if it's a modal overlay or contains selects
        const selects = node.querySelectorAll ? node.querySelectorAll('select:not([data-custom-dropdown])') : [];
        if (selects.length > 0) {
          setTimeout(() => initDropdowns(node), 10);
        }
      }
    }
  }
});
dropdownBodyObserver.observe(document.body, { childList: true, subtree: true });
