// Seleciona os elementos da interface
const textInput = document.getElementById('textInput');
const summarizeButton = document.getElementById('summarizeButton');
const summaryOutput = document.getElementById('summaryOutput');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorDisplay = document.getElementById('errorDisplay');
const detailLevelSelect = document.getElementById('detailLevelSelect');
const summaryTypeSelect = document.getElementById('summaryTypeSelect');
const saveSummaryButton = document.getElementById('saveSummaryButton');
const saveConfirmation = document.getElementById('saveConfirmation');

// --- Seletores para o Modal (Adicionado) ---
const expandSummaryButton = document.getElementById('expandSummaryButton');
const summaryModal = document.getElementById('summaryModal');
const closeModalButton = document.getElementById('closeModalButton');
const modalSummaryContent = document.getElementById('modalSummaryContent');
// -------------------------------------------

// ========================================================================
// ATENÇÃO: RISCO DE SEGURANÇA! (Mantido como no original)
// SUA CHAVE DA API ESTÁ EXPOSTA DIRETAMENTE NO CÓDIGO DO NAVEGADOR.
// QUALQUER PESSOA PODE VER E USAR SUA CHAVE.
// PARA PRODUÇÃO, USE UM BACKEND PARA FAZER AS CHAMADAS À API GEMINI.
const GEMINI_API_KEY = 'AIzaSyDfmegc9Aue6YlTphmcVV0p_I9rgsKVXKs'; // Substitua pela sua chave real, mas CUIDADO!
// ========================================================================

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

// Adiciona listeners aos botões
summarizeButton.addEventListener('click', handleSummarize);
saveSummaryButton.addEventListener('click', handleSaveSummary); // Modificado para salvar objeto

// --- Listeners para o Modal (Adicionado) ---
expandSummaryButton.addEventListener('click', openSummaryModal);
closeModalButton.addEventListener('click', closeSummaryModal);
summaryModal.addEventListener('click', (event) => { // Fechar ao clicar fora
    if (event.target === summaryModal) {
        closeSummaryModal();
    }
});
// ------------------------------------------

/**
 * Função principal para lidar com a solicitação de resumo.
 */
async function handleSummarize() {
    const inputText = textInput.value.trim();
    const selectedLevel = detailLevelSelect.value;
    const selectedType = summaryTypeSelect.value;

    if (!inputText) {
        showError("Por favor, insira um texto ou descreva um assunto.");
        return;
    }
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'SUA_CHAVE_API_GEMINI_AQUI') { // REMOVA EM PRODUÇÃO
         showError("Erro: Chave da API do Gemini não configurada ou inválida.");
         return;
    }

    showLoading(true);
    clearOutput(); // Limpa saídas anteriores e esconde botões

    let prompt = '';
    if (selectedType === 'texto') {
        switch (selectedLevel) {
            case 'conciso': prompt = `Faça um resumo conciso e claro do seguinte texto:\n\n"${inputText}"`; break;
            case 'mediano': prompt = `Faça um resumo de tamanho mediano sobre o seguinte texto, destacando os aspectos mais importantes, mas sem excesso de detalhes:\n\n"${inputText}"`; break;
            default: prompt = `Faça um resumo detalhado do seguinte texto, abordando seus pontos principais:\n\n"${inputText}"`; break;
        }
    } else { // assunto
         switch (selectedLevel) {
            case 'conciso': prompt = `Gere um resumo conciso sobre o seguinte tópico ou assunto descrito no texto abaixo. Use seu conhecimento geral se o texto for apenas o nome do assunto:\n\n"${inputText}"`; break;
            case 'mediano': prompt = `Gere um resumo de tamanho mediano sobre o seguinte tópico ou assunto descrito no texto abaixo, destacando os aspectos mais importantes. Use seu conhecimento geral se o texto for apenas o nome do assunto:\n\n"${inputText}"`; break;
            default: prompt = `Gere um resumo detalhado sobre o seguinte tópico ou assunto descrito no texto abaixo, abordando seus pontos principais. Use seu conhecimento geral se o texto for apenas o nome do assunto:\n\n"${inputText}"`; break;
        }
    }

    try {
        const requestBody = { contents: [{ parts: [{ text: prompt }] }] };
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            let errorBody = {};
            try { errorBody = await response.json(); } catch(e) { console.error("Could not parse error response body", e)}
            console.error("Erro na API:", response.status, errorBody);
            const detailMessage = errorBody?.error?.message || 'Detalhes não disponíveis.';
            throw new Error(`Erro na API Gemini: ${response.status} ${response.statusText}. ${detailMessage}`);
        }

        const data = await response.json();
        console.log("Resposta da API:", data);

        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content?.parts?.length > 0) {
            const summary = data.candidates[0].content.parts[0].text;
            summaryOutput.value = summary.trim();
            saveSummaryButton.style.display = 'inline-block';   // MOSTRA Salvar
            expandSummaryButton.style.display = 'inline-block'; // MOSTRA Expandir
            saveConfirmation.style.display = 'none';
        } else if (data.promptFeedback?.blockReason) {
            console.error("Conteúdo bloqueado pela API:", data.promptFeedback);
            throw new Error(`O conteúdo foi bloqueado pela política de segurança: ${data.promptFeedback.blockReason}`);
        } else {
            console.error("Resposta inesperada da API:", data);
            throw new Error("Não foi possível extrair o resumo da resposta da API.");
        }

    } catch (error) {
        console.error("Falha ao gerar resumo:", error);
        showError(`Erro ao gerar resumo: ${error.message}`);
        // Garante que botões de ação pós-geração fiquem escondidos em caso de erro
        saveSummaryButton.style.display = 'none';
        expandSummaryButton.style.display = 'none';
    } finally {
        showLoading(false);
    }
}

