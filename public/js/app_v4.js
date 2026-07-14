const API_BASE = window.location.hostname.includes('pages.dev')
  ? 'https://ai-3tep.vercel.app'
  : '';

// Global Application State
let state = {
  prompts: [],
  categories: [],
  settings: {},
  activeCategory: 'all',
  activeSort: 'featured',
  searchQuery: ''
};
let profileActiveTab = 'created';
let generatedImageBase64 = null;
let isGenerating = false;

// Popular Keywords List
const POPULAR_KEYWORDS = [
  'Couple', 'Football', 'Cricket', 'Saree', 'Bride', 'Sunset', 'Anime', 
  'Car', 'Wedding', 'Nature', 'Portrait', 'Fantasy', 'Horror', 'Gym', 
  'Fashion', 'Food', 'Travel', 'Architecture'
];

// DOM Elements - Sidebar & Layout
const sidebarDrawer = document.getElementById('sidebar-drawer');
const drawerMask = document.getElementById('drawer-mask');
const btnHamburger = document.getElementById('btn-hamburger');
const searchInput = document.getElementById('search-input');
const siteDescription = document.getElementById('site-description');
const sidebarCategoriesContainer = document.getElementById('sidebar-categories-container');
const pillsFilterContainer = document.getElementById('pills-filter-container');
const promptsGrid = document.getElementById('prompts-grid');
const emptyState = document.getElementById('empty-state');
const footerText = document.getElementById('footer-text');

// Profile view DOM elements
const feedViewContainer = document.getElementById('feed-view-container');
const profileViewContainer = document.getElementById('profile-view-container');
const profilePromptsGrid = document.getElementById('profile-prompts-grid');
const profileEmptyState = document.getElementById('profile-empty-state');
const profileTabCreated = document.getElementById('profile-tab-created');
const profileTabLiked = document.getElementById('profile-tab-liked');
const pinterestProfileAvatar = document.querySelector('.pinterest-profile-avatar');

// AI Generator Studio DOM elements
const studioViewContainer = document.getElementById('studio-view-container');
const studioPrompt = document.getElementById('studio-prompt');
const studioModel = document.getElementById('studio-model');
const studioBtnGenerate = document.getElementById('studio-btn-generate');
const studioBtnRandom = document.getElementById('studio-btn-random');
const studioOutputBlock = document.getElementById('studio-output-block');
const studioLoadingState = document.getElementById('studio-loading-state');
const studioResultState = document.getElementById('studio-result-state');
const studioResultImg = document.getElementById('studio-result-img');
const studioBtnDownload = document.getElementById('studio-btn-download');
const studioBtnPublish = document.getElementById('studio-btn-publish');

// Floating Controls
const dockBtnHome = document.getElementById('dock-btn-home');
const dockBtnHistory = document.getElementById('dock-btn-history');
const dockBtnFavorites = document.getElementById('dock-btn-favorites');
const dockBtnAdd = document.getElementById('dock-btn-add');

// Navigation Sidebar items
const navHome = document.getElementById('nav-home');
const navHistory = document.getElementById('nav-history');

// Prompt Detail Modal Elements
const promptModal = document.getElementById('prompt-modal');
const modalClose = document.getElementById('modal-close');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalBadges = document.getElementById('modal-badges');
const modalPromptText = document.getElementById('modal-prompt-text');
const modalNegPromptText = document.getElementById('modal-neg-prompt-text');
const modalNegBlock = document.getElementById('modal-neg-block');
const btnCopyPrompt = document.getElementById('btn-copy-prompt');
const btnCopyNeg = document.getElementById('btn-copy-neg');
const valRatio = document.getElementById('val-ratio');
const valCfg = document.getElementById('val-cfg');
const valSteps = document.getElementById('val-steps');
const valSampler = document.getElementById('val-sampler');
const valSeed = document.getElementById('val-seed');
const modalCreatorAvatarImg = document.getElementById('modal-creator-avatar-img');
const modalProfileLinkBtn = document.getElementById('modal-profile-link-btn');
const modalProfileHandleText = document.getElementById('modal-profile-handle-text');
const modalBtnLike = document.getElementById('modal-btn-like');
const modalLikeCount = document.getElementById('modal-like-count');
const modalRelatedGrid = document.getElementById('modal-related-grid');

// Public Submission Modal Elements
const btnOpenSubmitModal = document.getElementById('btn-open-submit-modal');
const submitPromptModal = document.getElementById('submit-prompt-modal');
const btnCloseSubmitModal = document.getElementById('btn-close-submit-modal');
const btnCancelSubmit = document.getElementById('btn-cancel-submit');
const publicSubmitForm = document.getElementById('public-submit-form');
const submitFieldCategory = document.getElementById('submit-field-category');
const submitFieldImageFile = document.getElementById('submit-field-image-file');
const submitFieldImageUrl = document.getElementById('submit-field-image-url');
const submitImagePreview = document.getElementById('submit-image-preview');

// Sorting tabs
const sortingTabs = document.querySelectorAll('.sort-tab');

// Toast
const toast = document.getElementById('toast-notification');
const toastMsg = toast.querySelector('.toast-message');

