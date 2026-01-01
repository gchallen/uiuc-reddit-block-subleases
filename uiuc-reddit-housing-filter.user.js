// ==UserScript==
// @name         UIUC Reddit Housing Filter
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Hide sublease and housing-related posts on r/UIUC
// @author       You
// @match        https://www.reddit.com/r/UIUC/*
// @match        https://old.reddit.com/r/UIUC/*
// @match        https://new.reddit.com/r/UIUC/*
// @match        https://sh.reddit.com/r/UIUC/*
// @grant        GM_getValue
// @grant        GM_setValue
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

    function createToggleUI() {
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

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'uiuc-housing-toggle';
        checkbox.checked = showHousing;
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

        checkbox.addEventListener('change', () => {
            showHousing = checkbox.checked;
            localStorage.setItem(STORAGE_KEY, showHousing);
            updateAllPosts();
            console.log('[UIUC Housing Filter] Show housing:', showHousing);
        });

        container.appendChild(checkbox);
        container.appendChild(label);
        document.body.appendChild(container);
    }

    // Create the toggle UI
    createToggleUI();

    // Initial processing
    processPosts();

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
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('[UIUC Housing Filter] Loaded and active, showHousing:', showHousing);
})();
