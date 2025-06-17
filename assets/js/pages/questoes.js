document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURAÇÃO ---
    const YOUR_SITE_URL = window.location.origin;
    const YOUR_APP_NAME = "Estuda.ai";
    const MODEL_TO_USE = "deepseek/deepseek-r1-0528-qwen3-8b:free";
    const API_KEY_STORAGE_KEY = 'estudaai_openrouter_apikey';

    const SYSTEM_PROMPT = `Você é um assistente de IA especializado, atuando como um "Gerador de Questões para Concursos". Sua única função é criar questões educacionais baseadas nas especificações do usuário.

REGRAS INVIOLÁVEIS:
1.  Factualidade Absoluta: Todas as informações, enunciados e resoluções devem ser factualmente corretos e verificáveis. Não invente dados.
2.  Neutralidade: Mantenha um tom estritamente neutro, formal e acadêmico. Evite qualquer tipo de viés, opinião ou conteúdo controverso.
3.  Formato de Saída: Sua resposta DEVE SER SEMPRE um único objeto JSON válido. Sua resposta DEVE começar com o caractere '{' e terminar com '}' e não pode conter nenhuma palavra, observação ou caractere fora do objeto JSON.`;

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

    // --- Seletores dos Popups/Modais ---
    const popupOverlay = document.getElementById('popupOverlay');
    const popupMessageBox = document.getElementById('popupMessageBox');
    const popupContent = document.getElementById('popupContent');
    const popupActions = document.getElementById('popupActions');
    const popupCloseButton = document.getElementById('popupCloseButton');
    const apiKeyModalOverlay = document.getElementById('apiKeyModalOverlay');
    const apiKeyInputModal = document.getElementById('apiKeyInputModal');
    const saveApiKeyButton = document.getElementById('saveApiKeyButton');
    const cancelApiKeyButton = document.getElementById('cancelApiKeyButton');

    // --- Chaves de Armazenamento e Estado da Sessão ---
    const RESULTS_STORAGE_KEY = 'sessoesEstudo';
    const DISCIPLINAS_STORAGE_KEY = 'disciplinas';
    let currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, startTime: null };
    let popupTimeoutId = null;
    let questionsDataStore = {};

    // --- LÓGICA DE GERAÇÃO E API ---

    function getApiKey() {
        return localStorage.getItem(API_KEY_STORAGE_KEY);
    }

    function showApiKeyModal() {
        if (apiKeyModalOverlay) apiKeyModalOverlay.classList.add('visible');
    }

    function hideApiKeyModal() {
        if (apiKeyModalOverlay) apiKeyModalOverlay.classList.remove('visible');
    }

    async function handleSaveApiKey() {
        const apiKey = apiKeyInputModal.value.trim();
        if (!apiKey || !apiKey.startsWith("sk-or-")) {
            alert("Por favor, insira uma chave de API válida da OpenRouter, começando com 'sk-or-'.");
            return;
        }
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
        hideApiKeyModal();
        handleGenerateQuestions();
    }

    async function handleGenerateQuestions() {
        const apiKey = getApiKey();
        if (!apiKey) {
            showApiKeyModal();
            return;
        }

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

        if (!assunto) {
            return showErrorModal("Por favor, informe o Assunto Principal.");
        }
        if (isNaN(numQuestoes) || numQuestoes < 1 || numQuestoes > 20) {
            return showErrorModal("Número de questões inválido (1-20).");
        }

        showLoading(true);
        clearOutput();

        const allGeneratedQuestions = [];
        const statusIndicator = loadingIndicator.querySelector('p');
        let criticalErrorOccurred = false;

        for (let i = 1; i <= numQuestoes; i++) {
            if (statusIndicator) {
                statusIndicator.textContent = `Gerando questão ${i} de ${numQuestoes}...`;
            }

            try {
                const userPrompt = buildUserPrompt(assunto, disciplinaSelecionada, bibliografia, tipoQuestao, nivelQuestao, allGeneratedQuestions);
                const questionData = await fetchSingleQuestion(userPrompt, apiKey);
                if (questionData) {
                    allGeneratedQuestions.push(questionData);
                }
            } catch (error) {
                console.error(`Erro ao gerar questão ${i}:`, error.message || error);
                const errorMessage = error.message || "Ocorreu um erro desconhecido.";
                const isKeyError = /key|auth|token|unauthorized|forbidden/i.test(errorMessage);

                if (errorMessage.includes("JSON")) {
                    showErrorModal("A IA não gerou uma questão no formato esperado. Por favor, tente novamente. Se o erro persistir, o modelo pode estar instável.", isKeyError);
                } else {
                    showErrorModal(errorMessage, isKeyError);
                }

                criticalErrorOccurred = true;
                break;
            }
        }

        if (statusIndicator) {
            statusIndicator.textContent = 'Gerando questões...';
        }

        if (criticalErrorOccurred) {
            resetSessionState();
        } else if (allGeneratedQuestions.length > 0) {
            displayParsedQuestions(allGeneratedQuestions);
            setupSession(allGeneratedQuestions, disciplinaSelecionada || "Geral");
        } else {
            if (!criticalErrorOccurred) {
                showErrorModal("Nenhuma questão pôde ser gerada. A API pode estar sobrecarregada. Tente novamente.");
            }
            resetSessionState();
        }

        showLoading(false);
    }

    async function fetchSingleQuestion(userPrompt, apiKey) {
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
                "messages": [
                    { "role": "system", "content": SYSTEM_PROMPT },
                    { "role": "user", "content": userPrompt }
                ],
                "response_format": {
                    "type": "json_object"
                },
                "temperature": 0.3,
                "max_tokens": 32768, // <<< LIMITE AUMENTADO PARA O VALOR MÁXIMO
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Erro na API do OpenRouter.");
        }

        const data = await response.json();
        if (!data.choices || data.choices.length === 0) {
            throw new Error("A API retornou uma resposta vazia (sem 'choices').");
        }
        const rawContent = data.choices[0].message.content;

        const startIndex = rawContent.indexOf('{');
        const endIndex = rawContent.lastIndexOf('}');
        if (startIndex === -1 || endIndex === -1) {
            throw new Error("A IA não retornou um objeto JSON. A resposta pode ter sido um texto simples.");
        }
        const jsonString = rawContent.substring(startIndex, endIndex + 1);

        try {
            const parsedData = JSON.parse(jsonString);
            if (!parsedData.questoes || !Array.isArray(parsedData.questoes) || parsedData.questoes.length === 0) {
                throw new Error("Formato JSON inválido (chave 'questoes' não encontrada ou vazia).");
            }
            return parsedData.questoes[0];
        } catch (e) {
            throw new Error("A IA retornou um JSON malformado. Resposta: " + jsonString);
        }
    }

    function buildUserPrompt(assunto, disciplina, bibliografia, tipo, nivel, questoesAnteriores = []) {
        const currentYear = new Date().getFullYear();
        const tipoDescricao = {
            'multipla_escolha': 'múltipla escolha com quatro alternativas (A, B, C, D)',
            'verdadeiro_falso': 'verdadeiro ou falso',
            'dissertativa_curta': 'dissertativa objetiva e curta'
        }[tipo];

        const definicoesDeNivel = {
            "Fácil": "Conhecimento direto e objetivo. Enunciado curto e resolução simples.",
            "Médio": "Conexão entre 2 conceitos. Enunciado moderado. Resolução clara e objetiva.",
            "Difícil": "Raciocínio complexo. Enunciado detalhado e resolução aprofundada.",
            "Muito Difícil": "Síntese de vários conceitos. Enunciado extenso e resolução exaustiva."
        };

        let historico = "";
        if (questoesAnteriores.length > 0) {
            historico = `
# Histórico de Questões Anteriores (Evite Repetir):
${questoesAnteriores.map((q, i) => `- ${i + 1}: "${q.enunciado}"`).join('\n')}
            `.trim();
        }

        return `
Crie UMA questão de concurso, seguindo estritamente as especificações abaixo.

# Parâmetros da Questão:
- Assunto Principal: "${assunto}"
- Disciplina: ${disciplina || "Geral"}
- Tipo de Questão: ${tipoDescricao}
- Bibliografia de Inspiração: ${bibliografia || "Concursos de alto nível"}
- Nível de Dificuldade: ${nivel} (${definicoesDeNivel[nivel] || 'Intermediário'})
${historico ? '\n' + historico : ''}

# Estrutura do JSON de Saída:
{
  "questoes": [
    {
      "enunciado": "Enunciado claro e bem formulado da questão.",
      "tipo": "${tipo}",
      "metadata": { "fonte": "${disciplina || 'Geral'}", "ano": ${currentYear} },
      "imagem_url": null,
      "opcoes": [
        {"letra": "A", "texto": "Texto da alternativa A. Deve ser plausível mas inequivocamente errada."},
        {"letra": "B", "texto": "Texto da alternativa B. Deve ser plausível mas inequivocamente errada."},
        {"letra": "C", "texto": "Texto da alternativa C. Esta é a alternativa correta."},
        {"letra": "D", "texto": "Texto da alternativa D. Deve ser plausível mas inequivocamente errada."}
      ],
      "resposta_correta": "C",
      "resolucao": "Explicação detalhada e factual do porquê a resposta correta está certa, e uma justificativa muito breve do porquê as outras estão erradas."
    }
  ]
}
        `.trim();
    }

    function setupSession(questionsArray, disciplina) {
        const validQuestions = questionsArray.filter(q => q && q.enunciado);
        if (validQuestions.length > 0) {
            currentSessionStats = {
                id: `sess-${Date.now()}`,
                totalQuestions: validQuestions.length,
                answeredCount: 0,
                correctCount: 0,
                disciplina: disciplina,
                startTime: Date.now()
            };
            finalizeButton.style.display = 'inline-flex';

            if (window.timerPopupAPI?.startSession) {
                window.timerPopupAPI.startSession(currentSessionStats.totalQuestions, currentSessionStats.disciplina);
            }

            if (generatorBlock && !generatorBlock.classList.contains('minimizado')) {
                generatorBlock.querySelector('.botao-minimizar')?.click();
            }
            setTimeout(() => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }, 100);
        } else {
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
                const metaDiv = document.createElement('div');
                metaDiv.className = 'question-meta';
                if (qData.metadata.fonte) {
                    const sourceSpan = document.createElement('span');
                    sourceSpan.className = 'meta-source';
                    sourceSpan.textContent = qData.metadata.fonte;
                    metaDiv.appendChild(sourceSpan);
                }
                if (qData.metadata.fonte && qData.metadata.ano) {
                    const separatorSpan = document.createElement('span');
                    separatorSpan.className = 'meta-separator';
                    separatorSpan.textContent = ' - ';
                    metaDiv.appendChild(separatorSpan);
                }
                if (qData.metadata.ano) {
                    const yearSpan = document.createElement('span');
                    yearSpan.className = 'meta-year';
                    yearSpan.textContent = qData.metadata.ano;
                    metaDiv.appendChild(yearSpan);
                }
                questionDiv.appendChild(metaDiv);
            }

            const questionText = document.createElement('p');
            questionText.className = 'question-text';
            questionText.innerHTML = `<strong>${index + 1}.</strong> ${qData.enunciado.replace(/\n/g, '<br>')}`;
            questionDiv.appendChild(questionText);

            if (qData.imagem_url) {
                const imgElement = document.createElement('img');
                imgElement.src = qData.imagem_url;
                imgElement.alt = `Imagem para a questão ${index + 1}`;
                imgElement.className = 'question-image';
                questionDiv.appendChild(imgElement);
            }

            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'options-container';
            if (qData.opcoes && qData.opcoes.length > 0) {
                qData.opcoes.forEach(opt => {
                    const optionButton = document.createElement('button');
                    optionButton.className = 'option-btn';
                    optionButton.dataset.value = opt.letra;
                    optionButton.innerHTML = `<span class="option-letter">${opt.letra}</span><span class="option-content">${opt.texto}</span>`;
                    optionsContainer.appendChild(optionButton);
                });
            } else if (qData.tipo === 'dissertativa_curta') {
                const answerP = document.createElement('p');
                answerP.className = 'dissertative-info';
                answerP.innerHTML = `<i>Questão dissertativa. Resposta sugerida: ${qData.gabarito_sugerido || "Não fornecida."}</i>`;
                optionsContainer.appendChild(answerP);
            }
            questionDiv.appendChild(optionsContainer);

            const feedbackArea = document.createElement('div');
            feedbackArea.className = 'feedback-area';
            const feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'feedback-message';
            feedbackDiv.style.display = 'none';
            feedbackArea.appendChild(feedbackDiv);
            if (qData.tipo !== 'dissertativa_curta') {
                const confirmButton = document.createElement('button');
                confirmButton.className = 'confirm-answer-btn';
                confirmButton.textContent = 'Responder';
                confirmButton.disabled = true;
                feedbackArea.appendChild(confirmButton);
            }
            if (qData.resolucao) {
                const resolutionButton = document.createElement('button');
                resolutionButton.className = 'view-resolution-btn';
                resolutionButton.textContent = 'Ver Resolução';
                resolutionButton.style.display = 'none';
                feedbackArea.appendChild(resolutionButton);
            }
            questionDiv.appendChild(feedbackArea);

            if (qData.resolucao) {
                const resolutionDiv = document.createElement('div');
                resolutionDiv.className = 'resolution-area';
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

    // --- FUNÇÕES DE UI (POPUP, LOADING, ETC) ---

    function showLoading(isLoading) {
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

    function showPopup(message, type = 'info', actions = []) {
        if (!popupOverlay || !popupMessageBox || !popupContent) {
            alert(message);
            return;
        }
        if (popupTimeoutId) {
            clearTimeout(popupTimeoutId);
        }
        popupContent.textContent = message;
        popupMessageBox.className = `popup-message-box ${type}`;

        popupActions.innerHTML = '';
        actions.forEach(action => popupActions.appendChild(action));
        popupActions.appendChild(popupCloseButton);

        popupOverlay.classList.add('visible');
        const autoClose = (type === 'success' || type === 'info' || type === 'warning') && actions.length === 0;
        if (autoClose) {
            popupTimeoutId = setTimeout(hidePopup, 5000);
        }
    }

    function hidePopup() {
        if (popupTimeoutId) {
            clearTimeout(popupTimeoutId);
        }
        if (popupOverlay) {
            popupOverlay.classList.remove('visible');
        }
    }

    function showErrorModal(message, isKeyError = false) {
        questoesOutput.innerHTML = '';
        
        const actions = [];
        if (isKeyError) {
            const changeKeyBtn = document.createElement('button');
            changeKeyBtn.className = 'btn-primary';
            changeKeyBtn.textContent = 'Trocar Chave de API';
            changeKeyBtn.onclick = () => {
                hidePopup();
                showApiKeyModal();
            };
            actions.push(changeKeyBtn);
        }

        showPopup(message, 'error', actions);
        resetSessionState();
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
        const summary = { ...currentSessionStats,
            durationMs,
            timestamp: new Date().toISOString()
        };
        try {
            const existingSummaries = JSON.parse(localStorage.getItem(RESULTS_STORAGE_KEY) || '[]');
            const index = existingSummaries.findIndex(s => s.id === summary.id);
            if (index === -1) {
                existingSummaries.push(summary);
            } else {
                existingSummaries[index] = summary;
            }
            localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(existingSummaries));
        } catch (error) {
            console.error("Erro ao salvar resumo da sessão:", error);
        }
    }

    function finalizeSession(openPanel = false) {
        if (!currentSessionStats.id) return;
        const wasActive = currentSessionStats.id;
        if (window.timerPopupAPI?.stopTimer) {
            window.timerPopupAPI.stopTimer();
        }
        saveSessionSummary();
        resetSessionState();
        if (openPanel && wasActive) {
            if (window.timerPopupAPI?.openPanel) {
                window.timerPopupAPI.openPanel();
            }
        }
    }

    function handleBeforeUnload() {
        if (currentSessionStats.id) {
            finalizeSession(false);
        }
    }

    // --- Event Listeners ---
    generateButton.addEventListener('click', handleGenerateQuestions);
    finalizeButton.addEventListener('click', () => finalizeSession(true));
    questoesOutput.addEventListener('click', (event) => {
        const button = event.target.closest('button');
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
    if (popupOverlay) popupOverlay.addEventListener('click', (event) => {
        if (event.target === popupOverlay) hidePopup();
    });
    if (saveApiKeyButton) saveApiKeyButton.addEventListener('click', handleSaveApiKey);
    if (cancelApiKeyButton) cancelApiKeyButton.addEventListener('click', hideApiKeyModal);

    // --- Inicialização ---
    populateDisciplinaDropdown();
});