// /Firebase.js

// Importa as funções necessárias do SDK do Firebase (v9+ modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getAuth,                // Para obter a instância do Auth
    GoogleAuthProvider,     // Para o login com Google
    signInWithPopup,        // Para o fluxo de login via popup
    onAuthStateChanged,     // Para ouvir mudanças de login/logout
    signOut                 // Para fazer logout
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"; // Para o banco de dados Firestore

// Sua configuração do Firebase (Substitua com suas credenciais REAIS se necessário)
// ATENÇÃO: Em produção, proteja sua API Key com regras de segurança e/ou restrições no Google Cloud Console.
const firebaseConfig = {
    apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc", // Exemplo - Use a sua!
    authDomain: "estudaai-ddb6a.firebaseapp.com",
    projectId: "estudaai-ddb6a",
    storageBucket: "estudaai-ddb6a.firebasestorage.app",
    messagingSenderId: "974312409515",
    appId: "1:974312409515:web:ef635d71abf934241d6aee",
    measurementId: "G-9X8PNR6S6L" // Opcional para Auth/Firestore
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

    // Log para confirmar inicialização (visível no console do navegador)
    console.log("Firebase inicializado com sucesso via módulo /Firebase.js");
    // Adicionando contexto de execução
    const now = new Date();
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Fortaleza' });
    console.log(`Módulo Firebase.js executado em ${dateFormatter.format(now)}, Juazeiro do Norte - CE.`);


} catch (error) {
    // Loga erro crítico se a inicialização falhar
    console.error("Erro fatal ao inicializar o Firebase no módulo /Firebase.js:", error);
    // Define as variáveis como nulas para indicar falha
    app = null;
    auth = null;
    db = null;
}

// Exporta as instâncias e funções/classes necessárias para serem usadas em outras partes do seu app
export {
    app,                    // A instância principal do App Firebase
    auth,                   // A instância do serviço de Autenticação
    db,                     // A instância do serviço Firestore Database
    GoogleAuthProvider,     // A classe do provedor Google
    signInWithPopup,        // A função para login com popup
    onAuthStateChanged,     // A função para monitorar o estado de autenticação
    signOut                 // A função para fazer logout
};
