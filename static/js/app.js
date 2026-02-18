// ===================== Global state =====================
let allData = { receipts: [], items: [], next_id: 1, integrity_issues: [] };
let suggestions = { shops: [], brands: [], models: [], locations: [], documentation: [], projects: [], users: [] };
let currentSort = { column: 'id', direction: 'asc' };
let visibleColumns = new Set([
  'id', 'receipt_group_id', 'brand', 'model', 'location', 'users', 'project',
  'shop', 'purchase_date', 'documentation', 'guarantee_end_date', 'file'
]);

// Backend endpoints
const API = {
  data: '/api/data',
  suggestions: '/api/suggestions',
  exportJson: '/api/export/json',
  exportCsv: '/api/export/csv',
  importJson: '/api/import/json',
  integrityCheck: '/api/integrity/check',
  upload: '/api/upload'  // NEW: upload endpoint now exists
};

// ===================== DOM helpers =====================
function $(id) { return document.getElementById(id); }
function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

function bind(id, event, handler) {
  const el = $(id);
  if (!el) { console.warn(`[bind] Missing #${id}`); return; }
  el.addEventListener(event, handler);
}

async function fetchJson(url, opts) {
  const resp = await fetch(url, opts);
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`${opts?.method || 'GET'} ${url} failed: ${resp.status} ${text}`);
  }
  return await resp.json();
}

