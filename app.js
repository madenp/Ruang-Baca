// ===== Visitor Management System - Main JavaScript =====

// Storage key for localStorage
const STORAGE_KEY = 'ruangBacaVisitors';

// State
let visitors = [];
let currentCheckoutVisitor = null;
let durationUpdateInterval = null;
let visitorType = 'new'; // 'new' or 'returning'
let selectedReturningVisitor = null;

// DOM Elements
const elements = {
    checkInForm: document.getElementById('checkInForm'),
    visitorName: document.getElementById('visitorName'),
    visitorId: document.getElementById('visitorId'),
    jurusan: document.getElementById('jurusan'),
    purpose: document.getElementById('purpose'),
    activeVisitorsList: document.getElementById('activeVisitorsList'),
    emptyActiveState: document.getElementById('emptyActiveState'),
    activeCount: document.getElementById('activeCount'),
    activeVisitors: document.getElementById('activeVisitors'),
    todayVisitors: document.getElementById('todayVisitors'),
    totalVisitors: document.getElementById('totalVisitors'),
    liveClock: document.getElementById('liveClock'),
    liveDate: document.getElementById('liveDate'),
    checkOutModal: document.getElementById('checkOutModal'),
    closeModal: document.getElementById('closeModal'),
    cancelCheckout: document.getElementById('cancelCheckout'),
    confirmCheckout: document.getElementById('confirmCheckout'),
    checkoutName: document.getElementById('checkoutName'),
    checkoutPurpose: document.getElementById('checkoutPurpose'),
    checkoutDuration: document.getElementById('checkoutDuration'),
    toast: document.getElementById('toast'),
    // Visitor type elements
    newVisitorTab: document.getElementById('newVisitorTab'),
    returningVisitorTab: document.getElementById('returningVisitorTab'),
    newVisitorFields: document.getElementById('newVisitorFields'),
    returningVisitorSection: document.getElementById('returningVisitorSection'),
    returningVisitorSearch: document.getElementById('returningVisitorSearch'),
    returningVisitorList: document.getElementById('returningVisitorList'),
    selectedVisitorInfo: document.getElementById('selectedVisitorInfo'),
    selectedVisitorName: document.getElementById('selectedVisitorName'),
    selectedVisitorJurusan: document.getElementById('selectedVisitorJurusan'),
    selectedVisitorId: document.getElementById('selectedVisitorId'),
    clearSelection: document.getElementById('clearSelection'),
    // Leaderboard elements
    topVisitsList: document.getElementById('topVisitsList'),
    topDurationList: document.getElementById('topDurationList')
};

// ===== Utility Functions =====

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

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

function calculateDurationHMS(checkIn, checkOut = new Date()) {
    const diff = checkOut - new Date(checkIn);
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Pad with leading zeros
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return `${hh}:${mm}:${ss}`;
}

