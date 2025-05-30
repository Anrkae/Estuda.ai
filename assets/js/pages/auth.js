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
        if (loginButton) loginButton.disabled = isLoading;
        if (signupButton) signupButton.disabled = isLoading;
        
        if (isLoading) {
            if (loginButton) loginButton.textContent = 'Aguarde...';
            if (signupButton) signupButton.textContent = 'Aguarde...';
            if (message && statusMessageEl) {
                statusMessageEl.textContent = message;
                statusMessageEl.className = 'info';
            }
        } else {
            if (loginButton) loginButton.textContent = 'Entrar';
            if (signupButton) signupButton.textContent = 'Cadastrar';
        }
    }
    
    function showLoginForm(e) {
        if(e) e.preventDefault();
        if (authTitle) authTitle.textContent = 'Entrar';
        if (authDescription) authDescription.textContent = 'Acesse sua conta para continuar.';
        if (loginFormContainer) loginFormContainer.style.display = 'block';
        if (loginFormContainer) loginFormContainer.classList.add('active-form');
        if (signupFormContainer) signupFormContainer.style.display = 'none';
        if (signupFormContainer) signupFormContainer.classList.remove('active-form');
        if (toggleMessageParagraph) toggleMessageParagraph.innerHTML = 'Não tem uma conta? <a href="#" id="show-signup-link-dynamic">Cadastre-se</a>';
        
        const dynSignupLink = document.getElementById('show-signup-link-dynamic');
        if(dynSignupLink) dynSignupLink.addEventListener('click', showSignupForm);
        
        if(!e && statusMessageEl) { statusMessageEl.textContent = ''; statusMessageEl.className = ''; }
        if(usernameFeedbackEl) usernameFeedbackEl.textContent = ''; 
        if(dobFeedbackEl) dobFeedbackEl.textContent = '';
    }

    function showSignupForm(e) {
        if(e) e.preventDefault();
        if (authTitle) authTitle.textContent = 'Criar Conta';
        if (authDescription) authDescription.textContent = 'Preencha os dados para se cadastrar.';
        if (signupFormContainer) signupFormContainer.style.display = 'block';
        if (signupFormContainer) signupFormContainer.classList.add('active-form');
        if (loginFormContainer) loginFormContainer.style.display = 'none';
        if (loginFormContainer) loginFormContainer.classList.remove('active-form');
        if (toggleMessageParagraph) toggleMessageParagraph.innerHTML = 'Já tem uma conta? <a href="#" id="show-login-link-dynamic">Faça Login</a>';
        
        const dynLoginLink = document.getElementById('show-login-link-dynamic');
        if(dynLoginLink) dynLoginLink.addEventListener('click', showLoginForm);

        if(!e && statusMessageEl) { statusMessageEl.textContent = ''; statusMessageEl.className = ''; }
        if(usernameFeedbackEl) usernameFeedbackEl.textContent = ''; 
        if(dobFeedbackEl) dobFeedbackEl.textContent = '';
    }
    const initialShowSignupLink = document.getElementById('show-signup-link');
    if (initialShowSignupLink) initialShowSignupLink.addEventListener('click', showSignupForm);

    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("AUTH: Usuário logado (onAuthStateChanged):", user.uid);
            if (statusMessageEl) {
                statusMessageEl.textContent = 'Verificando perfil...';
                statusMessageEl.className = 'info';
            }
            setUIState(true);
            db.collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists && doc.data().initialSetupComplete === true) {
                        console.log("AUTH: Configuração inicial completa. Redirecionando para index.html");
                        if (statusMessageEl) {
                            statusMessageEl.textContent = 'Login bem-sucedido! Redirecionando...';
                            statusMessageEl.className = 'sucesso';
                        }
                        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
                    } else {
                        console.log("AUTH: Configuração inicial pendente ou doc não encontrado. Redirecionando para config-login.html");
                        if (statusMessageEl) {
                            statusMessageEl.textContent = 'Bem-vindo! Vamos configurar seu perfil...';
                            statusMessageEl.className = 'info';
                        }
                        setTimeout(() => { window.location.href = 'config-login.html'; }, 1000);
                    }
                })
                .catch((error) => {
                    console.error("AUTH: Erro ao buscar dados do usuário no Firestore:", error);
                    if (statusMessageEl) {
                        statusMessageEl.textContent = 'Erro ao verificar perfil. Tente novamente.';
                        statusMessageEl.className = 'erro';
                    }
                    setUIState(false); 
                });
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
                if (statusMessageEl) {
                    statusMessageEl.textContent = 'Por favor, preencha todos os campos obrigatórios.';
                    statusMessageEl.className = 'erro'; 
                }
                setUIState(false); return;
            }
            if (password !== confirmPassword) {
                if (statusMessageEl) {
                    statusMessageEl.textContent = 'As senhas não coincidem.';
                    statusMessageEl.className = 'erro'; 
                }
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
            console.log("Nome (displayName):", name || '');
            console.log("Username (para users e usernames):", username);
            console.log("Data de Nascimento (dob):", dob);
            console.log("Email (para users):", email);

            try {
                const usernameDoc = await db.collection('usernames').doc(username).get();
                if (usernameDoc.exists) {
                    if(usernameFeedbackEl) usernameFeedbackEl.textContent = `O @usuário "${usernameRaw}" já está em uso. Escolha outro.`;
                    if(usernameFeedbackEl) usernameFeedbackEl.className = 'error'; 
                    if (statusMessageEl) { statusMessageEl.textContent = 'Usuário indisponível.'; statusMessageEl.className = 'erro';}
                    setUIState(false); signupUsernameInput.focus(); return;
                }
            } catch (error) {
                console.error("AUTH-ERROR: Erro ao verificar nome de usuário no Firestore:", error);
                if (statusMessageEl) {
                    statusMessageEl.textContent = 'Erro ao verificar @usuário. Tente novamente.';
                    statusMessageEl.className = 'erro'; 
                }
                setUIState(false); return;
            }

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log('AUTH: Usuário cadastrado com sucesso no Firebase Auth:', user.uid);

                    const userDataForFirestore = {
                        displayName: name || '',
                        username: username,
                        dob: dob,
                        email: user.email,
                        photoURL: user.photoURL || '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        initialSetupComplete: false
                    };
                    const usernameDataForFirestore = {
                        userId: user.uid,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    console.log("--- DEBUG CADASTRO: Objeto para users collection ---");
                    console.log(JSON.stringify(userDataForFirestore, null, 2));
                    console.log("--- DEBUG CADASTRO: Objeto para usernames collection ---");
                    console.log(JSON.stringify(usernameDataForFirestore, null, 2));
                    
                    const batch = db.batch();
                    const userDocRef = db.collection('users').doc(user.uid);
                    batch.set(userDocRef, userDataForFirestore);
                    const usernameDocRef = db.collection('usernames').doc(username);
                    batch.set(usernameDocRef, usernameDataForFirestore);
                    
                    return batch.commit();
                })
                .then(() => {
                    console.log("FIRESTORE-BATCH: Documento do usuário E username reservado com sucesso!");
                })
                .catch((error) => { // Captura erros do createUserWithEmailAndPassword OU do batch.commit()
                    console.error('AUTH/FIRESTORE-ERROR: Erro no cadastro ou ao salvar no Firestore:', error);
                    let mensagemErro = 'Ocorreu um erro ao tentar cadastrar.';
                    if (error.code) {
                        switch (error.code) {
                            case 'auth/email-already-in-use':
                                mensagemErro = 'Este e-mail já está em uso por outra conta.';
                                signupEmailInput.focus();
                                break;
                            case 'auth/invalid-email':
                                mensagemErro = 'O formato do e-mail é inválido.';
                                signupEmailInput.focus();
                                break;
                            case 'auth/weak-password':
                                mensagemErro = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
                                signupPasswordInput.focus();
                                break;
                            case 'permission-denied':
                                mensagemErro = 'Permissão negada ao salvar dados do perfil. Verifique as regras de segurança do Firestore.';
                                break;
                            default:
                                if (error.message && error.message.toLowerCase().includes("firestore")) {
                                     mensagemErro = `Erro ao salvar perfil no Firestore.`; // Removido error.message para não expor detalhes demais
                                } else {
                                     mensagemErro = `Erro no cadastro: ${error.code || 'desconhecido'}.`;
                                }
                        }
                    }
                    if (statusMessageEl) {
                        statusMessageEl.textContent = mensagemErro;
                        statusMessageEl.className = 'erro';
                    }
                    setUIState(false);

                    const currentUser = auth.currentUser;
                     // Se o usuário Auth foi criado mas o Firestore falhou (exceto por validações de Auth como email-em-uso)
                    if (currentUser && error.code !== 'auth/email-already-in-use' && error.code !== 'auth/weak-password' && error.code !== 'auth/invalid-email') {
                         if(error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes("firestore"))) {
                            currentUser.delete().then(() => {
                                console.log("AUTH: Usuário órfão deletado após falha no Firestore.");
                            }).catch(deleteError => {
                                console.error("AUTH: Falha ao deletar usuário órfão:", deleteError);
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
                if (statusMessageEl) {
                    statusMessageEl.textContent = 'Enviando e-mail...';
                    statusMessageEl.className = 'info';
                }
                auth.sendPasswordResetEmail(emailForPasswordReset)
                    .then(() => {
                        if (statusMessageEl) {
                            statusMessageEl.textContent = 'E-mail de redefinição de senha enviado para ' + emailForPasswordReset;
                            statusMessageEl.className = 'sucesso';
                        }
                    })
                    .catch((error) => {
                        console.error('AUTH-ERROR: Erro ao enviar e-mail de redefinição:', error);
                        let mensagemErro = 'Erro ao enviar e-mail de redefinição.';
                        if (error.code === 'auth/user-not-found') {
                           mensagemErro = 'Nenhum usuário encontrado com este e-mail.';
                        } else if (error.code === 'auth/invalid-email') {
                            mensagemErro = 'O formato do e-mail é inválido.';
                        }
                        if (statusMessageEl) {
                            statusMessageEl.textContent = mensagemErro;
                            statusMessageEl.className = 'erro';
                        }
                    });
            }
        });
    }
    
    if(!auth.currentUser) {
        showLoginForm();
    }
});