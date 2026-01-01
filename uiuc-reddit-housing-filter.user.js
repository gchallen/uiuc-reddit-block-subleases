// ==UserScript==
// @name         UIUC Reddit Housing Filter
// @namespace    http://tampermonkey.net/
// @version      1.0
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

    function shouldHidePost(title) {
        if (!title) return false;
        return HOUSING_PATTERNS.some(pattern => pattern.test(title));
    }

    function hidePost(element) {
        element.style.display = 'none';
    }

    function processNewReddit() {
        // New Reddit (www.reddit.com with new design)
        const posts = document.querySelectorAll('shreddit-post, [data-testid="post-container"], article');
        posts.forEach(post => {
            if (post.dataset.housingFiltered) return;
            post.dataset.housingFiltered = 'true';

            // Try multiple selectors for title
            const titleElement = post.querySelector('a[slot="title"], [data-testid="post-title"], h3, [slot="title"]');
            const title = titleElement?.textContent || post.getAttribute('post-title') || '';

            if (shouldHidePost(title)) {
                hidePost(post);
                console.log('[UIUC Housing Filter] Hidden:', title);
            }
        });
    }

    function processOldReddit() {
        // Old Reddit (old.reddit.com)
        const posts = document.querySelectorAll('.thing.link');
        posts.forEach(post => {
            if (post.dataset.housingFiltered) return;
            post.dataset.housingFiltered = 'true';

            const titleElement = post.querySelector('a.title');
            const title = titleElement?.textContent || '';

            if (shouldHidePost(title)) {
                hidePost(post);
                console.log('[UIUC Housing Filter] Hidden:', title);
            }
        });
    }

    function processPosts() {
        processNewReddit();
        processOldReddit();
    }

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

    console.log('[UIUC Housing Filter] Loaded and active');
})();
