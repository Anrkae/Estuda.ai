// assets/js/pages/Simulados.js

document.addEventListener('DOMContentLoaded', () => {

    // === Elementos do DOM ===
    const assuntoInput = document.getElementById('assuntoInput');
    const disciplinaSelect = document.getElementById('disciplinaSelect');
    const numQuestoesInput = document.getElementById('numQuestoesInput');
    const tipoQuestaoSelect = document.getElementById('tipoQuestaoSelect');
    const generateButton = document.getElementById('generateButton');
    const questoesOutput = document.getElementById('questoesOutput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorDisplay = document.getElementById('errorDisplay');
    const statusMessage = document.getElementById('statusMessage');

    // === Configuração da API ===
    // !!! ATENÇÃO: Mova a chave para um backend em produção !!!
    const GEMINI_API_KEY = 'AIzaSyDfmegc9Aue6YlTphmcVV0p_I9rgsKVXKs'; // Sua chave Gemini
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;
    const RESULTS_STORAGE_KEY = 'sessoesEstudo'; // Chave para salvar RESUMOS das sessões
    const DISCIPLINAS_STORAGE_KEY = 'disciplinas'; // Chave para buscar disciplinas

    // --- Variáveis Globais ---
    let currentSessionStats = {
        totalQuestions: 0,
        answeredCount: 0,
        correctCount: 0,
        disciplina: null
    };

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
                    console.log(`Dropdown de disciplinas populado com ${disciplinas.length} itens.`);
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
    questoesOutput.addEventListener('click', handleOptionClick);

    // === Chamar a função para popular o dropdown ===
    populateDisciplinaDropdown();

    // === Funções Auxiliares de UI ===
    function showLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'inline-flex' : 'none';
        generateButton.disabled = isLoading;
    }

    function clearOutput() {
        questoesOutput.innerHTML = '';
        errorDisplay.textContent = '';
        errorDisplay.style.display = 'none';
        statusMessage.style.display = 'none';
        currentSessionStats = { totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null };
        if (window.timerPopupAPI && typeof window.timerPopupAPI.resetAndClose === 'function') {
             window.timerPopupAPI.resetAndClose();
        }
    }

    function showError(message) {
        questoesOutput.innerHTML = '';
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
        statusMessage.style.display = 'none';
        currentSessionStats = { totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null };
         if (window.timerPopupAPI && typeof window.timerPopupAPI.resetAndClose === 'function') {
             window.timerPopupAPI.resetAndClose();
         }
        showLoading(false);
    }

     function showStatus(message, type = 'info') {
         errorDisplay.style.display = 'none';
         statusMessage.textContent = message;
         statusMessage.className = `status-message ${type}`;
         statusMessage.style.display = 'block';
         setTimeout(() => {
            if (statusMessage.textContent === message) {
                statusMessage.style.display = 'none';
            }
         }, 4000);
     }

    // === Função: Parsear o Texto da API ===
    function parseGeneratedText(text, expectedType) {
        const questions = [];
        const questionBlocks = text.trim().split(/\s*\[SEP\]\s*/i).filter(block => block.trim() !== '');

        questionBlocks.forEach((block, index) => {
            try {
                const questionData = {
                    id: `q-${Date.now()}-${index}`, text: '', options: {}, correctAnswer: null,
                    type: expectedType, answered: false
                };

                 const qMatch = block.match(/\[Q\]([\s\S]*?)(?:\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]|$)/i);
                 if (qMatch && qMatch[1]) {
                     questionData.text = qMatch[1].trim();
                 } else {
                     const linesBeforeOption = block.split(/\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]/i)[0];
                     questionData.text = linesBeforeOption.replace(/^\[Q\]/i, '').trim();
                     if (!questionData.text) {
                         console.warn(`Bloco ${index+1}: Não encontrou [Q] nem texto antes das opções/resposta.`);
                         questionData.text = "Erro: Enunciado não encontrado";
                     }
                 }

                const lines = block.trim().split('\n');
                lines.forEach(line => {
                    line = line.trim();
                    if (/^\[A\]/i.test(line)) { questionData.options['A'] = line.substring(3).trim(); }
                    else if (/^\[B\]/i.test(line)) { questionData.options['B'] = line.substring(3).trim(); }
                    else if (/^\[C\]/i.test(line)) { questionData.options['C'] = line.substring(3).trim(); }
                    else if (/^\[D\]/i.test(line)) { questionData.options['D'] = line.substring(3).trim(); }
                    else if (/^\[V\]/i.test(line)) { questionData.options['V'] = line.substring(3).trim() || 'Verdadeiro'; }
                    else if (/^\[F\]/i.test(line)) { questionData.options['F'] = line.substring(3).trim() || 'Falso'; }
                    else if (/^\[R\]/i.test(line)) { questionData.correctAnswer = line.substring(3).trim(); }
                });

                if (expectedType === 'multipla_escolha' || expectedType === 'verdadeiro_falso') {
                     if (!questionData.correctAnswer || Object.keys(questionData.options).length === 0) {
                         throw new Error(`Dados incompletos (faltando opções ou [R]) para questão interativa ${index + 1}.`);
                     }
                     if (expectedType === 'multipla_escolha') {
                         const upperCaseCorrect = questionData.correctAnswer.toUpperCase();
                         if (!['A', 'B', 'C', 'D'].includes(upperCaseCorrect) || !questionData.options[upperCaseCorrect]) {
                              throw new Error(`Resposta [R] "${questionData.correctAnswer}" inválida ou não corresponde a uma opção [A,B,C,D] na questão ${index + 1}.`);
                         }
                         questionData.correctAnswer = upperCaseCorrect;
                     } else { // verdadeiro_falso
                         const upperCaseCorrect = questionData.correctAnswer.toUpperCase();
                         if (upperCaseCorrect === 'VERDADEIRO' || upperCaseCorrect === 'V') {
                             questionData.correctAnswer = 'V';
                         } else if (upperCaseCorrect === 'FALSO' || upperCaseCorrect === 'F') {
                             questionData.correctAnswer = 'F';
                         } else {
                              throw new Error(`Resposta [R] "${questionData.correctAnswer}" inválida para V/F na questão ${index + 1}. Use V ou F.`);
                         }
                         if (questionData.options['V'] === undefined) questionData.options['V'] = 'Verdadeiro';
                         if (questionData.options['F'] === undefined) questionData.options['F'] = 'Falso';
                     }
                }

                if (!questionData.text || questionData.text.startsWith("Erro:")) {
                     throw new Error(`Enunciado inválido ou não encontrado na questão ${index + 1}.`);
                }
                questions.push(questionData);
            } catch (error) {
                console.error(`Erro ao processar bloco ${index + 1}:`, error, "\nBloco:", block);
                questions.push({
                    id: `q-error-${Date.now()}-${index}`, text: `Erro ao carregar esta questão (${error.message}).`,
                    type: 'error', options: {}, correctAnswer: null
                 });
            }
        });
        return questions;
    }

    // === Função: Exibir Questões Parseadas ===
    function displayParsedQuestions(questionsArray) {
        questoesOutput.innerHTML = '';
        if (!questionsArray || questionsArray.length === 0) {
            questoesOutput.innerHTML = '<p class="empty-state">Nenhuma questão foi gerada ou processada.</p>';
            return;
        }

        questionsArray.forEach((qData, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.id = qData.id;
            questionDiv.dataset.correctAnswer = qData.correctAnswer || '';
            questionDiv.dataset.questionType = qData.type;
            questionDiv.dataset.answered = 'false';

            const questionText = document.createElement('p');
            questionText.className = 'question-text';
            const sanitizedText = qData.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            questionText.innerHTML = `<strong>${index + 1}.</strong> ${sanitizedText.replace(/\n/g, '<br>')}`;
            questionDiv.appendChild(questionText);

            if (qData.type === 'error') {
                questionDiv.classList.add('question-error');
                questoesOutput.appendChild(questionDiv);
                return;
            }

            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'options-container';

            if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') {
                const optionKeys = (qData.type === 'multipla_escolha')
                                    ? Object.keys(qData.options).filter(k => ['A','B','C','D'].includes(k)).sort()
                                    : ['V', 'F'];

                optionKeys.forEach(key => {
                    if (qData.options[key] !== undefined) {
                        const optionButton = document.createElement('button');
                        optionButton.className = 'option-btn';
                        optionButton.dataset.value = key;

                        const sanitizedOptionText = (qData.options[key] || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        let buttonText = '';

                        if (qData.type === 'verdadeiro_falso') {
                            buttonText = (key === 'V') ? 'Verdadeiro' : 'Falso';
                             if(sanitizedOptionText && sanitizedOptionText !== 'Verdadeiro' && sanitizedOptionText !== 'Falso') {
                                 buttonText += `: ${sanitizedOptionText}`;
                             }
                        } else {
                            buttonText = `${key}) ${sanitizedOptionText}`;
                        }
                        optionButton.textContent = buttonText;
                        optionsContainer.appendChild(optionButton);
                    }
                });
            } else if (qData.type === 'dissertativa_curta') {
                const answerP = document.createElement('p');
                answerP.className = 'dissertative-info';
                answerP.innerHTML = `<i>Questão dissertativa. Resposta não interativa.</i>`;
                optionsContainer.appendChild(answerP);
            }

            questionDiv.appendChild(optionsContainer);

            const feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'feedback-message';
            feedbackDiv.style.display = 'none';
            questionDiv.appendChild(feedbackDiv);

            questoesOutput.appendChild(questionDiv);
        });
    }

    // === Função: Lidar com Clique na Opção (Resposta do Usuário) ===
    function handleOptionClick(event) {
        if (!event.target.matches('.option-btn')) return;

        const clickedButton = event.target;
        const questionDiv = clickedButton.closest('.question-item');

        if (!questionDiv || questionDiv.dataset.answered === 'true') {
             return;
        }
        if (!currentSessionStats.disciplina) {
             console.warn("Tentativa de responder sem sessão ativa.");
             return;
        }

        // --- MARCA COMO RESPONDIDO (UI) E DÁ FEEDBACK VISUAL ---
        questionDiv.dataset.answered = 'true';
        questionDiv.classList.add('answered');
        const userAnswer = clickedButton.dataset.value;
        const correctAnswer = questionDiv.dataset.correctAnswer;
        const feedbackDiv = questionDiv.querySelector('.feedback-message');
        const isCorrect = userAnswer === correctAnswer;
        questionDiv.classList.add(isCorrect ? 'correct' : 'incorrect');
        clickedButton.classList.add('selected');
        if (feedbackDiv) {
            feedbackDiv.textContent = isCorrect ? 'Resposta Correta!' : `Incorreto. A resposta correta é: ${correctAnswer}`;
            feedbackDiv.style.display = 'block';
        }
        const allOptionButtons = questionDiv.querySelectorAll('.option-btn');
        allOptionButtons.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.value === correctAnswer) {
                btn.classList.add('correct-answer-highlight');
            }
        });

        // --- ATUALIZA ESTATÍSTICAS DA SESSÃO ATUAL ---
        currentSessionStats.answeredCount++;
        if (isCorrect) {
            currentSessionStats.correctCount++;
        }
        console.log('Sessão atual:', currentSessionStats);

        // --- CHAMA A API DO TIMER POPUP PARA ATUALIZAR OS DADOS NA GAVETA ---
        if (window.timerPopupAPI && typeof window.timerPopupAPI.updateStats === 'function') {
            window.timerPopupAPI.updateStats(
                currentSessionStats.answeredCount,
                currentSessionStats.correctCount
            );
        } else {
            console.warn('API do Timer Popup (window.timerPopupAPI.updateStats) não encontrada.');
        }

        // --- INÍCIO DA ALTERAÇÃO 1: Verificar se todas as questões foram respondidas ---
        if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions) {
            console.log("Todas as questões foram respondidas!");
            showStatus("Todas as questões respondidas! Verifique o painel de tempo.", "success");

            // Tentar parar o timer e abrir/mostrar o painel usando a API exposta
            if (window.timerPopupAPI) {
                // Chama a função para PARAR o tempo (exposta pelo timerPopup.js)
                if (typeof window.timerPopupAPI.stopTimer === 'function') {
                    console.log("Chamando timerPopupAPI.stopTimer()");
                    window.timerPopupAPI.stopTimer(); // <-- USA A FUNÇÃO REAL DA API
                } else {
                    console.warn('Função timerPopupAPI.stopTimer() não encontrada na API.');
                }

                // Chama a função para ABRIR/MOSTRAR o painel (exposta pelo timerPopup.js)
                if (typeof window.timerPopupAPI.openPanel === 'function') {
                    console.log("Chamando timerPopupAPI.openPanel()");
                    window.timerPopupAPI.openPanel(); // <-- USA A FUNÇÃO REAL DA API
                } else {
                    console.warn('Função timerPopupAPI.openPanel() não encontrada na API.');
                }
            } else {
                console.warn('API do Timer Popup (window.timerPopupAPI) não encontrada para parar o timer/abrir painel.');
            }
        }
        // --- FIM DA ALTERAÇÃO 1 ---

    } // Fim de handleOptionClick

    // === Função Principal: Gerar Questões (COM INTEGRAÇÃO DO TIMER) ===
    async function handleGenerateQuestions() {
        const assunto = assuntoInput.value.trim();
        const disciplinaSelecionada = disciplinaSelect.value;
        const numQuestoes = parseInt(numQuestoesInput.value, 10);
        const tipoQuestao = tipoQuestaoSelect.value;

        if (!assunto) return showError("Por favor, informe o Assunto Principal.");
        if (isNaN(numQuestoes) || numQuestoes < 1 || numQuestoes > 20) return showError("Número de questões inválido (1-20).");
        if (!GEMINI_API_KEY || !GEMINI_API_KEY.startsWith('AIza') || GEMINI_API_KEY.length < 30) return showError("Erro: Chave da API Gemini inválida.");

        const disciplinaParaSessao = disciplinaSelecionada || "Diversas";

        console.log(`Iniciando geração. Assunto: "${assunto}". Disciplina: "${disciplinaParaSessao}". Tipo: ${tipoQuestao}. Número: ${numQuestoes}`);

        showLoading(true);
        clearOutput();

        let prompt = `Gere ${numQuestoes} questão(ões) sobre o Assunto Principal "${assunto}".\n`;
        if (disciplinaSelecionada) prompt += `Considere o contexto da Disciplina: "${disciplinaSelecionada}".\n`;
        prompt += `Formato de saída OBRIGATÓRIO:\n`;
        prompt += `- Separe CADA questão completa usando APENAS "[SEP]" como separador.\n`;
        prompt += `- Dentro de cada bloco de questão:\n`;
        prompt += `  - Inicie o enunciado OBRIGATORIAMENTE com "[Q] ".\n`;
        switch (tipoQuestao) {
            case 'multipla_escolha':
                prompt += `  - Para cada alternativa, use "[A] ", "[B] ", "[C] ", "[D] ".\n`;
                prompt += `  - Indique a resposta correta usando "[R] " seguido APENAS pela LETRA maiúscula correta (A, B, C ou D).\n`;
                prompt += `Exemplo Múltipla Escolha:\n[Q] Qual a capital do Brasil?\n[A] Rio de Janeiro\n[B] São Paulo\n[C] Brasília\n[D] Salvador\n[R] C\n[SEP]`;
                break;
            case 'verdadeiro_falso':
                prompt += `  - Use "[V] " para a afirmação Verdadeira (pode deixar o texto após [V] vazio).\n`;
                prompt += `  - Use "[F] " para a afirmação Falsa (pode deixar o texto após [F] vazio).\n`;
                prompt += `  - Indique a resposta correta usando "[R] " seguido APENAS por "V" ou "F".\n`;
                prompt += `Exemplo Verdadeiro/Falso:\n[Q] O Brasil fica na América do Sul?\n[V]\n[F]\n[R] V\n[SEP]`;
                break;
            case 'dissertativa_curta':
                prompt += `  - Forneça um gabarito/resposta curta usando "[G] ".\n`;
                prompt += `Exemplo Dissertativa Curta:\n[Q] Quem descobriu o Brasil?\n[G] Pedro Álvares Cabral.\n[SEP]`;
                break;
        }
        prompt += `IMPORTANTE: Siga ESTRITAMENTE o formato pedido usando os marcadores. NÃO adicione NENHUMA outra formatação ou numeração. Gere APENAS o texto das questões.`;

        try {
            const requestBody = {
                contents: [{ parts: [{ text: prompt }] }],
                 generationConfig: {
                     "temperature": 0.7,
                     "maxOutputTokens": 300 * numQuestoes + 200
                 },
                 safetySettings: [
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
                 ]
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

             if (!response.ok) {
                 let errorBodyText = await response.text();
                 console.error("Raw API Error Response:", errorBodyText);
                 let errorBody = {};
                 try { errorBody = JSON.parse(errorBodyText); } catch (e) { /* Ignora */ }
                 const detailMessage = errorBody?.error?.message || `Erro HTTP ${response.status}`;
                 throw new Error(`Falha na comunicação com a API Gemini: ${detailMessage}`);
             }

            const data = await response.json();

            if (data.promptFeedback?.blockReason) {
                  console.error("Conteúdo bloqueado pela API:", data.promptFeedback);
                  let blockDetails = `Motivo: ${data.promptFeedback.blockReason}`;
                  if(data.promptFeedback.safetyRatings?.length > 0) {
                      blockDetails += ` - Categoria: ${data.promptFeedback.safetyRatings[0].category}`;
                  }
                  showError(`A solicitação foi bloqueada por filtros de segurança. ${blockDetails}. Tente reformular.`);
                  return;
             }

            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content?.parts?.length > 0) {
                 const rawTextFromAPI = data.candidates[0].content.parts[0].text;
                 const questionsArray = parseGeneratedText(rawTextFromAPI, tipoQuestao);
                 displayParsedQuestions(questionsArray);

                 const validQuestions = questionsArray.filter(q => q.type !== 'error');
                 const totalValidQuestions = validQuestions.length;

                 if (totalValidQuestions > 0) {
                    currentSessionStats = {
                        totalQuestions: totalValidQuestions,
                        answeredCount: 0,
                        correctCount: 0,
                        disciplina: disciplinaParaSessao
                    };

                    if (window.timerPopupAPI && typeof window.timerPopupAPI.startSession === 'function') {
                        console.log(`Iniciando sessão no Timer Popup. Disciplina: ${currentSessionStats.disciplina}, Total Questões Válidas: ${currentSessionStats.totalQuestions}`);
                        window.timerPopupAPI.startSession(
                            currentSessionStats.totalQuestions,
                            currentSessionStats.disciplina
                        );
                         const successMsg = totalValidQuestions === numQuestoes
                            ? `Geradas ${totalValidQuestions} questões! Sessão iniciada.`
                            : `Geradas ${totalValidQuestions} de ${numQuestoes} solicitadas. Sessão iniciada.`;
                         showStatus(successMsg, 'success');
                    } else {
                        console.warn('API do Timer Popup (window.timerPopupAPI.startSession) não encontrada.');
                        showStatus('Questões geradas, mas o timer não pôde ser iniciado.', 'warning');
                    }

                 } else {
                      if (questionsArray.length > 0) {
                           showError("Erro: Nenhuma questão pôde ser processada corretamente. Verifique o console.");
                      } else {
                           showError("Erro: Nenhuma questão foi retornada pela API ou o formato estava irreconhecível.");
                      }
                 }

                  if (data.candidates[0].finishReason && data.candidates[0].finishReason !== 'STOP') {
                      console.warn("Geração da API pode ter sido interrompida:", data.candidates[0].finishReason, data.candidates[0].safetyRatings);
                      showStatus(`Atenção: A geração das questões pode ter sido interrompida (${data.candidates[0].finishReason}).`, 'warning');
                  }

             } else {
                console.error("Resposta inesperada da API (sem candidatos/conteúdo):", data);
                showError("Erro: A API retornou uma resposta inesperada ou vazia.");
             }

        } catch (error) {
            console.error("Falha na requisição ou processamento:", error);
            showError(`Erro durante a geração: ${error.message || 'Falha desconhecida.'}`);
        } finally {
            showLoading(false);
        }
    } // Fim de handleGenerateQuestions

}); // Fim do DOMContentLoaded
