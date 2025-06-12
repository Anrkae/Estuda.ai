document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURAÇÃO ---
    const YOUR_SITE_URL = "http://127.0.0.1:5500";
    const YOUR_APP_NAME = "Estuda.ai";
    const MODEL_TO_USE = "qwen/qwen2.5-vl-72b-instruct:free";
    const API_KEY_STORAGE_NAME = 'apiKeyUsuario'; // Nome da chave no localStorage

    // --- Seletores de Elementos do DOM ---
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
    const popupOverlay = document.getElementById('popupOverlay');
    const popupMessageBox = document.getElementById('popupMessageBox');
    const popupContent = document.getElementById('popupContent');
    const popupCloseButton = document.getElementById('popupCloseButton');

    // --- Chaves de Armazenamento e Estado da Sessão ---
    const RESULTS_STORAGE_KEY = 'sessoesEstudo';
    const DISCIPLINAS_STORAGE_KEY = 'disciplinas';
    let currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, startTime: null };
    let popupTimeoutId = null;
    let questionsDataStore = {};

    // --- LÓGICA DE GERAÇÃO E API ---

    // Função para obter a chave: Primeiro do localStorage, depois do backend.
    async function getApiKey() {
        // 1. Tenta pegar do localStorage primeiro.
        let storedKey = localStorage.getItem(API_KEY_STORAGE_NAME);
        if (storedKey) {
            return storedKey;
        }

        // 2. Se não estiver no localStorage, busca da Netlify Function.
        const response = await fetch('/.netlify/functions/get-api-key');
        if (!response.ok) {
            throw new Error('Falha crítica ao buscar a chave de API do backend.');
        }
        const data = await response.json();
        const fetchedKey = data.apiKey;

        if (!fetchedKey) {
            throw new Error('Backend retornou uma chave de API vazia.');
        }

        // 3. Armazena no localStorage para usos futuros.
        localStorage.setItem(API_KEY_STORAGE_NAME, fetchedKey);
        return fetchedKey;
    }


    async function handleGenerateQuestions() {
        hidePopup();
        if (currentSessionStats.id) {
            finalizeSession(false);
        }

        const assunto = assuntoInput.value.trim();
        const bibliografia = bibliografiaInput.value.trim();
        const disciplinaSelecionada = disciplinaSelect.value;
        const numQuestoes = parseInt(numQuestoesInput.value, 10);
        const tipoQuestao = tipoQuestaoSelect.value;
        const nivelQuestao = nivelQuestaoSelect.value;

        if (!assunto) { return showError("Por favor, informe o Assunto Principal."); }
        if (isNaN(numQuestoes) || numQuestoes < 1 || numQuestoes > 20) { return showError("Número de questões inválido (1-20)."); }
        
        showLoading(true);
        clearOutput();

        let apiKey;
        try {
            apiKey = await getApiKey();
        } catch (error) {
            console.error(error);
            showError(error.message || "ERRO: Não foi possível obter a configuração de API.");
            showLoading(false);
            return;
        }

        const allGeneratedQuestions = [];
        const statusIndicator = loadingIndicator.querySelector('p');

        for (let i = 1; i <= numQuestoes; i++) {
            if (statusIndicator) {
                statusIndicator.textContent = `Gerando questão ${i} de ${numQuestoes}...`;
            }
            
            try {
                const prompt = buildEnhancedPrompt(assunto, disciplinaSelecionada, bibliografia, tipoQuestao, nivelQuestao, allGeneratedQuestions);
                const questionData = await fetchSingleQuestion(prompt, apiKey); 
                if (questionData) {
                    allGeneratedQuestions.push(questionData);
                }
            } catch (error) {
                console.error(`Erro ao gerar questão ${i}:`, error);
                showStatus(`Erro ao gerar a questão ${i}. Tentando a próxima...`, 'warning');
            }
        }
        
        if (statusIndicator) {
            statusIndicator.textContent = 'Gerando questões...';
        }

        if (allGeneratedQuestions.length > 0) {
            displayParsedQuestions(allGeneratedQuestions);
            setupSession(allGeneratedQuestions, disciplinaSelecionada || "Geral");
        } else {
            showError("Nenhuma questão pôde ser gerada. Verifique o console para erros e tente novamente.");
            resetSessionState();
        }

        showLoading(false);
    }
    
    async function fetchSingleQuestion(prompt, apiKey) {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": YOUR_SITE_URL,
                "X-Title": YOUR_APP_NAME,
            },
            body: JSON.stringify({
                "model": MODEL_TO_USE,
                "messages": [{ "role": "user", "content": prompt }],
                "response_format": { "type": "json_object" },
                "temperature": 0.3, 
                "max_tokens": 4096,
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Erro na API do OpenRouter.");
        }

        const data = await response.json();
        const rawContent = data.choices[0].message.content;

        const startIndex = rawContent.indexOf('{');
        const endIndex = rawContent.lastIndexOf('}');
        if (startIndex === -1 || endIndex === -1) {
            throw new Error("API não retornou um objeto JSON válido.");
        }
        const jsonString = rawContent.substring(startIndex, endIndex + 1);
        const parsedData = JSON.parse(jsonString);

        if (!parsedData.questoes || !Array.isArray(parsedData.questoes) || parsedData.questoes.length === 0) {
            throw new Error("Formato JSON inválido (chave 'questoes' não encontrada ou vazia).");
        }

        return parsedData.questoes[0];
    }
    
    function buildEnhancedPrompt(assunto, disciplina, bibliografia, tipo, nivel, questoesAnteriores = []) {
        const currentYear = new Date().getFullYear();
        
        const tipoDescricao = {
            'multipla_escolha': 'múltipla escolha com quatro alternativas (A, B, C, D)',
            'verdadeiro_falso': 'verdadeiro ou falso',
            'dissertativa_curta': 'dissertativa objetiva e curta'
        } [tipo];
        
        const definicoesDeNivel = {
            "Fácil": "Conhecimento direto e objetivo. Enunciado curto e resolução simples.",
            "Médio": "Conexão entre 2 conceitos. Enunciado moderado. Resolução clara e objetiva.",
            "Difícil": "Raciocínio complexo. Enunciado detalhado e resolução aprofundada.",
            "Muito Difícil": "Síntese de vários conceitos. Enunciado extenso e resolução exaustiva."
        };
        
        let historico = "";
        if (questoesAnteriores.length > 0) {
            historico = `
    Evite repetir os mesmos pontos ou estruturas das seguintes questões já geradas nesta sessão:
    ${questoesAnteriores.map((q, i) => `- ${i + 1}: "${q.enunciado}"`).join('\n')}
            `.trim();
        }
        
        return `
    Você é um gerador de questões para concursos públicos. Crie APENAS UMA questão com base nas instruções abaixo:

    - Assunto: "${assunto}"
    - Disciplina: ${disciplina || "Geral"}
    - Tipo: ${tipoDescricao}
    - Inspiração (bibliografia ou estilo): ${bibliografia || "Concursos"}
    - Nível: ${nivel} (${definicoesDeNivel[nivel] || 'Intermediário'})
    ${historico ? '\n' + historico : ''}

    Respeite os critérios:
    1. Nenhuma informação pode estar errada ou ser ambígua.
    2. Sempre que possível, use questões reais de concursos, provas ou exames como base, adaptando apenas para clareza ou formato. Não invente fatos.
    3. A complexidade e o tamanho devem seguir o nível definido.
    4. Se não tiver certeza sobre um dado, substitua por algo seguro e factual.

    Formato da resposta (JSON estrito):
    {
    "questoes": [
        {
        "enunciado": "Texto da pergunta.",
        "tipo": "${tipo}",
        "metadata": { "fonte": "${disciplina || 'Geral'}", "ano": ${currentYear} },
        "imagem_url": null,
        "opcoes": [
            {"letra": "A", "texto": "..."},
            {"letra": "B", "texto": "..."},
            {"letra": "C", "texto": "..."},
            {"letra": "D", "texto": "..."}
        ],
        "resposta_correta": "A",
        "gabarito_sugerido": null,
        "resolucao": "Explicação da resposta correta, com base em fatos."
        }
    ]
    }
    Não adicione explicações fora do JSON. Apenas o objeto JSON.
        `.trim();
    }

    function setupSession(questionsArray, disciplina) {
        const validQuestions = questionsArray.filter(q => q && q.enunciado);
        if (validQuestions.length > 0) {
            currentSessionStats = { id: `sess-${Date.now()}`, totalQuestions: validQuestions.length, answeredCount: 0, correctCount: 0, disciplina: disciplina, startTime: Date.now() };
            finalizeButton.style.display = 'inline-flex';
            showStatus(`Geradas ${validQuestions.length} questões! Acompanhe a sessão no painel.`, 'success');
            
            if (window.timerPopupAPI?.startSession) {
                window.timerPopupAPI.startSession(currentSessionStats.totalQuestions, currentSessionStats.disciplina);
            }
            
            if (generatorBlock && !generatorBlock.classList.contains('minimizado')) {
                generatorBlock.querySelector('.botao-minimizar')?.click();
            }
            setTimeout(() => questoesOutput.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } else {
            showError("Nenhuma questão válida foi gerada. Tente refinar seu pedido.");
            resetSessionState();
        }
    }

    function displayParsedQuestions(questionsArray) {
        questoesOutput.innerHTML = '';
        questionsDataStore = {};
        if (!questionsArray || questionsArray.length === 0) {
            questoesOutput.innerHTML = '<p class="empty-state">Nenhuma questão foi gerada.</p>';
            return;
        }

        questionsArray.forEach((qData, index) => {
            const questionId = `q-${Date.now()}-${index}`;
            qData.id = questionId;
            questionsDataStore[questionId] = qData;

            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.id = questionId;

            if (qData.metadata?.fonte || qData.metadata?.ano) {
                const metaDiv = document.createElement('div'); metaDiv.className = 'question-meta';
                if (qData.metadata.fonte) { const sourceSpan = document.createElement('span'); sourceSpan.className = 'meta-source'; sourceSpan.textContent = qData.metadata.fonte; metaDiv.appendChild(sourceSpan); }
                if (qData.metadata.fonte && qData.metadata.ano) { const separatorSpan = document.createElement('span'); separatorSpan.className = 'meta-separator'; separatorSpan.textContent = ' - '; metaDiv.appendChild(separatorSpan); }
                if (qData.metadata.ano) { const yearSpan = document.createElement('span'); yearSpan.className = 'meta-year'; yearSpan.textContent = qData.metadata.ano; metaDiv.appendChild(yearSpan); }
                questionDiv.appendChild(metaDiv);
            }

            const questionText = document.createElement('p'); questionText.className = 'question-text';
            questionText.innerHTML = `<strong>${index + 1}.</strong> ${qData.enunciado.replace(/\n/g, '<br>')}`;
            questionDiv.appendChild(questionText);
            
            if (qData.imagem_url) {
                const imgElement = document.createElement('img'); imgElement.src = qData.imagem_url;
                imgElement.alt = `Imagem para a questão ${index + 1}`; imgElement.className = 'question-image';
                questionDiv.appendChild(imgElement);
            }
            
            const optionsContainer = document.createElement('div'); optionsContainer.className = 'options-container';
            if (qData.opcoes && qData.opcoes.length > 0) {
                qData.opcoes.forEach(opt => {
                    const optionButton = document.createElement('button');
                    optionButton.className = 'option-btn';
                    optionButton.dataset.value = opt.letra;
                    optionButton.innerHTML = `<span class="option-letter">${opt.letra}</span><span class="option-content">${opt.texto}</span>`;
                    optionsContainer.appendChild(optionButton);
                });
            } else if (qData.tipo === 'dissertativa_curta') {
                const answerP = document.createElement('p'); answerP.className = 'dissertative-info';
                answerP.innerHTML = `<i>Questão dissertativa. Resposta sugerida: ${qData.gabarito_sugerido || "Não fornecida."}</i>`;
                optionsContainer.appendChild(answerP);
            }
            questionDiv.appendChild(optionsContainer);
            
            const feedbackArea = document.createElement('div'); feedbackArea.className = 'feedback-area';
            const feedbackDiv = document.createElement('div'); feedbackDiv.className = 'feedback-message'; feedbackDiv.style.display = 'none'; feedbackArea.appendChild(feedbackDiv);
            if (qData.tipo !== 'dissertativa_curta') {
                const confirmButton = document.createElement('button'); confirmButton.className = 'confirm-answer-btn'; confirmButton.textContent = 'Responder'; confirmButton.disabled = true; feedbackArea.appendChild(confirmButton);
            }
            if (qData.resolucao) {
                const resolutionButton = document.createElement('button'); resolutionButton.className = 'view-resolution-btn'; resolutionButton.textContent = 'Ver Resolução'; resolutionButton.style.display = 'none'; feedbackArea.appendChild(resolutionButton);
            }
            questionDiv.appendChild(feedbackArea);
            
            if (qData.resolucao) {
                const resolutionDiv = document.createElement('div'); resolutionDiv.className = 'resolution-area';
                resolutionDiv.style.display = 'none';
                resolutionDiv.innerHTML = `<strong>Resolução:</strong><br>${qData.resolucao.replace(/\n/g, '<br>')}`;
                questionDiv.appendChild(resolutionDiv);
            }
            
            questoesOutput.appendChild(questionDiv);
        });
    }

    function handleOptionClick(clickedButton) {
        const questionDiv = clickedButton.closest('.question-item');
        if (!questionDiv || questionDiv.classList.contains('answered')) return;

        const confirmAnswerBtn = questionDiv.querySelector('.confirm-answer-btn');
        questionDiv.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected-preview'));
        
        clickedButton.classList.add('selected-preview');
        questionDiv.dataset.selectedOption = clickedButton.dataset.value;
        
        if (confirmAnswerBtn) confirmAnswerBtn.disabled = false;
    }

    function handleConfirmAnswer(confirmButton) {
        const questionDiv = confirmButton.closest('.question-item');
        if (!questionDiv) return;

        const questionId = questionDiv.id;
        const questionData = questionsDataStore[questionId];
        const userAnswer = questionDiv.dataset.selectedOption;
        
        if (!userAnswer || !questionData || questionDiv.classList.contains('answered')) return;
        
        const correctAnswer = questionData.resposta_correta;
        const isCorrect = userAnswer === correctAnswer;

        questionDiv.classList.add('answered', isCorrect ? 'correct' : 'incorrect');
        
        const allOptionButtons = questionDiv.querySelectorAll('.option-btn');
        allOptionButtons.forEach(btn => {
            btn.disabled = true;
            btn.classList.remove('selected-preview');
            if (btn.dataset.value === userAnswer) btn.classList.add('selected');
            if (btn.dataset.value === correctAnswer) btn.classList.add('correct-answer-highlight');
        });

        confirmButton.disabled = true;
        const feedbackDiv = questionDiv.querySelector('.feedback-message');
        if (feedbackDiv) {
            feedbackDiv.textContent = isCorrect ? 'Resposta Correta!' : `Incorreto. A resposta correta é: ${correctAnswer}`;
            feedbackDiv.style.display = 'block';
        }

        const resolutionButton = questionDiv.querySelector('.view-resolution-btn');
        if (resolutionButton) resolutionButton.style.display = 'inline-flex';

        updateSessionStats(isCorrect);
    }
    
    function updateSessionStats(isCorrect) {
        if (!currentSessionStats.id) return;
        currentSessionStats.answeredCount++;
        if (isCorrect) currentSessionStats.correctCount++;
        
        if (window.timerPopupAPI?.updateStats) {
            window.timerPopupAPI.updateStats(currentSessionStats.answeredCount, currentSessionStats.correctCount);
        }

        if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions) {
            showStatus("Simulado concluído! Verifique o painel de tempo.", "success");
            finalizeSession(true);
        }
    }

    function handleViewResolution(resolutionButton) {
        const questionDiv = resolutionButton.closest('.question-item');
        if (!questionDiv) return;

        const resolutionArea = questionDiv.querySelector('.resolution-area');
        if (resolutionArea) {
            resolutionArea.style.display = 'block';
            resolutionButton.disabled = true;
        }
    }

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
                }
            } catch (error) {
                console.error(`Erro ao processar disciplinas do localStorage:`, error);
            }
        }
    }
    
    function showLoading(isLoading) {
        hidePopup();
        loadingIndicator.style.display = isLoading ? 'inline-flex' : 'none';
        generateButton.disabled = isLoading;
    }

    function resetSessionState() {
        currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, startTime: null };
        finalizeButton.style.display = 'none';
        questionsDataStore = {};
    }

    function clearOutput() {
        questoesOutput.innerHTML = '';
        hidePopup();
    }
    
    function showPopup(message, type = 'info', autoCloseDelay = null) {
        if (!popupOverlay || !popupMessageBox || !popupContent) { alert(message); return; }
        if (popupTimeoutId) clearTimeout(popupTimeoutId);
        popupContent.textContent = message;
        popupMessageBox.className = `popup-message-box ${type}`;
        popupOverlay.classList.add('visible');
        if (autoCloseDelay) {
            popupTimeoutId = setTimeout(hidePopup, autoCloseDelay);
        }
    }

    function hidePopup() {
        if (popupTimeoutId) clearTimeout(popupTimeoutId);
        if (popupOverlay) popupOverlay.classList.remove('visible');
    }

    function showError(message) {
        questoesOutput.innerHTML = '';
        showPopup(message, 'error');
        resetSessionState();
        showLoading(false);
    }
    
    function showStatus(message, type = 'info') {
        const autoClose = (type === 'success' || type === 'info' || type === 'warning');
        showPopup(message, type, autoClose ? 5000 : null);
    }
    
    function saveSessionSummary() {
        if (!currentSessionStats.id || currentSessionStats.totalQuestions === 0) return;
        let durationMs = currentSessionStats.startTime ? Date.now() - currentSessionStats.startTime : 0;
        if (window.timerPopupAPI?.getDuration) {
             const durationFromTimer = window.timerPopupAPI.getDuration();
             if (typeof durationFromTimer?.ms === 'number') {
                 durationMs = durationFromTimer.ms;
             }
        }
        const summary = { ...currentSessionStats, durationMs, timestamp: new Date().toISOString() };
        try {
            const existingSummaries = JSON.parse(localStorage.getItem(RESULTS_STORAGE_KEY) || '[]');
            const index = existingSummaries.findIndex(s => s.id === summary.id);
            if (index === -1) { existingSummaries.push(summary); } else { existingSummaries[index] = summary; }
            localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(existingSummaries));
        } catch (error) {
            console.error("Erro ao salvar resumo da sessão:", error);
            showStatus("Erro ao salvar o resumo da sessão.", "error");
        }
    }

    function finalizeSession(openPanel = false) {
        if (!currentSessionStats.id) return;
        const wasActive = currentSessionStats.id;
        
        if (window.timerPopupAPI?.stopTimer) window.timerPopupAPI.stopTimer();
        saveSessionSummary();
        resetSessionState();
        
        if (openPanel && wasActive) {
            if (window.timerPopupAPI?.openPanel) window.timerPopupAPI.openPanel();
        } else if (wasActive) {
            showStatus("Sessão finalizada e salva.", "success");
        }
    }
    
    function handleBeforeUnload() { if (currentSessionStats.id) finalizeSession(false); }

    // --- Event Listeners ---
    generateButton.addEventListener('click', handleGenerateQuestions);
    finalizeButton.addEventListener('click', () => finalizeSession(true));
    questoesOutput.addEventListener('click', (event) => {
        const target = event.target;
        const button = target.closest('button');
        if (!button) return;

        if (button.matches('.option-btn')) {
            if (!button.disabled) handleOptionClick(button);
        } else if (button.matches('.confirm-answer-btn')) {
            if (!button.disabled) handleConfirmAnswer(button);
        } else if (button.matches('.view-resolution-btn')) {
            if (!button.disabled) handleViewResolution(button);
        }
    });
    window.addEventListener('beforeunload', handleBeforeUnload);
    if (popupCloseButton) popupCloseButton.addEventListener('click', hidePopup);
    if (popupOverlay) popupOverlay.addEventListener('click', (event) => { if (event.target === popupOverlay) hidePopup(); });

    // --- Inicialização ---
    populateDisciplinaDropdown();
});
