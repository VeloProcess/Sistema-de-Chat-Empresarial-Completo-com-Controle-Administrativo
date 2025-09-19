// ==================== VARIÁVEIS GLOBAIS ====================
let currentUser = null;
let currentChannel = 'geral';
let messages = {};
let users = {};
let isAdmin = false;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Carregar dados salvos
    loadFromStorage();
    
    // Verificar se há usuário logado
    if (currentUser) {
        showMainApp();
    } else {
        showLoginModal();
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    // Iniciar sincronização
    startSync();
}

function setupEventListeners() {
    // Login
    document.getElementById('userNameInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });
    
    // Envio de mensagem
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Canais
    document.querySelectorAll('.channel-item').forEach(item => {
        item.addEventListener('click', function() {
            switchChannel(this.dataset.channel);
        });
    });
}

// ==================== FUNÇÕES DE LOGIN ====================
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('userNameInput').focus();
}

function hideLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function login() {
    const userName = document.getElementById('userNameInput').value.trim();
    
    if (!userName) {
        alert('Por favor, digite seu nome!');
        return;
    }
    
    // Verificar se é o primeiro usuário (admin)
    const isFirstUser = Object.keys(users).length === 0;
    
    // Criar usuário
    currentUser = {
        id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: userName,
        role: isFirstUser ? 'admin' : 'user',
        avatar: getAvatarForName(userName),
        lastSeen: Date.now()
    };
    
    // Adicionar aos usuários
    users[currentUser.id] = currentUser;
    
    // Mostrar painel admin se for admin
    if (isFirstUser) {
        isAdmin = true;
        document.getElementById('adminPanel').style.display = 'block';
    }
    
    // Salvar dados
    saveToStorage();
    
    // Atualizar interface
    updateUserInfo();
    updateUsersList();
    
    // Adicionar mensagem de boas-vindas
    addSystemMessage(`${userName} entrou no chat!`);
    
    // Esconder modal e mostrar app
    hideLoginModal();
    showMainApp();
}

function showMainApp() {
    document.getElementById('loginModal').style.display = 'none';
    loadMessages();
    updateUsersList();
}

// ==================== FUNÇÕES DE MENSAGEM ====================
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentUser) return;
    
    const message = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        author: currentUser.name,
        authorId: currentUser.id,
        text: text,
        time: getCurrentTime(),
        timestamp: Date.now(),
        channel: currentChannel
    };
    
    // Adicionar mensagem
    if (!messages[currentChannel]) {
        messages[currentChannel] = [];
    }
    messages[currentChannel].push(message);
    
    // Atualizar interface
    addMessageToUI(message);
    
    // Limpar input
    input.value = '';
    
    // Salvar dados
    saveToStorage();
}

function addMessageToUI(message) {
    const container = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    
    if (message.type === 'system') {
        messageDiv.className = 'system-message';
        messageDiv.textContent = message.text;
    } else {
        const isOwn = message.authorId === currentUser.id;
        messageDiv.className = `message ${isOwn ? 'own' : ''}`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${users[message.authorId]?.avatar || '👤'}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${message.author}</span>
                    <span class="message-time">${message.time}</span>
                </div>
                <div class="message-text">${message.text}</div>
            </div>
        `;
    }
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

function addSystemMessage(text) {
    const message = {
        type: 'system',
        text: text,
        timestamp: Date.now()
    };
    
    if (!messages[currentChannel]) {
        messages[currentChannel] = [];
    }
    messages[currentChannel].push(message);
    
    addMessageToUI(message);
    saveToStorage();
}

function loadMessages() {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    
    if (messages[currentChannel]) {
        messages[currentChannel].forEach(message => {
            addMessageToUI(message);
        });
    }
}

// ==================== FUNÇÕES DE CANAL ====================
function switchChannel(channelId) {
    // Atualizar seleção visual
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-channel="${channelId}"]`).classList.add('active');
    
    // Atualizar canal atual
    currentChannel = channelId;
    document.getElementById('currentChannel').textContent = channelId;
    
    // Carregar mensagens
    loadMessages();
}

// ==================== FUNÇÕES DE USUÁRIO ====================
function updateUserInfo() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userAvatar').textContent = currentUser.avatar;
        document.getElementById('userStatus').textContent = 'online';
    }
}

function updateUsersList() {
    const container = document.getElementById('usersList');
    container.innerHTML = '';
    
    Object.values(users).forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.innerHTML = `
            <div class="user-item-avatar">${user.avatar}</div>
            <div class="user-item-info">
                <div class="user-item-name">${user.name}</div>
                <div class="user-item-status">${user.status || 'online'}</div>
            </div>
        `;
        container.appendChild(userDiv);
    });
}

function showAllUsers() {
    updateUsersList();
    document.getElementById('usersModal').style.display = 'flex';
}

function closeUsersModal() {
    document.getElementById('usersModal').style.display = 'none';
}

// ==================== FUNÇÕES ADMINISTRATIVAS ====================
function clearAllData() {
    if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita!')) {
        // Limpar dados
        messages = {};
        users = {};
        currentUser = null;
        
        // Limpar localStorage
        localStorage.removeItem('velochat_data');
        
        // Recarregar página
        location.reload();
    }
}

// ==================== FUNÇÕES DE SINCRONIZAÇÃO ====================
function startSync() {
    // Sincronizar a cada 2 segundos
    setInterval(syncData, 2000);
    
    // Sincronizar quando a aba ganha foco
    window.addEventListener('focus', syncData);
    
    // Sincronizar quando há mudanças no localStorage
    window.addEventListener('storage', function(e) {
        if (e.key === 'velochat_data') {
            syncData();
        }
    });
}

function syncData() {
    const savedData = localStorage.getItem('velochat_data');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            
            // Sincronizar usuários
            if (data.users) {
                let usersUpdated = false;
                Object.keys(data.users).forEach(userId => {
                    if (!users[userId] || data.users[userId].lastSeen > users[userId].lastSeen) {
                        users[userId] = data.users[userId];
                        usersUpdated = true;
                    }
                });
                
                if (usersUpdated) {
                    updateUsersList();
                }
            }
            
            // Sincronizar mensagens
            if (data.messages) {
                let messagesUpdated = false;
                Object.keys(data.messages).forEach(channelId => {
                    if (!messages[channelId] || data.messages[channelId].length > messages[channelId].length) {
                        messages[channelId] = data.messages[channelId];
                        messagesUpdated = true;
                    }
                });
                
                if (messagesUpdated && data.messages[currentChannel]) {
                    loadMessages();
                }
            }
            
        } catch (error) {
            console.error('Erro ao sincronizar dados:', error);
        }
    }
}

// ==================== FUNÇÕES DE ARMAZENAMENTO ====================
function saveToStorage() {
    const data = {
        messages,
        users,
        currentUser,
        lastSaved: Date.now()
    };
    
    localStorage.setItem('velochat_data', JSON.stringify(data));
}

function loadFromStorage() {
    const savedData = localStorage.getItem('velochat_data');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            messages = data.messages || {};
            users = data.users || {};
            currentUser = data.currentUser || null;
        } catch (error) {
            console.error('Erro ao carregar dados salvos:', error);
        }
    }
}

// ==================== FUNÇÕES UTILITÁRIAS ====================
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function getAvatarForName(name) {
    const avatars = ['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🔧', '👩‍🔧', '👨‍🎨', '👩‍🎨', '👨‍💻', '👩‍💻'];
    const hash = name.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    return avatars[Math.abs(hash) % avatars.length];
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('velochat_theme', newTheme);
}

// Carregar tema salvo
const savedTheme = localStorage.getItem('velochat_theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
}