// Promo Card Elements
const promoAnnouncementCard = document.getElementById('promo-announcement-card');
const btnClosePromo = document.getElementById('btn-close-promo');
const promoCardImage = document.getElementById('promo-card-image');
const promoCardTitle = document.getElementById('promo-card-title');
const promoCardText = document.getElementById('promo-card-text');
const btnPromoAction = document.getElementById('btn-promo-action');

// Debounce helper
function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

// Show Toast
function showToast(message, isSuccess = true) {
  toastMsg.textContent = message;
  const icon = toast.querySelector('.toast-icon');
  if (icon) {
    if (isSuccess) {
      icon.setAttribute('data-lucide', 'check');
      toast.style.borderLeftColor = 'var(--accent-color)';
    } else {
      icon.setAttribute('data-lucide', 'alert-circle');
      toast.style.borderLeftColor = '#f87171';
    }
  }
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
  lucide.createIcons();
}

// App Initialization
async function initApp() {
  try {
    const settingsRes = await fetch(`${API_BASE}/api/settings`);
    state.settings = await settingsRes.json();
    
    if (state.settings.siteTitle) {
      document.title = `${state.settings.siteTitle} — Curated AI Prompts Workspace`;
      const logoTitles = document.querySelectorAll('.sidebar-logo div');
      logoTitles.forEach(el => {
        el.innerHTML = `Prompt<span class="gallery-text">AI</span>`;
      });
    }
    if (state.settings.siteDescription && siteDescription) {
      siteDescription.textContent = state.settings.siteDescription;
    }
    if (state.settings.footerText && footerText) {
      footerText.textContent = state.settings.footerText;
    }

    // Populate promo card settings dynamically
    const promoVisible = state.settings.promoVisible !== undefined ? state.settings.promoVisible : true;
    if (promoVisible && promoAnnouncementCard) {
      if (state.settings.promoTitle) promoCardTitle.textContent = state.settings.promoTitle;
      if (state.settings.promoText) promoCardText.textContent = state.settings.promoText;
      if (state.settings.promoImageUrl) promoCardImage.src = state.settings.promoImageUrl;
      else promoCardImage.src = '/uploads/placeholder.png';
      
      if (state.settings.promoButtonText) btnPromoAction.textContent = state.settings.promoButtonText;
      
      btnPromoAction.onclick = () => {
        if (state.settings.promoButtonLink) {
          window.open(state.settings.promoButtonLink, '_blank');
        }
      };
      
      // Check if user dismissed it in this session
      if (sessionStorage.getItem('promo-dismissed') !== 'true') {
        promoAnnouncementCard.classList.remove('hidden');
      }
    } else if (promoAnnouncementCard) {
      promoAnnouncementCard.classList.add('hidden');
    }

    if (btnClosePromo && promoAnnouncementCard) {
      btnClosePromo.onclick = () => {
        promoAnnouncementCard.classList.add('hidden');
        sessionStorage.setItem('promo-dismissed', 'true');
      };
    }

    await fetchCategories();
    renderKeywordsUI();
    await fetchPrompts();
    
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Fetch Categories
async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE}/api/categories`);
    state.categories = await res.json();
    renderCategoriesUI();
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

// Render Categories in Top Pills + Left Sidebar
function renderCategoriesUI() {
  // 1. Sidebar nested list
  sidebarCategoriesContainer.innerHTML = '<button class="sidebar-nested-link active" data-category="all">All</button>';
  
  // 2. Top bar pills
  pillsFilterContainer.innerHTML = '<button class="pill-chip active" data-category="all">All</button>';
  
  // 3. Populate submit select
  submitFieldCategory.innerHTML = '';

  state.categories.forEach(cat => {
    // Sidebar items
    const sideLink = document.createElement('button');
    sideLink.className = 'sidebar-nested-link';
    sideLink.setAttribute('data-category', cat.id);
    sideLink.textContent = cat.name;
    sidebarCategoriesContainer.appendChild(sideLink);

    // Top pills
    const pill = document.createElement('button');
    pill.className = 'pill-chip';
    pill.textContent = cat.name;
    pill.setAttribute('data-category', cat.id);
    pillsFilterContainer.appendChild(pill);

    // Submit options
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    submitFieldCategory.appendChild(option);
  });

  // Bind clicks for Sidebar Category list
  const sideLinks = sidebarCategoriesContainer.querySelectorAll('.sidebar-nested-link');
  sideLinks.forEach(link => {
    link.addEventListener('click', () => {
      const catId = link.getAttribute('data-category');
      selectCategory(catId);
      closeMobileSidebar();
    });
  });

  // Bind clicks for Top Pills
  const pills = pillsFilterContainer.querySelectorAll('.pill-chip');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const catId = pill.getAttribute('data-category');
      selectCategory(catId);
    });
  });
}

// Render Popular Keywords UI
function renderKeywordsUI() {
  const container = document.getElementById('keywords-pills-container');
  if (!container) return;
  container.innerHTML = '';
  
  POPULAR_KEYWORDS.forEach(kw => {
    const pill = document.createElement('button');
    pill.className = 'keyword-chip';
    pill.textContent = kw;
    pill.addEventListener('click', () => {
      // Toggle search filter
      if (state.searchQuery.toLowerCase() === kw.toLowerCase()) {
        state.searchQuery = '';
        searchInput.value = '';
        pill.classList.remove('active');
      } else {
        state.searchQuery = kw;
        searchInput.value = kw;
        // Highlight active chip
        const chips = container.querySelectorAll('.keyword-chip');
        chips.forEach(c => c.classList.remove('active'));
        pill.classList.add('active');
      }
      fetchPrompts();
    });
    container.appendChild(pill);
  });
}

// Synchronize Category Selection on click
function selectCategory(catId) {
  // Switch to feed view container
  feedViewContainer.classList.remove('hidden');
  profileViewContainer.classList.add('hidden');
  if (studioViewContainer) studioViewContainer.classList.add('hidden');

  state.activeCategory = catId;
  state.searchQuery = '';
  if (searchInput) searchInput.value = '';
  
  // 1. Sync top pills
  const pills = pillsFilterContainer.querySelectorAll('.pill-chip');
  pills.forEach(p => {
    if (p.getAttribute('data-category') === catId) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  // 2. Sync sidebar links
  const sideLinks = sidebarCategoriesContainer.querySelectorAll('.sidebar-nested-link');
  sideLinks.forEach(link => {
    if (link.getAttribute('data-category') === catId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Reset Home active status if category chosen, or set active if 'all' chosen
  if (catId === 'all') {
    navHome.classList.add('active');
    dockBtnHome.classList.add('active');
    dockBtnHistory.classList.remove('active');
    dockBtnFavorites.classList.remove('active');
  } else {
    navHome.classList.remove('active');
    dockBtnHome.classList.remove('active');
  }

  fetchPrompts();
}

// Fetch Prompts (Public Approved listings)
async function fetchPrompts() {
  try {
    const params = new URLSearchParams();
    if (state.activeCategory !== 'all') params.append('category', state.activeCategory);
    if (state.searchQuery.trim() !== '') params.append('search', state.searchQuery);

    const res = await fetch(`${API_BASE}/api/prompts?${params.toString()}`);
    let promptsList = await res.json();

    // Sorting client-side based on tabs
    if (state.activeSort === 'newest') {
      promptsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (state.activeSort === 'popular') {
      // Mock popularity sorting using CFG scale + steps length
      promptsList.sort((a, b) => (parseFloat(b.cfgScale || 0) + parseInt(b.steps || 0)) - (parseFloat(a.cfgScale || 0) + parseInt(a.steps || 0)));
    } else {
      // Default featured: alphabetical by category, then newer
      promptsList.sort((a, b) => a.category.localeCompare(b.category) || new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Highlight correct keyword chip in the UI
    const chips = document.querySelectorAll('.keyword-chip');
    chips.forEach(c => {
      if (state.searchQuery && c.textContent.toLowerCase() === state.searchQuery.toLowerCase()) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });

    state.prompts = promptsList;
    renderPrompts();
  } catch (error) {
    console.error('Failed to fetch prompts:', error);
  }
}

// Render Prompts Grid
// Helper to get likes count deterministically on the client
function getLikesCount(promptId) {
  let hash = 0;
  for (let i = 0; i < promptId.length; i++) {
    hash = promptId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const baseLikes = Math.abs(hash % 180) + 15;
  const isLiked = localStorage.getItem('liked_' + promptId) === 'true';
  return isLiked ? baseLikes + 1 : baseLikes;
}

// Render Prompts Grid
function renderPrompts() {
  const cards = promptsGrid.querySelectorAll('.prompt-card');
  cards.forEach(c => c.remove());

  if (state.prompts.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';

  state.prompts.forEach(prompt => {
    const catObj = state.categories.find(c => c.id === prompt.category);
    const catName = catObj ? catObj.name : prompt.category;

    // Likes count and status
    const likesVal = getLikesCount(prompt.id);
    const isLiked = localStorage.getItem('liked_' + prompt.id) === 'true';
    const likedClass = isLiked ? 'liked' : '';

    // Creator details
    const creatorNameText = prompt.creatorName && prompt.creatorName.trim() !== '' ? prompt.creatorName : 'Anonymous';
    const creatorHandleText = prompt.creatorName && prompt.creatorName.trim() !== '' ? 
      (prompt.creatorName.startsWith('@') ? prompt.creatorName : '@' + prompt.creatorName.replace(/\s+/g, '').toLowerCase()) : 
      '@anonymous';
    const avatarUrl = prompt.creatorName && prompt.creatorName.trim() !== '' ? 
      `https://ui-avatars.com/api/?background=f1ebd9&color=111111&bold=true&name=${encodeURIComponent(prompt.creatorName)}` : 
      `https://ui-avatars.com/api/?background=e9e9e9&color=767676&bold=true&name=A`;

    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.innerHTML = `
      <div class="card-image-wrapper">
        <img src="${prompt.imageUrl}" alt="${prompt.title}" class="card-image" loading="lazy" onerror="this.src='/uploads/placeholder.png'">
        <div class="card-badges">
          <span class="badge badge-model">${prompt.model}</span>
          <span class="badge badge-category">${catName}</span>
        </div>
        <div class="card-hover-overlay">
          <div class="overlay-top-row">
            <button class="overlay-btn-copy btn-copy-card">Copy</button>
          </div>
          <div class="overlay-bottom-container">
            <div class="overlay-creator-row">
              <img src="${avatarUrl}" class="overlay-creator-avatar" alt="Avatar">
              <div class="overlay-creator-text">
                <span class="overlay-creator-name">${creatorNameText}</span>
                <span class="overlay-creator-handle">${creatorHandleText}</span>
              </div>
            </div>
            <div class="overlay-actions-row">
              <button class="overlay-btn-action btn-view-card">
                <i data-lucide="arrow-up-right" style="width: 14px; height: 14px;"></i> Use Idea
              </button>
              <div class="overlay-actions-right">
                <button class="overlay-btn-like btn-like-card ${likedClass}" data-id="${prompt.id}">
                  <i data-lucide="heart" style="width: 12px; height: 12px;"></i>
                  <span class="like-count-num">${likesVal}</span>
                </button>
                <button class="overlay-btn-share btn-share-card">
                  <i data-lucide="arrow-up-from-line" style="width: 12px; height: 12px;"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-content">
        <h3 class="card-title">${prompt.title}</h3>
        <p class="card-prompt-preview">${prompt.promptText}</p>
      </div>
    `;

    // Event bindings
    const btnCopy = card.querySelector('.btn-copy-card');
    const btnView = card.querySelector('.btn-view-card');
    const btnLike = card.querySelector('.btn-like-card');
    const btnShare = card.querySelector('.btn-share-card');

    btnCopy.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(prompt.promptText);
      showToast('Prompt copied to clipboard!');
    });

    btnView.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetailModal(prompt);
    });

    btnLike.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasLiked = localStorage.getItem('liked_' + prompt.id) === 'true';
      if (wasLiked) {
        localStorage.setItem('liked_' + prompt.id, 'false');
        btnLike.classList.remove('liked');
      } else {
        localStorage.setItem('liked_' + prompt.id, 'true');
        btnLike.classList.add('liked');
      }
      btnLike.querySelector('.like-count-num').textContent = getLikesCount(prompt.id);
    });

    btnShare.addEventListener('click', (e) => {
      e.stopPropagation();
      const shareUrl = `${window.location.origin}?id=${prompt.id}`;
      navigator.clipboard.writeText(shareUrl);
      showToast('Share link copied to clipboard!');
    });

    card.addEventListener('click', () => {
      openDetailModal(prompt);
    });

    promptsGrid.appendChild(card);
  });

  lucide.createIcons();
}

