// assets/js/components/FireBase.js

// Importa as funções necessárias do SDK do Firebase (estilo modular v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
// Removi getAnalytics para simplificar, adicione se precisar
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc", // << NÃO COMPARTILHE EM PRODUÇÃO REAL! Use regras de segurança.
    authDomain: "estudaai-ddb6a.firebaseapp.com",
    projectId: "estudaai-ddb6a",
    storageBucket: "estudaai-ddb6a.firebasestorage.app",
    messagingSenderId: "974312409515",
    appId: "1:974312409515:web:ef635d71abf934241d6aee",
    measurementId: "G-9X8PNR6S6L" // Opcional para Auth/Firestore
};

// Variáveis para armazenar as instâncias inicializadas
let app;
let auth;
let db;
// let analytics;

try {
    // Inicializa o Firebase App
    app = initializeApp(firebaseConfig);

    // Inicializa os serviços necessários
    auth = getAuth(app);
    db = getFirestore(app);
    // analytics = getAnalytics(app); // Descomente se for usar Analytics

    console.log("Firebase inicializado com sucesso via módulo FireBase.js");

} catch (error) {
    console.error("Erro fatal ao inicializar o Firebase no módulo FireBase.js:", error);
    // Em caso de erro grave na inicialização, as variáveis exportadas serão nulas/undefined
    // O código que as importa precisará tratar isso.
    app = null;
    auth = null;
    db = null;
    // analytics = null;
}

// Exporta as instâncias inicializadas para serem usadas em outros scripts/módulos
// Exporta também os provedores para facilitar
export { app, auth, db, GoogleAuthProvider, OAuthProvider };
// Exporte 'analytics' também se precisar dele em outros lugares
