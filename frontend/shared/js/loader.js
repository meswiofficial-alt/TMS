// ===== GLOBAL LOADER MANAGEMENT =====
// Include this script to show/hide loader during API calls and page transitions

(function() {
    'use strict';

    // Configuration
    const MIN_LOADER_DURATION = 800; // Minimum time loader stays visible (ms)

    // Loader state management
    let loaderRefCount = 0;
    let loaderShowTime = 0;
    let hideTimeout = null;
    let apiCallPatched = false;

    const loaderElement = () => document.getElementById('globalLoader');

    // Show loader
    function showLoader() {
        const loader = loaderElement();
        if (loader) {
            // Clear any pending hide
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }

            // Record show time on first show
            if (loaderRefCount === 0) {
                loaderShowTime = Date.now();
                loader.classList.remove('hidden');
            }
            loaderRefCount++;
        }
    }

    // Hide loader with minimum duration enforcement
    function hideLoader() {
        const loader = loaderElement();
        if (loader) {
            loaderRefCount = Math.max(0, loaderRefCount - 1);

            if (loaderRefCount === 0) {
                const elapsed = Date.now() - loaderShowTime;
                const remaining = Math.max(0, MIN_LOADER_DURATION - elapsed);

                // Enforce minimum display duration
                hideTimeout = setTimeout(() => {
                    loader.classList.add('hidden');
                    hideTimeout = null;
                }, remaining);
            }
        }
    }

    // Force hide loader (bypasses minimum delay)
    function forceHideLoader() {
        const loader = loaderElement();
        if (loader) {
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
            loaderRefCount = 0;
            loaderShowTime = 0;
            loader.classList.add('hidden');
        }
    }

    // Patch apiCall to auto-show/hide loader
    function patchApiCall() {
        if (apiCallPatched) return;

        // Check if apiCall exists (defined in app.js)
        if (typeof window.apiCall === 'function') {
            const originalApiCall = window.apiCall;
            window.apiCall = function(endpoint, method = 'GET', data = null) {
                showLoader();
                return originalApiCall(endpoint, method, data)
                    .finally(() => hideLoader());
            };
            apiCallPatched = true;
        }
    }

    // ===== SECTION LOADER =====
    function showSectionLoader(containerId, message = 'Loading...') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="section-loader">
                    <div class="spinner"></div>
                    <span class="loading-text">${message}</span>
                </div>
            `;
        }
    }

    // ===== SKELETON LOADER =====
    function showSkeletonLoader(containerId, count = 3) {
        const container = document.getElementById(containerId);
        if (container) {
            let html = '';
            for (let i = 0; i < count; i++) {
                html += `
                    <div class="skeleton skeleton-card">
                        <div class="skeleton skeleton-text" style="width: 70%; margin-bottom: 12px;"></div>
                        <div class="skeleton skeleton-text short"></div>
                    </div>
                `;
            }
            container.innerHTML = html;
        }
    }

    // ===== BUTTON LOADER =====
    function setButtonLoading(button, loading = true) {
        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<span class="btn-loader">Processing...</span>';
            button.disabled = true;
        } else {
            button.innerHTML = button.dataset.originalText || 'Submit';
            button.disabled = false;
        }
    }

    // Expose globally
    window.showLoader = showLoader;
    window.hideLoader = hideLoader;
    window.forceHideLoader = forceHideLoader;
    window.showSectionLoader = showSectionLoader;
    window.showSkeletonLoader = showSkeletonLoader;
    window.setButtonLoading = setButtonLoading;

    // Auto-hide loader after page fully loads with minimum delay
    window.addEventListener('load', function() {
        // Try to patch apiCall now that all scripts are loaded
        patchApiCall();
        setTimeout(forceHideLoader, 500);
    });

    // Also try to patch on DOMContentLoaded (for cases where apiCall is defined earlier)
    document.addEventListener('DOMContentLoaded', function() {
        // Retry patching a few times to handle script loading race conditions
        let retries = 10;
        const retryPatch = setInterval(() => {
            if (apiCallPatched || retries <= 0) {
                clearInterval(retryPatch);
                return;
            }
            patchApiCall();
            retries--;
        }, 100);
    });

    // Fallback: force hide after 10 seconds max (safety net)
    setTimeout(forceHideLoader, 10000);

    // Patch fetch for operator dashboard (as backup)
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        showLoader();
        return originalFetch.apply(this, args)
            .finally(() => hideLoader());
    };
})();
