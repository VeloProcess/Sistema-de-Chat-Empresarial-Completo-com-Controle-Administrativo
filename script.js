// Estado da aplicação
let currentUser = {
    name: 'Usuário',
    id: 'user_' + Date.now(),
    status: 'online',
    role: 'user', // user, admin, owner
    avatar: '👤'
};

let currentChannel = 'geral';
let isAdminMode = false;

// Sistema de mensagens com histórico persistente
let messages = {
    geral: [],
    
    vendas: [],
    suporte: [],
    desenvolvimento: []
};

// Sistema de usuários - Iniciar vazio para registro
let users = {};

// Conversas particulares (DMs)
let directMessages = {};

// Histórico de todas as conversas para administração
let conversationHistory = [];

let channels = [
    { id: 'geral', name: 'Geral', description: 'Canal geral da empresa', unread: 0 },
    { id: 'vendas', name: 'Vendas', description: 'Discussões de vendas', unread: 0 },
    { id: 'suporte', name: 'Suporte', description: 'Atendimento ao cliente', unread: 0 },
    { id: 'desenvolvimento', name: 'Desenvolvimento', description: 'Discussões técnicas', unread: 0 }
];

// Elementos DOM
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const channelList = document.getElementById('channelList');
const currentChannelSpan = document.getElementById('currentChannel');
const userNameSpan = document.getElementById('userName');
const newChatBtn = document.getElementById('newChatBtn');
const newChatModal = document.getElementById('newChatModal');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const createBtn = document.getElementById('createBtn');
const searchInput = document.getElementById('searchInput');
const themeToggle = document.getElementById('themeToggle');
const dmList = document.getElementById('dmList');
const adminSection = document.getElementById('adminSection');

// Modais administrativos
const allConversationsModal = document.getElementById('allConversationsModal');
const manageUsersModal = document.getElementById('manageUsersModal');
const viewConversationModal = document.getElementById('viewConversationModal');
const conversationsList = document.getElementById('conversationsList');
const usersList = document.getElementById('usersList');
const conversationMessages = document.getElementById('conversationMessages');
const conversationTitle = document.getElementById('conversationTitle');

// Função auxiliar para obter hora atual
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadMessages();
    updateChannelList();
});

function initializeApp() {
    // Definir nome do usuário
    const savedName = localStorage.getItem('velochat_username');
    const savedRole = localStorage.getItem('velochat_userrole');
    
    if (savedName) {
        currentUser.name = savedName;
        userNameSpan.textContent = savedName;
    } else {
        const name = prompt('Digite seu nome:');
        if (name) {
            currentUser.name = name;
            userNameSpan.textContent = name;
            localStorage.setItem('velochat_username', name);
        }
    }

    // Definir role do usuário
    if (savedRole) {
        currentUser.role = savedRole;
    } else {
        // Verificar se é o primeiro usuário (proprietário)
        const isFirstUser = Object.keys(users).length === 0;
        currentUser.role = isFirstUser ? 'owner' : 'user';
        localStorage.setItem('velochat_userrole', currentUser.role);
    }

    // Carregar dados salvos primeiro
    loadFromStorage();
    
    // Registrar usuário atual no sistema
    registerCurrentUser();

    // Mostrar seção administrativa se for owner/admin
    if (currentUser.role === 'owner' || currentUser.role === 'admin') {
        adminSection.style.display = 'block';
    }

    // Inicializar tema
    initializeTheme();
    
    // Atualizar DMs
    updateDMList();
}

function setupEventListeners() {
    // Envio de mensagem
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Troca de canais
    channelList.addEventListener('click', function(e) {
        const channelItem = e.target.closest('.channel-item');
        if (channelItem) {
            const channelId = channelItem.dataset.channel;
            switchChannel(channelId);
        }
    });

    // Modal de novo chat
    newChatBtn.addEventListener('click', openNewChatModal);
    closeModal.addEventListener('click', closeNewChatModal);
    cancelBtn.addEventListener('click', closeNewChatModal);
    createBtn.addEventListener('click', createNewChat);

    // Fechar modal clicando fora
    newChatModal.addEventListener('click', function(e) {
        if (e.target === newChatModal) {
            closeNewChatModal();
        }
    });

    // Busca
    searchInput.addEventListener('input', function(e) {
        searchConversations(e.target.value);
    });

    // Toggle de tema
    themeToggle.addEventListener('click', toggleTheme);

    // Event listeners administrativos
    setupAdminEventListeners();

    // Remover simulação automática de mensagens para sistema limpo
    // setInterval(simulateIncomingMessage, 30000); // Desabilitado
}

