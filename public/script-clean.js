// Global variables
let currentUser = null;
let currentChatId = null;
let isNewChat = true;
let selectedImage = null;

// DOM elements
const elements = {
    // Navigation
    navAuth: document.getElementById('nav-auth'),
    navUser: document.getElementById('nav-user'),
    navHome: document.getElementById('nav-home'),
    navChat: document.getElementById('nav-chat'),
    navHistory: document.getElementById('nav-history'),
    navMedicine: document.getElementById('nav-medicine'),
    navFacilities: document.getElementById('nav-facilities'),
    navProfile: document.getElementById('nav-profile'),
    userName: document.getElementById('user-name'),
    
    // Sections
    sections: document.querySelectorAll('.section'),
    
    // Modals
    loginModal: document.getElementById('login-modal'),
    registerModal: document.getElementById('register-modal'),
    loadingOverlay: document.getElementById('loading-overlay'),
    
    // Forms
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    
    // Chat
    chatMessages: document.getElementById('chat-messages'),
    messageInput: document.getElementById('message-input'),
    sendMessage: document.getElementById('send-message'),
    
    // Image upload
    uploadImage: document.getElementById('upload-image'),
    imageInput: document.getElementById('image-input'),
    imagePreview: document.getElementById('image-preview'),
    previewImg: document.getElementById('preview-img'),
    removeImage: document.getElementById('remove-image'),
    dragDropArea: document.getElementById('drag-drop-area'),
    
    // History
    historyList: document.getElementById('history-list'),
    
    // Profile
    profileName: document.getElementById('profile-name'),
    profileEmail: document.getElementById('profile-email'),
    totalChats: document.getElementById('total-chats'),
    memberSince: document.getElementById('member-since'),
    
    // Medicine Search
    medicineSearchInput: document.getElementById('medicine-search-input'),
    medicineSearchBtn: document.getElementById('medicine-search-btn'),
    medicineTypeFilter: document.getElementById('medicine-type-filter'),
    medicineCategoryFilter: document.getElementById('medicine-category-filter'),
    popularKeywordsList: document.getElementById('popular-keywords-list'),
    medicineResults: document.getElementById('medicine-results'),
    
    // Facilities
    locationInput: document.getElementById('location-input'),
    detectLocationBtn: document.getElementById('detect-location-btn'),
    locationStatus: document.getElementById('location-status'),
    facilityTypeFilter: document.getElementById('facility-type-filter'),
    distanceFilter: document.getElementById('distance-filter'),
    facilitiesResults: document.getElementById('facilities-results'),
    
    // Buttons
    loginBtn: document.getElementById('login-btn'),
    registerBtn: document.getElementById('register-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    startConsultation: document.getElementById('start-consultation'),
    learnMore: document.getElementById('learn-more'),
    
    // Modal controls
    loginClose: document.getElementById('login-close'),
    registerClose: document.getElementById('register-close'),
    showRegister: document.getElementById('show-register'),
    showLogin: document.getElementById('show-login')
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkAuthStatus();
});

