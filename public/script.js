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
    // Show home section by default
    showSection('home');
    
    // Load initial data
    loadInitialData();
}

// Load initial data
async function loadInitialData() {
    try {
        // Load medicine categories
        await loadMedicineCategories();
        
        } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

// Load medicine categories
async function loadMedicineCategories() {
    try {
        const response = await fetch('/api/medicines/categories');
        if (response.ok) {
            const categories = await response.json();
            populateCategoryFilter(categories);
            console.log(`Loaded ${categories.length} medicine categories`);
        } else {
            console.error('Failed to load medicine categories:', response.status);
            // Use default categories if API fails
            const defaultCategories = [
                { id: 1, name: 'Analgesik' },
                { id: 2, name: 'Antihistamin' },
                { id: 3, name: 'Obat Batuk & Pilek' },
                { id: 4, name: 'Vitamin & Suplemen' },
                { id: 5, name: 'Obat Lambung' },
                { id: 6, name: 'Obat Pencernaan' },
                { id: 7, name: 'Obat Umum' }
            ];
            populateCategoryFilter(defaultCategories);
            console.log('Using default categories due to API error');
        }
    } catch (error) {
        console.error('Error loading medicine categories:', error);
        // Use default categories if fetch fails
        const defaultCategories = [
            { id: 1, name: 'Analgesik' },
            { id: 2, name: 'Antihistamin' },
            { id: 3, name: 'Obat Batuk & Pilek' },
            { id: 4, name: 'Vitamin & Suplemen' },
            { id: 5, name: 'Obat Lambung' },
            { id: 6, name: 'Obat Pencernaan' },
            { id: 7, name: 'Obat Umum' }
        ];
        populateCategoryFilter(defaultCategories);
        console.log('Using default categories due to network error');
    }
}



// Populate category filter
function populateCategoryFilter(categories) {
    if (!elements.medicineCategoryFilter) return;
    
    const options = categories.map(category => 
        `<option value="${category.id}">${category.name}</option>`
    ).join('');
    
    elements.medicineCategoryFilter.innerHTML = '<option value="">Semua Kategori</option>' + options;
}



// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Navigation
    if (elements.navHome) elements.navHome.addEventListener('click', () => showSection('home'));
    if (elements.navChat) elements.navChat.addEventListener('click', () => showSection('chat'));
    if (elements.navHistory) elements.navHistory.addEventListener('click', () => showSection('history'));
    if (elements.navMedicine) elements.navMedicine.addEventListener('click', () => showSection('medicine'));
    if (elements.navFacilities) elements.navFacilities.addEventListener('click', () => showSection('facilities'));
    if (elements.navProfile) elements.navProfile.addEventListener('click', () => showSection('profile'));
    
    // Authentication
    if (elements.loginBtn) elements.loginBtn.addEventListener('click', () => showModal('login'));
    if (elements.registerBtn) elements.registerBtn.addEventListener('click', () => showModal('register'));
    if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', logout);
    
    // Modal controls
    if (elements.loginClose) elements.loginClose.addEventListener('click', () => hideModal('login'));
    if (elements.registerClose) elements.registerClose.addEventListener('click', () => hideModal('register'));
    if (elements.showRegister) elements.showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        hideModal('login');
        showModal('register');
    });
    if (elements.showLogin) elements.showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        hideModal('register');
        showModal('login');
    });
    
    // Forms
    if (elements.loginForm) elements.loginForm.addEventListener('submit', handleLogin);
    if (elements.registerForm) elements.registerForm.addEventListener('submit', handleRegister);
    
    // Home page buttons
    if (elements.startConsultation) elements.startConsultation.addEventListener('click', () => showSection('chat'));
    if (elements.learnMore) elements.learnMore.addEventListener('click', () => showSection('chat'));
    
    // History buttons
    const clearAllHistoryBtn = document.getElementById('clear-all-history');
    if (clearAllHistoryBtn) {
        clearAllHistoryBtn.addEventListener('click', clearAllHistory);
    }
    
    // Tambahkan di setupEventListeners
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }
    
    // Chat functionality
    console.log('Setting up chat event listeners...');
    if (elements.sendMessage) {
        console.log('Send message button found');
        elements.sendMessage.addEventListener('click', sendMessage);
            } else {
        console.log('Send message button not found');
    }
    if (elements.messageInput) {
        console.log('Message input found');
        elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    } else {
        console.log('Message input not found');
    }
    
    // Medicine search functionality
    console.log('Setting up medicine search event listeners...');
    if (elements.medicineSearchBtn) {
        console.log('Medicine search button found');
        elements.medicineSearchBtn.addEventListener('click', () => {
            console.log('Medicine search button clicked');
            searchMedicines();
        });
    } else {
        console.log('Medicine search button not found');
    }
    
    if (elements.medicineSearchInput) {
        console.log('Medicine search input found');
        elements.medicineSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('Enter pressed in medicine search input');
                searchMedicines();
            }
        });
    } else {
        console.log('Medicine search input not found');
    }
    
    if (elements.medicineTypeFilter) {
        console.log('Medicine type filter found');
        elements.medicineTypeFilter.addEventListener('change', searchMedicines);
    } else {
        console.log('Medicine type filter not found');
    }
    
    if (elements.medicineCategoryFilter) {
        console.log('Medicine category filter found');
        elements.medicineCategoryFilter.addEventListener('change', searchMedicines);
    } else {
        console.log('Medicine category filter not found');
    }
    
    // Facilities functionality
    console.log('Setting up facilities event listeners...');
    if (elements.detectLocationBtn) {
        console.log('Detect location button found');
        elements.detectLocationBtn.addEventListener('click', () => {
            console.log('Detect location button clicked');
            detectUserLocation();
        });
    } else {
        console.log('Detect location button not found');
    }
    
    if (elements.locationInput) {
        console.log('Location input found');
        elements.locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('Enter pressed in location input');
                searchFacilities();
            }
        });
    } else {
        console.log('Location input not found');
    }
    
    if (elements.facilityTypeFilter) {
        console.log('Facility type filter found');
        elements.facilityTypeFilter.addEventListener('change', searchFacilities);
    } else {
        console.log('Facility type filter not found');
    }
    
    if (elements.distanceFilter) {
        console.log('Distance filter found');
        elements.distanceFilter.addEventListener('change', searchFacilities);
    } else {
        console.log('Distance filter not found');
    }
    
    // Image upload functionality
    if (elements.uploadImage) elements.uploadImage.addEventListener('click', () => elements.imageInput.click());
    if (elements.imageInput) elements.imageInput.addEventListener('change', handleImageSelect);
    if (elements.removeImage) elements.removeImage.addEventListener('click', removeSelectedImage);
    
    // Drag and drop functionality
    if (elements.dragDropArea) {
        elements.dragDropArea.addEventListener('dragover', handleDragOver);
        elements.dragDropArea.addEventListener('dragleave', handleDragLeave);
        elements.dragDropArea.addEventListener('drop', handleDrop);
    }
    
    // Auto-resize textarea
    if (elements.messageInput) {
    elements.messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    }
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
    showLoading(true);
    
        const response = await fetch('/api/login', {
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
    
        const response = await fetch('/api/register', {
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
    if (elements.navAuth) elements.navAuth.style.display = 'none';
    if (elements.navUser) elements.navUser.style.display = 'flex';
    if (elements.navChat) elements.navChat.style.display = 'block';
    if (elements.navHistory) elements.navHistory.style.display = 'block';
    if (elements.navMedicine) elements.navMedicine.style.display = 'block';
    if (elements.navFacilities) elements.navFacilities.style.display = 'block';
    if (elements.navProfile) elements.navProfile.style.display = 'block';
    
    if (elements.userName) elements.userName.textContent = currentUser.name;
    if (elements.profileName) elements.profileName.textContent = currentUser.name;
    if (elements.profileEmail) elements.profileEmail.textContent = currentUser.email;
    
    // Load user profile data
    loadUserProfile();
    
    // Load chat history
    loadChatHistory();
}

// Load user profile
async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const profile = await response.json();
            displayUserProfile(profile);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Display user profile
function displayUserProfile(profile) {
    if (elements.profileName) elements.profileName.textContent = profile.name;
    if (elements.profileEmail) elements.profileEmail.textContent = profile.email;
    if (elements.totalChats) elements.totalChats.textContent = profile.total_chats || 0;
    
    if (elements.memberSince) {
        const memberDate = new Date(profile.created_at).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        elements.memberSince.textContent = memberDate;
    }
}

function updateUIForLoggedOutUser() {
    if (elements.navAuth) elements.navAuth.style.display = 'flex';
    if (elements.navUser) elements.navUser.style.display = 'none';
    if (elements.navChat) elements.navChat.style.display = 'none';
    if (elements.navHistory) elements.navHistory.style.display = 'none';
    if (elements.navMedicine) elements.navMedicine.style.display = 'none';
    if (elements.navFacilities) elements.navFacilities.style.display = 'none';
    if (elements.navProfile) elements.navProfile.style.display = 'none';
    
    // Clear chat
    if (elements.chatMessages) {
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
    }
    
    // Clear history
    if (elements.historyList) elements.historyList.innerHTML = '';
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
    if (elements.loadingOverlay) {
    if (show) {
        elements.loadingOverlay.classList.add('active');
    } else {
        elements.loadingOverlay.classList.remove('active');
    }
}
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

// Chat functions
async function sendMessage() {
    const message = elements.messageInput.value.trim();
    const hasImage = selectedImage !== null;
    
    console.log('📤 Sending message:', {
        hasMessage: !!message,
        messageLength: message ? message.length : 0,
        hasImage: hasImage,
        currentChatId: currentChatId,
        isNewChat: isNewChat
    });
    
    // Check if there's a message or image to send
    if ((!message && !hasImage) || !currentUser) {
        console.log('❌ No message or image to send, or user not logged in');
        return;
    }
    
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
            
            console.log('📷 Sending image message:', {
                fileName: imageToSend.file.name,
                fileSize: imageToSend.file.size,
                fileType: imageToSend.file.type
            });
            
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
            
            console.log('📝 Sending text message:', requestBody);
            
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
            console.log('✅ Message sent successfully:', {
                chatId: data.chatId,
                responseLength: data.response ? data.response.length : 0
            });
            
            // Update chat ID
            currentChatId = data.chatId;
            isNewChat = false;
            
            // Remove loading message
            removeLoadingMessage(loadingMessageId);
            
            // Add AI response to chat
            addMessageToChat('ai', data.response);
            
            // Check if AI response contains treatment recommendations
            if (data.response.includes('SARAN PENGOBATAN') || data.response.includes('SARAN PERAWATAN')) {
                console.log('🏥 Adding facilities recommendation');
                // Add facilities recommendation after a short delay
                setTimeout(() => {
                    addFacilitiesRecommendation();
                }, 2000);
                
                // Add medicine recommendation after facilities
                // setTimeout(() => {
                //     addMedicineRecommendation(data.response);
                // }, 4000);
            }
            
            // Reload chat history to update the list
            loadChatHistory();
        } else {
            throw new Error(data.message || 'Gagal mengirim pesan');
        }
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
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
    if (elements.dragDropArea) elements.dragDropArea.classList.add('active');
}

function handleDragLeave(event) {
    event.preventDefault();
    if (elements.dragDropArea) elements.dragDropArea.classList.remove('active');
}

function handleDrop(event) {
    event.preventDefault();
    if (elements.dragDropArea) elements.dragDropArea.classList.remove('active');
    
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
        if (elements.previewImg) elements.previewImg.src = e.target.result;
        if (elements.imagePreview) elements.imagePreview.style.display = 'block';
                
                // Show drag drop area
        if (elements.dragDropArea) elements.dragDropArea.style.display = 'none';
    };
        reader.readAsDataURL(file);
}

function removeSelectedImage() {
    selectedImage = null;
    if (elements.imagePreview) elements.imagePreview.style.display = 'none';
    if (elements.imageInput) elements.imageInput.value = '';
    if (elements.dragDropArea) elements.dragDropArea.style.display = 'block';
}

// Chat UI functions
function addMessageToChat(role, content, imageData = null) {
    if (!elements.chatMessages) {
        console.error('❌ Chat messages container not found');
        return;
    }
    
    console.log(`💬 Adding ${role} message:`, {
        hasContent: !!content,
        contentLength: content ? content.length : 0,
        hasImage: !!imageData
    });
    
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
        console.log('🖼️ Added image to message');
    }
    
    if (content) {
        const p = document.createElement('p');
        if (role === 'ai') {
            // Ganti \n dengan <br> agar format list dan spasi tetap rapi
            p.innerHTML = content.replace(/\n/g, '<br>');
        } else {
            p.textContent = content;
        }
        contentDiv.appendChild(p);
        console.log('📝 Added text content to message');
    }
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    
    console.log(`✅ ${role} message added successfully`);
}

function addLoadingMessage() {
    if (!elements.chatMessages) return null;
    
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
    if (!loadingMessageId) return;
    const loadingMessage = document.getElementById(loadingMessageId);
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

// Chat history functions
function startNewChat() {
    console.log('🆕 Starting new chat');
    
    currentChatId = null;
    isNewChat = true;
    
    // Clear chat messages
    if (elements.chatMessages) {
        elements.chatMessages.innerHTML = `
            <div class="message ai-message">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <p>Halo! Saya adalah konsultan kesehatan otomatis HidupKu. Saya siap membantu Anda dengan konsultasi kesehatan.</p>
                    <p>Silakan ceritakan keluhan atau gejala yang Anda alami saat ini. Anda juga dapat mengirimkan gambar untuk analisis lebih lanjut.</p>
                </div>
            </div>
        `;
        console.log('✅ Chat messages cleared and welcome message added');
    } else {
        console.error('❌ Chat messages container not found');
    }
    
    showSection('chat');
    console.log('✅ New chat started successfully');
}

async function loadChatHistory() {
    if (!currentUser) {
        console.log('❌ No current user, skipping chat history load');
        return;
    }
    
    console.log('📚 Loading chat history for user:', currentUser.id);
    
    try {
        const response = await fetch('/api/chats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const chats = await response.json();
            console.log('📋 Raw chat history:', chats);
            
            // Filter out chats with undefined chat_id
            const validChats = chats.filter(chat => chat && chat.id && chat.id !== 'undefined');
            console.log('✅ Valid chats:', validChats.length, validChats);
            
            displayChatHistory(validChats);
        } else {
            console.error('❌ Failed to load chat history:', response.status);
            showNotification('Gagal memuat riwayat chat', 'error');
        }
    } catch (error) {
        console.error('❌ Error loading chat history:', error);
        showNotification('Gagal memuat riwayat chat', 'error');
    }
}

function displayChatHistory(chats) {
    if (!elements.historyList) {
        console.error('❌ History list container not found');
        return;
    }
    
    console.log('🎨 Displaying chat history:', chats.length, 'chats');
    
    // Show/hide clear all button
    const clearAllBtn = document.getElementById('clear-all-history');
    if (clearAllBtn) {
        clearAllBtn.style.display = chats.length > 0 ? 'inline-flex' : 'none';
    }
    
    if (chats.length === 0) {
        console.log('📭 No chat history to display');
        elements.historyList.innerHTML = `
            <div class="no-history">
                <i class="fas fa-history"></i>
                <h3>Belum ada riwayat konsultasi</h3>
                <p>Mulai konsultasi baru untuk melihat riwayat di sini</p>
            </div>
        `;
        return;
    }
    
    const historyHTML = chats.map((chat, index) => {
        // Validate chat data
        if (!chat || !chat.id || chat.id === 'undefined') {
            console.warn('⚠️ Invalid chat data:', chat);
            return '';
        }
        
        const date = new Date(chat.created_at || chat.lastUpdated || Date.now()).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Format conversation preview
        let conversationPreview = chat.first_message || chat.title || 'Konsultasi kesehatan';
        if (conversationPreview.length > 100) {
            conversationPreview = conversationPreview.substring(0, 100) + '...';
        }
        
        console.log(`📝 Chat ${index + 1}:`, {
            id: chat.id,
            title: chat.title,
            messageCount: chat.messageCount,
            preview: conversationPreview.substring(0, 50) + '...'
        });
        
        return `
            <div class="history-item">
                <div class="history-content" onclick="loadChat('${chat.id}')">
                    <div class="history-info">
                        <h3>Konsultasi ${date}</h3>
                        <p class="conversation-preview">${conversationPreview}</p>
                        <div class="history-meta">
                            <span><i class="fas fa-comments"></i> ${chat.messageCount || 0} pesan</span>
                            <span><i class="fas fa-clock"></i> ${date}</span>
                        </div>
                    </div>
                    <div class="history-actions">
                        <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); loadChat('${chat.id}')">
                            <i class="fas fa-eye"></i>
                            Lihat
                        </button>
                        <button class="btn btn-small btn-danger" onclick="event.stopPropagation(); deleteChat('${chat.id}')">
                            <i class="fas fa-trash"></i>
                            Hapus
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).filter(html => html !== '').join('');
        
    elements.historyList.innerHTML = historyHTML;
    console.log('✅ Chat history displayed successfully');
}

async function loadChat(chatId) {
    // Validate chatId
    if (!chatId || chatId === 'undefined') {
        console.error('Invalid chatId:', chatId);
        showNotification('ID chat tidak valid', 'error');
        return;
    }
    
    try {
        console.log('🔄 Loading chat:', chatId);
        
        const response = await fetch(`/api/chats/${chatId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            console.log('📋 Chat data loaded:', {
                chatId: data.chatId,
                title: data.title,
                messageCount: data.messages.length,
                messages: data.messages
            });
            
            currentChatId = chatId;
            isNewChat = false;
            
            // Clear chat messages
            if (elements.chatMessages) elements.chatMessages.innerHTML = '';
            
            // Add messages to chat
            if (data.messages && data.messages.length > 0) {
                data.messages.forEach((message, index) => {
                    console.log(`📝 Adding message ${index + 1}:`, {
                        role: message.role,
                        contentLength: message.content ? message.content.length : 0,
                        hasImage: !!message.image_url
                    });
                    addMessageToChat(message.role, message.content, message.image_url);
                });
            } else {
                console.log('⚠️ No messages found in chat');
            }
            
            showSection('chat');
            console.log('✅ Chat loaded successfully');
        } else {
            throw new Error('Gagal memuat chat');
        }
    } catch (error) {
        console.error('❌ Error loading chat:', error);
        showNotification('Gagal memuat riwayat chat', 'error');
    }
}

// Function to delete a specific chat
async function deleteChat(chatId) {
    // Validate chatId
    if (!chatId || chatId === 'undefined') {
        console.error('Invalid chatId:', chatId);
        showNotification('ID chat tidak valid', 'error');
        return;
    }
    
    if (!confirm('Apakah Anda yakin ingin menghapus riwayat konsultasi ini?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/chats/${chatId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showNotification('Riwayat konsultasi berhasil dihapus', 'success');
            loadChatHistory(); // Reload the history list
        } else {
            throw new Error('Gagal menghapus riwayat');
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
        showNotification('Gagal menghapus riwayat konsultasi', 'error');
    }
}

// Function to clear all chat history
async function clearAllHistory() {
    if (!confirm('Apakah Anda yakin ingin menghapus semua riwayat konsultasi? Tindakan ini tidak dapat dibatalkan.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/chats/clear-all', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showNotification('Semua riwayat konsultasi berhasil dihapus', 'success');
            loadChatHistory(); // Reload the history list
        } else {
            throw new Error('Gagal menghapus semua riwayat');
        }
    } catch (error) {
        console.error('Error clearing all history:', error);
        showNotification('Gagal menghapus semua riwayat konsultasi', 'error');
    }
}

// Medicine search functions
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
    if (elements.medicineSearchInput) elements.medicineSearchInput.value = keyword;
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
    
    // Filter obat keras dan ambil hanya 10 obat pertama untuk rekomendasi
    const filteredMedicines = medicines.filter(medicine => 
        medicine.type !== 'keras' && medicine.type !== 'Keras'
    );
    const recommendedMedicines = filteredMedicines.slice(0, 10);
    
    const resultsHTML = recommendedMedicines.map((medicine, index) => {
        // Bersihkan nama obat dari tanda-tanda yang tidak perlu
        const cleanName = medicine.name
            .replace(/[^\w\s]/g, '') // Hapus semua tanda baca
            .replace(/\s+/g, ' ') // Ganti multiple spaces dengan single space
            .trim();
        
        // Buat query untuk pencarian di e-commerce
        const searchQuery = encodeURIComponent(cleanName);
        
        // Potong deskripsi untuk preview (maksimal 150 karakter)
        const description = medicine.description || 'Tidak ada deskripsi tersedia';
        const shortDescription = description.length > 150 
            ? description.substring(0, 150) + '...' 
            : description;
        const hasMoreDescription = description.length > 150;
        
        return `
            <div class="medicine-item">
                <h3>${cleanName}</h3>
                <div class="medicine-details">
                    <div class="medicine-detail">
                        <i class="fas fa-tag"></i>
                        <span>${medicine.type || 'Tidak diketahui'}</span>
                </div>
            </div>
                <div class="medicine-description">
                    <p class="description-preview">${shortDescription}</p>
                    ${hasMoreDescription ? `
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                            <a class="detail-btn" href="https://www.mandjur.co.id/collections/obat-bebas-otc/products/${cleanName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')}" target="_blank" rel="noopener">
                                <i class="fas fa-info-circle"></i>
                                Detail Mandjur
                            </a>
                            <a class="detail-btn" href="#" onclick="openNearbyPharmacyMap(event)">
                                <i class="fas fa-map-marker-alt"></i>
                                Cari Apotek Terdekat
                            </a>
                        </div>
                    ` : ''}
                </div>
                <div class="medicine-note">
                    <i class="fas fa-info-circle"></i>
                    <span>Informasi obat untuk referensi. Konsultasikan dengan dokter atau apoteker sebelum menggunakan.</span>
                </div>
            </div>
        `;
    }).join('');
    
    resultsContainer.innerHTML = `
        <div class="results-header">
            <h3>10 Obat yang Direkomendasikan</h3>
            <p>${query ? `Untuk pencarian: "${query}"` : 'Berdasarkan kategori yang dipilih'}</p>
            <small>*Obat keras tidak ditampilkan dalam rekomendasi</small>
        </div>
        <div class="medicine-grid">
            ${resultsHTML}
        </div>
    `;
    
    // Add facilities recommendation for pharmacies
    addPharmacyRecommendation();
}

// Tambahkan fungsi di bawah ini di luar map()
function openNearbyPharmacyMap(event) {
    event.preventDefault();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const url = `https://www.google.com/maps/search/apotek/@${lat},${lng},15z`;
            window.open(url, '_blank');
        }, function() {
            window.open('https://www.google.com/maps/search/apotek/', '_blank');
        });
    } else {
        window.open('https://www.google.com/maps/search/apotek/', '_blank');
    }
}

