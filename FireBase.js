// /Firebase.js

// Importa as funções necessárias do SDK do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc", // <<< Proteja esta chave! Use Regras de Segurança.
    authDomain: "estudaai-ddb6a.firebaseapp.com",
    projectId: "estudaai-ddb6a",
    storageBucket: "estudaai-ddb6a.firebasestorage.app",
    messagingSenderId: "974312409515",
    appId: "1:974312409515:web:ef635d71abf934241d6aee",
    measurementId: "G-9X8PNR6S6L" // Opcional para Auth/Firestore
};

// Variáveis para armazenar as instâncias
let app;
let auth;
let db;

try {
    // Inicializa o Firebase App
    app = initializeApp(firebaseConfig);

    // Inicializa os serviços necessários
    auth = getAuth(app);
    db = getFirestore(app);

    console.log("Firebase inicializado com sucesso via módulo /Firebase.js");

} catch (error) {
    console.error("Erro fatal ao inicializar o Firebase no módulo /Firebase.js:", error);
    // Em caso de erro, as variáveis exportadas serão nulas/undefined
    app = null;
    auth = null;
    db = null;
}

// Exporta as instâncias e funções/provedores para serem usados em outros scripts
export { app, auth, db, GoogleAuthProvider, signInWithPopup };