// Initialize app
function initializeApp() {
    // Load initial data
    loadMedicineData();
    loadFacilitiesData();
    
    // Show home section by default
    showSection('home');
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    elements.navHome.addEventListener('click', () => showSection('home'));
    elements.navChat.addEventListener('click', () => showSection('chat'));
    elements.navHistory.addEventListener('click', () => showSection('history'));
    elements.navMedicine.addEventListener('click', () => showSection('medicine'));
    elements.navFacilities.addEventListener('click', () => showSection('facilities'));
    elements.navProfile.addEventListener('click', () => showSection('profile'));
    
    // Authentication
    elements.loginBtn.addEventListener('click', () => showModal('login'));
    elements.registerBtn.addEventListener('click', () => showModal('register'));
    elements.logoutBtn.addEventListener('click', logout);
    
    // Modal controls
    elements.loginClose.addEventListener('click', () => hideModal('login'));
    elements.registerClose.addEventListener('click', () => hideModal('register'));
    elements.showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        hideModal('login');
        showModal('register');
    });
    elements.showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        hideModal('register');
        showModal('login');
    });
    
    // Forms
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.registerForm.addEventListener('submit', handleRegister);
    
    // Chat
    elements.sendMessage.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Image upload
    elements.uploadImage.addEventListener('click', () => elements.imageInput.click());
    elements.imageInput.addEventListener('change', handleImageSelect);
    elements.removeImage.addEventListener('click', removeSelectedImage);
    
    // Drag and drop
    elements.dragDropArea.addEventListener('dragover', handleDragOver);
    elements.dragDropArea.addEventListener('dragleave', handleDragLeave);
    elements.dragDropArea.addEventListener('drop', handleDrop);
    
    // Medicine search
    elements.medicineSearchBtn.addEventListener('click', searchMedicines);
    elements.medicineSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchMedicines();
        }
    });
    elements.medicineTypeFilter.addEventListener('change', searchMedicines);
    elements.medicineCategoryFilter.addEventListener('change', searchMedicines);
    
    // Facilities
    elements.detectLocationBtn.addEventListener('click', detectUserLocation);
    elements.locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchFacilities();
        }
    });
    elements.facilityTypeFilter.addEventListener('change', searchFacilities);
    elements.distanceFilter.addEventListener('change', searchFacilities);
    
    // Home page buttons
    elements.startConsultation.addEventListener('click', () => showSection('chat'));
    elements.learnMore.addEventListener('click', () => showSection('chat'));
    
    // Auto-resize textarea
    elements.messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            
            updateUIForLoggedInUser();
            hideModal('login');
            showNotification('Login berhasil!', 'success');
            
            // Clear form
            elements.loginForm.reset();
        } else {
            showNotification(data.message || 'Login gagal', 'error');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Terjadi kesalahan saat login', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            
            updateUIForLoggedInUser();
            hideModal('register');
            showNotification('Registrasi berhasil!', 'success');
            
            // Clear form
            elements.registerForm.reset();
        } else {
            showNotification(data.message || 'Registrasi gagal', 'error');
        }
        
    } catch (error) {
        console.error('Register error:', error);
        showNotification('Terjadi kesalahan saat registrasi', 'error');
    } finally {
        showLoading(false);
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    currentChatId = null;
    isNewChat = true;
    
    updateUIForLoggedOutUser();
    showNotification('Logout berhasil', 'success');
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    
    if (token) {
        // Verify token and get user info
        fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                currentUser = data.user;
                updateUIForLoggedInUser();
            } else {
                localStorage.removeItem('token');
                updateUIForLoggedOutUser();
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
            updateUIForLoggedOutUser();
        });
    } else {
        updateUIForLoggedOutUser();
    }
}

function updateUIForLoggedInUser() {
    elements.navAuth.style.display = 'none';
    elements.navUser.style.display = 'flex';
    elements.navChat.style.display = 'block';
    elements.navHistory.style.display = 'block';
    elements.navMedicine.style.display = 'block';
    elements.navFacilities.style.display = 'block';
    elements.navProfile.style.display = 'block';
    
    elements.userName.textContent = currentUser.name;
    elements.profileName.textContent = currentUser.name;
    elements.profileEmail.textContent = currentUser.email;
    
    // Load user data
    loadUserProfile();
    loadChatHistory();
}

function updateUIForLoggedOutUser() {
    elements.navAuth.style.display = 'flex';
    elements.navUser.style.display = 'none';
    elements.navChat.style.display = 'none';
    elements.navHistory.style.display = 'none';
    elements.navMedicine.style.display = 'none';
    elements.navFacilities.style.display = 'none';
    elements.navProfile.style.display = 'none';
    
    // Clear chat
    elements.chatMessages.innerHTML = `
        <div class="message ai-message">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>Halo! Saya adalah konsultan kesehatan otomatis HidupKu. Saya siap membantu Anda dengan konsultasi kesehatan. Silakan ceritakan keluhan atau gejala yang Anda alami saat ini.</p>
            </div>
        </div>
    `;
    
    // Clear history
    elements.historyList.innerHTML = '';
}

// Chat functions
async function sendMessage() {
    const message = elements.messageInput.value.trim();
    const hasImage = selectedImage !== null;
    
    // Check if there's a message or image to send
    if ((!message && !hasImage) || !currentUser) return;
    
    // Store image data before clearing
    const imageToSend = hasImage ? { ...selectedImage } : null;
    
    // Add user message to chat
    addMessageToChat('user', message, hasImage ? selectedImage.dataUrl : null);
    
    // Clear input and image
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    removeSelectedImage();
    
    // Add loading message to chat
    const loadingMessageId = addLoadingMessage();
    
    try {
        let response;
        
        if (hasImage && imageToSend && imageToSend.file) {
            // Validate image data before sending
            if (!imageToSend.file || !imageToSend.file.type.startsWith('image/')) {
                throw new Error('Invalid image data');
            }
            
            // Use FormData for image upload
            const formData = new FormData();
            formData.append('message', message || '');
            formData.append('chatId', currentChatId);
            formData.append('isNewChat', isNewChat);
            formData.append('image', imageToSend.file);
            
            console.log('Sending image:', imageToSend.file.name, imageToSend.file.size, imageToSend.file.type);
            
            response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
        } else {
            // Use JSON for text-only messages
            const requestBody = {
                message: message,
                chatId: currentChatId,
                isNewChat: isNewChat
            };
            
            const token = localStorage.getItem('token');
            
            response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            });
        }
        
        const data = await response.json();
        
        if (response.ok) {
            // Update chat ID
            currentChatId = data.chatId;
            isNewChat = false;
            
            // Remove loading message
            removeLoadingMessage(loadingMessageId);
            
            // Add AI response to chat
            addMessageToChat('ai', data.response);
            
            // Reload chat history to update the list
            loadChatHistory();
        } else {
            throw new Error(data.message || 'Gagal mengirim pesan');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeLoadingMessage(loadingMessageId);
        showNotification('Gagal mengirim pesan. Silakan coba lagi.', 'error');
    }
}

