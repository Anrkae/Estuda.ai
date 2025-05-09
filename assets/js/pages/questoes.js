// assets/js/pages/questoes.js

document.addEventListener('DOMContentLoaded', () => {

    // === Elementos do DOM ===
    const assuntoInput = document.getElementById('assuntoInput');
    const bibliografiaInput = document.getElementById('bibliografiaInput');
    const disciplinaSelect = document.getElementById('disciplinaSelect');
    const numQuestoesInput = document.getElementById('numQuestoesInput');
    const tipoQuestaoSelect = document.getElementById('tipoQuestaoSelect');
    const nivelQuestaoSelect = document.getElementById('nivelQuestaoSelect');
    const generateButton = document.getElementById('generateButton');
    const questoesOutput = document.getElementById('questoesOutput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const finalizeButton = document.getElementById('finalizeButton');
    const generatorBlock = generateButton ? generateButton.closest('.bloco') : null;

    // === Elementos do Popup ===
    const popupOverlay = document.getElementById('popupOverlay');
    const popupMessageBox = document.getElementById('popupMessageBox');
    const popupContent = document.getElementById('popupContent');
    const popupCloseButton = document.getElementById('popupCloseButton');

    // === Configuração da API OpenRouter ===
    // !!! ATENÇÃO: A chave da API e a URL PRINCIPAL FORAM MOVIDAS PARA O BACKEND !!!
    // Agora o frontend chama a SUA Netlify Function
    const NETLIFY_FUNCTION_URL = '/.netlify/functions/generateQuestions'; // Endpoint da sua função Netlify

    const RESULTS_STORAGE_KEY = 'sessoesEstudo';
    const DISCIPLINAS_STORAGE_KEY = 'disciplinas';

    // --- Variáveis Globais ---
    let currentSessionStats = {
        id: null, totalQuestions: 0, answeredCount: 0,
        correctCount: 0, disciplina: null, startTime: null
    };
    let popupTimeoutId = null; // Para controlar o fechamento automático do popup
    // questionsDataStore agora é populado com dados parseados recebidos do backend
    let questionsDataStore = {}; // Armazena dados completos das questões (incluindo resolução)


    // === Função: Popular Dropdown de Disciplinas ===
    function populateDisciplinaDropdown() {
        const storedData = localStorage.getItem(DISCIPLINAS_STORAGE_KEY);
        disciplinaSelect.innerHTML = '<option value="">-- Selecione a Disciplina --</option>';
        if (storedData) {
            try {
                const disciplinas = JSON.parse(storedData);
                if (Array.isArray(disciplinas) && disciplinas.every(item => typeof item === 'object' && item !== null && typeof item.nome === 'string')) {
                    disciplinas.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
                    disciplinas.forEach(disciplinaObj => {
                        const nomeDisciplina = disciplinaObj.nome.trim();
                        if (nomeDisciplina) {
                            const option = document.createElement('option');
                            option.value = nomeDisciplina;
                            option.textContent = nomeDisciplina;
                            disciplinaSelect.appendChild(option);
                        }
                    });
                } else {
                    console.warn(`Dados em localStorage['${DISCIPLINAS_STORAGE_KEY}'] não são um array de objetos com a propriedade 'nome' string.`);
                }
            } catch (error) {
                console.error(`Erro ao parsear ou processar disciplinas do localStorage ('${DISCIPLINAS_STORAGE_KEY}'):`, error);
            }
        } else {
            console.log(`Nenhuma disciplina encontrada em localStorage['${DISCIPLINAS_STORAGE_KEY}'].`);
        }
    }

    // === Event Listeners ===
    generateButton.addEventListener('click', handleGenerateQuestions);
    finalizeButton.addEventListener('click', () => finalizeSession(true));

    questoesOutput.addEventListener('click', (event) => {
        const target = event.target;
        // Verifica se o clique foi no botão de opção, confirmar resposta ou ver resolução
        if (target.matches('.option-btn, .option-btn *')) { // Permite clique no span interno da opção
             const optionBtn = target.closest('.option-btn'); // Encontra o botão pai
             if (optionBtn && !optionBtn.disabled) { handleOptionClick(optionBtn); }
        }
        else if (target.matches('.confirm-answer-btn')) { if (!target.disabled) { handleConfirmAnswer(target); } }
        else if (target.matches('.view-resolution-btn')) { if (!target.disabled) { handleViewResolution(target); } }
    });

    window.addEventListener('beforeunload', handleBeforeUnload);

    // === Event Listeners do Popup ===
    if (popupCloseButton) {
        popupCloseButton.addEventListener('click', hidePopup);
    }
    if (popupOverlay) {
        popupOverlay.addEventListener('click', (event) => {
            if (event.target === popupOverlay) {
                hidePopup();
            }
        });
    }

    // === Chamar a função para popular o dropdown ===
    populateDisciplinaDropdown();


    // === Funções Auxiliares de UI ===
    function showLoading(isLoading) {
        hidePopup(); // Oculta popups de erro/status enquanto carrega
        loadingIndicator.style.display = isLoading ? 'inline-flex' : 'none';
        generateButton.disabled = isLoading;
         // Desabilitar outros inputs durante o carregamento? Pode ser boa ideia
         assuntoInput.disabled = isLoading;
         bibliografiaInput.disabled = isLoading;
         disciplinaSelect.disabled = isLoading;
         numQuestoesInput.disabled = isLoading;
         tipoQuestaoSelect.disabled = isLoading;
         nivelQuestaoSelect.disabled = isLoading;
    }

    function resetSessionState() {
        currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, startTime: null };
        finalizeButton.style.display = 'none';
        questionsDataStore = {}; // Limpa o armazenamento de dados das questões
        console.log("Estado da sessão e armazenamento de questões resetados.");
    }

    function clearOutput() {
        questoesOutput.innerHTML = '';
        hidePopup();
        console.log("Output clear.");
    }

    // === Funções do Popup ===
    function showPopup(message, type = 'info', autoCloseDelay = null) {
        if (!popupOverlay || !popupMessageBox || !popupContent) {
            console.error("Elementos do Popup não encontrados no DOM.");
            alert(message); // Fallback
            return;
        }
        if (popupTimeoutId) {
            clearTimeout(popupTimeoutId);
            popupTimeoutId = null;
        }
        popupContent.textContent = message;
        popupMessageBox.className = `popup-message-box ${type}`;
        popupOverlay.classList.add('visible');
        if (autoCloseDelay && typeof autoCloseDelay === 'number' && autoCloseDelay > 0) {
            popupTimeoutId = setTimeout(hidePopup, autoCloseDelay);
        }
    }

    function hidePopup() {
        if (popupTimeoutId) {
            clearTimeout(popupTimeoutId);
            popupTimeoutId = null;
        }
        if (popupOverlay) {
            popupOverlay.classList.remove('visible');
        }
    }

    function showError(message) {
        questoesOutput.innerHTML = '';
        showPopup(message, 'error');
        resetSessionState(); // Reseta a sessão em caso de erro na geração
        showLoading(false);
    }

    function showStatus(message, type = 'info') {
        const autoClose = (type === 'success' || type === 'info' || type === 'warning');
        showPopup(message, type, autoClose ? 5000 : null);
    }

     // === Função: Salvar Resumo da Sessão ===
     function saveSessionSummary() {
        if (!currentSessionStats.id || currentSessionStats.totalQuestions === 0) return;
        console.log("Tentando salvar resumo da sessão ID:", currentSessionStats.id);
        let durationMs = 0; if(currentSessionStats.startTime) { durationMs = Date.now() - currentSessionStats.startTime; }
        let durationFromTimer = null;
        if (window.timerPopupAPI && typeof window.timerPopupAPI.getDuration === 'function') {
            try { durationFromTimer = window.timerPopupAPI.getDuration(); if (typeof durationFromTimer === 'object' && durationFromTimer !== null && typeof durationFromTimer.ms === 'number') { durationMs = durationFromTimer.ms; } else if (typeof durationFromTimer === 'number') { durationMs = durationFromTimer; } console.log("Duração obtida do timerPopupAPI:", durationMs); } catch (e) { console.error("Erro ao chamar getDuration:", e); }
        } else { console.warn("Função timerPopupAPI.getDuration() não encontrada. Usando cálculo manual."); }
        const summary = { id: currentSessionStats.id, timestamp: new Date().toISOString(), disciplina: currentSessionStats.disciplina, totalQuestions: currentSessionStats.totalQuestions, answeredCount: currentSessionStats.answeredCount, correctCount: currentSessionStats.correctCount, durationMs: durationMs };
        try { const existingSummaries = JSON.parse(localStorage.getItem(RESULTS_STORAGE_KEY) || '[]'); if (!Array.isArray(existingSummaries)) throw new Error("Formato inválido no localStorage"); const index = existingSummaries.findIndex(s => s.id === summary.id); if (index === -1) { existingSummaries.push(summary); } else { existingSummaries[index] = summary; } localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(existingSummaries)); console.log(`Resumo da sessão ${summary.id} salvo com sucesso.`); } catch (error) { console.error("Erro ao salvar resumo da sessão no localStorage:", error); showStatus("Erro ao salvar o resumo da sessão.", "error"); }
    }

    // === Função: Finalizar Sessão de Estudo ===
    function finalizeSession(openPanel = false) {
        if (!currentSessionStats.id || currentSessionStats.totalQuestions === 0) return; // Só finaliza se houver sessão ativa
        const sessionId = currentSessionStats.id;
        console.log(`Finalizando sessão ID: ${sessionId}. Flag openPanel=${openPanel}`);
        if (window.timerPopupAPI && typeof window.timerPopupAPI.stopTimer === 'function') { try { console.log("Chamando timerPopupAPI.stopTimer()"); window.timerPopupAPI.stopTimer(); } catch (e) { console.error("Erro ao chamar stopTimer:", e); } } else { console.warn('Função timerPopupAPI.stopTimer() não encontrada.'); }
        saveSessionSummary();
        const wasActive = currentSessionStats.id !== null; // Verifica se havia uma sessão ativa antes de resetar
        resetSessionState();

        if (openPanel && wasActive) {
            console.log("finalizeSession: Condition openPanel=true met. Attempting to open panel.");
            if (window.timerPopupAPI && typeof window.timerPopupAPI.openPanel === 'function') {
                try {
                    console.log("Chamando timerPopupAPI.openPanel()");
                    window.timerPopupAPI.openPanel();
                } catch (e) {
                    console.error("Erro ao chamar openPanel:", e);
                    showStatus("Sessão finalizada e salva. Painel não disponível.", "info");
                }
            } else {
                console.warn('Função timerPopupAPI.openPanel() não encontrada.');
                showStatus("Sessão finalizada e salva. Painel não disponível.", "info");
            }
        } else if (wasActive) {
             console.log("finalizeSession: Condition openPanel=false met or no session active. NOT opening panel.");
             // Só mostra status de sucesso se realmente finalizou uma sessão que estava ativa
             showStatus("Sessão finalizada e salva.", "success");
        } else {
             console.log("finalizeSession: No active session to finalize.");
        }
        console.log(`Sessão ${sessionId} finalizada.`);
    }

     // === Função: Lidar com Saída da Página ===
     function handleBeforeUnload(event) {
         // Verifica se há uma sessão ativa para finalizar
         if (currentSessionStats.id && currentSessionStats.totalQuestions > 0 && currentSessionStats.answeredCount < currentSessionStats.totalQuestions) {
             console.log("beforeunload: Finalizando sessão ativa incompleta...");
             // Não queremos abrir o painel ao sair
             finalizeSession(false);
             // Não exibe a mensagem padrão do navegador (event.preventDefault e event.returnValue são para a mensagem "Você tem alterações não salvas")
             // Para finalização silenciosa ao sair, basta chamar finalizeSession(false).
             // Se você QUISER que o navegador pergunte "Tem certeza que quer sair?", descomente as linhas abaixo:
             // event.preventDefault();
             // event.returnValue = ''; // Padrão para a maioria dos navegadores
         } else if (currentSessionStats.id && currentSessionStats.answeredCount === currentSessionStats.totalQuestions) {
              console.log("beforeunload: Sessão completa, já finalizada.");
              // Já está finalizada ou será finalizada pelo check de answeredCount == totalQuestions
              // Não faz nada aqui para evitar chamada duplicada ou mensagem desnecessária.
         } else {
              console.log("beforeunload: Nenhuma sessão ativa para finalizar.");
         }
     }


    // === Função: Exibir Questões Parseadas (Recebe dados já parseados do backend) ===
    // Esta função AGORA espera um array de objetos questão já formatados.
    function displayParsedQuestions(questionsArray) {
         questoesOutput.innerHTML = '';
         questionsDataStore = {}; // Limpa antes de adicionar novas
         if (!questionsArray || questionsArray.length === 0) {
             questoesOutput.innerHTML = '<p class="empty-state">Nenhuma questão foi gerada ou processada pelo servidor.</p>';
             return;
         }
         questionsArray.forEach((qData, index) => {
             // Armazena dados completos para uso posterior (resolução)
             questionsDataStore[qData.id] = qData;

             const questionDiv = document.createElement('div');
             questionDiv.className = 'question-item';
             questionDiv.id = qData.id;
             questionDiv.dataset.questionType = qData.type;
             questionDiv.dataset.answered = 'false'; // Sempre inicia como não respondida no frontend
             if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') {
                 questionDiv.dataset.correctAnswer = qData.correctAnswer || '';
                 questionDiv.dataset.selectedOption = '';
             }

             // === Adiciona a div de metadados se existirem ===
             if (qData.metaSource || qData.metaYear) {
                 const metaDiv = document.createElement('div');
                 metaDiv.className = 'question-meta';

                 if (qData.metaSource) {
                     const sourceSpan = document.createElement('span');
                     sourceSpan.className = 'meta-source';
                     sourceSpan.textContent = qData.metaSource;
                     metaDiv.appendChild(sourceSpan);
                 }

                 if (qData.metaSource && qData.metaYear) {
                      const separatorSpan = document.createElement('span');
                      separatorSpan.className = 'meta-separator';
                      separatorSpan.textContent = ' - ';
                      metaDiv.appendChild(separatorSpan);
                 }

                 if (qData.metaYear) {
                     const yearSpan = document.createElement('span');
                     yearSpan.className = 'meta-year';
                     yearSpan.textContent = qData.metaYear;
                     metaDiv.appendChild(yearSpan);
                 }

                 questionDiv.appendChild(metaDiv);
             }
             // === FIM: Adiciona a div de metadados ===


             const questionText = document.createElement('p');
             questionText.className = 'question-text';
             const sanitizedText = qData.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
             questionText.innerHTML = `<strong>${index + 1}.</strong> ${sanitizedText.replace(/\n/g, '<br>')}`;
             questionDiv.appendChild(questionText);

             // Adiciona imagem se existir
             if (qData.image) {
                 const imgElement = document.createElement('img');
                 imgElement.src = qData.image; // Assume que é uma URL válida
                 imgElement.alt = `Imagem para a questão ${index + 1}`;
                 imgElement.className = 'question-image';
                 imgElement.onerror = () => {
                     console.warn(`Erro ao carregar imagem: ${qData.image} para questão ${qData.id}`);
                     imgElement.alt = `Erro ao carregar imagem para a questão ${index + 1}`;
                     imgElement.style.display = 'none'; // Oculta a imagem quebrada
                     const errorMsg = document.createElement('p');
                     errorMsg.className = 'image-load-error';
                     errorMsg.textContent = `[Erro ao carregar imagem: ${qData.image}]`;
                     imgElement.parentNode.insertBefore(errorMsg, imgElement.nextSibling); // Adiciona a mensagem após a imagem
                 };
                 questionDiv.appendChild(imgElement);
             }

             if (qData.type === 'error') {
                 questionDiv.classList.add('question-error');
                 questoesOutput.appendChild(questionDiv);
                 return; // Pula o resto para questões com erro
             }

             const optionsContainer = document.createElement('div');
             optionsContainer.className = 'options-container';
             if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') {
                 // Usa as opções passadas pelo backend
                 const optionKeys = (qData.type === 'multipla_escolha') ? Object.keys(qData.options).filter(k => ['A','B','C','D'].includes(k)).sort() : ['V', 'F'];
                 optionKeys.forEach(key => {
                     if (qData.options[key] !== undefined) {
                         const optionButton = document.createElement('button');
                         optionButton.className = 'option-btn';
                         optionButton.dataset.value = key;
                         const sanitizedOptionText = (qData.options[key] || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");

                         const letterHTML = `<span class="option-letter">${key})</span>`;
                         let contentText = '';

                         if (qData.type === 'verdadeiro_falso') {
                             const label = (key === 'V') ? 'Verdadeiro' : 'Falso';
                             // Mostra o texto original da API se for diferente de "Verdadeiro" ou "Falso"
                             const text = (sanitizedOptionText && sanitizedOptionText.toLowerCase() !== 'verdadeiro' && sanitizedOptionText.toLowerCase() !== 'falso') ? `: ${sanitizedOptionText}` : '';
                             contentText = `${label}${text}`;
                         } else { // Multipla Escolha
                             contentText = sanitizedOptionText;
                         }

                         const contentHTML = `<span class="option-content">${contentText.replace(/\n/g, '<br>')}</span>`;

                         optionButton.innerHTML = letterHTML + contentHTML;

                         optionsContainer.appendChild(optionButton);
                     }
                 });
             } else if (qData.type === 'dissertativa_curta') {
                 const answerP = document.createElement('p');
                 answerP.className = 'dissertative-info';
                 let dissertativeText = `<i>Questão dissertativa.`;
                 if(qData.suggestedAnswer) {
                     const sanitizedAnswer = qData.suggestedAnswer.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                     dissertativeText += ` Resposta Sugerida: ${sanitizedAnswer}`;
                 } else {
                     dissertativeText += ` Resposta não interativa.`;
                 }
                 dissertativeText += `</i>`;
                 answerP.innerHTML = dissertativeText;
                 optionsContainer.appendChild(answerP);
             }
             questionDiv.appendChild(optionsContainer);

             // Feedback Area
             const feedbackArea = document.createElement('div');
             feedbackArea.className = 'feedback-area';

             const feedbackDiv = document.createElement('div');
             feedbackDiv.className = 'feedback-message';
             feedbackDiv.style.display = 'none';
             feedbackArea.appendChild(feedbackDiv);

             // Botão Responder (apenas para interativas)
             if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') {
                 const confirmButton = document.createElement('button');
                 confirmButton.className = 'confirm-answer-btn';
                 confirmButton.textContent = 'Responder';
                 confirmButton.disabled = true; // Desabilitado até uma opção ser selecionada
                 feedbackArea.appendChild(confirmButton);
             }

             // Botão Ver Resolução (se houver resolução)
             if (qData.resolution) {
                 const resolutionButton = document.createElement('button');
                 resolutionButton.className = 'view-resolution-btn';
                 resolutionButton.textContent = 'Ver Resolução';
                 resolutionButton.dataset.questionId = qData.id;
                 resolutionButton.style.display = 'none'; // Escondido inicialmente
                 feedbackArea.appendChild(resolutionButton);
             }

             questionDiv.appendChild(feedbackArea);

             // Área para exibir a resolução
             if (qData.resolution) {
                 const resolutionDiv = document.createElement('div');
                 resolutionDiv.className = 'resolution-area';
                 resolutionDiv.style.display = 'none';
                 // Conteúdo da resolução será inserido quando o botão "Ver Resolução" for clicado
                 questionDiv.appendChild(resolutionDiv);
             }

             questoesOutput.appendChild(questionDiv);
         });
    }


    // === Função: Lidar com Clique na OPÇÃO (Seleciona, não confirma) ===
    function handleOptionClick(clickedButton) {
        const questionDiv = clickedButton.closest('.question-item'); if (!questionDiv || questionDiv.dataset.answered === 'true') { return; } const confirmAnswerBtn = questionDiv.querySelector('.confirm-answer-btn'); const allOptionButtons = questionDiv.querySelectorAll('.option-btn'); const selectedValue = clickedButton.dataset.value; allOptionButtons.forEach(btn => btn.classList.remove('selected-preview')); clickedButton.classList.add('selected-preview'); questionDiv.dataset.selectedOption = selectedValue; console.log(`Set selectedOption=${selectedValue} on ${questionDiv.id}`); if (confirmAnswerBtn) { confirmButton.disabled = false; console.log(`Enabled confirm button for ${questionDiv.id}`); } else { console.error("Botão .confirm-answer-btn não encontrado para", questionDiv.id); }
     }

    // === Função: Lidar com Clique no Botão RESPONDER (Confirma a resposta) ===
    function handleConfirmAnswer(confirmButton) {
         console.log("handleConfirmAnswer triggered for button:", confirmButton); const questionDiv = confirmButton.closest('.question-item'); console.log("Associated questionDiv:", questionDiv); if (!questionDiv) { console.error("Não foi possível encontrar o .question-item pai do botão."); return; } const userAnswer = questionDiv.dataset.selectedOption; const isAnswered = questionDiv.dataset.answered === 'true'; console.log("Checking conditions: ", { userAnswer: userAnswer, isAnswered: isAnswered, sessionId: currentSessionStats.id }); if (!userAnswer || isAnswered) { console.warn("Tentativa de confirmar resposta inválida: Nenhuma opção selecionada ou questão já respondida.", { selectedOption: userAnswer, isAnswered: isAnswered }); confirmButton.style.opacity = '0.5'; setTimeout(() => { confirmButton.style.opacity = '1'; }, 300); return; } if (!currentSessionStats.id) { console.warn("Tentativa de responder sem sessão ativa."); showStatus("Erro: Sessão não iniciada.", "error"); return; } console.log("Passed initial checks. Proceeding with answer evaluation...");
         const correctAnswer = questionDiv.dataset.correctAnswer;
         const isCorrect = userAnswer === correctAnswer;
         const feedbackDiv = questionDiv.querySelector('.feedback-message');
         const allOptionButtons = questionDiv.querySelectorAll('.option-btn');
         const originallySelectedButton = Array.from(allOptionButtons).find(btn => btn.dataset.value === userAnswer);
         const resolutionButton = questionDiv.querySelector('.view-resolution-btn');

         console.log(`Confirmando resposta para ${questionDiv.id}: User=${userAnswer}, Correct=${correctAnswer}, IsCorrect=${isCorrect}`);
         questionDiv.dataset.answered = 'true';
         questionDiv.classList.add('answered');
         questionDiv.classList.add(isCorrect ? 'correct' : 'incorrect');

         // Atualiza classes dos botões de opção
         allOptionButtons.forEach(btn => {
             btn.disabled = true; // Desabilita todas as opções
             btn.classList.remove('selected-preview'); // Remove a pré-visualização
             if (btn.dataset.value === userAnswer) {
                 btn.classList.add('selected-user-answer'); // Marca a opção selecionada pelo usuário
             }
             if (btn.dataset.value === correctAnswer) {
                 btn.classList.add('correct-answer-highlight'); // Marca a resposta correta
             }
         });

         confirmButton.disabled = true; // Desabilita o botão de responder

         if (feedbackDiv) {
             feedbackDiv.textContent = isCorrect ? 'Resposta Correta!' : `Incorreto. A resposta correta é: ${correctAnswer}`;
             feedbackDiv.className = `feedback-message ${isCorrect ? 'correct' : 'incorrect'}`; // Adiciona classe para estilização
             feedbackDiv.style.display = 'block';
         } else { console.warn("Elemento .feedback-message não encontrado para", questionDiv.id); }

         if (resolutionButton) {
             resolutionButton.style.display = 'inline-flex';
             console.log(`Botão 'Ver Resolução' exibido para ${questionDiv.id}`);
         }

         // Atualiza as estatísticas da sessão
         currentSessionStats.answeredCount++;
         if (isCorrect) { currentSessionStats.correctCount++; }
         console.log('Sessão atual:', currentSessionStats);

         // Notifica o timer externo
         if (window.timerPopupAPI && typeof window.timerPopupAPI.updateStats === 'function') {
             try { window.timerPopupAPI.updateStats( currentSessionStats.answeredCount, currentSessionStats.correctCount ); } catch(e) { console.error("Erro ao chamar updateStats:", e); }
         } else { console.warn('API do Timer Popup (updateStats) não encontrada.'); }

         // Verifica se a sessão terminou
         if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions && currentSessionStats.totalQuestions > 0) {
             console.log("Todas as questões foram respondidas!");
             showStatus("Simulado concluído! Verifique o painel de tempo.", "success");
             finalizeSession(true); // Finaliza e abre o painel
         }
     }

    // === Função para Lidar com Clique no Botão VER RESOLUÇÃO ===
    function handleViewResolution(resolutionButton) {
        const questionId = resolutionButton.dataset.questionId;
        const questionDiv = document.getElementById(questionId);
        const resolutionArea = questionDiv ? questionDiv.querySelector('.resolution-area') : null;
        // Pega os dados da questão do armazenamento local do frontend, populado pelo displayParsedQuestions
        const questionData = questionsDataStore[questionId];

        if (!questionDiv || !resolutionArea || !questionData || !questionData.resolution) {
            console.error(`Erro ao tentar mostrar resolução para questão ${questionId}. Elementos ou dados não encontrados.`, { questionDivExists: !!questionDiv, resolutionAreaExists: !!resolutionArea, questionDataExists: !!questionData, hasResolution: questionData?.resolution });
            showStatus("Erro ao carregar a resolução.", "error");
            return;
        }

        const sanitizedResolution = questionData.resolution.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        resolutionArea.innerHTML = `<strong>Resolução:</strong><br>${sanitizedResolution.replace(/\n/g, '<br>')}`;
        resolutionArea.style.display = 'block';

        resolutionButton.disabled = true; // Desabilita o botão após mostrar

        console.log(`Resolução exibida para ${questionId}`);
    }


    // === Função Principal: Gerar Questões (AGORA CHAMA A NETLIFY FUNCTION) ===
    async function handleGenerateQuestions() {
        hidePopup();
        if (currentSessionStats.id) {
             console.log("Gerando novas questões, finalizando sessão anterior...");
             finalizeSession(false); // Finaliza a sessão anterior silenciosamente
        }

        const assunto = assuntoInput.value.trim();
        const bibliografia = bibliografiaInput.value.trim();
        const disciplinaSelecionada = disciplinaSelect.value;
        const numQuestoes = parseInt(numQuestoesInput.value, 10);
        const tipoQuestao = tipoQuestaoSelect.value;
        const nivelQuestao = nivelQuestaoSelect.value; // Valor selecionado no dropdown de dificuldade

        // Validação básica no frontend antes de chamar a função
        if (!assunto) { assuntoInput.focus(); return showError("Por favor, informe o Assunto Principal."); }
        if (isNaN(numQuestoes) || numQuestoes < 1 || numQuestoes > 20) { numQuestoesInput.focus(); return showError("Número de questões inválido (1-20)."); }
        if (!nivelQuestao) { nivelQuestaoSelect.focus(); return showError("Por favor, selecione o Nível das questões."); }
         if (!tipoQuestao) { tipoQuestaoSelect.focus(); return showError("Por favor, selecione o Tipo de Questão."); }


        const disciplinaParaSessao = disciplinaSelecionada || "Geral";

        console.log(`Iniciando geração via Netlify Function... Assunto: ${assunto}, Nível: ${nivelQuestao}, Tipo: ${tipoQuestao}, Num: ${numQuestoes}`);
        showLoading(true);
        clearOutput();

        // === Dados para enviar para a Netlify Function ===
        const requestBodyToFunction = {
            assunto: assunto,
            bibliografia: bibliografia,
            disciplinaSelecionada: disciplinaSelecionada, // Envia o valor selecionado
            numQuestoes: numQuestoes,
            tipoQuestao: tipoQuestao,
            nivelQuestao: nivelQuestao
        };

        try {
            // === Requisição Fetch para a SUA Netlify Function ===
            const response = await fetch(NETLIFY_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // A chave da API OpenRouter NÃO vai aqui. Ela é adicionada no backend.
                },
                body: JSON.stringify(requestBodyToFunction) // Envia os inputs do usuário para a função
            });

             // A função Netlify deve retornar um status code e um corpo JSON
             const responseData = await response.json();
             console.log("Resposta da Netlify Function:", responseData);

             if (!response.ok) {
                 // A Netlify Function retornou um erro (status code diferente de 200-299)
                 const errorMessage = responseData.error || `Erro na função do servidor (Status: ${response.status})`;
                 console.error(`Erro retornado pela Netlify Function (Status ${response.status}):`, responseData);
                 showError(`Erro ao gerar questões: ${errorMessage}`);
                 resetSessionState();
                 showLoading(false);
                 return;
             }

             // A Netlify Function retornou sucesso (status code 200-299)
             // O corpo da resposta deve conter os dados das questões já parseados
             const { questionsArray, totalValidQuestions, errorQuestionsCount, finishReason } = responseData;

            console.log(`Dados recebidos da função: ${totalValidQuestions} questões válidas, ${errorQuestionsCount} com erro.`);
            console.log("Array de questões recebido:", questionsArray);

            displayParsedQuestions(questionsArray); // Exibe o array completo, incluindo erros

            if (totalValidQuestions > 0) {
                // Inicia a nova sessão apenas com base nas questões VÁLIDAS
                currentSessionStats = {
                    id: `sess-${Date.now()}`,
                    totalQuestions: totalValidQuestions, // Conta apenas as válidas para a sessão
                    answeredCount: 0,
                    correctCount: 0,
                    disciplina: disciplinaParaSessao,
                    startTime: Date.now()
                };
                console.log("Nova sessão iniciada:", currentSessionStats);

                // Notifica o timer externo
                if (window.timerPopupAPI && typeof window.timerPopupAPI.startSession === 'function') {
                     try { console.log(`Iniciando sessão no Timer Popup ID: ${currentSessionStats.id}`); window.timerPopupAPI.startSession( currentSessionStats.totalQuestions, currentSessionStats.disciplina ); console.log("handleGenerateQuestions SUCCESS: Called startSession."); } catch (e) { console.error("Erro ao chamar startSession:", e); }
                     finalizeButton.style.display = 'inline-flex'; // Mostra o botão Finalizar

                      let successMsg = `Geradas ${totalValidQuestions} questões válidas! Acompanhe a sessão no painel abaixo.`;
                      if (questionsArray.length !== totalValidQuestions) {
                          successMsg += ` (${errorQuestionsCount} questão(ões) não puderam ser carregadas devido a erros de formatação.)`;
                          showStatus(successMsg, 'warning'); // Usa warning se houve erros de parsing
                      } else {
                           showStatus(successMsg, 'success');
                      }


                } else {
                    console.warn('API do Timer Popup (startSession) não encontrada.');
                    finalizeButton.style.display = 'inline-flex';
                    let statusMsg = `Questões geradas (${totalValidQuestions} válidas). O timer externo não pôde ser iniciado.`;
                    if (questionsArray.length !== totalValidQuestions) {
                         statusMsg += ` (${errorQuestionsCount} com erro de formatação.)`;
                    }
                    showStatus(statusMsg, 'warning');
                }

                // Minimizando o bloco do gerador após gerar
                if (generatorBlock && !generatorBlock.classList.contains('minimizado')) {
                    console.log("Minimizando bloco do gerador...");
                    const minimizeButton = generatorBlock.querySelector('.botao-minimizar');
                     if (minimizeButton) {
                         minimizeButton.click(); // Simula o clique no botão de minimizar, se existir
                     } else {
                         // Fallback manual se o botão não for encontrado ou o click não funcionar
                         generatorBlock.classList.add('minimizado');
                         const toggleIcon = generatorBlock.querySelector('.botao-minimizar i'); // Assume que tem um ícone
                         if (toggleIcon) {
                             toggleIcon.classList.remove('fa-minus');
                             toggleIcon.classList.add('fa-plus');
                             if (generatorBlock.querySelector('.botao-minimizar')) {
                                 generatorBlock.querySelector('.botao-minimizar').setAttribute('aria-label', 'Expandir');
                             }
                         }
                     }
                }

                // Rola para as questões
                setTimeout(() => {
                     questoesOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });
                     console.log("Rolando para o topo da área de questões...");
                }, 100);


            } else {
                 // Nenhuma questão válida foi gerada
                 if (questionsArray.length > 0 && questionsArray.every(q => q.type === 'error')) {
                     showError("Nenhuma questão válida gerada pela API. Verifique o console do servidor/Netlify Function Logs para detalhes.");
                 } else {
                      showError("Erro: Nenhuma questão válida foi retornada pelo servidor ou o formato estava totalmente irreconhecível.");
                 }
                 resetSessionState();
             }

            // Avisos sobre o motivo de término da geração pela API
             if (finishReason && finishReason !== 'stop' && finishReason !== 'length') {
                 console.warn("Geração da API pode ter sido interrompida pelo motivo:", finishReason);
                 // O status já foi exibido, talvez adicionar um console.log visível no frontend?
             } else if (finishReason === 'length' && totalValidQuestions < numQuestoes) {
                 console.warn("Geração interrompida por MAX_TOKENS (length) no backend.");
                 // O status já mencionou que foram geradas menos questões se for o caso
             }


        } catch (error) {
            // Erro na comunicação com a Netlify Function (rede, CORS, etc.)
            console.error("Falha na requisição para a Netlify Function:", error);
            showError(`Erro de comunicação com o servidor: ${error.message || 'Falha desconhecida.'}`);
            resetSessionState();
        } finally {
            showLoading(false); // Garante que o indicador de loading suma
        }
    } // Fim de handleGenerateQuestions

}); // Fim do DOMContentLoaded