// Modal Detail View
function openDetailModal(prompt) {
  modalImg.src = prompt.imageUrl;
  modalImg.alt = prompt.title;
  modalTitle.textContent = prompt.title;
  
  const catObj = state.categories.find(c => c.id === prompt.category);
  const catName = catObj ? catObj.name : prompt.category;

  modalBadges.innerHTML = `
    <span class="badge badge-model">${prompt.model}</span>
    <span class="badge badge-category">${catName}</span>
  `;

  // Setup Creator Info in Detail Modal
  const creatorNameText = prompt.creatorName && prompt.creatorName.trim() !== '' ? prompt.creatorName : 'Anonymous';
  const creatorHandleText = prompt.creatorName && prompt.creatorName.trim() !== '' ? 
    (prompt.creatorName.startsWith('@') ? prompt.creatorName : '@' + prompt.creatorName.replace(/\s+/g, '').toLowerCase()) : 
    '@anonymous';
  const avatarUrl = prompt.creatorName && prompt.creatorName.trim() !== '' ? 
    `https://ui-avatars.com/api/?background=f1ebd9&color=111111&bold=true&name=${encodeURIComponent(prompt.creatorName)}` : 
    `https://ui-avatars.com/api/?background=e9e9e9&color=767676&bold=true&name=A`;

  modalCreatorAvatarImg.src = avatarUrl;
  modalProfileLinkBtn.textContent = creatorNameText;
  modalProfileHandleText.textContent = creatorHandleText;

  if (prompt.creatorLink && prompt.creatorLink.trim() !== '') {
    modalProfileLinkBtn.href = prompt.creatorLink;
    modalProfileLinkBtn.style.pointerEvents = 'auto';
    modalProfileLinkBtn.style.textDecoration = 'underline';
  } else {
    modalProfileLinkBtn.removeAttribute('href');
    modalProfileLinkBtn.style.pointerEvents = 'none';
    modalProfileLinkBtn.style.textDecoration = 'none';
  }

  // Setup Likes in Detail Modal
  modalLikeCount.textContent = getLikesCount(prompt.id);
  const isLiked = localStorage.getItem('liked_' + prompt.id) === 'true';
  if (isLiked) {
    modalBtnLike.classList.add('liked');
  } else {
    modalBtnLike.classList.remove('liked');
  }

  modalBtnLike.onclick = (e) => {
    e.stopPropagation();
    const wasLiked = localStorage.getItem('liked_' + prompt.id) === 'true';
    if (wasLiked) {
      localStorage.setItem('liked_' + prompt.id, 'false');
      modalBtnLike.classList.remove('liked');
    } else {
      localStorage.setItem('liked_' + prompt.id, 'true');
      modalBtnLike.classList.add('liked');
    }
    modalLikeCount.textContent = getLikesCount(prompt.id);
    // Refresh both feeds to synchronize counts
    renderPrompts();
    renderProfilePrompts();
  };

  modalPromptText.textContent = prompt.promptText;

  if (prompt.negativePrompt && prompt.negativePrompt.trim() !== '') {
    modalNegPromptText.textContent = prompt.negativePrompt;
    modalNegBlock.style.display = 'block';
  } else {
    modalNegBlock.style.display = 'none';
  }

  valRatio.textContent = prompt.aspectRatio || '-';
  valCfg.textContent = prompt.cfgScale || '-';
  valSteps.textContent = prompt.steps || '-';
  valSampler.textContent = prompt.sampler || '-';
  valSeed.textContent = prompt.seed || '-';

  btnCopyPrompt.onclick = () => {
    navigator.clipboard.writeText(prompt.promptText);
    showToast('Prompt copied!');
  };

  btnCopyNeg.onclick = () => {
    navigator.clipboard.writeText(prompt.negativePrompt);
    showToast('Negative prompt copied!');
  };

  // Render Related prompts "More like this"
  modalRelatedGrid.innerHTML = '';
  const relatedList = state.prompts.filter(p => p.category === prompt.category && p.id !== prompt.id).slice(0, 4);
  if (relatedList.length === 0) {
    modalRelatedGrid.innerHTML = '<div style="grid-column: span 2; text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 1rem 0;">No similar items found.</div>';
  } else {
    relatedList.forEach(rel => {
      const relCard = document.createElement('div');
      relCard.className = 'prompt-card';
      relCard.innerHTML = `
        <div class="card-image-wrapper">
          <img src="${rel.imageUrl}" alt="${rel.title}" class="card-image" onerror="this.src='/uploads/placeholder.png'">
        </div>
      `;
      relCard.addEventListener('click', () => {
        openDetailModal(rel);
      });
      modalRelatedGrid.appendChild(relCard);
    });
  }

  promptModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
}

