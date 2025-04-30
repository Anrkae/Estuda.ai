document.addEventListener('DOMContentLoaded', () => {
    console.log("Script perfil.js: DOMContentLoaded iniciado"); // Alterado nome do arquivo no log

    // --- Elementos do DOM ---
    const profilePicElement = document.getElementById('profile-pic');
    const profileNameElement = document.getElementById('profile-name');
    const profileDobElement = document.getElementById('profile-dob');
    const logoutButton = document.getElementById('logout-button');
    const profileErrorMessageDiv = document.getElementById('profile-error-message');
    // Abas
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    // Reset
    const resetDataBtn = document.getElementById('reset-data-btn');
    const resetStatusEl = document.getElementById('reset-status');
    const modalResetOverlay = document.getElementById('modalConfirmacaoResetOverlay');
    const modalConfirmarResetBtn = document.getElementById('modalBotaoConfirmarReset');
    const modalCancelarResetBtn = document.getElementById('modalBotaoCancelarReset');
    // Edição Perfil
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const modalEditOverlay = document.getElementById('modalEditProfileOverlay');
    const modalEditDialog = document.getElementById('modalDialogEdit'); // Selecionado para possível animação/foco
    const editProfileForm = document.getElementById('edit-profile-form');
    const editProfilePicPreview = document.getElementById('edit-profile-pic-preview');
    const editProfilePicInput = document.getElementById('edit-profile-pic-input');
    const editProfilePicLabel = document.getElementById('edit-profile-pic-label'); // Label para clique
    const editProfileNameInput = document.getElementById('edit-profile-name-input');
    const editProfileDobInput = document.getElementById('edit-profile-dob-input');
    const editAgeDisplay = document.getElementById('edit-age-display');
    const editProfileStatus = document.getElementById('edit-profile-status');
    const cancelProfileEditBtn = document.getElementById('cancel-profile-edit-btn');
    const saveProfileChangesBtn = document.getElementById('save-profile-changes-btn');

    // --- Variável para armazenar nova foto (Base64) ---
    let newProfilePicBase64 = null;


    // === Funções Utilitárias ===

    // Valida e parseia data dd/mm/yyyy para objeto Date (UTC para evitar timezone issues)
    const dateRegexForFormat = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    function parseAndValidateDdMmYyyy(dateString) {
        const match = dateString.match(dateRegexForFormat);
        if (!match) return null;
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);

        // Validações básicas de data
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear + 1 || month < 1 || month > 12 || day < 1 || day > 31) {
            return null;
        }
        if ((month === 4 || month === 6 || month === 9 || month === 11) && day > 30) {
            return null;
        }
        if (month === 2) {
            const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
            if (day > (isLeap ? 29 : 28)) {
                return null;
            }
        }
        // Verifica se o objeto Date criado corresponde aos valores (evita datas inválidas como 31/04)
        const dateObj = new Date(Date.UTC(year, month - 1, day));
        if (dateObj.getUTCFullYear() !== year || dateObj.getUTCMonth() !== month - 1 || dateObj.getUTCDate() !== day) {
            return null; // Data inválida (ex: 31/04/2023)
        }
        return dateObj; // Retorna objeto Date válido em UTC
    }

    // Formata um objeto Date para dd/mm/yyyy
    function formatDatePtBr(dateObj) {
        if (!dateObj || isNaN(dateObj.getTime())) return "";
        // Usar UTC para garantir consistência
        return dateObj.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'
        });
    }

    // Aplica máscara dd/mm/yyyy a um input
    function applyDateMask(inputElement) {
        let value = inputElement.value.replace(/\D/g, ''); // Remove não dígitos
        let formattedValue = '';
        if (value.length > 0) formattedValue += value.substring(0, 2);
        if (value.length >= 3) formattedValue += '/' + value.substring(2, 4);
        if (value.length >= 5) formattedValue += '/' + value.substring(4, 8);
        inputElement.value = formattedValue.substring(0, 10); // Limita a 10 caracteres
    }

    // Calcula idade a partir de um objeto Date
    function calculateAgeFromDate(birthDateObj) {
        if (!birthDateObj || isNaN(birthDateObj.getTime())) {
            return { age: null, error: "Data inválida" };
        }
        const today = new Date();
        // Compara apenas data, sem hora, usando UTC para evitar timezone
        const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const birthDateUtc = new Date(Date.UTC(birthDateObj.getUTCFullYear(), birthDateObj.getUTCMonth(), birthDateObj.getUTCDate()));

        if (birthDateUtc > todayUtc) {
            return { age: null, error: "Data futura" };
        }

        let age = todayUtc.getUTCFullYear() - birthDateUtc.getUTCFullYear();
        const monthDiff = todayUtc.getUTCMonth() - birthDateUtc.getUTCMonth();
        if (monthDiff < 0 || (monthDiff === 0 && todayUtc.getUTCDate() < birthDateUtc.getUTCDate())) {
            age--;
        }
        return { age: Math.max(0, age), error: null }; // Garante que idade não seja negativa
    }

    // Lê informações do usuário do localStorage
    function getUserInfoFromStorage() {
        try {
            const userInfoString = localStorage.getItem('userInfo');
            if (userInfoString) {
                return JSON.parse(userInfoString);
            }
        } catch (e) {
            console.error("Erro ao ler userInfo do localStorage:", e);
        }
        return null; // Retorna null se não encontrar ou der erro
    }

    // Salva informações do usuário no localStorage
    function saveUserInfoToStorage(userInfo) {
        try {
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            console.log("UserInfo salvo no localStorage:", userInfo);
            return true;
        } catch (e) {
            console.error("Erro ao salvar userInfo no localStorage:", e);
            // Poderia verificar QuotaExceededError aqui se necessário
            return false;
        }
    }


    // === Lógica das Abas ===
    if (tabButtons.length > 0 && tabContents.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTabId = button.getAttribute('data-tab');

                // Desativa todas as abas e conteúdos
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Ativa o botão clicado e o conteúdo correspondente
                button.classList.add('active');
                const targetContent = document.getElementById(targetTabId);
                if (targetContent) {
                    targetContent.classList.add('active');
                } else {
                    console.warn(`Conteúdo da aba não encontrado para ID: ${targetTabId}`);
                }
            });
        });
         // Ativa a primeira aba por padrão (opcional, mas bom UX)
        // tabButtons[0].click(); // Ou mantém o HTML com a primeira ativa
    } else {
        console.warn("Elementos das abas não encontrados.");
    }


    // === Carregar Dados do Perfil ===
    function loadProfileData() {
        console.log("Carregando dados do perfil...");
        const userInfo = getUserInfoFromStorage();
        const defaultPic = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

        if (profilePicElement && profileNameElement && profileDobElement) {
            if (userInfo && userInfo.nome && userInfo.dob) {
                profileNameElement.textContent = userInfo.nome;
                const birthDateObj = parseAndValidateDdMmYyyy(userInfo.dob);
                profileDobElement.textContent = birthDateObj ? formatDatePtBr(birthDateObj) : "Data inválida";
                profilePicElement.src = userInfo.profilePicBase64 || defaultPic;
                profilePicElement.onerror = () => { profilePicElement.src = defaultPic; }; // Fallback se imagem falhar

                if(editProfileBtn) editProfileBtn.disabled = false; // Habilita edição
                if(profileErrorMessageDiv) profileErrorMessageDiv.style.display = 'none';
                console.log("Dados do perfil carregados:", userInfo.nome, userInfo.dob);
            } else {
                console.error("UserInfo não encontrado ou inválido no localStorage.");
                profileNameElement.textContent = "Erro ao carregar";
                profileDobElement.textContent = "-";
                profilePicElement.src = defaultPic;
                if(profileErrorMessageDiv) {
                    profileErrorMessageDiv.textContent = "Não foi possível carregar os dados do perfil. Verifique se fez o setup inicial.";
                    profileErrorMessageDiv.style.display = 'block';
                }
                if(editProfileBtn) editProfileBtn.disabled = true; // Desabilita edição
            }
        } else {
             console.error("Elementos do DOM do perfil não encontrados (#profile-pic, #profile-name, #profile-dob).");
        }
    }
    // Chama o carregamento inicial
    loadProfileData();


    // === Lógica do Botão Sair ===
    if (logoutButton) {
         logoutButton.addEventListener('click', () => {
             console.log("Botão Sair clicado. Removendo dados...");
             // Chaves a serem removidas - ADICIONE OUTRAS CHAVES QUE VOCÊ USA
             const keysToRemove = [
                'userInfo',
                'disciplinas', // Exemplo
                'cronograma',  // Exemplo
                'sessoesEstudo', // Exemplo
                'estudaAiConfig', // Exemplo
                'minhasAnotacoes', // Exemplo de outra página
                'estudaAiSummaries' // Exemplo de outra página
            ];
             let removeCount = 0;
             keysToRemove.forEach(key => {
                 if(localStorage.getItem(key) !== null) {
                     localStorage.removeItem(key);
                     console.log(` - Chave '${key}' removida.`);
                     removeCount++;
                 }
             });
             console.log(`${removeCount} chaves removidas do localStorage.`);
             // Redireciona para a página de login ou setup inicial
             // AJUSTE O CAMINHO SE NECESSÁRIO
             window.location.href = 'login.html';
         });
    } else {
         console.warn("Botão de logout não encontrado.");
    }


    // === Lógica do Modal de Edição de Perfil ===

    function openEditProfileModal() {
        const userInfo = getUserInfoFromStorage();
        if (!userInfo) {
             alert("Erro ao carregar dados do perfil para edição.");
             return;
        }
        if(!modalEditOverlay || !editProfileNameInput || !editProfileDobInput || !editProfilePicPreview || !editAgeDisplay || !editProfileStatus) {
            console.error("Elementos do modal de edição não encontrados.");
            return;
        }

        // Preenche o formulário
        editProfileNameInput.value = userInfo.nome || '';
        editProfileDobInput.value = userInfo.dob || '';

        // Calcula e exibe idade inicial
        editAgeDisplay.textContent = ''; // Limpa antes
        if (userInfo.dob) {
            const birthDateObj = parseAndValidateDdMmYyyy(userInfo.dob);
            if (birthDateObj) {
                const { age, error } = calculateAgeFromDate(birthDateObj);
                if (!error && age !== null) {
                    editAgeDisplay.textContent = `Idade: ${age} ${age === 1 ? 'ano' : 'anos'}`;
                }
            }
        }
        editAgeDisplay.className = ''; // Reseta classe de erro

        // Preenche a imagem
        const defaultPic = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";
        editProfilePicPreview.src = userInfo.profilePicBase64 || defaultPic;
        editProfilePicPreview.onerror = () => { editProfilePicPreview.src = defaultPic; };

        // Reseta estado
        newProfilePicBase64 = null; // Limpa imagem nova selecionada
        if(editProfilePicInput) editProfilePicInput.value = ''; // Limpa seleção do input file
        editProfileStatus.textContent = '';
        editProfileStatus.style.display = 'none'; // Esconde status

        // Mostra o modal
        modalEditOverlay.classList.add('show');
        console.log("Modal de edição aberto.");
    }

    function closeEditProfileModal() {
        if (modalEditOverlay) {
            modalEditOverlay.classList.remove('show');
            console.log("Modal de edição fechado.");
        }
    }

    // --- Listeners do Modal de Edição ---
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', openEditProfileModal);
    } else { console.warn("Botão 'Editar Perfil' não encontrado."); }

    if (cancelProfileEditBtn) {
        cancelProfileEditBtn.addEventListener('click', closeEditProfileModal);
    }

    // Fechar clicando fora
    if (modalEditOverlay) {
        modalEditOverlay.addEventListener('click', (event) => {
            if (event.target === modalEditOverlay) {
                closeEditProfileModal();
            }
        });
    }

    // Listener para máscara e cálculo de idade na data de nascimento
    if (editProfileDobInput && editAgeDisplay) {
        editProfileDobInput.addEventListener('input', (e) => {
            applyDateMask(e.target); // Aplica máscara enquanto digita
            const dobValue = e.target.value;
            let displayMessage = '';
            let displayClass = '';

            if (dobValue.length === 10) { // Processa apenas data completa
                const birthDateObj = parseAndValidateDdMmYyyy(dobValue);
                if (birthDateObj) {
                    const { age, error } = calculateAgeFromDate(birthDateObj);
                    if (error) {
                        displayMessage = error === "Data futura" ? 'Data não pode ser futura' : 'Data inválida';
                        displayClass = 'invalid';
                    } else if (age !== null) {
                        displayMessage = `Idade: ${age} ${age === 1 ? 'ano' : 'anos'}`;
                        displayClass = ''; // Válido
                    } else {
                         displayMessage = 'Erro ao calcular idade';
                         displayClass = 'invalid';
                    }
                } else {
                    displayMessage = 'Formato de data inválido';
                    displayClass = 'invalid';
                }
            } else if (dobValue.length > 0) {
                displayMessage = 'Digite a data completa (dd/mm/aaaa)';
                displayClass = ''; // Não é erro ainda, só incompleto
            } else {
                 displayMessage = ''; // Limpa se vazio
                 displayClass = '';
            }
            editAgeDisplay.textContent = displayMessage;
            editAgeDisplay.className = displayClass;
        });
    }

    // Listener para seleção de nova imagem
    if (editProfilePicInput && editProfilePicPreview && editProfileStatus) {
        editProfilePicInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            editProfileStatus.textContent = ''; // Limpa status anterior
            editProfileStatus.style.display = 'none';
            newProfilePicBase64 = null; // Reseta se selecionar novo arquivo

            if (file && file.type.startsWith('image/')) {
                // Validação de tamanho (ex: 2MB)
                const maxSizeMB = 2;
                if (file.size > maxSizeMB * 1024 * 1024) {
                    editProfileStatus.textContent = `Imagem muito grande (máximo ${maxSizeMB}MB).`;
                    editProfileStatus.style.display = 'block';
                    editProfilePicInput.value = ''; // Limpa seleção inválida
                    return;
                }

                // Lê o arquivo como Base64
                const reader = new FileReader();
                reader.onload = (e) => {
                    newProfilePicBase64 = e.target.result; // Armazena o Base64
                    editProfilePicPreview.src = newProfilePicBase64; // Mostra preview
                    console.log("Nova imagem selecionada e carregada para preview.");
                }
                reader.onerror = (e) => {
                    console.error("Erro ao ler arquivo de imagem:", e);
                    editProfileStatus.textContent = "Erro ao processar a imagem selecionada.";
                    editProfileStatus.style.display = 'block';
                    newProfilePicBase64 = null; // Garante que não use imagem com erro
                }
                reader.readAsDataURL(file);

            } else if (file) {
                // Se um arquivo foi selecionado mas não é imagem
                editProfileStatus.textContent = "Por favor, selecione um arquivo de imagem válido (JPG, PNG, GIF, etc.).";
                editProfileStatus.style.display = 'block';
                editProfilePicInput.value = ''; // Limpa seleção inválida
            }
        });
    } else {
        console.warn("Elementos de upload/preview de imagem não encontrados no modal.");
    }

    // Listener para salvar alterações do perfil
    if (editProfileForm && saveProfileChangesBtn && editProfileStatus) {
        editProfileForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Impede envio padrão do formulário
            console.log("Tentando salvar alterações do perfil...");
            editProfileStatus.textContent = ''; // Limpa status
            editProfileStatus.style.display = 'none';

            const newName = editProfileNameInput.value.trim();
            const newDob = editProfileDobInput.value;

            // Validações
            if (!newName || newName.length < 2) { // Nome um pouco mais flexível
                editProfileStatus.textContent = "Por favor, insira um nome válido.";
                editProfileStatus.style.display = 'block';
                editProfileNameInput.focus();
                return;
            }
            const birthDateObj = parseAndValidateDdMmYyyy(newDob);
            if (!birthDateObj) {
                editProfileStatus.textContent = "Data de nascimento inválida (use dd/mm/aaaa).";
                editProfileStatus.style.display = 'block';
                editProfileDobInput.focus();
                return;
            }
            const { error: dateError } = calculateAgeFromDate(birthDateObj);
            if (dateError) { // Verifica se é data futura
                 editProfileStatus.textContent = "Data de nascimento não pode ser futura.";
                 editProfileStatus.style.display = 'block';
                 editProfileDobInput.focus();
                 return;
            }

            // Salvar
            const currentUserInfo = getUserInfoFromStorage();
            if (!currentUserInfo) {
                 editProfileStatus.textContent = "Erro: Não foi possível carregar os dados atuais para salvar.";
                 editProfileStatus.style.display = 'block';
                 return;
            }

            // Cria objeto atualizado
            const updatedUserInfo = {
                ...currentUserInfo, // Mantém outras infos existentes
                nome: newName,
                dob: newDob
            };

            // Adiciona a nova foto SE ela foi selecionada e carregada
            if (newProfilePicBase64) {
                updatedUserInfo.profilePicBase64 = newProfilePicBase64;
                console.log("Salvando com nova foto de perfil.");
            } else {
                 console.log("Mantendo foto de perfil existente (ou padrão).");
                // Garante que não salve null se não houve mudança
                // updatedUserInfo.profilePicBase64 = currentUserInfo.profilePicBase64 || null;
            }

            // Tenta salvar no localStorage
            if (saveUserInfoToStorage(updatedUserInfo)) {
                console.log("Perfil atualizado com sucesso no localStorage.");
                loadProfileData(); // Recarrega dados na tela principal
                closeEditProfileModal(); // Fecha o modal
                // Poderia mostrar um feedback de sucesso rápido fora do modal
            } else {
                editProfileStatus.textContent = "Ocorreu um erro ao tentar salvar as alterações.";
                editProfileStatus.style.display = 'block';
            }
        });
    } else {
         console.warn("Formulário de edição ou botão de salvar não encontrado.");
    }


    // === Lógica do Reset de Dados Opcionais ===

    function resetOptionalData() {
        console.warn("Iniciando reset de dados opcionais...");
        if(!resetStatusEl) { console.error("Elemento de status do reset não encontrado."); return; }

        resetStatusEl.textContent = 'Processando reset...';
        resetStatusEl.className = ''; // Limpa classes de status
        resetStatusEl.style.display = 'inline-block'; // Mostra

        try {
            // Chaves a serem potencialmente removidas
            // ADICIONE/REMOVA CHAVES CONFORME SUA APLICAÇÃO
            const keysToRemove = [
                'disciplinas',
                'cronograma',
                'sessoesEstudo',
                'estudaAiConfig', // Exemplo
                'minhasAnotacoes',
                'estudaAiSummaries'
            ];

            let removedCount = 0;
            keysToRemove.forEach(key => {
                if (localStorage.getItem(key) !== null) { // Só remove se existir
                    localStorage.removeItem(key);
                    console.log(` - Chave '${key}' removida do localStorage.`);
                    removedCount++;
                } else {
                     console.log(` - Chave '${key}' não encontrada, ignorando.`);
                }
            });

            if (removedCount > 0) {
                resetStatusEl.textContent = 'Dados opcionais resetados com sucesso!';
                resetStatusEl.className = 'success'; // Adiciona classe de sucesso
                console.log(`${removedCount} chaves de dados opcionais foram removidas.`);
                // Poderia recarregar partes da UI se necessário
            } else {
                resetStatusEl.textContent = 'Nenhum dado opcional para resetar foi encontrado.';
                resetStatusEl.className = ''; // Sem classe específica
                console.log("Nenhuma chave de dados opcionais encontrada para remover.");
            }

        } catch (error) {
            console.error("Erro durante o reset de dados:", error);
            resetStatusEl.textContent = 'Ocorreu um erro ao tentar resetar os dados.';
            resetStatusEl.className = 'error'; // Adiciona classe de erro
        } finally {
            // Esconde a mensagem de status após alguns segundos
            setTimeout(() => {
                if(resetStatusEl) {
                     resetStatusEl.textContent = '';
                     resetStatusEl.className = '';
                     resetStatusEl.style.display = 'none';
                }
            }, 5000); // Mensagem some após 5 segundos
        }
    }

    // Funções para mostrar/esconder modal de reset
    function showResetConfirmationModal() {
        if(modalResetOverlay) modalResetOverlay.classList.add('show');
    }
    function hideResetConfirmationModal() {
         if(modalResetOverlay) modalResetOverlay.classList.remove('show');
    }

    // Listeners do Modal de Reset
    if (resetDataBtn) {
        resetDataBtn.addEventListener('click', showResetConfirmationModal);
    } else { console.warn("Botão 'Resetar Dados' não encontrado."); }

    if (modalCancelarResetBtn) {
        modalCancelarResetBtn.addEventListener('click', hideResetConfirmationModal);
    }

    if (modalConfirmarResetBtn) {
        modalConfirmarResetBtn.addEventListener('click', () => {
            hideResetConfirmationModal(); // Primeiro esconde o modal
            resetOptionalData();       // Depois executa o reset
        });
    }

    // Fechar modal de reset clicando fora
    if (modalResetOverlay) {
        modalResetOverlay.addEventListener('click', (event) => {
            if (event.target === modalResetOverlay) {
                hideResetConfirmationModal();
            }
        });
    }

    console.log("Script perfil.js: Todos os listeners configurados.");

}); // Fim do DOMContentLoaded