function setupAdminEventListeners() {
    // Botões administrativos
    document.getElementById('viewAllConversations').addEventListener('click', showAllConversations);
    document.getElementById('exportData').addEventListener('click', exportData);
    document.getElementById('importData').addEventListener('click', importData);
    document.getElementById('manageUsers').addEventListener('click', showManageUsers);
    document.getElementById('clearCache').addEventListener('click', clearCacheAndRestart);

    // Modais administrativos
    document.getElementById('closeAllConversationsModal').addEventListener('click', () => {
        allConversationsModal.classList.remove('show');
    });
    document.getElementById('closeManageUsersModal').addEventListener('click', () => {
        manageUsersModal.classList.remove('show');
    });
    document.getElementById('closeViewConversationModal').addEventListener('click', () => {
        viewConversationModal.classList.remove('show');
    });

    // Filtros de conversa
    document.getElementById('conversationSearch').addEventListener('input', filterConversations);
    document.getElementById('conversationFilter').addEventListener('change', filterConversations);

    // Fechar modais clicando fora
    allConversationsModal.addEventListener('click', (e) => {
        if (e.target === allConversationsModal) {
            allConversationsModal.classList.remove('show');
        }
    });
    manageUsersModal.addEventListener('click', (e) => {
        if (e.target === manageUsersModal) {
            manageUsersModal.classList.remove('show');
        }
    });
    viewConversationModal.addEventListener('click', (e) => {
        if (e.target === viewConversationModal) {
            viewConversationModal.classList.remove('show');
        }
    });
}

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    const message = {
        id: 'msg_' + Date.now(),
        author: currentUser.name,
        authorId: currentUser.id,
        text: text,
        time: getCurrentTime(),
        timestamp: Date.now(),
        type: 'message',
        channel: currentChannel
    };

    // Adicionar mensagem ao estado
    if (currentChannel.startsWith('dm_')) {
        if (!directMessages[currentChannel]) {
            directMessages[currentChannel] = [];
        }
        directMessages[currentChannel].push(message);
    } else {
        if (!messages[currentChannel]) {
            messages[currentChannel] = [];
        }
        messages[currentChannel].push(message);
    }

    // Adicionar ao histórico de conversas
    addToConversationHistory(message);

    // Adicionar mensagem à interface
    addMessageToUI(message, true);

    // Limpar input
    messageInput.value = '';

    // Salvar dados
    saveMessages();

    // Resposta automática desabilitada para sistema limpo
    // if (Math.random() < 0.3) {
    //     setTimeout(() => {
    //         simulateResponse();
    //     }, 2000);
    // }
}

function addMessageToUI(message, isOwn = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : ''}`;
    
    // Obter avatar do usuário
    const user = users[message.authorId];
    const avatar = user ? user.avatar : '👤';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${message.author}</span>
                <span class="message-time">${message.time}</span>
            </div>
            <div class="message-text">${escapeHtml(message.text)}</div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Animação de entrada
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(20px)';
    setTimeout(() => {
        messageDiv.style.transition = 'all 0.3s ease';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    }, 10);
}

function switchChannel(channelId) {
    // Atualizar canal ativo
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Se for um canal normal, marcar como ativo
    if (!channelId.startsWith('dm_')) {
        const channelElement = document.querySelector(`[data-channel="${channelId}"]`);
        if (channelElement) {
            channelElement.classList.add('active');
        }
    }

    // Atualizar estado
    currentChannel = channelId;
    
    // Atualizar título do canal
    if (channelId.startsWith('dm_')) {
        const userIds = channelId.replace('dm_', '').split('_');
        const otherUserId = userIds.find(id => id !== currentUser.id);
        const user = users[otherUserId];
        currentChannelSpan.textContent = `@${user ? user.name : 'Usuário'}`;
    } else {
        currentChannelSpan.textContent = channels.find(c => c.id === channelId)?.name || 'Canal';
    }

    // Carregar mensagens do canal
    loadMessages();

    // Limpar contador de não lidas se for canal normal
    if (!channelId.startsWith('dm_')) {
        const channel = channels.find(c => c.id === channelId);
        if (channel) {
            channel.unread = 0;
            updateChannelList();
        }
    }
}

function loadMessages() {
    messagesContainer.innerHTML = '';
    
    let channelMessages = [];
    
    // Verificar se é um canal ou DM
    if (currentChannel.startsWith('dm_')) {
        channelMessages = directMessages[currentChannel] || [];
    } else {
        channelMessages = messages[currentChannel] || [];
    }
    
    // Se não há mensagens, mostrar mensagem de boas-vindas
    if (channelMessages.length === 0) {
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'welcome-message';
        welcomeMessage.innerHTML = `
            <div class="welcome-content">
                <div class="welcome-icon">💬</div>
                <h3>Bem-vindo ao VeloChat!</h3>
                <p>Este canal está vazio. Seja o primeiro a enviar uma mensagem!</p>
                <div class="welcome-tip">
                    <i class="fas fa-lightbulb"></i>
                    <span>Dica: Use @ para mencionar usuários em mensagens diretas</span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(welcomeMessage);
        return;
    }
    
    channelMessages.forEach(message => {
        const isOwn = message.authorId === currentUser.id;
        addMessageToUI(message, isOwn);
    });
}

