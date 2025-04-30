// Seleciona os elementos da interface
const textInput = document.getElementById('textInput');
const summarizeButton = document.getElementById('summarizeButton');
const summaryOutput = document.getElementById('summaryOutput');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorDisplay = document.getElementById('errorDisplay');
const detailLevelSelect = document.getElementById('detailLevelSelect');
const summaryTypeSelect = document.getElementById('summaryTypeSelect');
const saveSummaryButton = document.getElementById('saveSummaryButton'); // Botão Salvar
const saveConfirmation = document.getElementById('saveConfirmation'); // Mensagem de Confirmação

// ========================================================================
// ATENÇÃO: RISCO DE SEGURANÇA!
// SUA CHAVE DA API ESTÁ EXPOSTA DIRETAMENTE NO CÓDIGO DO NAVEGADOR.
// QUALQUER PESSOA PODE VER E USAR SUA CHAVE.
// PARA PRODUÇÃO, USE UM BACKEND PARA FAZER AS CHAMADAS À API GEMINI.
const GEMINI_API_KEY = 'AIzaSyDfmegc9Aue6YlTphmcVV0p_I9rgsKVXKs'; // Substitua pela sua chave real, mas CUIDADO!
// ========================================================================

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

// Adiciona listeners aos botões
summarizeButton.addEventListener('click', handleSummarize);
saveSummaryButton.addEventListener('click', handleSaveSummary); // Listener para o botão Salvar

/**
 * Função principal para lidar com a solicitação de resumo.
 */
async function handleSummarize() {
    const inputText = textInput.value.trim();
    const selectedLevel = detailLevelSelect.value;
    const selectedType = summaryTypeSelect.value;

    // Validações Iniciais
    if (!inputText) {
        showError("Por favor, insira um texto ou descreva um assunto.");
        return;
    }
    // REMOVA ESTA VERIFICAÇÃO SE ESTIVER USANDO UM BACKEND
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'SUA_CHAVE_API_GEMINI_AQUI') {
         showError("Erro: Chave da API do Gemini não configurada ou inválida.");
         return;
    }

    showLoading(true);
    clearOutput(); // Limpa saídas anteriores e esconde botão/confirmação de salvar

    let prompt = '';

    // Constrói o prompt baseado nas seleções do usuário
    if (selectedType === 'texto') {
        switch (selectedLevel) {
            case 'conciso':
                prompt = `Faça um resumo conciso e claro do seguinte texto:\n\n"${inputText}"`;
                break;
            case 'mediano':
                prompt = `Faça um resumo de tamanho mediano sobre o seguinte texto, destacando os aspectos mais importantes, mas sem excesso de detalhes:\n\n"${inputText}"`;
                break;
            case 'detalhado':
            default:
                prompt = `Faça um resumo detalhado do seguinte texto, abordando seus pontos principais:\n\n"${inputText}"`;
                break;
        }
    } else { // selectedType === 'assunto'
         switch (selectedLevel) {
            case 'conciso':
                prompt = `Gere um resumo conciso sobre o seguinte tópico ou assunto descrito no texto abaixo. Use seu conhecimento geral se o texto for apenas o nome do assunto:\n\n"${inputText}"`;
                break;
            case 'mediano':
                prompt = `Gere um resumo de tamanho mediano sobre o seguinte tópico ou assunto descrito no texto abaixo, destacando os aspectos mais importantes. Use seu conhecimento geral se o texto for apenas o nome do assunto:\n\n"${inputText}"`;
                break;
            case 'detalhado':
            default:
                prompt = `Gere um resumo detalhado sobre o seguinte tópico ou assunto descrito no texto abaixo, abordando seus pontos principais. Use seu conhecimento geral se o texto for apenas o nome do assunto:\n\n"${inputText}"`;
                break;
        }
    }

    // Faz a chamada para a API Gemini
    try {
        const requestBody = {
            contents: [{ parts: [{ text: prompt }] }],
            // safetySettings: [...] // Opcional: Ajustar configurações de segurança
            // generationConfig: { // Opcional: Ajustar temperatura, etc.
            //    temperature: 0.7
            // }
        };

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
        console.log("Resposta da API:", data); // Para depuração

        // Processa a resposta da API
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content?.parts?.length > 0) {
            const summary = data.candidates[0].content.parts[0].text;
            summaryOutput.value = summary.trim(); // Remove espaços extras no início/fim
            saveSummaryButton.style.display = 'inline-block'; // MOSTRA o botão Salvar
            saveConfirmation.style.display = 'none';      // ESCONDE a confirmação (caso visível)
        } else if (data.promptFeedback?.blockReason) {
            console.error("Conteúdo bloqueado pela API:", data.promptFeedback);
            throw new Error(`O conteúdo foi bloqueado pela política de segurança: ${data.promptFeedback.blockReason}`);
        } else {
            console.error("Resposta inesperada da API:", data);
            throw new Error("Não foi possível extrair o resumo da resposta da API. Verifique o console para detalhes.");
        }

    } catch (error) {
        console.error("Falha ao gerar resumo:", error);
        showError(`Erro ao gerar resumo: ${error.message}`);
    } finally {
        showLoading(false); // Esconde o indicador de carregamento
    }
}

