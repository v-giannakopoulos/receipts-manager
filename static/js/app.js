// Global state
let allData = { receipts: [], items: [], next_id: 1, integrity_issues: [] };
let suggestions = { shops: [], brands: [], models: [], locations: [], documentation: [], projects: [], users: [] };
let currentSort = { column: 'id', direction: 'asc' };
let currentFile = null;
let receiptInfo = {};
let itemsToCreate = [];
let currentItemIndex = 0;
let editingItemId = null;
let visibleColumns = new Set(['id', 'receipt_group_id', 'brand', 'model', 'location', 'users', 'project', 'shop', 'purchase_date', 'documentation', 'guarantee', 'guarantee_end_date', 'file']);

// Project colors (for visual differentiation)
const projectColors = {};
const colorPalette = [
    '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336',
    '#00bcd4', '#8bc34a', '#ff5722', '#673ab7', '#3f51b5'
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadSuggestions();
    setupEventListeners();
    setupDateInput();
});

// Event Listeners
function setupEventListeners() {
    // Drop zone
        
    // Prevent default drag behavior on entire window to avoid opening files in browser
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        window.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // Add click handler for browse link FIRST
    const browseLink = document.querySelector('.browse-link');
    if (browseLink) {
        browseLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Browse link clicked!');
            fileInput.click();
        });
    }

    // Then add dropZone handler, but check if target is browse link
    dropZone.addEventListener('click', (e) => {
        if (!e.target.classList.contains('browse-link')) {
            fileInput.click();
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });


    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Search and filters
    document.getElementById('searchInput').addEventListener('input', filterAndRender);
    document.getElementById('projectFilter').addEventListener('change', filterAndRender);
    document.getElementById('statusFilter').addEventListener('change', filterAndRender);
    document.getElementById('userFilter').addEventListener('change', filterAndRender);

    // Buttons
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadData();
        loadSuggestions();
    });

    document.getElementById('columnToggleBtn').addEventListener('click', () => {
        const panel = document.getElementById('columnPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('closeColumnPanel').addEventListener('click', () => {
        document.getElementById('columnPanel').style.display = 'none';
    });

    document.getElementById('exportJsonBtn').addEventListener('click', exportJson);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);

    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importInput').click();
    });

    document.getElementById('importInput').addEventListener('change', handleImport);

    document.getElementById('recheckBtn').addEventListener('click', recheckIntegrity);
    document.getElementById('closeBannerBtn').addEventListener('click', () => {
        document.getElementById('integrityBanner').style.display = 'none';
    });

    // Column toggles
    document.querySelectorAll('.col-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const column = e.target.dataset.column;
            if (e.target.checked) {
                visibleColumns.add(column);
            } else {
                visibleColumns.delete(column);
            }
            updateColumnVisibility();
        });
    });

    // Sort headers
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            updateSortIndicators();
            filterAndRender();
        });
    });

    // Tag inputs
    setupTagInput('userInput', 'userTags', 8);
    setupTagInput('editUserInput', 'editUserTags', 8);
}

// Date input helper
function setupDateInput() {
    const dateInputs = ['receiptDate', 'editDate'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    dateInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (!input) return;

        // Set today's date as default in correct format
        const today = new Date();
        const formatted = `${today.getFullYear()}-${months[today.getMonth()]}-${String(today.getDate()).padStart(2, '0')}`;
        input.value = formatted;

        // Auto-format on blur
        input.addEventListener('blur', () => {
            let val = input.value.trim();
            if (!val) return;

            // Try to parse various formats
            let date;
            if (val.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
                const parts = val.split('-');
                date = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
            } else if (val.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
                const parts = val.split('/');
                date = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
            } else {
                return;
            }

            if (date && !isNaN(date)) {
                input.value = `${date.getFullYear()}-${months[date.getMonth()]}-${String(date.getDate()).padStart(2, '0')}`;
            }
        });
    });
}

