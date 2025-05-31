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

    const authTitle = document.getElementById('auth-title');
    const authDescription = document.getElementById('auth-description');
    const statusMessageEl = document.getElementById('status-message');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const toggleMessageParagraph = document.getElementById('toggle-message');

    const loginFormContainer = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');

    const signupFormContainer = document.getElementById('signup-form');
    // REMOVIDO: const signupNameInput = document.getElementById('signup-name');
    const signupUsernameInput = document.getElementById('signup-username');
    // REMOVIDO: const signupDobInput = document.getElementById('signup-dob');
    const usernameFeedbackEl = document.getElementById('username-feedback');
    // REMOVIDO: const dobFeedbackEl = document.getElementById('dob-feedback');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPasswordInput = document.getElementById('signup-password');
    const signupConfirmPasswordInput = document.getElementById('signup-confirm-password');
    const signupButton = document.getElementById('signup-button');

    let shouldAttemptMigration = false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('migrate') === 'true') {
        shouldAttemptMigration = true;
        console.log("AUTH: Parâmetro de migração (?migrate=true) detectado.");
    }

    // Funções de data não são mais necessárias no formulário de cadastro simplificado
    // Mas podem ser úteis na migração se 'userInfo' do localStorage tiver 'dob'
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    function parseAndValidateDdMmYyyy(ds) { /* ... (como antes, pode manter se migração usar) ... */ 
        if (!ds) return null;
        const m = ds.match(dateRegex); if (!m) return null;
        const d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
        if (y < 1900 || y > new Date().getFullYear() - 0 || mo < 1 || mo > 12 || d < 1 || d > 31) return null; // Ajustado para idade 0 se precisar
        if ((mo === 4 || mo === 6 || mo === 9 || mo === 11) && d > 30) return null;
        if (mo === 2) { const iL = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0); if (d > (iL ? 29 : 28)) return null; }
        const dt = new Date(y, mo - 1, d);
        return (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) ? null : dt;
    }
    // applyDateMask não é mais necessária para o formulário de cadastro simplificado

    function setUIState(isLoading, message = '') { /* ... (como antes) ... */
        if(loginButton) loginButton.disabled = isLoading;
        if(signupButton) signupButton.disabled = isLoading;
        if (isLoading) {
            if(loginButton) loginButton.textContent = 'Aguarde...';
            if(signupButton) signupButton.textContent = 'Aguarde...';
            if (message && statusMessageEl) { statusMessageEl.textContent = message; statusMessageEl.className = 'info';}
        } else {
            if(loginButton) loginButton.textContent = 'Entrar';
            if(signupButton) signupButton.textContent = 'Cadastrar';
        }
    }
    function showLoginForm(e) { /* ... (como antes) ... */
        if(e) e.preventDefault();
        if(authTitle) authTitle.textContent = 'Entrar';
        if(authDescription) authDescription.textContent = 'Acesse sua conta para continuar.';
        if(loginFormContainer) loginFormContainer.style.display = 'block';
        if(loginFormContainer) loginFormContainer.classList.add('active-form');
        if(signupFormContainer) signupFormContainer.style.display = 'none';
        if(signupFormContainer) signupFormContainer.classList.remove('active-form');
        if(toggleMessageParagraph) toggleMessageParagraph.innerHTML = 'Não tem uma conta? <a href="#" id="show-signup-link-dynamic">Cadastre-se</a>';
        const dynSignupLink = document.getElementById('show-signup-link-dynamic');
        if(dynSignupLink) dynSignupLink.addEventListener('click', showSignupForm);
        if(!e && statusMessageEl) { statusMessageEl.textContent = ''; statusMessageEl.className = ''; }
        if(usernameFeedbackEl) usernameFeedbackEl.textContent = ''; 
        // if(dobFeedbackEl) dobFeedbackEl.textContent = ''; // dobFeedbackEl não existe mais no form
    }
    function showSignupForm(e) { /* ... (como antes) ... */
        if(e) e.preventDefault();
        if(authTitle) authTitle.textContent = 'Criar Conta';
        if(authDescription) authDescription.textContent = 'Preencha os dados para se cadastrar.';
        if(signupFormContainer) signupFormContainer.style.display = 'block';
        if(signupFormContainer) signupFormContainer.classList.add('active-form');
        if(loginFormContainer) loginFormContainer.style.display = 'none';
        if(loginFormContainer) loginFormContainer.classList.remove('active-form');
        if(toggleMessageParagraph) toggleMessageParagraph.innerHTML = 'Já tem uma conta? <a href="#" id="show-login-link-dynamic">Faça Login</a>';
        const dynLoginLink = document.getElementById('show-login-link-dynamic');
        if(dynLoginLink) dynLoginLink.addEventListener('click', showLoginForm);
         if(!e && statusMessageEl) { statusMessageEl.textContent = ''; statusMessageEl.className = ''; }
        if(usernameFeedbackEl) usernameFeedbackEl.textContent = ''; 
        // if(dobFeedbackEl) dobFeedbackEl.textContent = '';
    }
    const initialShowSignupLink = document.getElementById('show-signup-link');
    if (initialShowSignupLink) initialShowSignupLink.addEventListener('click', showSignupForm);

    async function migrateLocalDataToFirestore(userId) {
        if (!userId) {
            console.error("MIGRATE: UID do usuário não fornecido para migração.");
            return { success: false, error: "UID não fornecido.", setupCompleteStatus: false };
        }
        console.log("MIGRATE: Iniciando migração de dados do localStorage para UID:", userId);
        if (statusMessageEl) {
            statusMessageEl.textContent = 'Sincronizando seus dados locais anteriores...';
            statusMessageEl.className = 'info';
        }

        let dataToMigrate = {};
        let localDataFoundAndProcessed = false;
        const migratedKeys = [];
        let existingUserDataBeforeMigration = {};
        
        try {
            const userDocSnapshotForInitialData = await db.collection('users').doc(userId).get();
            if(userDocSnapshotForInitialData.exists) {
                existingUserDataBeforeMigration = userDocSnapshotForInitialData.data();
            }

            const localUserInfoStr = localStorage.getItem('userInfo');
            if (localUserInfoStr) { /* ... (lógica de userInfo como antes) ... */ 
                migratedKeys.push('userInfo');
                try { /* ... */ localDataFoundAndProcessed = true; } catch (e) { console.error("MIGRATE DEBUG: Erro ao parsear userInfo:", e); }
            }
            const localDisciplinasStr = localStorage.getItem('disciplinas');
            if (localDisciplinasStr) { /* ... (lógica de disciplinas como antes) ... */ 
                migratedKeys.push('disciplinas');
                try { /* ... */ localDataFoundAndProcessed = true; } catch (e) { console.error("MIGRATE DEBUG: Erro ao parsear disciplinas:", e); }
            }
            const localSessoesEstudoStr = localStorage.getItem('sessoesEstudo');
            if (localSessoesEstudoStr) { /* ... (lógica de sessoesEstudo como antes, com conversão de data e números) ... */ 
                migratedKeys.push('sessoesEstudo');
                try { /* ... */ localDataFoundAndProcessed = true; } catch (e) { console.error("MIGRATE DEBUG: Erro ao parsear sessoesEstudo:", e); }
            }
            const localCronogramaStr = localStorage.getItem('cronograma');
            if (localCronogramaStr) { /* ... (lógica de cronograma como antes) ... */ 
                migratedKeys.push('cronograma');
                try { /* ... */ localDataFoundAndProcessed = true; } catch (e) { console.error("MIGRATE DEBUG: Erro ao parsear cronograma:", e); }
            }
            const localAnotacoesStr = localStorage.getItem('minhasAnotacoes');
            if (localAnotacoesStr) { /* ... (lógica de minhasAnotacoes como antes, com conversão de data) ... */ 
                migratedKeys.push('minhasAnotacoes');
                try { /* ... */ localDataFoundAndProcessed = true; } catch (e) { console.error("MIGRATE DEBUG: Erro ao parsear minhasAnotacoes:", e); }
            }
            const localSummariesStr = localStorage.getItem('estudaAiSummaries');
            if (localSummariesStr) { /* ... (lógica de estudaAiSummaries como antes, com add de createdAt) ... */ 
                migratedKeys.push('estudaAiSummaries');
                try { /* ... */ localDataFoundAndProcessed = true; } catch (e) { console.error("MIGRATE DEBUG: Erro ao parsear estudaAiSummaries:", e); }
            }


            if (!localDataFoundAndProcessed) {
                console.log("MIGRATE: Nenhum dado local das chaves monitoradas encontrado para migrar.");
                // Se não há dados locais para migrar, o initialSetupComplete do documento existente (ou false se não existir) é mantido.
                // MAS, como o pedido é ir para index.html, vamos forçar true se este caminho for chamado por um NOVO cadastro
                // No entanto, a criação inicial do doc já define initialSetupComplete. Este 'set' é mais para 'localDataMigrated'.
                await db.collection('users').doc(userId).set({ 
                    localDataMigrated: true,
                    // initialSetupComplete será definido no final com base se algo foi migrado ou se é novo usuário
                }, { merge: true });
                // Para um novo usuário, `existingUserDataBeforeMigration.initialSetupComplete` será `false`.
                // Para um usuário existente que não tinha dados locais, manterá o `initialSetupComplete` que ele já tinha.
                return { success: true, migrated: false, setupCompleteStatus: existingUserDataBeforeMigration.initialSetupComplete === true };
            }
            
            // Mantém displayName e dob do Firestore se já existirem e não foram sobrescritos pela migração de userInfo
            dataToMigrate.displayName = dataToMigrate.displayName || existingUserDataBeforeMigration.displayName || '';
            dataToMigrate.dob = dataToMigrate.dob || existingUserDataBeforeMigration.dob || '';
            // Username e email vêm do Auth ou do form de cadastro, já devem estar no existingUserDataBeforeMigration
            if (existingUserDataBeforeMigration.username) dataToMigrate.username = existingUserDataBeforeMigration.username;
            if (existingUserDataBeforeMigration.email) dataToMigrate.email = existingUserDataBeforeMigration.email;
            
            // AJUSTADO: Se estamos migrando dados, consideramos o setup completo.
            console.log("MIGRATE: Dados locais foram processados. Definindo initialSetupComplete como TRUE.");
            dataToMigrate.initialSetupComplete = true; 
            
            dataToMigrate.localDataMigrated = true;
            dataToMigrate.profileLastUpdated = firebase.firestore.FieldValue.serverTimestamp();

            console.log("MIGRATE: Dados FINAIS preparados para Firestore:", JSON.stringify(dataToMigrate, null, 2));
            await db.collection('users').doc(userId).set(dataToMigrate, { merge: true });
            console.log("MIGRATE: Dados do localStorage migrados com sucesso para o Firestore!");

            console.log("MIGRATE: Limpando chaves migradas do localStorage:", migratedKeys);
            migratedKeys.forEach(key => localStorage.removeItem(key));
            
            if (statusMessageEl) { /* ... */ }
            return { success: true, migrated: true, setupCompleteStatus: dataToMigrate.initialSetupComplete };

        } catch (error) { /* ... (tratamento de erro como antes) ... */
            console.error("MIGRATE: ERRO FATAL durante a migração de dados:", error);
            if (statusMessageEl) { statusMessageEl.textContent = 'Erro ao sincronizar. Tente logar novamente.'; statusMessageEl.className = 'erro';}
            try { 
                await db.collection('users').doc(userId).set({ localDataMigrated: true, migrationAttemptError: error.message || "Erro desconhecido", initialSetupComplete: existingUserDataBeforeMigration.initialSetupComplete === true }, { merge: true });
            } catch (e) { console.error("MIGRATE: Erro ao salvar status de erro da migração", e); }
            return { success: false, error: error.message, setupCompleteStatus: existingUserDataBeforeMigration.initialSetupComplete === true };
        }
    }

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("AUTH: Usuário logado (onAuthStateChanged):", user.uid);
            let userJustProcessedByMigration = false;
            let finalInitialSetupCompleteStatus; 
            
            if (statusMessageEl && !statusMessageEl.textContent.includes("sincronizados") && !statusMessageEl.textContent.includes("configurar")) {
                if (statusMessageEl) { statusMessageEl.textContent = 'Verificando perfil...'; statusMessageEl.className = 'info';}
            }
            setUIState(true);

            let userDoc = await db.collection('users').doc(user.uid).get();
            let userData = userDoc.exists ? userDoc.data() : {};
            finalInitialSetupCompleteStatus = userData.initialSetupComplete === true; 

            if (shouldAttemptMigration && userData.localDataMigrated !== true) {
                console.log("AUTH: Fluxo de migração iniciado para UID:", user.uid);
                const migrationResult = await migrateLocalDataToFirestore(user.uid);
                userJustProcessedByMigration = true;
                finalInitialSetupCompleteStatus = migrationResult.setupCompleteStatus === true;
                
                shouldAttemptMigration = false;
                if (window.history.replaceState) {
                    const cleanURL = window.location.protocol + "//" + window.location.host + window.location.pathname;
                    window.history.replaceState({ path: cleanURL }, '', cleanURL);
                }
            }
            
            // MODIFICADO: Agora sempre vai para index.html se estiver logado,
            // pois initialSetupComplete deve ser true após cadastro ou migração.
            if (finalInitialSetupCompleteStatus) {
                 console.log("AUTH: InitialSetupComplete é TRUE. Redirecionando para index.html");
            } else {
                // Este caso só deve ocorrer se o doc do usuário existir mas initialSetupComplete for explicitamente false E não houve migração que o tornasse true.
                // Ou se o documento do usuário não foi encontrado (userData seria {}).
                // Para um novo usuário, o cadastro ou a migração já devem ter definido initialSetupComplete como true.
                console.warn("AUTH: InitialSetupComplete é FALSE ou indefinido. Redirecionando para index.html (conforme pedido de bypass do config-login). Se este é um usuário novo, o cadastro deveria ter setado como true.");
                // Para garantir que vá para index.html, mesmo que algo falhe em setar initialSetupComplete para true na migração/cadastro
                // Se você QUER que vá para config-login.html se initialSetupComplete for false, descomente abaixo:
                // window.location.href = 'config-login.html';
                // return; 
            }

            // Redirecionamento para index.html
            console.log("AUTH: Redirecionando para index.html");
            if (statusMessageEl && (!userJustProcessedByMigration || !statusMessageEl.textContent.includes("sincronizados"))) {
                statusMessageEl.textContent = 'Login bem-sucedido! Redirecionando...';
                statusMessageEl.className = 'sucesso';
            }
            setTimeout(() => { window.location.href = 'index.html'; }, userJustProcessedByMigration ? 2000 : 1200);

        } else {
            console.log("AUTH: Nenhum usuário logado (onAuthStateChanged).");
            setUIState(false);
            showLoginForm(); 
        }
    });

    if (loginFormContainer) {
        // ... (Lógica de login como antes) ...
        loginFormContainer.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginEmailInput.value.trim();
            const password = loginPasswordInput.value.trim();
            if (statusMessageEl) { statusMessageEl.textContent = ''; statusMessageEl.className = '';}
            setUIState(true, 'Entrando...');
            if (email === "" || password === "") {
                if (statusMessageEl) { statusMessageEl.textContent = 'Por favor, preencha e-mail e senha.'; statusMessageEl.className = 'erro'; }
                setUIState(false); return;
            }
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('AUTH: Login com e-mail/senha bem-sucedido:', userCredential.user.uid);
                })
                .catch((error) => {
                    console.error('AUTH-ERROR: Erro no login:', error.code, error.message);
                    let msg = 'Erro ao tentar fazer login.';
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                        msg = 'E-mail ou senha inválidos.';
                    } else if (error.code === 'auth/invalid-email') { msg = 'Formato do e-mail inválido.';}
                    if (statusMessageEl) { statusMessageEl.textContent = msg; statusMessageEl.className = 'erro';}
                    setUIState(false);
                });
        });
    }

    if (signupFormContainer) {
        signupFormContainer.addEventListener('submit', async (e) => {
            e.preventDefault();
            // REMOVIDO: const name = signupNameInput.value.trim();
            const usernameRaw = signupUsernameInput.value.trim();
            const username = usernameRaw.toLowerCase();
            // REMOVIDO: const dob = signupDobInput.value.trim();
            const email = signupEmailInput.value.trim();
            const password = signupPasswordInput.value;
            const confirmPassword = signupConfirmPasswordInput.value;

            if (statusMessageEl) { statusMessageEl.textContent = ''; statusMessageEl.className = ''; }
            if(usernameFeedbackEl) usernameFeedbackEl.textContent = ''; 
            // if(dobFeedbackEl) dobFeedbackEl.textContent = ''; // Campo removido do form

            setUIState(true, 'Cadastrando...');

            // Validações AJUSTADAS
            if (!email || !password || !confirmPassword || !username) { 
                if (statusMessageEl) { statusMessageEl.textContent = 'Preencha @usuário, e-mail, senha e confirmação.'; statusMessageEl.className = 'erro'; }
                setUIState(false); return;
            }
            if (password !== confirmPassword) { /* ... (como antes) ... */
                 if (statusMessageEl) { statusMessageEl.textContent = 'As senhas não coincidem.'; statusMessageEl.className = 'erro'; }
                setUIState(false); signupPasswordInput.focus(); return;
            }
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(usernameRaw)) { /* ... (como antes) ... */
                if(usernameFeedbackEl) usernameFeedbackEl.textContent = 'Usuário: 3-20 caracteres (letras, números, _).';
                if(usernameFeedbackEl) usernameFeedbackEl.className = 'error'; 
                if (statusMessageEl) { statusMessageEl.textContent = 'Dados inválidos.'; statusMessageEl.className = 'erro';}
                setUIState(false); signupUsernameInput.focus(); return;
            }
            // REMOVIDA: Validação de Data de Nascimento (parsedDob)

            // REMOVIDA TEMPORARIAMENTE: Verificação de unicidade do nome de usuário ANTES de criar Auth user
            // try {
            //     const usernameDoc = await db.collection('usernames').doc(username).get();
            //     if (usernameDoc.exists) { /* ... usuário já existe ... */ return; }
            // } catch (error) { /* ... erro ao verificar ... */ return; }

            auth.createUserWithEmailAndPassword(email, password)
                .then(async (userCredential) => { // Adicionado async aqui
                    const user = userCredential.user;
                    console.log('AUTH: Usuário Auth criado:', user.uid);

                    // MODIFICADO: initialUserData agora define initialSetupComplete como TRUE
                    const initialUserData = {
                        displayName: "", // Nome será vazio inicialmente, pode ser pego da migração ou editado no perfil
                        username: username,
                        dob: "",         // Data de nascimento vazia, pode ser pega da migração ou editada
                        email: user.email,
                        photoURL: user.photoURL || '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        initialSetupComplete: true, // <<< MODIFICADO PARA TRUE
                        localDataMigrated: false  // Começa como false, migração pode mudar
                    };
                    const usernameDataForFirestore = {
                        userId: user.uid,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    console.log("--- DEBUG CADASTRO (auth.js): Objeto INICIAL para users collection ---", JSON.stringify(initialUserData, null, 2));
                    
                    const batch = db.batch();
                    batch.set(db.collection('users').doc(user.uid), initialUserData);
                    batch.set(db.collection('usernames').doc(username), usernameDataForFirestore);
                    
                    await batch.commit(); // Espera o batch inicial
                    console.log("FIRESTORE-BATCH: Documento inicial do usuário E username criados!");

                    if (shouldAttemptMigration) {
                        console.log("AUTH: (Cadastro) Chamando migrateLocalDataToFirestore para UID:", user.uid);
                        // migrateLocalDataToFirestore fará .set com merge:true, atualizando initialUserData
                        // e o status de initialSetupComplete pode ser redefinido pela migração.
                        await migrateLocalDataToFirestore(user.uid); 
                    }
                    // onAuthStateChanged tratará o redirecionamento final com base no estado mais recente do Firestore.
                })
                .catch((error) => { /* ... (tratamento de erro como antes) ... */
                    console.error('AUTH/FIRESTORE-ERROR: Erro no processo de cadastro:', error);
                    let msg = 'Erro ao cadastrar.';
                    if (error.code) { 
                        switch (error.code) {
                            case 'auth/email-already-in-use': msg = 'E-mail já em uso.'; signupEmailInput.focus(); break;
                            case 'auth/invalid-email': msg = 'E-mail inválido.'; signupEmailInput.focus(); break;
                            case 'auth/weak-password': msg = 'Senha fraca (mín. 6 caracteres).'; signupPasswordInput.focus(); break;
                            case 'permission-denied': msg = 'Permissão negada ao salvar perfil.'; break;
                            default: msg = `Erro: ${error.code || 'desconhecido'}.`;
                        }
                    }
                    if (statusMessageEl) { statusMessageEl.textContent = msg; statusMessageEl.className = 'erro';}
                    setUIState(false);
                    const currentUserAuth = auth.currentUser; // Pega o usuário recém criado no Auth
                    if (currentUserAuth && error.code !== 'auth/email-already-in-use' && error.code !== 'auth/weak-password' && error.code !== 'auth/invalid-email') {
                         if(error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes("firestore"))) {
                            currentUserAuth.delete().then(() => console.log("AUTH: Usuário Auth órfão deletado.")).catch(delErr => console.error("AUTH: Falha ao deletar Auth órfão:", delErr));
                        }
                    }
                });
        });
    }
    
    if (forgotPasswordLink) { /* ... (Lógica de Esqueci Senha como antes) ... */
        forgotPasswordLink.addEventListener('click', (e) => { 
            e.preventDefault();
            const currentEmail = loginEmailInput.value.trim();
            const emailForPasswordReset = prompt("Por favor, digite seu e-mail para redefinir a senha:", currentEmail);
            if (emailForPasswordReset) {
                if (statusMessageEl) { statusMessageEl.textContent = 'Enviando e-mail...'; statusMessageEl.className = 'info';}
                auth.sendPasswordResetEmail(emailForPasswordReset)
                    .then(() => {
                        if (statusMessageEl) { statusMessageEl.textContent = 'E-mail de redefinição enviado para ' + emailForPasswordReset; statusMessageEl.className = 'sucesso';}
                    })
                    .catch((error) => {
                        console.error('AUTH-ERROR: Erro ao enviar e-mail de redefinição:', error);
                        let msg = 'Erro ao enviar e-mail.';
                        if (error.code === 'auth/user-not-found') { msg = 'Nenhum usuário com este e-mail.';
                        } else if (error.code === 'auth/invalid-email') { msg = 'E-mail inválido.';}
                        if (statusMessageEl) { statusMessageEl.textContent = msg; statusMessageEl.className = 'erro';}
                    });
            }
        });
    }
    
    if(!auth.currentUser) {
        showLoginForm();
    }
});