function getInitials(name) {
    return name.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function isToday(date) {
    const today = new Date();
    const compareDate = new Date(date);
    return today.toDateString() === compareDate.toDateString();
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

async function syncFromServer() {
    try {
        const response = await fetch('/api/visitors?t=' + Date.now());
        if (!response.ok) return;

        const jsonData = await response.json();
        if (jsonData.length === 0) return;

        // Merge: data JSON sebagai base, tambahkan data lokal yang belum ada di JSON
        const jsonIds = new Set(jsonData.map(v => v.id));
        const localOnly = visitors.filter(v => !jsonIds.has(v.id));

        visitors = [...jsonData, ...localOnly];
        saveVisitors();
        console.log('Synced with server API:', jsonData.length, 'records from JSON,', localOnly.length, 'local-only records');
    } catch (error) {
        console.warn('Could not sync with server API:', error);
    }
}

// ===== Clock Functions =====

function updateClock() {
    const now = new Date();
    elements.liveClock.textContent = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    elements.liveDate.textContent = formatDate(now);
}

// ===== Stats Functions =====

function updateStats() {
    const activeCount = visitors.filter(v => v.status === 'active').length;
    const todayCount = visitors.filter(v => isToday(v.checkIn)).length;
    const totalCount = visitors.length;

    elements.activeVisitors.textContent = activeCount;
    elements.todayVisitors.textContent = todayCount;
    elements.totalVisitors.textContent = totalCount;
    elements.activeCount.textContent = `${activeCount} Pengunjung`;
}

// ===== Leaderboard Functions =====

function getTopVisitorsByCount() {
    // Group visits by visitor (name + visitorId)
    const visitorMap = new Map();

    visitors.forEach(v => {
        const key = `${v.name.toLowerCase()}_${v.visitorId.toLowerCase()}`;
        if (!visitorMap.has(key)) {
            visitorMap.set(key, {
                name: v.name,
                visitorId: v.visitorId,
                jurusan: v.jurusan || '',
                visitCount: 1
            });
        } else {
            visitorMap.get(key).visitCount++;
        }
    });

    // Sort by visit count and return top 3
    return Array.from(visitorMap.values())
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, 3);
}

function getTopVisitorsByDuration() {
    // Group total duration by visitor (name + visitorId)
    const visitorMap = new Map();

    visitors.forEach(v => {
        const key = `${v.name.toLowerCase()}_${v.visitorId.toLowerCase()}`;
        const checkIn = new Date(v.checkIn);
        const checkOut = v.checkOut ? new Date(v.checkOut) : new Date();
        const durationMs = checkOut - checkIn;

        if (!visitorMap.has(key)) {
            visitorMap.set(key, {
                name: v.name,
                visitorId: v.visitorId,
                jurusan: v.jurusan || '',
                totalDurationMs: durationMs,
                visitCount: 1
            });
        } else {
            const existing = visitorMap.get(key);
            existing.totalDurationMs += durationMs;
            existing.visitCount++;
        }
    });

    // Sort by total duration and return top 3
    return Array.from(visitorMap.values())
        .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
        .slice(0, 3);
}

function formatDurationLong(ms) {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
        return `${hours}j ${mins}m`;
    }
    return `${mins}m`;
}

function renderLeaderboards() {
    // Top by visit count
    const topVisits = getTopVisitorsByCount();
    if (topVisits.length === 0) {
        elements.topVisitsList.innerHTML = `
            <div class="empty-state-sm">
                <p>Belum ada data</p>
            </div>
        `;
    } else {
        elements.topVisitsList.innerHTML = topVisits.map((visitor, index) => `
            <div class="leaderboard-item">
                <div class="leaderboard-rank rank-${index + 1}">${index + 1}</div>
                <div class="leaderboard-avatar">${getInitials(visitor.name)}</div>
                <div class="leaderboard-info">
                    <div class="name">${escapeHtml(visitor.name)}</div>
                    <div class="detail">${escapeHtml(visitor.jurusan) || 'N/A'}</div>
                </div>
                <div class="leaderboard-stat">
                    <div class="value">${visitor.visitCount}x</div>
                    <div class="label">Kunjungan</div>
                </div>
            </div>
        `).join('');
    }

    // Top by duration
    const topDuration = getTopVisitorsByDuration();
    if (topDuration.length === 0) {
        elements.topDurationList.innerHTML = `
            <div class="empty-state-sm">
                <p>Belum ada data</p>
            </div>
        `;
    } else {
        elements.topDurationList.innerHTML = topDuration.map((visitor, index) => `
            <div class="leaderboard-item">
                <div class="leaderboard-rank rank-${index + 1}">${index + 1}</div>
                <div class="leaderboard-avatar">${getInitials(visitor.name)}</div>
                <div class="leaderboard-info">
                    <div class="name">${escapeHtml(visitor.name)}</div>
                    <div class="detail">${visitor.visitCount}x kunjungan</div>
                </div>
                <div class="leaderboard-stat duration">
                    <div class="value">${formatDurationLong(visitor.totalDurationMs)}</div>
                    <div class="label">Total</div>
                </div>
            </div>
        `).join('');
    }
}

// ===== Active Visitors Functions =====