// Image handling functions
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processSelectedImage(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    elements.dragDropArea.classList.add('active');
}

function handleDragLeave(event) {
    event.preventDefault();
    elements.dragDropArea.classList.remove('active');
}

function handleDrop(event) {
    event.preventDefault();
    elements.dragDropArea.classList.remove('active');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processSelectedImage(files[0]);
    }
}

function processSelectedImage(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Hanya file gambar yang diperbolehkan', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Ukuran file terlalu besar. Maksimal 5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        selectedImage = {
            file: file,
            dataUrl: e.target.result
        };
        
        // Show preview
        elements.previewImg.src = e.target.result;
        elements.imagePreview.style.display = 'block';
        
        // Show drag drop area
        elements.dragDropArea.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removeSelectedImage() {
    selectedImage = null;
    elements.imagePreview.style.display = 'none';
    elements.imageInput.value = '';
    elements.dragDropArea.style.display = 'block';
}

// Chat UI functions
function addMessageToChat(role, content, imageData = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = role === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (imageData) {
        const img = document.createElement('img');
        img.src = imageData;
        img.style.maxWidth = '200px';
        img.style.maxHeight = '200px';
        img.style.borderRadius = '8px';
        img.style.marginBottom = '8px';
        contentDiv.appendChild(img);
    }
    
    if (content) {
        const p = document.createElement('p');
        p.textContent = content;
        contentDiv.appendChild(p);
    }
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function addLoadingMessage() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai-message loading-message';
    loadingDiv.id = 'loading-message-' + Date.now();
    
    loadingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    elements.chatMessages.appendChild(loadingDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    
    return loadingDiv.id;
}

function removeLoadingMessage(loadingMessageId) {
    const loadingMessage = document.getElementById(loadingMessageId);
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

// Chat history functions
function startNewChat() {
    currentChatId = null;
    isNewChat = true;
    
    // Clear chat messages
    elements.chatMessages.innerHTML = `
        <div class="message ai-message">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>Halo! Saya adalah konsultan kesehatan otomatis HidupKu. Saya siap membantu Anda dengan konsultasi kesehatan. Silakan ceritakan keluhan atau gejala yang Anda alami saat ini.</p>
            </div>
        </div>
    `;
    
    showSection('chat');
}

async function loadChatHistory() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/chat/history', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const chats = await response.json();
            displayChatHistory(chats);
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

function displayChatHistory(chats) {
    if (!elements.historyList) return;
    
    if (chats.length === 0) {
        elements.historyList.innerHTML = '<p class="no-history">Belum ada riwayat konsultasi</p>';
        return;
    }
    
    const historyHTML = chats.map(chat => {
        const date = new Date(chat.created_at).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="history-item" onclick="loadChat('${chat.id}')">
                <h3>Konsultasi ${date}</h3>
                <p>${chat.first_message || 'Konsultasi kesehatan'}</p>
                <div class="history-meta">
                    <span>${chat.message_count} pesan</span>
                    <span>${date}</span>
                </div>
            </div>
        `;
    }).join('');
    
    elements.historyList.innerHTML = historyHTML;
}

async function loadChat(chatId) {
    try {
        const response = await fetch(`/api/chat/${chatId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            currentChatId = chatId;
            isNewChat = false;
            
            // Clear chat messages
            elements.chatMessages.innerHTML = '';
            
            // Add messages to chat
            data.messages.forEach(message => {
                addMessageToChat(message.role, message.content, message.image_url);
            });
            
            showSection('chat');
        }
    } catch (error) {
        console.error('Error loading chat:', error);
        showNotification('Gagal memuat riwayat chat', 'error');
    }
}

// Profile functions
async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            elements.totalChats.textContent = data.total_chats || 0;
            elements.memberSince.textContent = new Date(data.created_at).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long'
            });
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Navigation functions
function showSection(sectionId) {
    // Hide all sections
    elements.sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
}

function showModal(modalType) {
    const modal = document.getElementById(`${modalType}-modal`);
    if (modal) {
        modal.classList.add('active');
    }
}

function hideModal(modalType) {
    const modal = document.getElementById(`${modalType}-modal`);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Utility functions
function showLoading(show) {
    if (show) {
        elements.loadingOverlay.classList.add('active');
    } else {
        elements.loadingOverlay.classList.remove('active');
    }
}

function clearFormFeedback() {
    // Clear any existing error messages
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    document.querySelectorAll('.success-message').forEach(el => el.remove());
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideNotification(notification);
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        hideNotification(notification);
    });
}

function hideNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Medicine search functions
async function loadMedicineData() {
    try {
        await loadMedicineCategories();
        await loadPopularKeywords();
    } catch (error) {
        console.error('Error loading medicine data:', error);
    }
}

async function loadMedicineCategories() {
    try {
        const response = await fetch('/api/medicines/categories');
        if (response.ok) {
            const categories = await response.json();
            
            const categoryFilter = elements.medicineCategoryFilter;
            if (categoryFilter) {
                categoryFilter.innerHTML = '<option value="">Semua Kategori</option>';
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categoryFilter.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading medicine categories:', error);
    }
}

async function loadPopularKeywords() {
    try {
        const response = await fetch('/api/medicines/popular-keywords');
        if (response.ok) {
            const keywords = await response.json();
            
            const keywordsList = elements.popularKeywordsList;
            if (keywordsList) {
                keywordsList.innerHTML = keywords.map(keyword => 
                    `<span class="keyword-tag" onclick="searchByKeyword('${keyword}')">${keyword}</span>`
                ).join('');
            }
        }
    } catch (error) {
        console.error('Error loading popular keywords:', error);
    }
}

async function searchMedicines() {
    const query = elements.medicineSearchInput.value.trim();
    const type = elements.medicineTypeFilter.value;
    const category = elements.medicineCategoryFilter.value;
    
    if (!query && !type && !category) {
        showNotification('Masukkan kata kunci pencarian atau pilih filter', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (type) params.append('type', type);
        if (category) params.append('category', category);
        
        const response = await fetch(`/api/medicines/search?${params}`);
        
        if (response.ok) {
            const medicines = await response.json();
            displayMedicineResults(medicines, query);
        } else {
            throw new Error('Gagal mencari obat');
        }
        
    } catch (error) {
        console.error('Error searching medicines:', error);
        showNotification('Gagal mencari obat', 'error');
    } finally {
        showLoading(false);
    }
}

function searchByKeyword(keyword) {
    elements.medicineSearchInput.value = keyword;
    searchMedicines();
}

function displayMedicineResults(medicines, query = '') {
    const resultsContainer = elements.medicineResults;
    if (!resultsContainer) return;
    
    if (medicines.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>Tidak ada hasil</h3>
                <p>${query ? `Tidak ditemukan obat untuk "${query}"` : 'Coba kata kunci lain atau ubah filter'}</p>
            </div>
        `;
        return;
    }
    
    const resultsHTML = medicines.map(medicine => `
        <div class="medicine-item">
            <h3>${medicine.name}</h3>
            <div class="medicine-details">
                <div class="medicine-detail">
                    <i class="fas fa-tag"></i>
                    <span>${medicine.type || 'Tidak diketahui'}</span>
                </div>
                <div class="medicine-detail">
                    <i class="fas fa-layer-group"></i>
                    <span>${medicine.category || 'Tidak diketahui'}</span>
                </div>
                <div class="medicine-detail">
                    <i class="fas fa-building"></i>
                    <span>${medicine.manufacturer || 'Tidak diketahui'}</span>
                </div>
            </div>
            <div class="medicine-description">
                ${medicine.description || 'Tidak ada deskripsi tersedia'}
            </div>
        </div>
    `).join('');
    
    resultsContainer.innerHTML = resultsHTML;
}

// Facilities functions
async function loadFacilitiesData() {
    displayFacilitiesWelcome();
}

function displayFacilitiesWelcome() {
    const resultsContainer = elements.facilitiesResults;
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = `
        <div class="facilities-welcome">
            <i class="fas fa-hospital"></i>
            <h3>Cari Fasilitas Kesehatan</h3>
            <p>Masukkan lokasi atau gunakan deteksi lokasi otomatis untuk menemukan fasilitas kesehatan terdekat</p>
        </div>
    `;
}

function updateLocationStatus(type, message) {
    const statusElement = elements.locationStatus;
    if (!statusElement) return;
    
    const icon = statusElement.querySelector('i');
    const text = statusElement.querySelector('span');
    
    if (icon && text) {
        icon.className = `fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}`;
        text.textContent = message;
    }
}

async function detectUserLocation() {
    if (!navigator.geolocation) {
        updateLocationStatus('error', 'Geolokasi tidak didukung di browser ini');
        return;
    }
    
    updateLocationStatus('info', 'Mendeteksi lokasi...');
    
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                enableHighAccuracy: true
            });
        });
        
        const { latitude, longitude } = position.coords;
        
        // Reverse geocoding to get address
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        
        const address = data.display_name || `${latitude}, ${longitude}`;
        elements.locationInput.value = address;
        
        updateLocationStatus('success', 'Lokasi berhasil dideteksi');
        
        // Auto search facilities
        searchFacilities();
        
    } catch (error) {
        console.error('Error detecting location:', error);
        updateLocationStatus('error', 'Gagal mendeteksi lokasi. Silakan masukkan alamat manual');
    }
}

async function searchFacilities() {
    const location = elements.locationInput.value.trim();
    const type = elements.facilityTypeFilter.value;
    const distance = elements.distanceFilter.value;
    
    if (!location) {
        showNotification('Masukkan lokasi untuk mencari fasilitas kesehatan', 'error');
        return;
    }
    
    try {
        displayFacilitiesLoading();
        
        const params = new URLSearchParams({
            location: location,
            distance: distance
        });
        if (type) params.append('type', type);
        
        const response = await fetch(`/api/facilities/search?${params}`);
        
        if (response.ok) {
            const result = await response.json();
            displayFacilitiesResults(result);
        } else {
            throw new Error('Gagal mencari fasilitas kesehatan');
        }
        
    } catch (error) {
        console.error('Error searching facilities:', error);
        displayFacilitiesError('Gagal mencari fasilitas kesehatan');
    }
}

function displayFacilitiesLoading() {
    const resultsContainer = elements.facilitiesResults;
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = `
        <div class="facilities-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <h3>Mencari fasilitas kesehatan...</h3>
        </div>
    `;
}

function displayFacilitiesError(message) {
    const resultsContainer = elements.facilitiesResults;
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = `
        <div class="facilities-error">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Terjadi Kesalahan</h3>
            <p>${message}</p>
        </div>
    `;
}

function displayFacilitiesResults(result) {
    const resultsContainer = elements.facilitiesResults;
    if (!resultsContainer) return;
    
    if (!result.facilities || result.facilities.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-facilities">
                <i class="fas fa-search"></i>
                <h3>Tidak ada fasilitas ditemukan</h3>
                <p>Coba ubah lokasi atau filter pencarian</p>
            </div>
        `;
        return;
    }
    
    const facilitiesHTML = result.facilities.map(facility => `
        <div class="facility-item">
            <h3>${facility.name}</h3>
            <div class="facility-details">
                <div class="facility-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${facility.address}</span>
                </div>
                <div class="facility-detail">
                    <i class="fas fa-phone"></i>
                    <span>${facility.phone || 'Tidak tersedia'}</span>
                </div>
                <div class="facility-detail">
                    <i class="fas fa-tag"></i>
                    <span>${getFacilityTypeText(facility.type)}</span>
                </div>
                ${facility.distance ? `
                <div class="facility-detail">
                    <i class="fas fa-route"></i>
                    <span>${facility.distance} km</span>
                </div>
                ` : ''}
            </div>
            <div class="facility-description">
                ${facility.description || 'Tidak ada deskripsi tersedia'}
            </div>
        </div>
    `).join('');
    
    resultsContainer.innerHTML = facilitiesHTML;
}

function getFacilityTypeClass(type) {
    const typeMap = {
        'hospital': 'type-hospital',
        'clinic': 'type-clinic',
        'pharmacy': 'type-pharmacy',
        'health_center': 'type-health-center'
    };
    return typeMap[type] || 'type-other';
}

function getFacilityTypeText(type) {
    const typeMap = {
        'hospital': 'Rumah Sakit',
        'clinic': 'Klinik',
        'pharmacy': 'Apotek',
        'health_center': 'Puskesmas'
    };
    return typeMap[type] || 'Fasilitas Kesehatan';
} 