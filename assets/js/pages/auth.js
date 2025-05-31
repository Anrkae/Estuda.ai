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

    // --- Referências DOM (como antes) ---
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
    const signupNameInput = document.getElementById('signup-name');
    const signupUsernameInput = document.getElementById('signup-username');
    const signupDobInput = document.getElementById('signup-dob');
    const usernameFeedbackEl = document.getElementById('username-feedback');
    const dobFeedbackEl = document.getElementById('dob-feedback');
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

    // --- Funções Utilitárias (data, máscara - como antes) ---
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    function parseAndValidateDdMmYyyy(ds) { /* ... (código como antes) ... */ 
        const m = ds.match(dateRegex); if (!m) return null;
        const d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
        if (y < 1900 || y > new Date().getFullYear() - 5 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
        if ((mo === 4 || mo === 6 || mo === 9 || mo === 11) && d > 30) return null;
        if (mo === 2) { const iL = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0); if (d > (iL ? 29 : 28)) return null; }
        const dt = new Date(y, mo - 1, d);
        return (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) ? null : dt;
    }
    function applyDateMask(inp) { /* ... (código como antes) ... */
        let v = inp.value.replace(/\D/g, ''), fv = '';
        if (v.length > 0) fv += v.substring(0, 2);
        if (v.length >= 3) fv += '/' + v.substring(2, 4);
        if (v.length >= 5) fv += '/' + v.substring(4, 8);
        inp.value = fv.substring(0, 10);
    }
    if(signupDobInput) signupDobInput.addEventListener('input', (e) => applyDateMask(e.target));

    // --- Funções de UI (setUIState, showLoginForm, showSignupForm - como antes) ---
    function setUIState(isLoading, message = '') { /* ... (código como antes) ... */
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
    function showLoginForm(e) { /* ... (código como antes, garantindo limpeza de feedbacks) ... */
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
        if(dobFeedbackEl) dobFeedbackEl.textContent = '';
    }
    function showSignupForm(e) { /* ... (código como antes, garantindo limpeza de feedbacks) ... */
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
        if(dobFeedbackEl) dobFeedbackEl.textContent = '';
    }
    const initialShowSignupLink = document.getElementById('show-signup-link');
    if (initialShowSignupLink) initialShowSignupLink.addEventListener('click', showSignupForm);


    // --- FUNÇÃO DE MIGRAÇÃO ATUALIZADA ---
    async function migrateLocalDataToFirestore(userId) {
        if (!userId) {
            console.error("MIGRATE: UID do usuário não fornecido para migração.");
            return { success: false, error: "UID não fornecido." };
        }
        console.log("MIGRATE: Iniciando migração de dados do localStorage para UID:", userId);
        if (statusMessageEl) {
            statusMessageEl.textContent = 'Sincronizando seus dados locais anteriores...';
            statusMessageEl.className = 'info';
        }

        let dataToMigrate = {};
        let localDataFoundAndProcessed = false;
        const migratedKeys = []; // Para rastrear quais chaves foram lidas e serão removidas

        try {
            // 1. userInfo
            const localUserInfoStr = localStorage.getItem('userInfo');
            if (localUserInfoStr) {
                migratedKeys.push('userInfo');
                const localUserInfo = JSON.parse(localUserInfoStr);
                if (localUserInfo.nome) dataToMigrate.displayName = localUserInfo.nome;
                if (localUserInfo.dob) dataToMigrate.dob = localUserInfo.dob;
                if (localUserInfo.profilePicBase64) dataToMigrate.profilePicBase64 = localUserInfo.profilePicBase64;
                localDataFoundAndProcessed = true;
            }

            // 2. disciplinas
            const localDisciplinasStr = localStorage.getItem('disciplinas');
            if (localDisciplinasStr) {
                migratedKeys.push('disciplinas');
                const localDisciplinasParsed = JSON.parse(localDisciplinasStr);
                if (Array.isArray(localDisciplinasParsed)) {
                    dataToMigrate.disciplinas = localDisciplinasParsed.map(d => ({
                        nome: d.nome || "Disciplina sem nome", // Garante que 'nome' exista
                        topicos: Array.isArray(d.topicos) ? d.topicos : [] // Garante que 'topicos' seja um array
                    })).filter(d => d.nome); // Filtra disciplinas sem nome, se houver
                }
                if (dataToMigrate.disciplinas && dataToMigrate.disciplinas.length > 0) localDataFoundAndProcessed = true;
            }

            // 3. sessoesEstudo
            const localSessoesEstudoStr = localStorage.getItem('sessoesEstudo');
            if (localSessoesEstudoStr) {
                migratedKeys.push('sessoesEstudo');
                let parsedSessoes = JSON.parse(localSessoesEstudoStr);
                if (Array.isArray(parsedSessoes)) {
                    dataToMigrate.sessoesEstudo = parsedSessoes.map(sessao => {
                        if (sessao.data && typeof sessao.data === 'string') {
                            const dateObj = new Date(sessao.data);
                            if (!isNaN(dateObj.getTime())) {
                                return { ...sessao, data: firebase.firestore.Timestamp.fromDate(dateObj) };
                            }
                        }
                        return sessao; // Mantém como está se a data for inválida ou já for outro tipo
                    }).filter(s => s.data); // Remove sessões sem data válida
                }
                if (dataToMigrate.sessoesEstudo && dataToMigrate.sessoesEstudo.length > 0) localDataFoundAndProcessed = true;
            }

            // 4. cronograma
            const localCronogramaStr = localStorage.getItem('cronograma');
            if (localCronogramaStr) {
                migratedKeys.push('cronograma');
                const parsedCronograma = JSON.parse(localCronogramaStr);
                if (typeof parsedCronograma === 'object' && parsedCronograma !== null) {
                    dataToMigrate.schedule = parsedCronograma; // A estrutura já é um objeto/mapa
                    localDataFoundAndProcessed = true;
                }
            }

            // 5. minhasAnotacoes
            const localAnotacoesStr = localStorage.getItem('minhasAnotacoes');
            if (localAnotacoesStr) {
                migratedKeys.push('minhasAnotacoes');
                let parsedAnotacoes = JSON.parse(localAnotacoesStr);
                if (Array.isArray(parsedAnotacoes)) {
                    dataToMigrate.notes = parsedAnotacoes.map(nota => {
                        let { id, titulo, texto, criadoEm, modificadoEm } = nota;
                        if (criadoEm && typeof criadoEm === 'string') criadoEm = firebase.firestore.Timestamp.fromDate(new Date(criadoEm));
                        if (modificadoEm && typeof modificadoEm === 'string') modificadoEm = firebase.firestore.Timestamp.fromDate(new Date(modificadoEm));
                        return { id, titulo, texto, criadoEm, modificadoEm };
                    });
                }
                if (dataToMigrate.notes && dataToMigrate.notes.length > 0) localDataFoundAndProcessed = true;
            }

            // 6. estudaAiSummaries
            const localSummariesStr = localStorage.getItem('estudaAiSummaries');
            if (localSummariesStr) {
                migratedKeys.push('estudaAiSummaries');
                let parsedSummaries = JSON.parse(localSummariesStr);
                if (Array.isArray(parsedSummaries)) {
                    dataToMigrate.summaries = parsedSummaries.map(resumo => ({
                        ...resumo, // Mantém title, summary
                        createdAt: firebase.firestore.FieldValue.serverTimestamp() // Adiciona um timestamp de criação/migração
                    }));
                }
                if (dataToMigrate.summaries && dataToMigrate.summaries.length > 0) localDataFoundAndProcessed = true;
            }

            // Adicione aqui a leitura de outras chaves se necessário

            if (!localDataFoundAndProcessed) {
                console.log("MIGRATE: Nenhum dado local (das chaves monitoradas) encontrado para migrar.");
                await db.collection('users').doc(userId).set({ localDataMigrated: true }, { merge: true });
                return { success: true, migrated: false, setupCompleteStatus: undefined };
            }
            
            // Decidir se initialSetupComplete deve ser true
            // Se o usuário tinha nome, dob e disciplinas, consideramos que sim.
            // Se faltar studyPurpose, config-login.html pode precisar ser visitado para isso.
            if (dataToMigrate.displayName && dataToMigrate.dob && dataToMigrate.disciplinas && dataToMigrate.disciplinas.length > 0) {
                dataToMigrate.initialSetupComplete = true; 
            } else {
                dataToMigrate.initialSetupComplete = false;
            }
            
            dataToMigrate.localDataMigrated = true;
            dataToMigrate.profileLastUpdated = firebase.firestore.FieldValue.serverTimestamp();

            console.log("MIGRATE: Dados preparados para Firestore:", dataToMigrate);
            await db.collection('users').doc(userId).set(dataToMigrate, { merge: true });
            console.log("MIGRATE: Dados do localStorage migrados com sucesso para o Firestore!");

            console.log("MIGRATE: Limpando chaves migradas do localStorage.");
            migratedKeys.forEach(key => localStorage.removeItem(key));
            
            if (statusMessageEl) {
                statusMessageEl.textContent = 'Seus dados locais foram sincronizados com sucesso!';
                statusMessageEl.className = 'sucesso';
            }
            return { success: true, migrated: true, setupCompleteStatus: dataToMigrate.initialSetupComplete };

        } catch (error) {
            console.error("MIGRATE: Erro durante a migração de dados:", error);
            if (statusMessageEl) {
                statusMessageEl.textContent = 'Erro ao sincronizar dados locais. Tente fazer login novamente.';
                statusMessageEl.className = 'erro';
            }
            try {
                await db.collection('users').doc(userId).set({ 
                    localDataMigrated: true, 
                    migrationAttemptError: error.message || "Erro desconhecido" 
                }, { merge: true });
            } catch (e) { console.error("MIGRATE: Erro ao salvar status de erro da migração", e); }
            return { success: false, error: error.message, setupCompleteStatus: undefined };
        }
    }

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("AUTH: Usuário logado (onAuthStateChanged):", user.uid);
            let userJustProcessedByMigration = false;
            let finalInitialSetupCompleteStatus; // Para armazenar o status após qualquer migração

            if (statusMessageEl && !statusMessageEl.textContent.includes("sincronizados") && !statusMessageEl.textContent.includes("configurar")) {
                if (statusMessageEl) { statusMessageEl.textContent = 'Verificando perfil...'; statusMessageEl.className = 'info';}
            }
            setUIState(true);

            let userDoc = await db.collection('users').doc(user.uid).get();
            let userData = userDoc.exists ? userDoc.data() : {};
            finalInitialSetupCompleteStatus = userData.initialSetupComplete === true; // Pega o status atual

            if (shouldAttemptMigration && userData.localDataMigrated !== true) {
                console.log("AUTH: Tentando migrar dados para UID:", user.uid);
                const migrationResult = await migrateLocalDataToFirestore(user.uid);
                userJustProcessedByMigration = true;
                if (migrationResult.success && typeof migrationResult.setupCompleteStatus !== 'undefined') {
                    finalInitialSetupCompleteStatus = migrationResult.setupCompleteStatus; // Atualiza com o status da migração
                }
                shouldAttemptMigration = false;
                if (window.history.replaceState) {
                    const cleanURL = window.location.protocol + "//" + window.location.host + window.location.pathname;
                    window.history.replaceState({ path: cleanURL }, '', cleanURL);
                }
            }
            
            if (finalInitialSetupCompleteStatus) {
                console.log("AUTH: Configuração inicial completa. Redirecionando para index.html");
                if (statusMessageEl && (!userJustProcessedByMigration || !statusMessageEl.textContent.includes("sincronizados"))) {
                    statusMessageEl.textContent = 'Login bem-sucedido! Redirecionando...';
                    statusMessageEl.className = 'sucesso';
                }
                setTimeout(() => { window.location.href = 'index.html'; }, userJustProcessedByMigration ? 2500 : 1500);
            } else {
                console.log("AUTH: Configuração inicial pendente. Redirecionando para config-login.html");
                 if (statusMessageEl && (!userJustProcessedByMigration || !statusMessageEl.textContent.includes("sincronizados"))) {
                    statusMessageEl.textContent = 'Bem-vindo! Vamos configurar seu perfil...';
                    statusMessageEl.className = 'info';
                }
                setTimeout(() => { window.location.href = 'config-login.html'; }, userJustProcessedByMigration ? 2500 : 1500);
            }
        } else {
            console.log("AUTH: Nenhum usuário logado (onAuthStateChanged).");
            setUIState(false);
            showLoginForm(); 
        }
    });

    // --- Lógica de Login (como antes) ---
    if (loginFormContainer) {
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
                    // onAuthStateChanged fará o resto, incluindo chamar migração se 'shouldAttemptMigration'
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

    // --- Lógica de Cadastro (como antes, incluindo criação de users e usernames docs) ---
    if (signupFormContainer) {
        signupFormContainer.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = signupNameInput.value.trim();
            const usernameRaw = signupUsernameInput.value.trim();
            const username = usernameRaw.toLowerCase();
            const dob = signupDobInput.value.trim();
            const email = signupEmailInput.value.trim();
            const password = signupPasswordInput.value;
            const confirmPassword = signupConfirmPasswordInput.value;

            if (statusMessageEl) { statusMessageEl.textContent = ''; statusMessageEl.className = ''; }
            if(usernameFeedbackEl) usernameFeedbackEl.textContent = ''; 
            if(dobFeedbackEl) dobFeedbackEl.textContent = '';
            setUIState(true, 'Verificando e cadastrando...');

            if (!email || !password || !confirmPassword || !username || !dob) { /* ... validações ... */ 
                if (statusMessageEl) { statusMessageEl.textContent = 'Preencha todos os campos obrigatórios.'; statusMessageEl.className = 'erro'; }
                setUIState(false); return;
            }
            if (password !== confirmPassword) { /* ... senhas não coincidem ... */
                if (statusMessageEl) { statusMessageEl.textContent = 'As senhas não coincidem.'; statusMessageEl.className = 'erro'; }
                setUIState(false); signupPasswordInput.focus(); return;
            }
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(usernameRaw)) { /* ... username inválido ... */
                if(usernameFeedbackEl) usernameFeedbackEl.textContent = 'Usuário: 3-20 caracteres (letras, números, _).';
                if(usernameFeedbackEl) usernameFeedbackEl.className = 'error'; 
                if (statusMessageEl) { statusMessageEl.textContent = 'Dados inválidos.'; statusMessageEl.className = 'erro';}
                setUIState(false); signupUsernameInput.focus(); return;
            }
            const parsedDob = parseAndValidateDdMmYyyy(dob);
            if (!parsedDob) { /* ... dob inválido ... */
                if(dobFeedbackEl) dobFeedbackEl.textContent = 'Data de nasc. inválida (dd/mm/aaaa) ou idade < 5 anos.';
                if(dobFeedbackEl) dobFeedbackEl.className = 'error'; 
                if (statusMessageEl) {statusMessageEl.textContent = 'Dados inválidos.'; statusMessageEl.className = 'erro';}
                setUIState(false); signupDobInput.focus(); return;
            }
            
            try {
                const usernameDoc = await db.collection('usernames').doc(username).get();
                if (usernameDoc.exists) { /* ... username já existe ... */
                    if(usernameFeedbackEl) usernameFeedbackEl.textContent = `O @${usernameRaw} já está em uso.`;
                    if(usernameFeedbackEl) usernameFeedbackEl.className = 'error'; 
                    if (statusMessageEl) { statusMessageEl.textContent = 'Usuário indisponível.'; statusMessageEl.className = 'erro';}
                    setUIState(false); signupUsernameInput.focus(); return;
                }
            } catch (error) { /* ... erro ao verificar username ... */
                console.error("AUTH-ERROR: Erro ao verificar username:", error);
                if (statusMessageEl) { statusMessageEl.textContent = 'Erro ao verificar @usuário.'; statusMessageEl.className = 'erro'; }
                setUIState(false); return;
            }

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log('AUTH: Usuário Auth criado:', user.uid);
                    const userDataForFirestore = {
                        displayName: name || '', username: username, dob: dob, email: user.email,
                        photoURL: user.photoURL || '', createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        initialSetupComplete: false // Novos usuários sempre começam com setup incompleto
                    };
                    const usernameDataForFirestore = {
                        userId: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    const batch = db.batch();
                    batch.set(db.collection('users').doc(user.uid), userDataForFirestore);
                    batch.set(db.collection('usernames').doc(username), usernameDataForFirestore);
                    return batch.commit();
                })
                .then(() => {
                    console.log("FIRESTORE-BATCH: Documento do usuário E username criados!");
                    // onAuthStateChanged e a lógica de migração (se shouldAttemptMigration) cuidarão do resto
                })
                .catch((error) => { /* ... (tratamento de erro como antes, incluindo delete de usuário órfão) ... */
                    console.error('AUTH/FIRESTORE-ERROR: Erro no cadastro/batch:', error);
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
                    const currentUserAuth = auth.currentUser;
                    if (currentUserAuth && error.code !== 'auth/email-already-in-use' && error.code !== 'auth/weak-password' && error.code !== 'auth/invalid-email') {
                         if(error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes("firestore"))) {
                            currentUserAuth.delete().then(() => console.log("AUTH: Usuário Auth órfão deletado.")).catch(delErr => console.error("AUTH: Falha ao deletar Auth órfão:", delErr));
                        }
                    }
                });
        });
    }
    
    // --- Lógica de Esqueci Senha (como antes) ---
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => { /* ... (código como antes) ... */
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