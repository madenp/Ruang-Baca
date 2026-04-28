// ===== History Page - JavaScript =====

// Storage key for localStorage
const STORAGE_KEY = 'ruangBacaVisitors';
const ACTION_PASSWORD = 'feb2026';

// State
let visitors = [];
let isActionUnlocked = false;

// DOM Elements
const elements = {
    historyTableBody: document.getElementById('historyTableBody'),
    emptyHistoryState: document.getElementById('emptyHistoryState'),
    activeVisitors: document.getElementById('activeVisitors'),
    todayVisitors: document.getElementById('todayVisitors'),
    totalVisitors: document.getElementById('totalVisitors'),
    searchHistory: document.getElementById('searchHistory'),
    exportBtn: document.getElementById('exportBtn'),
    syncBtn: document.getElementById('syncBtn'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    passwordModal: document.getElementById('passwordModal'),
    closePasswordModal: document.getElementById('closePasswordModal'),
    cancelDelete: document.getElementById('cancelDelete'),
    confirmDelete: document.getElementById('confirmDelete'),
    deletePassword: document.getElementById('deletePassword'),
    actionLockBtn: document.getElementById('actionLockBtn'),
    toast: document.getElementById('toast')
};

// Current modal mode
let modalMode = 'delete'; // 'delete' or 'unlock'

// ===== Utility Functions =====

function formatTime(date) {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
    return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(date) {
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }) + ' ' + formatTime(date);
}

function calculateDuration(checkIn, checkOut = new Date()) {
    const diff = checkOut - new Date(checkIn);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
        return `${hours}j ${mins}m`;
    }
    return `${mins}m`;
}

function isToday(date) {
    const today = new Date();
    const compareDate = new Date(date);
    return today.toDateString() === compareDate.toDateString();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Storage Functions =====

async function loadVisitors() {
    try {
        // Try loading from server API first
        const response = await fetch('/api/visitors');
        if (response.ok) {
            visitors = await response.json();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(visitors)); // Cache it
            console.log('Data loaded from server API:', visitors.length, 'records');
            return;
        }
    } catch (fetchError) {
        console.warn('Could not load from server API, falling back to local storage:', fetchError);
    }
    
    // Fallback to local storage
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            visitors = JSON.parse(data);
        } else {
            visitors = [];
        }
    } catch (error) {
        console.error('Error loading visitors:', error);
        visitors = [];
    }
}

function saveVisitors() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visitors));
        // Sync to server
        fetch('/api/visitors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(visitors)
        }).catch(err => console.error('Failed to sync to server:', err));
    } catch (error) {
        console.error('Error saving visitors:', error);
        showToast('Gagal menyimpan data', 'error');
    }
}

// ===== Stats Functions =====

function updateStats() {
    const activeCount = visitors.filter(v => v.status === 'active').length;
    const todayCount = visitors.filter(v => isToday(v.checkIn)).length;
    const totalCount = visitors.length;

    elements.activeVisitors.textContent = activeCount;
    elements.todayVisitors.textContent = todayCount;
    elements.totalVisitors.textContent = totalCount;
}

// ===== Action Lock Functions =====

function toggleActionLock() {
    if (isActionUnlocked) {
        // Lock it directly
        isActionUnlocked = false;
        updateLockUI();
        renderHistory(elements.searchHistory.value);
        showToast('Aksi dikunci', 'success');
    } else {
        // Need password to unlock
        openPasswordModal('unlock');
    }
}

function updateLockUI() {
    if (isActionUnlocked) {
        elements.actionLockBtn.classList.remove('locked');
        elements.actionLockBtn.classList.add('unlocked');
        elements.actionLockBtn.title = 'Klik untuk mengunci aksi';
    } else {
        elements.actionLockBtn.classList.remove('unlocked');
        elements.actionLockBtn.classList.add('locked');
        elements.actionLockBtn.title = 'Klik untuk membuka aksi';
    }
}

// ===== History Functions =====

