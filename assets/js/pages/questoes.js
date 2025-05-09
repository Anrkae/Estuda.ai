// assets/js/pages/questoes.js
// ESTE CÓDIGO É O MESMO DO EXEMPLO DA OPÇÃO 2, APENAS COM NOVOS ENDPOINTS
// Copie o código completo do arquivo assets/js/pages/questoes.js do exemplo da Opção 2 AQUI.

document.addEventListener('DOMContentLoaded', () => {

    // ... (elementos do DOM, popup, storage keys) ...

    // === Endpoints das Funções Netlify Assíncronas (NOVOS ENDPOINTS) ===
    const START_GENERATION_URL = '/.netlify/functions/startGeneration'; // Endpoint da sua função Start
    const CHECK_GENERATION_URL = '/.netlify/functions/checkGeneration'; // Endpoint da sua função Check

    // ... (variáveis globais, populateDisciplinaDropdown, event listeners) ...

    // === Funções Auxiliares de UI === (Não mudam)
    function showLoading(isLoading, message = 'Gerando...') { /* ... */ }
    function resetSessionState() { /* ... */ } // Reset já limpa pollingIntervalId
    function clearOutput() { /* ... */ }
    function showPopup(message, type = 'info', autoCloseDelay = null) { /* ... */ }
    function hidePopup() { /* ... */ }
    function showError(message) { /* ... */ } // Reseta TUDO
    function showStatus(message, type = 'info') { /* ... */ }

    // === Funções de Sessão e Interação com Questões === (Não mudam)
    function saveSessionSummary() { /* ... */ }
    function finalizeSession(openPanel = false) { /* ... */ }
    function handleBeforeUnload() { /* ... */ }
    function displayParsedQuestions(questionsArray) { /* ... */ } // Recebe dados já parseados e salvos no Redis
    function handleOptionClick(clickedButton) { /* ... */ }
    function handleConfirmAnswer(confirmButton) { /* ... */ }
    function handleViewResolution(resolutionButton) { /* ... */ }


    // === Função Principal: Gerar Questões (INICIA A TAREFA E COMEÇA O POLLING) ===
    async function handleGenerateQuestions() {
        hidePopup();
        if (currentSessionStats.id) {
             console.log("Gerando novas questões, finalizando sessão anterior...");
             finalizeSession(false);
        }

        if (pollingIntervalId) { clearInterval(pollingIntervalId); pollingIntervalId = null; console.log("Cleared previous polling interval."); }
        currentTaskId = null;

        const assunto = assuntoInput.value.trim();
        const bibliografia = bibliografiaInput.value.trim();
        const disciplinaSelecionada = disciplinaSelect.value;
        const numQuestoes = parseInt(numQuestoesInput.value, 10);
        const tipoQuestao = tipoQuestaoSelect.value;
        const nivelQuestao = nivelQuestaoSelect.value;

        if (!assunto) { assuntoInput.focus(); return showError("Por favor, informe o Assunto Principal."); }
        if (isNaN(numQuestoes) || numQuestoes < 1 || numQuestoes > 20) { numQuestoesInput.focus(); return showError("Número de questões inválido (1-20)."); }
        if (!nivelQuestao) { nivelQuestaoSelect.focus(); return showError("Por favor, selecione o Nível das questões."); }
        if (!tipoQuestao) { tipoQuestaoSelect.focus(); return showError("Por favor, selecione o Tipo de Questão."); }

        const disciplinaParaSessao = disciplinaSelecionada || "Geral";

        console.log(`Iniciando geração assíncrona (Opção 3) via Netlify Function...`);
        showLoading(true, 'Iniciando tarefa de geração...');
        clearOutput();

        // === Dados para enviar para a função START ===
        const requestBodyToStartFunction = {
            assunto: assunto,
            bibliografia: bibliografia,
            disciplinaSelecionada: disciplinaSelecionada,
            numQuestoes: numQuestoes,
            tipoQuestao: tipoQuestao,
            nivelQuestao: nivelQuestao
        };

        try {
            // === Chama a função Netlify para INICIAR a tarefa ===
            const startResponse = await fetch(START_GENERATION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBodyToStartFunction)
            });

             const startResponseData = await startResponse.json();
             console.log("Resposta da função Start Generation:", startResponseData);

             if (!startResponse.ok) {
                 const errorMessage = startResponseData.error || `Erro ao iniciar a tarefa de geração (Status: ${startResponse.status})`;
                 console.error(`Erro retornado pela função Start Generation (Status ${startResponse.status}):`, startResponseData);
                 showError(`Erro ao iniciar a geração: ${errorMessage}`);
                 resetSessionState();
                 return;
             }

             // Tarefa iniciada com sucesso, obtemos o ID
             currentTaskId = startResponseData.taskId;
             if (!currentTaskId) {
                  console.error("Função Start Generation não retornou um Task ID.");
                  showError("Erro interno do servidor: ID da tarefa não recebido.");
                  resetSessionState();
                  return;
             }

             console.log(`Tarefa iniciada com ID: ${currentTaskId}. Iniciando polling...`);
             showLoading(true, 'Gerando questões...'); // Atualiza a mensagem de status

             // === Inicia o Polling ===
             const POLLING_INTERVAL = 3000; // Polla a cada 3 segundos

             pollingIntervalId = setInterval(async () => {
                 console.log(`Polling status para Task ID: ${currentTaskId}...`);
                 try {
                     const checkResponse = await fetch(`${CHECK_GENERATION_URL}?taskId=${currentTaskId}`, {
                         method: 'GET',
                         headers: { 'Content-Type': 'application/json' }
                     });

                     const checkResponseData = await checkResponse.json();
                     console.log(`Resposta do Polling (${currentTaskId}):`, checkResponseData);

                     // Nota: checkResponse.ok === false pode ser 404 (NOT_FOUND) ou 500 (Erro interno no Check Function)
                     if (!checkResponse.ok) {
                          const errorMessage = checkResponseData.message || `Erro ao verificar status da tarefa (Status: ${checkResponse.status})`;
                          console.error(`Erro retornado pela função Check Generation (Status ${checkResponse.status}):`, checkResponseData);
                          // Se for 404 Not Found, pode ser que a tarefa expirou no Redis
                          showError(`Erro durante a espera pela geração: ${errorMessage}`);
                          // resetSessionState já é chamado por showError
                          return;
                     }

                     const status = checkResponseData.status;

                     if (status === 'COMPLETED') {
                         clearInterval(pollingIntervalId);
                         pollingIntervalId = null;
                         console.log(`Tarefa ${currentTaskId} COMPLETED. Exibindo resultados.`);

                         const { questionsArray, totalValidQuestions, errorQuestionsCount, finishReason } = checkResponseData.data;

                         displayParsedQuestions(questionsArray);

                         if (totalValidQuestions > 0) {
                             currentSessionStats = { id: `sess-${Date.now()}`, totalQuestions: totalValidQuestions, answeredCount: 0, correctCount: 0, disciplina: disciplinaParaSessao, startTime: Date.now() };
                             console.log("Nova sessão iniciada após geração assíncrona:", currentSessionStats);

                             if (window.timerPopupAPI && typeof window.timerPopupAPI.startSession === 'function') { try { console.log(`Iniciando sessão no Timer Popup ID: ${currentSessionStats.id}`); window.timerPopupAPI.startSession( currentSessionStats.totalQuestions, currentSessionStats.disciplina ); console.log("Polling SUCCESS: Called startSession."); } catch (e) { console.error("Erro ao chamar startSession:", e); } finalizeButton.style.display = 'inline-flex'; } else { console.warn('API do Timer Popup (startSession) não encontrada.'); finalizeButton.style.display = 'inline-flex'; }

                             let successMsg = `Geradas ${totalValidQuestions} questões válidas! Acompanhe a sessão no painel abaixo.`;
                             if (questionsArray.length !== totalValidQuestions) { successMsg += ` (${errorQuestionsCount} questão(ões) com erro de formatação.)`; showStatus(successMsg, 'warning'); } else { showStatus(successMsg, 'success'); }

                             if (generatorBlock && !generatorBlock.classList.contains('minimizado')) { console.log("Minimizando bloco do gerador..."); const minimizeButton = generatorBlock.querySelector('.botao-minimizar'); if (minimizeButton) { minimizeButton.click(); } else { generatorBlock.classList.add('minimizado'); const toggleIcon = generatorBlock.querySelector('.botao-minimizar i'); if (toggleIcon) { toggleIcon.classList.remove('fa-minus'); toggleIcon.classList.add('fa-plus'); if (generatorBlock.querySelector('.botao-minimizar')) { generatorBlock.querySelector('.botao-minimizar').setAttribute('aria-label', 'Expandir'); } } } }
                             setTimeout(() => { questoesOutput.scrollIntoView({ behavior: 'smooth', block: 'start' }); console.log("Rolando para o topo da área de questões..."); }, 100);

                         } else {
                             if (questionsArray.length > 0 && questionsArray.every(q => q.type === 'error')) { showError("Nenhuma questão válida gerada pela API. Verifique os logs do servidor/Netlify Function Logs para detalhes."); } else { showError("Erro: Nenhuma questão válida foi retornada pelo servidor após a geração."); }
                             resetSessionState();
                         }

                          if (finishReason && finishReason !== 'stop' && finishReason !== 'length') { console.warn("Geração da API pode ter sido interrompida pelo motivo:", finishReason); } else if (finishReason === 'length' && totalValidQuestions < numQuestoes) { console.warn("Geração interrompida por MAX_TOKENS (length) no backend."); }

                         showLoading(false, '');

                     } else if (status === 'ERROR') {
                         clearInterval(pollingIntervalId);
                         pollingIntervalId = null;
                         console.error(`Tarefa ${currentTaskId} terminou com ERRO:`, checkResponseData.message);
                         showError(`Falha na geração de questões: ${checkResponseData.message || 'Erro desconhecido.'}`);

                     } else if (status === 'PENDING' || status === 'STARTED') { // STARTED é o status inicial retornado pela função start
                         console.log(`Tarefa ${currentTaskId} ainda pendente... Continuando polling.`);
                         showLoading(true, 'Gerando questões...'); // Mantém loading e status

                     } else if (status === 'NOT_FOUND') {
                          clearInterval(pollingIntervalId);
                          pollingIntervalId = null;
                          console.error(`Tarefa ${currentTaskId} não encontrada durante polling.`);
                          showError("A tarefa de geração não foi encontrada. Pode ter expirado ou encontrado um erro inesperado no servidor.");

                     } else {
                          clearInterval(pollingIntervalId);
                          pollingIntervalId = null;
                          console.error(`Polling retornou status desconhecido para ${currentTaskId}:`, status);
                          showError(`Erro inesperado: Status da tarefa desconhecido (${status}).`);
                     }

                 } catch (pollingError) {
                     console.error(`Erro durante a requisição de polling para ${currentTaskId}:`, pollingError);
                     clearInterval(pollingIntervalId);
                     pollingIntervalId = null;
                     showError(`Erro de comunicação durante a espera pela geração: ${pollingError.message || 'Falha desconhecida.'}`);
                 }
             }, POLLING_INTERVAL); // Fim do setInterval

        } catch (error) {
            console.error("Falha na requisição para a função Start Generation:", error);
            showError(`Erro ao solicitar a geração: ${error.message || 'Falha desconhecida.'}`);
            resetSessionState();
        } finally {
            // Loading/Status só esconde quando o polling terminar
        }
    } // Fim de handleGenerateQuestions

}); // Fim do DOMContentLoaded

