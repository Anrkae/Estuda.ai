document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = {
        apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc",
        authDomain: "estudaai-ddb6a.firebaseapp.com",
        projectId: "estudaai-ddb6a",
        storageBucket: "estudaai-ddb6a.appspot.com",
        messagingSenderId: "974312409515",
        appId: "1:974312409515:web:ef635d71abf934241d6aee"
    };

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    // ... (referências aos elementos DOM - permanecem as mesmas) ...
    const authTitle = document.getElementById('auth-title');
    const authDescription = document.getElementById('auth-description');
    const statusMessageEl = document.getElementById('status-message');
    const googleLoginButton = document.getElementById('google-login-button');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const toggleMessageParagraph = document.getElementById('toggle-message');

    const loginFormContainer = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');

    const signupFormContainer = document.getElementById('signup-form');
    const signupNameInput = document.getElementById('signup-name');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPasswordInput = document.getElementById('signup-password');
    const signupConfirmPasswordInput = document.getElementById('signup-confirm-password');
    const signupButton = document.getElementById('signup-button');

    function setUIState(isLoading, message = '') {
        loginButton.disabled = isLoading;
        signupButton.disabled = isLoading;
        googleLoginButton.disabled = isLoading;
        
        if (isLoading) {
            loginButton.textContent = 'Aguarde...';
            signupButton.textContent = 'Aguarde...';
            if (message) {
                statusMessageEl.textContent = message;
                statusMessageEl.className = 'info';
            }
        } else {
            loginButton.textContent = 'Entrar';
            signupButton.textContent = 'Cadastrar';
        }
    }
    
    // ... (funções showLoginForm, showSignupForm - permanecem as mesmas) ...
    function showLoginForm(e) {
        if(e) e.preventDefault();
        authTitle.textContent = 'Entrar';
        authDescription.textContent = 'Acesse sua conta para continuar.';
        loginFormContainer.style.display = 'block';
        loginFormContainer.classList.add('active-form');
        signupFormContainer.style.display = 'none';
        signupFormContainer.classList.remove('active-form');
        toggleMessageParagraph.innerHTML = 'Não tem uma conta? <a href="#" id="show-signup-link-dynamic">Cadastre-se</a>';
        const dynSignupLink = document.getElementById('show-signup-link-dynamic');
        if(dynSignupLink) dynSignupLink.addEventListener('click', showSignupForm);
        if(!e) { // Só limpa se não for um evento de clique, para não limpar msg de erro de getRedirectResult
            statusMessageEl.textContent = ''; statusMessageEl.className = '';
        }
    }

    function showSignupForm(e) {
        if(e) e.preventDefault();
        authTitle.textContent = 'Criar Conta';
        authDescription.textContent = 'Preencha os dados para se cadastrar.';
        signupFormContainer.style.display = 'block';
        signupFormContainer.classList.add('active-form');
        loginFormContainer.style.display = 'none';
        loginFormContainer.classList.remove('active-form');
        toggleMessageParagraph.innerHTML = 'Já tem uma conta? <a href="#" id="show-login-link-dynamic">Faça Login</a>';
        const dynLoginLink = document.getElementById('show-login-link-dynamic');
        if(dynLoginLink) dynLoginLink.addEventListener('click', showLoginForm);
         if(!e) {
            statusMessageEl.textContent = ''; statusMessageEl.className = '';
        }
    }
    
    const initialShowSignupLink = document.getElementById('show-signup-link');
    if (initialShowSignupLink) {
        initialShowSignupLink.addEventListener('click', showSignupForm);
    }

    // NOVO: Processa o resultado do redirecionamento do Google (ou outros provedores de redirecionamento)
    // Isso deve ser chamado logo após a inicialização, e ANTES do onAuthStateChanged para que o estado já esteja potencialmente definido.
    auth.getRedirectResult()
        .then((result) => {
            if (result.user) { // Checa se result.user existe, indicando um login bem-sucedido via redirect
                const user = result.user;
                console.log('AUTH: Login via REDIRECT bem-sucedido:', user.uid);
                setUIState(true, 'Processando login...'); // Indica que algo está acontecendo

                if (result.additionalUserInfo && result.additionalUserInfo.isNewUser) {
                    console.log("AUTH: Novo usuário via REDIRECT. Criando perfil no Firestore.");
                    return db.collection('users').doc(user.uid).set({
                        displayName: user.displayName || user.email,
                        email: user.email,
                        photoURL: user.photoURL || '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        initialSetupComplete: false
                    }).then(() => {
                        console.log("FIRESTORE-CREATE: Documento do usuário (redirect) criado com sucesso!");
                        // onAuthStateChanged vai lidar com o próximo passo de redirecionamento
                    }).catch((firestoreError) => {
                        console.error("FALHA-FIRESTORE-CREATE: (redirect) Documento NÃO foi criado no Firestore.", firestoreError);
                        statusMessageEl.textContent = 'Erro crítico ao configurar novo usuário. Tente novamente ou contate o suporte.';
                        statusMessageEl.className = 'erro';
                        auth.signOut(); // Desloga se o perfil não pôde ser criado
                        setUIState(false);
                    });
                }
                // Se não for novo usuário, onAuthStateChanged já deve estar cuidando disso ou vai cuidar.
                // O estado de autenticação já foi atualizado pelo getRedirectResult.
            }
            // Se result.user for null, significa que não houve login via redirect nesta carga de página
            // ou o usuário não completou o login. Nenhuma ação específica aqui, onAuthStateChanged cuida.
        })
        .catch((error) => {
            console.error('AUTH-ERROR: Erro em getRedirectResult:', error.code, error.message);
            let mensagemErro = 'Ocorreu um erro ao processar o login com Google.';
            if (error.code === 'auth/account-exists-with-different-credential') {
                mensagemErro = 'Já existe uma conta com este e-mail usando um método de login diferente.';
            }
            statusMessageEl.textContent = mensagemErro;
            statusMessageEl.className = 'erro';
            setUIState(false);
        });


    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("AUTH: Usuário logado (onAuthStateChanged):", user.uid);
            // Não mostra "Verificando perfil..." imediatamente se o getRedirectResult acabou de definir o usuário
            // A UI já foi definida por getRedirectResult ou será definida abaixo
            if (!statusMessageEl.textContent.includes('Processando login...')) {
                 statusMessageEl.textContent = 'Verificando perfil...';
                 statusMessageEl.className = 'info';
            }
            setUIState(true);


            db.collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists && doc.data().initialSetupComplete === true) {
                        console.log("AUTH: Configuração inicial completa. Redirecionando para index.html");
                        statusMessageEl.textContent = 'Login bem-sucedido! Redirecionando...';
                        statusMessageEl.className = 'sucesso';
                        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
                    } else {
                        console.log("AUTH: Configuração inicial pendente ou doc não encontrado. Redirecionando para config-login.html");
                        statusMessageEl.textContent = 'Bem-vindo! Vamos configurar seu perfil...';
                        statusMessageEl.className = 'info';
                        setTimeout(() => { window.location.href = 'config-login.html'; }, 1000);
                    }
                })
                .catch((error) => {
                    console.error("AUTH: Erro ao buscar dados do usuário no Firestore:", error);
                    statusMessageEl.textContent = 'Erro ao verificar perfil. Tente novamente.';
                    statusMessageEl.className = 'erro';
                    setUIState(false); 
                });
        } else {
            console.log("AUTH: Nenhum usuário logado (onAuthStateChanged).");
            setUIState(false);
            showLoginForm(); 
        }
    });

    // ... (lógica de login com e-mail/senha - permanece a mesma) ...
    if (loginFormContainer) {
        loginFormContainer.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginEmailInput.value.trim();
            const password = loginPasswordInput.value.trim();
            statusMessageEl.textContent = ''; statusMessageEl.className = '';
            setUIState(true, 'Entrando...');
            if (email === "" || password === "") {
                statusMessageEl.textContent = 'Por favor, preencha e-mail e senha.';
                statusMessageEl.className = 'erro';
                setUIState(false);
                return;
            }
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('AUTH: Login com e-mail/senha bem-sucedido:', userCredential.user.uid);
                })
                .catch((error) => {
                    console.error('AUTH-ERROR: Erro no login com e-mail/senha:', error.code, error.message);
                    let mensagemErro = 'Ocorreu um erro ao tentar fazer login.';
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                        mensagemErro = 'E-mail ou senha inválidos.';
                    } else if (error.code === 'auth/invalid-email') {
                        mensagemErro = 'O formato do e-mail é inválido.';
                    }
                    statusMessageEl.textContent = mensagemErro;
                    statusMessageEl.className = 'erro';
                    setUIState(false);
                });
        });
    }

    // ... (lógica de cadastro com e-mail/senha - permanece a mesma, incluindo criação do doc no Firestore) ...
    if (signupFormContainer) {
        signupFormContainer.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = signupNameInput.value.trim();
            const email = signupEmailInput.value.trim();
            const password = signupPasswordInput.value;
            const confirmPassword = signupConfirmPasswordInput.value;
            statusMessageEl.textContent = ''; statusMessageEl.className = '';
            setUIState(true, 'Cadastrando...');
            if (email === "" || password === "" || confirmPassword === "") {
                statusMessageEl.textContent = 'Por favor, preencha e-mail, senha e confirmação.';
                statusMessageEl.className = 'erro';
                setUIState(false); return;
            }
            if (password !== confirmPassword) {
                statusMessageEl.textContent = 'As senhas não coincidem.';
                statusMessageEl.className = 'erro';
                setUIState(false); signupPasswordInput.focus(); return;
            }
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log('AUTH: Usuário cadastrado com sucesso no Firebase Auth:', user.uid);
                    return db.collection('users').doc(user.uid).set({
                        displayName: name || user.email, email: user.email, photoURL: user.photoURL || '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(), initialSetupComplete: false
                    })
                    .then(() => {
                        console.log("FIRESTORE-CREATE: Documento do usuário criado com sucesso durante o cadastro!");
                    })
                    .catch((firestoreError) => {
                        console.error("FALHA-FIRESTORE-CREATE: Documento NÃO foi criado no Firestore durante o cadastro.", firestoreError);
                        statusMessageEl.textContent = 'Erro crítico ao finalizar cadastro. Tente logar ou contate o suporte.';
                        statusMessageEl.className = 'erro';
                        auth.signOut(); setUIState(false);
                    });
                })
                .catch((authError) => {
                    console.error('AUTH-ERROR: Erro no cadastro do Firebase Auth:', authError.code, authError.message);
                    let mensagemErro = 'Ocorreu um erro ao tentar cadastrar.';
                    if (authError.code === 'auth/email-already-in-use') {
                        mensagemErro = 'Este e-mail já está em uso por outra conta.';
                    } else if (authError.code === 'auth/invalid-email') {
                        mensagemErro = 'O formato do e-mail é inválido.';
                    } else if (authError.code === 'auth/weak-password') {
                        mensagemErro = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
                    }
                    statusMessageEl.textContent = mensagemErro;
                    statusMessageEl.className = 'erro';
                    setUIState(false);
                });
        });
    }

    // MODIFICADO: Lógica de Login com Google agora usa signInWithRedirect
    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', () => {
            statusMessageEl.textContent = ''; statusMessageEl.className = '';
            setUIState(true, 'Redirecionando para o Google...'); // Mensagem para o usuário

            auth.signInWithRedirect(googleProvider)
                .catch((error) => { // Este catch é para erros AO INICIAR o redirect
                    console.error('AUTH-ERROR: Erro ao iniciar signInWithRedirect com Google:', error.code, error.message);
                    statusMessageEl.textContent = 'Não foi possível iniciar o login com Google. Verifique sua conexão ou tente mais tarde.';
                    statusMessageEl.className = 'erro';
                    setUIState(false);
                });
            // Não há .then() aqui, o resultado é pego por getRedirectResult() no recarregamento da página
        });
    }

    // ... (lógica de esqueci minha senha - permanece a mesma) ...
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const currentEmail = loginEmailInput.value.trim();
            const emailForPasswordReset = prompt("Por favor, digite seu e-mail para redefinir a senha:", currentEmail);
            if (emailForPasswordReset) {
                statusMessageEl.textContent = 'Enviando e-mail...';
                statusMessageEl.className = 'info';
                auth.sendPasswordResetEmail(emailForPasswordReset)
                    .then(() => {
                        statusMessageEl.textContent = 'E-mail de redefinição de senha enviado para ' + emailForPasswordReset;
                        statusMessageEl.className = 'sucesso';
                    })
                    .catch((error) => {
                        console.error('AUTH-ERROR: Erro ao enviar e-mail de redefinição:', error);
                        let mensagemErro = 'Erro ao enviar e-mail de redefinição.';
                        if (error.code === 'auth/user-not-found') {
                           mensagemErro = 'Nenhum usuário encontrado com este e-mail.';
                        } else if (error.code === 'auth/invalid-email') {
                            mensagemErro = 'O formato do e-mail é inválido.';
                        }
                        statusMessageEl.textContent = mensagemErro;
                        statusMessageEl.className = 'erro';
                    });
            }
        });
    }
    
    // Inicializa a UI para o formulário de login, caso não haja usuário logado
    // Isso é importante porque onAuthStateChanged pode ser assíncrono
    if(!auth.currentUser) {
        showLoginForm();
    }

});