// Facilities functions
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
        if (elements.locationInput) elements.locationInput.value = address;

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
            address: location,
            distance: distance
        });
        if (type) params.append('type', type);
        
        console.log('Searching facilities with params:', {
            address: location,
            distance: distance,
            type: type
        });
        
        // Use OpenStreetMap Cache API (SUPER FAST) instead of Google Places API
        const response = await fetch(`/api/facilities/search-osm-cache?${params}`);

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

    // Ambil koordinat user dari result
    const userLat = result.userLocation?.lat;
    const userLng = result.userLocation?.lng;
    
    const facilitiesHTML = result.facilities.map(facility => {
        // Buat URL untuk Google Maps dengan informasi lengkap
        const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(facility.name + ' ' + facility.address)}`;
        

        
        return `
            <div class="facility-item">
                <h3>${facility.name}</h3>
                <div class="facility-details">
                    <div class="facility-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${facility.address}</span>
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
                    ${facility.rating ? `
                    <div class="facility-detail">
                            <i class="fas fa-star"></i>
                        <span>${facility.rating}/5 (${facility.user_ratings_total || 0} ulasan)</span>
                    </div>
                    ` : ''}
                    ${facility.open_now !== null ? `
                    <div class="facility-detail">
                            <i class="fas fa-clock"></i>
                        <span class="${facility.open_now ? 'status-open' : 'status-closed'}">
                            ${facility.open_now ? 'Sedang Buka' : 'Sedang Tutup'}
                        </span>
                    </div>
                    ` : ''}
                </div>

                <div class="facility-actions">
                    <a href="${googleMapsUrl}" target="_blank" class="facility-action-btn google-maps-btn">
                        <i class="fab fa-google"></i>
                        <span>Lihat di Google Maps</span>
                    </a>
        </div>
            </div>
        `;
    }).join('');
    
    resultsContainer.innerHTML = facilitiesHTML;
}

function showMedicineDetail(index, name, description, type) {
    // Buat modal untuk detail obat
    const modalHTML = `
        <div class="modal" id="medicine-detail-modal">
            <div class="modal-content medicine-detail-modal">
                <div class="modal-header">
                    <h3>Detail Obat</h3>
                    <button class="modal-close" onclick="closeMedicineDetail()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="medicine-detail-content">
                        <h4>${name}</h4>
                        <div class="detail-info">
                            <div class="detail-item">
                                <i class="fas fa-tag"></i>
                                <span><strong>Jenis:</strong> ${type}</span>
                            </div>
                        </div>
                        <div class="detail-description">
                            <h5>Deskripsi Lengkap:</h5>
                            <div class="description-content">
                                ${description.split('\n').map(paragraph => 
                                    paragraph.trim() ? `<p>${paragraph}</p>` : ''
                                ).join('')}
                            </div>
                        </div>
                        <div class="detail-note">
                            <i class="fas fa-info-circle"></i>
                            <span>Informasi ini hanya untuk referensi. Konsultasikan dengan dokter atau apoteker sebelum menggunakan obat.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Hapus modal yang sudah ada jika ada
    const existingModal = document.getElementById('medicine-detail-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Tambahkan modal baru ke body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Tampilkan modal
    const modal = document.getElementById('medicine-detail-modal');
    modal.classList.add('active');
    
    // Event listener untuk menutup modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeMedicineDetail();
        }
    });
}

