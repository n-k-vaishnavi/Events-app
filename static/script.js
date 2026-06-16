// State Management
let allReleases = [];
let filterType = 'all';
let searchQuery = '';

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const retryBtn = document.getElementById('retry-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const clearSearchBtn = document.getElementById('clear-search-btn');
const searchInput = document.getElementById('search-input');
const filterPills = document.querySelectorAll('.filter-pill');

const skeletonLoader = document.getElementById('skeleton-loader');
const errorState = document.getElementById('error-state');
const emptyState = document.getElementById('empty-state');
const releasesTimeline = document.getElementById('releases-timeline');
const errorMessage = document.getElementById('error-message');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const charProgressBar = document.getElementById('char-progress-bar');
const charWarning = document.getElementById('char-warning');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const postTweetBtn = document.getElementById('post-tweet-btn');

// Stats Counters
const statTotalVal = document.querySelector('#stat-total .stat-value');
const statFeatureVal = document.querySelector('#stat-feature .stat-value');
const statChangeVal = document.querySelector('#stat-change .stat-value');
const statIssueVal = document.querySelector('#stat-issue .stat-value');
const statAnnouncementVal = document.querySelector('#stat-announcement .stat-value');
const statBreakingVal = document.querySelector('#stat-breaking .stat-value');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // Load initial feed
    fetchReleases();

    // Event Listeners
    refreshBtn.addEventListener('click', fetchReleases);
    retryBtn.addEventListener('click', fetchReleases);
    resetFiltersBtn.addEventListener('click', resetFiltersAndSearch);
    
    // Clear search listener
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        applyFiltersAndSearch();
    });

    // Search input typing listener (with debounce-like behavior)
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        if (searchQuery.length > 0) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
        applyFiltersAndSearch();
    });

    // Filter pills listeners
    filterPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            // Update active pill
            filterPills.forEach(p => {
                p.classList.remove('active');
                p.setAttribute('aria-checked', 'false');
            });
            e.target.classList.add('active');
            e.target.setAttribute('aria-checked', 'true');

            // Apply filter
            filterType = e.target.getAttribute('data-filter');
            applyFiltersAndSearch();
        });
    });

    // Modal listeners
    closeModalBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    tweetTextarea.addEventListener('input', updateTweetCharacterCounter);
    
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);
    postTweetBtn.addEventListener('click', openXIntent);
});

