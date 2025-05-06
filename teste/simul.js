document.addEventListener("DOMContentLoaded", () => {
    // === Elementos do DOM - Configuração do Simulado ===
    const configSimuladoSection = document.getElementById("configSimuladoSection");
    const disciplinasSimuladoSelect = document.getElementById("disciplinasSimuladoSelect");
    const gerenciarDisciplinasSimuladoBtn = document.getElementById("gerenciarDisciplinasSimuladoBtn");
    const assuntosPorDisciplinaContainer = document.getElementById("assuntosPorDisciplinaContainer");
    const numTotalQuestoesInput = document.getElementById("numTotalQuestoesInput");
    const questoesPorDisciplinaContainer = document.getElementById("questoesPorDisciplinaContainer");
    const listaPrioridadeDisciplinas = document.getElementById("listaPrioridadeDisciplinas");
    const tempoSimuladoInput = document.getElementById("tempoSimuladoInput");
    const nivelDificuldadeSimuladoSelect = document.getElementById("nivelDificuldadeSimuladoSelect");
    const gerarSimuladoButton = document.getElementById("gerarSimuladoButton");

    // === Elementos do DOM - Tela de Carregamento ===
    const loadingScreen = document.getElementById("loadingScreen");
    const motivationalMessageLoading = document.getElementById("motivationalMessageLoading");
    const generationProgressBar = document.getElementById("generationProgressBar");

    // === Elementos do DOM - Resolução do Simulado ===
    const resolucaoSimuladoSection = document.getElementById("resolucaoSimuladoSection");
    const simuladoTitulo = document.getElementById("simuladoTitulo");
    const timerDisplay = document.getElementById("timerDisplay");
    const tempoRestanteSpan = document.getElementById("tempoRestante");
    const questoesSimuladoOutput = document.getElementById("questoesSimuladoOutput");
    const finalizarSimuladoBtn = document.getElementById("finalizarSimuladoBtn");

    // === Elementos do DOM - Painel Flutuante ===
    const floatingControlPanel = document.getElementById("floatingControlPanel");
    const togglePainelBtn = document.getElementById("togglePainelBtn");
    const panelContent = floatingControlPanel ? floatingControlPanel.querySelector(".panel-content") : null;
    const progressoSimuladoRealTime = document.getElementById("progressoSimuladoRealTime");
    const questoesRespondidasProgresso = document.getElementById("questoesRespondidasProgresso");
    const totalQuestoesProgresso = document.getElementById("totalQuestoesProgresso");
    const porcentagemProgresso = document.getElementById("porcentagemProgresso");
    const pausarRetomarSimuladoBtn = document.getElementById("pausarRetomarSimuladoBtn");
    const finalizarSimuladoPainelBtn = document.getElementById("finalizarSimuladoPainelBtn");

    // === Elementos do DOM - Popups ===
    const disciplinasSimuladoPopupOverlay = document.getElementById("disciplinasSimuladoPopupOverlay");
    const disciplinasSimuladoPopupBox = document.getElementById("disciplinasSimuladoPopupBox");
    const disciplinasSimuladoPopupTitleEl = document.getElementById("disciplinasSimuladoPopupTitle");
    const minimizeDisciplinasSimuladoPopup = document.getElementById("minimizeDisciplinasSimuladoPopup");
    const closeDisciplinasSimuladoPopup = document.getElementById("closeDisciplinasSimuladoPopup");
    const disciplinasSimuladoPopupContentArea = document.getElementById("disciplinasSimuladoPopupContent");
    const novaDisciplinaSimuladoInput = document.getElementById("novaDisciplinaSimuladoInput");
    const addDisciplinaSimuladoButton = document.getElementById("addDisciplinaSimuladoButton");
    const listaDisciplinasSimuladoExistentes = document.getElementById("listaDisciplinasSimuladoExistentes");

    const resumoSimuladoPopupOverlay = document.getElementById("resumoSimuladoPopupOverlay");
    const resumoSimuladoPopupBox = document.getElementById("resumoSimuladoPopupBox");
    const resumoPopupIcon = document.getElementById("resumoPopupIcon");
    const resumoPopupTitle = document.getElementById("resumoPopupTitle");
    const resumoPopupContent = document.getElementById("resumoPopupContent");
    const revisarSimuladoBtn = document.getElementById("revisarSimuladoBtn");
    const fecharResumoSimuladoBtn = document.getElementById("fecharResumoSimuladoBtn");

    // === Elementos do DOM - Revisão do Simulado (Gabarito) ===
    const revisaoSimuladoSection = document.getElementById("revisaoSimuladoSection");
    const gabaritoSimuladoOutput = document.getElementById("gabaritoSimuladoOutput");
    const voltarParaConfigSimuladoBtn = document.getElementById("voltarParaConfigSimuladoBtn");

    // === Configuração da API (similar à outra página, ajustar se necessário) ===
    const GEMINI_API_KEY = "AIzaSyDfmegc9Aue6YlTphmcVV0p_I9rgsKVXKs"; // Substitua pela sua chave real
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

    // === Chaves do LocalStorage ===
    const SIMULADO_SESSIONS_KEY = "sessoesSimulado";
    const DISCIPLINAS_SIMULADO_KEY = "disciplinasSimulado"; // Chave diferente para disciplinas de simulado

    // === Variáveis Globais ===
    let disciplinasSimuladoSalvas = [];
    let sortablePrioridade = null;
    let currentSimuladoSession = null; // { id, startTime, endTime, totalTime, timeLeft, timerInterval, isPaused, questions: [], userAnswers: {}, config: {} }
    let questoesDoSimuladoAtual = []; // Array de objetos de questão
    let respostasDoUsuarioAtual = {}; // { qId: userAnswer }

    const motivationalMessages = [
        "Acredite em você! Cada questão é um passo à frente.",
        "Mantenha o foco, a concentração é sua maior aliada.",
        "Você está se preparando para o sucesso. Continue firme!",
        "Grandes conquistas exigem grande dedicação. Você consegue!",
        "Não tenha medo de errar, cada erro é uma oportunidade de aprender.",
        "Seu esforço de hoje moldará seu amanhã. Siga em frente!",
        "A persistência realiza o impossível. Não desista!"
    ];

    // ------------------------------------------------------------------------------------------
    // FUNÇÕES DE INICIALIZAÇÃO E UTILITÁRIAS GERAIS
    // ------------------------------------------------------------------------------------------

    function showSection(sectionElement) {
        [configSimuladoSection, loadingScreen, resolucaoSimuladoSection, revisaoSimuladoSection].forEach(sec => {
            if (sec) sec.style.display = "none";
        });
        if (sectionElement) sectionElement.style.display = "block";
    }

    function showPopup(overlayElement, boxElement) {
        if (overlayElement) overlayElement.classList.add("visible");
    }

    function hidePopup(overlayElement) {
        if (overlayElement) overlayElement.classList.remove("visible");
    }

    function showAlert(message, type = "info", title = "Alerta") { // Simples, pode ser melhorado como na outra página
        // Por enquanto, usando o popup de resumo para alertas gerais, ou criar um específico.
        if (resumoSimuladoPopupOverlay && resumoSimuladoPopupBox && resumoPopupIcon && resumoPopupTitle && resumoPopupContent) {
            resumoPopupIcon.className = `popup-header-icon fas ${type === 'error' ? 'fa-times-circle' : (type === 'success' ? 'fa-check-circle' : 'fa-info-circle')}`;
            resumoPopupTitle.textContent = title;
            resumoPopupContent.innerHTML = message.replace(/\n/g, "<br>");
            revisarSimuladoBtn.style.display = "none"; // Esconder botão de revisar para alertas genéricos
            showPopup(resumoSimuladoPopupOverlay, resumoSimuladoPopupBox);
        } else {
            alert(`${title}: ${message}`);
        }
    }
    
    // ------------------------------------------------------------------------------------------
    // GERENCIAMENTO DE DISCIPLINAS (PARA SIMULADOS)
    // ------------------------------------------------------------------------------------------
    function carregarDisciplinasSimulado() {
        const storedData = localStorage.getItem(DISCIPLINAS_SIMULADO_KEY);
        const disciplinasPadrao = [{ nome: "Matemática" }, { nome: "Português" }, { nome: "História" }, { nome: "Geografia" }, { nome: "Ciências" }, { nome: "Inglês" }, { nome: "Física" }, { nome: "Química" }, { nome: "Biologia" }];
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                if (Array.isArray(parsed) && parsed.every(item => typeof item === "object" && item !== null && typeof item.nome === "string")) {
                    disciplinasSimuladoSalvas = parsed;
                } else {
                    disciplinasSimuladoSalvas = [...disciplinasPadrao];
                    salvarDisciplinasSimulado();
                }
            } catch (e) {
                disciplinasSimuladoSalvas = [...disciplinasPadrao];
                salvarDisciplinasSimulado();
            }
        } else {
            disciplinasSimuladoSalvas = [...disciplinasPadrao];
            salvarDisciplinasSimulado();
        }
        disciplinasSimuladoSalvas.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        populateDisciplinasSimuladoSelect();
        renderizarListaDisciplinasPopupSimulado();
    }

    function salvarDisciplinasSimulado() {
        localStorage.setItem(DISCIPLINAS_SIMULADO_KEY, JSON.stringify(disciplinasSimuladoSalvas));
        populateDisciplinasSimuladoSelect();
        renderizarListaDisciplinasPopupSimulado();
        updateDynamicFormFields(); // Atualiza campos dinâmicos se as disciplinas mudarem
    }

    function populateDisciplinasSimuladoSelect() {
        if (!disciplinasSimuladoSelect) return;
        const selecionadasAnteriormente = Array.from(disciplinasSimuladoSelect.selectedOptions).map(opt => opt.value);
        disciplinasSimuladoSelect.innerHTML = "";
        disciplinasSimuladoSalvas.forEach(d => {
            if ((d.nome || "").trim()) {
                const opt = document.createElement("option");
                opt.value = opt.textContent = d.nome;
                if (selecionadasAnteriormente.includes(d.nome)) {
                    opt.selected = true;
                }
                disciplinasSimuladoSelect.appendChild(opt);
            }
        });
    }

    function renderizarListaDisciplinasPopupSimulado() {
        if (!listaDisciplinasSimuladoExistentes) return;
        listaDisciplinasSimuladoExistentes.innerHTML = "";
        if (disciplinasSimuladoSalvas.length === 0) {
            listaDisciplinasSimuladoExistentes.innerHTML = "<li>Nenhuma disciplina cadastrada.</li>";
            return;
        }
        disciplinasSimuladoSalvas.forEach(d => {
            const li = document.createElement("li");
            const nameSpan = document.createElement("span");
            nameSpan.textContent = d.nome;
            const btn = document.createElement("button");
            btn.className = "remove-disciplina-simulado-btn";
            btn.innerHTML =     spansimulado_script.js
            btn.title = "Remover Disciplina";
            btn.onclick = (e) => { e.stopPropagation(); removerDisciplinaSimulado(d.nome); };
            li.appendChild(nameSpan);
            li.appendChild(btn);
            listaDisciplinasSimuladoExistentes.appendChild(li);
        });
    function adicionarDisciplinaSimulado() {
        console.log("[Simulados] Tentando adicionar disciplina...");
        if (!novaDisciplinaSimuladoInput) {
            console.error("[Simulados] Input novaDisciplinaSimuladoInput não encontrado!");
            return;
        }
        const nome = novaDisciplinaSimuladoInput.value.trim();
        console.log(`[Simulados] Nome da disciplina: ${nome}`);
        if (nome === "") {
            showAlert("O nome da disciplina não pode estar vazio.", "warning", "Entrada Inválida");
            console.warn("[Simulados] Nome da disciplina vazio.");
            return;
        }
        if (disciplinasSimuladoSalvas.some(d => d.nome.toLowerCase() === nome.toLowerCase())) {
            showAlert(`A disciplina \"${nome}\" já existe.`, "warning", "Disciplina Duplicada");
            console.warn(`[Simulados] Disciplina "${nome}" duplicada.`);
            return;
        }
        disciplinasSimuladoSalvas.push({ nome });
        console.log("[Simulados] Disciplina adicionada ao array local:", disciplinasSimuladoSalvas);
        disciplinasSimuladoSalvas.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        salvarDisciplinasSimulado();
        novaDisciplinaSimuladoInput.value = "";
        showAlert(`Disciplina \"${nome}\" adicionada com sucesso!`, "success", "Disciplina Adicionada");
        console.log(`[Simulados] Disciplina "${nome}" processada com sucesso.`);
    }

    function salvarDisciplinasSimulado() {
        console.log("[Simulados] Salvando disciplinas...");
        localStorage.setItem(DISCIPLINAS_SIMULADO_KEY, JSON.stringify(disciplinasSimuladoSalvas));
        console.log("[Simulados] Disciplinas salvas no localStorage.");
        populateDisciplinasSimuladoSelect();
        renderizarListaDisciplinasPopupSimulado();
        updateDynamicFormFields(); // Atualiza campos dinâmicos se as disciplinas mudarem
        console.log("[Simulados] UI de disciplinas atualizada.");
    }(disciplinasSimuladoPopupOverlay, disciplinasSimuladoPopupBox);
        renderizarListaDisciplinasPopupSimulado();
    }

    function hideDisciplinasSimuladoPopup() {
        hidePopup(disciplinasSimuladoPopupOverlay);
        if (disciplinasSimuladoPopupBox) disciplinasSimuladoPopupBox.classList.remove("minimized");
        if (disciplinasSimuladoPopupContentArea) disciplinasSimuladoPopupContentArea.style.display = "block";
    }

    function toggleMinimizeDisciplinasSimuladoPopup() {
        if (disciplinasSimuladoPopupBox && disciplinasSimuladoPopupContentArea && minimizeDisciplinasSimuladoPopup) {
            disciplinasSimuladoPopupBox.classList.toggle("minimized");
            const min = disciplinasSimuladoPopupBox.classList.contains("minimized");
            disciplinasSimuladoPopupContentArea.style.display = min ? "none" : "block";
            minimizeDisciplinasSimuladoPopup.innerHTML = min ?     spansimulado_script.js    spansimulado_script.js;
        }
    }
    
    // Inicialização do Sortable.js para a lista de prioridade
    if (listaPrioridadeDisciplinas) {
        sortablePrioridade = new Sortable(listaPrioridadeDisciplinas, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            handle: '.drag-handle' // Se você adicionar um ícone de arrastar
        });
    }

    // Atualiza campos dinâmicos (assuntos, questões por disciplina, prioridade) baseado nas disciplinas selecionadas
    function updateDynamicFormFields() {
        if (!disciplinasSimuladoSelect || !assuntosPorDisciplinaContainer || !questoesPorDisciplinaContainer || !listaPrioridadeDisciplinas) return;

        const selectedDisciplinas = Array.from(disciplinasSimuladoSelect.selectedOptions).map(opt => opt.value);

        // Limpa containers
        assuntosPorDisciplinaContainer.innerHTML = '<label><i class="fas fa-tasks"></i> Assuntos por Disciplina (informe os tópicos separados por vírgula):</label>';
        questoesPorDisciplinaContainer.innerHTML = '<label><i class="fas fa-divide"></i> Número de Questões por Disciplina (opcional):</label>';
        listaPrioridadeDisciplinas.innerHTML = '';

        if (selectedDisciplinas.length > 0) {
            assuntosPorDisciplinaContainer.style.display = "block";
            questoesPorDisciplinaContainer.style.display = "block";
            listaPrioridadeDisciplinas.style.display = "block";

            selectedDisciplinas.forEach(disciplina => {
                // Campo de Assuntos
                const assuntoGroup = document.createElement('div');
                assuntoGroup.className = 'form-group-dynamic';
                assuntoGroup.innerHTML = `
                    <label for="assunto-${disciplina.replace(/\s+/g, '-')}">${disciplina}:</label>
                    <input type="text" id="assunto-${disciplina.replace(/\s+/g, '-')}" name="assunto_${disciplina}" placeholder="Ex: Revolução Francesa, Equações">
                `;
                assuntosPorDisciplinaContainer.appendChild(assuntoGroup);

                // Campo de Número de Questões
                const numQuestoesGroup = document.createElement('div');
                numQuestoesGroup.className = 'form-group-dynamic';
                numQuestoesGroup.innerHTML = `
                    <label for="numQuestoes-${disciplina.replace(/\s+/g, '-')}">${disciplina}:</label>
                    <input type="number" id="numQuestoes-${disciplina.replace(/\s+/g, '-')}" name="numQuestoes_${disciplina}" min="0" placeholder="Ex: 5">
                `;
                questoesPorDisciplinaContainer.appendChild(numQuestoesGroup);
                
                // Item para Lista de Prioridade
                const prioridadeItem = document.createElement('li');
                prioridadeItem.dataset.disciplina = disciplina;
                prioridadeItem.dataset.id = disciplina; // Set data-id for Sortable.toArray()
                prioridadeItem.innerHTML = `<span class="drag-handle"><i class="fas fa-grip-vertical"></i></span> ${disciplina}`;
                listaPrioridadeDisciplinas.appendChild(prioridadeItem);
            });
        } else {
            assuntosPorDisciplinaContainer.style.display = "none";
            questoesPorDisciplinaContainer.style.display = "none";
            listaPrioridadeDisciplinas.style.display = "none";
        }
    }

    // ------------------------------------------------------------------------------------------
    // LÓGICA DE GERAÇÃO DO SIMULADO
    // ------------------------------------------------------------------------------------------
    async function handleGerarSimulado() {
        // Validação do formulário
        const totalQuestoes = parseInt(numTotalQuestoesInput.value, 10);
        const tempoSimulado = parseInt(tempoSimuladoInput.value, 10);
        const nivelDificuldade = nivelDificuldadeSimuladoSelect.value;
        const disciplinasSelecionadas = Array.from(disciplinasSimuladoSelect.selectedOptions).map(opt => opt.value);

        if (disciplinasSelecionadas.length === 0) {
            showAlert("Selecione pelo menos uma disciplina para o simulado.", "warning", "Configuração Incompleta");
            return;
        }
        if (isNaN(totalQuestoes) || totalQuestoes < 1 || totalQuestoes > 200) { // Max 200 para não sobrecarregar API
            showAlert("O número total de questões deve ser entre 1 e 200.", "warning", "Configuração Inválida");
            return;
        }
        if (isNaN(tempoSimulado) || tempoSimulado < 5) {
            showAlert("O tempo do simulado deve ser de pelo menos 5 minutos.", "warning", "Configuração Inválida");
            return;
        }

        const assuntosPorDisciplina = {};
        const numQuestoesPorDisciplina = {};
        let somaQuestoesPorDisciplina = 0;

        disciplinasSelecionadas.forEach(disc => {
            const assuntoInputEl = document.getElementById(`assunto-${disc.replace(/\s+/g, '-')}`);
            if (assuntoInputEl && assuntoInputEl.value.trim() !== "") {
                assuntosPorDisciplina[disc] = assuntoInputEl.value.trim();
            } else {
                // Se não houver assunto específico, pode-se tratar como "geral" da disciplina ou omitir no prompt
                assuntosPorDisciplina[disc] = "Conteúdo geral da disciplina"; 
            }

            const numQuestoesInputEl = document.getElementById(`numQuestoes-${disc.replace(/\s+/g, '-')}`);
            if (numQuestoesInputEl && numQuestoesInputEl.value.trim() !== "") {
                const num = parseInt(numQuestoesInputEl.value, 10);
                if (!isNaN(num) && num > 0) {
                    numQuestoesPorDisciplina[disc] = num;
                    somaQuestoesPorDisciplina += num;
                }
            }
        });
        
        const ordemPrioridade = (sortablePrioridade && listaPrioridadeDisciplinas.children.length > 0) ? sortablePrioridade.toArray() : [...disciplinasSelecionadas];
        if (ordemPrioridade.length === 0 && disciplinasSelecionadas.length > 0) {
             // Fallback se sortable falhar ou não for usado, usa a ordem de seleção
            ordemPrioridade.push(...disciplinasSelecionadas);
        }

        // Lógica de distribuição de questões se a soma não bater (simplificada por enquanto)
        if (somaQuestoesPorDisciplina > 0 && somaQuestoesPorDisciplina !== totalQuestoes) {
            showAlert(
                `A soma das questões por disciplina (${somaQuestoesPorDisciplina}) não corresponde ao total de questões do simulado (${totalQuestoes}).` +
                ` A distribuição será ajustada automaticamente com base na prioridade ou proporcionalmente.`,
                "warning", "Ajuste de Questões", 6000
            );
            // Aqui entraria a lógica mais complexa de redistribuição baseada na prioridade.
            // Por ora, a API pode tentar gerar o que foi pedido por disciplina e o total pode ser um guia.
        }
        
        currentSimuladoSession = {
            id: `sim-${Date.now()}`,
            startTime: null,
            endTime: null,
            totalTime: tempoSimulado * 60, // em segundos
            timeLeft: tempoSimulado * 60,
            timerInterval: null,
            isPaused: false,
            questions: [],
            userAnswers: {},
            config: {
                totalQuestoes,
                tempoSimulado,
                nivelDificuldade,
                disciplinasSelecionadas,
                assuntosPorDisciplina,
                numQuestoesPorDisciplina,
                ordemPrioridade
            }
        };

        showSection(loadingScreen);
        await iniciarAnimacaoCarregamentoEGerarQuestoesAPI();
    }
    
    let currentMotivationalMessageIndex = 0;
    let loadingIntervalId = null;
    let progressBarValue = 0;

    async function iniciarAnimacaoCarregamentoEGerarQuestoesAPI() {
        if (!loadingScreen || !motivationalMessageLoading || !generationProgressBar) return;

        progressBarValue = 0;
        generationProgressBar.style.width = "0%";
        generationProgressBar.textContent = "0%";
        currentMotivationalMessageIndex = 0;
        motivationalMessageLoading.textContent = motivationalMessages[currentMotivationalMessageIndex];

        // Animação de mensagens e barra de progresso simulada
        let estimatedTimePerQuestion = 3000; // 3 segundos por questão (simulado)
        let totalEstimatedTime = currentSimuladoSession.config.totalQuestoes * estimatedTimePerQuestion;
        let progressIncrement = 100 / (totalEstimatedTime / 1000); // Incremento por segundo

        loadingIntervalId = setInterval(() => {
            currentMotivationalMessageIndex = (currentMotivationalMessageIndex + 1) % motivationalMessages.length;
            motivationalMessageLoading.textContent = motivationalMessages[currentMotivationalMessageIndex];
            
            progressBarValue += progressIncrement;
            if (progressBarValue > 90) progressBarValue = 90; // Não chega a 100% até a API retornar
            generationProgressBar.style.width = `${Math.round(progressBarValue)}%`;
            generationProgressBar.textContent = `${Math.round(progressBarValue)}%`;
        }, 3000); // Muda mensagem a cada 3 segundos

        // TODO: Construir o prompt para a API Gemini
        // Este prompt será mais complexo, precisando instruir a geração para múltiplas disciplinas/assuntos
        // e respeitando o número de questões por disciplina se fornecido, ou o total.
        let prompt = `Gere um simulado com um total de ${currentSimuladoSession.config.totalQuestoes} questões, abrangendo as seguintes disciplinas e assuntos (se especificados):
`;

        currentSimuladoSession.config.ordemPrioridade.forEach(disciplina => {
            prompt += `\n- Disciplina: ${disciplina}`;
            if (currentSimuladoSession.config.assuntosPorDisciplina[disciplina]) {
                prompt += ` (Assuntos: ${currentSimuladoSession.config.assuntosPorDisciplina[disciplina]})`;
            }
            if (currentSimuladoSession.config.numQuestoesPorDisciplina[disciplina]) {
                prompt += ` [${currentSimuladoSession.config.numQuestoesPorDisciplina[disciplina]} questões]`;
            }
        });

        prompt += `\nNível de dificuldade geral: ${currentSimuladoSession.config.nivelDificuldade}.`;
        prompt += `\nAs questões devem ser uma mistura de Múltipla Escolha (com 5 alternativas: A, B, C, D, E) e Verdadeiro/Falso (com alternativas V e F), a menos que o nível seja muito específico.`;
        prompt += `\nFormato OBRIGATÓRIO e ESTRITO para CADA questão: Use [SEP_QUESTAO_SIMULADO] para separar questões. Dentro de cada questão, use as seguintes tags:
[Q_TEXTO] enunciado completo da questão.
[Q_TIPO] MULTIPLA_ESCOLHA ou VERDADEIRO_FALSO
[Q_DISCIPLINA] Nome da disciplina da questão (deve ser uma das fornecidas)
`;
        prompt += `Para Múltipla Escolha:
[A] texto da alternativa A.
[B] texto da alternativa B.
[C] texto da alternativa C.
[D] texto da alternativa D.
[E] texto da alternativa E.
[R_CORRETA] LETRA_CORRETA (apenas a letra, ex: C).
`;
        prompt += `Para Verdadeiro/Falso:
[V] texto para Verdadeiro (pode ser só "Verdadeiro" ou a afirmação em si).
[F] texto para Falso (pode ser só "Falso" ou a afirmação em si).
[R_CORRETA] LETRA_CORRETA (V ou F).
`;
        prompt += `[Q_RESOLUCAO] resolução detalhada e explicativa da questão.
Exemplo:
[SEP_QUESTAO_SIMULADO]
[Q_TEXTO] Qual é a capital da França?
[Q_TIPO] MULTIPLA_ESCOLHA
[Q_DISCIPLINA] Geografia
[A] Londres
[B] Berlim
[C] Paris
[D] Madri
[E] Roma
[R_CORRETA] C
[Q_RESOLUCAO] Paris é a capital e a maior cidade da França.
[SEP_QUESTAO_SIMULADO]
`;
        prompt += `IMPORTANTE: Siga ESTRITAMENTE este formato. TODAS as tags são OBRIGATÓRIAS para cada questão. Use [SEP_QUESTAO_SIMULADO] entre cada bloco de questão. Gere exatamente ${currentSimuladoSession.config.totalQuestoes} questões se possível, distribuindo entre as disciplinas conforme solicitado ou de forma equilibrada se não especificado.`;

        console.log("Prompt para API:", prompt);

        try {
            const reqBody = { 
                contents: [{ parts: [{ text: prompt }] }], 
                generationConfig: { 
                    "temperature": 0.7,
                    "maxOutputTokens": 8000, // Aumentar para simulados maiores
                    "topP": 0.95,
                    "topK": 40 
                },
                safetySettings: [{"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},{"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},{"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},{"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}]
            };
            const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody) });
            
            clearInterval(loadingIntervalId); // Para animação de carregamento
            generationProgressBar.style.width = "100%";
            generationProgressBar.textContent = "100%";

            if (!response.ok) {
                let errTxt = await response.text(); 
                let errBody = {}; try { errBody = JSON.parse(errTxt); } catch (e) {}
                const detailMsg = errBody?.error?.message || `HTTP ${response.status}`;
                throw new Error(`Erro da API Gemini: ${detailMsg}`);
            }
            const data = await response.json();
            if (data.promptFeedback?.blockReason) {
                throw new Error(`Conteúdo bloqueado pela API de segurança (${data.promptFeedback.blockReason}).`);
            }
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error("A API retornou uma resposta vazia ou em formato inesperado.");
            }
            const rawTxt = data.candidates[0].content.parts[0].text;
            questoesDoSimuladoAtual = parseQuestoesSimuladoAPI(rawTxt);

            if (questoesDoSimuladoAtual.length === 0) {
                throw new Error("Nenhuma questão válida foi processada a partir da resposta da API.");
            }
            currentSimuladoSession.questions = [...questoesDoSimuladoAtual];
            iniciarSimulado();

        } catch (error) {
            clearInterval(loadingIntervalId);
            showSection(configSimuladoSection);
            showAlert(`Erro ao gerar simulado: ${error.message}`, "error", "Falha na Geração");
            console.error("Erro API Simulado:", error);
        }
    }

    function parseQuestoesSimuladoAPI(text) {
        const questionsArray = [];
        const questionBlocks = text.trim().split(/\s*\[SEP_QUESTAO_SIMULADO\]\s*/i).filter(block => block.trim() !== "");

        questionBlocks.forEach((block, index) => {
            try {
                const qData = { 
                    id: `sim-q-${currentSimuladoSession.id}-${index}`,
                    texto: "", 
                    tipo: "", 
                    disciplina: "",
                    opcoes: {}, 
                    respostaCorreta: "", 
                    resolucao: ""
                };

                const textoMatch = block.match(/\[Q_TEXTO\]([\s\S]*?)(?:\[Q_TIPO\]|$)/i);
                if (textoMatch && textoMatch[1]) qData.texto = textoMatch[1].trim();
                else throw new Error("Tag [Q_TEXTO] não encontrada ou vazia.");

                const tipoMatch = block.match(/\[Q_TIPO\](MULTIPLA_ESCOLHA|VERDADEIRO_FALSO)(?:\[Q_DISCIPLINA\]|$)/i);
                if (tipoMatch && tipoMatch[1]) qData.tipo = tipoMatch[1].trim();
                else throw new Error("Tag [Q_TIPO] não encontrada ou inválida.");
                
                const disciplinaMatch = block.match(/\[Q_DISCIPLINA\]([\s\S]*?)(?:\[A\]|\[V\]|\[R_CORRETA\]|$)/i);
                if (disciplinaMatch && disciplinaMatch[1]) qData.disciplina = disciplinaMatch[1].trim();
                else throw new Error("Tag [Q_DISCIPLINA] não encontrada ou vazia.");

                const resolucaoMatch = block.match(/\[Q_RESOLUCAO\]([\s\S]*?)$/i);
                if (resolucaoMatch && resolucaoMatch[1]) qData.resolucao = resolucaoMatch[1].trim();
                else throw new Error("Tag [Q_RESOLUCAO] não encontrada ou vazia.");

                const respostaCorretaMatch = block.match(/\[R_CORRETA\](.+?)(?:\[Q_RESOLUCAO\]|$)/i);
                if (respostaCorretaMatch && respostaCorretaMatch[1]) qData.respostaCorreta = respostaCorretaMatch[1].trim();
                else throw new Error("Tag [R_CORRETA] não encontrada ou vazia.");

                if (qData.tipo === "MULTIPLA_ESCOLHA") {
                    ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
                        const optRegex = new RegExp(`\s*\[${opt}\](.*?)(?:\[[A-Z]\]|\[R_CORRETA\]|$)`, "is");
                        const optMatch = block.match(optRegex);
                        if (optMatch && optMatch[1]) qData.opcoes[opt] = optMatch[1].trim(); 
                        else throw new Error(`Opção [${opt}] não encontrada para questão de múltipla escolha.`);
                    });
                    if (!['A', 'B', 'C', 'D', 'E'].includes(qData.respostaCorreta.toUpperCase())) throw new Error(`Resposta correta "${qData.respostaCorreta}" inválida para múltipla escolha.`);
                     qData.respostaCorreta = qData.respostaCorreta.toUpperCase();
                } else if (qData.tipo === "VERDADEIRO_FALSO") {
                    const vMatch = block.match(/\[V\](.*?)(?:\[F\]|\[R_CORRETA\]|$)/is);
                    if (vMatch && vMatch[1]) qData.opcoes["V"] = vMatch[1].trim() || "Verdadeiro";
                    else throw new Error("Opção [V] não encontrada para questão Verdadeiro/Falso.");

                    const fMatch = block.match(/\[F\](.*?)(?:\[R_CORRETA\]|$)/is);
                    if (fMatch && fMatch[1]) qData.opcoes["F"] = fMatch[1].trim() || "Falso";
                    else throw new Error("Opção [F] não encontrada para questão Verdadeiro/Falso.");
                    
                    if (!['V', 'F'].includes(qData.respostaCorreta.toUpperCase())) throw new Error(`Resposta correta "${qData.respostaCorreta}" inválida para Verdadeiro/Falso.`);
                    qData.respostaCorreta = qData.respostaCorreta.toUpperCase();
                }
                questionsArray.push(qData);
            } catch (error) {
                console.warn(`Erro ao processar bloco de questão ${index + 1}: ${error.message}. Bloco:`, block.substring(0, 200));
                // Opcional: Adicionar uma questão de erro ao array para feedback
                questionsArray.push({ id: `sim-q-error-${Date.now()}-${index}`, texto: `Erro ao processar esta questão: ${error.message}`, tipo: "ERROR", disciplina: "N/A" });
            }
        });
        return questionsArray.filter(q => q.tipo !== "ERROR"); // Filtra questões que falharam no parse
    }

    // ------------------------------------------------------------------------------------------
    // LÓGICA DE RESOLUÇÃO DO SIMULADO (TIMER, PAINEL, ETC.)
    // ------------------------------------------------------------------------------------------
    function iniciarSimulado() {
        if (!currentSimuladoSession || questoesDoSimuladoAtual.length === 0) {
            showAlert("Não foi possível iniciar o simulado. Nenhuma questão carregada.", "error", "Erro ao Iniciar");
            showSection(configSimuladoSection);
            return;
        }
        showSection(resolucaoSimuladoSection);
        if (floatingControlPanel) floatingControlPanel.style.display = "flex";
        if (simuladoTitulo) simuladoTitulo.textContent = `Simulado: ${currentSimuladoSession.config.disciplinasSelecionadas.join(', ')} - ${currentSimuladoSession.config.totalQuestoes} Questões`;
        
        renderizarQuestoesSimulado();
        currentSimuladoSession.startTime = Date.now();
        currentSimuladoSession.isPaused = false;
        iniciarTimer();
        atualizarProgressoPainel();
        if(pausarRetomarSimuladoBtn) pausarRetomarSimuladoBtn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
    }

    function renderizarQuestoesSimulado() {
        if (!questoesSimuladoOutput) return;
        questoesSimuladoOutput.innerHTML = "";
        questoesDoSimuladoAtual.forEach((qData, index) => {
            const qItem = document.createElement("div");
            qItem.className = "question-item-simulado";
            qItem.id = qData.id;
            
            let htmlInterno = `<p class="question-text-simulado"><strong>${index + 1}. (${qData.disciplina})</strong> ${qData.texto.replace(/\n/g, "<br>")}</p>`;
            htmlInterno += `<div class="options-container-simulado" data-question-id="${qData.id}">`;

            if (qData.tipo === "MULTIPLA_ESCOLHA") {
                ['A', 'B', 'C', 'D', 'E'].forEach(optKey => {
                    if (qData.opcoes[optKey]) {
                        htmlInterno += `<button data-value="${optKey}">${optKey}) ${qData.opcoes[optKey]}</button>`;
                    }
                });
            } else if (qData.tipo === "VERDADEIRO_FALSO") {
                htmlInterno += `<button data-value="V">${qData.opcoes["V"] || 'Verdadeiro'}</button>`;
                htmlInterno += `<button data-value="F">${qData.opcoes["F"] || 'Falso'}</button>`;
            }
            htmlInterno += `</div>`;
            qItem.innerHTML = htmlInterno;
            questoesSimuladoOutput.appendChild(qItem);
        });
    }

    function handleSelecaoOpcaoSimulado(event) {
        const targetButton = event.target.closest('button');
        if (!targetButton || !currentSimuladoSession || currentSimuladoSession.isPaused) return;

        const optionsContainer = targetButton.parentElement;
        const questionId = optionsContainer.dataset.questionId;
        const userAnswer = targetButton.dataset.value;

        // Remove seleção anterior na mesma questão
        Array.from(optionsContainer.children).forEach(btn => btn.classList.remove('selected'));
        targetButton.classList.add('selected');
        respostasDoUsuarioAtual[questionId] = userAnswer;
        atualizarProgressoPainel();
    }

    function iniciarTimer() {
        if (currentSimuladoSession.timerInterval) clearInterval(currentSimuladoSession.timerInterval);
        currentSimuladoSession.timerInterval = setInterval(() => {
            if (currentSimuladoSession.isPaused) return;
            currentSimuladoSession.timeLeft--;
            if (tempoRestanteSpan) {
                const mins = Math.floor(currentSimuladoSession.timeLeft / 60);
                const secs = currentSimuladoSession.timeLeft % 60;
                tempoRestanteSpan.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
            if (currentSimuladoSession.timeLeft <= 0) {
                finalizarSimuladoPorTempo();
            }
        }, 1000);
    }

    function pausarRetomarTimer() {
        if (!currentSimuladoSession) return;
        currentSimuladoSession.isPaused = !currentSimuladoSession.isPaused;
        if (pausarRetomarSimuladoBtn) {
            pausarRetomarSimuladoBtn.innerHTML = currentSimuladoSession.isPaused ?     spansimulado_script.js    spansimulado_script.js;
        }
    }

    function atualizarProgressoPainel() {
        if (!currentSimuladoSession || !questoesRespondidasProgresso || !totalQuestoesProgresso || !porcentagemProgresso) return;
        const respondidas = Object.keys(respostasDoUsuarioAtual).length;
        const total = questoesDoSimuladoAtual.length;
        const perc = total > 0 ? Math.round((respondidas / total) * 100) : 0;

        questoesRespondidasProgresso.textContent = respondidas;
        totalQuestoesProgresso.textContent = total;
        porcentagemProgresso.textContent = perc;
    }

    function togglePainelControle() {
        if (panelContent) {
            panelContent.classList.toggle('open');
            togglePainelBtn.innerHTML = panelContent.classList.contains('open') ?     spansimulado_script.js    spansimulado_script.js;
        }
    }
    
    function finalizarSimuladoPorTempo() {
        if (currentSimuladoSession.timerInterval) clearInterval(currentSimuladoSession.timerInterval);
        showAlert("Tempo esgotado! O simulado foi finalizado automaticamente.", "warning", "Tempo Esgotado!");
        processarFinalizacaoSimulado();
    }

    function handleFinalizarSimuladoUsuario() {
        if (!currentSimuladoSession) return;
        const naoRespondidas = currentSimuladoSession.questions.length - Object.keys(respostasDoUsuarioAtual).length;
        let confirmMsg = "Deseja realmente finalizar o simulado?";
        if (naoRespondidas > 0) {
            confirmMsg += `\nVocê ainda tem ${naoRespondidas} questão(ões) não respondida(s).`;
        }
        if (confirm(confirmMsg)) {
            if (currentSimuladoSession.timerInterval) clearInterval(currentSimuladoSession.timerInterval);
            processarFinalizacaoSimulado();
        }
    }

    function processarFinalizacaoSimulado() {
        if (!currentSimuladoSession) return;
        currentSimuladoSession.endTime = Date.now();
        currentSimuladoSession.userAnswers = { ...respostasDoUsuarioAtual };
        
        // Calcular acertos
        let acertos = 0;
        currentSimuladoSession.questions.forEach(q => {
            if (currentSimuladoSession.userAnswers[q.id] === q.respostaCorreta) {
                acertos++;
            }
        });
        currentSimuladoSession.acertos = acertos;

        // Salvar no localStorage
        try {
            const sessoesSalvas = JSON.parse(localStorage.getItem(SIMULADO_SESSIONS_KEY) || "[]");
            sessoesSalvas.push(currentSimuladoSession);
            localStorage.setItem(SIMULADO_SESSIONS_KEY, JSON.stringify(sessoesSalvas));
        } catch (e) {
            console.error("Erro ao salvar sessão do simulado:", e);
        }

        // Mostrar popup de resumo
        if (resumoSimuladoPopupOverlay && resumoSimuladoPopupBox && resumoPopupIcon && resumoPopupTitle && resumoPopupContent) {
            resumoPopupIcon.className = "popup-header-icon fas fa-clipboard-check";
            resumoPopupTitle.textContent = "Simulado Finalizado!";
            const totalQ = currentSimuladoSession.questions.length;
            const percAcerto = totalQ > 0 ? ((acertos / totalQ) * 100).toFixed(1) : 0;
            const tempoGastoMs = currentSimuladoSession.endTime - currentSimuladoSession.startTime;
            const tempoGastoSec = Math.floor(tempoGastoMs / 1000);
            const minsGastos = Math.floor(tempoGastoSec / 60);
            const secsGastos = tempoGastoSec % 60;

            resumoPopupContent.innerHTML = 
                `<strong>Total de Questões:</strong> ${totalQ}<br>
                 <strong>Questões Respondidas:</strong> ${Object.keys(currentSimuladoSession.userAnswers).length}<br>
                 <strong>Acertos:</strong> ${acertos} (${percAcerto}%)<br>
                 <strong>Tempo Gasto:</strong> ${minsGastos}m ${secsGastos}s`;
            revisarSimuladoBtn.style.display = "inline-flex";
            showPopup(resumoSimuladoPopupOverlay, resumoSimuladoPopupBox);
        }
        
        showSection(configSimuladoSection); // Volta para config após finalizar
        if (floatingControlPanel) floatingControlPanel.style.display = "none";
        if (panelContent && panelContent.classList.contains('open')) togglePainelControle(); // Fecha painel se aberto
        respostasDoUsuarioAtual = {}; // Limpa para próxima sessão
    }

    // ------------------------------------------------------------------------------------------
    // LÓGICA DE REVISÃO DO SIMULADO (GABARITO)
    // ------------------------------------------------------------------------------------------
    function mostrarRevisaoGabarito() {
        if (!currentSimuladoSession || !currentSimuladoSession.questions || currentSimuladoSession.questions.length === 0) {
            showAlert("Nenhum simulado para revisar.", "info", "Sem Dados");
            return;
        }
        hidePopup(resumoSimuladoPopupOverlay);
        showSection(revisaoSimuladoSection);
        if (!gabaritoSimuladoOutput) return;
        gabaritoSimuladoOutput.innerHTML = "";

        currentSimuladoSession.questions.forEach((qData, index) => {
            const qItem = document.createElement("div");
            qItem.className = "question-item-simulado";
            const userAnswer = currentSimuladoSession.userAnswers[qData.id];
            const isCorrect = userAnswer === qData.respostaCorreta;

            if (userAnswer) {
                qItem.classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');
            } else {
                qItem.classList.add('not-answered'); // Adicionar estilo para não respondida se desejar
            }
            
            let htmlInterno = `<p class="question-text-simulado"><strong>${index + 1}. (${qData.disciplina})</strong> ${qData.texto.replace(/\n/g, "<br>")}</p>`;
            htmlInterno += `<div class="options-container-simulado">`;

            const opcoesChaves = qData.tipo === "MULTIPLA_ESCOLHA" ? ['A', 'B', 'C', 'D', 'E'] : ['V', 'F'];
            opcoesChaves.forEach(optKey => {
                if (qData.opcoes[optKey]) {
                    let btnClass = "";
                    if (userAnswer === optKey) btnClass += " user-selected";
                    if (qData.respostaCorreta === optKey) btnClass += " correct-option";
                    const optText = qData.tipo === "MULTIPLA_ESCOLHA" ? `${optKey}) ${qData.opcoes[optKey]}` : qData.opcoes[optKey];
                    htmlInterno += `<button class="${btnClass}" disabled>${optText}</button>`;
                }
            });
            htmlInterno += `</div>`;
            if (qData.resolucao) {
                htmlInterno += `<div class="resolution-area-simulado"><strong>Resolução:</strong><br>${qData.resolucao.replace(/\n/g, "<br>")}</div>`;
            }
            qItem.innerHTML = htmlInterno;
            gabaritoSimuladoOutput.appendChild(qItem);
        });
    }


    // ------------------------------------------------------------------------------------------
    // EVENT LISTENERS
    // ------------------------------------------------------------------------------------------
    if (gerenciarDisciplinasSimuladoBtn) gerenciarDisciplinasSimuladoBtn.addEventListener("click", showDisciplinasSimuladoPopup);
    if (closeDisciplinasSimuladoPopup) closeDisciplinasSimuladoPopup.addEventListener("click", hideDisciplinasSimuladoPopup);
    if (minimizeDisciplinasSimuladoPopup) minimizeDisciplinasSimuladoPopup.addEventListener("click", toggleMinimizeDisciplinasSimuladoPopup);
    if (addDisciplinaSimuladoButton) addDisciplinaSimuladoButton.addEventListener("click", adicionarDisciplinaSimulado);
    if (disciplinasSimuladoPopupOverlay) disciplinasSimuladoPopupOverlay.addEventListener("click", (e) => { if (e.target === disciplinasSimuladoPopupOverlay) hideDisciplinasSimuladoPopup(); });
    if (disciplinasSimuladoSelect) disciplinasSimuladoSelect.addEventListener("change", updateDynamicFormFields);
    if (gerarSimuladoButton) gerarSimuladoButton.addEventListener("click", handleGerarSimulado);
    if (questoesSimuladoOutput) questoesSimuladoOutput.addEventListener("click", handleSelecaoOpcaoSimulado);
    if (togglePainelBtn) togglePainelBtn.addEventListener("click", togglePainelControle);
    if (pausarRetomarSimuladoBtn) pausarRetomarSimuladoBtn.addEventListener("click", pausarRetomarTimer);
    if (finalizarSimuladoBtn) finalizarSimuladoBtn.addEventListener("click", handleFinalizarSimuladoUsuario);
    if (finalizarSimuladoPainelBtn) finalizarSimuladoPainelBtn.addEventListener("click", handleFinalizarSimuladoUsuario);
    if (fecharResumoSimuladoBtn) fecharResumoSimuladoBtn.addEventListener("click", () => hidePopup(resumoSimuladoPopupOverlay));
    if (revisarSimuladoBtn) revisarSimuladoBtn.addEventListener("click", mostrarRevisaoGabarito);
    if (voltarParaConfigSimuladoBtn) voltarParaConfigSimuladoBtn.addEventListener("click", () => showSection(configSimuladoSection));

    // ------------------------------------------------------------------------------------------
    // INICIALIZAÇÃO
    // ------------------------------------------------------------------------------------------
    carregarDisciplinasSimulado();
    updateDynamicFormFields(); // Para o caso de haver disciplinas pré-selecionadas ou padrão
    showSection(configSimuladoSection);
    if (floatingControlPanel) floatingControlPanel.style.display = "none"; // Começa oculto

    // Adiciona ícones aos botões de controle dos popups
    if(minimizeDisciplinasSimuladoPopup) minimizeDisciplinasSimuladoPopup.innerHTML =     spansimulado_script.js    spansimulado_script.js;
    if(closeDisciplinasSimuladoPopup) closeDisciplinasSimuladoPopup.innerHTML =     spansimulado_script.js    spansimulado_script.js;

});