function updateChannelList() {
    channelList.innerHTML = '';
    
    channels.forEach(channel => {
        const channelItem = document.createElement('div');
        channelItem.className = `channel-item ${channel.id === currentChannel ? 'active' : ''}`;
        channelItem.dataset.channel = channel.id;
        channelItem.innerHTML = `
            <i class="fas fa-hashtag"></i>
            <span>${channel.name}</span>
            ${channel.unread > 0 ? `<span class="unread-count">${channel.unread}</span>` : ''}
        `;
        channelList.appendChild(channelItem);
    });
}

function openNewChatModal() {
    newChatModal.classList.add('show');
    document.getElementById('chatName').focus();
}

function closeNewChatModal() {
    newChatModal.classList.remove('show');
    // Limpar formulário
    document.getElementById('chatType').value = 'channel';
    document.getElementById('chatName').value = '';
    document.getElementById('chatDescription').value = '';
}

function createNewChat() {
    const type = document.getElementById('chatType').value;
    const name = document.getElementById('chatName').value.trim();
    const description = document.getElementById('chatDescription').value.trim();

    if (!name) {
        alert('Por favor, digite um nome para a conversa.');
        return;
    }

    const newChannel = {
        id: type + '_' + Date.now(),
        name: name,
        description: description || '',
        unread: 0
    };

    channels.push(newChannel);
    messages[newChannel.id] = [];

    updateChannelList();
    closeNewChatModal();

    // Trocar para o novo canal
    switchChannel(newChannel.id);
}

function searchConversations(query) {
    const searchTerm = query.toLowerCase();
    
    // Filtrar canais
    channels.forEach(channel => {
        const channelElement = document.querySelector(`[data-channel="${channel.id}"]`);
        if (channelElement) {
            const channelName = channel.name.toLowerCase();
            const channelDesc = channel.description.toLowerCase();
            const isVisible = channelName.includes(searchTerm) || channelDesc.includes(searchTerm);
            channelElement.style.display = isVisible ? 'flex' : 'none';
        }
    });
}

function simulateIncomingMessage() {
    // Função desabilitada para sistema limpo
    // As mensagens serão criadas apenas pelos usuários reais
    return;
}

function simulateResponse() {
    // Função desabilitada para sistema limpo
    // As respostas serão criadas apenas pelos usuários reais
    return;
}

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(channelName, author, message) {
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            new Notification(`VeloChat - ${channelName}`, {
                body: `${author}: ${message}`,
                icon: '/favicon.ico'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(`VeloChat - ${channelName}`, {
                        body: `${author}: ${message}`,
                        icon: '/favicon.ico'
                    });
                }
            });
        }
    }
}

// Solicitar permissão para notificações
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Salvar mensagens no localStorage
function saveMessages() {
    const data = {
        messages,
        directMessages,
        users,
        channels,
        conversationHistory,
        lastSaved: Date.now(),
        currentUser: {
            id: currentUser.id,
            name: currentUser.name,
            status: 'online',
            lastSeen: Date.now()
        }
    };
    
    localStorage.setItem('velochat_data', JSON.stringify(data));
}