// Render User Profile page feeds
function renderProfilePrompts() {
  profilePromptsGrid.innerHTML = '';
  
  let filtered = [];
  if (profileActiveTab === 'created') {
    let mySubmissions = [];
    try {
      mySubmissions = JSON.parse(localStorage.getItem('my_submissions') || '[]');
    } catch(e) {}
    filtered = state.prompts.filter(p => 
      mySubmissions.includes(p.id) || 
      (p.creatorName && p.creatorName.toLowerCase().includes('deep')) || 
      p.creatorName === 'hy shhk'
    );
  } else {
    filtered = state.prompts.filter(p => localStorage.getItem('liked_' + p.id) === 'true');
  }

  if (filtered.length === 0) {
    profileEmptyState.style.display = 'block';
    profilePromptsGrid.style.display = 'none';
  } else {
    profileEmptyState.style.display = 'none';
    profilePromptsGrid.style.display = 'block';
    
    filtered.forEach(prompt => {
      const catObj = state.categories.find(c => c.id === prompt.category);
      const catName = catObj ? catObj.name : prompt.category;
      
      const likesVal = getLikesCount(prompt.id);
      const isLiked = localStorage.getItem('liked_' + prompt.id) === 'true';
      const likedClass = isLiked ? 'liked' : '';
      
      const creatorNameText = prompt.creatorName && prompt.creatorName.trim() !== '' ? prompt.creatorName : 'Anonymous';
      const creatorHandleText = prompt.creatorName && prompt.creatorName.trim() !== '' ? 
        (prompt.creatorName.startsWith('@') ? prompt.creatorName : '@' + prompt.creatorName.replace(/\s+/g, '').toLowerCase()) : 
        '@anonymous';
      const avatarUrl = prompt.creatorName && prompt.creatorName.trim() !== '' ? 
        `https://ui-avatars.com/api/?background=f1ebd9&color=111111&bold=true&name=${encodeURIComponent(prompt.creatorName)}` : 
        `https://ui-avatars.com/api/?background=e9e9e9&color=767676&bold=true&name=A`;

      const card = document.createElement('div');
      card.className = 'prompt-card';
      card.innerHTML = `
        <div class="card-image-wrapper">
          <img src="${prompt.imageUrl}" alt="${prompt.title}" class="card-image" loading="lazy" onerror="this.src='/uploads/placeholder.png'">
          <div class="card-badges">
            <span class="badge badge-model">${prompt.model}</span>
            <span class="badge badge-category">${catName}</span>
          </div>
          <div class="card-hover-overlay">
            <div class="overlay-top-row">
              <button class="overlay-btn-copy btn-copy-card">Copy</button>
            </div>
            <div class="overlay-bottom-container">
              <div class="overlay-creator-row">
                <img src="${avatarUrl}" class="overlay-creator-avatar" alt="Avatar">
                <div class="overlay-creator-text">
                  <span class="overlay-creator-name">${creatorNameText}</span>
                  <span class="overlay-creator-handle">${creatorHandleText}</span>
                </div>
              </div>
              <div class="overlay-actions-row">
                <button class="overlay-btn-action btn-view-card">
                  <i data-lucide="arrow-up-right" style="width: 14px; height: 14px;"></i> Use Idea
                </button>
                <div class="overlay-actions-right">
                  <button class="overlay-btn-like btn-like-card ${likedClass}" data-id="${prompt.id}">
                    <i data-lucide="heart" style="width: 12px; height: 12px;"></i>
                    <span class="like-count-num">${likesVal}</span>
                  </button>
                  <button class="overlay-btn-share btn-share-card">
                    <i data-lucide="arrow-up-from-line" style="width: 12px; height: 12px;"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="card-content">
          <h3 class="card-title">${prompt.title}</h3>
          <p class="card-prompt-preview">${prompt.promptText}</p>
        </div>
      `;
      
      const btnCopy = card.querySelector('.btn-copy-card');
      const btnView = card.querySelector('.btn-view-card');
      const btnLike = card.querySelector('.btn-like-card');
      const btnShare = card.querySelector('.btn-share-card');

      btnCopy.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(prompt.promptText);
        showToast('Prompt copied to clipboard!');
      });

      btnView.addEventListener('click', (e) => {
        e.stopPropagation();
        openDetailModal(prompt);
      });

      btnLike.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasLiked = localStorage.getItem('liked_' + prompt.id) === 'true';
        if (wasLiked) {
          localStorage.setItem('liked_' + prompt.id, 'false');
          btnLike.classList.remove('liked');
        } else {
          localStorage.setItem('liked_' + prompt.id, 'true');
          btnLike.classList.add('liked');
        }
        btnLike.querySelector('.like-count-num').textContent = getLikesCount(prompt.id);
        renderPrompts();
      });

      btnShare.addEventListener('click', (e) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}?id=${prompt.id}`;
        navigator.clipboard.writeText(shareUrl);
        showToast('Share link copied to clipboard!');
      });

      card.addEventListener('click', () => {
        openDetailModal(prompt);
      });

      profilePromptsGrid.appendChild(card);
    });
  }
  lucide.createIcons();
}

function closeDetailModal() {
  promptModal.classList.remove('active');
  document.body.style.overflow = '';
}

// Submission modal triggers
function openSubmitModal() {
  publicSubmitForm.reset();
  submitImagePreview.innerHTML = '<span class="image-preview-placeholder">🖼️</span>';
  submitPromptModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSubmitModal() {
  submitPromptModal.classList.remove('active');
  document.body.style.overflow = '';
}

// Mobile sidebar controls
function openMobileSidebar() {
  sidebarDrawer.classList.add('active');
  drawerMask.classList.add('active');
}

function closeMobileSidebar() {
  sidebarDrawer.classList.remove('active');
  drawerMask.classList.remove('active');
}

// Submission image preview syncs
submitFieldImageFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      submitImagePreview.innerHTML = `<img src="${event.target.result}" alt="Submit Preview">`;
    };
    reader.readAsDataURL(file);
    submitFieldImageUrl.value = ''; // Reset text input
  }
});

submitFieldImageUrl.addEventListener('input', (e) => {
  const url = e.target.value.trim();
  if (url !== '') {
    submitImagePreview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.src='/uploads/placeholder.png'">`;
    submitFieldImageFile.value = ''; // Reset file input
  } else {
    submitImagePreview.innerHTML = '<span class="image-preview-placeholder">🖼️</span>';
  }
});

