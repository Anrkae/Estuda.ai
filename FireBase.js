// /Firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
// Importe getDoc do Firestore
import {
    getFirestore, doc, setDoc, getDoc // <<< ADICIONE getDoc AQUI
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc", // <<< Use a sua chave real
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
    console.log("Firebase inicializado com sucesso via módulo /Firebase.js (com Auth e Firestore)");
    // ... log de data ...
} catch (error) {
    console.error("Erro fatal ao inicializar o Firebase:", error);
    app = null; auth = null; db = null;
}

// Exporta as instâncias e funções/classes necessárias
export {
    app, auth, db,
    GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
    doc, setDoc, getDoc // <<< ADICIONE getDoc AQUI
};
