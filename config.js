// Configurações do VeloChat
const VeloChatConfig = {
    // Configurações de Segurança
    security: {
        requirePassword: false, // true para exigir senha
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas em ms
        maxUsers: 50, // máximo de usuários
        enableLogs: true // habilitar logs
    },
    
    // Configurações de Interface
    ui: {
        defaultTheme: 'light', // 'light' ou 'dark'
        enableNotifications: true,
        enableSounds: false,
        autoSave: true,
        saveInterval: 30000 // 30 segundos
    },
    
    // Configurações de Dados
    data: {
        maxHistorySize: 1000, // máximo de mensagens no histórico
        enableBackup: true,
        backupInterval: 300000, // 5 minutos
        enableExport: true
    },
    
    // Configurações de Rede (para futuras implementações)
    network: {
        enableRealTime: false, // para implementação futura
        serverUrl: '', // URL do servidor
        enableSync: false // sincronização entre dispositivos
    }
};

// Aplicar configurações
if (typeof window !== 'undefined') {
    window.VeloChatConfig = VeloChatConfig;
}