function closeMedicineDetail() {
    const modal = document.getElementById('medicine-detail-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
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

// Function to add facilities recommendation to chat
async function addFacilitiesRecommendation() {
    try {
        // Get user location if available
        let userLocation = null;
        
        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 5000,
                        enableHighAccuracy: true
                    });
                });
                
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
            } catch (error) {
                console.log('Could not get user location');
            }
        }
        
        // Add recommendation message
        const recommendationDiv = document.createElement('div');
        recommendationDiv.className = 'message ai-message facilities-recommendation';
        recommendationDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="facilities-recommendation-header">
                    <h4>🏥 Rekomendasi Fasilitas Kesehatan Terdekat</h4>
                    <p>Berdasarkan diagnosis yang telah diberikan, berikut adalah fasilitas kesehatan terdekat yang dapat Anda kunjungi:</p>
                </div>
                <div class="facilities-recommendation-content">
                    <div class="facilities-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Mencari fasilitas kesehatan terdekat...</span>
                    </div>
                </div>
            </div>
        `;
        
        if (elements.chatMessages) {
            elements.chatMessages.appendChild(recommendationDiv);
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        }
        
        // Search for facilities
        const params = new URLSearchParams({
            distance: '10'
        });
        
        if (userLocation) {
            params.append('lat', userLocation.lat);
            params.append('lng', userLocation.lng);
        } else {
            // Use default location (Jakarta)
            params.append('address', 'Jakarta, Indonesia');
        }
        
        const response = await fetch(`/api/facilities/search-osm-cache?${params}`);
        
        if (response.ok) {
            const result = await response.json();
            updateFacilitiesRecommendation(result.facilities || []);
        } else {
            updateFacilitiesRecommendation([]);
        }
        
    } catch (error) {
        console.error('Error adding facilities recommendation:', error);
        updateFacilitiesRecommendation([]);
    }
}

// Function to update facilities recommendation
function updateFacilitiesRecommendation(facilities) {
    const recommendationContent = document.querySelector('.facilities-recommendation-content');
    if (!recommendationContent) return;
    
    if (facilities.length === 0) {
        recommendationContent.innerHTML = `
            <div class="facilities-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Tidak dapat menemukan fasilitas kesehatan terdekat. Silakan coba lagi nanti.</p>
            </div>
        `;
        return;
    }
    
    // Take first 5 facilities
    const topFacilities = facilities.slice(0, 5);
    
    const facilitiesHTML = topFacilities.map(facility => {
        const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(facility.name + ' ' + facility.address)}`;
        
        return `
            <div class="facility-recommendation-item">
                <div class="facility-info">
                    <h5>${facility.name}</h5>
                    <p class="facility-address">
                        <i class="fas fa-map-marker-alt"></i>
                        ${facility.address}
                    </p>
                    <p class="facility-type">
                        <i class="fas fa-tag"></i>
                        ${getFacilityTypeText(facility.type)}
                    </p>
                    ${facility.distance ? `
                        <p class="facility-distance">
                            <i class="fas fa-route"></i>
                            ${facility.distance} km
                        </p>
                    ` : ''}
                </div>
                <div class="facility-action">
                    <a href="${googleMapsUrl}" target="_blank" class="btn btn-small">
                        <i class="fas fa-map"></i>
                        Lihat di Maps
                    </a>
                </div>
            </div>
        `;
    }).join('');
    
    recommendationContent.innerHTML = `
        <div class="facilities-list">
            ${facilitiesHTML}
        </div>
        <div class="facilities-note">
            <i class="fas fa-info-circle"></i>
            <span>Fasilitas kesehatan terdekat berdasarkan lokasi Anda. Klik "Lihat di Maps" untuk melihat rute.</span>
        </div>
    `;
}

