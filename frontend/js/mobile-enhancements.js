// frontend/js/mobile-enhancements.js
// Mobile-first enhancements for Tristar Garage

(function() {
    'use strict';
    
    // Detect touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobile = window.innerWidth < 768;
    
    // Add device class to body
    if (isTouchDevice) {
        document.body.classList.add('touch-device');
    }
    if (isMobile) {
        document.body.classList.add('mobile-view');
    }
    
    // Handle resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            document.body.classList.toggle('mobile-view', window.innerWidth < 768);
            document.body.classList.toggle('desktop-view', window.innerWidth >= 768);
        }, 150);
    });
    
    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        initScrollableTabs();
        initStickyElements();
        initTouchFeedback();
        initSafeArea();
        initModalFocus();
    });
    
    /**
     * Add scroll indicators to tab containers
     */
    function initScrollableTabs() {
        const tabContainers = document.querySelectorAll('.tab-nav-redesigned, .tab-buttons');
        
        tabContainers.forEach(container => {
            // Check if scrollable
            if (container.scrollWidth > container.clientWidth) {
                container.classList.add('scrollable');
            }
            
            // Update on scroll
            container.addEventListener('scroll', () => {
                const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
                container.classList.toggle('scrollable', !isAtEnd);
            });
        });
    }
    
    /**
     * Initialize sticky headers
     */
    function initStickyElements() {
        const dashHeader = document.querySelector('.dash-header');
        const tabNav = document.querySelector('.tab-nav-redesigned');
        
        if (dashHeader && tabNav) {
            const headerObserver = new IntersectionObserver(
                ([entry]) => {
                    tabNav.style.top = entry.isIntersecting ? '80px' : '0px';
                },
                { threshold: 0 }
            );
            
            headerObserver.observe(dashHeader);
        }
    }
    
    /**
     * Add touch feedback for buttons
     */
    function initTouchFeedback() {
        if (!isTouchDevice) return;
        
        const buttons = document.querySelectorAll('.btn, .neu-btn, .action-btn, .tab-nav-btn, .tab-btn');
        
        buttons.forEach(btn => {
            btn.addEventListener('touchstart', () => {
                btn.classList.add('touch-active');
            }, { passive: true });
            
            btn.addEventListener('touchend', () => {
                setTimeout(() => btn.classList.remove('touch-active'), 150);
            }, { passive: true });
            
            btn.addEventListener('touchcancel', () => {
                btn.classList.remove('touch-active');
            }, { passive: true });
        });
    }
    
    /**
     * Handle safe area insets
     */
    function initSafeArea() {
        // Check if safe area is supported
        const testStyle = document.createElement('style');
        testStyle.textContent = '.safe-area-test { padding-top: env(safe-area-inset-top); }';
        document.head.appendChild(testStyle);
        
        const testElement = document.createElement('div');
        testElement.className = 'safe-area-test';
        testElement.style.position = 'absolute';
        testElement.style.visibility = 'hidden';
        document.body.appendChild(testElement);
        
        const computedStyle = window.getComputedStyle(testElement);
        const hasSafeArea = computedStyle.paddingTop !== '0px';
        
        document.head.removeChild(testStyle);
        document.body.removeChild(testElement);
        
        if (hasSafeArea) {
            document.body.classList.add('has-safe-area');
        }
    }
    
    /**
     * Handle modal focus trap for accessibility
     */
    function initModalFocus() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && (node.classList.contains('modal') || node.classList.contains('modal-overlay'))) {
                        trapFocus(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    /**
     * Trap focus within modal
     */
    function trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        // Focus first element
        setTimeout(() => firstFocusable.focus(), 100);
        
        // Handle tab navigation
        modal.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    lastFocusable.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    firstFocusable.focus();
                    e.preventDefault();
                }
            }
        });
    }
    
    // Expose to global scope
    window.TristarMobile = {
        isTouchDevice,
        isMobile,
        initScrollableTabs
    };
})();
