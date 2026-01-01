// ==UserScript==
// @name         UIUC Reddit Housing Filter
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Hide sublease and housing-related posts on r/UIUC
// @author       You
// @match        https://www.reddit.com/r/UIUC/*
// @match        https://old.reddit.com/r/UIUC/*
// @match        https://new.reddit.com/r/UIUC/*
// @match        https://sh.reddit.com/r/UIUC/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'uiuc-housing-filter-show';

    // Housing-related patterns (case-insensitive)
    const HOUSING_PATTERNS = [
        // Primary sublease patterns
        /subleas/i,
        /sublet/i,
        /sublessee/i,

        // Roommate patterns
        /roommate/i,
        /room\s*mate/i,

        // Lease transfer patterns
        /lease\s*(takeover|take\s*over)/i,
        /(takeover|take\s*over)\s*lease/i,
        /relet/i,

        // Price patterns (e.g., $500/month, $400/mo)
        /\$\d+\s*\/\s*(mo|month|m)\b/i,
        /\$\d+\s*(per|a)\s*month/i,

        // Bedroom patterns (1BR, 2B2B, 1 bedroom, etc.)
        /\dB\dB/i,
        /\dBR\b/i,
        /\d\s*bed(room)?s?\b/i,
        /\dbd\b/i,
    ];

    // Get stored preference (default: false = hide housing posts)
    let showHousing = localStorage.getItem(STORAGE_KEY) === 'true';

    function shouldHidePost(title) {
        if (!title) return false;
        return HOUSING_PATTERNS.some(pattern => pattern.test(title));
    }

    function updatePostVisibility(post, isHousingPost) {
        if (isHousingPost) {
            post.style.display = showHousing ? '' : 'none';
        }
    }

    function processNewReddit() {
        const posts = document.querySelectorAll('shreddit-post, [data-testid="post-container"], article');
        posts.forEach(post => {
            const titleElement = post.querySelector('a[slot="title"], [data-testid="post-title"], h3, [slot="title"]');
            const title = titleElement?.textContent || post.getAttribute('post-title') || '';

            if (shouldHidePost(title)) {
                post.dataset.housingPost = 'true';
                updatePostVisibility(post, true);
                if (!post.dataset.housingLogged) {
                    post.dataset.housingLogged = 'true';
                    console.log('[UIUC Housing Filter] Housing post:', title);
                }
            }
        });
    }

    function processOldReddit() {
        const posts = document.querySelectorAll('.thing.link');
        posts.forEach(post => {
            const titleElement = post.querySelector('a.title');
            const title = titleElement?.textContent || '';

            if (shouldHidePost(title)) {
                post.dataset.housingPost = 'true';
                updatePostVisibility(post, true);
                if (!post.dataset.housingLogged) {
                    post.dataset.housingLogged = 'true';
                    console.log('[UIUC Housing Filter] Housing post:', title);
                }
            }
        });
    }

    function processPosts() {
        processNewReddit();
        processOldReddit();
    }

    function updateAllPosts() {
        document.querySelectorAll('[data-housing-post="true"]').forEach(post => {
            updatePostVisibility(post, true);
        });
    }

    function createCheckbox(id, checked, onChange) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.checked = checked;
        checkbox.addEventListener('change', onChange);
        return checkbox;
    }

    function handleToggle(e) {
        showHousing = e.target.checked;
        localStorage.setItem(STORAGE_KEY, showHousing);
        updateAllPosts();
        console.log('[UIUC Housing Filter] Show housing:', showHousing);
    }

    function createToggleForNewReddit() {
        // Look for the sidebar community info section
        const sidebar = document.querySelector('aside[aria-label="Subreddit sidebar"], #right-sidebar, aside');
        if (!sidebar || document.getElementById('uiuc-housing-filter-toggle')) return false;

        // Find the community description or first widget
        const targetSelectors = [
            'shreddit-subreddit-header-community-information',
            '[data-testid="subreddit-sidebar"]',
            'div[class*="sidebar"]',
            'aside > div'
        ];

        let target = null;
        for (const selector of targetSelectors) {
            target = sidebar.querySelector(selector);
            if (target) break;
        }

        if (!target) {
            target = sidebar.firstElementChild;
        }

        if (!target) return false;

        // Create container matching new Reddit style
        const container = document.createElement('div');
        container.id = 'uiuc-housing-filter-toggle';
        container.style.cssText = `
            padding: 12px 16px;
            margin-bottom: 12px;
            background: var(--color-neutral-background-weak, #f6f7f8);
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: inherit;
            font-size: 14px;
        `;

        const checkbox = createCheckbox('uiuc-housing-toggle', showHousing, handleToggle);
        checkbox.style.cssText = `
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #ff4500;
        `;

        const label = document.createElement('label');
        label.htmlFor = 'uiuc-housing-toggle';
        label.textContent = 'Show Housing Posts';
        label.style.cssText = `
            cursor: pointer;
            user-select: none;
            color: var(--color-neutral-content, #1c1c1c);
            font-weight: 500;
        `;

        container.appendChild(checkbox);
        container.appendChild(label);

        target.parentNode.insertBefore(container, target);
        return true;
    }

    function createToggleForOldReddit() {
        // Old Reddit sidebar
        const sidebar = document.querySelector('.side');
        if (!sidebar || document.getElementById('uiuc-housing-filter-toggle')) return false;

        // Find the titlebox (subreddit description area)
        const titlebox = sidebar.querySelector('.titlebox');
        if (!titlebox) return false;

        // Create container matching old Reddit style
        const container = document.createElement('div');
        container.id = 'uiuc-housing-filter-toggle';
        container.className = 'spacer';
        container.style.cssText = `
            padding: 10px;
            margin-bottom: 10px;
            background: #f6f7f8;
            border: 1px solid #e5e5e5;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
        `;

        const checkbox = createCheckbox('uiuc-housing-toggle', showHousing, handleToggle);
        checkbox.style.cssText = `
            width: 16px;
            height: 16px;
            cursor: pointer;
        `;

        const label = document.createElement('label');
        label.htmlFor = 'uiuc-housing-toggle';
        label.textContent = 'Show Housing Posts';
        label.style.cssText = `
            cursor: pointer;
            user-select: none;
            color: #333;
            font-weight: bold;
        `;

        container.appendChild(checkbox);
        container.appendChild(label);

        titlebox.parentNode.insertBefore(container, titlebox);
        return true;
    }

    function createToggleFallback() {
        // Fallback: floating UI if sidebar injection fails
        if (document.getElementById('uiuc-housing-filter-toggle')) return;

        const container = document.createElement('div');
        container.id = 'uiuc-housing-filter-toggle';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 10px 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        const checkbox = createCheckbox('uiuc-housing-toggle', showHousing, handleToggle);
        checkbox.style.cssText = `
            width: 16px;
            height: 16px;
            cursor: pointer;
        `;

        const label = document.createElement('label');
        label.htmlFor = 'uiuc-housing-toggle';
        label.textContent = 'Show Housing';
        label.style.cssText = `
            cursor: pointer;
            user-select: none;
            color: #333;
        `;

        container.appendChild(checkbox);
        container.appendChild(label);
        document.body.appendChild(container);
    }

    function createToggleUI() {
        // Try sidebar injection first, fall back to floating UI
        const isOldReddit = window.location.hostname === 'old.reddit.com' || document.querySelector('.side');

        if (isOldReddit) {
            if (!createToggleForOldReddit()) {
                createToggleFallback();
            }
        } else {
            if (!createToggleForNewReddit()) {
                createToggleFallback();
            }
        }
    }

    // Initial setup with retry for dynamic sidebar loading
    function init() {
        processPosts();

        // Try to create toggle immediately
        createToggleUI();

        // Retry a few times for dynamically loaded sidebars
        let retries = 0;
        const retryInterval = setInterval(() => {
            if (document.getElementById('uiuc-housing-filter-toggle') || retries > 10) {
                clearInterval(retryInterval);
                return;
            }
            createToggleUI();
            retries++;
        }, 500);
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Watch for dynamically loaded content (infinite scroll)
    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldProcess = true;
                break;
            }
        }
        if (shouldProcess) {
            processPosts();
            // Also try to add toggle if sidebar was dynamically loaded
            if (!document.getElementById('uiuc-housing-filter-toggle')) {
                createToggleUI();
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('[UIUC Housing Filter] Loaded and active, showHousing:', showHousing);
})();
