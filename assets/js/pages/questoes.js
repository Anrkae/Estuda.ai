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
    // Usa a classe 'bloco' conforme a referência do segundo código
    const generatorBlock = generateButton ? generateButton.closest('.bloco') : null;

    // === Elementos do Popup ===
    const popupOverlay = document.getElementById('popupOverlay');
    const popupMessageBox = document.getElementById('popupMessageBox');
    const popupContent = document.getElementById('popupContent');
    const popupCloseButton = document.getElementById('popupCloseButton');

    // === Configuração da API OpenRouter ===
    // A CHAVE DA API SERÁ BUSCADA DA NETLIFY FUNCTION (Mantido conforme o primeiro código)
    const OPENROUTER_API_URL = `https://openrouter.ai/api/v1/chat/completions`;
    // Usa o modelo do segundo código como referência, mas pode ser ajustado
    const OPENROUTER_MODEL = 'deepseek/deepseek-prover-v2:free';

    const RESULTS_STORAGE_KEY = 'sessoesEstudo';
    const DISCIPLINAS_STORAGE_KEY = 'disciplinas';

    // === Função para buscar a API Key da Netlify Function ===
    async function getOpenRouterApiKeyFromNetlify() {
        // Cache simples na window para evitar múltiplas chamadas na mesma sessão de página
        if (window.openRouterApiKey) {
            return window.openRouterApiKey;
        }
        try {
            const response = await fetch("/.netlify/functions/getApiKey"); // Endpoint da Netlify Function
            if (!response.ok) {
                let errorMsg = `Erro HTTP ${response.status} ao buscar chave da API.`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) { /* ignora se não conseguir parsear json do erro */ }
                throw new Error(errorMsg);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            if (!data.apiKey) {
                throw new Error("Chave da API não recebida da função Netlify.");
            }
            window.openRouterApiKey = data.apiKey; // Armazena em cache
            return data.apiKey;
        } catch (error) {
            console.error("Erro crítico ao buscar a API Key da Netlify Function:", error);
            // Usa a função showError global, corrigindo acentos e fraseado conforme o segundo código
            if (typeof showError === 'function') {
                showError(`Falha crítica ao obter configuração da API: ${error.message}. A geração de questões não pode continuar. Por favor, recarregue a página ou contate o suporte.`);
            } else if (questoesOutput) {
                 // Fallback, corrigindo acentos e fraseado
                questoesOutput.innerHTML = `<p style="color: red; font-weight: bold;">Falha crítica ao obter configuração da API: ${error.message}. A geração de questões não pode continuar. Por favor, recarregue a página ou contate o suporte.</p>`;
            }
            // Garante que o loading seja desativado
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (generateButton) generateButton.disabled = false;
            return null; // Retorna null para indicar falha na obtenção da chave
        }
    }

    // --- Variáveis Globais ---
    let currentSessionStats = {
        id: null, totalQuestions: 0, answeredCount: 0,
        correctCount: 0, disciplina: null, startTime: null
    };
    let popupTimeoutId = null; // Para controlar o fechamento automático do popup
    let questionsDataStore = {}; // Armazena dados completos das questões (incluindo resolução)


    // === Função: Popular Dropdown de Disciplinas ===
    function populateDisciplinaDropdown() {
        // Verifica se o elemento existe, mantido do primeiro código, mas aprimorado
        if (!disciplinaSelect) {
            console.warn("Elemento disciplinaSelect não encontrado.");
            return;
        }
        const storedData = localStorage.getItem(DISCIPLINAS_STORAGE_KEY);
        disciplinaSelect.innerHTML = '<option value="">-- Selecione a Disciplina --</option>';
        if (storedData) {
            try {
                const disciplinas = JSON.parse(storedData);
                // Mantida a validação mais robusta do primeiro código
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
                     // Corrigindo acentos
                    console.warn(`Dados em localStorage['${DISCIPLINAS_STORAGE_KEY}'] não são um array de objetos com a propriedade 'nome' string.`);
                }
            } catch (error) {
                 // Corrigindo acentos
                console.error(`Erro ao parsear ou processar disciplinas do localStorage ('${DISCIPLINAS_STORAGE_KEY}'):`, error);
            }
        } else {
             // Corrigindo acentos
            console.log(`Nenhuma disciplina encontrada em localStorage['${DISCIPLINAS_STORAGE_KEY}'].`);
        }
    }

    // === Event Listeners ===
    // Adiciona verificações de existência antes de adicionar listeners, como no primeiro código
    if (generateButton) generateButton.addEventListener('click', handleGenerateQuestions);
    if (finalizeButton) finalizeButton.addEventListener('click', () => finalizeSession(true));

    if (questoesOutput) {
        questoesOutput.addEventListener('click', (event) => {
            const target = event.target;
            // Usa as classes do segundo código como referência
            if (target.matches('.option-btn, .option-btn *')) {
                 const optionBtn = target.closest('.option-btn');
                 if (optionBtn && !optionBtn.disabled) { handleOptionClick(optionBtn); }
            }
            else if (target.matches('.confirm-answer-btn')) { if (!target.disabled) { handleConfirmAnswer(target); } }
            else if (target.matches('.view-resolution-btn')) { if (!target.disabled) { handleViewResolution(target); } }
        });
    }

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
         // Adiciona verificações de existência dos elementos, como no primeiro código
        if (loadingIndicator) loadingIndicator.style.display = isLoading ? 'inline-flex' : 'none';
        if (generateButton) generateButton.disabled = isLoading;
        if (isLoading) hidePopup(); // Esconde popups quando o loading inicia
    }

    function resetSessionState() {
        currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, startTime: null };
         // Verifica existência antes de manipular style, como no primeiro código
        if (finalizeButton) finalizeButton.style.display = 'none';
        questionsDataStore = {}; // Limpa o armazenamento de dados das questões, como no segundo código
         // Corrigindo acentos
        console.log("Estado da sessão e armazenamento de questões resetados.");
    }

    function clearOutput() {
         // Verifica existência antes de manipular innerHTML, como no primeiro código
        if (questoesOutput) questoesOutput.innerHTML = '';
        hidePopup();
        console.log("Output clear.");
    }

    // === Funções do Popup ===
    function showPopup(message, type = 'info', autoCloseDelay = null) {
        if (!popupOverlay || !popupMessageBox || !popupContent) {
             // Corrigindo acentos
            console.error("Elementos do Popup não encontrados no DOM.");
            alert(message); // Fallback
            return;
        }
        if (popupTimeoutId) {
            clearTimeout(popupTimeoutId);
            popupTimeoutId = null;
        }
        popupContent.textContent = message;
        // Usa a classe 'popup-message-box' conforme a referência do segundo código
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
         // Verifica existência antes de manipular classList, como no primeiro código
        if (popupOverlay) {
            popupOverlay.classList.remove('visible');
        }
    }

    function showError(message) {
         // Verifica existência antes de manipular innerHTML, como no primeiro código
        if (questoesOutput) questoesOutput.innerHTML = '';
        showPopup(message, 'error');
        resetSessionState();
        showLoading(false);
    }

    function showStatus(message, type = 'info') {
        const autoClose = (type === 'success' || type === 'info' || type === 'warning');
        showPopup(message, type, autoClose ? 5000 : null);
    }

     // === Função: Salvar Resumo da Sessão ===
     function saveSessionSummary() {
        // Lógica copiada e corrigida (acentos) do segundo código
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
         // Lógica copiada e corrigida (acentos) do segundo código
        if (currentSessionStats.totalQuestions === 0 || !currentSessionStats.id) return;
        const sessionId = currentSessionStats.id; console.log(`Finalizando sessão ID: ${sessionId}. Flag openPanel=${openPanel}`);
        if (window.timerPopupAPI && typeof window.timerPopupAPI.stopTimer === 'function') { try { console.log("Chamando timerPopupAPI.stopTimer()"); window.timerPopupAPI.stopTimer(); } catch (e) { console.error("Erro ao chamar stopTimer:", e); } } else { console.warn('Função timerPopupAPI.stopTimer() não encontrada.'); }
        saveSessionSummary(); const wasActive = currentSessionStats.id; resetSessionState();
        if (openPanel && wasActive) { console.log("finalizeSession: Condition openPanel=true met. Attempting to open panel."); if (window.timerPopupAPI && typeof window.timerPopupAPI.openPanel === 'function') { try { console.log("Chamando timerPopupAPI.openPanel()"); window.timerPopupAPI.openPanel(); } catch (e) { console.error("Erro ao chamar openPanel:", e); } } else { console.warn('Função timerPopupAPI.openPanel() não encontrada.'); showStatus("Sessão finalizada e salva. Painel não disponível.", "info"); } } else if (wasActive) { console.log("finalizeSession: Condition openPanel=false met. NOT opening panel."); showStatus("Sessão finalizada e salva.", "success"); } console.log(`Sessão ${sessionId} finalizada.`);
    }

     // === Função: Lidar com Saída da Página ===
     function handleBeforeUnload(event) {
          // Lógica copiada e corrigida (acentos) do segundo código
         if (currentSessionStats.id && currentSessionStats.totalQuestions > 0) {
             console.log("beforeunload: Finalizando sessão ativa...");
             finalizeSession(false);
         }
     }

    // === Função: Parsear o Texto da API ===
    // Lógica completamente substituída pela versão aprimorada do segundo código
    function parseGeneratedText(text, expectedType) {
        const questions = [];
         // Inclui os novos marcadores na busca pelo início do conteúdo relevante
        const startIndex = Math.min(
            text.indexOf("[Q]") !== -1 ? text.indexOf("[Q]") : Infinity,
            text.indexOf("[SEP]") !== -1 ? text.indexOf("[SEP]") : Infinity,
            text.indexOf("[META_SOURCE]") !== -1 ? text.indexOf("[META_SOURCE]") : Infinity, // NOVO
            text.indexOf("[META_YEAR]") !== -1 ? text.indexOf("[META_YEAR]") : Infinity // NOVO
        );
        const relevantText = startIndex !== Infinity ? text.substring(startIndex) : text;


        // Inclui os novos marcadores na regex de split por SEP
        const questionBlocks = relevantText.trim().split(/\s*\[SEP\]\s*/i).filter(block => block.trim() !== '' && block.trim().toUpperCase().startsWith('[Q]'));


        if (questionBlocks.length === 0 && relevantText.trim() !== '') {
             console.warn("Nenhum bloco [SEP] encontrado ou nenhum bloco começa com [Q]. Tentando tratar como questão única se começar com [Q].");
             if (relevantText.trim().toUpperCase().startsWith('[Q]')) {
                 questionBlocks.push(relevantText.trim());
             } else {
                 console.error("Texto da API não reconhecido. Não começa com [Q] e não tem [SEP]s válidos:", relevantText);
                 return [{ id: `q-error-parse-${Date.now()}-global`, text: `Erro Crítico: Formato da resposta da API irreconhecível. Nenhum bloco [Q]...[SEP] detectado.`, type: 'error', options: {}, correctAnswer: null, resolution: null, image: null }];
             }
        }

        questionBlocks.forEach((block, index) => {
            try {
                const questionData = {
                    id: `q-${Date.now()}-${index}`,
                    text: '',
                    options: {},
                    correctAnswer: null,
                    type: expectedType,
                    answered: false,
                    resolution: null,
                    image: null,
                    metaSource: null, // NOVO: Campo para metadado Fonte/Assunto
                    metaYear: null    // NOVO: Campo para metadado Ano
                };

                // Extrai o enunciado [Q]
                // Inclui os novos marcadores na regex de parada para o enunciado
                const qMatch = block.match(/\[Q\]([\s\S]*?)(?:\[META_SOURCE\]|\[META_YEAR\]|\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]|\[IMG\]|\[RES\]|$)/i);
                if (qMatch && qMatch[1]) {
                    questionData.text = qMatch[1].trim();
                } else {
                     // Fallback se os novos marcadores ou opções/etc não forem encontrados imediatamente após [Q]
                     const linesBeforeOption = block.split(/\[META_SOURCE\]|\[META_YEAR\]|\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]|\[IMG\]|\[RES\]/i)[0];
                     questionData.text = linesBeforeOption.replace(/^\[Q\]/i, '').trim();
                     if (!questionData.text) {
                         console.warn(`Bloco ${index+1}: Não encontrou [Q] nem texto antes dos marcadores.`);
                         // Pode não ser um erro crítico se o [Q] estiver lá, mas o texto estiver vazio
                     }
                 }

                // Extrai opções, resposta, imagem, resolução E METADADOS
                const lines = block.trim().split('\n');
                let foundCorrectAnswerMarker = false;
                let foundResolutionMarker = false;

                lines.forEach(line => {
                    line = line.trim();
                    if (/^\[META_SOURCE\]/i.test(line)) { questionData.metaSource = line.substring(13).trim(); } // NOVO
                    else if (/^\[META_YEAR\]/i.test(line)) { questionData.metaYear = line.substring(11).trim(); }   // NOVO
                    else if (/^\[A\]/i.test(line)) questionData.options['A'] = line.substring(3).trim();
                    else if (/^\[B\]/i.test(line)) questionData.options['B'] = line.substring(3).trim();
                    else if (/^\[C\]/i.test(line)) questionData.options['C'] = line.substring(3).trim();
                    else if (/^\[D\]/i.test(line)) questionData.options['D'] = line.substring(3).trim();
                    else if (/^\[V\]/i.test(line)) questionData.options['V'] = line.substring(3).trim() || 'Verdadeiro';
                    else if (/^\[F\]/i.test(line)) questionData.options['F'] = line.substring(3).trim() || 'Falso';
                    else if (/^\[R\]/i.test(line)) {
                        questionData.correctAnswer = line.substring(3).trim();
                        foundCorrectAnswerMarker = true;
                    } else if (/^\[G\]/i.test(line)) {
                        questionData.suggestedAnswer = line.substring(3).trim(); // Mantido para dissertativa
                        foundCorrectAnswerMarker = true;
                    } else if (/^\[IMG\]/i.test(line)) {
                        questionData.image = line.substring(5).trim();
                    } else if (/^\[RES\]/i.test(line)) {
                        questionData.resolution = line.substring(5).trim();
                        foundResolutionMarker = true;
                    } else if (foundResolutionMarker && questionData.resolution !== null) { // Evita adicionar a linhas de resolução se ela for null
                        questionData.resolution += '\n' + line;
                    }
                });

                // Validação específica do tipo, copiada do segundo código
                 if (expectedType === 'multipla_escolha' || expectedType === 'verdadeiro_falso') {
                     if (!foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Marcador de resposta [R] não encontrado.`);
                     if (!questionData.correctAnswer && foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Valor da resposta [R] está vazio.`);
                     if (Object.keys(questionData.options).length === 0) console.warn(`Bloco ${index+1}: Nenhuma opção ([A],[B]... ou [V],[F]) encontrada.`);
                     if (!foundResolutionMarker) console.warn(`Bloco ${index+1}: Resolução [RES] não encontrada.`);
                     if (!questionData.resolution && foundResolutionMarker) console.warn(`Bloco ${index+1}: Valor da resolução [RES] está vazio.`);

                    if (expectedType === 'multipla_escolha') {
                        const upperCaseCorrect = (questionData.correctAnswer || '').toUpperCase();
                        if (foundCorrectAnswerMarker && !['A', 'B', 'C', 'D'].includes(upperCaseCorrect)) console.warn(`Bloco ${index+1}: Resposta [R] "${questionData.correctAnswer}" inválida. Use A, B, C ou D.`);
                         if (foundCorrectAnswerMarker && questionData.options[upperCaseCorrect] === undefined) console.warn(`Bloco ${index+1}: Resposta [R] "${upperCaseCorrect}" não corresponde a nenhuma opção fornecida.`);
                        if (foundCorrectAnswerMarker) questionData.correctAnswer = upperCaseCorrect; // Padroniza para maiúscula se encontrado
                    } else { // verdadeiro_falso
                        const upperCaseCorrect = (questionData.correctAnswer || '').toUpperCase();
                        if (upperCaseCorrect === 'VERDADEIRO' || upperCaseCorrect === 'V') questionData.correctAnswer = 'V';
                        else if (upperCaseCorrect === 'FALSO' || upperCaseCorrect === 'F') questionData.correctAnswer = 'F';
                         else if (foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Resposta [R] "${questionData.correctAnswer}" inválida para V/F. Use V ou F.`);
                        // Garante que as opções V/F existem se não vieram no prompt
                         if (questionData.options['V'] === undefined) questionData.options['V'] = 'Verdadeiro';
                         if (questionData.options['F'] === undefined) questionData.options['F'] = 'Falso';
                    }
                } else if (expectedType === 'dissertativa_curta') {
                    if (!foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Gabarito [G] não encontrado.`);
                    if (!questionData.suggestedAnswer && foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Valor do gabarito [G] está vazio.`);
                    // Resolução [RES] é opcional para dissertativa, mas se [RES] existir, o valor não pode ser vazio
                    if (foundResolutionMarker && !questionData.resolution) console.warn(`Bloco ${index+1}: Valor da resolução [RES] está vazio.`);
                }

                 // Se o enunciado estiver vazio, marca como erro para não exibir uma questão sem texto
                 if (!questionData.text) {
                      console.error(`Erro ao processar bloco ${index + 1}: Enunciado [Q] vazio.`);
                       questions.push({
                           id: `q-error-${Date.now()}-${index}`,
                           text: `Erro ao carregar esta questão: Enunciado vazio.`,
                           type: 'error',
                           options: {}, correctAnswer: null, resolution: null, image: null, metaSource: null, metaYear: null
                       });
                 } else if (questionData.type !== 'error') { // Só adiciona se não for já um erro e tiver enunciado
                     questions.push(questionData);
                 }


            } catch (error) {
                console.error(`Erro ao processar bloco ${index + 1}:`, error, "\nBloco Original:\n---\n", block, "\n---");
                questions.push({
                    id: `q-error-${Date.now()}-${index}`,
                    text: `Erro ao carregar esta questão (${error.message}). Verifique o console para detalhes. Bloco: ${block.substring(0, Math.min(block.length, 100))}...`,
                    type: 'error',
                    options: {}, correctAnswer: null, resolution: null, image: null, metaSource: null, metaYear: null
                });
            }
        });
        return questions;
    }


    // === Função: Exibir Questões Parseadas ===
    // Lógica completamente substituída pela versão aprimorada do segundo código
    function displayParsedQuestions(questionsArray) {
         // Verifica existência do output, como no primeiro código
         if (!questoesOutput) {
            console.error("Elemento questoesOutput não encontrado.");
            return;
         }
         questoesOutput.innerHTML = '';
         questionsDataStore = {}; // Limpa antes de adicionar novas, como no segundo código
         if (!questionsArray || questionsArray.length === 0) {
             // Usa a classe 'empty-state' e corrige acentos, conforme o segundo código
             questoesOutput.innerHTML = '<p class="empty-state">Nenhuma questão foi gerada ou processada.</p>';
             return;
         }
         questionsArray.forEach((qData, index) => {
             // Armazena dados completos para uso posterior (resolução), como no segundo código
             questionsDataStore[qData.id] = qData;

             const questionDiv = document.createElement('div');
             // Usa a classe 'question-item' conforme a referência do segundo código
             questionDiv.className = 'question-item';
             questionDiv.id = qData.id;
             // Usa datasets para estado, como no segundo código
             questionDiv.dataset.questionType = qData.type;
             questionDiv.dataset.answered = 'false';
             if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') {
                 questionDiv.dataset.correctAnswer = qData.correctAnswer || '';
                 questionDiv.dataset.selectedOption = '';
             }

             // === Adiciona a div de metadados se existirem (copiado do segundo código) ===
             if (qData.metaSource || qData.metaYear) {
                 const metaDiv = document.createElement('div');
                 metaDiv.className = 'question-meta'; // Classe para estilizar a div container

                 if (qData.metaSource) {
                     const sourceSpan = document.createElement('span');
                     sourceSpan.className = 'meta-source'; // Classe para estilizar a fonte
                     sourceSpan.textContent = qData.metaSource;
                     metaDiv.appendChild(sourceSpan);
                 }

                 if (qData.metaSource && qData.metaYear) {
                      // Adiciona um separador se ambos existirem
                      const separatorSpan = document.createElement('span');
                      separatorSpan.className = 'meta-separator'; // Classe para estilizar o separador
                      separatorSpan.textContent = ' - ';
                      metaDiv.appendChild(separatorSpan);
                 }

                 if (qData.metaYear) {
                     const yearSpan = document.createElement('span');
                     yearSpan.className = 'meta-year'; // Classe para estilizar o ano
                     yearSpan.textContent = qData.metaYear;
                     metaDiv.appendChild(yearSpan);
                 }

                 questionDiv.appendChild(metaDiv); // Adiciona a div de meta antes do texto da questão
             }
             // === FIM: Adiciona a div de metadados ===


             const questionText = document.createElement('p');
             // Usa a classe 'question-text' e formatação de numeração/quebra de linha, como no segundo código
             questionText.className = 'question-text';
             const sanitizedText = qData.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
             questionText.innerHTML = `<strong>${index + 1}.</strong> ${sanitizedText.replace(/\n/g, '<br>')}`;
             questionDiv.appendChild(questionText);

             // Adiciona imagem se existir, como no segundo código
             if (qData.image) {
                 const imgElement = document.createElement('img');
                 imgElement.src = qData.image; // Assume que é uma URL válida
                 imgElement.alt = `Imagem para a questão ${index + 1}`;
                 imgElement.className = 'question-image'; // Usa a classe 'question-image'
                 imgElement.onerror = () => {
                     console.warn(`Erro ao carregar imagem: ${qData.image} para questão ${qData.id}`);
                     imgElement.alt = `Erro ao carregar imagem para a questão ${index + 1}`;
                 };
                 questionDiv.appendChild(imgElement);
             }

             if (qData.type === 'error') {
                 // Usa a classe 'question-error' como no segundo código
                 questionDiv.classList.add('question-error');
                 questoesOutput.appendChild(questionDiv);
                 return; // Pula o resto para questões com erro
             }

             const optionsContainer = document.createElement('div');
             // Usa a classe 'options-container' como no segundo código
             optionsContainer.className = 'options-container';
             if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') {
                 // Lógica de opções e classes 'option-btn', 'option-letter', 'option-content' copiada do segundo código
                 const optionKeys = (qData.type === 'multipla_escolha') ? Object.keys(qData.options).filter(k => ['A','B','C','D'].includes(k)).sort() : ['V', 'F'];
                 optionKeys.forEach(key => {
                     if (qData.options[key] !== undefined) {
                         const optionButton = document.createElement('button');
                         optionButton.className = 'option-btn';
                         optionButton.dataset.value = key; // Usa data-value em vez de data-opcao
                         const sanitizedOptionText = (qData.options[key] || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");

                         const letterHTML = `<span class="option-letter">${key}</span>`;
                         let contentText = '';

                         if (qData.type === 'verdadeiro_falso') {
                             const label = (key === 'V') ? 'Verdadeiro' : 'Falso';
                             const text = sanitizedOptionText && sanitizedOptionText !== 'Verdadeiro' && sanitizedOptionText !== 'Falso' ? `: ${sanitizedOptionText}` : '';
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
                 // Lógica para dissertativa curta e classe 'dissertative-info' copiada do segundo código
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

             // Feedback Area (copiado do segundo código)
             const feedbackArea = document.createElement('div');
             feedbackArea.className = 'feedback-area'; // Usa a classe 'feedback-area'

             const feedbackDiv = document.createElement('div');
             feedbackDiv.className = 'feedback-message'; // Usa a classe 'feedback-message'
             feedbackDiv.style.display = 'none';
             feedbackArea.appendChild(feedbackDiv);

             // Botão Responder (copiado do segundo código)
             if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') {
                 const confirmButton = document.createElement('button');
                 confirmButton.className = 'confirm-answer-btn'; // Usa a classe 'confirm-answer-btn'
                 confirmButton.textContent = 'Responder'; // Texto corrigido
                 confirmButton.disabled = true;
                 feedbackArea.appendChild(confirmButton);
             }

             // Botão Ver Resolução (copiado do segundo código)
             if (qData.resolution) {
                 const resolutionButton = document.createElement('button');
                 resolutionButton.className = 'view-resolution-btn'; // Usa a classe 'view-resolution-btn'
                 resolutionButton.textContent = 'Ver Resolução'; // Texto corrigido
                 resolutionButton.dataset.questionId = qData.id; // Usa data-question-id
                 resolutionButton.style.display = 'none';
                 feedbackArea.appendChild(resolutionButton);
             }

             questionDiv.appendChild(feedbackArea);

             // Área para exibir a resolução (copiado do segundo código)
             if (qData.resolution) {
                 const resolutionDiv = document.createElement('div');
                 resolutionDiv.className = 'resolution-area'; // Usa a classe 'resolution-area'
                 resolutionDiv.style.display = 'none';
                 questionDiv.appendChild(resolutionDiv);
             }

             questoesOutput.appendChild(questionDiv);
         });
    }


    // === Função: Lidar com Clique na OPÇÃO (Seleciona, não confirma) ===
    // Lógica substituída pela versão aprimorada do segundo código, usando classes e datasets corretos
    function handleOptionClick(clickedButton) {
        const questionDiv = clickedButton.closest('.question-item'); if (!questionDiv || questionDiv.dataset.answered === 'true') { return; } const confirmAnswerBtn = questionDiv.querySelector('.confirm-answer-btn'); const allOptionButtons = questionDiv.querySelectorAll('.option-btn'); const selectedValue = clickedButton.dataset.value; allOptionButtons.forEach(btn => btn.classList.remove('selected-preview')); clickedButton.classList.add('selected-preview'); questionDiv.dataset.selectedOption = selectedValue; console.log(`Set selectedOption=${selectedValue} on ${questionDiv.id}`); if (confirmAnswerBtn) { confirmAnswerBtn.disabled = false; console.log(`Enabled confirm button for ${questionDiv.id}`); } else { console.error("Botão .confirm-answer-btn não encontrado para", questionDiv.id); }
     }

    // === Função: Lidar com Clique no Botão RESPONDER (Confirma a resposta) ===
    // Lógica substituída pela versão aprimorada do segundo código, usando classes e datasets corretos
    function handleConfirmAnswer(confirmButton) {
         console.log("handleConfirmAnswer triggered for button:", confirmButton); const questionDiv = confirmButton.closest('.question-item'); console.log("Associated questionDiv:", questionDiv); if (!questionDiv) { console.error("Não foi possível encontrar o .question-item pai do botão."); return; } const userAnswer = questionDiv.dataset.selectedOption; const isAnswered = questionDiv.dataset.answered === 'true'; console.log("Checking conditions: ", { userAnswer: userAnswer, isAnswered: isAnswered, sessionId: currentSessionStats.id }); if (!userAnswer || isAnswered) { console.warn("Tentativa de confirmar resposta inválida: Nenhuma opção selecionada ou questão já respondida.", { selectedOption: userAnswer, isAnswered: isAnswered }); confirmButton.style.opacity = '0.5'; setTimeout(() => { confirmButton.style.opacity = '1'; }, 300); return; } if (!currentSessionStats.id) { console.warn("Tentativa de responder sem sessão ativa."); showStatus("Erro: Sessão não iniciada.", "error"); return; } console.log("Passed initial checks. Proceeding with answer evaluation..."); const correctAnswer = questionDiv.dataset.correctAnswer; const isCorrect = userAnswer === correctAnswer; const feedbackDiv = questionDiv.querySelector('.feedback-message'); const allOptionButtons = questionDiv.querySelectorAll('.option-btn'); const originallySelectedButton = Array.from(allOptionButtons).find(btn => btn.dataset.value === userAnswer);
         const resolutionButton = questionDiv.querySelector('.view-resolution-btn');

         console.log(`Confirmando resposta para ${questionDiv.id}: User=${userAnswer}, Correct=${correctAnswer}, IsCorrect=${isCorrect}`); questionDiv.dataset.answered = 'true'; questionDiv.classList.add('answered'); questionDiv.classList.add(isCorrect ? 'correct' : 'incorrect'); allOptionButtons.forEach(btn => { btn.disabled = true; btn.classList.remove('selected-preview'); if (btn === originallySelectedButton) { btn.classList.add('selected'); } if (btn.dataset.value === correctAnswer) { btn.classList.add('correct-answer-highlight'); } }); confirmButton.disabled = true; if (feedbackDiv) { feedbackDiv.textContent = isCorrect ? 'Resposta Correta!' : `Incorreto. A resposta correta é: ${correctAnswer}`; feedbackDiv.style.display = 'block'; } else { console.warn("Elemento .feedback-message não encontrado para", questionDiv.id); }

         if (resolutionButton) {
             resolutionButton.style.display = 'inline-flex';
             console.log(`Botão 'Ver Resolução' exibido para ${questionDiv.id}`);
         }

         currentSessionStats.answeredCount++; if (isCorrect) { currentSessionStats.correctCount++; } console.log('Sessão atual:', currentSessionStats); if (window.timerPopupAPI && typeof window.timerPopupAPI.updateStats === 'function') { try { window.timerPopupAPI.updateStats( currentSessionStats.answeredCount, currentSessionStats.correctCount ); } catch(e) { console.error("Erro ao chamar updateStats:", e); } } else { console.warn('API do Timer Popup (updateStats) não encontrada.'); } if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions) { console.log("Todas as questões foram respondidas!"); showStatus("Simulado concluído! Verifique o painel de tempo.", "success"); finalizeSession(true); }
     }

    // === Função para Lidar com Clique no Botão VER RESOLUÇÃO ===
    // Lógica substituída pela versão aprimorada do segundo código
    function handleViewResolution(resolutionButton) {
        const questionId = resolutionButton.dataset.questionId;
        const questionDiv = document.getElementById(questionId);
        const resolutionArea = questionDiv ? questionDiv.querySelector('.resolution-area') : null; // Usa a classe 'resolution-area'
        const questionData = questionsDataStore[questionId];

        if (!questionDiv || !resolutionArea || !questionData || !questionData.resolution) {
            console.error(`Erro ao tentar mostrar resolução para questão ${questionId}. Elementos ou dados não encontrados.`);
            showStatus("Erro ao carregar a resolução.", "error"); // Corrigindo acentos
            return;
        }

        const sanitizedResolution = questionData.resolution.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        resolutionArea.innerHTML = `<strong>Resolução:</strong><br>${sanitizedResolution.replace(/\n/g, '<br>')}`; // Corrigindo acentos
        resolutionArea.style.display = 'block';

        resolutionButton.disabled = true; // Desabilita após clicar

        console.log(`Resolução exibida para ${questionId}`); // Corrigindo acentos
    }

    // === Função Principal: Gerar Questões ===
    // Lógica substancialmente atualizada com base no segundo código, mas mantendo a busca da API key
    async function handleGenerateQuestions() {
        hidePopup();
        if (currentSessionStats.id) {
             console.log("Gerando novas questões, finalizando sessão anterior..."); // Corrigindo acentos
             finalizeSession(false);
        }

        // Validações de entrada, corrigindo acentos e fraseado
        if (!disciplinaSelect || !assuntoInput || !bibliografiaInput || !numQuestoesInput || !tipoQuestaoSelect || !nivelQuestaoSelect) {
            showError("Um ou mais elementos do formulário não foram encontrados. Verifique o HTML.");
            return;
        }

        const assunto = assuntoInput.value.trim();
        const bibliografia = bibliografiaInput.value.trim();
        const disciplinaSelecionada = disciplinaSelect.value;
        const numQuestoes = parseInt(numQuestoesInput.value, 10);
        const tipoQuestao = tipoQuestaoSelect.value;
        const nivelQuestao = nivelQuestaoSelect.value; // Valor selecionado no dropdown de dificuldade

        // Validações mais detalhadas e com focus, como no segundo código
        if (!disciplinaSelecionada) { disciplinaSelect.focus(); return showError("Por favor, selecione uma disciplina."); }
        if (!assunto) { assuntoInput.focus(); return showError("Por favor, informe o Assunto Principal."); }
        if (isNaN(numQuestoes) || numQuestoes < 1 || numQuestoes > 20) { numQuestoesInput.focus(); return showError("Número de questões inválido (1-20)."); }
        if (!nivelQuestao) { nivelQuestaoSelect.focus(); return showError("Por favor, selecione o Nível das questões."); }


        const disciplinaParaSessao = disciplinaSelecionada || "N/A"; // Usa a disciplina selecionada para a sessão

        console.log(`Iniciando geração... Assunto: ${assunto}, Nível: ${nivelQuestao}, Modelo: ${OPENROUTER_MODEL}`); // Corrigindo acentos
        showLoading(true);
        clearOutput();


        // === Construir Prompt (Copiado do segundo código, incluindo metadados e exemplos) ===
        let prompt = `Gere ${numQuestoes} questão(ões) EXCLUSIVAMENTE sobre o Assunto Principal "${assunto}".\n`;
        if (disciplinaSelecionada) prompt += `Considere o contexto da Disciplina: "${disciplinaSelecionada}".\n`;
        prompt += `GENERE AS QUESTÕES COM NÍVEL DE DIFICULDADE ESTRITAMENTE: ${nivelQuestao.toUpperCase()}.\n`;
        prompt += `A complexidade, vocabulário e conceitos abordados devem ser consistentes com o nível ${nivelQuestao.toUpperCase()}.\n`;
        if (bibliografia) prompt += `Use a seguinte Bibliografia como inspiração/referência (se aplicável ao assunto): "${bibliografia}".\n`;
        prompt += `Tipo de questão desejada: ${tipoQuestao === 'multipla_escolha' ? 'Múltipla Escolha (A, B, C, D)' : tipoQuestao === 'verdadeiro_falso' ? 'Verdadeiro/Falso (V/F)' : 'Dissertativa Curta'}.\n`;

        // --- INSTRUÇÃO PARA METADADOS ---
        prompt += `Para cada questão, inclua os seguintes metadados IMEDIATAMENTE APÓS o marcador [Q] e ANTES de quaisquer outros marcadores ([A], [B], [V], [F], [G], [R], [IMG], [RES]).\n`;
        prompt += `- Fonte/Assunto: Use EXATAMENTE o formato "[META_SOURCE] Texto da fonte ou assunto". Use algo relevante como "Disciplina: ${disciplinaParaSessao}", "Assunto: ${assunto}", ou "Simulado ENEM", "Prova OAB", etc., se aplicável e se o modelo puder inferir do contexto/assunto.\n`;
        prompt += `- Ano de Geração/Referência: Use EXATAMENTE o formato "[META_YEAR] Ano". Sugira o ano atual ou um ano de referência relevante, se aplicável.\n`;
         const currentYear = new Date().getFullYear();
        prompt += `Utilize o ano atual (${currentYear}) como padrão, a menos que o assunto ou contexto sugira fortemente um ano específico.\n`;
        // ----------------------------------

        prompt += `Formato de saída OBRIGATÓRIO:\n`;
        prompt += `- Separe CADA questão completa (enunciado, metadados, imagem?, opções/gabarito, resposta, resolução) usando APENAS "[SEP]" como separador.\n`;
        prompt += `- Dentro de cada bloco de questão:\n`;
        prompt += `  - Inicie o enunciado OBRIGATORIAMENTE com "[Q] ".\n`;
        // Metadados vêm AQUI no formato [META_SOURCE]... e [META_YEAR]...
        prompt += `  - (Opcional) Se a questão NECESSITAR de uma imagem... use EXATAMENTE o formato "[IMG] URL_ou_descrição_detalhada". Use isso RARAMENTE...\n`;
        switch (tipoQuestao) {
            case 'multipla_escolha': prompt += `  - Para CADA alternativa, use EXATAMENTE o formato "[A] texto...".\n  - Indique a resposta correta usando "[R] " seguido APENAS pela LETRA maiúscula (A, B, C ou D).\n`; break;
            case 'verdadeiro_falso': prompt += `  - Forneça a afirmação no enunciado [Q].\n  - Use "[V]" ou deixe vazio.\n  - Use "[F]" ou deixe vazio.\n  - Indique a resposta correta usando "[R] " seguido APENAS por "V" ou "F".\n`; break;
            case 'dissertativa_curta': prompt += `  - Forneça uma resposta/gabarito curto e direto usando "[G] ".\n`; break;
        }
        prompt += `  - Forneça uma resolução/explicação DETALHADA... usando OBRIGATORIAMENTE o formato "[RES] Texto...".\n`;

        // --- Exemplos atualizados para incluir metadados ---
        prompt += `Exemplo Múltipla Escolha com Metadados e Resolução (nível fácil):
[Q] Qual a capital da França?
[META_SOURCE] Geografia - Capitais
[META_YEAR] ${currentYear}
[A] Londres
[B] Berlim
[C] Paris
[D] Madri
[R] C
[RES] Paris é a capital e maior cidade da França, localizada no norte do país, às margens do rio Sena. Londres é a capital da Inglaterra, Berlim da Alemanha e Madri da Espanha.
[SEP]
`;
        prompt += `Exemplo V/F com Metadados, Imagem e Resolução (nível médio):
[Q] A imagem abaixo mostra um triângulo equilátero?
[META_SOURCE] Matemática - Geometria Plana
[META_YEAR] ${currentYear}
[IMG] https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Regular_triangle.svg/200px-Regular_triangle.svg.png
[V]
[F]
[R] V
[RES] Sim, a imagem mostra um triângulo equilátero, que possui todos os três lados de igual comprimento e todos os três ângulos internos iguais a 60 graus. Um triângulo isósceles tem apenas dois lados iguais, e um escaleno tem todos os lados diferentes.
[SEP]
`;
        // -----------------------------------------------------

        prompt += `
IMPORTANTE: Siga ESTRITAMENTE o formato pedido usando os marcadores ([Q], [META_SOURCE], [META_YEAR], [IMG], [A], [B], [C], [D], [V], [F], [R], [G], [RES], [SEP]). NÃO adicione NENHUMA outra formatação, numeração automática, texto introdutório ou comentários fora do formato especificado. Gere APENAS o texto das questões conforme solicitado. Certifique-se de que TODAS as questões de múltipla escolha e V/F tenham o marcador [RES] com uma explicação.`;
        // === Fim Construir Prompt ===


        try {
            // === Buscar a API Key da Netlify Function ===
            const apiKey = await getOpenRouterApiKeyFromNetlify();
            if (!apiKey) {
                // A função getOpenRouterApiKeyFromNetlify já deve ter mostrado um erro na UI e desativado o loading.
                return; // Interrompe a execução se a chave não for obtida.
            }
            // === Fim Buscar a API Key ===


            // === Corpo da requisição para OpenRouter (formato OpenAI Chat Completions), copiado do segundo código ===
            const requestBody = {
                model: OPENROUTER_MODEL,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 450 * numQuestoes + 300, // Ajuste o max_tokens conforme necessário
            };

            // === Requisição Fetch para OpenRouter, copiado e aprimorado do segundo código ===
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`, // Usa a apiKey obtida da Netlify Function
                    'HTTP-Referer': window.location.href,
                    'X-Title': document.title || 'Gerador de Questões' // Usa o título da página atual
                },
                body: JSON.stringify(requestBody)
            });

             if (!response.ok) {
                 let errorBodyText = await response.text();
                 console.error("Raw OpenRouter API Error Response:", errorBodyText);
                 let errorBody = {};
                 try { errorBody = JSON.parse(errorBodyText); } catch (e) { console.error("Erro ao parsear erro JSON:", e); }

                 const detailMessage = errorBody?.error?.message || `Erro HTTP ${response.status}`;

                 if (response.status === 401 || response.status === 403) {
                      throw new Error("Falha na API OpenRouter: A Chave da API configurada não é válida ou não tem permissão.");
                 } else if (response.status === 429) {
                      throw new Error(`Falha na API OpenRouter: Limite de requisições atingido. Tente novamente mais tarde. ${detailMessage}`);
                 }
                 else {
                      throw new Error(`Falha na comunicação com a API OpenRouter: ${detailMessage}`);
                 }
             }

            const data = await response.json();
            console.log("Resposta completa da API OpenRouter:", data);

             if (data.error) {
                  console.error("Erro retornado pela API OpenRouter:", data.error);
                  const errorMessage = data.error.message || data.error.type || 'Erro desconhecido retornado pela API.';
                  showError(`Erro da API OpenRouter: ${errorMessage}`);
                  resetSessionState();
                  showLoading(false);
                  return;
             }

            if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
                console.error("Resposta inesperada da API OpenRouter (sem choices ou conteúdo válido):", data);
                showError("Erro: A API OpenRouter retornou uma resposta vazia ou em formato inesperado."); // Corrigindo acentos
                resetSessionState();
                showLoading(false);
                return;
            }

            const rawTextFromAPI = data.choices[0].message.content;
            console.log("Texto cru extraído da API:", rawTextFromAPI); // Corrigindo acentos

            // Chama a função de parsing aprimorada do segundo código
            const questionsArray = parseGeneratedText(rawTextFromAPI, tipoQuestao);
            // Chama a função de exibição aprimorada do segundo código
            displayParsedQuestions(questionsArray);

            const validQuestions = questionsArray.filter(q => q.type !== 'error');
            const totalValidQuestions = validQuestions.length;
            const errorQuestionsCount = questionsArray.length - totalValidQuestions;

            if (totalValidQuestions > 0) {
                // Inicia a sessão com base nas questões válidas geradas
                currentSessionStats = { id: `sess-${Date.now()}`, totalQuestions: totalValidQuestions, answeredCount: 0, correctCount: 0, disciplina: disciplinaParaSessao, startTime: Date.now() };
                console.log("Nova sessão iniciada:", currentSessionStats); // Corrigindo acentos

                // Lógica de interação com Timer Popup e exibição do botão Finalizar, copiada do segundo código
                if (window.timerPopupAPI && typeof window.timerPopupAPI.startSession === 'function') {
                     try { console.log(`Iniciando sessão no Timer Popup ID: ${currentSessionStats.id}`); window.timerPopupAPI.startSession( currentSessionStats.totalQuestions, currentSessionStats.disciplina ); console.log("handleGenerateQuestions SUCCESS: Called startSession."); } catch (e) { console.error("Erro ao chamar startSession:", e); }
                     // Verifica se finalizeButton existe antes de manipular style
                     if (finalizeButton) finalizeButton.style.display = 'inline-flex';
                     let successMsg = `Geradas ${totalValidQuestions} questões! Acompanhe a sessão no painel abaixo.`;
                     if (totalValidQuestions < numQuestoes) {
                         successMsg = `Geradas ${totalValidQuestions} de ${numQuestoes} solicitadas. Acompanhe a sessão no painel abaixo!`;
                     }
                     if (errorQuestionsCount > 0) {
                         successMsg += ` (${errorQuestionsCount} questão(ões) tiveram erro no processamento.)`;
                         showStatus(successMsg, 'warning'); // Corrigindo acentos
                     } else {
                         showStatus(successMsg, 'success'); // Corrigindo acentos
                     }

                } else {
                    console.warn('API do Timer Popup (startSession) não encontrada.'); // Corrigindo acentos
                    // Verifica se finalizeButton existe antes de manipular style
                    if (finalizeButton) finalizeButton.style.display = 'inline-flex';
                    showStatus('Questões geradas, mas o timer externo não pôde ser iniciado.', 'warning'); // Corrigindo acentos
                }

                // Lógica para minimizar o bloco do gerador, copiada do segundo código
                if (generatorBlock && !generatorBlock.classList.contains('minimizado')) {
                    console.log("Minimizando bloco do gerador..."); // Corrigindo acentos
                    const minimizeButton = generatorBlock.querySelector('.botao-minimizar'); // Usa a classe 'botao-minimizar'
                     if (minimizeButton) {
                         minimizeButton.click();
                     } else {
                         generatorBlock.classList.add('minimizado');
                         const toggleIcon = generatorBlock.querySelector('.botao-minimizar i');
                         if (toggleIcon) {
                             toggleIcon.classList.remove('fa-minus');
                             toggleIcon.classList.add('fa-plus');
                             if (generatorBlock.querySelector('.botao-minimizar')) {
                                 generatorBlock.querySelector('.botao-minimizar').setAttribute('aria-label', 'Expandir');
                             }
                         }
                     }
                }

                // Rola para a área de questões, como no segundo código
                setTimeout(() => {
                     // Verifica se questoesOutput existe antes de rolar
                     if (questoesOutput) {
                         questoesOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });
                         console.log("Rolando para o topo da área de questões..."); // Corrigindo acentos
                     }
                }, 100);


            } else {
                 // Mensagens de erro mais detalhadas, corrigindo acentos
                 if (questionsArray.length > 0 && questionsArray.every(q => q.type === 'error')) {
                     showError(questionsArray[0].text);
                 } else if (errorQuestionsCount > 0) {
                     showError(`Erro: ${errorQuestionsCount} questão(ões) retornada(s) pela API tiveram erro no processamento e nenhuma foi válida. Verifique o console.`);
                 } else {
                     showError("Erro: Nenhuma questão foi retornada pela API ou o formato estava totalmente irreconhecível.");
                 }
                 resetSessionState();
             }

            const finishReason = data.choices[0].finish_reason;
             // Mensagens sobre o motivo da finalização, corrigindo acentos
             if (finishReason && finishReason !== 'stop' && finishReason !== 'length') {
                 console.warn("Geração da API pode ter sido interrompida:", finishReason);
                 showStatus(`Atenção: Geração pode ter sido interrompida (${finishReason}).`, 'warning');
             } else if (finishReason === 'length' && totalValidQuestions < numQuestoes) {
                 console.warn("Geração interrompida por MAX_TOKENS (length).");
                 showStatus(`Atenção: Limite de texto atingido. ${totalValidQuestions} de ${numQuestoes} questões geradas.`, 'warning');
             }


        } catch (error) {
            console.error("Falha na requisição ou processamento:", error); // Corrigindo acentos
            showError(`Erro durante a geração: ${error.message || 'Falha desconhecida.'}`); // Corrigindo acentos
            resetSessionState();
        } finally {
            showLoading(false);
        }
    } // Fim de handleGenerateQuestions

}); // Fim do DOMContentLoaded