// Carregar mensagens do localStorage
function loadFromStorage() {
    const savedData = localStorage.getItem('velochat_data');
    
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            
            // Carregar dados salvos, mantendo defaults se não existirem
            messages = { ...messages, ...(data.messages || {}) };
            directMessages = data.directMessages || {};
            users = { ...users, ...(data.users || {}) }; // Mesclar usuários existentes com salvos
            channels = data.channels || channels;
            conversationHistory = data.conversationHistory || [];
            
            // Atualizar interface
            updateChannelList();
            updateDMList();
        } catch (error) {
            console.error('Erro ao carregar dados salvos:', error);
        }
    }
}

// Salvar dados periodicamente
setInterval(saveMessages, 30000); // A cada 30 segundos

// Sincronizar dados entre abas/navegadores
setInterval(syncData, 1000); // A cada 1 segundo para sincronização mais rápida

// Atualizar status do usuário atual
setInterval(updateCurrentUserStatus, 10000); // A cada 10 segundos

// Sincronizar quando a aba ganha foco
window.addEventListener('focus', () => {
    setTimeout(syncData, 500);
});

// Sincronizar quando a aba é visível
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        setTimeout(syncData, 500);
    }
});

// Sincronizar quando há mudanças no localStorage (entre abas)
window.addEventListener('storage', (e) => {
    if (e.key === 'velochat_data') {
        setTimeout(syncData, 100);
    }
});

function updateCurrentUserStatus() {
    if (currentUser.id && users[currentUser.id]) {
        users[currentUser.id].lastSeen = Date.now();
        users[currentUser.id].status = 'online';
        saveMessages();
    }
}

function syncData() {
    // Verificar se há mudanças no localStorage
    const savedData = localStorage.getItem('velochat_data');
    
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            
            // Atualizar usuários se houver mudanças
            if (data.users) {
                const oldUserCount = Object.keys(users).length;
                
                // Mesclar usuários existentes com novos
                Object.keys(data.users).forEach(userId => {
                    const remoteUser = data.users[userId];
                    const localUser = users[userId];
                    
                    if (!localUser || remoteUser.lastSeen > localUser.lastSeen) {
                        users[userId] = { ...remoteUser };
                    }
                });
                
                // Atualizar status dos usuários baseado no lastSeen
                Object.keys(users).forEach(userId => {
                    const user = users[userId];
                    const now = Date.now();
                    const timeDiff = now - user.lastSeen;
                    
                    // Se o usuário não foi visto há mais de 30 segundos, marcar como offline
                    if (timeDiff > 30000) {
                        user.status = 'offline';
                    } else {
                        user.status = 'online';
                    }
                });
                
                // Se houver novos usuários, atualizar interface
                if (Object.keys(users).length > oldUserCount) {
                    updateDMList();
                    console.log('Novos usuários detectados:', Object.keys(users));
                }
            }
            
            // Atualizar mensagens se houver mudanças
            if (data.messages) {
                let messagesUpdated = false;
                Object.keys(data.messages).forEach(channelId => {
                    const oldLength = (messages[channelId] || []).length;
                    const newLength = data.messages[channelId].length;
                    
                    if (newLength > oldLength) {
                        messages[channelId] = data.messages[channelId];
                        messagesUpdated = true;
                    }
                });
                
                if (messagesUpdated) {
                    loadMessages();
                }
            }
            
        } catch (error) {
            console.error('Erro ao sincronizar dados:', error);
        }
    }
}

// Função para limpar cache e recomeçar
function clearCacheAndRestart() {
    localStorage.removeItem('velochat_data');
    localStorage.removeItem('velochat_sync');
    
    // Limpar variáveis
    users = {};
    messages = {};
    directMessages = {};
    conversationHistory = [];
    
    // Recarregar página
    location.reload();
}

// Carregar dados salvos
loadFromStorage();

// ==================== FUNÇÕES DE USUÁRIO ====================

function registerCurrentUser() {
    // Gerar ID único para o usuário atual baseado no nome
    const nameHash = currentUser.name.toLowerCase().replace(/\s+/g, '_');
    currentUser.id = 'user_' + nameHash + '_' + Date.now();
    
    // Definir avatar baseado no nome
    currentUser.avatar = getAvatarForName(currentUser.name);
    
    // Registrar no sistema de usuários
    users[currentUser.id] = {
        id: currentUser.id,
        name: currentUser.name,
        status: 'online',
        role: currentUser.role,
        avatar: currentUser.avatar,
        lastSeen: Date.now()
    };
    
    // Adicionar mensagem de boas-vindas
    const welcomeMessage = {
        id: 'msg_' + Date.now(),
        author: 'Sistema',
        authorId: 'system',
        text: `${currentUser.name} entrou no chat!`,
        time: getCurrentTime(),
        timestamp: Date.now(),
        type: 'system',
        channel: 'geral'
    };
    
    if (!messages.geral) messages.geral = [];
    messages.geral.push(welcomeMessage);
    addToConversationHistory(welcomeMessage);
    
    // Se estiver no canal geral, mostrar a mensagem
    if (currentChannel === 'geral') {
        addMessageToUI(welcomeMessage, false);
    }
    
    // Salvar dados
    saveMessages();
    
    // Atualizar interface
    updateDMList();
    
    // Forçar sincronização imediata
    setTimeout(syncData, 1000);
}

