document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = {
        apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc",
        authDomain: "estudaai-ddb6a.firebaseapp.com",
        projectId: "estudaai-ddb6a",
        storageBucket: "estudaai-ddb6a.appspot.com",
        messagingSenderId: "974312409515",
        appId: "1:974312409515:web:ef635d71abf934241d6aee"
    };

    // Não precisa mais da checagem de SUA_API_KEY aqui, pois você já forneceu os dados.
    // Removido o bloco if (firebaseConfig.apiKey === "SUA_API_KEY") para simplificar,
    // mas em produção, você não colocaria as chaves diretamente assim.

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    const configForm = document.getElementById('config-form');
    const nomeDisciplinaInput = document.getElementById('nome-disciplina-input');
    const addDisciplinaBtn = document.getElementById('add-disciplina-btn');
    const disciplinasListUl = document.getElementById('disciplinas-list');
    const saveConfigButton = document.getElementById('save-config-button');
    const statusMessageEl = document.getElementById('status-message-config');
    const studyPurposeRadios = document.querySelectorAll('input[name="studyPurpose"]');
    const outroObjetivoTextoInput = document.getElementById('outro-objetivo-texto');
    const importLocalDisciplinasContainer = document.getElementById('import-local-disciplinas-container');
    const logoutButtonConfig = document.getElementById('logout-button-config'); // Botão de Logout

    let currentUser = null;
    let currentUID = null;
    let currentDisciplinas = [];

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            currentUID = user.uid;
            console.log("CONFIG: Usuário autenticado para configuração:", currentUID);
            // Verifica se a configuração já foi feita (ex: usuário atualizou a página)
            db.collection('users').doc(currentUID).get().then(doc => {
                if (doc.exists && doc.data().initialSetupComplete === true) {
                    console.log("CONFIG: Configuração já completa. Redirecionando para index.html");
                    window.location.href = 'index.html'; // Redireciona se já configurado
                } else {
                    // Carrega dados parcialmente salvos ou localStorage
                    if (doc.exists && doc.data().disciplinas) {
                        currentDisciplinas = doc.data().disciplinas;
                    }
                    // Adicione aqui a lógica para carregar studyPurpose se já salvo
                    renderDisciplinas();
                    checkAndOfferLocalStorageImport();
                }
            }).catch(error => {
                console.error("CONFIG: Erro ao verificar perfil inicial:", error);
                // Continua na página de configuração mesmo se houver erro ao ler,
                // pois o objetivo é permitir que o usuário salve.
                checkAndOfferLocalStorageImport();
                renderDisciplinas();
            });
        } else {
            console.log("CONFIG: Nenhum usuário logado. Redirecionando para login.");
            window.location.href = 'login.html'; 
        }
    });

    // Função checkAndOfferLocalStorageImport (mesma da resposta anterior)
    function checkAndOfferLocalStorageImport() {
        try {
            const localDisciplinasStr = localStorage.getItem('disciplinas');
            if (localDisciplinasStr) {
                const localDisciplinas = JSON.parse(localDisciplinasStr);
                if (Array.isArray(localDisciplinas) && localDisciplinas.length > 0) {
                    const disciplinasNomes = localDisciplinas.map(d => (typeof d === 'string' ? d : d.nome)).filter(Boolean);
                    if (disciplinasNomes.length > 0) {
                        const importButton = document.createElement('button');
                        importButton.textContent = `Importar ${disciplinasNomes.length} disciplina(s) da sessão anterior?`;
                        importButton.type = 'button';
                        importButton.className = 'btn-secundario'; 
                        importButton.style.fontSize = '0.9em';
                        importButton.onclick = () => {
                            disciplinasNomes.forEach(nome => {
                                if (!currentDisciplinas.includes(nome)) {
                                    currentDisciplinas.push(nome);
                                }
                            });
                            renderDisciplinas();
                            importLocalDisciplinasContainer.innerHTML = '<p style="color:green; font-size:0.9em;">Disciplinas importadas!</p>';
                        };
                        importLocalDisciplinasContainer.innerHTML = '';
                        importLocalDisciplinasContainer.appendChild(importButton);
                    }
                }
            }
        } catch (e) {
            console.error("CONFIG: Erro ao ler disciplinas do localStorage:", e);
        }
    }

    // Função renderDisciplinas (mesma da resposta anterior)
    function renderDisciplinas() {
        disciplinasListUl.innerHTML = '';
        if (currentDisciplinas.length === 0) {
            disciplinasListUl.innerHTML = '<li class="empty-message">Nenhuma disciplina adicionada.</li>';
            return;
        }
        currentDisciplinas.forEach((disciplina, index) => {
            const li = document.createElement('li');
            li.textContent = disciplina;
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '&times;';
            removeBtn.className = 'remove-disciplina-btn';
            removeBtn.title = 'Remover disciplina';
            removeBtn.onclick = () => {
                currentDisciplinas.splice(index, 1);
                renderDisciplinas();
            };
            li.appendChild(removeBtn);
            disciplinasListUl.appendChild(li);
        });
    }
    
    if (addDisciplinaBtn) {
        addDisciplinaBtn.addEventListener('click', () => {
            const nome = nomeDisciplinaInput.value.trim();
            if (nome && !currentDisciplinas.some(d => d.toLowerCase() === nome.toLowerCase())) {
                currentDisciplinas.push(nome);
                renderDisciplinas();
                nomeDisciplinaInput.value = '';
                nomeDisciplinaInput.focus();
            } else if (currentDisciplinas.some(d => d.toLowerCase() === nome.toLowerCase())) {
                statusMessageEl.textContent = "Essa disciplina já foi adicionada.";
                statusMessageEl.className = 'erro';
                setTimeout(() => { statusMessageEl.textContent = ''; statusMessageEl.className = '';}, 3000);
            }
        });
    }
     if (nomeDisciplinaInput) {
        nomeDisciplinaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addDisciplinaBtn.click();
            }
        });
    }

    // Lógica dos radios studyPurpose (mesma da resposta anterior)
    studyPurposeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'Aprendizado Geral / Outro' && this.checked) {
                outroObjetivoTextoInput.style.display = 'block';
                outroObjetivoTextoInput.required = true;
            } else {
                outroObjetivoTextoInput.style.display = 'none';
                outroObjetivoTextoInput.required = false;
                outroObjetivoTextoInput.value = '';
            }
        });
    });

    // Lógica do formulário de configuração (mesma da resposta anterior)
    if (configForm) {
        configForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentUID) {
                statusMessageEl.textContent = 'Erro: Usuário não autenticado.';
                statusMessageEl.className = 'erro';
                return;
            }

            let studyPurposeValue = '';
            const selectedRadio = document.querySelector('input[name="studyPurpose"]:checked');
            if (selectedRadio) {
                studyPurposeValue = selectedRadio.value;
                if (studyPurposeValue === 'Aprendizado Geral / Outro') {
                    const outroTexto = outroObjetivoTextoInput.value.trim();
                    if (!outroTexto) {
                         statusMessageEl.textContent = 'Por favor, especifique seu objetivo em "Outro".';
                         statusMessageEl.className = 'erro';
                         outroObjetivoTextoInput.focus();
                         return;
                    }
                    studyPurposeValue = `Outro: ${outroTexto}`;
                }
            } else {
                statusMessageEl.textContent = 'Por favor, selecione seu objetivo de estudo.';
                statusMessageEl.className = 'erro';
                return;
            }

            if (currentDisciplinas.length === 0) {
                 statusMessageEl.textContent = 'Adicione pelo menos uma disciplina.';
                 statusMessageEl.className = 'erro';
                 nomeDisciplinaInput.focus();
                 return;
            }

            statusMessageEl.textContent = 'Salvando configurações...';
            statusMessageEl.className = 'info';
            saveConfigButton.disabled = true;
            saveConfigButton.textContent = 'Salvando...';

            const userDataToUpdate = {
                disciplinas: currentDisciplinas,
                studyPurpose: studyPurposeValue,
                initialSetupComplete: true,
                profileLastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };

            db.collection('users').doc(currentUID).update(userDataToUpdate)
                .then(() => {
                    console.log("CONFIG: Configurações salvas com sucesso!");
                    statusMessageEl.textContent = 'Configurações salvas! Redirecionando...';
                    statusMessageEl.className = 'sucesso';
                    localStorage.removeItem('disciplinas'); // Limpa disciplinas locais após salvar no perfil
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                })
                .catch((error) => {
                    console.error("CONFIG-ERROR: Erro ao salvar configurações:", error);
                    statusMessageEl.textContent = 'Erro ao salvar. Tente novamente.';
                    statusMessageEl.className = 'erro';
                    saveConfigButton.disabled = false;
                    saveConfigButton.textContent = 'Salvar e Continuar';
                });
        });
    }

    // Lógica para o botão de Logout
    if (logoutButtonConfig) {
        logoutButtonConfig.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('CONFIG: Usuário deslogado.');
                window.location.href = 'login.html'; // Redireciona para a página de login
            }).catch((error) => {
                console.error('CONFIG-ERROR: Erro ao fazer logout:', error);
                statusMessageEl.textContent = 'Erro ao tentar sair. Tente novamente.';
                statusMessageEl.className = 'erro';
            });
        });
    }
    
    // Chamada inicial para renderizar a lista (vazia ou com dados pré-carregados)
    // renderDisciplinas(); // Já é chamado dentro do onAuthStateChanged ou checkAndOfferLocalStorageImport
});