function renderActiveVisitors() {
    const activeVisitors = visitors.filter(v => v.status === 'active');

    if (activeVisitors.length === 0) {
        elements.activeVisitorsList.innerHTML = '';
        elements.activeVisitorsList.appendChild(elements.emptyActiveState);
        elements.emptyActiveState.style.display = 'flex';
        return;
    }

    elements.emptyActiveState.style.display = 'none';

    const html = activeVisitors.map(visitor => `
        <div class="visitor-item" data-id="${visitor.id}">
            <div class="visitor-info">
                <div class="visitor-avatar">${getInitials(visitor.name)}</div>
                <div class="visitor-details">
                    <h4>${escapeHtml(visitor.name)}</h4>
                    <p>${escapeHtml(visitor.purpose)}</p>
                    <span>Check-in: ${formatTime(new Date(visitor.checkIn))}</span>
                </div>
            </div>
            <div class="visitor-actions">
                <div class="visitor-duration">
                    <div class="time" data-checkin="${visitor.checkIn}">${calculateDuration(visitor.checkIn)}</div>
                    <div class="label">Durasi</div>
                </div>
                <button class="btn-checkout-sm" onclick="openCheckoutModal('${visitor.id}')">
                    Check-Out
                </button>
            </div>
        </div>
    `).join('');

    elements.activeVisitorsList.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Returning Visitor Functions =====

function getUniqueVisitors() {
    // Get unique visitors based on name and visitorId combination
    const visitorMap = new Map();

    visitors.forEach(v => {
        const key = `${v.name.toLowerCase()}_${v.visitorId.toLowerCase()}`;
        if (!visitorMap.has(key)) {
            visitorMap.set(key, {
                name: v.name,
                visitorId: v.visitorId,
                jurusan: v.jurusan || '',
                visitCount: 1,
                lastVisit: v.checkIn
            });
        } else {
            const existing = visitorMap.get(key);
            existing.visitCount++;
            if (new Date(v.checkIn) > new Date(existing.lastVisit)) {
                existing.lastVisit = v.checkIn;
                // Update jurusan to latest if available
                if (v.jurusan) {
                    existing.jurusan = v.jurusan;
                }
            }
        }
    });

    // Convert to array and sort by visit count (most visits first)
    return Array.from(visitorMap.values())
        .sort((a, b) => b.visitCount - a.visitCount);
}

function renderReturningVisitorList(searchTerm = '') {
    const uniqueVisitors = getUniqueVisitors();

    if (uniqueVisitors.length === 0) {
        elements.returningVisitorList.innerHTML = `
            <div class="no-results">
                Belum ada riwayat pengunjung. Silakan gunakan "Pengunjung Baru".
            </div>
        `;
        elements.returningVisitorList.classList.add('show');
        return;
    }

    let filtered = uniqueVisitors;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = uniqueVisitors.filter(v =>
            v.name.toLowerCase().includes(term) ||
            v.visitorId.toLowerCase().includes(term)
        );
    }

    if (filtered.length === 0) {
        elements.returningVisitorList.innerHTML = `
            <div class="no-results">
                Tidak ditemukan pengunjung dengan nama "${escapeHtml(searchTerm)}"
            </div>
        `;
        elements.returningVisitorList.classList.add('show');
        return;
    }

    const html = filtered.map(visitor => `
        <div class="returning-visitor-item" onclick="selectReturningVisitor('${escapeHtml(visitor.name)}', '${escapeHtml(visitor.visitorId)}', '${escapeHtml(visitor.jurusan)}')">
            <div class="avatar">${getInitials(visitor.name)}</div>
            <div class="info">
                <div class="name">${escapeHtml(visitor.name)}</div>
                <div class="details">
                    ${visitor.jurusan ? `<span>${escapeHtml(visitor.jurusan)}</span>` : ''}
                    ${visitor.visitorId ? `<span>${escapeHtml(visitor.visitorId)}</span>` : ''}
                </div>
            </div>
            <div class="visit-count">${visitor.visitCount}x kunjungan</div>
        </div>
    `).join('');

    elements.returningVisitorList.innerHTML = html;
    elements.returningVisitorList.classList.add('show');
}

