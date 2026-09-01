// ===== THEME MANAGER MODULE =====
// Handles light/dark mode toggle with localStorage persistence

const ThemeManager = {
    // Initialize theme on page load
    init() {
        const savedTheme = localStorage.getItem('tristar-theme') || 'dark';
        this.setTheme(savedTheme);
        this.createToggleButton();
    },

    // Set theme
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('tristar-theme', theme);
        this.updateToggleIcon(theme);
    },

    // Toggle between light and dark
    toggle() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        this.setTheme(next);
    },

    // Create floating toggle button
    createToggleButton() {
        // Don't duplicate if already exists
        if (document.getElementById('themeToggle')) return;

        const btn = document.createElement('button');
        btn.id = 'themeToggle';
        btn.className = 'theme-toggle';
        btn.setAttribute('aria-label', 'Toggle light/dark theme');
        btn.innerHTML = this.getIcon(document.documentElement.getAttribute('data-theme') || 'dark');
        btn.addEventListener('click', () => this.toggle());
        document.body.appendChild(btn);
    },

    // Get appropriate icon
    getIcon(theme) {
        return theme === 'dark' 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    },

    // Update toggle button icon
    updateToggleIcon(theme) {
        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.innerHTML = this.getIcon(theme);
        }
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});