function renderHistory(searchTerm = '') {
    let filteredVisitors = [...visitors].reverse();

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredVisitors = filteredVisitors.filter(v =>
            v.name.toLowerCase().includes(term) ||
            v.visitorId.toLowerCase().includes(term) ||
            (v.jurusan && v.jurusan.toLowerCase().includes(term)) ||
            v.purpose.toLowerCase().includes(term)
        );
    }

    if (filteredVisitors.length === 0) {
        document.querySelector('.table-container').style.display = 'none';
        elements.emptyHistoryState.style.display = 'flex';
        return;
    }

    document.querySelector('.table-container').style.display = 'block';
    elements.emptyHistoryState.style.display = 'none';

    const html = filteredVisitors.map((visitor, index) => {
        const checkInDate = new Date(visitor.checkIn);
        const checkOutDate = visitor.checkOut ? new Date(visitor.checkOut) : null;
        const duration = visitor.checkOut
            ? calculateDuration(visitor.checkIn, checkOutDate)
            : calculateDuration(visitor.checkIn);

        const statusHtml = visitor.status === 'active'
            ? '<span class="status-active">Aktif</span>'
            : '<span class="status-completed">Selesai</span>';

        const actionHtml = isActionUnlocked
            ? `<button class="btn-action-delete" onclick="deleteVisitor('${visitor.id}')" title="Hapus data ini">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
               </button>`
            : `<span class="action-locked-icon" title="Aksi terkunci">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
               </span>`;

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(visitor.name)}</td>
                <td>${escapeHtml(visitor.visitorId) || '-'}</td>
                <td>${escapeHtml(visitor.jurusan) || '-'}</td>
                <td>${escapeHtml(visitor.purpose)}</td>
                <td>${formatDateTime(checkInDate)}</td>
                <td>${checkOutDate ? formatDateTime(checkOutDate) : '-'}</td>
                <td>${duration}</td>
                <td>${statusHtml}</td>
                <td>${actionHtml}</td>
            </tr>
        `;
    }).join('');

    elements.historyTableBody.innerHTML = html;
}

// ===== Delete Single Visitor =====

function deleteVisitor(visitorId) {
    if (!isActionUnlocked) {
        showToast('Aksi terkunci. Buka kunci terlebih dahulu.', 'error');
        return;
    }

    const visitorIndex = visitors.findIndex(v => v.id === visitorId);
    if (visitorIndex === -1) {
        showToast('Data tidak ditemukan', 'error');
        return;
    }

    const visitorName = visitors[visitorIndex].name;

    if (!confirm(`Hapus data kunjungan ${visitorName}?`)) {
        return;
    }

    visitors.splice(visitorIndex, 1);
    saveVisitors();
    renderHistory(elements.searchHistory.value);
    updateStats();
    showToast(`Data ${visitorName} berhasil dihapus`, 'success');
}

// ===== Sync Functions =====

async function syncFromServer() {
    try {
        const response = await fetch('/api/visitors?t=' + Date.now());
        if (!response.ok) {
            showToast('Gagal membaca file dari server API', 'error');
            return;
        }

        const jsonData = await response.json();

        // Merge: gunakan data dari JSON sebagai base, tambahkan data baru dari localStorage
        const jsonIds = new Set(jsonData.map(v => v.id));
        const localOnly = visitors.filter(v => !jsonIds.has(v.id));

        // Gabungkan: data JSON + data lokal yang belum ada di JSON
        visitors = [...jsonData, ...localOnly];
        saveVisitors();

        renderHistory(elements.searchHistory.value);
        updateStats();

        const syncCount = jsonData.length;
        const newLocalCount = localOnly.length;
        showToast(`Sync berhasil! ${syncCount} data dari Server${newLocalCount > 0 ? `, ${newLocalCount} data lokal baru` : ''}`, 'success');
    } catch (error) {
        console.error('Sync error:', error);
        showToast('Gagal sync data: ' + error.message, 'error');
    }
}

// ===== Export Functions =====

function exportToJSON() {
    if (visitors.length === 0) {
        showToast('Tidak ada data untuk diexport', 'error');
        return;
    }

    const jsonContent = JSON.stringify(visitors, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'riwayat_pengunjung.json';
    link.click();
    URL.revokeObjectURL(url);

    showToast('Data berhasil diexport! Timpa file riwayat_pengunjung.json di folder project.', 'success');
}

// ===== Password Modal Functions =====

function openPasswordModal(mode = 'delete') {
    modalMode = mode;

    if (mode === 'delete' && visitors.length === 0) {
        showToast('Tidak ada data untuk dihapus', 'error');
        return;
    }

    // Update modal title based on mode
    const modalTitle = document.querySelector('#passwordModal .modal-header h3');
    const modalDesc = document.querySelector('#passwordModal .modal-body p');
    const confirmBtn = document.querySelector('#passwordModal #confirmDelete');

    if (mode === 'unlock') {
        modalTitle.textContent = 'Buka Kunci Aksi';
        modalDesc.textContent = 'Masukkan password untuk membuka aksi:';
        confirmBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
            </svg>
            Buka Kunci
        `;
    } else {
        modalTitle.textContent = 'Konfirmasi Password';
        modalDesc.textContent = 'Masukkan password untuk menghapus semua data:';
        confirmBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Hapus Semua
        `;
    }

    elements.deletePassword.value = '';
    elements.passwordModal.classList.add('active');
    elements.deletePassword.focus();
}

function closePasswordModal() {
    elements.passwordModal.classList.remove('active');
    elements.deletePassword.value = '';
}

function handlePasswordConfirm() {
    const password = elements.deletePassword.value;

    if (password !== ACTION_PASSWORD) {
        showToast('Password salah!', 'error');
        elements.deletePassword.value = '';
        elements.deletePassword.focus();
        return;
    }

    if (modalMode === 'unlock') {
        isActionUnlocked = true;
        updateLockUI();
        renderHistory(elements.searchHistory.value);
        closePasswordModal();
        showToast('Aksi berhasil dibuka!', 'success');
    } else {
        // Delete all
        visitors = [];
        saveVisitors();
        closePasswordModal();
        renderHistory();
        updateStats();
        showToast('Semua data berhasil dihapus!', 'success');
    }
}

// ===== Toast Functions =====

function showToast(message, type = 'success') {
    const iconSvg = type === 'success'
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

    elements.toast.className = `toast ${type}`;
    elements.toast.querySelector('.toast-icon').innerHTML = iconSvg;
    elements.toast.querySelector('.toast-message').textContent = message;
    elements.toast.classList.add('show');

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// ===== Event Listeners =====

function initEventListeners() {
    // Search history
    elements.searchHistory.addEventListener('input', (e) => {
        renderHistory(e.target.value);
    });

    // Sync button
    elements.syncBtn.addEventListener('click', syncFromServer);

    // Export button
    elements.exportBtn.addEventListener('click', exportToJSON);

    // Clear history button - opens password modal
    elements.clearHistoryBtn.addEventListener('click', () => openPasswordModal('delete'));

    // Action lock button
    elements.actionLockBtn.addEventListener('click', toggleActionLock);

    // Password modal controls
    elements.closePasswordModal.addEventListener('click', closePasswordModal);
    elements.cancelDelete.addEventListener('click', closePasswordModal);
    elements.confirmDelete.addEventListener('click', handlePasswordConfirm);

    // Close modal on overlay click
    document.querySelector('#passwordModal .modal-overlay').addEventListener('click', closePasswordModal);

    // Close modal on Escape key, confirm on Enter
    document.addEventListener('keydown', (e) => {
        if (elements.passwordModal.classList.contains('active')) {
            if (e.key === 'Escape') {
                closePasswordModal();
            } else if (e.key === 'Enter') {
                handlePasswordConfirm();
            }
        }
    });
}

// ===== Initialization =====

async function init() {
    // Load data (async - may fetch from JSON on first run)
    await loadVisitors();

    // Sync with server API
    await syncFromServer();

    // Initialize event listeners
    initEventListeners();

    // Initial render
    renderHistory();
    updateStats();
    updateLockUI();

    // Initialize floating logo visibility
    initFloatingLogoVisibility();
}

// ===== Floating Logo Visibility =====

function initFloatingLogoVisibility() {
    const header = document.querySelector('.header');
    const floatingLogo = document.querySelector('.floating-logo');

    if (!header || !floatingLogo) return;

    // Create intersection observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Header is visible - hide floating logo
                floatingLogo.classList.remove('visible');
            } else {
                // Header is not visible - show floating logo
                floatingLogo.classList.add('visible');
            }
        });
    }, {
        threshold: 0,
        rootMargin: '0px'
    });

    // Observe the header
    observer.observe(header);
}

// Start the application
document.addEventListener('DOMContentLoaded', init);

// Make functions available globally for onclick handlers
window.deleteVisitor = deleteVisitor;
