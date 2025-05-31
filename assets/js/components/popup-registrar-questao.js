document.addEventListener("DOMContentLoaded", () => {
    // --- NOVO: Configuração e Inicialização do Firebase ---
    // Se você já inicializa o Firebase em um script principal que é carregado antes deste,
    // você pode remover este bloco firebaseConfig e firebase.initializeApp().
    // Apenas garanta que 'auth' e 'db' estejam acessíveis.
    const firebaseConfig = {
        apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc", // SUAS CREDENCIAIS REAIS
        authDomain: "estudaai-ddb6a.firebaseapp.com",
        projectId: "estudaai-ddb6a",
        storageBucket: "estudaai-ddb6a.appspot.com",
        messagingSenderId: "974312409515",
        appId: "1:974312409515:web:ef635d71abf934241d6aee"
    };
    // Verifique se o Firebase já foi inicializado para evitar erros
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();
    let currentUID = null;
    // --- FIM NOVO ---

    const initialState = 'level-2';
    const popupId = "popupContainer";
    const styleId = 'popupStyles';

    // --- Lógica de criação do HTML e CSS do Popup (mantida como no seu original) ---
    if (!document.getElementById(popupId)) {
        const popupHTML = `
            <div id="${popupId}" class="popup-container ${initialState}">
                <div id="popupHeader" class="popup-header">
                    <span id="popupTitle">Registrar Estudo</span>
                </div>
                <div class="popup-content-wrapper">
                    <span id="registerPopupDragHandle" class="register-popup-drag-handle">
                        </i>deslize para minimizar
                    </span>
                    <form id="formRegistroPopup">
                        <div id="primeiroBloco" class="popup-form-grupo">
                            <label for="popupDisciplinaSelect">Disciplina:</label>
                            <select id="popupDisciplinaSelect" name="disciplina" required>
                                <option value="">-- Carregando Disciplinas --</option>
                            </select>
                        </div>
                        <div class="popup-form-grupo">
                            <label for="popupTempoInput">Tempo Gasto (minutos):</label>
                            <input type="number" id="popupTempoInput" name="tempo" min="1" placeholder="Ex: 60" required inputmode="numeric" pattern="[0-9]*">
                        </div>
                        <div class="popup-form-grupo-inline">
                            <div class="popup-form-grupo">
                                <label for="popupQuestoesInput">Questões Resolvidas:</label>
                                <input type="number" id="popupQuestoesInput" name="questoes" min="0" placeholder="Ex: 10" required inputmode="numeric" pattern="[0-9]*">
                            </div>
                            <div class="popup-form-grupo">
                                <label for="popupAcertosInput">Acertos:</label>
                                <input type="number" id="popupAcertosInput" name="acertos" min="0" placeholder="Ex: 8" required inputmode="numeric" pattern="[0-9]*">
                            </div>
                        </div>
                        <button type="submit" id="popupRegisterBtn" class="popup-btn" disabled>Registrar Sessão</button>
                        <div id="popupFeedback" class="popup-feedback"></div>
                    </form>
                </div>
            </div>`;
        document.body.insertAdjacentHTML("beforeend", popupHTML);

        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .popup-container { position: fixed; bottom: 0; left: 0; width: 100vw; height: 100vh; z-index: 1000; transition: transform 0.4s ease-in-out; background-color: #ffffff; display: flex; flex-direction: column; font-family: 'Montserrat', sans-serif; box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.1); overflow: hidden; border-top-left-radius: 32px; border-top-right-radius: 32px; }
                .popup-container.level-2 { transform: translateY(calc(100% - 50px)); box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1); }
                .popup-container.level-2 .popup-header { height: 50px; padding: 0 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; background-color: #f8f8f8; border-top: 1px solid #e0e0e0; width: 100%; flex-shrink: 0; border-radius: 0; }
                .popup-container.level-2 .popup-header #popupTitle { font-weight: 600; color: #2C2C2C; font-size: 1rem; }
                .popup-container.level-2 .popup-content-wrapper { display: none; flex-grow: 1; }
                .popup-container.level-1 { transform: translateY(0); box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.15); }
                .popup-container.level-1 .popup-header { display: none; }
                .popup-container.level-1 .popup-content-wrapper { display: flex; flex-direction: column; align-items: center; flex-grow: 1; overflow-y: auto; padding: 20px 30px 30px 30px; position: relative; padding-top: 35px; }
                .popup-container.level-1 #formRegistroPopup { width: 100%; max-width: 600px; }
                #${popupId} .register-popup-drag-handle { display: inline-flex; align-items: center; gap: 6px; position: absolute; top: 8px; left: 50%; transform: translateX(-50%); background: none; border: none; font-size: 0.8rem; color: #888; opacity: 0.7; cursor: ns-resize; padding: 8px 15px; z-index: 10; transition: opacity 0.2s ease, color 0.2s ease; white-space: nowrap; font-family: 'Montserrat', sans-serif; font-weight: 400; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; touch-action: none; }
                #${popupId} .register-popup-drag-handle i { line-height: 1; }
                #${popupId} .register-popup-drag-handle:hover { color: #444; opacity: 1; }
                #primeiroBloco { margin-top: 50px; }
                #formRegistroPopup h2 { text-align: center; margin-bottom: 25px; color: #333; font-weight: 600; }
                .popup-form-grupo { margin-bottom: 15px; }
                .popup-form-grupo label { display: block; margin-bottom: 6px; font-weight: 500; color: #444; font-size: 0.9em; }
                .popup-form-grupo input[type="number"], .popup-form-grupo select { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; font-family: inherit; font-size: 1em; }
                .popup-form-grupo input:focus, .popup-form-grupo select:focus { border-color: #6735bc; outline: none; box-shadow: 0 0 0 3px rgba(103, 53, 188, 0.15); }
                .popup-form-grupo-inline { display: flex; gap: 15px; margin-bottom: 15px;}
                .popup-form-grupo-inline .popup-form-grupo { flex: 1; margin-bottom: 0;}
                .popup-btn { display: block; width: 100%; padding: 14px; background-color: #6735bc; color: white; border: none; border-radius: 6px; font-size: 1.1em; font-weight: 600; cursor: pointer; transition: background-color 0.2s ease; text-align: center; font-family: inherit; margin-top: 10px; }
                .popup-btn:hover:not(:disabled) { background-color: #562da4; }
                .popup-btn:active:not(:disabled) { background-color: #452482; }
                .popup-btn:disabled { background-color: #bdbdbd; cursor: not-allowed; color: #757575;}
                .popup-feedback { margin-top: 15px; padding: 10px; border-radius: 4px; text-align: center; font-size: 0.95em; display: none; }
                .popup-feedback.sucesso { background-color: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
                .popup-feedback.erro { background-color: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
                @media (max-width: 600px) { .popup-container.level-1 .popup-content-wrapper { padding: 15px 20px 20px 20px; padding-top: 35px; } #formRegistroPopup h2 { font-size: 1.3em; } .popup-form-grupo-inline { flex-direction: column; gap: 15px; } #${popupId} .register-popup-drag-handle { font-size: 0.75rem; top: 6px; gap: 4px;} }
            `;
            document.head.appendChild(style);
        }
    }
    // --- FIM HTML/CSS ---

    // Referências aos elementos do pop-up (após serem injetados)
    const popupContainer = document.getElementById(popupId);
    const popupHeader = document.getElementById("popupHeader");
    const popupDragHandle = document.getElementById("registerPopupDragHandle");
    const formRegistroPopup = document.getElementById("formRegistroPopup");
    const disciplinaSelect = document.getElementById("popupDisciplinaSelect");
    const tempoInput = document.getElementById("popupTempoInput");
    const questoesInput = document.getElementById("popupQuestoesInput");
    const acertosInput = document.getElementById("popupAcertosInput");
    const feedbackDiv = document.getElementById("popupFeedback");
    const registerBtn = document.getElementById("popupRegisterBtn");

    // MODIFICADO: Carregar disciplinas do Firestore
    async function carregarDisciplinasPopup() {
        if (!currentUID) {
            console.warn("POPUP REGISTRO: Usuário não logado, não é possível carregar disciplinas.");
            if (disciplinaSelect) {
                disciplinaSelect.innerHTML = '<option value="">Faça login para carregar</option>';
                disciplinaSelect.disabled = true;
            }
            if (registerBtn) registerBtn.disabled = true; // Desabilita o botão de registrar
            return;
        }

        if (!disciplinaSelect) return;
        disciplinaSelect.innerHTML = '<option value="">Carregando...</option>'; // Limpa opções antigas e mostra carregando
        disciplinaSelect.disabled = true;

        try {
            const userDocRef = db.collection('users').doc(currentUID);
            const doc = await userDocRef.get();
            let disciplinasDoUsuario = [];

            if (doc.exists) {
                const userData = doc.data();
                // Supondo que disciplinas é um array de objetos {nome: string, topicos: string[]}
                // ou um array de strings (apenas nomes)
                if (Array.isArray(userData.disciplinas)) {
                     disciplinasDoUsuario = userData.disciplinas.map(d => typeof d === 'object' ? d.nome : d).filter(Boolean);
                }
            }
            
            disciplinaSelect.innerHTML = '<option value="">-- Selecione --</option>'; // Reseta para o padrão
            if (disciplinasDoUsuario.length === 0) {
                disciplinaSelect.disabled = true;
                const option = document.createElement("option");
                option.textContent = "Nenhuma disciplina cadastrada";
                option.disabled = true;
                disciplinaSelect.appendChild(option);
                disciplinaSelect.selectedIndex = 1; // Mostra a mensagem
            } else {
                disciplinaSelect.disabled = false;
                disciplinasDoUsuario.forEach(nomeDisciplina => {
                    const option = document.createElement("option");
                    option.value = nomeDisciplina;
                    option.textContent = nomeDisciplina;
                    disciplinaSelect.appendChild(option);
                });
            }
            if(registerBtn) registerBtn.disabled = disciplinasDoUsuario.length === 0; // Habilita se houver disciplinas

        } catch (e) {
            console.error("POPUP REGISTRO: Erro ao carregar disciplinas do Firestore:", e);
            mostrarFeedbackPopup("Erro ao carregar disciplinas.", "erro");
            disciplinaSelect.innerHTML = '<option value="">Erro ao carregar</option>';
            disciplinaSelect.disabled = true;
            if(registerBtn) registerBtn.disabled = true;
        }
    }

    function mostrarFeedbackPopup(mensagem, tipo = "sucesso") {
        if (feedbackDiv) {
            feedbackDiv.textContent = mensagem;
            feedbackDiv.className = `popup-feedback ${tipo}`;
            feedbackDiv.style.display = "block";
            setTimeout(() => {
                if (feedbackDiv.textContent === mensagem) { // Só esconde se a mensagem não mudou
                    feedbackDiv.style.display = "none";
                }
            }, 4000);
        }
    }

    // MODIFICADO: Registrar Sessão no Firestore
    async function registrarSessaoCompleta(event) {
        event.preventDefault();
        if (feedbackDiv) feedbackDiv.style.display = "none";
        if (registerBtn) registerBtn.disabled = true;

        if (!currentUID) {
            mostrarFeedbackPopup("Erro: Você precisa estar logado para registrar uma sessão.", "erro");
            if (registerBtn) registerBtn.disabled = false;
            return;
        }

        const disciplinaNome = disciplinaSelect.value;
        const tempoStr = tempoInput.value.trim();
        const questoesStr = questoesInput.value.trim();
        const acertosStr = acertosInput.value.trim();

        if (!disciplinaNome) {
            mostrarFeedbackPopup("Erro: Selecione uma disciplina.", "erro");
            if (registerBtn) registerBtn.disabled = false; return;
        }
        // Validações (como no seu original)
        const tempoNum = parseInt(tempoStr, 10);
        const questoesNum = parseInt(questoesStr, 10);
        const acertosNum = parseInt(acertosStr, 10);

        if (isNaN(tempoNum) || tempoNum <= 0) { mostrarFeedbackPopup("Erro: Tempo gasto inválido.", "erro"); if (registerBtn) registerBtn.disabled = false; return; }
        if (isNaN(questoesNum) || questoesNum < 0) { mostrarFeedbackPopup("Erro: Questões resolvidas inválido.", "erro"); if (registerBtn) registerBtn.disabled = false; return; }
        if (isNaN(acertosNum) || acertosNum < 0) { mostrarFeedbackPopup("Erro: Acertos inválido.", "erro"); if (registerBtn) registerBtn.disabled = false; return; }
        if (acertosNum > questoesNum) { mostrarFeedbackPopup("Erro: Acertos não podem ser maior que questões.", "erro"); if (registerBtn) registerBtn.disabled = false; return; }

        const novaSessao = {
            disciplina: disciplinaNome,
            tempo: tempoNum,
            questoes: questoesNum,
            acertos: acertosNum,
            data: firebase.firestore.Timestamp.now() // Usa o timestamp do servidor Firestore
        };

        try {
            const userDocRef = db.collection('users').doc(currentUID);
            // Adiciona a nova sessão ao array 'sessoesEstudo' no documento do usuário
            await userDocRef.update({
                sessoesEstudo: firebase.firestore.FieldValue.arrayUnion(novaSessao)
            });

            console.log("POPUP REGISTRO: Sessão registrada no Firestore com sucesso!");
            mostrarFeedbackPopup("Sessão registrada com sucesso!", "sucesso");
            if (formRegistroPopup) formRegistroPopup.reset();
            if (disciplinaSelect) disciplinaSelect.selectedIndex = 0;

            // Tenta chamar a função de atualização de relatórios, se existir
            if (window.appContext && typeof window.appContext.atualizarRelatorios === "function") {
                console.log("POPUP REGISTRO: Chamando appContext.atualizarRelatorios()");
                window.appContext.atualizarRelatorios();
            } else {
                console.warn("POPUP REGISTRO: appContext.atualizarRelatorios não encontrada.");
            }

            setTimeout(() => {
                if (popupContainer && popupContainer.classList.contains("level-1")) {
                    popupContainer.classList.remove("level-1");
                    popupContainer.classList.add("level-2");
                    popupContainer.style.transition = ""; 
                    popupContainer.style.transform = "";
                    if(feedbackDiv) feedbackDiv.style.display = 'none';
                }
            }, 1500);

        } catch (error) {
            console.error("POPUP REGISTRO: Erro ao salvar sessão no Firestore:", error);
            mostrarFeedbackPopup("Erro ao salvar sessão no servidor. Verifique sua conexão ou tente mais tarde.", "erro");
        } finally {
            if (registerBtn) registerBtn.disabled = false;
        }
    }

    // --- Event Listeners do Popup (Lógica de Arrastar e Abrir/Fechar como no seu original) ---
    if (popupContainer && popupHeader && popupDragHandle && formRegistroPopup) {
        popupHeader.addEventListener("click", () => {
            if (popupContainer.classList.contains('level-2')) {
                if (currentUID) { // Só carrega disciplinas se estiver logado
                    carregarDisciplinasPopup();
                } else {
                    if (disciplinaSelect) {
                        disciplinaSelect.innerHTML = '<option value="">Faça login para registrar</option>';
                        disciplinaSelect.disabled = true;
                    }
                    if (registerBtn) registerBtn.disabled = true;
                }
                popupContainer.classList.remove('level-2');
                popupContainer.classList.add('level-1');
                popupContainer.style.transition = ''; 
                popupContainer.style.transform = '';
                if(feedbackDiv) feedbackDiv.style.display = 'none';
            }
        });

        // ... (Lógica de handleDragStart, handleDragMove, handleDragEnd - como no seu original) ...
        let isDragging = false; let startY = 0; let currentY = 0; let deltaY = 0;
        const dragThreshold = 70;
        const getClientY = (event) => { if(event.touches&&event.touches.length>0){return event.touches[0].clientY}if(event.changedTouches&&event.changedTouches.length>0){return event.changedTouches[0].clientY}return event.clientY};
        const handleDragStart = (event) => { if(!popupContainer.classList.contains('level-1'))return;isDragging=!0;startY=getClientY(event);deltaY=0;popupContainer.style.transition='none';document.addEventListener('mousemove',handleDragMove);document.addEventListener('touchmove',handleDragMove,{passive:!1});document.addEventListener('mouseup',handleDragEnd);document.addEventListener('touchend',handleDragEnd);document.addEventListener('mouseleave',handleDragEnd);if(event.type!=='touchstart'){event.preventDefault()}};
        const handleDragMove = (event) => { if(!isDragging)return;event.preventDefault();currentY=getClientY(event);deltaY=currentY-startY;if(deltaY>0){popupContainer.style.transform=`translateY(${deltaY}px)`}else{popupContainer.style.transform='translateY(0px)'}};
        const handleDragEnd = (event) => { if(!isDragging)return;isDragging=!1;popupContainer.style.transition='';popupContainer.style.transform='';if(deltaY>dragThreshold){popupContainer.classList.remove('level-1');popupContainer.classList.add('level-2');if(feedbackDiv)feedbackDiv.style.display='none'}document.removeEventListener('mousemove',handleDragMove);document.removeEventListener('touchmove',handleDragMove);document.removeEventListener('mouseup',handleDragEnd);document.removeEventListener('touchend',handleDragEnd);document.removeEventListener('mouseleave',handleDragEnd)};
        
        popupDragHandle.addEventListener('mousedown', handleDragStart);
        popupDragHandle.addEventListener('touchstart', handleDragStart, { passive: false });
        formRegistroPopup.addEventListener("submit", registrarSessaoCompleta);
        const restrictToNumbers = (event) => { event.target.value = event.target.value.replace(/[^0-9]/g, ''); };
        if(tempoInput) tempoInput.addEventListener("input", restrictToNumbers);
        if(questoesInput) questoesInput.addEventListener("input", restrictToNumbers);
        if(acertosInput) acertosInput.addEventListener("input", restrictToNumbers);
    } else {
        console.error("Elementos essenciais do Popup de Registro não encontrados. O popup não será funcional.");
    }

    // NOVO: Observador de Autenticação para definir currentUID e carregar disciplinas iniciais
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUID = user.uid;
            console.log("POPUP REGISTRO: Usuário logado, UID:", currentUID);
            if (popupContainer && popupContainer.classList.contains('level-1')) { // Se o popup estiver aberto
                carregarDisciplinasPopup();
            } else if (registerBtn) { // Se o popup estiver minimizado, apenas habilita o botão
                registerBtn.disabled = false; // Ou chame carregarDisciplinas para ter a lista pronta
            }
        } else {
            currentUID = null;
            console.log("POPUP REGISTRO: Nenhum usuário logado.");
            if (disciplinaSelect) {
                disciplinaSelect.innerHTML = '<option value="">Faça login para registrar</option>';
                disciplinaSelect.disabled = true;
            }
            if (registerBtn) registerBtn.disabled = true;
        }
    });
});