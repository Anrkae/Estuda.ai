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
             if(year === currentYear && month <= (new Date().getMonth() +1) && day <= new Date().getDate()){ /* permite data atual */ }
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
                else console.warn(`Conteúdo da aba não encontrado para ID: ${targetTabId}`);
            });
        });
        if(tabButtons.length > 0 && !document.querySelector('.tab-button.active')) {
             if (tabButtons[0]) tabButtons[0].click();
        }
    } else { console.warn("Elementos das abas não encontrados."); }

    function checkForLocalData() {
        if (localStorage.getItem('userInfo') || localStorage.getItem('disciplinas')) {
            console.log("PERFIL: Dados locais encontrados no localStorage.");
            return true;
        }
        console.log("PERFIL: Nenhum dado local relevante encontrado no localStorage.");
        return false;
    }

    function loadProfileData() {
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
                     // Isso pode acontecer se o usuário for autenticado mas a criação do doc falhou,
                     // ou se ele foi para config-login e ainda não salvou.
                    if (profileNameElement) profileNameElement.textContent = "Complete seu perfil";
                    if (profileUsernameElement) profileUsernameElement.textContent = "@?";
                    if (profileDobElement) profileDobElement.textContent = "-";
                    if (profilePicElement) profilePicElement.src = defaultPic;
                    if(profileErrorMessageDiv) {
                        profileErrorMessageDiv.textContent = "Parece que seu perfil não foi completamente configurado.";
                        profileErrorMessageDiv.style.display = 'block';
                    }
                    if(editProfileBtn) editProfileBtn.disabled = false; // Permite editar para criar os dados
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
    } else { console.warn("Botão de logout não encontrado."); }

    function openEditProfileModal() {
        if (!currentUID) { alert("Usuário não autenticado."); return; }
        if(!modalEditOverlay || !editProfileNameInput || !editProfileUsernameInput || !editProfileDobInput || !editProfilePicPreview || !editAgeDisplay || !editProfileStatus) {
             console.error("Elementos do modal de edição não encontrados."); return;
        }

        db.collection('users').doc(currentUID).get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                editProfileNameInput.value = userData.displayName || '';
                editProfileUsernameInput.value = userData.username || '';
                editProfileUsernameInput.disabled = true; 
                editProfileDobInput.value = userData.dob || '';

                if(editAgeDisplay) editAgeDisplay.textContent = '';
                if (userData.dob) {
                    const birthDateObj = parseAndValidateDdMmYyyy(userData.dob);
                    if (birthDateObj) {
                        const { age, error } = calculateAgeFromDate(birthDateObj);
                        if (!error && age !== null && editAgeDisplay) editAgeDisplay.textContent = `Idade: ${age} ${age === 1 ? 'ano' : 'anos'}`;
                    }
                }
                if(editAgeDisplay) editAgeDisplay.className = '';

                const defaultPic = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";
                if(editProfilePicPreview) editProfilePicPreview.src = userData.profilePicBase64 || userData.photoURL || defaultPic;
                newProfilePicBase64 = null;
                if(editProfilePicInput) editProfilePicInput.value = '';
                if(editProfileStatus) {
                    editProfileStatus.textContent = '';
                    editProfileStatus.style.display = 'none';
                }
                if(modalEditOverlay) modalEditOverlay.classList.add('show');
                console.log("PERFIL: Modal de edição aberto com dados do Firestore.");
            } else {
                // Se o documento não existe, ainda pode abrir o modal para criar os dados
                console.warn("PERFIL: Documento do usuário não existe. Abrindo modal para criação de perfil.");
                editProfileNameInput.value = auth.currentUser ? auth.currentUser.displayName || '' : '';
                editProfileUsernameInput.value = ''; // Usuário não tem @username ainda
                editProfileUsernameInput.disabled = true; // Manter desabilitado pois @username é definido no cadastro
                editProfileDobInput.value = '';
                if(editAgeDisplay) editAgeDisplay.textContent = '';
                const defaultPic = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";
                if(editProfilePicPreview) editProfilePicPreview.src = (auth.currentUser ? auth.currentUser.photoURL : '') || defaultPic;
                newProfilePicBase64 = null;
                if(editProfilePicInput) editProfilePicInput.value = '';
                if(editProfileStatus) {
                    editProfileStatus.textContent = 'Complete seu perfil.';
                    editProfileStatus.className = 'info'; // Usar uma classe info para esta mensagem
                    editProfileStatus.style.display = 'block';
                }
                if(modalEditOverlay) modalEditOverlay.classList.add('show');
            }
        }).catch(error => {
            console.error("PERFIL: Erro ao carregar dados para edição:", error);
            alert("Erro ao carregar dados para edição. Tente novamente.");
        });
    }

    function closeEditProfileModal() {
        if (modalEditOverlay) modalEditOverlay.classList.remove('show');
    }

    if (editProfileBtn) editProfileBtn.addEventListener('click', openEditProfileModal);
    else { console.warn("Botão 'Editar Perfil' não encontrado."); }

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
                    console.log("Nova imagem selecionada para preview.");
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
    } else { console.warn("Elementos de upload/preview de imagem não encontrados no modal."); }

    if (editProfileForm && saveProfileChangesBtn && editProfileStatus) {
        editProfileForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!currentUID) {
                editProfileStatus.textContent = "Erro: Usuário não autenticado.";
                editProfileStatus.style.display = 'block'; return;
            }
            console.log("PERFIL: Tentando salvar alterações do perfil...");
            editProfileStatus.textContent = 'Salvando...'; 
            editProfileStatus.className = 'info'; // Classe para 'salvando'
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
                console.log("PERFIL: Salvando com nova foto de perfil (Base64).");
            }

            db.collection('users').doc(currentUID).set(dataToUpdate, { merge: true }) // Usar set com merge para criar se não existir
                .then(() => {
                    console.log("PERFIL: Perfil atualizado/criado com sucesso no Firestore.");
                    if (currentUser && newName !== currentUser.displayName) { // Atualiza o nome no Auth também
                         currentUser.updateProfile({ displayName: newName })
                            .then(() => console.log("PERFIL: DisplayName do Firebase Auth atualizado."))
                            .catch(err => console.error("PERFIL: Erro ao atualizar displayName do Firebase Auth:", err));
                    }
                    // Se você usar Firebase Storage para photoURL, atualizaria auth.currentUser.photoURL aqui também.

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
                    console.error("PERFIL-ERROR: Erro ao salvar alterações no Firestore:", error);
                    editProfileStatus.textContent = "Erro ao salvar. Tente novamente.";
                    if (error.code === 'permission-denied') {
                        editProfileStatus.textContent = "Permissão negada. Verifique as regras de segurança.";
                    }
                    editProfileStatus.className = 'error'; // Garante que a classe error seja aplicada
                    editProfileStatus.style.display = 'block';
                })
                .finally(() => {
                    saveProfileChangesBtn.disabled = false;
                    saveProfileChangesBtn.textContent = 'Salvar Alterações';
                });
        });
    } else { console.warn("Formulário de edição ou botão de salvar não encontrado."); }

    function resetOptionalData() {
        console.warn("PERFIL: Iniciando reset de dados opcionais...");
        if(!resetStatusEl) { console.error("Elemento de status do reset não encontrado."); return; }
        if(!currentUID) { 
            resetStatusEl.textContent = 'Usuário não logado.'; resetStatusEl.className = 'error'; 
            if (resetStatusEl) resetStatusEl.style.display = 'inline-block'; return;
        }

        resetStatusEl.textContent = 'Processando reset...';
        resetStatusEl.className = 'info'; 
        if (resetStatusEl) resetStatusEl.style.display = 'inline-block';

        const firestoreFieldsToReset = {
            disciplinas: [],
            studyPurpose: '',
            profileLastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('users').doc(currentUID).update(firestoreFieldsToReset)
            .then(() => {
                console.log("PERFIL: Campos do Firestore (disciplinas, studyPurpose) resetados.");
                const localStorageKeysToRemove = ['cronograma', 'sessoesEstudo', 'estudaAiConfig', 'minhasAnotacoes', 'estudaAiSummaries'];
                let removedLocalStorageCount = 0;
                localStorageKeysToRemove.forEach(key => {
                    if (localStorage.getItem(key) !== null) {
                        localStorage.removeItem(key);
                        removedLocalStorageCount++;
                    }
                });
                console.log(`${removedLocalStorageCount} chaves do localStorage resetadas.`);
                if(resetStatusEl) {
                    resetStatusEl.textContent = 'Dados de progresso resetados com sucesso!';
                    resetStatusEl.className = 'success';
                }
                loadProfileData();
            })
            .catch(error => {
                console.error("PERFIL-ERROR: Erro ao resetar dados no Firestore:", error);
                if(resetStatusEl) {
                    resetStatusEl.textContent = 'Ocorreu um erro ao resetar os dados no servidor.';
                    resetStatusEl.className = 'error';
                }
            })
            .finally(() => {
                setTimeout(() => {
                    if(resetStatusEl) {
                        resetStatusEl.textContent = '';
                        resetStatusEl.className = '';
                        resetStatusEl.style.display = 'none';
                    }
                }, 5000);
            });
    }

    function showResetConfirmationModal() { if(modalResetOverlay) modalResetOverlay.classList.add('show'); }
    function hideResetConfirmationModal() { if(modalResetOverlay) modalResetOverlay.classList.remove('show');}

    if (resetDataBtn) resetDataBtn.addEventListener('click', showResetConfirmationModal);
    else { console.warn("Botão 'Resetar Dados' não encontrado."); }

    if (modalCancelarResetBtn) modalCancelarResetBtn.addEventListener('click', hideResetConfirmationModal);
    if (modalConfirmarResetBtn) {
        modalConfirmarResetBtn.addEventListener('click', () => {
            hideResetConfirmationModal(); 
            resetOptionalData();      
        });
    }
    if (modalResetOverlay) {
        modalResetOverlay.addEventListener('click', (event) => {
            if (event.target === modalResetOverlay) hideResetConfirmationModal();
        });
    }
    
    if (modalSincronizacaoNecessariaOverlay && modalBotaoIrParaLoginSinc && modalBotaoContinuarSemSincronizar) {
        modalBotaoIrParaLoginSinc.addEventListener('click', () => {
            window.location.href = 'login.html?migrate=true';
        });
        modalBotaoContinuarSemSincronizar.addEventListener('click', () => {
            modalSincronizacaoNecessariaOverlay.classList.remove('show');
            console.log("PERFIL: Usuário optou por continuar sem sincronizar por enquanto.");
            alert("Seus dados não serão salvos na nuvem e podem ser perdidos. Considere criar uma conta ou fazer login para uma melhor experiência e para salvar seu progresso.");
            // Aqui você poderia tentar carregar dados do localStorage para exibição,
            // mas a página atualmente está configurada para priorizar Firebase.
            // Se fizer isso, certifique-se que as funções de edição saibam que não há UID para salvar no Firebase.
            // Por agora, apenas fecha o modal. A página mostrará "N/A" ou "Complete seu perfil".
            if(profileErrorMessageDiv) {
                profileErrorMessageDiv.textContent = "Você está usando o modo offline. Seu progresso não será salvo na nuvem.";
                profileErrorMessageDiv.className = 'info';
                profileErrorMessageDiv.style.display = 'block';
            }
             if(editProfileBtn) editProfileBtn.disabled = true; // Desabilita edição se não logado
        });
         modalSincronizacaoNecessariaOverlay.addEventListener('click', (event) => {
            if (event.target === modalSincronizacaoNecessariaOverlay) {
                 // Não fecha ao clicar fora, força uma decisão nos botões
            }
        });
    }

    // --- Verificação Inicial de Autenticação ---
    // Movida para o topo do script para definir currentUser e currentUID mais cedo
    // e então chamar a lógica de exibição do modal de sincronização ou loadProfileData.
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            currentUID = user.uid;
            console.log("PERFIL: Usuário está logado (onAuthStateChanged):", currentUID);
            
            // Lógica para verificar se precisa migrar dados para um usuário JÁ LOGADO NO FIREBASE
            // Isso seria para o caso de um usuário Firebase existente logar em um dispositivo
            // que tem dados antigos no localStorage.
            db.collection('users').doc(currentUID).get().then(doc => {
                const userData = doc.exists ? doc.data() : {};
                if (checkForLocalData() && userData.localDataMigrated !== true) {
                    // Usuário logado, tem dados locais, e esses dados ainda não foram formalmente migrados/ignorados
                    if (confirm("Encontramos dados de estudo salvos localmente neste navegador. Deseja tentar sincronizá-los com sua conta online?")) {
                        // A função migrateLocalDataToFirestore idealmente seria importada ou definida aqui
                        // e chamada. Ela leria do localStorage e daria set/update no Firestore.
                        // Por agora, vamos apenas logar e marcar como 'migrado' para não perguntar de novo.
                        console.log("PERFIL: Usuário logado optou por (simular) migração de dados locais.");
                        // db.collection('users').doc(currentUID).set({ localDataMigrated: true, profileLastUpdated: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
                        // ** A migração real aconteceria em auth.js se o usuário for para lá com ?migrate=true
                        // ** Esta parte é um placeholder para uma lógica de migração mais sofisticada para usuários já logados no Firebase.
                        // ** Por enquanto, vamos deixar o fluxo principal de migração ser iniciado pelo redirect para login.html?migrate=true
                        alert("Para sincronizar, seus dados locais serão processados na próxima vez que você fizer login vindo desta sugestão. Se desejar, pode fazer logout e login novamente agora.");
                        // Para uma migração imediata, precisaríamos da função migrateLocalDataToFirestore aqui.
                    } else {
                        console.log("PERFIL: Usuário logado optou por NÃO migrar dados locais agora.");
                        // db.collection('users').doc(currentUID).set({ localDataMigrated: true, askedToMigrate: true }, { merge: true }); // Marcar para não perguntar de novo
                    }
                }
                loadProfileData(); // Carrega os dados do perfil do Firestore
            });
            if(editProfileBtn) editProfileBtn.disabled = false;
        } else {
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
                     profileErrorMessageDiv.className = 'info'; // Usar info para redirecionamento
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
    console.log("Script perfil.js: Todos os listeners configurados e onAuthStateChanged pronto.");
});