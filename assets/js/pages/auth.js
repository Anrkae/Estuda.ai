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
            return { success: false, error: "UID não fornecido." };
        }
        console.log("MIGRATE: Iniciando tentativa de migração de dados do localStorage para UID:", userId);
        if (statusMessageEl) {
            statusMessageEl.textContent = 'Sincronizando seus dados locais anteriores...';
            statusMessageEl.className = 'info';
        }

        try {
            const localUserInfoStr = localStorage.getItem('userInfo');
            const localDisciplinasStr = localStorage.getItem('disciplinas');
            // Adicione aqui outras chaves do localStorage que você quer migrar:
            // const localSessoesEstudoStr = localStorage.getItem('sessoesEstudo');
            // const localCronogramaStr = localStorage.getItem('cronograma');

            let dataToMigrate = {};
            let localDataFound = false;

            if (localUserInfoStr) {
                const localUserInfo = JSON.parse(localUserInfoStr);
                if (localUserInfo.nome) dataToMigrate.displayName = localUserInfo.nome;
                if (localUserInfo.dob) dataToMigrate.dob = localUserInfo.dob;
                if (localUserInfo.profilePicBase64) dataToMigrate.profilePicBase64 = localUserInfo.profilePicBase64;
                localDataFound = true;
            }

            if (localDisciplinasStr) {
                const localDisciplinas = JSON.parse(localDisciplinasStr);
                if (Array.isArray(localDisciplinas)) {
                    // Se suas disciplinas no localStorage eram objetos {nome: '...', topicos: []}
                    // e você quer salvar apenas os nomes no Firestore (como em config-login.js)
                    dataToMigrate.disciplinas = localDisciplinas.map(d => typeof d === 'string' ? d : d.nome).filter(Boolean);
                    // Se já eram um array de strings:
                    // dataToMigrate.disciplinas = localDisciplinas.filter(d => typeof d === 'string');
                }
                if (dataToMigrate.disciplinas && dataToMigrate.disciplinas.length > 0) localDataFound = true;
            }
            
            // Exemplo para outras chaves:
            // if (localSessoesEstudoStr) { dataToMigrate.sessoesEstudo = JSON.parse(localSessoesEstudoStr); localDataFound = true; }
            // if (localCronogramaStr) { dataToMigrate.cronograma = JSON.parse(localCronogramaStr); localDataFound = true; }

            if (!localDataFound) {
                console.log("MIGRATE: Nenhum dado local encontrado no localStorage para migrar.");
                await db.collection('users').doc(userId).set({ localDataMigrated: true, initialSetupComplete: false }, { merge: true });
                return { success: true, migrated: false }; // Sucesso, mas nada foi migrado
            }

            // Se dados básicos de perfil foram migrados, consideramos o setup inicial completo.
            // Se o seu `config-login.html` ainda coleta dados essenciais não presentes no localStorage (ex: studyPurpose),
            // você pode querer manter initialSetupComplete: false aqui para forçar a passagem por lá.
            if (dataToMigrate.displayName && dataToMigrate.dob && dataToMigrate.disciplinas && dataToMigrate.disciplinas.length > 0) {
                dataToMigrate.initialSetupComplete = true;
            } else {
                dataToMigrate.initialSetupComplete = false; // Força passagem por config-login se dados essenciais faltam
            }
            
            dataToMigrate.localDataMigrated = true;
            dataToMigrate.profileLastUpdated = firebase.firestore.FieldValue.serverTimestamp();

            console.log("MIGRATE: Dados preparados para Firestore:", dataToMigrate);

            await db.collection('users').doc(userId).set(dataToMigrate, { merge: true });
            console.log("MIGRATE: Dados do localStorage migrados com sucesso para o Firestore!");

            if (localUserInfoStr) localStorage.removeItem('userInfo');
            if (localDisciplinasStr) localStorage.removeItem('disciplinas');
            // if (localSessoesEstudoStr) localStorage.removeItem('sessoesEstudo');
            // if (localCronogramaStr) localStorage.removeItem('cronograma');
            
            if (statusMessageEl) {
                statusMessageEl.textContent = 'Seus dados locais foram sincronizados com sucesso!';
                statusMessageEl.className = 'sucesso';
            }
            return { success: true, migrated: true, setupComplete: dataToMigrate.initialSetupComplete };

        } catch (error) {
            console.error("MIGRATE: Erro durante a migração de dados:", error);
            if (statusMessageEl) {
                statusMessageEl.textContent = 'Erro ao sincronizar dados locais. Alguns dados podem não ter sido salvos.';
                statusMessageEl.className = 'erro';
            }
            try { // Tenta marcar que a migração foi tentada mesmo com erro
                await db.collection('users').doc(userId).set({ localDataMigrated: true, migrationError: error.message || "Erro desconhecido" }, { merge: true });
            } catch (e) { console.error("MIGRATE: Erro ao salvar status de erro da migração", e); }
            return { success: false, error: error.message };
        }
    }


    auth.onAuthStateChanged(async (user) => { // Adicionado async aqui
        if (user) {
            console.log("AUTH: Usuário logado (onAuthStateChanged):", user.uid);
            if (statusMessageEl && !statusMessageEl.textContent.includes("Sincronizando")) { // Evita sobrescrever msg de migração
                statusMessageEl.textContent = 'Verificando perfil...';
                statusMessageEl.className = 'info';
            }
            setUIState(true); // Desabilita botões enquanto processa

            // Verifica se a migração precisa ser feita e se já foi feita
            let userDoc = await db.collection('users').doc(user.uid).get();
            let userData = userDoc.exists ? userDoc.data() : {};

            if (shouldAttemptMigration && userData.localDataMigrated !== true) {
                const migrationResult = await migrateLocalDataToFirestore(user.uid);
                // Após a migração, recarrega os dados do usuário para ter o estado mais atual
                if (migrationResult.success) {
                    userDoc = await db.collection('users').doc(user.uid).get(); // Recarrega
                    userData = userDoc.exists ? userDoc.data() : {};
                }
                shouldAttemptMigration = false; // Evita tentar de novo na mesma sessão de página
                // Remove o parâmetro da URL para não tentar de novo em um refresh simples
                if (window.history.replaceState) {
                    const cleanURL = window.location.protocol + "//" + window.location.host + window.location.pathname;
                    window.history.replaceState({ path: cleanURL }, '', cleanURL);
                }
            }

            if (userData.initialSetupComplete === true) {
                console.log("AUTH: Configuração inicial completa. Redirecionando para index.html");
                if (statusMessageEl && !statusMessageEl.textContent.includes("sincronizados")) {
                    statusMessageEl.textContent = 'Login bem-sucedido! Redirecionando...';
                    statusMessageEl.className = 'sucesso';
                }
                setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            } else {
                console.log("AUTH: Configuração inicial pendente ou doc não encontrado. Redirecionando para config-login.html");
                 if (statusMessageEl && !statusMessageEl.textContent.includes("sincronizados") && !statusMessageEl.textContent.includes("configurar")) {
                    statusMessageEl.textContent = 'Bem-vindo! Vamos configurar seu perfil...';
                    statusMessageEl.className = 'info';
                }
                setTimeout(() => { window.location.href = 'config-login.html'; }, 1500);
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
                if (statusMessageEl) {
                    statusMessageEl.textContent = 'Por favor, preencha e-mail e senha.';
                    statusMessageEl.className = 'erro';
                }
                setUIState(false); return;
            }
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('AUTH: Login com e-mail/senha bem-sucedido:', userCredential.user.uid);
                    // onAuthStateChanged e a lógica de migração (se shouldAttemptMigration for true) cuidarão do resto
                })
                .catch((error) => {
                    console.error('AUTH-ERROR: Erro no login com e-mail/senha:', error.code, error.message);
                    let mensagemErro = 'Ocorreu um erro ao tentar fazer login.';
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                        mensagemErro = 'E-mail ou senha inválidos.';
                    } else if (error.code === 'auth/invalid-email') {
                        mensagemErro = 'O formato do e-mail é inválido.';
                    }
                    if (statusMessageEl) {
                        statusMessageEl.textContent = mensagemErro;
                        statusMessageEl.className = 'erro';
                    }
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
                if (statusMessageEl) { statusMessageEl.textContent = 'Por favor, preencha todos os campos obrigatórios.'; statusMessageEl.className = 'erro'; }
                setUIState(false); return;
            }
            if (password !== confirmPassword) {
                if (statusMessageEl) { statusMessageEl.textContent = 'As senhas não coincidem.'; statusMessageEl.className = 'erro'; }
                setUIState(false); signupPasswordInput.focus(); return;
            }
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(usernameRaw)) {
                if(usernameFeedbackEl) usernameFeedbackEl.textContent = 'Usuário deve ter 3-20 caracteres (letras, números, _).';
                if(usernameFeedbackEl) usernameFeedbackEl.className = 'error'; 
                if (statusMessageEl) { statusMessageEl.textContent = 'Dados inválidos.'; statusMessageEl.className = 'erro';}
                setUIState(false); signupUsernameInput.focus(); return;
            }
            const parsedDob = parseAndValidateDdMmYyyy(dob);
            if (!parsedDob) {
                if(dobFeedbackEl) dobFeedbackEl.textContent = 'Data de nascimento inválida (dd/mm/aaaa) ou idade menor que 5 anos.';
                if(dobFeedbackEl) dobFeedbackEl.className = 'error'; 
                if (statusMessageEl) {statusMessageEl.textContent = 'Dados inválidos.'; statusMessageEl.className = 'erro';}
                setUIState(false); signupDobInput.focus(); return;
            }
            
            console.log("--- DEBUG CADASTRO: Dados ANTES da verificação de username ---");
            console.log("Nome (displayName):", name || ''); console.log("Username:", username);
            console.log("Data de Nascimento (dob):", dob); console.log("Email:", email);

            try {
                const usernameDoc = await db.collection('usernames').doc(username).get();
                if (usernameDoc.exists) {
                    if(usernameFeedbackEl) usernameFeedbackEl.textContent = `O @usuário "${usernameRaw}" já está em uso.`;
                    if(usernameFeedbackEl) usernameFeedbackEl.className = 'error'; 
                    if (statusMessageEl) { statusMessageEl.textContent = 'Usuário indisponível.'; statusMessageEl.className = 'erro';}
                    setUIState(false); signupUsernameInput.focus(); return;
                }
            } catch (error) {
                console.error("AUTH-ERROR: Erro ao verificar nome de usuário no Firestore:", error);
                if (statusMessageEl) { statusMessageEl.textContent = 'Erro ao verificar @usuário. Tente novamente.'; statusMessageEl.className = 'erro'; }
                setUIState(false); return;
            }

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log('AUTH: Usuário cadastrado com sucesso no Firebase Auth:', user.uid);

                    const userDataForFirestore = {
                        displayName: name || '', username: username, dob: dob, email: user.email,
                        photoURL: user.photoURL || '', createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        initialSetupComplete: false
                    };
                    const usernameDataForFirestore = {
                        userId: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    console.log("--- DEBUG CADASTRO: Objeto para users collection ---", JSON.stringify(userDataForFirestore, null, 2));
                    console.log("--- DEBUG CADASTRO: Objeto para usernames collection ---", JSON.stringify(usernameDataForFirestore, null, 2));
                    
                    const batch = db.batch();
                    const userDocRef = db.collection('users').doc(user.uid);
                    batch.set(userDocRef, userDataForFirestore);
                    const usernameDocRef = db.collection('usernames').doc(username);
                    batch.set(usernameDocRef, usernameDataForFirestore);
                    
                    return batch.commit();
                })
                .then(() => {
                    console.log("FIRESTORE-BATCH: Documento do usuário E username reservado com sucesso!");
                    // A migração será chamada pelo onAuthStateChanged se shouldAttemptMigration for true
                })
                .catch((error) => {
                    console.error('AUTH/FIRESTORE-ERROR: Erro no cadastro ou ao salvar no Firestore:', error);
                    let mensagemErro = 'Ocorreu um erro ao tentar cadastrar.';
                    if (error.code) {
                        switch (error.code) {
                            case 'auth/email-already-in-use': mensagemErro = 'Este e-mail já está em uso.'; signupEmailInput.focus(); break;
                            case 'auth/invalid-email': mensagemErro = 'O formato do e-mail é inválido.'; signupEmailInput.focus(); break;
                            case 'auth/weak-password': mensagemErro = 'A senha é fraca (mínimo 6 caracteres).'; signupPasswordInput.focus(); break;
                            case 'permission-denied': mensagemErro = 'Permissão negada ao salvar perfil. Verifique as regras.'; break;
                            default: mensagemErro = `Erro no cadastro: ${error.code || 'desconhecido'}.`;
                        }
                    }
                    if (statusMessageEl) { statusMessageEl.textContent = mensagemErro; statusMessageEl.className = 'erro';}
                    setUIState(false);
                    const currentUserAuth = auth.currentUser; // Pega o usuário recém criado no Auth
                    if (currentUserAuth && error.code !== 'auth/email-already-in-use' && error.code !== 'auth/weak-password' && error.code !== 'auth/invalid-email') {
                         if(error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes("firestore"))) {
                            currentUserAuth.delete().then(() => {
                                console.log("AUTH: Usuário Auth órfão deletado após falha no Firestore.");
                            }).catch(deleteError => {
                                console.error("AUTH: Falha ao deletar usuário Auth órfão:", deleteError);
                            });
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
                        if (statusMessageEl) { statusMessageEl.textContent = 'E-mail de redefinição de senha enviado para ' + emailForPasswordReset; statusMessageEl.className = 'sucesso';}
                    })
                    .catch((error) => {
                        console.error('AUTH-ERROR: Erro ao enviar e-mail de redefinição:', error);
                        let mensagemErro = 'Erro ao enviar e-mail de redefinição.';
                        if (error.code === 'auth/user-not-found') { mensagemErro = 'Nenhum usuário encontrado com este e-mail.';
                        } else if (error.code === 'auth/invalid-email') { mensagemErro = 'O formato do e-mail é inválido.';}
                        if (statusMessageEl) { statusMessageEl.textContent = mensagemErro; statusMessageEl.className = 'erro';}
                    });
            }
        });
    }
    
    if(!auth.currentUser) {
        showLoginForm();
    }
});