// Helper to convert base64 data URL to File object
function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
}

// Form Submission logic
publicSubmitForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append('title', document.getElementById('submit-field-title').value.trim());
  formData.append('category', submitFieldCategory.value);
  formData.append('model', document.getElementById('submit-field-model').value);
  formData.append('promptText', document.getElementById('submit-field-prompt-text').value.trim());
  formData.append('negativePrompt', document.getElementById('submit-field-neg-prompt').value.trim());
  formData.append('creatorName', document.getElementById('submit-field-creator-name').value.trim());
  formData.append('creatorLink', document.getElementById('submit-field-creator-link').value.trim());
  
  const file = submitFieldImageFile.files[0];
  if (file) {
    formData.append('image', file);
  } else if (generatedImageBase64) {
    // Append generated base64 image converted to file
    const generatedFile = dataURLtoFile(generatedImageBase64, 'generated-art.jpg');
    formData.append('image', generatedFile);
  } else {
    formData.append('imageUrl', submitFieldImageUrl.value.trim());
  }

  formData.append('aspectRatio', document.getElementById('submit-field-ratio').value);
  formData.append('cfgScale', document.getElementById('submit-field-cfg').value.trim());
  formData.append('steps', document.getElementById('submit-field-steps').value.trim());
  formData.append('sampler', document.getElementById('submit-field-sampler').value.trim());
  formData.append('seed', document.getElementById('submit-field-seed').value.trim());

  try {
    const res = await fetch(`${API_BASE}/api/prompts/submit`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Submitted successfully! Pending approval.');
      let mySubmissions = [];
      try {
        mySubmissions = JSON.parse(localStorage.getItem('my_submissions') || '[]');
      } catch(e) {}
      if (data && data.id) {
        mySubmissions.push(data.id);
        localStorage.setItem('my_submissions', JSON.stringify(mySubmissions));
      }
      closeSubmitModal();
      await fetchPrompts();
      if (!profileViewContainer.classList.contains('hidden')) {
        renderProfilePrompts();
      }
    } else {
      showToast(data.error || 'Failed to submit prompt', false);
    }
  } catch (err) {
    showToast('Failed to submit prompt', false);
  }
});