/**
 * Salva o resumo atual no localStorage.
 */
function handleSaveSummary() {
    const summaryText = summaryOutput.value;

    if (!summaryText) {
        console.warn("Nenhum resumo na caixa de texto para salvar.");
        showError("Não há resumo para salvar."); // Informa o usuário
        return;
    }

    try {
        // 1. Pega os resumos já salvos (ou inicia um array vazio)
        // Usando uma chave específica para evitar conflitos: 'estudaAiSummaries'
        let savedSummaries = JSON.parse(localStorage.getItem('estudaAiSummaries')) || [];

        // 2. Adiciona o novo resumo apenas se não for uma duplicata exata
        if (!savedSummaries.includes(summaryText)) {
             savedSummaries.push(summaryText); // Adiciona no final do array
             console.log("Novo resumo adicionado.");
        } else {
            console.log("Resumo idêntico já existe no localStorage.");
            // Opcional: Informar ao usuário que já foi salvo
            alert("Este resumo já foi salvo anteriormente.");
            // Não esconde o botão ou mostra confirmação se já existia
            return; // Sai da função se já existe
        }

        // 3. Salva o array atualizado de volta no localStorage
        localStorage.setItem('estudaAiSummaries', JSON.stringify(savedSummaries));

        // 4. Atualiza a UI: esconde o botão, mostra a confirmação
        saveSummaryButton.style.display = 'none';
        saveConfirmation.style.display = 'block';

        console.log("Resumo salvo com sucesso no localStorage.");
        console.log("Todos os resumos:", savedSummaries); // Para depuração

    } catch (error) {
        console.error("Erro ao interagir com o localStorage:", error);
        // Tenta dar um feedback mais útil sobre erros comuns do localStorage
        let userErrorMessage = "Não foi possível salvar o resumo.";
        if (error.name === 'QuotaExceededError') {
            userErrorMessage = "Não foi possível salvar. Armazenamento local está cheio.";
        } else {
             userErrorMessage = "Não foi possível salvar. O armazenamento local pode estar desativado ou ocorreu um erro inesperado.";
        }
        showError(userErrorMessage);
        saveConfirmation.style.display = 'none'; // Garante que a confirmação não seja exibida em caso de erro
    }
}


/**
 * Mostra ou esconde o indicador de carregamento e desabilita/habilita o botão Gerar.
 * @param {boolean} isLoading - True para mostrar carregamento, false para esconder.
 */
 function showLoading(isLoading) {
     if (isLoading) {
         loadingIndicator.style.display = 'inline-flex';
         summarizeButton.disabled = true;
     } else {
         loadingIndicator.style.display = 'none';
         summarizeButton.disabled = false;
     }
 }

/**
 * Limpa a área de saída (resumo e erro) e esconde botão/confirmação de salvar.
 */
 function clearOutput() {
     summaryOutput.value = '';
     errorDisplay.textContent = '';
     errorDisplay.style.display = 'none';
     saveSummaryButton.style.display = 'none'; // ESCONDE botão salvar
     saveConfirmation.style.display = 'none';  // ESCONDE confirmação
 }

/**
 * Exibe uma mensagem de erro na área designada e limpa outras saídas.
 * @param {string} message - A mensagem de erro a ser exibida.
 */
 function showError(message) {
     summaryOutput.value = ''; // Limpa o resumo em caso de erro
     errorDisplay.textContent = message;
     errorDisplay.style.display = 'block';
     saveSummaryButton.style.display = 'none'; // ESCONDE botão salvar
     saveConfirmation.style.display = 'none';  // ESCONDE confirmação
 }
