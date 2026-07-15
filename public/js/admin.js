// Admin Dashboard State
let state = {
  token: localStorage.getItem('banana_admin_token') || '',
  prompts: [],
  pendingPrompts: [],
  categories: [],
  settings: {},
  activeTab: 'dashboard'
};

// DOM Elements - Login
const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form');
const adminPasswordInput = document.getElementById('admin-password');

// DOM Elements - General Layout
const adminWelcome = document.getElementById('admin-welcome');
const btnLogoutHeader = document.getElementById('btn-logout-header');
const btnLogoutSidebar = document.getElementById('btn-logout-sidebar');

// Sidebar Tabs
const sidebarTabs = document.querySelectorAll('.sidebar-tab[data-tab]');
const panelSections = document.querySelectorAll('.admin-panel-section');
const badgePendingCount = document.getElementById('badge-pending-count');

// Stats DOM
const statTotalPrompts = document.getElementById('stat-total-prompts');
const statPendingPrompts = document.getElementById('stat-pending-prompts');
const statTotalCategories = document.getElementById('stat-total-categories');

// Dashboard Quick Actions
const dashActionAddPrompt = document.getElementById('dash-action-add-prompt');
const dashActionViewPending = document.getElementById('dash-action-view-pending');
const dashActionAddCat = document.getElementById('dash-action-add-cat');

// Prompts Manager DOM
const btnOpenAddPromptModal = document.getElementById('btn-open-add-prompt-modal');
const promptsTableBody = document.getElementById('admin-prompts-table-body');
const pendingTableBody = document.getElementById('admin-pending-table-body');

// Prompts Form Modal DOM
const promptFormModal = document.getElementById('prompt-form-modal');
const promptFormClose = document.getElementById('prompt-form-close');
const promptEditorForm = document.getElementById('prompt-editor-form');
const promptFormModalTitle = document.getElementById('prompt-form-modal-title');
const editPromptIdField = document.getElementById('edit-prompt-id');
const btnCancelPrompt = document.getElementById('btn-cancel-prompt');

// Form Input Fields
const fieldTitle = document.getElementById('field-title');
const fieldCategory = document.getElementById('field-category');
const fieldModel = document.getElementById('field-model');
const fieldPromptText = document.getElementById('field-prompt-text');
const fieldNegPrompt = document.getElementById('field-neg-prompt');
const fieldImageFile = document.getElementById('field-image-file');
const fieldImageUrl = document.getElementById('field-image-url');
const editorImagePreview = document.getElementById('editor-image-preview');
const fieldRatio = document.getElementById('field-ratio');
const fieldCfg = document.getElementById('field-cfg');
const fieldSteps = document.getElementById('field-steps');
const fieldSampler = document.getElementById('field-sampler');
const fieldSeed = document.getElementById('field-seed');
const fieldCreatorName = document.getElementById('field-creator-name');
const fieldCreatorLink = document.getElementById('field-creator-link');

// Categories Manager DOM
const addCategoryForm = document.getElementById('add-category-form');
const newCategoryName = document.getElementById('new-category-name');
const adminCategoryList = document.getElementById('admin-category-list');

// Settings DOM
const generalSettingsForm = document.getElementById('general-settings-form');
const setSiteTitle = document.getElementById('set-site-title');
const setSiteDesc = document.getElementById('set-site-desc');
const setFooterText = document.getElementById('set-footer-text');
const setPromoVisible = document.getElementById('set-promo-visible');
const setPromoTitle = document.getElementById('set-promo-title');
const setPromoImageUrl = document.getElementById('set-promo-image-url');
const setPromoText = document.getElementById('set-promo-text');
const setPromoBtnText = document.getElementById('set-promo-btn-text');
const setPromoBtnLink = document.getElementById('set-promo-btn-link');

const passwordSettingsForm = document.getElementById('password-settings-form');
const setNewPassword = document.getElementById('set-new-password');
const setConfirmPassword = document.getElementById('set-confirm-password');

// Toast Notification
const toast = document.getElementById('toast-notification');
const toastMsg = toast.querySelector('.toast-message');

// Fetch Helpers
async function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  
  const res = await fetch(url, { ...options, headers });
  
  if (res.status === 401 || res.status === 403) {
    handleLogout();
    throw new Error('Authentication session expired');
  }
  
  return res;
}

