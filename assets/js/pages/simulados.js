document.addEventListener("DOMContentLoaded", () => {

    // === Elementos DOM: Etapas e Controles ===
    const steps = document.querySelectorAll(".step");
    const step1 = document.getElementById("step-1");
    const step2 = document.getElementById("step-2");
    const step3 = document.getElementById("step-3");
    const goToStep1Button = document.getElementById("goToStep1Button");
    const goToStep2Button = document.getElementById("goToStep2Button");
    const startGenerationButton = document.getElementById("startGenerationButton");

    // === Elementos DOM: Inputs Etapa 1 ===
    const totalQuestoesInput = document.getElementById("totalQuestoesInput");
    const tempoInputHoras = document.getElementById("tempoInputHoras");
    const tempoInputMinutos = document.getElementById("tempoInputMinutos");
    const editalInput = document.getElementById("editalInput");
    const disciplinasCheckboxContainer = document.getElementById("disciplinasCheckboxContainer");
    const disciplinasSortableList = document.getElementById("disciplinasSortableList");

    // === Elementos DOM: Inputs Etapa 2 ===
    const disciplinaDetailContainer = document.getElementById("disciplinaDetailContainer");
    const distributeCheckbox = document.getElementById("distributeCheckbox");
    const distributeHelperText = document.getElementById("distributeHelperText");
    const totalAllocatedText = document.getElementById("totalAllocatedText");
    const nivelQuestaoSelect = document.getElementById("nivelQuestaoSelect");

    // === Elementos DOM: Geração Etapa 3 ===
    const motivationalQuote = document.getElementById("motivationalQuote");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const generationStatus = document.getElementById("generationStatus");

    // === Elementos DOM: Visualização do Simulado ===
    const simuladoView = document.getElementById("simuladoView");
    const questoesOutput = document.getElementById("questoesOutput");
    const finalizeButton = document.getElementById("finalizeButton");

    // === Elementos DOM: Footer Fixo ===
    const simuladoFixedFooter = document.getElementById("simulado-fixed-footer");
    const progressIndicatorFixed = document.getElementById("progressIndicatorFixed");
    const timeRemainingFixed = document.getElementById("timeRemainingFixed");

    // === Elementos DOM: Popup ===
    const popupOverlay = document.getElementById("popupOverlay");
    const popupMessageBox = document.getElementById("popupMessageBox");
    const popupContent = document.getElementById("popupContent");
    const popupCloseButton = document.getElementById("popupCloseButton");
    // Popup de Resultados
    const popupTextMessage = document.getElementById("popupTextMessage");
    const resultsContainer = document.getElementById("resultsContainer");
    const resultsTitle = document.getElementById("resultsTitle");
    const resultsMessage = document.getElementById("resultsMessage");
    const resultsStats = document.getElementById("resultsStats");
    const resultsButtons = document.getElementById("resultsButtons");
    const resultsSaveButton = document.getElementById("resultsSaveButton");
    const resultsCloseButton = document.getElementById("resultsCloseButton");

    // === Configurações e Constantes ===
    // !!! ATENÇÃO: SUBSTITUA PELA SUA CHAVE REAL !!!
    // !!!         Recomendado: Mover para backend em produção !!!
    const GEMINI_API_KEY = "AIzaSyDfmegc9Aue6YlTphmcVV0p_I9rgsKVXKs";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;
    const RESULTS_STORAGE_KEY = "sessoesEstudo";
    const DISCIPLINAS_STORAGE_KEY = "disciplinas";
    const MOTIVATIONAL_QUOTES = [
        "Acredite em você mesmo e todo o resto virá naturalmente.",
        "O sucesso nasce do querer, da determinação e persistência.",
        "Não espere por oportunidades extraordinárias. Agarre ocasiões comuns e torne-as grandes.",
        "Sua maior tarefa é descobrir seu potencial, e então, usá-lo.",
        "A jornada de mil milhas começa com um único passo.",
        "Continue aprendendo. O conhecimento é o único tesouro que não pode ser roubado.",
        "Pequenos progressos todos os dias somam grandes resultados.",
        "A persistência realiza o impossível.",
        "Quanto maior o desafio, maior a oportunidade de crescimento.",
        "Respire fundo. Você consegue.",
        "Foco no processo, não apenas no resultado.",
        "Cada erro é uma lição. Aprenda e siga em frente.",
        "A calma é um superpoder. Use-o.",
    ];
    const QUOTE_INTERVAL = 8000; // 8 segundos

    // === Estado da Aplicação ===
    let currentStep = 1;
    let simuladoConfig = {
        totalQuestoes: 0, tempoTotalSegundos: 0, edital: "",
        disciplinasSelecionadas: [], // { nome: "Nome" } - ORDENADO
        questoesPorDisciplina: {}, // { "Nome": count }
        assuntosPorDisciplina: {}, // { "Nome": ["Assunto1"] }
        nivel: "",
    };
    let allDisciplinas = [];
    let generatedQuestions = [];
    let questionsDataStore = {}; // NOVO: Armazena dados completos das questões (incluindo resolução)
    let currentSessionStats = {
        id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0,
        startTime: null, endTime: null, durationMs: 0, timedOut: false, config: {}
    };
    let timerIntervalId = null;
    let quoteIntervalId = null;
    let popupTimeoutId = null;
    let sortableInstance = null;

    // === Inicialização ===
    function initializeApp() {
        loadDisciplinas();
        setupEventListeners();
        showStep(1);
        updateSortableListPlaceholder();
    }

    // === Carregamento de Disciplinas ===
    function loadDisciplinas() {
        disciplinasCheckboxContainer.innerHTML = "<p>Carregando...</p>";
        try {
            const storedData = localStorage.getItem(DISCIPLINAS_STORAGE_KEY);
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                if (Array.isArray(parsedData) && parsedData.every(item => typeof item === "object" && item?.nome)) {
                    allDisciplinas = parsedData.sort((a, b) => a.nome.localeCompare(b.nome));
                    renderDisciplinaCheckboxes();
                } else { throw new Error("Formato inválido"); }
            } else {
                disciplinasCheckboxContainer.innerHTML = "<p>Nenhuma disciplina cadastrada.</p>"; allDisciplinas = [];
            }
        } catch (error) {
            console.error("Erro ao carregar disciplinas:", error);
            showErrorPopup("Erro ao carregar disciplinas do armazenamento local.");
            disciplinasCheckboxContainer.innerHTML = "<p class=\"error-text\">Erro ao carregar.</p>"; allDisciplinas = [];
        }
    }

    function renderDisciplinaCheckboxes() {
        if (allDisciplinas.length === 0) {
             disciplinasCheckboxContainer.innerHTML = "<p>Nenhuma disciplina cadastrada.</p>"; return;
        }
        disciplinasCheckboxContainer.innerHTML = "";
        allDisciplinas.forEach((disciplina, index) => {
            const id = `disciplina-cb-${index}`;
            const div = document.createElement("div"); div.className = "checkbox-item";
            const input = document.createElement("input");
            input.type = "checkbox"; input.id = id; input.value = disciplina.nome;
            input.dataset.disciplinaNome = disciplina.nome;
            input.addEventListener("change", handleDisciplinaSelectionChange);
            const label = document.createElement("label"); label.htmlFor = id; label.textContent = disciplina.nome;
            div.appendChild(input); div.appendChild(label);
            disciplinasCheckboxContainer.appendChild(div);
        });
        initializeSortableList();
    }

    // === Lógica de Ordenação (Drag and Drop) ===
    function initializeSortableList() {
        if (sortableInstance) sortableInstance.destroy();
        if (typeof Sortable !== "undefined") { // Verifica se SortableJS está carregado
             sortableInstance = new Sortable(disciplinasSortableList, {
                 animation: 150, ghostClass: "sortable-ghost", chosenClass: "sortable-chosen",
                 filter: ".sortable-placeholder", // Não permite arrastar o placeholder
                 onMove: function (evt) { // Previne mover para antes do placeholder se ele existir
                     return evt.related.className.indexOf("sortable-placeholder") === -1;
                 },
                 onEnd: () => console.log("Nova ordem:", getSelectedDisciplinasOrdered())
             });
        } else {
            console.error("SortableJS não carregado. A ordenação de disciplinas não funcionará.");
            // Informar usuário?
        }
    }

    function handleDisciplinaSelectionChange(event) {
        const checkbox = event.target;
        const disciplinaNome = checkbox.dataset.disciplinaNome;
        const items = Array.from(disciplinasSortableList.querySelectorAll("li:not(.sortable-placeholder)"));

        if (checkbox.checked) {
            // Adiciona se não existir
            if (!items.some(item => item.dataset.disciplinaNome === disciplinaNome)) {
                const listItem = document.createElement("li");
                listItem.dataset.disciplinaNome = disciplinaNome;
                listItem.textContent = disciplinaNome;
                disciplinasSortableList.appendChild(listItem);
            }
        } else {
            // Remove se existir
            items.forEach(item => {
                if (item.dataset.disciplinaNome === disciplinaNome) {
                    disciplinasSortableList.removeChild(item);
                }
            });
        }
        updateSortableListPlaceholder();
    }

    function updateSortableListPlaceholder() {
        const hasItems = disciplinasSortableList.querySelector("li:not(.sortable-placeholder)");
        let placeholder = disciplinasSortableList.querySelector(".sortable-placeholder");
        if (!placeholder && !hasItems) { // Cria se não existe e está vazio
            placeholder = document.createElement("li");
            placeholder.className = "sortable-placeholder";
            placeholder.textContent = "Selecione as disciplinas acima para ordená-las aqui.";
            disciplinasSortableList.appendChild(placeholder);
        }
        if(placeholder) placeholder.style.display = hasItems ? "none" : "list-item";
    }

    function getSelectedDisciplinasOrdered() {
        return Array.from(disciplinasSortableList.querySelectorAll("li:not(.sortable-placeholder)"))
                    .map(item => ({ nome: item.dataset.disciplinaNome }));
    }

    // === Lógica de Navegação entre Etapas ===
    function showStep(stepNumber) {
        steps.forEach(step => step.classList.remove("active-step"));
        const nextStep = document.getElementById(`step-${stepNumber}`);
        if (nextStep) { nextStep.classList.add("active-step"); currentStep = stepNumber; }
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleGoToStep2() { if (validateStep1()) { generateDisciplinaDetailInputs(); showStep(2); } }
    function handleGoToStep1() { showStep(1); }
    async function handleStartGeneration() { if (validateStep2()) { showStep(3); await generateSimulado(); } }

    // === Validação das Etapas ===
    function validateStep1() {
        hidePopup();
        simuladoConfig.totalQuestoes = parseInt(totalQuestoesInput.value, 10);
        const horas = parseInt(tempoInputHoras.value, 10) || 0;
        const minutos = parseInt(tempoInputMinutos.value, 10) || 0;
        simuladoConfig.tempoTotalSegundos = (horas * 3600) + (minutos * 60);
        simuladoConfig.edital = editalInput.value.trim();
        simuladoConfig.disciplinasSelecionadas = getSelectedDisciplinasOrdered();

        if (isNaN(simuladoConfig.totalQuestoes) || simuladoConfig.totalQuestoes < 1 || simuladoConfig.totalQuestoes > 100) {
            showErrorPopup("Número total de questões inválido (1-100)."); totalQuestoesInput.focus(); return false; }
        if (simuladoConfig.tempoTotalSegundos <= 0) {
            showErrorPopup("Tempo de prova inválido (> 0)."); tempoInputHoras.focus(); return false; }
        if (simuladoConfig.disciplinasSelecionadas.length === 0) {
            showErrorPopup("Selecione e ordene pelo menos uma disciplina."); return false; }
        if (simuladoConfig.totalQuestoes < simuladoConfig.disciplinasSelecionadas.length) {
            showErrorPopup(`Total de questões (${simuladoConfig.totalQuestoes}) menor que nº de disciplinas (${simuladoConfig.disciplinasSelecionadas.length}).`); totalQuestoesInput.focus(); return false; }

        console.log("Step 1 Validated:", simuladoConfig);
        return true;
    }

    function validateStep2() {
        hidePopup();
        let allocatedQuestoes = 0; let isValid = true;
        simuladoConfig.questoesPorDisciplina = {}; simuladoConfig.assuntosPorDisciplina = {};

        simuladoConfig.disciplinasSelecionadas.forEach((disciplina, index) => {
            const countInputId = `disciplina-count-${index}`;
            const assuntosInputId = `disciplina-assuntos-${index}`;
            const countEl = document.getElementById(countInputId);
            const assuntosEl = document.getElementById(assuntosInputId);
            if (!countEl || !assuntosEl) { console.error(`Inputs não encontrados para ${disciplina.nome}`); isValid = false; return; }

            const count = parseInt(countEl.value, 10);
            const assuntosStr = assuntosEl.value.trim();

            if (isNaN(count) || count < 1) {
                showErrorPopup(`Número de questões inválido (≥ 1) para "${disciplina.nome}".`); countEl.focus(); isValid = false;
            } else {
                simuladoConfig.questoesPorDisciplina[disciplina.nome] = count;
                allocatedQuestoes += count;
                simuladoConfig.assuntosPorDisciplina[disciplina.nome] = assuntosStr ? assuntosStr.split(",").map(s => s.trim()).filter(Boolean) : [];
            }
        });

        if (!isValid) return false;
        if (allocatedQuestoes !== simuladoConfig.totalQuestoes) {
            totalAllocatedText.textContent = `Erro: Soma (${allocatedQuestoes}) diferente do total (${simuladoConfig.totalQuestoes}).`;
            totalAllocatedText.className = "helper-text error-text"; // Garante classe de erro
            totalAllocatedText.style.display = "block";
            showErrorPopup(`Soma das questões (${allocatedQuestoes}) diferente do total (${simuladoConfig.totalQuestoes}). Ajuste.`);
            return false;
        } else { totalAllocatedText.style.display = "none"; }

        simuladoConfig.nivel = nivelQuestaoSelect.value;
        console.log("Step 2 Validated:", simuladoConfig);
        return true;
    }

    // === Geração Dinâmica de Inputs (Etapa 2) ===
    function generateDisciplinaDetailInputs() {
        disciplinaDetailContainer.innerHTML = "";
        const numDisciplinas = simuladoConfig.disciplinasSelecionadas.length;
        distributeHelperText.textContent = `Total: ${simuladoConfig.totalQuestoes} questões para ${numDisciplinas} disciplina(s).`;
        totalAllocatedText.style.display = "none";
        distributeCheckbox.disabled = numDisciplinas <= 1;
        distributeCheckbox.checked = false;

        simuladoConfig.disciplinasSelecionadas.forEach((disciplina, index) => {
            const countInputId = `disciplina-count-${index}`;
            const assuntosInputId = `disciplina-assuntos-${index}`;
            const div = document.createElement("div"); div.className = "disciplina-detail-item";

            const labelCount = document.createElement("label"); labelCount.htmlFor = countInputId;
            labelCount.innerHTML = `Questões para <strong>${disciplina.nome}</strong>:`;
            const inputCount = document.createElement("input"); inputCount.type = "number";
            inputCount.id = countInputId; inputCount.min = "1"; inputCount.dataset.disciplinaNome = disciplina.nome;
            inputCount.placeholder = "Qtd."; inputCount.addEventListener("input", updateTotalAllocatedFeedback);

            const labelAssuntos = document.createElement("label"); labelAssuntos.htmlFor = assuntosInputId;
            labelAssuntos.textContent = `Assuntos (opcional, separados por vírgula):`;
            const inputAssuntos = document.createElement("input"); inputAssuntos.type = "text";
            inputAssuntos.id = assuntosInputId; inputAssuntos.dataset.disciplinaNome = disciplina.nome;
            inputAssuntos.placeholder = "Ex: Brasil Colônia, Regência";

            div.appendChild(labelCount); div.appendChild(inputCount);
            div.appendChild(labelAssuntos); div.appendChild(inputAssuntos);
            disciplinaDetailContainer.appendChild(div);
        });
        setDefaultQuestionCounts();
        updateTotalAllocatedFeedback();
    }

    function setDefaultQuestionCounts() {
        let assigned = 0;
        const inputs = disciplinaDetailContainer.querySelectorAll("input[type=\"number\"]");
        const numDisc = simuladoConfig.disciplinasSelecionadas.length;
        const totalQ = simuladoConfig.totalQuestoes;
        inputs.forEach((input, index) => {
            if (index < numDisc - 1) { input.value = 1; assigned += 1; }
            else { input.value = Math.max(1, totalQ - assigned); } // Último recebe restante
        });
        if (distributeCheckbox.checked) distributeQuestionsEqually();
    }

    // === Lógica de Distribuição (Etapa 2) ===
    function handleDistributeCheckboxChange() {
        if (distributeCheckbox.checked) distributeQuestionsEqually();
        updateTotalAllocatedFeedback();
    }

    function distributeQuestionsEqually() {
        const totalQ = simuladoConfig.totalQuestoes;
        const numDisc = simuladoConfig.disciplinasSelecionadas.length;
        if (numDisc === 0) return;
        const baseCount = Math.floor(totalQ / numDisc); let remainder = totalQ % numDisc;
        const inputs = disciplinaDetailContainer.querySelectorAll("input[type=\"number\"]");
        inputs.forEach((input, index) => {
            let count = baseCount + (remainder > 0 ? 1 : 0); remainder--;
            input.value = Math.max(1, count);
        });
        updateTotalAllocatedFeedback();
    }

    function updateTotalAllocatedFeedback() {
        let currentTotal = 0; let allValid = true;
        const inputs = disciplinaDetailContainer.querySelectorAll("input[type=\"number\"]");
        inputs.forEach(input => {
            const count = parseInt(input.value, 10);
            if (!isNaN(count) && count >= 1) currentTotal += count;
            else if (input.value !== "") allValid = false;
        });

        const targetTotal = simuladoConfig.totalQuestoes;
        totalAllocatedText.classList.remove("success-text", "error-text");
        if (!allValid) {
            totalAllocatedText.textContent = `Atenção: Número inválido (≥ 1).`;
            totalAllocatedText.className = "helper-text error-text";
            totalAllocatedText.style.display = "block";
        } else if (currentTotal !== targetTotal) {
            totalAllocatedText.textContent = `Soma atual: ${currentTotal} / ${targetTotal}`;
            totalAllocatedText.className = "helper-text error-text";
            totalAllocatedText.style.display = "block";
        } else {
            totalAllocatedText.textContent = `Soma correta: ${currentTotal} / ${targetTotal}`;
            totalAllocatedText.className = "helper-text success-text";
            totalAllocatedText.style.display = "block";
        }
    }

    // === Geração do Simulado (API Calls - Etapa 3) ===
    async function generateSimulado() {
        console.log("Starting simulation generation...");
        generationStatus.innerHTML = ""; // Limpa logs anteriores
        updateProgressBar(0); // Reseta barra
        startMotivationalQuotes();
        generatedQuestions = [];
        questionsDataStore = {}; // Limpa dados anteriores
        const promises = [];
        let generatedCount = 0;
        const totalDisciplinas = simuladoConfig.disciplinasSelecionadas.length;

        addGenerationLog(`Elaborando ${simuladoConfig.totalQuestoes} questões...`);

        simuladoConfig.disciplinasSelecionadas.forEach(disciplina => {
            const nome = disciplina.nome;
            const numQ = simuladoConfig.questoesPorDisciplina[nome];
            const assuntos = simuladoConfig.assuntosPorDisciplina[nome] || [];
            const nivel = simuladoConfig.nivel;
            const edital = simuladoConfig.edital;

            addGenerationLog(`Preparando questões de ${nome}...`);
            console.log(`Generating ${numQ} questions for ${nome} (Subjects: ${assuntos.join(", ") || "Any"})`);

            const promise = generateQuestionsForDisciplina(nome, numQ, nivel, edital, assuntos)
                .then(result => {
                    generatedCount++;
                    updateProgressBar(Math.round((generatedCount / totalDisciplinas) * 100)); // CORRIGIDO: Atualiza barra aqui
                    const questions = result.map(q => ({ ...q, disciplina: nome }));
                    console.log(`Disciplina ${nome}: ${result.length} questões geradas.`);
                    return questions;
                })
                .catch(error => {
                    generatedCount++;
                    updateProgressBar(Math.round((generatedCount / totalDisciplinas) * 100)); // CORRIGIDO: Atualiza barra mesmo em erro
                    addGenerationLog(`Problema ao buscar questões de ${nome}.`, "error");
                    console.error(`Falha ao gerar ${nome}:`, error);
                    return []; // Retorna array vazio em caso de erro para não quebrar Promise.all
                });
            promises.push(promise);
        });

        const resultsArrays = await Promise.all(promises);
        stopMotivationalQuotes();

        resultsArrays.forEach(arr => generatedQuestions = generatedQuestions.concat(arr));

        // Armazena dados completos para resolução posterior
        generatedQuestions.forEach(q => { if(q.id) questionsDataStore[q.id] = q; });

        addGenerationLog("Organizando o simulado...");
        updateProgressBar(100); // Garante 100% no final
        console.log(`Generation complete. Total questions: ${generatedQuestions.length}`);

        if (generatedQuestions.length > 0) {
            const msgType = generatedQuestions.length < simuladoConfig.totalQuestoes ? "warning" : "success";
            const msgText = msgType === "warning" ? `Geradas ${generatedQuestions.length} de ${simuladoConfig.totalQuestoes} questões.` : `Simulado gerado com ${generatedQuestions.length} questões!`;
            showStatusPopup(msgText, msgType);
            setTimeout(() => { hidePopup(); startSimuladoView(); }, 1500);
        } else {
            showErrorPopup("Falha total: Nenhuma questão gerada. Verifique a Chave de API e tente novamente.");
             setTimeout(() => { hidePopup(); showStep(2); }, 3000);
        }
    }

    async function generateQuestionsForDisciplina(disciplinaNome, numQuestoes, nivel, edital, assuntos = []) {
        // MELHORADO: Prompt para incluir resolução e imagem opcional
        let prompt = `Gere ${numQuestoes} questão(ões) EXCLUSIVAMENTE sobre a Disciplina "${disciplinaNome}".\n`;
        prompt += `Nível de dificuldade: ${nivel}.\n`;
        if (edital) prompt += `Contexto do Edital/Concurso: "${edital}".\n`;
        if (assuntos.length > 0) prompt += `Tópicos/Assuntos específicos: ${assuntos.join(", ")}.\n`;
        prompt += `Tipo: Múltipla Escolha (A, B, C, D).\nFormato OBRIGATÓRIO:\n`;
        prompt += `- Separe questões com "[SEP]".\n`;
        prompt += `- Dentro de cada questão:\n`;
        prompt += `  - Enunciado: "[Q] texto..."\n`;
        prompt += `  - (Opcional) Imagem ESSENCIAL: "[IMG] URL_ou_descrição_detalhada" (Use raramente)\n`;
        prompt += `  - Alternativas: "[A] texto...", "[B] texto...", etc.\n`;
        prompt += `  - Resposta Correta: "[R] LETRA_CORRETA" (A, B, C ou D).\n`;
        prompt += `  - Resolução DETALHADA: "[RES] Explicação completa..." (OBRIGATÓRIO)\n`; // Exige resolução
        prompt += `Exemplo:
[Q] Exemplo ${disciplinaNome}?
[A] Op1
[B] Op2
[C] Op3
[D] Op4
[R] B
[RES] A resposta é B porque...
[SEP]
`;
        prompt += `IMPORTANTE: Siga ESTRITAMENTE o formato. Gere APENAS o texto das questões. TODAS as questões DEVEM ter [RES].`;

        const requestBody = {
             contents: [{ parts: [{ text: prompt }] }],
             generationConfig: { "temperature": 0.7, "maxOutputTokens": 500 * numQuestoes + 500 }, // Aumentado para resolução
             safetySettings: [
                 {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                 {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                 {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                 {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
             ]
        };

        try {
             const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
             if (!response.ok) {
                 const errorBody = await response.json().catch(() => ({ error: { message: `Erro HTTP ${response.status}` } }));
                 throw new Error(`API Error: ${errorBody?.error?.message || response.statusText}`);
             }
             const data = await response.json();
             if (data.promptFeedback?.blockReason) throw new Error(`API blocked: ${data.promptFeedback.blockReason}`);
             const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
             if (!text) throw new Error("API response format invalid or empty.");

             const questionsArray = parseGeneratedText(text, "multipla_escolha"); // Usa o parser atualizado
             const validQuestions = questionsArray.filter(q => q.type !== "error");

             if (validQuestions.length !== numQuestoes) {
                  console.warn(`Disciplina ${disciplinaNome}: Esperadas ${numQuestoes}, Parseadas ${validQuestions.length}.`);
                  if (validQuestions.length === 0 && questionsArray.length > 0) throw new Error(`Erro no parsing das ${questionsArray.length} questões retornadas.`);
                  if (validQuestions.length === 0 && questionsArray.length === 0) throw new Error("Nenhuma questão válida retornada ou parseada.");
             }
            return validQuestions;
        } catch (error) {
             console.error(`Falha em generateQuestionsForDisciplina (${disciplinaNome}):`, error);
             throw error; // Re-throw para Promise.all
        }
    }

    // Log Simplificado
    function addGenerationLog(message, type = "info") {
        if(!generationStatus) return;
        const p = document.createElement("p");
        let icon = "";
        if (type === "error") icon = "<i class=\"fas fa-exclamation-circle\" style=\"color: #dc3545; margin-right: 8px;\"></i>";
        else icon = "<i class=\"fas fa-check-circle\" style=\"color: #28a745; margin-right: 8px;\"></i>"; // Default to success/info icon
        p.innerHTML = `${icon} ${message}`;
        generationStatus.appendChild(p);
        generationStatus.scrollTop = generationStatus.scrollHeight;
    }

    // CORRIGIDO: Função para atualizar a barra de progresso
    function updateProgressBar(percentage) {
        const clampedPercentage = Math.max(0, Math.min(100, percentage)); // Garante 0-100
        if (progressBar) {
            progressBar.style.width = `${clampedPercentage}%`;
        }
        if (progressText) {
            progressText.textContent = `${Math.round(clampedPercentage)}%`;
        }
    }

    function startMotivationalQuotes() {
        stopMotivationalQuotes(); // Garante que não haja múltiplos intervalos
        function showRandomQuote() {
            if (motivationalQuote) {
                const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
                motivationalQuote.textContent = MOTIVATIONAL_QUOTES[randomIndex];
            }
        }
        showRandomQuote(); // Mostra uma imediatamente
        quoteIntervalId = setInterval(showRandomQuote, QUOTE_INTERVAL);
    }

    function stopMotivationalQuotes() {
        if (quoteIntervalId) {
            clearInterval(quoteIntervalId);
            quoteIntervalId = null;
        }
    }

    // === Lógica da Visualização do Simulado ===
    function startSimuladoView() {
        steps.forEach(step => step.style.display = "none");
        simuladoView.style.display = "block";
        if(simuladoFixedFooter) simuladoFixedFooter.style.display = "flex";
        window.scrollTo({ top: 0, behavior: "smooth" });

        currentSessionStats = { // Reset stats
            id: `sim-${Date.now()}`,
            totalQuestions: generatedQuestions.length,
            answeredCount: 0,
            correctCount: 0,
            startTime: Date.now(),
            endTime: null,
            durationMs: 0,
            timedOut: false,
            config: { ...simuladoConfig }
        };
        finalizeButton.disabled = false;
        finalizeButton.innerHTML = 
        '<i class="fas fa-check-circle"></i> Finalizar Simulado'; // Reset texto/ícone

        displaySimuladoQuestions(generatedQuestions);
        updateProgressIndicator();
        startTimer(simuladoConfig.tempoTotalSegundos);
    }

    // ATUALIZADO: Exibe questões com imagem e área/botão de resolução
    function displaySimuladoQuestions(questionsArray) {
        questoesOutput.innerHTML = "";
        if (!questionsArray || questionsArray.length === 0) {
            questoesOutput.innerHTML = "<p class=\"empty-state\">Nenhuma questão encontrada.</p>";
            return;
        }
        let currentDisciplina = null;
        let questionNumber = 0;
        questionsArray.forEach(qData => {
            if (!qData || qData.type === "error") {
                console.warn("Pulando questão com erro:", qData);
                return;
            }
            questionNumber++;

            if (qData.disciplina !== currentDisciplina) {
                currentDisciplina = qData.disciplina;
                const h3 = document.createElement("h3");
                h3.className = "disciplina-heading";
                h3.textContent = currentDisciplina;
                questoesOutput.appendChild(h3);
            }

            const qDiv = document.createElement("div");
            qDiv.className = "question-item";
            qDiv.id = qData.id || `q-${questionNumber}`;
            qDiv.dataset.questionType = qData.type;
            qDiv.dataset.answered = "false";
            qDiv.dataset.correctAnswer = qData.correctAnswer || "";
            qDiv.dataset.selectedOption = "";

            const qText = document.createElement("p");
            qText.className = "question-text";
            const cleanText = qData.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            qText.innerHTML = `<strong>${questionNumber}.</strong> ${cleanText.replace(/\n/g, "<br>")}`;
            qDiv.appendChild(qText);

            // Adiciona imagem se existir
            if (qData.image) {
                const imgElement = document.createElement("img");
                imgElement.src = qData.image; // Assume URL válida
                imgElement.alt = `Imagem para a questão ${questionNumber}`;
                imgElement.className = "question-image";
                imgElement.onerror = () => {
                    console.warn(`Erro ao carregar imagem: ${qData.image} para questão ${qData.id}`);
                    imgElement.alt = `Erro ao carregar imagem para a questão ${questionNumber}`;
                };
                qDiv.appendChild(imgElement);
            }

            const optsCont = document.createElement("div");
            optsCont.className = "options-container";
            const optsKeys = Object.keys(qData.options || {}).filter(k => ["A", "B", "C", "D"].includes(k)).sort();
            optsKeys.forEach(key => {
                const optBtn = document.createElement("button");
                optBtn.className = "option-btn";
                optBtn.dataset.value = key;
                const cleanOpt = (qData.options[key] || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                optBtn.textContent = `${key}) ${cleanOpt}`;
                optsCont.appendChild(optBtn);
            });
            qDiv.appendChild(optsCont);

            // Área de Feedback (agora inclui botão de resolução)
            const feedbackArea = document.createElement("div");
            feedbackArea.className = "feedback-area";

            // Botão Ver Resolução (adicionado aqui, mas escondido inicialmente)
            if (qData.resolution) {
                const resolutionButton = document.createElement("button");
                resolutionButton.className = "view-resolution-btn";
                resolutionButton.innerHTML = 
                '<i class="fas fa-eye"></i> Ver Resolução';
                resolutionButton.dataset.questionId = qData.id;
                resolutionButton.style.display = "none"; // Começa escondido
                feedbackArea.appendChild(resolutionButton);
            }
            qDiv.appendChild(feedbackArea);

            // Área para exibir a resolução (escondida)
            if (qData.resolution) {
                const resolutionDiv = document.createElement("div");
                resolutionDiv.className = "resolution-area";
                resolutionDiv.style.display = "none";
                qDiv.appendChild(resolutionDiv);
            }

            questoesOutput.appendChild(qDiv);
        });
    }

    function updateProgressIndicator() {
        if(progressIndicatorFixed) progressIndicatorFixed.textContent = `${currentSessionStats.answeredCount} / ${currentSessionStats.totalQuestions}`;
    }

    function startTimer(totalSeconds) {
        stopTimer();
        let remainingSeconds = totalSeconds;
        function updateDisplay() {
            const mins = Math.floor(remainingSeconds / 60);
            const secs = remainingSeconds % 60;
            if(timeRemainingFixed) timeRemainingFixed.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
        }
        updateDisplay();
        timerIntervalId = setInterval(() => {
            remainingSeconds--;
            updateDisplay();
            if (remainingSeconds < 0) {
                stopTimer();
                finalizeSimulado(true); // Finaliza por tempo esgotado
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerIntervalId) {
            clearInterval(timerIntervalId);
            timerIntervalId = null;
        }
    }

    // === Interação com Questões ===
    function handleSimuladoOptionClick(clickedButton) {
        const questionDiv = clickedButton.closest(".question-item");
        if (!questionDiv || clickedButton.disabled) return; // Ignora se desabilitado (pós-finalizar)

        const allOptionButtons = questionDiv.querySelectorAll(".option-btn");
        const selectedValue = clickedButton.dataset.value;

        allOptionButtons.forEach(btn => btn.classList.remove("selected"));
        clickedButton.classList.add("selected");
        questionDiv.dataset.selectedOption = selectedValue;

        markQuestionAsAnswered(questionDiv);
    }

    function markQuestionAsAnswered(questionDiv) {
        if (questionDiv.dataset.answered === "false") {
            questionDiv.dataset.answered = "true";
            questionDiv.classList.add("answered-pending-review");
            currentSessionStats.answeredCount++;
            updateProgressIndicator();
            if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions) {
                 showStatusPopup("Todas as questões respondidas! Finalize quando quiser.", "info");
            }
        }
        // Não calcula acerto aqui
    }

    // === Finalização do Simulado ===
    function finalizeSimulado(timedOut = false) {
        console.log("Executando finalizeSimulado...", { timedOut });
        stopTimer();
        currentSessionStats.endTime = Date.now();
        currentSessionStats.durationMs = currentSessionStats.endTime - (currentSessionStats.startTime || currentSessionStats.endTime);
        currentSessionStats.timedOut = timedOut;

        let finalCorrect = 0;
        let finalAnswered = 0;
        const allQuestionItems = questoesOutput.querySelectorAll(".question-item");

        allQuestionItems.forEach(qDiv => {
            const isAnswered = qDiv.dataset.answered === "true";
            const userAnswer = qDiv.dataset.selectedOption;
            const correctAnswer = qDiv.dataset.correctAnswer;
            const resolutionButton = qDiv.querySelector(".view-resolution-btn"); // Pega botão de resolução

            qDiv.classList.remove("answered-pending-review");
            qDiv.querySelectorAll(".option-btn").forEach(btn => btn.disabled = true); // Desabilita opções

            if (isAnswered && userAnswer) {
                finalAnswered++;
                if (userAnswer === correctAnswer) {
                    finalCorrect++;
                    qDiv.classList.add("correct");
                } else {
                    qDiv.classList.add("incorrect");
                }
                // Marca a selecionada (já está com .selected)
                // Destaca a correta
                const correctBtn = qDiv.querySelector(`.option-btn[data-value="${correctAnswer}"]`);
                if (correctBtn) correctBtn.classList.add("correct-answer-highlight");

            } else { // Não respondida
                qDiv.classList.add("incorrect"); // Conta como errada
                 // Apenas destaca a correta
                 const correctBtn = qDiv.querySelector(`.option-btn[data-value="${correctAnswer}"]`);
                 if (correctBtn) correctBtn.classList.add("correct-answer-highlight");
            }

            // Mostra o botão "Ver Resolução" após finalizar
            if (resolutionButton) {
                resolutionButton.style.display = "inline-flex";
            }
        });

        currentSessionStats.answeredCount = finalAnswered;
        currentSessionStats.correctCount = finalCorrect;
        console.log("Stats finais:", currentSessionStats);

        finalizeButton.disabled = true;
        finalizeButton.innerHTML = 
        '<i class="fas fa-check"></i> Simulado Finalizado';
        if(simuladoFixedFooter) simuladoFixedFooter.style.display = "none";

        console.log("Chamando showResultsScreen()...");
        try {
            showResultsScreen(); // CORRIGIDO: Chama a função para mostrar o MODAL
        } catch (error) {
            console.error("Erro ao chamar showResultsScreen:", error);
            alert("Erro ao exibir resultados. Verifique o console.");
        }
    }

    // === Tela de Resultados (Modal) ===
    // CORRIGIDO: Garante que o popup seja exibido
    function showResultsScreen() {
        console.log("Dentro de showResultsScreen...");
        if (!popupOverlay || !resultsContainer || !resultsMessage || !resultsStats || !resultsButtons || !popupTextMessage) {
            console.error("Elementos do popup de resultados não encontrados!");
            return;
        }

        const total = currentSessionStats.totalQuestions;
        const correct = currentSessionStats.correctCount;
        const answered = currentSessionStats.answeredCount;
        const timeUsed = formatDuration(currentSessionStats.durationMs);
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

        let msgText = "", msgClass = "warning";
        if (percentage >= 70) { msgText = `Parabéns! 🎉 Acertos: ${percentage}%.`; msgClass = "success"; }
        else if (percentage >= 50) { msgText = `Bom trabalho! Acertos: ${percentage}%. Continue estudando!`; msgClass = "info"; }
        else { msgText = `Não desanime! Acertos: ${percentage}%. Use como motivação!`; msgClass = "warning"; }
        if (currentSessionStats.timedOut) msgText += "\n(Tempo Esgotado)";

        resultsMessage.textContent = msgText;
        resultsMessage.className = `results-message ${msgClass}`;
        resultsStats.innerHTML = `<p><strong>Total:</strong> <span>${total}</span></p> <p><strong>Respondidas:</strong> <span>${answered}</span></p> <p><strong>Acertos:</strong> <span>${correct} (<span id="statPercentage">${percentage}</span>%)</span></p> <p><strong>Tempo:</strong> <span>${timeUsed}</span></p>`;

        popupTextMessage.style.display = "none"; // Esconde texto genérico
        resultsContainer.style.display = "block"; // Mostra container de resultados
        popupMessageBox.classList.add("results-popup"); // Adiciona classe específica se necessário
        if(popupCloseButton) popupCloseButton.style.display = "none"; // Esconde X padrão no popup de resultado
        resultsSaveButton.disabled = false; // Habilita botão salvar
        resultsSaveButton.innerHTML = 
        '<i class="fas fa-save"></i> Salvar Resumo'; // Reseta texto/ícone

        console.log("Exibindo overlay do resultado...");
        popupOverlay.classList.add("visible"); // CORRIGIDO: Torna o overlay visível
        console.log("showResultsScreen concluída.");
    }

    function handleSaveResults() {
        saveSimuladoSummary();
        resultsSaveButton.disabled = true;
        resultsSaveButton.innerHTML = 
        '<i class="fas fa-check"></i> Salvo!';
    }

    function handleCloseResults() {
        hidePopup();
    }

    function saveSimuladoSummary() {
         if (!currentSessionStats.id) return;
         console.log("Salvando resumo:", currentSessionStats.id);
         const summary = {
             id: currentSessionStats.id,
             timestamp: new Date().toISOString(),
             disciplina: currentSessionStats.config.disciplinasSelecionadas.map(d=>d.nome).join(", ") || "Simulado",
             totalQuestions: currentSessionStats.totalQuestions,
             answeredCount: currentSessionStats.answeredCount,
             correctCount: currentSessionStats.correctCount,
             durationMs: currentSessionStats.durationMs,
             timedOut: currentSessionStats.timedOut,
             config: currentSessionStats.config // Salva a configuração usada
         };
         try {
             const summaries = JSON.parse(localStorage.getItem(RESULTS_STORAGE_KEY) || "[]");
             if (!Array.isArray(summaries)) throw new Error("LocalStorage inválido");
             summaries.push(summary);
             localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(summaries));
             console.log(`Resumo ${summary.id} salvo.`);
         } catch (error) {
             console.error("Erro ao salvar resumo:", error);
             showErrorPopup("Erro ao salvar o resumo.");
             resultsSaveButton.disabled = false; // Permite tentar salvar novamente
             resultsSaveButton.innerHTML = 
             '<i class="fas fa-save"></i> Salvar Resumo';
         }
     }

    // === Funções Auxiliares (Popup, Parse, Format) ===
    function showPopup(message, type = "info", autoCloseDelay = null) {
        if (!popupOverlay || !popupMessageBox || !popupContent || !popupTextMessage || !resultsContainer) {
             console.error("Elementos do Popup não encontrados."); alert(message); return; }
        if (popupTimeoutId) { clearTimeout(popupTimeoutId); popupTimeoutId = null; }

        resultsContainer.style.display = "none"; // Garante que resultados estejam escondidos
        popupTextMessage.style.display = "block"; // Mostra texto genérico
        popupTextMessage.textContent = message;
        popupMessageBox.className = `popup-message-box ${type}`; // Define tipo/cor
        popupMessageBox.classList.remove("results-popup"); // Remove classe de resultado se houver
        if(popupCloseButton) popupCloseButton.style.display = "block"; // Mostra X padrão
        popupOverlay.classList.add("visible");

        if (autoCloseDelay && typeof autoCloseDelay === "number" && autoCloseDelay > 0) {
            popupTimeoutId = setTimeout(hidePopup, autoCloseDelay);
        }
    }

    function hidePopup() {
        if (popupTimeoutId) { clearTimeout(popupTimeoutId); popupTimeoutId = null; }
        if (popupOverlay) popupOverlay.classList.remove("visible");
        // Reseta estado do popup para próximo uso
        if (popupMessageBox) popupMessageBox.className = "popup-message-box";
        if (resultsContainer) resultsContainer.style.display = "none";
        if (popupTextMessage) popupTextMessage.style.display = "block";
        if (popupCloseButton) popupCloseButton.style.display = "block";
    }
    function showErrorPopup(message) { showPopup(message, "error"); }
    function showStatusPopup(message, type = "info") { showPopup(message, type, 3000); } // Fecha após 3s

    // ATUALIZADO: Parser para incluir [RES] e [IMG]
    function parseGeneratedText(text, expectedType) {
         const questions = [];
         const startIndex = Math.min( text.indexOf("[Q]") !== -1 ? text.indexOf("[Q]") : Infinity, text.indexOf("[SEP]") !== -1 ? text.indexOf("[SEP]") : Infinity );
         const relevantText = startIndex !== Infinity ? text.substring(startIndex) : text;
         const questionBlocks = relevantText.trim().split(/\s*\[SEP\]\s*/i).filter(block => block.trim() && block.toUpperCase().startsWith("[Q]"));

         if (questionBlocks.length === 0 && relevantText.trim()) {
              if (relevantText.trim().toUpperCase().startsWith("[Q]")) { questionBlocks.push(relevantText.trim()); }
              else { console.error("Texto da API não reconhecido:", relevantText); return [{ id: `q-error-parse-global`, text: `Erro: Formato da API irreconhecível.`, type: "error", resolution: null, image: null }]; }
         }

         questionBlocks.forEach((block, index) => {
             try {
                 const qId = `q-${Date.now()}-${index}`;
                 const qData = { id: qId, text: "", options: {}, correctAnswer: null, type: expectedType, disciplina: "", resolution: null, image: null }; // Adiciona resolution e image

                 // Extrai [Q], [IMG], [RES] e o resto
                 const qMatch = block.match(/\[Q\]([\s\S]*?)(?:\n\s*\[IMG\]|\n\s*\[A\]|\n\s*\[RES\]|$)/i);
                 if (qMatch?.[1]) qData.text = qMatch[1].trim();
                 else { throw new Error("[Q] não encontrado ou formato inválido."); }

                 const imgMatch = block.match(/\n\s*\[IMG\]\s*(.*)/i);
                 if (imgMatch?.[1]) qData.image = imgMatch[1].trim();

                 const resMatch = block.match(/\n\s*\[RES\]([\s\S]*?)(?:\n\s*\[SEP\]|$)/i);
                 if (resMatch?.[1]) qData.resolution = resMatch[1].trim();
                 else { throw new Error("[RES] não encontrado."); } // Exige resolução

                 let foundR = false;
                 block.trim().split("\n").forEach(line => {
                     line = line.trim();
                     if (/^\[A\]/i.test(line)) qData.options["A"] = line.substring(3).trim();
                     else if (/^\[B\]/i.test(line)) qData.options["B"] = line.substring(3).trim();
                     else if (/^\[C\]/i.test(line)) qData.options["C"] = line.substring(3).trim();
                     else if (/^\[D\]/i.test(line)) qData.options["D"] = line.substring(3).trim();
                     else if (/^\[R\]/i.test(line)) { qData.correctAnswer = line.substring(3).trim().toUpperCase(); foundR = true; }
                 });

                 if (!foundR || !qData.correctAnswer) throw new Error(`[R] não encontrado ou vazio.`);
                 if (Object.keys(qData.options).length < 2) throw new Error(`Menos de 2 opções encontradas.`);
                 if (!["A", "B", "C", "D"].includes(qData.correctAnswer)) throw new Error(`Resposta [R] "${qData.correctAnswer}" inválida.`);
                 if (!qData.options[qData.correctAnswer]) throw new Error(`Resposta [R] "${qData.correctAnswer}" não corresponde a uma opção.`);

                 questions.push(qData);
             } catch (error) {
                 console.error(`Erro ao processar bloco ${index + 1}:`, error, "\nBloco:\n", block);
                 questions.push({ id: `q-error-${Date.now()}-${index}`, text: `Erro ao carregar questão (${error.message}).`, type: "error", resolution: null, image: null });
             }
         });
         return questions;
     }

    // NOVO: Função para lidar com clique em "Ver Resolução"
    function handleViewResolution(resolutionButton) {
        const questionId = resolutionButton.dataset.questionId;
        const questionDiv = document.getElementById(questionId);
        const resolutionArea = questionDiv ? questionDiv.querySelector(".resolution-area") : null;
        const questionData = questionsDataStore[questionId];

        if (!questionDiv || !resolutionArea || !questionData || !questionData.resolution) {
            console.error(`Erro ao tentar mostrar resolução para questão ${questionId}. Elementos ou dados não encontrados.`);
            showStatusPopup("Erro ao carregar a resolução.", "error");
            return;
        }

        // Preenche e mostra a área de resolução
        const sanitizedResolution = questionData.resolution.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        resolutionArea.innerHTML = `<strong>Resolução:</strong><br>${sanitizedResolution.replace(/\n/g, "<br>")}`;
        resolutionArea.style.display = "block";

        // Opcional: Desabilitar ou mudar texto do botão após clique
        resolutionButton.disabled = true;
        resolutionButton.innerHTML = 
        '<i class="fas fa-check"></i> Resolução Exibida';

        console.log(`Resolução exibida para ${questionId}`);
    }

    function formatDuration(ms) {
        if (ms < 0) ms = 0;
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) {
            return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        } else {
            return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        }
    }

    // === Setup dos Event Listeners Globais ===
    function setupEventListeners() {
        goToStep1Button?.addEventListener("click", handleGoToStep1);
        goToStep2Button?.addEventListener("click", handleGoToStep2);
        startGenerationButton?.addEventListener("click", handleStartGeneration);
        distributeCheckbox?.addEventListener("change", handleDistributeCheckboxChange);
        questoesOutput?.addEventListener("click", (event) => {
            if (event.target.matches(".option-btn")) handleSimuladoOptionClick(event.target);
            if (event.target.matches(".view-resolution-btn")) handleViewResolution(event.target); // NOVO: Listener para resolução
        });
        finalizeButton?.addEventListener("click", () => finalizeSimulado(false));
        popupCloseButton?.addEventListener("click", hidePopup);
        popupOverlay?.addEventListener("click", (event) => { if (event.target === popupOverlay) hidePopup(); });
        resultsCloseButton?.addEventListener("click", handleCloseResults);
        resultsSaveButton?.addEventListener("click", handleSaveResults);
    }

    // --- Inicia a aplicação ---
    initializeApp();

}); // Fim do DOMContentLoaded