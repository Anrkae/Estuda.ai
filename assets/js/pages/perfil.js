document.addEventListener('DOMContentLoaded', () => {
    console.log("Script perfil.js: DOMContentLoaded iniciado");

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
    let currentUser = null;
    let currentUID = null;

    const profilePicElement = document.getElementById('profile-pic');
    const profileNameElement = document.getElementById('profile-name');
    const profileUsernameElement = document.getElementById('profile-username');
    const profileDobElement = document.getElementById('profile-dob');
    const logoutButton = document.getElementById('logout-button');
    const profileErrorMessageDiv = document.getElementById('profile-error-message');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const resetDataBtn = document.getElementById('reset-data-btn');
    const resetStatusEl = document.getElementById('reset-status');
    const modalResetOverlay = document.getElementById('modalConfirmacaoResetOverlay');
    const modalConfirmarResetBtn = document.getElementById('modalBotaoConfirmarReset');
    const modalCancelarResetBtn = document.getElementById('modalBotaoCancelarReset');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const modalEditOverlay = document.getElementById('modalEditProfileOverlay');
    const editProfileForm = document.getElementById('edit-profile-form');
    const editProfilePicPreview = document.getElementById('edit-profile-pic-preview');
    const editProfilePicInput = document.getElementById('edit-profile-pic-input');
    const editProfileNameInput = document.getElementById('edit-profile-name-input');
    const editProfileUsernameInput = document.getElementById('edit-profile-username-input');
    const editProfileDobInput = document.getElementById('edit-profile-dob-input');
    const editAgeDisplay = document.getElementById('edit-age-display');
    const editProfileStatus = document.getElementById('edit-profile-status');
    const cancelProfileEditBtn = document.getElementById('cancel-profile-edit-btn');
    const saveProfileChangesBtn = document.getElementById('save-profile-changes-btn');

    const modalSincronizacaoNecessariaOverlay = document.getElementById('modalSincronizacaoNecessariaOverlay');
    const modalBotaoIrParaLoginSinc = document.getElementById('modalBotaoIrParaLoginSinc');
    const modalBotaoContinuarSemSincronizar = document.getElementById('modalBotaoContinuarSemSincronizar');

    let newProfilePicBase64 = null;

    const dateRegexForFormat = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    function parseAndValidateDdMmYyyy(dateString) {
        if (!dateString) return null;
        const match = dateString.match(dateRegexForFormat); if (!match) return null;
        const day = parseInt(match[1], 10); const month = parseInt(match[2], 10); const year = parseInt(match[3], 10);
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear || month < 1 || month > 12 || day < 1 || day > 31) {
             if(year === currentYear && month <= (new Date().getMonth() +1) && day <= new Date().getDate()){}
             else if (year > currentYear || (year === currentYear && month > new Date().getMonth() + 1) || (year === currentYear && month === new Date().getMonth() + 1 && day > new Date().getDate())) {
                return null; 
             }
        }
        if ((month === 4 || month === 6 || month === 9 || month === 11) && day > 30) return null;
        if (month === 2) { const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0); if (day > (isLeap ? 29 : 28)) return null; }
        const dateObj = new Date(Date.UTC(year, month - 1, day));
        if (dateObj.getUTCFullYear() !== year || dateObj.getUTCMonth() !== month - 1 || dateObj.getUTCDate() !== day) return null;
        return dateObj;
    }
    function formatDatePtBr(dateObj) {
        if (!dateObj || isNaN(dateObj.getTime())) return "";
        return dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    }
    function applyDateMask(inputElement) {
        let value = inputElement.value.replace(/\D/g, ''); let formattedValue = '';
        if (value.length > 0) formattedValue += value.substring(0, 2);
        if (value.length >= 3) formattedValue += '/' + value.substring(2, 4);
        if (value.length >= 5) formattedValue += '/' + value.substring(4, 8);
        inputElement.value = formattedValue.substring(0, 10);
    }
    function calculateAgeFromDate(birthDateObj) {
        if (!birthDateObj || isNaN(birthDateObj.getTime())) return { age: null, error: "Data inválida" };
        const today = new Date();
        const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const birthDateUtc = new Date(Date.UTC(birthDateObj.getUTCFullYear(), birthDateObj.getUTCMonth(), birthDateObj.getUTCDate()));
        if (birthDateUtc > todayUtc) return { age: null, error: "Data futura" };
        let age = todayUtc.getUTCFullYear() - birthDateUtc.getUTCFullYear();
        const monthDiff = todayUtc.getUTCMonth() - birthDateUtc.getUTCMonth();
        if (monthDiff < 0 || (monthDiff === 0 && todayUtc.getUTCDate() < birthDateUtc.getUTCDate())) age--;
        return { age: Math.max(0, age), error: null };
    }

    if (tabButtons.length > 0 && tabContents.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTabId = button.getAttribute('data-tab');
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                const targetContent = document.getElementById(targetTabId);
                if (targetContent) targetContent.classList.add('active');
            });
        });
        if(tabButtons.length > 0 && !document.querySelector('.tab-button.active')) {
             if (tabButtons[0]) tabButtons[0].click();
        }
    }

    function checkForLocalData() {
        if (localStorage.getItem('userInfo') || localStorage.getItem('disciplinas')) {
            console.log("PERFIL: Dados locais encontrados no localStorage.");
            return true;
        }
        console.log("PERFIL: Nenhum dado local relevante encontrado no localStorage.");
        return false;
    }

    function loadProfileData() {
        // ... (função loadProfileData como na sua última versão, sem alterações aqui)
        if (!currentUID) {
            console.error("PERFIL: UID do usuário não disponível para carregar dados.");
            if(profileErrorMessageDiv) {
                profileErrorMessageDiv.textContent = "Usuário não autenticado. Faça login para ver seu perfil.";
                profileErrorMessageDiv.style.display = 'block';
            }
            if(editProfileBtn) editProfileBtn.disabled = true;
            const defaultPic = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";
            if(profilePicElement) profilePicElement.src = defaultPic;
            if(profileNameElement) profileNameElement.textContent = "N/A";
            if(profileUsernameElement) profileUsernameElement.textContent = "@N/A";
            if(profileDobElement) profileDobElement.textContent = "N/A";
            return;
        }
        console.log("PERFIL: Carregando dados do Firestore para UID:", currentUID);
        const defaultPic = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";
        db.collection('users').doc(currentUID).get()
            .then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    console.log("PERFIL: Dados do Firestore carregados:", userData);
                    if (profileNameElement) profileNameElement.textContent = userData.displayName || "Nome não definido";
                    if (profileUsernameElement && userData.username) {
                        profileUsernameElement.textContent = `@${userData.username}`;
                    } else if (profileUsernameElement) {
                        profileUsernameElement.textContent = "@usuário não definido";
                    }
                    if (profileDobElement) {
                        const birthDateObj = userData.dob ? parseAndValidateDdMmYyyy(userData.dob) : null;
                        profileDobElement.textContent = birthDateObj ? formatDatePtBr(birthDateObj) : "Não informada";
                    }
                    if (profilePicElement) {
                        profilePicElement.src = userData.profilePicBase64 || userData.photoURL || defaultPic;
                        profilePicElement.onerror = () => { if(profilePicElement) profilePicElement.src = defaultPic; };
                    }
                    if(editProfileBtn) editProfileBtn.disabled = false;
                    if(profileErrorMessageDiv) profileErrorMessageDiv.style.display = 'none';
                } else {
                    console.warn("PERFIL: Documento do usuário não encontrado no Firestore para UID:", currentUID);
                    if (profileNameElement) profileNameElement.textContent = "Complete seu perfil";
                    if (profileUsernameElement) profileUsernameElement.textContent = "@?";
                    if (profileDobElement) profileDobElement.textContent = "-";
                    if (profilePicElement) profilePicElement.src = defaultPic;
                    if(profileErrorMessageDiv) {
                        profileErrorMessageDiv.textContent = "Parece que seu perfil não foi completamente configurado.";
                        profileErrorMessageDiv.style.display = 'block';
                    }
                    if(editProfileBtn) editProfileBtn.disabled = false;
                }
            })
            .catch((error) => {
                console.error("PERFIL: Erro ao carregar dados do Firestore:", error);
                if(profileErrorMessageDiv) {
                    profileErrorMessageDiv.textContent = "Erro ao carregar perfil do servidor.";
                    profileErrorMessageDiv.style.display = 'block';
                }
                if(editProfileBtn) editProfileBtn.disabled = true;
            });
    }

    // --- Listener Principal de Autenticação ---
    auth.onAuthStateChanged(async (user) => { // Adicionado async
        if (user) {
            currentUser = user;
            currentUID = user.uid;
            console.log("PERFIL: Usuário está logado (onAuthStateChanged):", currentUID);
            
            try {
                const userDoc = await db.collection('users').doc(currentUID).get();
                const userData = userDoc.exists ? userDoc.data() : {};

                if (checkForLocalData() && userData.localDataMigrated !== true) {
                    console.warn("PERFIL: Usuário logado, dados locais existem, e 'localDataMigrated' não é true.");
                    const querMigrar = confirm("Encontramos dados de estudo salvos localmente neste navegador que parecem não estar sincronizados com sua conta online. Deseja ir para a página de login para tentar sincronizá-los agora?");
                    
                    if (querMigrar) {
                        alert("Você será redirecionado para a página de autenticação para concluir a sincronização. Por favor, faça login novamente lá.");
                        // Adiciona um delay para o alert ser visto antes do redirect
                        setTimeout(() => {
                            window.location.href = `login.html?migrate=true&uid=${currentUID}`;
                        }, 500);
                        return; // Interrompe a execução adicional de loadProfileData aqui, pois haverá redirecionamento
                    } else {
                        console.log("PERFIL: Usuário logado optou por NÃO migrar dados locais agora. Marcando para não perguntar novamente.");
                        await db.collection('users').doc(currentUID).set({ 
                            localDataMigrated: true, 
                            migrationDeclinedTimestamp: firebase.firestore.FieldValue.serverTimestamp() 
                        }, { merge: true });
                        console.log("PERFIL: Marcado no Firestore para não perguntar sobre migração local novamente.");
                        loadProfileData(); // Carrega o perfil do Firestore (sem os dados locais não migrados)
                    }
                } else {
                    // Condição normal: ou não há dados locais, ou já foram migrados/decisão tomada.
                    loadProfileData(); 
                }
            } catch (error) {
                console.error("PERFIL: Erro crítico ao buscar perfil do Firestore em onAuthStateChanged:", error);
                loadProfileData(); // Tenta carregar o que puder, mesmo com erro no estado de migração
            }
            if(editProfileBtn) editProfileBtn.disabled = false;

        } else { // Usuário NÃO está logado no Firebase
            currentUser = null;
            currentUID = null;
            console.log("PERFIL: Nenhum usuário Firebase logado.");
            if (checkForLocalData()) {
                console.log("PERFIL: Usuário não logado no Firebase, mas dados locais existem. Mostrando modal de sincronização.");
                if (modalSincronizacaoNecessariaOverlay) {
                    modalSincronizacaoNecessariaOverlay.classList.add('show');
                }
            } else {
                console.log("PERFIL: Nenhum usuário Firebase e nenhum dado local. Redirecionando para login.html");
                if(profileErrorMessageDiv) {
                     profileErrorMessageDiv.textContent = "Você não está logado. Redirecionando...";
                     profileErrorMessageDiv.className = 'info';
                     profileErrorMessageDiv.style.display = 'block';
                }
                setTimeout(() => { window.location.href = 'login.html'; }, 1500);
            }
            // Limpa UI e desabilita edição
            if(profilePicElement) profilePicElement.src = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";
            if(profileNameElement) profileNameElement.textContent = "N/A";
            if(profileUsernameElement) profileUsernameElement.textContent = "@N/A";
            if(profileDobElement) profileDobElement.textContent = "N/A";
            if(editProfileBtn) editProfileBtn.disabled = true;
        }
    });

    // Listeners para o modal de sincronização (se o usuário não está logado no Firebase)
    if (modalSincronizacaoNecessariaOverlay && modalBotaoIrParaLoginSinc && modalBotaoContinuarSemSincronizar) {
        modalBotaoIrParaLoginSinc.addEventListener('click', () => {
            window.location.href = 'login.html?migrate=true';
        });
        modalBotaoContinuarSemSincronizar.addEventListener('click', () => {
            modalSincronizacaoNecessariaOverlay.classList.remove('show');
            console.log("PERFIL: Usuário optou por continuar sem sincronizar por enquanto (estava deslogado do Firebase).");
            alert("Seus dados não estão salvos na nuvem e podem ser perdidos. Para proteger seu progresso, recomendamos criar uma conta ou fazer login.");
            if(profileErrorMessageDiv) {
                profileErrorMessageDiv.textContent = "Você está usando o modo offline. Seu progresso não será salvo na nuvem.";
                profileErrorMessageDiv.className = 'info'; // Pode ser uma classe 'warning'
                profileErrorMessageDiv.style.display = 'block';
            }
            if(editProfileBtn) editProfileBtn.disabled = true;
        });
    }
    
    // ... (Restante do seu perfil.js: funções de edição de perfil, modais, reset de dados, etc. - como na sua última versão completa)
    // As funções openEditProfileModal, closeEditProfileModal, listeners de edição, reset, etc. permanecem as mesmas.
    // Certifique-se de que as funções de validação de data e máscara também estão aqui.

    // Lógica do Botão Sair (Logout Firebase)
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            console.log("PERFIL: Botão Sair clicado. Fazendo logout do Firebase...");
            auth.signOut().then(() => {
                console.log('PERFIL: Logout do Firebase bem-sucedido.');
                window.location.href = 'login.html'; 
            }).catch((error) => {
                console.error('PERFIL: Erro ao fazer logout do Firebase:', error);
                if(profileErrorMessageDiv) {
                    profileErrorMessageDiv.textContent = "Erro ao tentar sair. Tente novamente.";
                    profileErrorMessageDiv.style.display = 'block';
                }
            });
        });
    }

    // Lógica do Modal de Edição de Perfil (Salvar no Firestore)
    if (editProfileBtn) editProfileBtn.addEventListener('click', openEditProfileModal);
    
    if (cancelProfileEditBtn) cancelProfileEditBtn.addEventListener('click', closeEditProfileModal);
    
    if (modalEditOverlay) {
        modalEditOverlay.addEventListener('click', (event) => {
            if (event.target === modalEditOverlay) closeEditProfileModal();
        });
    }

    if (editProfileDobInput && editAgeDisplay) {
        editProfileDobInput.addEventListener('input', (e) => {
            applyDateMask(e.target);
            const dobValue = e.target.value; let displayMessage = ''; let displayClass = '';
            if (dobValue.length === 10) {
                const birthDateObj = parseAndValidateDdMmYyyy(dobValue);
                if (birthDateObj) {
                    const { age, error } = calculateAgeFromDate(birthDateObj);
                    if (error) { displayMessage = error === "Data futura" ? 'Data não pode ser futura' : 'Data inválida'; displayClass = 'invalid';}
                    else if (age !== null) { displayMessage = `Idade: ${age} ${age === 1 ? 'ano' : 'anos'}`; displayClass = ''; }
                    else { displayMessage = 'Erro ao calcular idade'; displayClass = 'invalid';}
                } else { displayMessage = 'Formato de data inválido'; displayClass = 'invalid';}
            } else if (dobValue.length > 0) { displayMessage = 'Digite data completa'; displayClass = '';}
            else { displayMessage = ''; displayClass = '';}
            if (editAgeDisplay) {
                editAgeDisplay.textContent = displayMessage;
                editAgeDisplay.className = displayClass;
            }
        });
    }

    if (editProfilePicInput && editProfilePicPreview && editProfileStatus) {
        editProfilePicInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if(editProfileStatus) {editProfileStatus.textContent = ''; editProfileStatus.style.display = 'none';}
            newProfilePicBase64 = null;
            if (file && file.type.startsWith('image/')) {
                const maxSizeMB = 2;
                if (file.size > maxSizeMB * 1024 * 1024) {
                    if(editProfileStatus) {editProfileStatus.textContent = `Imagem grande (máx ${maxSizeMB}MB).`; editProfileStatus.style.display = 'block';}
                    editProfilePicInput.value = ''; return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    newProfilePicBase64 = e.target.result; 
                    if(editProfilePicPreview) editProfilePicPreview.src = newProfilePicBase64;
                }
                reader.onerror = (e) => {
                    console.error("Erro ao ler arquivo:", e); 
                    if(editProfileStatus) {editProfileStatus.textContent = "Erro ao processar imagem."; editProfileStatus.style.display = 'block';}
                    newProfilePicBase64 = null;
                }
                reader.readAsDataURL(file);
            } else if (file) {
                if(editProfileStatus) {editProfileStatus.textContent = "Selecione um arquivo de imagem válido."; editProfileStatus.style.display = 'block';}
                if (editProfilePicInput) editProfilePicInput.value = '';
            }
        });
    }

    if (editProfileForm && saveProfileChangesBtn && editProfileStatus) {
        editProfileForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!currentUID) {
                editProfileStatus.textContent = "Erro: Usuário não autenticado.";
                editProfileStatus.style.display = 'block'; return;
            }
            editProfileStatus.textContent = 'Salvando...'; 
            editProfileStatus.className = 'info'; 
            editProfileStatus.style.display = 'block';
            saveProfileChangesBtn.disabled = true; saveProfileChangesBtn.textContent = 'Salvando...';

            const newName = editProfileNameInput.value.trim();
            const newDob = editProfileDobInput.value;

            if (!newName || newName.length < 2) {
                editProfileStatus.textContent = "Nome inválido."; editProfileStatus.className = 'error';
                editProfileNameInput.focus(); saveProfileChangesBtn.disabled = false; saveProfileChangesBtn.textContent = 'Salvar Alterações'; return;
            }
            const birthDateObj = parseAndValidateDdMmYyyy(newDob);
            if (!birthDateObj) {
                editProfileStatus.textContent = "Data de nascimento inválida."; editProfileStatus.className = 'error';
                editProfileDobInput.focus(); saveProfileChangesBtn.disabled = false; saveProfileChangesBtn.textContent = 'Salvar Alterações'; return;
            }
            const { error: dateError } = calculateAgeFromDate(birthDateObj);
            if (dateError) {
                editProfileStatus.textContent = "Data de nascimento não pode ser futura."; editProfileStatus.className = 'error';
                editProfileDobInput.focus(); saveProfileChangesBtn.disabled = false; saveProfileChangesBtn.textContent = 'Salvar Alterações'; return;
            }

            const dataToUpdate = {
                displayName: newName,
                dob: newDob,
                profileLastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (newProfilePicBase64) {
                dataToUpdate.profilePicBase64 = newProfilePicBase64;
            }

            db.collection('users').doc(currentUID).set(dataToUpdate, { merge: true })
                .then(() => {
                    if (currentUser && newName !== currentUser.displayName) {
                         currentUser.updateProfile({ displayName: newName })
                            .then(() => console.log("PERFIL: DisplayName do Firebase Auth atualizado."))
                            .catch(err => console.error("PERFIL: Erro ao atualizar displayName Auth:", err));
                    }
                    loadProfileData(); 
                    closeEditProfileModal();
                    if (profileErrorMessageDiv) {
                        profileErrorMessageDiv.textContent = "Perfil atualizado com sucesso!";
                        profileErrorMessageDiv.className = 'success';
                        profileErrorMessageDiv.style.display = 'block';
                        setTimeout(() => {
                            if (profileErrorMessageDiv) {
                                profileErrorMessageDiv.textContent = '';
                                profileErrorMessageDiv.style.display = 'none';
                                profileErrorMessageDiv.className = '';
                            }
                        }, 3000);
                    }
                })
                .catch((error) => {
                    console.error("PERFIL-ERROR: Erro ao salvar no Firestore:", error);
                    editProfileStatus.textContent = "Erro ao salvar. Tente novamente.";
                    if (error.code === 'permission-denied') {
                        editProfileStatus.textContent = "Permissão negada.";
                    }
                    editProfileStatus.className = 'error'; 
                    editProfileStatus.style.display = 'block';
                })
                .finally(() => {
                    saveProfileChangesBtn.disabled = false;
                    saveProfileChangesBtn.textContent = 'Salvar Alterações';
                });
        });
    }

    // Lógica do Reset de Dados Opcionais
    function resetOptionalData() {
        if(!resetStatusEl) { console.error("Elemento reset-status não encontrado."); return; }
        if(!currentUID) { 
            resetStatusEl.textContent = 'Usuário não logado.'; resetStatusEl.className = 'error'; 
            if (resetStatusEl) resetStatusEl.style.display = 'inline-block'; return;
        }
        resetStatusEl.textContent = 'Processando reset...';
        resetStatusEl.className = 'info'; 
        if (resetStatusEl) resetStatusEl.style.display = 'inline-block';

        const firestoreFieldsToReset = {
            disciplinas: [], studyPurpose: '',
            profileLastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            // Adicione outros campos do Firestore para resetar aqui, se necessário
        };

        db.collection('users').doc(currentUID).update(firestoreFieldsToReset)
            .then(() => {
                console.log("PERFIL: Campos (disciplinas, studyPurpose) do Firestore resetados.");
                const localStorageKeysToRemove = ['cronograma', 'sessoesEstudo', /* Adicione outras chaves locais aqui */];
                localStorageKeysToRemove.forEach(key => { if (localStorage.getItem(key)) localStorage.removeItem(key); });
                if(resetStatusEl) { resetStatusEl.textContent = 'Dados de progresso resetados!'; resetStatusEl.className = 'success';}
                loadProfileData(); 
            })
            .catch(error => {
                console.error("PERFIL-ERROR: Erro ao resetar dados no Firestore:", error);
                if(resetStatusEl) { resetStatusEl.textContent = 'Erro ao resetar dados no servidor.'; resetStatusEl.className = 'error';}
            })
            .finally(() => {
                setTimeout(() => {
                    if(resetStatusEl) { resetStatusEl.textContent = ''; resetStatusEl.className = ''; resetStatusEl.style.display = 'none';}
                }, 5000);
            });
    }

    if (resetDataBtn) resetDataBtn.addEventListener('click', () => {if(modalResetOverlay) modalResetOverlay.classList.add('show');});
    if (modalCancelarResetBtn) modalCancelarResetBtn.addEventListener('click', () => {if(modalResetOverlay) modalResetOverlay.classList.remove('show');});
    if (modalConfirmarResetBtn) {
        modalConfirmarResetBtn.addEventListener('click', () => {
            if(modalResetOverlay) modalResetOverlay.classList.remove('show'); 
            resetOptionalData();      
        });
    }
    if (modalResetOverlay) {
        modalResetOverlay.addEventListener('click', (event) => {
            if (event.target === modalResetOverlay) {if(modalResetOverlay) modalResetOverlay.classList.remove('show');}
        });
    }
    
    console.log("Script perfil.js: Configuração finalizada, aguardando estado de autenticação.");
});