// Show Toast
function showToast(message, isError = false) {
  toastMsg.textContent = message;
  const icon = toast.querySelector('.toast-icon');
  if (isError) {
    toast.style.borderLeftColor = '#f87171';
    if (icon) icon.setAttribute('data-lucide', 'alert-circle');
  } else {
    toast.style.borderLeftColor = 'var(--accent-color)';
    if (icon) icon.setAttribute('data-lucide', 'check');
  }
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Session Validation
async function verifySession() {
  if (!state.token) {
    showLogin();
    return;
  }
  
  try {
    const res = await apiFetch('/api/auth/verify');
    if (res.ok) {
      hideLogin();
      loadDashboardData();
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
}

function showLogin() {
  loginOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function hideLogin() {
  loginOverlay.classList.add('hidden');
  document.body.style.overflow = '';
  // Load site title
  apiFetch('/api/settings')
    .then(res => res.json())
    .then(data => {
      adminWelcome.textContent = `${data.siteTitle || 'Prompt AI'} Console`;
      setSiteTitle.value = data.siteTitle || '';
      setSiteDesc.value = data.siteDescription || '';
      setFooterText.value = data.footerText || '';
      
      // Populate promo card configuration
      setPromoVisible.checked = data.promoVisible !== undefined ? data.promoVisible : true;
      setPromoTitle.value = data.promoTitle || '';
      setPromoImageUrl.value = data.promoImageUrl || '';
      setPromoText.value = data.promoText || '';
      setPromoBtnText.value = data.promoButtonText || '';
      setPromoBtnLink.value = data.promoButtonLink || '';
    });
}

function handleLogout() {
  localStorage.removeItem('banana_admin_token');
  state.token = '';
  showLogin();
  showToast('Logged out successfully');
}

// Login Submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = adminPasswordInput.value;
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    
    const data = await res.json();
    if (res.ok) {
      state.token = data.token;
      localStorage.setItem('banana_admin_token', data.token);
      adminPasswordInput.value = '';
      hideLogin();
      loadDashboardData();
      showToast('Dashboard unlocked!');
    } else {
      showToast(data.error || 'Login failed', true);
    }
  } catch (err) {
    showToast('Failed to connect to authentication server', true);
  }
});

// Load Dashboard Components
async function loadDashboardData() {
  await fetchCategories();
  await fetchPrompts();
  await fetchPendingPrompts();
  updateStats();
}

// Fetch Categories
async function fetchCategories() {
  try {
    const res = await apiFetch('/api/categories');
    state.categories = await res.json();
    renderCategories();
    populateCategoryDropdown();
  } catch (err) {
    console.error(err);
  }
}

// Fetch Active Prompts (for admin dashboard table)
async function fetchPrompts() {
  try {
    const res = await apiFetch('/api/admin/prompts');
    const allPrompts = await res.json();
    
    // Admin list shows only approved ones in active tab, pending ones in pending tab
    state.prompts = allPrompts.filter(p => p.status === 'approved');
    renderPromptsTable();
  } catch (err) {
    console.error(err);
  }
}

// Fetch Pending Submissions
async function fetchPendingPrompts() {
  try {
    const res = await apiFetch('/api/admin/pending');
    state.pendingPrompts = await res.json();
    renderPendingTable();
  } catch (err) {
    console.error(err);
  }
}

// Update Stats UI
function updateStats() {
  statTotalPrompts.textContent = state.prompts.length;
  statPendingPrompts.textContent = state.pendingPrompts.length;
  statTotalCategories.textContent = state.categories.length;

  // Sidebar Badge
  if (state.pendingPrompts.length > 0) {
    badgePendingCount.textContent = state.pendingPrompts.length;
    badgePendingCount.style.display = 'inline-block';
  } else {
    badgePendingCount.style.display = 'none';
  }
}

// Tab Switching Navigation
sidebarTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.getAttribute('data-tab');
    switchTab(targetTab);
  });
});