// Bind general clicks & keys
function setupEvents() {
  // Mobile drawer bindings
  btnHamburger.addEventListener('click', openMobileSidebar);
  drawerMask.addEventListener('click', closeMobileSidebar);

  // Detail Modal Close
  modalClose.addEventListener('click', closeDetailModal);
  promptModal.addEventListener('click', (e) => {
    if (e.target === promptModal) closeDetailModal();
  });

  // Submit Modal triggers
  btnOpenSubmitModal.addEventListener('click', () => {
    openSubmitModal();
    closeMobileSidebar();
  });
  btnCloseSubmitModal.addEventListener('click', closeSubmitModal);
  btnCancelSubmit.addEventListener('click', closeSubmitModal);
  submitPromptModal.addEventListener('click', (e) => {
    if (e.target === submitPromptModal) closeSubmitModal();
  });

  // Search input query with debounce
  searchInput.addEventListener('input', debounce((e) => {
    state.searchQuery = e.target.value;
    fetchPrompts();
  }, 250));

  // Search keyboard shortcut: focus on `/` press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetailModal();
      closeSubmitModal();
    }
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  // Sorting tabs bindings
  sortingTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      sortingTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeSort = tab.getAttribute('data-sort');
      fetchPrompts();
    });
  });

  // Floating dock actions
  dockBtnHome.addEventListener('click', () => {
    feedViewContainer.classList.remove('hidden');
    profileViewContainer.classList.add('hidden');
    if (studioViewContainer) studioViewContainer.classList.add('hidden');

    selectCategory('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    dockBtnHome.classList.add('active');
    dockBtnHistory.classList.remove('active');
    dockBtnFavorites.classList.remove('active');
  });

  dockBtnHistory.addEventListener('click', () => {
    feedViewContainer.classList.add('hidden');
    profileViewContainer.classList.remove('hidden');
    if (studioViewContainer) studioViewContainer.classList.add('hidden');

    // Show newest first
    state.activeSort = 'newest';
    sortingTabs.forEach(t => {
      if(t.getAttribute('data-sort') === 'newest') t.classList.add('active');
      else t.classList.remove('active');
    });
    renderProfilePrompts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    dockBtnHome.classList.remove('active');
    dockBtnHistory.classList.add('active');
    dockBtnFavorites.classList.remove('active');
  });

  dockBtnFavorites.addEventListener('click', () => {
    feedViewContainer.classList.add('hidden');
    profileViewContainer.classList.add('hidden');
    if (studioViewContainer) studioViewContainer.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    dockBtnHome.classList.remove('active');
    dockBtnHistory.classList.remove('active');
    dockBtnFavorites.classList.add('active');
  });

  dockBtnAdd.addEventListener('click', openSubmitModal);

  // AI Generator Studio Actions
  if (studioBtnRandom) {
    studioBtnRandom.addEventListener('click', () => {
      if (state.prompts.length > 0) {
        const randomPrompt = state.prompts[Math.floor(Math.random() * state.prompts.length)];
        studioPrompt.value = randomPrompt.promptText;
      } else {
        studioPrompt.value = "A realistic portrait of a beautiful Indian woman wearing a red traditional wedding saree, golden jewelry, soft focus background, highly detailed, 8k resolution";
      }
    });
  }

  if (studioBtnGenerate) {
    studioBtnGenerate.addEventListener('click', async () => {
      const promptVal = studioPrompt.value.trim();
      if (!promptVal) {
        alert("Please enter a prompt first!");
        return;
      }

      studioBtnGenerate.disabled = true;
      studioBtnGenerate.innerHTML = `<span class="spinner" style="width:16px; height:16px; border:2px solid #fff; border-top:2px solid transparent; border-radius:50%; animation:spin 1s linear infinite; display:inline-block; vertical-align:middle; margin-right:6px;"></span> Generating...`;
      
      studioOutputBlock.style.display = 'block';
      studioLoadingState.style.display = 'block';
      studioResultState.style.display = 'none';

      try {
        // 1. Check if Gemini API key is configured on Vercel backend
        let hasGeminiKey = false;
        try {
          const configRes = await fetch(`${API_BASE}/api/config/gemini`);
          if (configRes.ok) {
            const configData = await configRes.json();
            hasGeminiKey = configData.hasKey;
          }
        } catch (e) {
          console.warn("Failed to fetch config, defaulting to client-side:", e);
        }

        let imageData = null;

        if (hasGeminiKey) {
          // Option A: Call backend to generate via Google Gemini API
          const res = await fetch(`${API_BASE}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptVal })
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Failed to generate image via Gemini");
          }
          imageData = data.image;
        } else {
          // Option B: Call Pollinations AI directly from the browser (bypasses Vercel DNS/Timeout)
          const enhancedPrompt = promptVal + ", highly detailed, photorealistic, 8k resolution, cinematic lighting, masterpiece, award winning photography";
          const modelParam = studioModel.value === 'sdxl' ? 'turbo' : 'flux';
          const pollinationUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&model=${modelParam}&enhance=true&seed=${Math.floor(Math.random() * 1000000)}`;

          const pollRes = await fetch(pollinationUrl);
          if (!pollRes.ok) {
            throw new Error(`Fallback model returned status ${pollRes.status}`);
          }

          const blob = await pollRes.blob();
          
          imageData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Failed to parse generated image"));
            reader.readAsDataURL(blob);
          });
        }

        generatedImageBase64 = imageData;
        studioResultImg.src = imageData;
        
        studioLoadingState.style.display = 'none';
        studioResultState.style.display = 'block';
      } catch (err) {
        console.error("AI Generation error:", err);
        alert(`Generation failed: ${err.message || 'Please try again.'}`);
        studioOutputBlock.style.display = 'none';
      } finally {
        studioBtnGenerate.disabled = false;
        studioBtnGenerate.innerHTML = `<i data-lucide="sparkles" style="width: 16px; height: 16px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> Generate AI Image`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    });
  }

  if (studioBtnDownload) {
    studioBtnDownload.addEventListener('click', () => {
      if (!generatedImageBase64) return;
      const link = document.createElement('a');
      link.href = generatedImageBase64;
      link.download = 'generated-ai-art.jpg';
      link.click();
    });
  }

  if (studioBtnPublish) {
    studioBtnPublish.addEventListener('click', () => {
      if (!generatedImageBase64) return;
      openSubmitModal();
      // Pre-fill fields
      document.getElementById('submit-field-prompt-text').value = studioPrompt.value;
      submitImagePreview.innerHTML = `<img src="${generatedImageBase64}" alt="Submit Preview">`;
      // Clear file/url inputs so they don't override the generated image
      submitFieldImageFile.value = '';
      submitFieldImageUrl.value = '';
    });
  }

  // Floating Promo Card action bindings
  btnClosePromo.addEventListener('click', () => {
    promoAnnouncementCard.classList.add('hidden');
  });

  btnPromoAction.addEventListener('click', () => {
    // Open the detail modal for a featured prompt. We'll search for the portrait-11 (violet flowers) prompt
    const featuredPrompt = state.prompts.find(p => p.id === 'prompt-11');
    if (featuredPrompt) {
      openDetailModal(featuredPrompt);
    } else if (state.prompts.length > 0) {
      openDetailModal(state.prompts[0]);
    }
  });

  // Navigation menu clicks
  navHome.addEventListener('click', (e) => {
    e.preventDefault();
    profileViewContainer.classList.add('hidden');
    feedViewContainer.classList.remove('hidden');
    selectCategory('all');
  });

  const feedBtn = document.querySelector('.pinterest-feed-btn');
  if (feedBtn) {
    feedBtn.addEventListener('click', () => {
      profileViewContainer.classList.add('hidden');
      feedViewContainer.classList.remove('hidden');
      selectCategory('all');
    });
  }

  if (pinterestProfileAvatar) {
    pinterestProfileAvatar.addEventListener('click', () => {
      feedViewContainer.classList.add('hidden');
      profileViewContainer.classList.remove('hidden');
      document.querySelectorAll('.pill-chip').forEach(c => c.classList.remove('active'));
      renderProfilePrompts();
    });
  }

  if (profileTabCreated && profileTabLiked) {
    profileTabCreated.addEventListener('click', () => {
      profileActiveTab = 'created';
      profileTabCreated.classList.add('active');
      profileTabCreated.style.color = 'var(--text-primary)';
      profileTabCreated.style.borderBottomColor = '#111111';
      profileTabLiked.classList.remove('active');
      profileTabLiked.style.color = 'var(--text-secondary)';
      profileTabLiked.style.borderBottomColor = 'transparent';
      renderProfilePrompts();
    });

    profileTabLiked.addEventListener('click', () => {
      profileActiveTab = 'liked';
      profileTabLiked.classList.add('active');
      profileTabLiked.style.color = 'var(--text-primary)';
      profileTabLiked.style.borderBottomColor = '#111111';
      profileTabCreated.classList.remove('active');
      profileTabCreated.style.color = 'var(--text-secondary)';
      profileTabCreated.style.borderBottomColor = 'transparent';
      renderProfilePrompts();
    });
  }


  
  navHistory.addEventListener('click', () => {
    state.activeSort = 'newest';
    sortingTabs.forEach(t => {
      if(t.getAttribute('data-sort') === 'newest') t.classList.add('active');
      else t.classList.remove('active');
    });
    fetchPrompts();
    closeMobileSidebar();
  });

  // Toggle Tags Dropdown
  const btnToggleTags = document.getElementById('btn-toggle-tags');
  if (btnToggleTags) {
    btnToggleTags.addEventListener('click', () => {
      const isHidden = sidebarCategoriesContainer.style.display === 'none';
      sidebarCategoriesContainer.style.display = isHidden ? 'flex' : 'none';
      const chevron = btnToggleTags.querySelector('.lucide-chevron-down, [data-lucide="chevron-down"]');
      if (chevron) {
        chevron.style.transform = isHidden ? 'none' : 'rotate(-90deg)';
      }
    });
  }
}

// Bootstrap App
document.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  initApp();
  lucide.createIcons();
});
