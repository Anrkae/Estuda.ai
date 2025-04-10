// /Firebase.js

// Importa as funções necessárias do SDK do Firebase (v9+ modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

// Funções de Autenticação
import {
    getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Funções do Firestore Database
import {
    getFirestore,           // Para obter a instância do Firestore
    doc,                    // Para referenciar um documento específico
    setDoc,                 // Para escrever/atualizar um documento (usado em perfil)
    getDoc,                 // Para ler um documento específico (usado em perfil)
    collection,             // Para referenciar uma coleção
    getDocs,                // Para ler múltiplos documentos (lista de disciplinas)
    addDoc,                 // Para adicionar um novo documento com ID automático
    deleteDoc,              // Para deletar um documento
    updateDoc,              // Para atualizar campos específicos de um documento
    arrayUnion,             // Para adicionar item a um array no Firestore
    arrayRemove             // Para remover item de um array no Firestore
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
    console.error("Erro fatal ao inicializar o Firebase no módulo /Firebase.js:", error);
    app = null; auth = null; db = null;
}

// Exporta as instâncias e funções/classes necessárias
export {
    // Instâncias
    app, auth, db,
    // Auth
    GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
    // Firestore
    doc, setDoc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove
};