function switchTab(tabName) {
  state.activeTab = tabName;
  
  sidebarTabs.forEach(t => {
    if (t.getAttribute('data-tab') === tabName) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  panelSections.forEach(panel => {
    if (panel.id === `panel-${tabName}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
}

// Populate Category dropdown inside Modal
function populateCategoryDropdown() {
  fieldCategory.innerHTML = '';
  state.categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    fieldCategory.appendChild(option);
  });
}

// Render Categories List
function renderCategories() {
  adminCategoryList.innerHTML = '';
  
  if (state.categories.length === 0) {
    adminCategoryList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 1.5rem;">No categories defined. Create one.</div>';
    return;
  }

  state.categories.forEach(cat => {
    const item = document.createElement('div');
    item.className = 'category-item';
    item.innerHTML = `
      <span>${cat.name} <code style="font-size: 0.75rem; color: var(--text-muted); margin-left: 5px;">(${cat.id})</code></span>
      <button class="table-btn table-btn-danger btn-delete-cat" data-id="${cat.id}">
        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
      </button>
    `;
    
    item.querySelector('.btn-delete-cat').onclick = () => deleteCategory(cat.id, cat.name);
    adminCategoryList.appendChild(item);
  });
  
  lucide.createIcons();
}

// Create Category API
addCategoryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = newCategoryName.value.trim();
  
  try {
    const res = await apiFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    
    const data = await res.json();
    if (res.ok) {
      newCategoryName.value = '';
      showToast('Category created successfully');
      await loadDashboardData();
    } else {
      showToast(data.error || 'Failed to create category', true);
    }
  } catch (err) {
    showToast('Failed to add category', true);
  }
});

// Delete Category
async function deleteCategory(id, name) {
  if (!confirm(`Are you sure you want to delete the category "${name}"?`)) {
    return;
  }
  
  try {
    const res = await apiFetch(`/api/categories/${id}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      showToast('Category deleted successfully');
      await loadDashboardData();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to delete category', true);
    }
  } catch (err) {
    showToast('Failed to delete category', true);
  }
}

// Render Active Prompts table
function renderPromptsTable() {
  promptsTableBody.innerHTML = '';
  
  if (state.prompts.length === 0) {
    promptsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No active prompts in library.</td></tr>';
    return;
  }

  state.prompts.forEach(p => {
    const catObj = state.categories.find(c => c.id === p.category);
    const catName = catObj ? catObj.name : p.category;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${p.imageUrl}" alt="${p.title}" class="table-img" onerror="this.src='/uploads/placeholder.png'"></td>
      <td style="font-weight: 600;">${p.title}</td>
      <td><span class="badge badge-model">${p.model}</span></td>
      <td><span class="badge badge-category">${catName}</span></td>
      <td style="color: var(--text-secondary);">${new Date(p.createdAt).toLocaleDateString()}</td>
      <td>
        <div class="action-cell">
          <button class="table-btn btn-edit-prompt" title="Edit">
            <i data-lucide="edit-3" style="width: 15px; height: 15px;"></i>
          </button>
          <button class="table-btn table-btn-danger btn-delete-prompt" title="Delete">
            <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
          </button>
        </div>
      </td>
    `;

    row.querySelector('.btn-edit-prompt').onclick = () => openEditPromptModal(p);
    row.querySelector('.btn-delete-prompt').onclick = () => deletePrompt(p.id, p.title);

    promptsTableBody.appendChild(row);
  });

  lucide.createIcons();
}

// Render Pending Queue table
function renderPendingTable() {
  pendingTableBody.innerHTML = '';
  
  if (state.pendingPrompts.length === 0) {
    pendingTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">No pending user submissions at the moment.</td></tr>';
    return;
  }

  state.pendingPrompts.forEach(p => {
    const catObj = state.categories.find(c => c.id === p.category);
    const catName = catObj ? catObj.name : p.category;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${p.imageUrl}" alt="${p.title}" class="table-img" onerror="this.src='/uploads/placeholder.png'"></td>
      <td>
        <div style="font-weight: 600;">${p.title}</div>
        <div style="font-size: 0.75rem; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.promptText}</div>
      </td>
      <td><span class="badge badge-model">${p.model}</span></td>
      <td><span class="badge badge-category">${catName}</span></td>
      <td style="color: var(--text-secondary);">${new Date(p.createdAt).toLocaleDateString()}</td>
      <td>
        <div class="action-cell">
          <button class="btn btn-primary btn-approve-submission" style="font-size: 0.75rem; padding: 0.35rem 0.65rem; background: #111111; color: white;">
            <i data-lucide="check" style="width: 14px; height: 14px;"></i> Approve
          </button>
          <button class="btn btn-danger btn-reject-submission" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">
            <i data-lucide="x" style="width: 14px; height: 14px;"></i> Reject
          </button>
        </div>
      </td>
    `;

    row.querySelector('.btn-approve-submission').onclick = () => approveSubmission(p.id, p.title);
    row.querySelector('.btn-reject-submission').onclick = () => rejectSubmission(p.id, p.title);

    pendingTableBody.appendChild(row);
  });

  lucide.createIcons();
}

// Approve User Submission Call
async function approveSubmission(id, title) {
  try {
    const res = await apiFetch(`/api/admin/pending/${id}/approve`, {
      method: 'POST'
    });
    
    if (res.ok) {
      showToast(`Approved "${title}"! It is now live.`);
      await loadDashboardData();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to approve submission', true);
    }
  } catch (err) {
    showToast('Failed to approve submission', true);
  }
}

// Reject/Delete User Submission Call
async function rejectSubmission(id, title) {
  if (!confirm(`Are you sure you want to reject and delete the submission "${title}"?`)) {
    return;
  }
  
  try {
    const res = await apiFetch(`/api/admin/pending/${id}/reject`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      showToast(`Rejected and deleted submission: "${title}"`);
      await loadDashboardData();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to reject submission', true);
    }
  } catch (err) {
    showToast('Failed to reject submission', true);
  }
}

// Open Form to Add Prompt
function openAddPromptModal() {
  editPromptIdField.value = '';
  promptEditorForm.reset();
  editorImagePreview.innerHTML = '<span class="image-preview-placeholder">🖼️</span>';
  promptFormModalTitle.textContent = 'Add New Prompt';
  
  fieldRatio.value = '1:1';
  fieldCfg.value = '7.0';
  fieldSteps.value = '30';
  fieldSampler.value = 'Euler a';
  fieldSeed.value = 'Random';

  promptFormModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Open Form to Edit Prompt
function openEditPromptModal(prompt) {
  editPromptIdField.value = prompt.id;
  promptFormModalTitle.textContent = 'Edit Prompt Details';
  
  fieldTitle.value = prompt.title;
  fieldCategory.value = prompt.category;
  fieldModel.value = prompt.model;
  fieldPromptText.value = prompt.promptText;
  fieldNegPrompt.value = prompt.negativePrompt || '';
  fieldImageUrl.value = prompt.imageUrl;
  
  editorImagePreview.innerHTML = `<img src="${prompt.imageUrl}" alt="Preview" onerror="this.src='/uploads/placeholder.png'">`;
  
  fieldCreatorName.value = prompt.creatorName || '';
  fieldCreatorLink.value = prompt.creatorLink || '';
  
  fieldRatio.value = prompt.aspectRatio || '1:1';
  fieldCfg.value = prompt.cfgScale || '7.0';
  fieldSteps.value = prompt.steps || '30';
  fieldSampler.value = prompt.sampler || 'Euler a';
  fieldSeed.value = prompt.seed || 'Random';

  promptFormModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePromptFormModal() {
  promptFormModal.classList.remove('active');
  document.body.style.overflow = '';
}

// Upload file handler
fieldImageFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    editorImagePreview.innerHTML = '<div style="font-size:0.75rem; color:var(--text-secondary);">Uploading...</div>';
    
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`
      },
      body: formData
    });
    
    const data = await res.json();
    if (res.ok) {
      fieldImageUrl.value = data.imageUrl;
      editorImagePreview.innerHTML = `<img src="${data.imageUrl}" alt="Upload Preview">`;
      showToast('Image uploaded successfully');
    } else {
      editorImagePreview.innerHTML = '<span class="image-preview-placeholder">❌</span>';
      showToast(data.error || 'Upload failed', true);
    }
  } catch (err) {
    editorImagePreview.innerHTML = '<span class="image-preview-placeholder">❌</span>';
    showToast('Failed to upload image', true);
  }
});

// Promotion Image Upload Handler
const btnUploadPromo = document.getElementById('btn-upload-promo');
const uploadPromoFile = document.getElementById('upload-promo-file');

if (btnUploadPromo && uploadPromoFile) {
  btnUploadPromo.addEventListener('click', () => {
    uploadPromoFile.click();
  });

  uploadPromoFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    const originalText = btnUploadPromo.innerHTML;
    try {
      btnUploadPromo.disabled = true;
      btnUploadPromo.innerHTML = 'Uploading...';
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`
        },
        body: formData
      });
      
      const data = await res.json();
      btnUploadPromo.disabled = false;
      btnUploadPromo.innerHTML = originalText;

      if (res.ok) {
        setPromoImageUrl.value = data.imageUrl;
        showToast('Promotion image uploaded successfully');
      } else {
        showToast(data.error || 'Upload failed', true);
      }
    } catch (err) {
      btnUploadPromo.disabled = false;
      btnUploadPromo.innerHTML = originalText;
      showToast('Failed to upload promotion image', true);
    }
  });
}