/**
 * Salva o resumo atual no localStorage como um objeto {title, summary}.
 * (MODIFICADO para Ponto 3)
 */
function handleSaveSummary() {
    const summaryText = summaryOutput.value.trim();
    const inputText = textInput.value.trim();

    if (!summaryText) {
        console.warn("Nenhum resumo na caixa de texto para salvar.");
        showError("Não há resumo para salvar.");
        return;
    }

    // Define o título
    let title = "Resumo";
    if (inputText) {
        title = inputText.substring(0, 60) + (inputText.length > 60 ? '...' : '');
    } else {
        title = summaryText.split(' ').slice(0, 5).join(' ') + '...';
    }

    try {
        // Pega array de OBJETOS salvos
        let savedSummaries = JSON.parse(localStorage.getItem('estudaAiSummaries')) || [];

        const newSummaryEntry = { title: title, summary: summaryText };

        // Verifica duplicata pelo CONTEÚDO do resumo
        const isDuplicate = savedSummaries.some(entry => entry.summary === newSummaryEntry.summary);

        if (isDuplicate) {
            console.log("Resumo idêntico (mesmo conteúdo) já existe.");
            alert("Este resumo (mesmo conteúdo) já foi salvo anteriormente.");
            return;
        }

        // Adiciona o novo OBJETO
        savedSummaries.push(newSummaryEntry);
        console.log("Novo resumo adicionado:", newSummaryEntry);

        // Salva o array atualizado
        localStorage.setItem('estudaAiSummaries', JSON.stringify(savedSummaries));

        // Atualiza UI
        saveSummaryButton.style.display = 'none'; // Esconde Salvar após sucesso
        // expandSummaryButton continua visível
        saveConfirmation.style.display = 'block'; // Mostra confirmação

        console.log("Resumo salvo com sucesso no localStorage.");
        console.log("Todos os resumos:", savedSummaries);

    } catch (error) {
        console.error("Erro ao interagir com o localStorage:", error);
        let userErrorMessage = "Não foi possível salvar o resumo.";
        if (error.name === 'QuotaExceededError') {
            userErrorMessage = "Não foi possível salvar. Armazenamento local está cheio.";
        } else {
            userErrorMessage = "Não foi possível salvar. O armazenamento local pode estar desativado ou erro inesperado.";
        }
        showError(userErrorMessage); // Mostra erro específico
        saveConfirmation.style.display = 'none'; // Garante que confirmação não apareça com erro
    }
}


/**
 * Mostra ou esconde o indicador de carregamento e ajusta botões.
 */
 function showLoading(isLoading) {
     loadingIndicator.style.display = isLoading ? 'inline-flex' : 'none';
     summarizeButton.disabled = isLoading;
     // Não mexemos nos botões Salvar/Expandir aqui, eles são controlados no fim do processo
 }

/**
 * Limpa a área de saída e esconde botões de ação pós-geração.
 */
 function clearOutput() {
     summaryOutput.value = '';
     errorDisplay.textContent = '';
     errorDisplay.style.display = 'none';
     saveSummaryButton.style.display = 'none';
     expandSummaryButton.style.display = 'none'; // Esconde Expandir ao limpar
     saveConfirmation.style.display = 'none';
 }

/**
 * Exibe uma mensagem de erro e limpa/esconde outras saídas.
 */
 function showError(message) {
     summaryOutput.value = ''; // Limpa resumo
     errorDisplay.textContent = message;
     errorDisplay.style.display = 'block';
     saveSummaryButton.style.display = 'none';   // Esconde Salvar em caso de erro
     expandSummaryButton.style.display = 'none'; // Esconde Expandir em caso de erro
     saveConfirmation.style.display = 'none';
 }

// --- Funções do Modal (Adicionado) ---
/**
 * Abre o modal com o conteúdo do resumo.
 */
function openSummaryModal() {
    const summaryText = summaryOutput.value;
    if (summaryText) {
        modalSummaryContent.textContent = summaryText;
        // summaryModal.style.display = 'flex'; // Forma antiga
        summaryModal.classList.add('visible'); // Usa classe para transição CSS
    } else {
        alert("Não há resumo para expandir.");
    }
}

/**
 * Fecha o modal de resumo.
 */
function closeSummaryModal() {
    // summaryModal.style.display = 'none'; // Forma antiga
    summaryModal.classList.remove('visible'); // Usa classe para transição CSS
}
// ------------------------------------

