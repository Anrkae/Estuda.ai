document.addEventListener('DOMContentLoaded', () => {
    console.log("Script perfil_simples.js carregado.");

    const firebaseConfig = {
        apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc", // SUAS CREDENCIAIS REAIS
        authDomain: "estudaai-ddb6a.firebaseapp.com",
        projectId: "estudaai-ddb6a",
        storageBucket: "estudaai-ddb6a.appspot.com",
        messagingSenderId: "974312409515",
        appId: "1:974312409515:web:ef635d71abf934241d6aee"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();
    let currentUserForProfile = null;

    const profilePicElement = document.getElementById('profile-pic-display');
    const profileNameElement = document.getElementById('profile-name-display');
    const profileUsernameElement = document.getElementById('profile-username-display');
    const profileDobElement = document.getElementById('profile-dob-display');
    const profileEmailElement = document.getElementById('profile-page-email');
    const logoutButton = document.getElementById('profile-page-logout-button');
    
    const loadingMessageDiv = document.getElementById('loading-message');
    const profileDisplayContainer = document.getElementById('profile-display-container');
    const authErrorMessageDiv = document.getElementById('auth-error-message');

    function showAppStatus(message, type = 'info', duration = 0) {
        let statusElement = authErrorMessageDiv; // Usar este para erros de auth
        if (type === 'info' && loadingMessageDiv) {
            statusElement = loadingMessageDiv;
        } else if (type === 'success' && loadingMessageDiv) { // Reutilizar loading para sucesso breve
            statusElement = loadingMessageDiv;
        }
        
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-message ${type}`;
            statusElement.style.display = 'block';
            if (duration > 0) {
                setTimeout(() => {
                    if (statusElement.textContent === message) {
                        statusElement.textContent = '';
                        statusElement.style.display = 'none';
                    }
                }, duration);
            }
        }
    }

    function formatDatePtBr(dateInput) {
        if (!dateInput) return "Não informada";
        let dateObj;
        if (dateInput.toDate) { // É um Timestamp do Firestore
            dateObj = dateInput.toDate();
        } else if (typeof dateInput === 'string') { 
            if (dateInput.includes('T') || dateInput.includes('-') && dateInput.length > 10) { // ISO ou YYYY-MM-DD
                 dateObj = new Date(dateInput);
                 // Adiciona ajuste de UTC se a string não tiver info de timezone e for interpretada como local
                 if (dateInput.length === 10 && dateInput.includes('-')) { // YYYY-MM-DD
                    const parts = dateInput.split('-');
                    dateObj = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                 }
            } else { // Tenta parsear como dd/mm/aaaa
                const parts = dateInput.split('/');
                if (parts.length === 3) {
                    dateObj = new Date(Date.UTC(parseInt(parts[2],10), parseInt(parts[1],10) - 1, parseInt(parts[0],10)));
                } else { dateObj = new Date(NaN); }
            }
        } else if (dateInput instanceof Date) {
            dateObj = dateInput;
        } else { return "Formato de data desconhecido"; }

        if (isNaN(dateObj.getTime())) return "Data inválida";
        
        return dateObj.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'
        });
    }

    async function loadUserProfile(uid) {
        if (!uid) {
            showAppStatus("Erro: ID do usuário não disponível.", "error");
            if (profileDisplayContainer) profileDisplayContainer.style.display = 'none';
            if (loadingMessageDiv) loadingMessageDiv.style.display = 'none';
            return;
        }
        console.log("PERFIL: Carregando dados do Firestore para UID:", uid);
        showAppStatus('Carregando seu perfil...', 'info', 0); // Mensagem persistente

        try {
            const doc = await db.collection('users').doc(uid).get();
            if (loadingMessageDiv) loadingMessageDiv.style.display = 'none'; // Esconde "Carregando"

            if (doc.exists) {
                const userData = doc.data();
                console.log("PERFIL: Dados do Firestore carregados:", userData);

                if (profileNameElement) profileNameElement.textContent = userData.displayName || "Nome não fornecido";
                if (profileUsernameElement) profileUsernameElement.textContent = userData.username ? `@${userData.username}` : "@não definido";
                if (profileEmailElement && currentUserForProfile) profileEmailElement.textContent = currentUserForProfile.email || "Email não disponível";
                if (profileDobElement) profileDobElement.textContent = formatDatePtBr(userData.dob);
                
                const defaultPic = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
                const picUrl = userData.profilePicBase64 || (currentUserForProfile ? currentUserForProfile.photoURL : null) || defaultPic;
                
                if (profilePicElement) {
                    profilePicElement.src = picUrl;
                    profilePicElement.onerror = () => { if(profilePicElement) profilePicElement.src = defaultPic; };
                }
                if (profileDisplayContainer) profileDisplayContainer.style.display = 'block';

            } else {
                console.warn("PERFIL: Documento do usuário não encontrado no Firestore para UID:", uid);
                showAppStatus("Seu perfil ainda não foi completamente configurado.", "info", 0);
                if (profileDisplayContainer) profileDisplayContainer.style.display = 'block'; // Mostra o card mesmo assim
                if (profileNameElement) profileNameElement.textContent = currentUserForProfile.displayName || "Bem-vindo!";
                if (profileEmailElement && currentUserForProfile) profileEmailElement.textContent = currentUserForProfile.email;
                if (profileUsernameElement) profileUsernameElement.textContent = "@complete seu perfil";
                if (profileDobElement) profileDobElement.textContent = "Complete seu perfil";
            }
        } catch (error) {
            console.error("PERFIL: Erro ao carregar dados do Firestore:", error);
            showAppStatus("Erro ao carregar os dados do seu perfil. Tente recarregar a página.", "error", 0);
            if (profileDisplayContainer) profileDisplayContainer.style.display = 'block'; // Mostra o card com mensagem de erro
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            showAppStatus("Saindo...", "info", 0);
            auth.signOut().then(() => {
                console.log('PERFIL: Logout bem-sucedido.');
                window.location.href = 'login.html'; // Ajuste para sua página de login (auth_novo.html?)
            }).catch((error) => {
                console.error('PERFIL: Erro ao fazer logout:', error);
                showAppStatus("Erro ao tentar sair. Tente novamente.", "error");
            });
        });
    } else {
        console.warn("Elemento #profile-page-logout-button não encontrado.");
    }

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUserForProfile = user; // Define o usuário globalmente neste script
            console.log("PERFIL: Usuário autenticado (onAuthStateChanged):", user.uid);
            loadUserProfile(user.uid);
        } else {
            currentUserForProfile = null;
            console.log("PERFIL: Nenhum usuário logado (onAuthStateChanged). Redirecionando para login...");
            if (loadingMessageDiv) loadingMessageDiv.style.display = 'none';
            showAppStatus("Você não está logado. Redirecionando...", "error", 0);
            setTimeout(() => {
                 window.location.href = 'login.html'; // Ajuste para sua página de login (auth_novo.html?)
            }, 2000);
        }
    });
    console.log("Script perfil_simples.js: Configuração finalizada.");
});