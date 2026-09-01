// frontend/js/toggle-sections.js
// Universal Section Toggle System for Admin and Operator interfaces

class SectionToggleManager {
  constructor() {
    this.storageKey = 'tristar_section_states';
    this.states = this.loadStates();
    this.initialized = false;
  }
  
  /**
   * Initialize toggle system
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;
    
    // Apply saved states
    this.applySavedStates();
    
    // Setup global toggle all button
    this.setupGlobalToggle();
  }
  
  /**
   * Load states from localStorage
   */
  loadStates() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }
  
  /**
   * Save states to localStorage
   */
  saveStates() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.states));
    } catch (e) {
      console.error('Failed to save section states:', e);
    }
  }
  
  /**
   * Apply saved states on page load
   */
  applySavedStates() {
    Object.forEach(this.states, (collapsed, sectionId) => {
      if (collapsed) {
        this.collapseSection(sectionId, false);
      }
    });
  }
  
  /**
   * Toggle a section
   */
  toggle(sectionId, save = true) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    const isCollapsed = section.classList.contains('collapsed');
    
    if (isCollapsed) {
      this.expandSection(sectionId, save);
    } else {
      this.collapseSection(sectionId, save);
    }
  }
  
  /**
   * Collapse a section
   */
  collapseSection(sectionId, save = true) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    section.classList.add('collapsed');
    this.updateToggleButton(sectionId, true);
    
    if (save) {
      this.states[sectionId] = true;
      this.saveStates();
    }
  }
  
  /**
   * Expand a section
   */
  expandSection(sectionId, save = true) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    section.classList.remove('collapsed');
    this.updateToggleButton(sectionId, false);
    
    if (save) {
      this.states[sectionId] = false;
      this.saveStates();
    }
  }
  
  /**
   * Update toggle button icon
   */
  updateToggleButton(sectionId, isCollapsed) {
    const btn = document.querySelector(`[data-toggle-target="${sectionId}"]`);
    if (!btn) return;
    
    if (isCollapsed) {
      btn.classList.add('collapsed');
    } else {
      btn.classList.remove('collapsed');
    }
  }
  
  /**
   * Setup global toggle all button
   */
  setupGlobalToggle() {
    const globalToggle = document.getElementById('toggleAllSections');
    if (!globalToggle) return;
    
    globalToggle.addEventListener('click', () => {
      const allSections = document.querySelectorAll('.collapsible-section, .stats-grid-wrapper, .quick-actions-wrapper, .wa-dashboard-container, .activity-section');
      const anyExpanded = Array.from(allSections).some(s => !s.classList.contains('collapsed'));
      
      allSections.forEach(section => {
        const id = section.id;
        if (id) {
          if (anyExpanded) {
            this.collapseSection(id);
          } else {
            this.expandSection(id);
          }
        }
      });
      
      // Update button state
      if (anyExpanded) {
        globalToggle.classList.add('expand-all');
      } else {
        globalToggle.classList.remove('expand-all');
      }
    });
  }
  
  /**
   * Create a toggle button HTML
   */
  createToggleButton(sectionId, label = '') {
    return `
      <button class="section-toggle-btn" data-toggle-target="${sectionId}" onclick="sectionToggle.toggle('${sectionId}')">
        <i class="fas fa-chevron-down"></i>
        ${label}
      </button>
    `;
  }
  
  /**
   * Reset all sections to expanded
   */
  expandAll() {
    const allSections = document.querySelectorAll('.collapsible-section, .stats-grid-wrapper, .quick-actions-wrapper, .wa-dashboard-container, .activity-section');
    allSections.forEach(section => {
      if (section.id) {
        this.expandSection(section.id);
      }
    });
  }
  
  /**
   * Collapse all sections
   */
  collapseAll() {
    const allSections = document.querySelectorAll('.collapsible-section, .stats-grid-wrapper, .quick-actions-wrapper, .wa-dashboard-container, .activity-section');
    allSections.forEach(section => {
      if (section.id) {
        this.collapseSection(section.id);
      }
    });
  }
}

// Polyfill for Object.forEach
if (!Object.forEach) {
  Object.forEach = function(obj, callback) {
    Object.keys(obj).forEach(key => callback(obj[key], key, obj));
  };
}

// Global instance
let sectionToggle;

document.addEventListener('DOMContentLoaded', () => {
  sectionToggle = new SectionToggleManager();
  sectionToggle.init();
});

// Legacy function for backward compatibility
function toggleActionGroup(groupId) {
  if (sectionToggle) {
    sectionToggle.toggle(groupId);
  } else {
    // Fallback for pages without the toggle manager
    const group = document.getElementById(groupId);
    const toggleBtn = document.querySelector(`[onclick*="toggleActionGroup('${groupId}')"]`);
    
    if (group) {
      if (group.classList.contains('collapsed')) {
        group.classList.remove('collapsed');
        if (toggleBtn) toggleBtn.classList.remove('collapsed');
      } else {
        group.classList.add('collapsed');
        if (toggleBtn) toggleBtn.classList.add('collapsed');
      }
    }
  }
}