// Image preview handler
fieldImageUrl.addEventListener('input', (e) => {
  const url = e.target.value.trim();
  if (url !== '') {
    editorImagePreview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.src='/uploads/placeholder.png'">`;
  } else {
    editorImagePreview.innerHTML = '<span class="image-preview-placeholder">🖼️</span>';
  }
});

// Save Prompt
promptEditorForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const promptId = editPromptIdField.value;
  const promptData = {
    title: fieldTitle.value.trim(),
    category: fieldCategory.value,
    model: fieldModel.value,
    promptText: fieldPromptText.value.trim(),
    negativePrompt: fieldNegPrompt.value.trim(),
    imageUrl: fieldImageUrl.value.trim() || '/uploads/placeholder.png',
    aspectRatio: fieldRatio.value,
    cfgScale: fieldCfg.value.trim() || '7.0',
    steps: fieldSteps.value.trim() || '30',
    sampler: fieldSampler.value.trim() || 'Euler a',
    seed: fieldSeed.value.trim() || 'Random',
    creatorName: fieldCreatorName.value.trim(),
    creatorLink: fieldCreatorLink.value.trim()
  };

  const isEdit = promptId !== '';
  const url = isEdit ? `/api/prompts/${promptId}` : '/api/prompts';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(promptData)
    });
    
    const data = await res.json();
    if (res.ok) {
      showToast(isEdit ? 'Prompt updated successfully' : 'New prompt created successfully');
      closePromptFormModal();
      await loadDashboardData();
    } else {
      showToast(data.error || 'Failed to save prompt', true);
    }
  } catch (err) {
    showToast('Failed to save prompt details', true);
  }
});