function getAvatarForName(name) {
    // Gerar avatar baseado no nome
    const avatars = ['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🔧', '👩‍🔧', '👨‍🎨', '👩‍🎨', '👨‍💻', '👩‍💻'];
    const hash = name.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    return avatars[Math.abs(hash) % avatars.length];
}

// ==================== FUNÇÕES ADMINISTRATIVAS ====================

function addToConversationHistory(message) {
    conversationHistory.push({
        ...message,
        id: message.id,
        timestamp: message.timestamp
    });
    
    // Manter apenas os últimos 1000 registros para performance
    if (conversationHistory.length > 1000) {
        conversationHistory = conversationHistory.slice(-1000);
    }
}

function updateDMList() {
    dmList.innerHTML = '';
    
    // Adicionar usuários para DMs
    Object.values(users).forEach(user => {
        if (user.id !== currentUser.id) {
            const dmItem = document.createElement('div');
            dmItem.className = 'dm-item';
            dmItem.dataset.userId = user.id;
            dmItem.innerHTML = `
                <div class="dm-avatar">${user.avatar}</div>
                <div class="dm-info">
                    <span class="dm-name">${user.name}</span>
                    <span class="dm-status ${user.status}">${getStatusText(user.status)}</span>
                </div>
            `;
            
            dmItem.addEventListener('click', () => {
                startDirectMessage(user.id);
            });
            
            dmList.appendChild(dmItem);
        }
    });
}

function startDirectMessage(userId) {
    const user = users[userId];
    if (!user) return;
    
    const dmId = `dm_${Math.min(currentUser.id, userId)}_${Math.max(currentUser.id, userId)}`;
    
    if (!directMessages[dmId]) {
        directMessages[dmId] = [];
    }
    
    // Criar canal temporário para DM
    currentChannel = dmId;
    currentChannelSpan.textContent = `@${user.name}`;
    
    // Carregar mensagens da DM
    loadMessages();
}

function getStatusText(status) {
    const statusMap = {
        'online': 'Online',
        'away': 'Ausente',
        'offline': 'Offline'
    };
    return statusMap[status] || 'Desconhecido';
}

function showAllConversations() {
    allConversationsModal.classList.add('show');
    loadConversationsList();
}

function loadConversationsList() {
    conversationsList.innerHTML = '';
    
    // Adicionar canais
    channels.forEach(channel => {
        const channelMessages = messages[channel.id] || [];
        const conversationItem = document.createElement('div');
        conversationItem.className = 'conversation-item';
        conversationItem.dataset.type = 'channel';
        conversationItem.dataset.id = channel.id;
        conversationItem.innerHTML = `
            <div class="conversation-avatar">
                <i class="fas fa-hashtag"></i>
            </div>
            <div class="conversation-info">
                <div class="conversation-name"># ${channel.name}</div>
                <div class="conversation-meta">${channel.description}</div>
            </div>
            <div class="conversation-stats">
                <div>${channelMessages.length} mensagens</div>
                <div>Última: ${channelMessages.length > 0 ? formatTime(channelMessages[channelMessages.length - 1].timestamp) : 'Nunca'}</div>
            </div>
        `;
        
        conversationItem.addEventListener('click', () => {
            viewConversation('channel', channel.id);
        });
        
        conversationsList.appendChild(conversationItem);
    });
    
    // Adicionar DMs
    Object.keys(directMessages).forEach(dmId => {
        const dmMessages = directMessages[dmId];
        if (dmMessages.length > 0) {
            const userIds = dmId.replace('dm_', '').split('_');
            const otherUserId = userIds.find(id => id !== currentUser.id);
            const user = users[otherUserId];
            
            if (user) {
                const conversationItem = document.createElement('div');
                conversationItem.className = 'conversation-item';
                conversationItem.dataset.type = 'dm';
                conversationItem.dataset.id = dmId;
                conversationItem.innerHTML = `
                    <div class="conversation-avatar">${user.avatar}</div>
                    <div class="conversation-info">
                        <div class="conversation-name">@ ${user.name}</div>
                        <div class="conversation-meta">Mensagem direta</div>
                    </div>
                    <div class="conversation-stats">
                        <div>${dmMessages.length} mensagens</div>
                        <div>Última: ${formatTime(dmMessages[dmMessages.length - 1].timestamp)}</div>
                    </div>
                `;
                
                conversationItem.addEventListener('click', () => {
                    viewConversation('dm', dmId);
                });
                
                conversationsList.appendChild(conversationItem);
            }
        }
    });
}