// Tag input setup
function setupTagInput(inputId, containerId, maxTags) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);

    if (!input || !container) return;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            e.preventDefault();
            const tags = container.querySelectorAll('.user-tag');
            if (tags.length >= maxTags) {
                alert(`Maximum ${maxTags} users allowed`);
                return;
            }

            const value = input.value.trim();
            if (!value) return;

            // Check if already exists
            const existing = Array.from(tags).some(tag => tag.textContent.replace('×', '').trim() === value);
            if (existing) {
                input.value = '';
                return;
            }

            const tag = document.createElement('span');
            tag.className = 'user-tag';
            tag.innerHTML = `${value} <span class="remove">×</span>`;

            tag.querySelector('.remove').addEventListener('click', () => tag.remove());

            container.insertBefore(tag, input);
            input.value = '';
        }
    });
}

function getTagValues(containerId) {
    const container = document.getElementById(containerId);
    const tags = container.querySelectorAll('.user-tag');
    return Array.from(tags).map(tag => tag.textContent.replace('×', '').trim());
}

function setTagValues(containerId, values) {
    const container = document.getElementById(containerId);
    const input = container.querySelector('input');

    // Clear existing tags
    container.querySelectorAll('.user-tag').forEach(tag => tag.remove());

    // Add new tags
    values.forEach(value => {
        const tag = document.createElement('span');
        tag.className = 'user-tag';
        tag.innerHTML = `${value} <span class="remove">×</span>`;
        tag.querySelector('.remove').addEventListener('click', () => tag.remove());
        container.insertBefore(tag, input);
    });
}

// Data loading
async function loadData() {
    try {
        const response = await fetch('/api/data');
        allData = await response.json();

        // Show integrity banner if issues exist
        if (allData.integrity_issues && allData.integrity_issues.length > 0) {
            document.getElementById('integrityBanner').style.display = 'block';
        } else {
            document.getElementById('integrityBanner').style.display = 'none';
        }

        filterAndRender();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data');
    }
}

async function loadSuggestions() {
    try {
        const response = await fetch('/api/suggestions');
        suggestions = await response.json();
        populateDataLists();
        populateFilterDropdowns();
    } catch (error) {
        console.error('Error loading suggestions:', error);
    }
}

function populateDataLists() {
    // Shop
    const shopList = document.getElementById('shopList');
    shopList.innerHTML = suggestions.shops.map(s => `<option value="${s}">`).join('');

    // Brand
    const brandList = document.getElementById('brandList');
    brandList.innerHTML = suggestions.brands.map(s => `<option value="${s}">`).join('');

    // Model
    const modelList = document.getElementById('modelList');
    modelList.innerHTML = suggestions.models.map(s => `<option value="${s}">`).join('');

    // Location
    const locationList = document.getElementById('locationList');
    locationList.innerHTML = suggestions.locations.map(s => `<option value="${s}">`).join('');

    // Documentation
    const docList = document.getElementById('docList');
    docList.innerHTML = suggestions.documentation.map(s => `<option value="${s}">`).join('');

    // Project
    const projectList = document.getElementById('projectList');
    projectList.innerHTML = suggestions.projects.map(s => `<option value="${s}">`).join('');

    // Users
    const userList = document.getElementById('userList');
    userList.innerHTML = suggestions.users.map(s => `<option value="${s}">`).join('');
}

function populateFilterDropdowns() {
    // Projects
    const projectFilter = document.getElementById('projectFilter');
    const currentProject = projectFilter.value;
    projectFilter.innerHTML = '<option value="">All Projects</option>';
    suggestions.projects.forEach(p => {
        projectFilter.innerHTML += `<option value="${p}">${p}</option>`;
    });
    projectFilter.value = currentProject;

    // Users
    const userFilter = document.getElementById('userFilter');
    const currentUser = userFilter.value;
    userFilter.innerHTML = '<option value="">All Users</option>';
    suggestions.users.forEach(u => {
        userFilter.innerHTML += `<option value="${u}">${u}</option>`;
    });
    userFilter.value = currentUser;
}