// Delete Prompt
async function deletePrompt(id, title) {
  if (!confirm(`Are you sure you want to delete the prompt "${title}"?`)) {
    return;
  }
  
  try {
    const res = await apiFetch(`/api/prompts/${id}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      showToast('Prompt deleted successfully');
      await loadDashboardData();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to delete prompt', true);
    }
  } catch (err) {
    showToast('Failed to delete prompt', true);
  }
}

generalSettingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const siteTitle = setSiteTitle.value.trim();
  const siteDescription = setSiteDesc.value.trim();
  const footerText = setFooterText.value.trim();
  const promoVisible = setPromoVisible.checked;
  const promoTitle = setPromoTitle.value.trim();
  const promoImageUrl = setPromoImageUrl.value.trim();
  const promoText = setPromoText.value.trim();
  const promoButtonText = setPromoBtnText.value.trim();
  const promoButtonLink = setPromoBtnLink.value.trim();

  try {
    const res = await apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ 
        siteTitle, 
        siteDescription, 
        footerText,
        promoVisible,
        promoTitle,
        promoImageUrl,
        promoText,
        promoButtonText,
        promoButtonLink
      })
    });
    
    if (res.ok) {
      showToast('Configurations updated');
      adminWelcome.textContent = `${siteTitle} Console`;
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to save configurations', true);
    }
  } catch (err) {
    showToast('Failed to update configurations', true);
  }
});

// Password Update
passwordSettingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword = setNewPassword.value;
  const confirmPassword = setConfirmPassword.value;

  if (newPassword !== confirmPassword) {
    showToast('Passwords do not match', true);
    return;
  }

  try {
    const res = await apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ newPassword })
    });
    
    if (res.ok) {
      setNewPassword.value = '';
      setConfirmPassword.value = '';
      showToast('Password changed successfully');
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to update password', true);
    }
  } catch (err) {
    showToast('Failed to update password', true);
  }
});

// Setup actions
function setupEvents() {
  btnOpenAddPromptModal.addEventListener('click', openAddPromptModal);
  promptFormClose.addEventListener('click', closePromptFormModal);
  btnCancelPrompt.addEventListener('click', closePromptFormModal);

  promptFormModal.addEventListener('click', (e) => {
    if (e.target === promptFormModal) {
      closePromptFormModal();
    }
  });

  btnLogoutHeader.addEventListener('click', handleLogout);
  btnLogoutSidebar.addEventListener('click', handleLogout);

  // Dashboard shortcuts
  dashActionAddPrompt.addEventListener('click', () => {
    switchTab('prompts');
    openAddPromptModal();
  });
  
  dashActionViewPending.addEventListener('click', () => {
    switchTab('pending');
  });

  dashActionAddCat.addEventListener('click', () => {
    switchTab('categories');
    newCategoryName.focus();
  });
}

// Entry Point
document.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  verifySession();
  lucide.createIcons();
});
