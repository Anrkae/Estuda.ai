// /Firebase.js

// Importa as funções necessárias do SDK do Firebase (v9+ modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

// Funções de Autenticação
import {
    getAuth,                // Para obter a instância do Auth
    GoogleAuthProvider,     // Para o login com Google
    signInWithPopup,        // Para o fluxo de login via popup
    onAuthStateChanged,     // Para ouvir mudanças de login/logout
    signOut                 // Para fazer logout
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Funções do Firestore Database
import {
    getFirestore,           // Para obter a instância do Firestore
    doc,                    // Para referenciar um documento específico
    setDoc                  // Para escrever/atualizar um documento
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Sua configuração do Firebase
// ATENÇÃO: Em produção, proteja sua API Key com regras de segurança e/ou restrições.
const firebaseConfig = {
    apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc", // <<< Use a sua chave real
    authDomain: "estudaai-ddb6a.firebaseapp.com",
    projectId: "estudaai-ddb6a",
    storageBucket: "estudaai-ddb6a.firebasestorage.app",
    messagingSenderId: "974312409515",
    appId: "1:974312409515:web:ef635d71abf934241d6aee",
    measurementId: "G-9X8PNR6S6L" // Opcional
};

// Variáveis para armazenar as instâncias dos serviços Firebase
let app;
let auth;
let db;

try {
    // Inicializa o Firebase App uma única vez
    app = initializeApp(firebaseConfig);

    // Obtém as instâncias dos serviços necessários
    auth = getAuth(app);
    db = getFirestore(app); // Inicializa o Firestore

    // Log para confirmar inicialização
    console.log("Firebase inicializado com sucesso via módulo /Firebase.js (com Auth e Firestore)");
    const now = new Date();
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Fortaleza' });
    console.log(`Módulo Firebase.js executado em ${dateFormatter.format(now)}, Juazeiro do Norte - CE.`);


} catch (error) {
    // Loga erro crítico se a inicialização falhar
    console.error("Erro fatal ao inicializar o Firebase no módulo /Firebase.js:", error);
    app = null;
    auth = null;
    db = null;
}

// Exporta as instâncias e funções/classes necessárias
export {
    // Instâncias dos Serviços
    app,                    // Instância principal do App Firebase
    auth,                   // Instância do serviço de Autenticação
    db,                     // Instância do serviço Firestore Database

    // Funções/Classes de Autenticação
    GoogleAuthProvider,     // Classe do provedor Google
    signInWithPopup,        // Função para login com popup
    onAuthStateChanged,     // Função para monitorar o estado de autenticação
    signOut,                // Função para fazer logout

    // Funções do Firestore
    doc,                    // Função para criar referência a um documento
    setDoc                  // Função para escrever/atualizar um documento
};