// Fetch Release Notes from API
async function fetchReleases() {
    // Show Loading Skeleton
    skeletonLoader.classList.remove('hidden');
    releasesTimeline.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    
    // Rotate CW Icon
    const spinIcon = refreshBtn.querySelector('.icon-spin-target');
    if (spinIcon) spinIcon.classList.add('spinning');
    refreshBtn.disabled = true;

    try {
        const response = await fetch('/api/releases');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            allReleases = data.releases;
            updateStatistics(allReleases);
            applyFiltersAndSearch();
        } else {
            throw new Error(data.message || 'Unknown server error while fetching releases.');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        errorMessage.textContent = error.message || 'Unable to load feed data from Google Cloud. Please try again later.';
        errorState.classList.remove('hidden');
        skeletonLoader.classList.add('hidden');
    } finally {
        if (spinIcon) spinIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

// Reset filters and text searches
function resetFiltersAndSearch() {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    
    filterPills.forEach(pill => {
        pill.classList.remove('active');
        pill.setAttribute('aria-checked', 'false');
        if (pill.getAttribute('data-filter') === 'all') {
            pill.classList.add('active');
            pill.setAttribute('aria-checked', 'true');
        }
    });
    filterType = 'all';
    
    applyFiltersAndSearch();
}

// Calculate Statistics of the Whole Dataset
function updateStatistics(releases) {
    let total = 0;
    let features = 0;
    let changes = 0;
    let issues = 0;
    let announcements = 0;
    let breaking = 0;

    releases.forEach(release => {
        release.items.forEach(item => {
            total++;
            const typeLower = item.type.toLowerCase();
            if (typeLower.includes('feature')) features++;
            else if (typeLower.includes('change')) changes++;
            else if (typeLower.includes('issue')) issues++;
            else if (typeLower.includes('announcement')) announcements++;
            else if (typeLower.includes('breaking')) breaking++;
        });
    });

    // Update UI numbers
    statTotalVal.textContent = total;
    statFeatureVal.textContent = features;
    statChangeVal.textContent = changes;
    statIssueVal.textContent = issues;
    statAnnouncementVal.textContent = announcements;
    statBreakingVal.textContent = breaking;
}

// Apply Filters and Searches on Frontend
function applyFiltersAndSearch() {
    const filteredReleases = [];

    allReleases.forEach(release => {
        const filteredItems = release.items.filter(item => {
            // Check Type Filter
            let matchesType = false;
            if (filterType === 'all') {
                matchesType = true;
            } else {
                matchesType = item.type.toLowerCase() === filterType.toLowerCase();
            }

            // Check Text Search Query
            let matchesSearch = false;
            if (!searchQuery) {
                matchesSearch = true;
            } else {
                const textLower = item.text.toLowerCase();
                const typeLower = item.type.toLowerCase();
                matchesSearch = textLower.includes(searchQuery) || typeLower.includes(searchQuery);
            }

            return matchesType && matchesSearch;
        });

        // Only append date group if it has matching entries
        if (filteredItems.length > 0) {
            filteredReleases.push({
                ...release,
                items: filteredItems
            });
        }
    });

    renderTimeline(filteredReleases);
}

// Render HTML timeline
function renderTimeline(releases) {
    skeletonLoader.classList.add('hidden');
    
    if (releases.length === 0) {
        releasesTimeline.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    releasesTimeline.innerHTML = '';
    
    releases.forEach(release => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        
        // Sidebar element
        const dateSidebar = document.createElement('div');
        dateSidebar.className = 'date-sidebar';
        
        const dateBadge = document.createElement('h2');
        dateBadge.className = 'date-badge';
        dateBadge.textContent = release.date;
        
        const dateMeta = document.createElement('span');
        dateMeta.className = 'date-meta';
        dateMeta.textContent = `${release.items.length} ${release.items.length === 1 ? 'update' : 'updates'}`;
        
        dateSidebar.appendChild(dateBadge);
        dateSidebar.appendChild(dateMeta);
        
        // Cards wrapper
        const cardsWrapper = document.createElement('div');
        cardsWrapper.className = 'date-cards-wrapper';
        
        release.items.forEach(item => {
            const card = document.createElement('article');
            card.className = 'release-card';
            
            // Format category class name
            const typeClass = item.type.toLowerCase().replace(/\s+/g, '-');
            
            card.innerHTML = `
                <div class="card-header">
                    <span class="type-tag ${typeClass}">${item.type}</span>
                    <div class="card-actions-top">
                        <a href="${release.link}" target="_blank" rel="noopener" class="card-anchor-link" title="Open official release notes page">
                            <i data-lucide="external-link"></i>
                        </a>
                    </div>
                </div>
                <div class="card-body">
                    ${item.html}
                </div>
                <div class="card-footer">
                    <button class="card-tweet-btn" aria-label="Tweet this update">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet Update</span>
                    </button>
                </div>
            `;
            
            // Add event listener to Tweet button
            const tweetBtn = card.querySelector('.card-tweet-btn');
            tweetBtn.addEventListener('click', () => openTweetModal(item, release));
            
            cardsWrapper.appendChild(card);
        });
        
        dateGroup.appendChild(dateSidebar);
        dateGroup.appendChild(cardsWrapper);
        releasesTimeline.appendChild(dateGroup);
    });
    
    releasesTimeline.classList.remove('hidden');
    
    // Refresh Icons inside dynamic content
    lucide.createIcons();
}

// Open Tweet Modal with smart truncated pre-fill text
function openTweetModal(item, release) {
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    
    // Build pre-filled tweet content with X limits in mind
    // Max characters = 280
    // Formatting: 📢 BigQuery [Type] ([Date]):\n\n[Content]\n\n[Link]\n#BigQuery #GCP
    const prefix = `📢 BigQuery ${item.type} (${release.date}):\n\n`;
    const hashtag = `\n\n#BigQuery #GCP`;
    const detailsLink = release.link ? `\nDetails: ${release.link}` : '';
    
    const fixedLength = prefix.length + detailsLink.length + hashtag.length;
    const maxContentLength = 280 - fixedLength - 3; // Subtracting 3 for '...'
    
    let contentSnippet = item.text;
    if (contentSnippet.length > maxContentLength) {
        contentSnippet = contentSnippet.substring(0, maxContentLength - 1).trim() + '...';
    }
    
    const prefillText = `${prefix}${contentSnippet}${detailsLink}${hashtag}`;
    
    tweetTextarea.value = prefillText;
    updateTweetCharacterCounter();
    
    // Show Modal
    tweetModal.classList.remove('hidden');
    tweetModal.setAttribute('aria-hidden', 'false');
    tweetTextarea.focus();
}

// Close Tweet Modal
function closeTweetModal() {
    document.body.style.overflow = '';
    tweetModal.classList.add('hidden');
    tweetModal.setAttribute('aria-hidden', 'true');
}

// Update character counter and warnings in Modal
function updateTweetCharacterCounter() {
    const text = tweetTextarea.value;
    const len = text.length;
    charCount.textContent = len;
    
    // Progress bar width
    const percentage = Math.min((len / 280) * 100, 100);
    charProgressBar.style.width = `${percentage}%`;
    
    // Apply styling alerts based on limits
    charProgressBar.className = 'char-progress-fill';
    charCount.parentElement.className = 'character-count-wrapper';
    
    if (len > 280) {
        charProgressBar.classList.add('danger');
        charCount.parentElement.classList.add('danger');
        charWarning.classList.remove('hidden');
    } else if (len > 240) {
        charProgressBar.classList.add('warning');
        charCount.parentElement.classList.add('warning');
        charWarning.classList.add('hidden');
    } else {
        charWarning.classList.add('hidden');
    }
}

// Copy Tweet Content to Clipboard
async function copyTweetToClipboard() {
    const tweetText = tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(tweetText);
        
        // Show success visual state in button
        const originalContent = copyTweetBtn.innerHTML;
        copyTweetBtn.innerHTML = `
            <i data-lucide="check" class="btn-icon"></i>
            <span>Copied!</span>
        `;
        copyTweetBtn.classList.remove('btn-outline');
        copyTweetBtn.classList.add('btn-primary');
        lucide.createIcons();
        
        setTimeout(() => {
            copyTweetBtn.innerHTML = originalContent;
            copyTweetBtn.classList.add('btn-outline');
            copyTweetBtn.classList.remove('btn-primary');
            lucide.createIcons();
        }, 2000);
        
    } catch (err) {
        console.error('Clipboard copy failed:', err);
        alert('Could not copy automatically. Please select text and copy manually.');
    }
}

// Open X (Twitter) Tweet Intent in New Tab
function openXIntent() {
    const tweetText = tweetTextarea.value;
    const encodedText = encodeURIComponent(tweetText);
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
}