function selectReturningVisitor(name, visitorId, jurusan) {
    selectedReturningVisitor = { name, visitorId, jurusan };

    // Update UI
    elements.selectedVisitorName.textContent = name;
    elements.selectedVisitorJurusan.textContent = jurusan || '';
    elements.selectedVisitorJurusan.style.display = jurusan ? 'inline' : 'none';
    elements.selectedVisitorId.textContent = visitorId || '';
    elements.selectedVisitorId.style.display = visitorId ? 'inline' : 'none';
    elements.selectedVisitorInfo.style.display = 'block';

    // Hide the search dropdown
    elements.returningVisitorList.classList.remove('show');
    elements.returningVisitorSearch.value = '';
}

function clearReturningVisitorSelection() {
    selectedReturningVisitor = null;
    elements.selectedVisitorInfo.style.display = 'none';
    elements.returningVisitorSearch.value = '';
    elements.returningVisitorSearch.focus();
}

function switchVisitorType(type) {
    visitorType = type;

    // Update tab styles
    if (type === 'new') {
        elements.newVisitorTab.classList.add('active');
        elements.returningVisitorTab.classList.remove('active');
        elements.newVisitorFields.style.display = 'block';
        elements.returningVisitorSection.style.display = 'none';
        // Make fields required for new visitor
        elements.visitorName.required = true;
        elements.jurusan.required = true;
    } else {
        elements.newVisitorTab.classList.remove('active');
        elements.returningVisitorTab.classList.add('active');
        elements.newVisitorFields.style.display = 'none';
        elements.returningVisitorSection.style.display = 'block';
        // Remove required from hidden fields (jurusan comes from stored data)
        elements.visitorName.required = false;
        elements.jurusan.required = false;
    }

    // Clear any selections
    clearReturningVisitorSelection();
    elements.checkInForm.reset();
}

// ===== Check-In Functions =====

function handleCheckIn(event) {
    event.preventDefault();

    let name, visitorId, jurusan;
    const purpose = elements.purpose.value;

    // Validate based on visitor type
    if (visitorType === 'new') {
        name = elements.visitorName.value.trim();
        visitorId = elements.visitorId.value.trim();

        if (!name) {
            showToast('Mohon masukkan nama lengkap', 'error');
            elements.visitorName.focus();
            return;
        }
    } else {
        // Returning visitor
        if (!selectedReturningVisitor) {
            showToast('Mohon pilih pengunjung dari daftar', 'error');
            elements.returningVisitorSearch.focus();
            return;
        }
        name = selectedReturningVisitor.name;
        visitorId = selectedReturningVisitor.visitorId;
        jurusan = selectedReturningVisitor.jurusan;
    }

    // Get jurusan from form only for new visitors
    if (visitorType === 'new') {
        const formJurusan = elements.jurusan.value;
        if (!formJurusan) {
            showToast('Mohon pilih jurusan', 'error');
            return;
        }
        jurusan = formJurusan;
    }

    if (!purpose) {
        showToast('Mohon pilih tujuan kunjungan', 'error');
        return;
    }

    // Check if visitor is already checked in (prevent duplicate check-in)
    const isAlreadyActive = visitors.some(v =>
        v.status === 'active' &&
        v.name.toLowerCase() === name.toLowerCase() &&
        v.visitorId.toLowerCase() === visitorId.toLowerCase()
    );

    if (isAlreadyActive) {
        showToast(`${name} sudah check-in dan belum check-out!`, 'error');
        return;
    }

    const visitor = {
        id: generateId(),
        name,
        visitorId,
        jurusan,
        purpose,
        checkIn: new Date().toISOString(),
        checkOut: null,
        status: 'active'
    };

    visitors.push(visitor);
    saveVisitors();

    // Reset form
    elements.checkInForm.reset();

    // Reset returning visitor selection if applicable
    if (visitorType === 'returning') {
        clearReturningVisitorSelection();
    } else {
        elements.visitorName.focus();
    }

    // Update UI
    renderActiveVisitors();
    renderLeaderboards();
    updateStats();

    showToast(`${name} berhasil check-in!`, 'success');
}