function viewConversation(type, id) {
    conversationTitle.textContent = type === 'channel' ? 
        `# ${channels.find(c => c.id === id)?.name || 'Canal'}` :
        `@ ${users[Object.keys(users).find(uid => id.includes(uid))]?.name || 'Usuário'}`;
    
    const conversationMsgs = type === 'channel' ? messages[id] || [] : directMessages[id] || [];
    
    conversationMessages.innerHTML = '';
    
    conversationMsgs.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'conversation-message';
        messageDiv.innerHTML = `
            <div class="conversation-message-avatar">${users[msg.authorId]?.avatar || '👤'}</div>
            <div class="conversation-message-content">
                <div class="conversation-message-header">
                    <span class="conversation-message-author">${msg.author}</span>
                    <span class="conversation-message-time">${msg.time}</span>
                </div>
                <div class="conversation-message-text">${escapeHtml(msg.text)}</div>
            </div>
        `;
        conversationMessages.appendChild(messageDiv);
    });
    
    conversationMessages.scrollTop = conversationMessages.scrollHeight;
    viewConversationModal.classList.add('show');
}

function filterConversations() {
    const searchTerm = document.getElementById('conversationSearch').value.toLowerCase();
    const filterType = document.getElementById('conversationFilter').value;
    
    const items = conversationsList.querySelectorAll('.conversation-item');
    
    items.forEach(item => {
        const name = item.querySelector('.conversation-name').textContent.toLowerCase();
        const type = item.dataset.type;
        
        const matchesSearch = name.includes(searchTerm);
        const matchesFilter = filterType === 'all' || 
                            (filterType === 'channels' && type === 'channel') ||
                            (filterType === 'dms' && type === 'dm');
        
        item.style.display = (matchesSearch && matchesFilter) ? 'flex' : 'none';
    });
}

function showManageUsers() {
    manageUsersModal.classList.add('show');
    loadUsersList();
}

function loadUsersList() {
    usersList.innerHTML = '';
    
    Object.values(users).forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="user-avatar-large">${user.avatar}</div>
            <div class="user-details">
                <div class="user-name-large">${user.name}</div>
                <div class="user-role">${getRoleText(user.role)}</div>
                <div class="user-status-large ${user.status}">${getStatusText(user.status)}</div>
            </div>
            <div class="user-actions">
                <button class="user-action-btn edit" title="Editar usuário">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="user-action-btn delete" title="Remover usuário">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        usersList.appendChild(userItem);
    });
}

function getRoleText(role) {
    const roleMap = {
        'owner': 'Proprietário',
        'admin': 'Administrador',
        'user': 'Usuário'
    };
    return roleMap[role] || 'Usuário';
}

function exportData() {
    const data = {
        messages,
        directMessages,
        users,
        channels,
        conversationHistory,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `velochat_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (confirm('Isso irá substituir todos os dados atuais. Continuar?')) {
                        messages = data.messages || messages;
                        directMessages = data.directMessages || directMessages;
                        users = data.users || users;
                        channels = data.channels || channels;
                        conversationHistory = data.conversationHistory || conversationHistory;
                        
                        saveMessages();
                        loadMessages();
                        updateChannelList();
                        updateDMList();
                        
                        alert('Dados importados com sucesso!');
                    }
                } catch (error) {
                    alert('Erro ao importar dados: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR');
}

// Funções de tema
function initializeTheme() {
    const savedTheme = localStorage.getItem('velochat_theme') || 'light';
    setTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('velochat_theme', newTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = themeToggle.querySelector('i');
    
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
        themeToggle.title = 'Tema claro';
    } else {
        icon.className = 'fas fa-moon';
        themeToggle.title = 'Tema escuro';
    }
}