// ===================== Downloads (use server endpoints) =====================
function downloadUrl(url) {
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function exportJson() { downloadUrl(API.exportJson); }
function exportCsv() { downloadUrl(API.exportCsv); }

// ===================== Data loading =====================
async function loadData() {
  try {
    allData = await fetchJson(API.data);

    const banner = $('integrityBanner');
    if (banner) {
      const issues = allData.integrity_issues || [];
      banner.style.display = issues.length > 0 ? 'block' : 'none';
      if ($('integrityMessage')) $('integrityMessage').textContent =
        issues.length > 0 ? `${issues.length} integrity issue(s) detected.` : '';
    }

    filterAndRender();
  } catch (err) {
    console.error('Error loading data:', err);
    alert('Error loading data (see Console).');
  }
}

async function loadSuggestions() {
  try {
    suggestions = await fetchJson(API.suggestions);
    populateDataLists();
    populateFilterDropdowns();
  } catch (err) {
    console.error('Error loading suggestions:', err);
  }
}

function populateDataLists() {
  const set = (id, arr) => {
    const el = $(id);
    if (!el) return;
    const safe = Array.isArray(arr) ? arr : [];
    el.innerHTML = safe.map(s => `<option value="${String(s).replace(/"/g, '&quot;')}">`).join('');
  };

  set('shopList', suggestions.shops);
  set('brandList', suggestions.brands);
  set('modelList', suggestions.models);
  set('locationList', suggestions.locations);
  set('docList', suggestions.documentation);
  set('projectList', suggestions.projects);
  set('userList', suggestions.users);
}

function populateFilterDropdowns() {
  const projectFilter = $('projectFilter');
  if (projectFilter) {
    const current = projectFilter.value;
    projectFilter.innerHTML = '<option value="">All Projects</option>' +
      (Array.isArray(suggestions.projects) ? suggestions.projects : [])
        .map(p => `<option value="${String(p).replace(/"/g, '&quot;')}">${p}</option>`).join('');
    projectFilter.value = current;
  }

  const userFilter = $('userFilter');
  if (userFilter) {
    const current = userFilter.value;
    userFilter.innerHTML = '<option value="">All Users</option>' +
      (Array.isArray(suggestions.users) ? suggestions.users : [])
        .map(u => `<option value="${String(u).replace(/"/g, '&quot;')}">${u}</option>`).join('');
    userFilter.value = current;
  }
}

// ===================== Table join + render =====================
function receiptMap() {
  const map = new Map();
  (allData.receipts || []).forEach(r => map.set(r.receipt_group_id, r));
  return map;
}

function normalizeUsers(u) {
  if (Array.isArray(u)) return u;
  return String(u || '').split(';').map(s => s.trim()).filter(Boolean);
}

function getStatus(item) {
  const end = item?.guarantee_end_date;
  if (!end || end === 'N/A') return 'active';
  const d = new Date(String(end).replace(/-/g, '/'));
  if (isNaN(d)) return 'active';
  const now = new Date();
  const diffDays = Math.floor((d - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 90) return 'expiring';
  return 'active';
}

function applyFilters(rows) {
  const q = ($('searchInput')?.value || '').trim().toLowerCase();
  const project = $('projectFilter')?.value || '';
  const status = $('statusFilter')?.value || '';
  const user = $('userFilter')?.value || '';

  return (rows || []).filter(r => {
    if (project && String(r.project || '') !== project) return false;
    if (status && getStatus(r) !== status) return false;
    if (user && !normalizeUsers(r.users).includes(user)) return false;

    if (q) {
      const hay = [
        r.id, r.receipt_group_id, r.brand, r.model, r.location, r.project,
        r.shop, r.purchase_date, r.documentation, r.guarantee_end_date,
        normalizeUsers(r.users).join('; '), r.file
      ].map(x => String(x || '').toLowerCase()).join(' | ');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function sortRows(rows) {
  const col = currentSort.column;
  const dir = currentSort.direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => String(a?.[col] ?? '').localeCompare(String(b?.[col] ?? '')) * dir);
}

function buildRows() {
  const rmap = receiptMap();
  return (allData.items || []).map(it => {
    const r = rmap.get(it.receipt_group_id) || {};
    return {
      id: it.id,
      receipt_group_id: it.receipt_group_id,
      brand: it.brand || '',
      model: it.model || '',
      location: it.location || '',
      users: it.users || [],
      project: it.project || '',
      shop: r.shop || '',
      purchase_date: r.purchase_date || '',
      documentation: r.documentation || '',
      guarantee_end_date: it.guarantee_end_date || '',
      file: r.receipt_filename || it.receipt_relative_path || ''
    };
  });
}

function renderTable(rows) {
  const tbody = $('tableBody');
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="14">
          <div class="empty-message">
            <span class="empty-icon">📦</span>
            <p>No items yet. Upload a receipt to get started!</p>
          </div>
        </td>
      </tr>`;
    $('itemCount') && ($('itemCount').textContent = '0 items');
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td data-column="id">${r.id ?? ''}</td>
      <td data-column="receipt_group_id">${r.receipt_group_id ?? ''}</td>
      <td data-column="brand">${r.brand ?? ''}</td>
      <td data-column="model">${r.model ?? ''}</td>
      <td data-column="location">${r.location ?? ''}</td>
      <td data-column="users">${normalizeUsers(r.users).join('; ')}</td>
      <td data-column="project">${r.project ?? ''}</td>
      <td data-column="shop">${r.shop ?? ''}</td>
      <td data-column="purchase_date">${r.purchase_date ?? ''}</td>
      <td data-column="documentation">${r.documentation ?? ''}</td>
      <td data-column="guarantee_end_date">${r.guarantee_end_date ?? ''}</td>
      <td data-column="file">${r.file ?? ''}</td>
      <td data-column="actions"><button type="button" class="btn-small" disabled>Edit</button></td>
    </tr>
  `).join('');

  $('itemCount') && ($('itemCount').textContent = `${rows.length} items`);
  updateColumnVisibility();
}

function updateColumnVisibility() {
  qsa('th[data-column]').forEach(th => {
    const c = th.dataset.column;
    th.style.display = visibleColumns.has(c) ? '' : 'none';
  });
  qsa('#itemsTable td[data-column]').forEach(td => {
    const c = td.dataset.column;
    td.style.display = visibleColumns.has(c) ? '' : 'none';
  });
}

function updateSortIndicators() {
  qsa('th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.column === currentSort.column) {
      th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

function filterAndRender() {
  const rows = buildRows();
  const filtered = applyFilters(rows);
  const sorted = sortRows(filtered);
  renderTable(sorted);
}

// ===================== Import + integrity =====================
async function handleImport(e) {
  const f = e?.target?.files?.[0];
  if (!f) return;

  try {
    const text = await f.text();
    const payload = JSON.parse(text);
    await fetchJson(API.importJson, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    await loadData();
    await loadSuggestions();
    alert('Imported successfully.');
  } catch (err) {
    console.error('Import failed:', err);
    alert('Import failed (see Console).');
  } finally {
    e.target.value = '';
  }
}

async function recheckIntegrity() {
  try {
    await fetchJson(API.integrityCheck, { method: 'POST' });
    await loadData();
  } catch (err) {
    console.error('Integrity check failed:', err);
    await loadData();
  }
}

// ===================== File upload (NOW WORKING) =====================
async function handleFile(file) {
  if (!file) return;

  try {
    // Validate file type
    const okTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (file.type && !okTypes.includes(file.type)) {
      alert('Unsupported file type. Please upload PDF, JPG, or PNG.');
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 50MB.');
      return;
    }

    // Upload via multipart/form-data
    const formData = new FormData();
    formData.append('file', file);

    const resp = await fetch(API.upload, {
      method: 'POST',
      body: formData
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Upload failed: ${resp.status} ${text}`);
    }

    const result = await resp.json();
    console.log('Upload success:', result);

    // Reload data to show new item
    await loadData();
    await loadSuggestions();

    alert(`File uploaded successfully!\n\nReceipt Group: ${result.receipt_group_id}\nItem ID: ${result.item_id}`);
  } catch (err) {
    console.error('Upload error:', err);
    alert(`Upload failed: ${err.message}`);
  }
}

// ===================== Event listeners =====================
function setupEventListeners() {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
  });

  const dropZone = $('dropZone');
  const fileInput = $('fileInput');
  if (dropZone && fileInput) {
    const browseLink = qs('.browse-link');
    if (browseLink) {
      browseLink.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fileInput.click(); });
    }
    dropZone.addEventListener('click', (e) => { if (!e.target.classList.contains('browse-link')) fileInput.click(); });
    dropZone.addEventListener('dragover', () => dropZone.classList.add('drag-over'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
      dropZone.classList.remove('drag-over');
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFile(f);
    });
    fileInput.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    });
  }

  bind('searchInput', 'input', filterAndRender);
  bind('projectFilter', 'change', filterAndRender);
  bind('statusFilter', 'change', filterAndRender);
  bind('userFilter', 'change', filterAndRender);

  bind('refreshBtn', 'click', () => { loadData(); loadSuggestions(); });

  bind('exportJsonBtn', 'click', exportJson);
  bind('exportCsvBtn', 'click', exportCsv);

  bind('importBtn', 'click', () => $('importInput')?.click());
  bind('importInput', 'change', handleImport);

  bind('recheckBtn', 'click', recheckIntegrity);
  bind('closeBannerBtn', 'click', () => { const b = $('integrityBanner'); if (b) b.style.display = 'none'; });

  bind('columnToggleBtn', 'click', () => {
    const panel = $('columnPanel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });
  bind('closeColumnPanel', 'click', () => { const panel = $('columnPanel'); if (panel) panel.style.display = 'none'; });

  qsa('.col-toggle').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const column = e.target.dataset.column;
      if (!column) return;
      if (e.target.checked) visibleColumns.add(column);
      else visibleColumns.delete(column);
      updateColumnVisibility();
    });
  });

  qsa('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.dataset.column;
      if (!column) return;
      if (currentSort.column === column) currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      else { currentSort.column = column; currentSort.direction = 'asc'; }
      updateSortIndicators();
      filterAndRender();
    });
  });
}

// ===================== Init =====================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  loadSuggestions();
  setupEventListeners();
});