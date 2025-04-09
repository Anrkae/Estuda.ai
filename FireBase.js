// assets/js/components/FireBase.js

// Importa as funções necessárias do SDK (Apenas Google)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js"; // Removido OAuthProvider (Correct comment)
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc", // SECURITY: This key is public, security relies on Rules.
    authDomain: "estudaai-ddb6a.firebaseapp.com",
    projectId: "estudaai-ddb6a",
    storageBucket: "estudaai-ddb6a.appspot.com", // Corrected .appspot.com ending likely needed
    messagingSenderId: "974312409515",
    appId: "1:974312409515:web:ef635d71abf934241d6aee",
    measurementId: "G-9X8PNR6S6L"
};

// Variáveis para armazenar as instâncias
let app;
let auth;
let db;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    // GOOD: Success log is helpful
    console.log("Firebase inicializado com sucesso via módulo FireBase.js (Google Only)");
} catch (error) {
    // GOOD: Error log is helpful
    console.error("Erro fatal ao inicializar o Firebase no módulo FireBase.js:", error);
    app = null;
    auth = null;
    db = null;
}

// Exporta as instâncias (Sem OAuthProvider)
export { app, auth, db, GoogleAuthProvider }; // Exports look correct