// Function to add pharmacy recommendation after medicine search
async function addPharmacyRecommendation() {
    try {
        // Get user location if available
        let userLocation = null;
        
        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 5000,
                        enableHighAccuracy: true
                    });
                });
                
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
            } catch (error) {
                console.log('Could not get user location');
            }
        }
        
        // Search for pharmacies
        const params = new URLSearchParams({
            distance: '10',
            type: 'pharmacy'
        });
        
        if (userLocation) {
            params.append('lat', userLocation.lat);
            params.append('lng', userLocation.lng);
        } else {
            // Use default location (Jakarta)
            params.append('address', 'Jakarta, Indonesia');
        }
        
        // Use OpenStreetMap Cache API (SUPER FAST) instead of Google Places API
        const response = await fetch(`/api/facilities/search-osm-cache?${params}`);
        
        if (response.ok) {
            const result = await response.json();
            updatePharmacyRecommendation(result.facilities || []);
        } else {
            updatePharmacyRecommendation([]);
        }
        
    } catch (error) {
        console.error('Error adding pharmacy recommendation:', error);
        updatePharmacyRecommendation([]);
    }
}

// Function to update pharmacy recommendation
function updatePharmacyRecommendation(pharmacies) {
    const recommendationContent = document.querySelector('.facilities-recommendation-content');
    if (!recommendationContent) return;
    
    if (pharmacies.length === 0) {
        recommendationContent.innerHTML = `
            <div class="facilities-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Tidak dapat menemukan apotek terdekat. Silakan coba lagi nanti.</p>
            </div>
        `;
        return;
    }
    
    // Take first 5 pharmacies
    const topPharmacies = pharmacies.slice(0, 5);
    
    const pharmaciesHTML = topPharmacies.map(pharmacy => {
        const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(pharmacy.name + ' ' + pharmacy.address)}`;
        
        return `
            <div class="facility-recommendation-item">
                <div class="facility-info">
                    <h5>${pharmacy.name}</h5>
                    <p class="facility-address">
                        <i class="fas fa-map-marker-alt"></i>
                        ${pharmacy.address}
                    </p>
                    <p class="facility-type">
                        <i class="fas fa-tag"></i>
                        Apotek
                    </p>
                    ${pharmacy.distance ? `
                        <p class="facility-distance">
                            <i class="fas fa-route"></i>
                            ${pharmacy.distance} km
                        </p>
                    ` : ''}
                </div>
                <div class="facility-action">
                    <a href="${googleMapsUrl}" target="_blank" class="btn btn-small">
                        <i class="fas fa-map"></i>
                        Lihat di Maps
                    </a>
                </div>
            </div>
        `;
    }).join('');
    
    recommendationContent.innerHTML = `
        <div class="facilities-list">
            ${pharmaciesHTML}
        </div>
        <div class="facilities-note">
            <i class="fas fa-info-circle"></i>
            <span>Apotek terdekat berdasarkan lokasi Anda. Konsultasikan dengan apoteker sebelum membeli obat.</span>
        </div>
    `;
}