// ===== Check-Out Functions =====

function openCheckoutModal(visitorId) {
    currentCheckoutVisitor = visitors.find(v => v.id === visitorId);

    if (!currentCheckoutVisitor) {
        showToast('Pengunjung tidak ditemukan', 'error');
        return;
    }

    elements.checkoutName.textContent = currentCheckoutVisitor.name;
    elements.checkoutPurpose.textContent = currentCheckoutVisitor.purpose;
    elements.checkoutDuration.textContent = `Durasi: ${calculateDuration(currentCheckoutVisitor.checkIn)}`;

    elements.checkOutModal.classList.add('active');
}

function closeCheckoutModal() {
    elements.checkOutModal.classList.remove('active');
    currentCheckoutVisitor = null;
}

function handleCheckout() {
    if (!currentCheckoutVisitor) return;

    const visitorIndex = visitors.findIndex(v => v.id === currentCheckoutVisitor.id);

    if (visitorIndex === -1) {
        showToast('Pengunjung tidak ditemukan', 'error');
        closeCheckoutModal();
        return;
    }

    visitors[visitorIndex].checkOut = new Date().toISOString();
    visitors[visitorIndex].status = 'completed';

    saveVisitors();

    const name = currentCheckoutVisitor.name;
    closeCheckoutModal();

    // Update UI
    renderActiveVisitors();
    renderLeaderboards();
    updateStats();

    showToast(`${name} berhasil check-out!`, 'success');
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

// ===== Duration Update Functions =====

function updateDurations() {
    document.querySelectorAll('.visitor-duration .time[data-checkin]').forEach(el => {
        const checkIn = el.dataset.checkin;
        el.textContent = calculateDuration(checkIn);
    });
}

// ===== Event Listeners =====

function initEventListeners() {
    // Check-in form
    elements.checkInForm.addEventListener('submit', handleCheckIn);

    // Modal controls
    elements.closeModal.addEventListener('click', closeCheckoutModal);
    elements.cancelCheckout.addEventListener('click', closeCheckoutModal);
    elements.confirmCheckout.addEventListener('click', handleCheckout);

    // Close modal on overlay click
    document.querySelector('.modal-overlay').addEventListener('click', closeCheckoutModal);

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.checkOutModal.classList.contains('active')) {
            closeCheckoutModal();
        }
    });

    // Visitor type tabs
    elements.newVisitorTab.addEventListener('click', () => switchVisitorType('new'));
    elements.returningVisitorTab.addEventListener('click', () => switchVisitorType('returning'));

    // Returning visitor search
    elements.returningVisitorSearch.addEventListener('input', (e) => {
        renderReturningVisitorList(e.target.value);
    });

    elements.returningVisitorSearch.addEventListener('focus', () => {
        renderReturningVisitorList(elements.returningVisitorSearch.value);
    });

    // Hide returning visitor list when clicking outside
    document.addEventListener('click', (e) => {
        const isSearchArea = e.target.closest('.returning-visitor-search');
        if (!isSearchArea) {
            elements.returningVisitorList.classList.remove('show');
        }
    });

    // Clear selection button
    elements.clearSelection.addEventListener('click', clearReturningVisitorSelection);
}

// ===== Initialization =====

async function init() {
    // Load data (async - may fetch from JSON on first run)
    await loadVisitors();

    // Sync with JSON database
    await syncFromServer();

    // Initialize event listeners
    initEventListeners();

    // Update clock
    updateClock();
    setInterval(updateClock, 1000);

    // Update durations every minute for performance
    durationUpdateInterval = setInterval(updateDurations, 60000);

    // Initial render
    renderActiveVisitors();
    renderLeaderboards();
    updateStats();

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
window.openCheckoutModal = openCheckoutModal;
window.selectReturningVisitor = selectReturningVisitor;
