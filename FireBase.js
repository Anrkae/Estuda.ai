// assets/js/components/FireBase.js

// Importa as funções necessárias do SDK (Apenas Google)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
// ADICIONE signInWithPopup à importação de firebase/auth
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc", // Segurança!
    authDomain: "estudaai-ddb6a.firebaseapp.com",
    projectId: "estudaai-ddb6a",
    storageBucket: "estudaai-ddb6a.firebasestorage.app",
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
    console.log("Firebase inicializado com sucesso via módulo FireBase.js (Google Only)");
} catch (error) {
    console.error("Erro fatal ao inicializar o Firebase no módulo FireBase.js:", error);
    app = null;
    auth = null;
    db = null;
}

// Exporta as instâncias E a função signInWithPopup
export { app, auth, db, GoogleAuthProvider, signInWithPopup }; // <-- ADICIONE signInWithPopup aqui
