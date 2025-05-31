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

    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    function parseAndValidateDdMmYyyy(ds) {
        const m = ds.match(dateRegex); if (!m) return null;
        const d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
        if (y < 1900 || y > new Date().getFullYear() - 5 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
        if ((mo === 4 || mo === 6 || mo === 9 || mo === 11) && d > 30) return null;
        if (mo === 2) { const iL = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0); if (d > (iL ? 29 : 28)) return null; }
        const dt = new Date(y, mo - 1, d);
        return (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) ? null : dt;
    }
    function applyDateMask(inp) {
        let v = inp.value.replace(/\D/g, ''), fv = '';
        if (v.length > 0) fv += v.substring(0, 2);
        if (v.length >= 3) fv += '/' + v.substring(2, 4);
        if (v.length >= 5) fv += '/' + v.substring(4, 8);
        inp.value = fv.substring(0, 10);
    }
    if(signupDobInput) {
        signupDobInput.addEventListener('input', (e) => applyDateMask(e.target));
    }

    function setUIState(isLoading, message = '') {
        if(loginButton) loginButton.disabled = isLoading;
        if(signupButton) signupButton.disabled = isLoading;
        
        if (isLoading) {
            if(loginButton) loginButton.textContent = 'Aguarde...';
            if(signupButton) signupButton.textContent = 'Aguarde...';
            if (message && statusMessageEl) {
                statusMessageEl.textContent = message;
                statusMessageEl.className = 'info';
            }
        } else {
            if(loginButton) loginButton.textContent = 'Entrar';
            if(signupButton) signupButton.textContent = 'Cadastrar';
        }
    }
    
    function showLoginForm(e) {
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

    function showSignupForm(e) {
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

            // 1. userInfo
            const localUserInfoStr = localStorage.getItem('userInfo');
            console.log("MIGRATE DEBUG: localUserInfoStr:", localUserInfoStr);
            if (localUserInfoStr) {
                migratedKeys.push('userInfo');
                try {
                    const localUserInfo = JSON.parse(localUserInfoStr);
                    console.log("MIGRATE DEBUG: localUserInfo parseado:", localUserInfo);
                    if (localUserInfo.nome) dataToMigrate.displayName = localUserInfo.nome;
                    if (localUserInfo.dob) dataToMigrate.dob = localUserInfo.dob;
                    if (localUserInfo.profilePicBase64) dataToMigrate.profilePicBase64 = localUserInfo.profilePicBase64;
                    localDataFoundAndProcessed = true;
                } catch (e) { console.error("MIGRATE DEBUG: Erro ao parsear userInfo:", e); }
            }

            // 2. disciplinas
            const localDisciplinasStr = localStorage.getItem('disciplinas');
            console.log("MIGRATE DEBUG: localDisciplinasStr:", localDisciplinasStr);
            if (localDisciplinasStr) {
                migratedKeys.push('disciplinas');
                try {
                    const localDisciplinasParsed = JSON.parse(localDisciplinasStr);
                    console.log("MIGRATE DEBUG: localDisciplinasParsed:", localDisciplinasParsed);
                    if (Array.isArray(localDisciplinasParsed)) {
                        dataToMigrate.disciplinas = localDisciplinasParsed.map(d => ({
                            nome: d.nome || "Disciplina Indefinida",
                            topicos: Array.isArray(d.topicos) ? d.topicos : []
                        })).filter(d => d.nome && d.nome !== "Disciplina Indefinida");
                    }
                    if (dataToMigrate.disciplinas && dataToMigrate.disciplinas.length > 0) localDataFoundAndProcessed = true;
                    console.log("MIGRATE DEBUG: dataToMigrate.disciplinas (processado):", dataToMigrate.disciplinas);
                } catch (e) { console.error("MIGRATE DEBUG: Erro ao parsear disciplinas:", e); }
            }

            // 3. sessoesEstudo
            const localSessoesEstudoStr = localStorage.getItem('sessoesEstudo');
            console.log("MIGRATE DEBUG: localSessoesEstudoStr:", localSessoesEstudoStr);
            if (localSessoesEstudoStr) {
                migratedKeys.push('sessoesEstudo');
                try {
                    let parsedSessoes = JSON.parse(localSessoesEstudoStr);
                    console.log("MIGRATE DEBUG: parsedSessoes (cru):", JSON.stringify(parsedSessoes));
                    if (Array.isArray(parsedSessoes)) {
                        dataToMigrate.sessoesEstudo = parsedSessoes.map((sessao, index) => {
                            console.log(`MIGRATE DEBUG: Processando sessão ${index} (crua do parse):`, JSON.stringify(sessao));
                            let dataProcessada = null;
                            if (sessao.data && typeof sessao.data === 'string') {
                                const dateObj = new Date(sessao.data);
                                if (!isNaN(dateObj.getTime())) {
                                    dataProcessada = firebase.firestore.Timestamp.fromDate(dateObj);
                                } else {
                                    console.warn(`MIGRATE DEBUG: Sessão ${index}, FALHA ao converter string data para JS Date:`, sessao.data);
                                }
                            } else {
                                console.warn(`MIGRATE DEBUG: Sessão ${index}, campo 'data' não era string ou não existia:`, sessao.data);
                            }
                            const tempoNum = parseInt(sessao.tempo, 10);
                            const questoesNum = parseInt(sessao.questoes, 10);
                            const acertosNum = parseInt(sessao.acertos, 10);
                            console.log(`MIGRATE DEBUG: Sessão ${index}, tempo: ${sessao.tempo} -> ${tempoNum}, questoes: ${sessao.questoes} -> ${questoesNum}, acertos: ${sessao.acertos} -> ${acertosNum}`);
                            return {
                                disciplina: sessao.disciplina || "Indefinida",
                                tempo: !isNaN(tempoNum) ? tempoNum : 0,
                                questoes: !isNaN(questoesNum) ? questoesNum : 0,
                                acertos: !isNaN(acertosNum) ? acertosNum : 0,
                                data: dataProcessada
                            };
                        }).filter(s => s.data !== null); 
                        console.log("MIGRATE DEBUG: dataToMigrate.sessoesEstudo (APÓS map e filter):", JSON.stringify(dataToMigrate.sessoesEstudo));
                    } else {
                        console.warn("MIGRATE DEBUG: sessoesEstudo do localStorage não é um array após parse.");
                        dataToMigrate.sessoesEstudo = [];
                    }
                    if (dataToMigrate.sessoesEstudo && dataToMigrate.sessoesEstudo.length > 0) {
                        localDataFoundAndProcessed = true;
                    } else if (Array.isArray(parsedSessoes) && parsedSessoes.length > 0) {
                        console.warn("MIGRATE DEBUG: Nenhuma sessão de estudo válida (provavelmente por falha na data) para migrar após processamento.");
                        if (!dataToMigrate.sessoesEstudo) dataToMigrate.sessoesEstudo = [];
                    }
                } catch (e) { 
                    console.error("MIGRATE DEBUG: Erro CRÍTICO ao parsear ou processar sessoesEstudo:", e); 
                    dataToMigrate.sessoesEstudo = [];
                }
            } else {
                console.log("MIGRATE DEBUG: Chave 'sessoesEstudo' não encontrada ou vazia no localStorage.");
            }

            // 4. cronograma
            const localCronogramaStr = localStorage.getItem('cronograma');
            console.log("MIGRATE DEBUG: localCronogramaStr:", localCronogramaStr);
            if (localCronogramaStr) {
                migratedKeys.push('cronograma');
                try {
                    const parsedCronograma = JSON.parse(localCronogramaStr);
                    console.log("MIGRATE DEBUG: parsedCronograma:", parsedCronograma);
                    if (typeof parsedCronograma === 'object' && parsedCronograma !== null && Object.keys(parsedCronograma).length > 0) {
                        dataToMigrate.schedule = parsedCronograma;
                        localDataFoundAndProcessed = true;
                    } else { dataToMigrate.schedule = {}; }
                } catch (e) { console.error("MIGRATE DEBUG: Erro ao parsear cronograma:", e); dataToMigrate.schedule = {};}
            }

            // 5. minhasAnotacoes
            const localAnotacoesStr = localStorage.getItem('minhasAnotacoes');
            console.log("MIGRATE DEBUG: localAnotacoesStr:", localAnotacoesStr);
            if (localAnotacoesStr) {
                migratedKeys.push('minhasAnotacoes');
                try {
                    let parsedAnotacoes = JSON.parse(localAnotacoesStr);
                    console.log("MIGRATE DEBUG: parsedAnotacoes (cru):", parsedAnotacoes);
                    if (Array.isArray(parsedAnotacoes)) {
                        dataToMigrate.notes = parsedAnotacoes.map(nota => {
                            let { id, titulo, texto, criadoEm, modificadoEm } = nota;
                            if (criadoEm && typeof criadoEm === 'string') criadoEm = firebase.firestore.Timestamp.fromDate(new Date(criadoEm)); else if (criadoEm) criadoEm = null;
                            if (modificadoEm && typeof modificadoEm === 'string') modificadoEm = firebase.firestore.Timestamp.fromDate(new Date(modificadoEm)); else if (modificadoEm) modificadoEm = null;
                            return { id: id || `nota_${Date.now()}`, titulo: titulo || "", texto: texto || "", criadoEm, modificadoEm };
                        });
                    } else { dataToMigrate.notes = []; }
                    if (dataToMigrate.notes && dataToMigrate.notes.length > 0) localDataFoundAndProcessed = true;
                } catch (e) { console.error("MIGRATE DEBUG: Erro ao parsear minhasAnotacoes:", e); dataToMigrate.notes = [];}
            }

            // 6. estudaAiSummaries
            const localSummariesStr = localStorage.getItem('estudaAiSummaries');
            console.log("MIGRATE DEBUG: localSummariesStr:", localSummariesStr);
            if (localSummariesStr) {
                migratedKeys.push('estudaAiSummaries');
                try {
                    let parsedSummaries = JSON.parse(localSummariesStr);
                    console.log("MIGRATE DEBUG: parsedSummaries (cru):", parsedSummaries);
                    if (Array.isArray(parsedSummaries)) {
                        dataToMigrate.summaries = parsedSummaries.map(resumo => ({
                            title: resumo.title || "",
                            summary: resumo.summary || "",
                            createdAt: firebase.firestore.FieldValue.serverTimestamp() 
                        }));
                    } else { dataToMigrate.summaries = []; }
                    if (dataToMigrate.summaries && dataToMigrate.summaries.length > 0) localDataFoundAndProcessed = true;
                } catch (e) { console.error("MIGRATE DEBUG: Erro ao parsear estudaAiSummaries:", e); dataToMigrate.summaries = [];}
            }

            if (!localDataFoundAndProcessed) {
                console.log("MIGRATE: Nenhum dado local (das chaves monitoradas) encontrado ou processado para migrar.");
                await db.collection('users').doc(userId).set({ 
                    localDataMigrated: true, 
                    initialSetupComplete: existingUserDataBeforeMigration.initialSetupComplete === true 
                }, { merge: true });
                return { success: true, migrated: false, setupCompleteStatus: existingUserDataBeforeMigration.initialSetupComplete === true };
            }
            
            dataToMigrate.displayName = dataToMigrate.displayName || existingUserDataBeforeMigration.displayName || '';
            dataToMigrate.dob = dataToMigrate.dob || existingUserDataBeforeMigration.dob || '';
            if (existingUserDataBeforeMigration.username) dataToMigrate.username = existingUserDataBeforeMigration.username;
            if (existingUserDataBeforeMigration.email) dataToMigrate.email = existingUserDataBeforeMigration.email;

            if (dataToMigrate.displayName && dataToMigrate.dob && dataToMigrate.disciplinas && dataToMigrate.disciplinas.length > 0) {
                dataToMigrate.initialSetupComplete = true; 
            } else {
                dataToMigrate.initialSetupComplete = false;
            }
            
            dataToMigrate.localDataMigrated = true;
            dataToMigrate.profileLastUpdated = firebase.firestore.FieldValue.serverTimestamp();

            console.log("MIGRATE: Dados FINAIS preparados para Firestore:", JSON.stringify(dataToMigrate, null, 2));
            await db.collection('users').doc(userId).set(dataToMigrate, { merge: true });
            console.log("MIGRATE: Dados do localStorage migrados com sucesso para o Firestore!");

            console.log("MIGRATE: Limpando chaves migradas do localStorage:", migratedKeys);
            migratedKeys.forEach(key => localStorage.removeItem(key));
            
            if (statusMessageEl) {
                statusMessageEl.textContent = 'Seus dados locais foram sincronizados com sucesso!';
                statusMessageEl.className = 'sucesso';
            }
            return { success: true, migrated: true, setupCompleteStatus: dataToMigrate.initialSetupComplete };

        } catch (error) {
            console.error("MIGRATE: ERRO FATAL durante a migração de dados:", error);
            if (statusMessageEl) {
                statusMessageEl.textContent = 'Erro ao sincronizar dados locais. Tente fazer login novamente.';
                statusMessageEl.className = 'erro';
            }
            try { 
                await db.collection('users').doc(userId).set({ 
                    localDataMigrated: true, 
                    migrationAttemptError: error.message || "Erro desconhecido",
                    initialSetupComplete: existingUserDataBeforeMigration.initialSetupComplete === true 
                }, { merge: true });
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
                console.log("AUTH: Tentando migrar dados para UID:", user.uid);
                const migrationResult = await migrateLocalDataToFirestore(user.uid);
                userJustProcessedByMigration = true;
                finalInitialSetupCompleteStatus = migrationResult.setupCompleteStatus === true;
                
                shouldAttemptMigration = false; // Previne nova tentativa na mesma sessão de página
                if (window.history.replaceState) { // Limpa o ?migrate=true da URL
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

            if (!email || !password || !confirmPassword || !username || !dob) { 
                if (statusMessageEl) { statusMessageEl.textContent = 'Preencha todos os campos obrigatórios.'; statusMessageEl.className = 'erro'; }
                setUIState(false); return;
            }
            if (password !== confirmPassword) { 
                if (statusMessageEl) { statusMessageEl.textContent = 'As senhas não coincidem.'; statusMessageEl.className = 'erro'; }
                setUIState(false); signupPasswordInput.focus(); return;
            }
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(usernameRaw)) { 
                if(usernameFeedbackEl) usernameFeedbackEl.textContent = 'Usuário: 3-20 caracteres (letras, números, _).';
                if(usernameFeedbackEl) usernameFeedbackEl.className = 'error'; 
                if (statusMessageEl) { statusMessageEl.textContent = 'Dados inválidos.'; statusMessageEl.className = 'erro';}
                setUIState(false); signupUsernameInput.focus(); return;
            }
            const parsedDob = parseAndValidateDdMmYyyy(dob);
            if (!parsedDob) { 
                if(dobFeedbackEl) dobFeedbackEl.textContent = 'Data de nasc. inválida (dd/mm/aaaa) ou idade < 5 anos.';
                if(dobFeedbackEl) dobFeedbackEl.className = 'error'; 
                if (statusMessageEl) {statusMessageEl.textContent = 'Dados inválidos.'; statusMessageEl.className = 'erro';}
                setUIState(false); signupDobInput.focus(); return;
            }
            
            try {
                const usernameDoc = await db.collection('usernames').doc(username).get();
                if (usernameDoc.exists) { 
                    if(usernameFeedbackEl) usernameFeedbackEl.textContent = `O @${usernameRaw} já está em uso.`;
                    if(usernameFeedbackEl) usernameFeedbackEl.className = 'error'; 
                    if (statusMessageEl) { statusMessageEl.textContent = 'Usuário indisponível.'; statusMessageEl.className = 'erro';}
                    setUIState(false); signupUsernameInput.focus(); return;
                }
            } catch (error) { 
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
                        initialSetupComplete: false 
                    };
                    const usernameDataForFirestore = {
                        userId: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    console.log("--- DEBUG CADASTRO (auth.js): Objeto para users collection ---", JSON.stringify(userDataForFirestore, null, 2));
                    console.log("--- DEBUG CADASTRO (auth.js): Objeto para usernames collection ---", JSON.stringify(usernameDataForFirestore, null, 2));
                    
                    const batch = db.batch();
                    batch.set(db.collection('users').doc(user.uid), userDataForFirestore);
                    batch.set(db.collection('usernames').doc(username), usernameDataForFirestore);
                    return batch.commit();
                })
                .then(() => {
                    console.log("FIRESTORE-BATCH: Documento do usuário E username criados!");
                })
                .catch((error) => { 
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
    
    if (forgotPasswordLink) {
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