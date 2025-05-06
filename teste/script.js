document.addEventListener("DOMContentLoaded", () => {
    // === Elementos do DOM ===
    const assuntoInput = document.getElementById("assuntoInput");
    const disciplinaSelect = document.getElementById("disciplinaSelect");
    const numQuestoesInput = document.getElementById("numQuestoesInput");
    const tipoQuestaoSelect = document.getElementById("tipoQuestaoSelect");
    const nivelQuestaoSelect = document.getElementById("nivelQuestaoSelect");
    const generateButton = document.getElementById("generateButton");
    const questoesOutput = document.getElementById("questoesOutput");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const finalizeButton = document.getElementById("finalizeButton");
    const questoesSection = document.querySelector(".questoes-section");

    // === Elementos do Popup Principal (Atualizado) ===
    const popupOverlay = document.getElementById("popupOverlay");
    const popupMessageBox = document.getElementById("popupMessageBox");
    const popupIcon = document.getElementById("popupIcon"); 
    const popupTitle = document.getElementById("popupTitle"); 
    const popupContent = document.getElementById("popupContent");
    const popupCloseButton = document.getElementById("popupCloseButton");

    // === Elementos do Popup de Gerenciamento de Disciplinas ===
    const manageDisciplinasButton = document.getElementById("manageDisciplinasButton");
    const disciplinasPopupOverlay = document.getElementById("disciplinasPopupOverlay");
    const disciplinasPopupBox = document.getElementById("disciplinasPopupBox");
    const disciplinasPopupTitleEl = document.getElementById("disciplinasPopupTitle"); 
    const minimizeDisciplinasPopup = document.getElementById("minimizeDisciplinasPopup");
    const closeDisciplinasPopup = document.getElementById("closeDisciplinasPopup");
    const disciplinasPopupContentArea = document.getElementById("disciplinasPopupContent");
    const novaDisciplinaInput = document.getElementById("novaDisciplinaInput");
    const addDisciplinaButton = document.getElementById("addDisciplinaButton");
    const listaDisciplinasExistentes = document.getElementById("listaDisciplinasExistentes");

    // === Elementos do Popup de Progresso (Novo) ===
    const openProgressPopupButton = document.getElementById("openProgressPopup");
    const progressPopupOverlay = document.getElementById("progressPopupOverlay");
    const progressPopupBox = document.getElementById("progressPopupBox");
    const progressPopupTitleEl = document.getElementById("progressPopupTitle");
    const minimizeProgressPopup = document.getElementById("minimizeProgressPopup");
    const closeProgressPopup = document.getElementById("closeProgressPopup");
    const progressPopupContentArea = document.getElementById("progressPopupContent");
    const historicoOutputPopup = document.getElementById("historicoOutputPopup");
    const conquistasOutputPopup = document.getElementById("conquistasOutputPopup");

    // === Elementos da Revisão Detalhada ===
    const revisarTentativaButton = document.getElementById("revisarTentativaButton");
    const revisaoDetalhadaSection = document.getElementById("revisaoDetalhadaSection");
    const revisaoOutput = document.getElementById("revisaoOutput");
    const fecharRevisaoButton = document.getElementById("fecharRevisaoButton");
    const exportToPDFButton = document.getElementById("exportToPDFButton"); 

    // === Configuração da API ===
    const GEMINI_API_KEY = "AIzaSyDfmegc9Aue6YlTphmcVV0p_I9rgsKVXKs"; // Substitua pela sua chave real
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

    // === Chaves do LocalStorage ===
    const RESULTS_STORAGE_KEY = "sessoesEstudo";
    const DISCIPLINAS_STORAGE_KEY = "disciplinas";
    const ACHIEVEMENTS_STORAGE_KEY = "conquistasUsuario";

    // --- Variáveis Globais ---
    let currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, assunto: null, nivel: null, tipo: null, startTime: null, endTime: null, userAnswers: {} };
    let questionsDataStore = {}; 
    let lastSessionDataForPDF = { stats: null, questions: {}, userAnswers: {} }; 
    let popupTimeoutId = null;
    let disciplinasSalvas = [];
    let unlockedAchievements = [];

    const ALL_ACHIEVEMENTS = {
        "PRIMEIRA_SESSAO": { id: "PRIMEIRA_SESSAO", nome: "Primeiros Passos", descricao: "Complete sua primeira sessão de estudos.", icon: "fas fa-shoe-prints", unlocked: false },
        "DEZ_SESSOES": { id: "DEZ_SESSOES", nome: "Estudante Dedicado", descricao: "Complete 10 sessões de estudos.", icon: "fas fa-graduation-cap", unlocked: false },
        "PERFEICAO_TOTAL": { id: "PERFEICAO_TOTAL", nome: "Mestre da Matéria", descricao: "Acerte 100% das questões em uma sessão com pelo menos 5 questões.", icon: "fas fa-trophy", unlocked: false },
        "CINQUENTA_QUESTOES": { id: "CINQUENTA_QUESTOES", nome: "Maratonista do Saber", descricao: "Responda um total de 50 questões.", icon: "fas fa-running", unlocked: false },
        "CEM_QUESTOES": { id: "CEM_QUESTOES", nome: "Centurião do Conhecimento", descricao: "Responda um total de 100 questões.", icon: "fas fa-shield-alt", unlocked: false },
        "EXPLORADOR_DISCIPLINAS": {id: "EXPLORADOR_DISCIPLINAS", nome: "Explorador de Horizontes", descricao: "Complete sessões em 3 disciplinas diferentes.", icon: "fas fa-map-signs", unlocked: false}
    };

    // === Funções Auxiliares de UI ===
    function showLoading(isLoading) {
        hidePopup(); hideDisciplinasPopup(); hideProgressPopup();
        loadingIndicator.innerHTML = isLoading ? 
            '<i class="fas fa-spinner fa-spin"></i> Gerando...' : 
            'Gerando...';
        loadingIndicator.style.display = isLoading ? "inline-block" : "none";
        if(generateButton) generateButton.disabled = isLoading;
        if(manageDisciplinasButton) manageDisciplinasButton.disabled = isLoading;
        if(openProgressPopupButton) openProgressPopupButton.disabled = isLoading;
        if(exportToPDFButton) exportToPDFButton.disabled = isLoading; 
    }

    function resetSessionState() {
        currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, assunto: null, nivel: null, tipo: null, startTime: null, endTime: null, userAnswers: {} };
        if(finalizeButton) finalizeButton.style.display = "none";
        if(revisarTentativaButton) revisarTentativaButton.style.display = "none"; 
        questionsDataStore = {}; 
    }

    function clearOutput() {
        if(questoesOutput) questoesOutput.innerHTML = "";
        hidePopup();
    }

    // === Funções do Popup Principal de Mensagens ===
    function showPopup(message, type = "info", title = null, autoCloseDelay = null) {
        if (!popupOverlay || !popupMessageBox || !popupContent || !popupIcon || !popupTitle) {
            console.error("Elementos essenciais do Popup de Mensagens não foram encontrados no DOM.");
            alert((title ? title + "\n" : "") + message); 
            return;
        }
        if (popupTimeoutId) clearTimeout(popupTimeoutId);
        let iconClass = "fas fa-info-circle";
        let defaultTitle = "Informação";
        switch (type) {
            case "success": iconClass = "fas fa-check-circle"; defaultTitle = "Sucesso!"; break;
            case "error": iconClass = "fas fa-times-circle"; defaultTitle = "Erro!"; break;
            case "warning": iconClass = "fas fa-exclamation-triangle"; defaultTitle = "Atenção!"; break;
            case "summary": iconClass = "fas fa-poll"; defaultTitle = "Resumo da Sessão"; type = "info"; break;
        }
        popupIcon.className = `popup-header-icon ${type} ${iconClass}`;
        popupTitle.textContent = title || defaultTitle;
        popupContent.innerHTML = message.replace(/\n/g, "<br>");
        popupMessageBox.className = "popup-message-box"; 
        setTimeout(() => { popupMessageBox.classList.add(type); }, 10);
        popupOverlay.classList.add("visible");
        if (autoCloseDelay) popupTimeoutId = setTimeout(hidePopup, autoCloseDelay);
    }
    function hidePopup() { if (popupTimeoutId) clearTimeout(popupTimeoutId); if (popupOverlay) popupOverlay.classList.remove("visible"); }
    function showError(message) { if(questoesOutput) questoesOutput.innerHTML = ""; showPopup(message, "error", "Falha na Operação"); resetSessionState(); showLoading(false); }

    // === Funções de Gerenciamento de Disciplinas (Revisado) ===
    function carregarDisciplinas() {
        const storedData = localStorage.getItem(DISCIPLINAS_STORAGE_KEY);
        const disciplinasPadrao = [{ nome: "História" }, { nome: "Matemática" }, { nome: "Ciências" }, { nome: "Geografia" }, { nome: "Português"}, { nome: "Inglês"}];
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                if (Array.isArray(parsed) && parsed.every(item => typeof item === "object" && item !== null && typeof item.nome === "string")) disciplinasSalvas = parsed;
                else { disciplinasSalvas = [...disciplinasPadrao]; salvarDisciplinas(); }
            } catch (e) { disciplinasSalvas = [...disciplinasPadrao]; salvarDisciplinas(); }
        } else { disciplinasSalvas = [...disciplinasPadrao]; salvarDisciplinas(); }
        disciplinasSalvas.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        renderizarListaDisciplinasPopup(); populateDisciplinaDropdown();
    }
    function salvarDisciplinas() { localStorage.setItem(DISCIPLINAS_STORAGE_KEY, JSON.stringify(disciplinasSalvas)); populateDisciplinaDropdown(); renderizarListaDisciplinasPopup(); }
    function renderizarListaDisciplinasPopup() {
        if (!listaDisciplinasExistentes) return;
        listaDisciplinasExistentes.innerHTML = "";
        if (disciplinasSalvas.length === 0) { listaDisciplinasExistentes.innerHTML = "<li>Nenhuma disciplina cadastrada.</li>"; return; }
        disciplinasSalvas.forEach(d => {
            const li = document.createElement("li"); 
            const nameSpan = document.createElement("span"); nameSpan.textContent = d.nome;
            const btn = document.createElement("button"); btn.className = "remove-disciplina-btn"; btn.innerHTML = '<i class="fas fa-trash-alt"></i>'; btn.title = "Remover Disciplina";
            btn.onclick = (e) => { e.stopPropagation(); removerDisciplina(d.nome); }; // Adicionado stopPropagation
            li.appendChild(nameSpan); li.appendChild(btn); listaDisciplinasExistentes.appendChild(li);
        });
    }
    function adicionarDisciplina() {
        if (!novaDisciplinaInput) return;
        const nome = novaDisciplinaInput.value.trim();
        if (nome === "") { showPopup("O nome da disciplina não pode estar vazio.", "warning", "Entrada Inválida", 3000); return; }
        if (disciplinasSalvas.some(d => d.nome.toLowerCase() === nome.toLowerCase())) { showPopup(`A disciplina "${nome}" já existe.`, "warning", "Disciplina Duplicada", 3000); return; }
        disciplinasSalvas.push({ nome }); disciplinasSalvas.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        salvarDisciplinas(); novaDisciplinaInput.value = ""; showPopup(`Disciplina "${nome}" adicionada com sucesso!`, "success", "Disciplina Adicionada", 2000);
    }
    function removerDisciplina(nome) { disciplinasSalvas = disciplinasSalvas.filter(d => d.nome !== nome); salvarDisciplinas(); showPopup(`Disciplina "${nome}" removida.`, "info", "Disciplina Removida", 2000); }
    function showDisciplinasPopup() { if (disciplinasPopupOverlay) { disciplinasPopupOverlay.classList.add("visible"); renderizarListaDisciplinasPopup(); } }
    function hideDisciplinasPopup() { if (disciplinasPopupOverlay) disciplinasPopupOverlay.classList.remove("visible"); if (disciplinasPopupBox) disciplinasPopupBox.classList.remove("minimized"); if (disciplinasPopupContentArea) disciplinasPopupContentArea.style.display = "block"; if (disciplinasPopupTitleEl) disciplinasPopupTitleEl.style.display = "block"; }
    function toggleMinimizeDisciplinasPopup() { if (disciplinasPopupBox && disciplinasPopupContentArea && disciplinasPopupTitleEl && minimizeDisciplinasPopup) { disciplinasPopupBox.classList.toggle("minimized"); const min = disciplinasPopupBox.classList.contains("minimized"); disciplinasPopupContentArea.style.display = min ? "none" : "block"; minimizeDisciplinasPopup.innerHTML = min ? '<i class="fas fa-plus"></i>' : '<i class="fas fa-minus"></i>'; } }
    
    // === Funções do Popup de Progresso (Novo) ===
    function showProgressPopup() { if (progressPopupOverlay) { progressPopupOverlay.classList.add("visible"); loadAndDisplayHistorico(true); loadAndDisplayConquistas(true); const defaultTab = progressPopupOverlay.querySelector(".tabs .tab-button.active"); if(defaultTab) defaultTab.click(); } }
    function hideProgressPopup() { if (progressPopupOverlay) progressPopupOverlay.classList.remove("visible"); if (progressPopupBox) progressPopupBox.classList.remove("minimized"); if (progressPopupContentArea) progressPopupContentArea.style.display = "block"; if (progressPopupTitleEl) progressPopupTitleEl.style.display = "block"; }
    function toggleMinimizeProgressPopup() { if (progressPopupBox && progressPopupContentArea && progressPopupTitleEl && minimizeProgressPopup) { progressPopupBox.classList.toggle("minimized"); const min = progressPopupBox.classList.contains("minimized"); progressPopupContentArea.style.display = min ? "none" : "block"; minimizeProgressPopup.innerHTML = min ? '<i class="fas fa-plus"></i>' : '<i class="fas fa-minus"></i>'; } }

    // Disciplina Opcional: Ajuste no populate e na geração do prompt
    function populateDisciplinaDropdown() {
        if (!disciplinaSelect) return;
        const valAnt = disciplinaSelect.value;
        disciplinaSelect.innerHTML = 
            '<option value="">-- Opcional: Selecione uma Disciplina --</option>' + // Alterado para indicar opcionalidade
            '<option value="Geral">Geral (Nenhuma específica)</option>';
        disciplinasSalvas.forEach(d => { if ((d.nome||"").trim()){ const opt = document.createElement("option"); opt.value = opt.textContent = d.nome; disciplinaSelect.appendChild(opt); }});
        if (disciplinasSalvas.some(d => d.nome === valAnt) || valAnt === "Geral") disciplinaSelect.value = valAnt;
        else disciplinaSelect.value = ""; // Default para opcional
    }

    // === Funções de Sessão de Estudo e Revisão ===
    function saveSessionSummary() {
        if (!currentSessionStats.id || currentSessionStats.totalQuestions === 0) return;
        currentSessionStats.endTime = Date.now();
        const durationMs = currentSessionStats.endTime - currentSessionStats.startTime;
        const sessionDataToSave = { id: currentSessionStats.id, timestamp: new Date().toISOString(), assunto: currentSessionStats.assunto, disciplina: currentSessionStats.disciplina, nivel: currentSessionStats.nivel, tipo: currentSessionStats.tipo, totalQuestions: currentSessionStats.totalQuestions, answeredCount: currentSessionStats.answeredCount, correctCount: currentSessionStats.correctCount, durationMs: durationMs, userAnswers: { ...currentSessionStats.userAnswers }, questions: { ...questionsDataStore } };
        lastSessionDataForPDF = { stats: { ...sessionDataToSave }, questions: { ...sessionDataToSave.questions }, userAnswers: { ...sessionDataToSave.userAnswers } };
        const summaryForStorageArray = { ...sessionDataToSave };
        delete summaryForStorageArray.questions; delete summaryForStorageArray.userAnswers;
        try {
            const existingSummaries = JSON.parse(localStorage.getItem(RESULTS_STORAGE_KEY) || "[]");
            if (!Array.isArray(existingSummaries)) throw new Error("Formato localStorage inválido");
            const index = existingSummaries.findIndex(s => s.id === summaryForStorageArray.id);
            if (index === -1) existingSummaries.push(summaryForStorageArray); else existingSummaries[index] = summaryForStorageArray;
            localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(existingSummaries));
            checkAndUnlockAchievements(sessionDataToSave, existingSummaries);
        } catch (e) { showError("Erro ao salvar o resumo da sessão: " + e.message); }
    }

    function finalizeSession(showSummaryPopup = true) {
        if (currentSessionStats.totalQuestions === 0 || !currentSessionStats.id) return;
        saveSessionSummary(); 
        if (showSummaryPopup) {
            const { totalQuestions, correctCount, answeredCount, startTime, endTime, disciplina, assunto } = currentSessionStats;
            const durationMs = endTime - startTime;
            const durSec = Math.floor(durationMs / 1000); const mins = Math.floor(durSec / 60); const secs = durSec % 60;
            const perc = answeredCount > 0 ? ((correctCount / answeredCount) * 100).toFixed(1) : 0;
            let msg = `<strong>Disciplina:</strong> ${disciplina || "N/A"}\n<strong>Assunto:</strong> ${assunto || "N/A"}\n\n`;
            msg += `<strong>Questões Respondidas:</strong> ${answeredCount} de ${totalQuestions}\n`;
            msg += `<strong>Acertos:</strong> ${correctCount} (${perc}%)\n`;
            msg += `<strong>Tempo Decorrido:</strong> ${mins} minuto(s) e ${secs} segundo(s)\n\n`;
            let motivationalMessage = "";
            if (answeredCount === 0) motivationalMessage = "Você não respondeu nenhuma questão desta vez. Que tal tentar novamente?";
            else if (perc == 100) motivationalMessage = "Excelente! Você acertou todas as questões! Continue assim!";
            else if (perc >= 70) motivationalMessage = "Ótimo desempenho! Você está no caminho certo!";
            else if (perc >= 50) motivationalMessage = "Bom esforço! Continue praticando para melhorar ainda mais.";
            else motivationalMessage = "Não desanime! A prática leva à perfeição. Revise seus erros e tente novamente.";
            msg += `<em>${motivationalMessage}</em>`;
            showPopup(msg, "summary", "Sessão Finalizada!");
        }
        if (Object.keys(lastSessionDataForPDF.questions).length > 0 && revisarTentativaButton) revisarTentativaButton.style.display = "inline-flex";
        else if(revisarTentativaButton) revisarTentativaButton.style.display = "none";
        resetSessionState(); if(generateButton) generateButton.disabled = false;
        if(questoesOutput) questoesOutput.innerHTML = `<p class="empty-state"><i class="fas fa-tasks"></i> Sessão finalizada. Gere novas questões, revise a última tentativa ou confira seu progresso.</p>`;
        loadAndDisplayHistorico(true); 
        loadAndDisplayConquistas(true); 
    }

    function mostrarRevisaoDetalhada() {
        if (Object.keys(lastSessionDataForPDF.questions).length === 0) { showPopup("Nenhuma sessão anterior disponível para revisão.", "info", "Sem Dados para Revisão", 3000); return; }
        if (!revisaoOutput || !questoesSection || !revisaoDetalhadaSection) return;
        revisaoOutput.innerHTML = ""; 
        const sortedQuestionIds = Object.keys(lastSessionDataForPDF.questions).sort((a, b) => parseInt(a.split("-").pop()) - parseInt(b.split("-").pop()));
        sortedQuestionIds.forEach((qId, displayIndex) => {
            const qData = lastSessionDataForPDF.questions[qId]; const userAnswer = lastSessionDataForPDF.userAnswers[qId]; 
            const questionDiv = createQuestionElement(qData, displayIndex + 1, true, userAnswer); 
            revisaoOutput.appendChild(questionDiv);
        });
        questoesSection.style.display = "none"; revisaoDetalhadaSection.style.display = "block"; 
        if(exportToPDFButton) exportToPDFButton.style.display = "inline-flex"; 
        revisaoDetalhadaSection.scrollIntoView({ behavior: "smooth" });
    }

    function fecharRevisaoDetalhada() {
        if (!revisaoDetalhadaSection || !questoesSection) return;
        revisaoDetalhadaSection.style.display = "none";
        if(exportToPDFButton) exportToPDFButton.style.display = "none"; 
        questoesSection.style.display = "block"; 
    }

    function gerarConteudoHTMLParaPDF() {
        if (!lastSessionDataForPDF || !lastSessionDataForPDF.stats || Object.keys(lastSessionDataForPDF.questions).length === 0) { showError("Não há dados da última sessão para gerar o PDF."); return null; }
        const { stats, questions, userAnswers } = lastSessionDataForPDF;
        const { totalQuestions, correctCount, answeredCount, startTime, endTime, disciplina, assunto, nivel, tipo } = stats;
        const durationMs = endTime - startTime; const durSec = Math.floor(durationMs / 1000); const mins = Math.floor(durSec / 60); const secs = durSec % 60;
        const perc = answeredCount > 0 ? ((correctCount / answeredCount) * 100).toFixed(1) : 0;
        let html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Sessão</title><style>body{font-family:"Noto Sans CJK SC","WenQuanYi Zen Hei",sans-serif;margin:20px;color:#333;line-height:1.6}.header{text-align:center;margin-bottom:20px;border-bottom:1px solid #eee;padding-bottom:10px}h1{font-size:18pt}.summary{background-color:#f9f9f9;padding:15px;border-radius:8px;margin-bottom:20px}.summary p{margin:5px 0;font-size:10pt}.question-item{border:1px solid #ddd;padding:15px;margin-bottom:15px;border-radius:8px;page-break-inside:avoid}.question-text{font-weight:bold;margin-bottom:10px}.options-container button{display:block;width:95%;padding:8px;margin:5px 0;border:1px solid #ccc;border-radius:4px;text-align:left;background-color:#f9f9f9;font-size:9pt}.options-container button.user-selected-answer{border:2px solid #007bff!important;font-weight:bold}.options-container button.correct-answer-highlight{background-color:#cce5ff!important;border-color:#b8daff!important;color:#004085!important}.feedback-message{margin-top:10px;padding:8px;border-radius:4px;font-size:9pt}.feedback-message.correct{background-color:#d4edda;color:#155724}.feedback-message.incorrect{background-color:#f8d7da;color:#721c24}.feedback-message.unanswered{background-color:#fff3cd;color:#856404}.resolution-area{margin-top:10px;padding:10px;background-color:#e9ecef;border:1px dashed #ced4da;border-radius:4px;font-size:.9em}.question-item.correct{border-left:4px solid #28a745!important}.question-item.incorrect{border-left:4px solid #dc3545!important}strong{color:#000}</style></head><body><div class="header"><h1>Relatório da Sessão de Estudo</h1></div><div class="summary"><p><strong>Assunto:</strong> ${assunto||"N/A"}</p><p><strong>Disciplina:</strong> ${disciplina||"N/A"}</p><p><strong>Nível:</strong> ${nivel||"N/A"}</p><p><strong>Tipo:</strong> ${tipo==="multipla_escolha"?"Múltipla Escolha":"Verdadeiro/Falso"}</p><p><strong>Total Questões:</strong> ${totalQuestions}</p><p><strong>Respondidas:</strong> ${answeredCount}</p><p><strong>Acertos:</strong> ${correctCount} (${perc}%)</p><p><strong>Tempo:</strong> ${mins}m ${secs}s</p><p><strong>Data:</strong> ${new Date(stats.timestamp).toLocaleString("pt-BR")}</p></div>`;
        const sortedQuestionIds = Object.keys(questions).sort((a, b) => parseInt(a.split("-").pop()) - parseInt(b.split("-").pop()));
        sortedQuestionIds.forEach((qId, index) => {
            const qData = questions[qId]; const uAns = userAnswers[qId]; const isCorrect = uAns === qData.correctAnswer;
            let itemClass = "question-item"; if (uAns) itemClass += isCorrect ? " correct" : " incorrect";
            html += `<div class="${itemClass}"><p class="question-text"><strong>${index+1}.</strong> ${qData.text.replace(/\n/g,"<br>")}</p>`;
            if (qData.type !== "error") {
                html += `<div class="options-container">`;
                const optKeys = (qData.type === "multipla_escolha") ? Object.keys(qData.options).filter(k => ["A","B","C","D","E"].includes(k.toUpperCase())).sort() : ["V", "F"];
                optKeys.forEach(key => {
                    let btnClass = ""; if (uAns === key) btnClass += " user-selected-answer"; if (qData.correctAnswer === key) btnClass += " correct-answer-highlight";
                    let optText = (qData.type === "verdadeiro_falso") ? ((key === "V") ? "Verdadeiro" : "Falso") : `${key}) ${qData.options[key]}`;
                    if (qData.type === "verdadeiro_falso" && qData.options[key] && qData.options[key] !== "Verdadeiro" && qData.options[key] !== "Falso" && qData.options[key] !== key) optText += `: ${qData.options[key]}`;
                    html += `<button class="${btnClass}" disabled>${optText}</button>`;
                });
                html += `</div>`;
                let feedbackClass = "feedback-message"; let feedbackText = "";
                if (uAns) { feedbackClass += isCorrect ? " correct" : " incorrect"; feedbackText = isCorrect ? "Você acertou!" : `Você errou. Correta: ${qData.correctAnswer}`; }
                else { feedbackClass += " unanswered"; feedbackText = `Não respondida. Correta: ${qData.correctAnswer}`; }
                html += `<div class="${feedbackClass}">${feedbackText}</div>`;
                if (qData.resolution) html += `<div class="resolution-area"><strong>Resolução:</strong><br>${qData.resolution.replace(/\n/g,"<br>")}</div>`;
            }
            html += `</div>`;
        });
        html += `</body></html>`; return html;
    }

    function handleBeforeUnload(event) { if (currentSessionStats.id && currentSessionStats.totalQuestions > 0 && currentSessionStats.answeredCount < currentSessionStats.totalQuestions && currentSessionStats.answeredCount > 0) finalizeSession(false); }

    function parseGeneratedText(text, expectedType) {
        const questions = [];
        const startIndex = Math.min(text.indexOf("[Q]") !== -1 ? text.indexOf("[Q]") : Infinity, text.indexOf("[SEP]") !== -1 ? text.indexOf("[SEP]") : Infinity);
        const relevantText = startIndex !== Infinity ? text.substring(startIndex) : text;
        const questionBlocks = relevantText.trim().split(/\s*\[SEP\]\s*/i).filter(block => block.trim() !== "" && block.trim().toUpperCase().startsWith("[Q]"));
        if (questionBlocks.length === 0 && relevantText.trim() !== "") {
             if (relevantText.trim().toUpperCase().startsWith("[Q]")) questionBlocks.push(relevantText.trim());
             else { return [{ id: `q-error-parse-${Date.now()}-global`, text: "Erro Crítico: Formato da API irreconhecível.", type: "error", meta: "API", year: new Date().getFullYear() }]; }
        }
        questionBlocks.forEach((block, index) => {
            try {
                const qData = { id: `q-${Date.now()}-${index}`, text: "", options: {}, correctAnswer: null, type: expectedType, answered: false, resolution: null, image: null, meta: "API", year: new Date().getFullYear() }; 
                const qMatch = block.match(/\[Q\]([\s\S]*?)(?:\[A\]|\[B\]|\[C\]|\[D\]|\[E\]|\[V\]|\[F\]|\[R\]|\[RES\]|$)/i);
                if (qMatch && qMatch[1]) qData.text = qMatch[1].trim();
                else { const linesBefore = block.split(/\[A\]|\[B\]|\[C\]|\[D\]|\[E\]|\[V\]|\[F\]|\[R\]|\[RES\]/i)[0]; qData.text = linesBefore.replace(/^\[Q\]/i, "").trim(); if (!qData.text) throw new Error("Tag [Q] não encontrada ou enunciado vazio."); }
                let foundR = false, foundRes = false;
                block.trim().split("\n").forEach(line => {
                    line = line.trim();
                    if (/^\[A\]/i.test(line)) qData.options["A"] = line.substring(3).trim();
                    else if (/^\[B\]/i.test(line)) qData.options["B"] = line.substring(3).trim();
                    else if (/^\[C\]/i.test(line)) qData.options["C"] = line.substring(3).trim();
                    else if (/^\[D\]/i.test(line)) qData.options["D"] = line.substring(3).trim();
                    else if (/^\[E\]/i.test(line)) qData.options["E"] = line.substring(3).trim();
                    else if (/^\[V\]/i.test(line)) qData.options["V"] = line.substring(3).trim() || "Verdadeiro";
                    else if (/^\[F\]/i.test(line)) qData.options["F"] = line.substring(3).trim() || "Falso";
                    else if (/^\[R\]/i.test(line)) { qData.correctAnswer = line.substring(3).trim(); foundR = true; }
                    else if (/^\[RES\]/i.test(line)) { qData.resolution = line.substring(5).trim(); foundRes = true; }
                    else if (/^\[META\]/i.test(line)) qData.meta = line.substring(6).trim();
                    else if (/^\[ANO\]/i.test(line)) qData.year = parseInt(line.substring(5).trim(), 10) || new Date().getFullYear();
                });
                if (!foundR || !qData.correctAnswer) throw new Error("Tag [R] (resposta correta) não encontrada ou vazia.");
                if (Object.keys(qData.options).length === 0) throw new Error("Nenhuma opção de resposta ([A], [B]... ou [V]/[F]) foi encontrada.");
                if (!foundRes || !qData.resolution) throw new Error("Tag [RES] (resolução) não encontrada ou vazia.");
                if (expectedType === "multipla_escolha") {
                    const upperC = qData.correctAnswer.toUpperCase();
                    if (!["A", "B", "C", "D", "E"].includes(upperC) || !qData.options[upperC]) throw new Error(`Resposta correta [R] "${qData.correctAnswer}" é inválida ou não corresponde a uma opção fornecida.`);
                    qData.correctAnswer = upperC;
                } else {
                    const upperC = qData.correctAnswer.toUpperCase();
                    if (upperC === "VERDADEIRO" || upperC === "V") qData.correctAnswer = "V";
                    else if (upperC === "FALSO" || upperC === "F") qData.correctAnswer = "F";
                    else throw new Error(`Resposta correta [R] "${qData.correctAnswer}" é inválida para o tipo Verdadeiro/Falso.`);
                    if (qData.options["V"] === undefined) qData.options["V"] = "Verdadeiro";
                    if (qData.options["F"] === undefined) qData.options["F"] = "Falso";
                }
                questions.push(qData);
            } catch (error) {
                questions.push({ id: `q-error-${Date.now()}-${index}`, text: `Erro ao processar questão ${index + 1}: ${error.message}. Bloco original: ${block.substring(0,150)}...`, type: "error", meta: "Processamento", year: new Date().getFullYear() });
            }
        });
        return questions;
    }

    function createQuestionElement(qData, index, isReviewMode = false, userAnswerForReview = null) {
        const qDiv = document.createElement("div");
        qDiv.className = "question-item";
        qDiv.id = qData.id;
        qDiv.dataset.questionType = qData.type;
        qDiv.dataset.answered = isReviewMode ? "true" : "false";
        if (qData.type !== "error") {
            qDiv.dataset.correctAnswer = qData.correctAnswer || "";
            qDiv.dataset.selectedOption = isReviewMode ? (userAnswerForReview || "") : "";
        }
        const qHeader = document.createElement("div");
        qHeader.className = "question-header";
        const metaInfo = document.createElement("span");
        metaInfo.className = "question-meta-info";
        metaInfo.textContent = qData.meta || "Questão";
        const yearTag = document.createElement("span");
        yearTag.className = "question-year-tag";
        yearTag.textContent = qData.year || new Date().getFullYear();
        qHeader.appendChild(metaInfo); qHeader.appendChild(yearTag); qDiv.appendChild(qHeader);
        const qContentWrapper = document.createElement("div");
        qContentWrapper.className = "question-content-wrapper";
        const qTextContainer = document.createElement("div");
        qTextContainer.className = "question-text-container";
        const sanitizedText = (qData.text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        qTextContainer.innerHTML = `<strong>${index}.</strong> ${sanitizedText.replace(/\n/g, "<br>")}`;
        qContentWrapper.appendChild(qTextContainer);
        if (qData.type === "error") {
            qDiv.classList.add("question-error");
            qTextContainer.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <strong>Erro na Questão ${index}:</strong><br>${sanitizedText.replace(/\n/g, "<br>")}`;
            qDiv.appendChild(qContentWrapper); 
            return qDiv;
        }
        const optsContainer = document.createElement("div");
        optsContainer.className = "options-container";
        const optKeys = (qData.type === "multipla_escolha") ? Object.keys(qData.options).filter(k => ["A","B","C","D","E"].includes(k.toUpperCase())).sort() : ["V", "F"];
        optKeys.forEach(key => {
            if (qData.options[key] !== undefined) {
                const optBtn = document.createElement("button");
                optBtn.className = "option-btn";
                optBtn.dataset.value = key;
                optBtn.disabled = isReviewMode;
                const optLetterSpan = document.createElement("span");
                optLetterSpan.className = "option-letter";
                optLetterSpan.textContent = key;
                const optTextSpan = document.createElement("span");
                optTextSpan.className = "option-text";
                const sOptTxt = (qData.options[key] || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                optTextSpan.textContent = (qData.type === "verdadeiro_falso") ? ((key === "V") ? "Verdadeiro" : "Falso") : sOptTxt;
                if (qData.type === "verdadeiro_falso" && sOptTxt && sOptTxt !== "Verdadeiro" && sOptTxt !== "Falso" && sOptTxt !== key) optTextSpan.textContent += `: ${sOptTxt}`;
                optBtn.appendChild(optLetterSpan); optBtn.appendChild(optTextSpan); optsContainer.appendChild(optBtn);
                if (isReviewMode) { if (userAnswerForReview === key) optBtn.classList.add("selected", "user-selected-answer"); if (qData.correctAnswer === key) optBtn.classList.add("correct-answer-highlight"); }
            }
        });
        qContentWrapper.appendChild(optsContainer);
        const feedbackArea = document.createElement("div");
        feedbackArea.className = "feedback-area";
        const feedbackMsgDiv = document.createElement("div");
        feedbackMsgDiv.className = "feedback-message";
        feedbackMsgDiv.style.display = isReviewMode ? "block" : "none";
        feedbackArea.appendChild(feedbackMsgDiv);
        if (!isReviewMode) {
            const confirmBtn = document.createElement("button");
            confirmBtn.className = "confirm-answer-btn";
            confirmBtn.innerHTML = '<i class="fas fa-check"></i> Responder';
            confirmBtn.disabled = true;
            feedbackArea.appendChild(confirmBtn);
        }
        const resBtn = document.createElement("button");
        resBtn.className = "view-resolution-btn";
        resBtn.innerHTML = '<i class="fas fa-eye"></i> Ver Resolução';
        resBtn.dataset.questionId = qData.id;
        resBtn.style.display = isReviewMode ? "inline-flex" : "none";
        feedbackArea.appendChild(resBtn);
        const minimizeResBtn = document.createElement("button");
        minimizeResBtn.className = "minimize-resolution-btn";
        minimizeResBtn.innerHTML = '<i class="fas fa-minus-square"></i> Ocultar Resolução';
        minimizeResBtn.style.display = "none"; 
        feedbackArea.appendChild(minimizeResBtn); 
        qContentWrapper.appendChild(feedbackArea);
        const resDiv = document.createElement("div"); 
        resDiv.className = "resolution-area"; 
        resDiv.style.display = "none";
        const resContentDiv = document.createElement("div"); 
        resContentDiv.className = "resolution-content";
        resDiv.appendChild(resContentDiv);
        qContentWrapper.appendChild(resDiv);
        qDiv.appendChild(qContentWrapper);
        if (isReviewMode) {
            if (userAnswerForReview) {
                qDiv.classList.add("answered");
                if (userAnswerForReview === qData.correctAnswer) qDiv.classList.add("correct");
                else qDiv.classList.add("incorrect");
                feedbackMsgDiv.innerHTML = userAnswerForReview === qData.correctAnswer ? 
                    '<i class="fas fa-check-circle"></i> Você acertou!' : 
                    `<i class="fas fa-times-circle"></i> Você errou. Resposta correta: ${qData.correctAnswer}`;
            } else {
                feedbackMsgDiv.innerHTML = `<i class="fas fa-question-circle"></i> Não respondida. Resposta correta: ${qData.correctAnswer}`;
            }
            if (qData.resolution) {
                const sanitizedRes = (qData.resolution || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                resContentDiv.innerHTML = `<strong>Resolução:</strong><br>${sanitizedRes.replace(/\n/g, "<br>")}`;
            }
        }
        return qDiv;
    }

    function displayParsedQuestions(questionsArray) {
        if(!questoesOutput) return;
        questoesOutput.innerHTML = ""; questionsDataStore = {}; currentSessionStats.userAnswers = {}; 
        if(revisarTentativaButton) revisarTentativaButton.style.display = "none"; fecharRevisaoDetalhada(); 
        if (!questionsArray || questionsArray.length === 0) { 
            questoesOutput.innerHTML = '<p class="empty-state"><i class="fas fa-box-open"></i> Nenhuma questão foi gerada ou retornada pela API.</p>'; 
            return; 
        }
        questionsArray.forEach((qData, index) => {
            questionsDataStore[qData.id] = qData; 
            const qElement = createQuestionElement(qData, index + 1);
            questoesOutput.appendChild(qElement);
        });
    }

    function handleOptionClick(clickedButton) {
        const qDiv = clickedButton.closest(".question-item"); if (!qDiv || qDiv.dataset.answered === "true") return;
        const confirmBtn = qDiv.querySelector(".confirm-answer-btn");
        qDiv.querySelectorAll(".option-btn").forEach(btn => btn.classList.remove("selected-preview"));
        clickedButton.classList.add("selected-preview"); qDiv.dataset.selectedOption = clickedButton.dataset.value; 
        if (confirmBtn) confirmBtn.disabled = false;
    }

    function handleConfirmAnswer(confirmButton) {
        const qDiv = confirmButton.closest(".question-item"); if (!qDiv) return;
        const userAnswer = qDiv.dataset.selectedOption; if (!userAnswer || qDiv.dataset.answered === "true" || !currentSessionStats.id) return;
        currentSessionStats.userAnswers[qDiv.id] = userAnswer; 
        const correctAnswer = qDiv.dataset.correctAnswer; const isCorrect = userAnswer === correctAnswer;
        const feedbackMsgDiv = qDiv.querySelector(".feedback-message"); const resBtn = qDiv.querySelector(".view-resolution-btn");
        const minimizeBtn = qDiv.querySelector(".minimize-resolution-btn");
        qDiv.dataset.answered = "true"; qDiv.classList.add("answered", isCorrect ? "correct" : "incorrect");
        qDiv.querySelectorAll(".option-btn").forEach(btn => { btn.disabled = true; btn.classList.remove("selected-preview"); if (btn.dataset.value === userAnswer) btn.classList.add("selected"); if (btn.dataset.value === correctAnswer) btn.classList.add("correct-answer-highlight"); });
        confirmButton.disabled = true;
        if (feedbackMsgDiv) { 
            feedbackMsgDiv.innerHTML = isCorrect ? 
                '<i class="fas fa-check-circle"></i> Correta!' : 
                `<i class="fas fa-times-circle"></i> Incorreta. Resposta correta: ${correctAnswer}`;
            feedbackMsgDiv.style.display = "block"; 
        }
        if (resBtn) resBtn.style.display = "inline-flex";
        if (minimizeBtn) minimizeBtn.style.display = "none"; // Garante que o botão de minimizar esteja oculto inicialmente
        currentSessionStats.answeredCount++; if (isCorrect) currentSessionStats.correctCount++;
        if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions && finalizeButton) { showPopup("Todas as questões foram respondidas! Clique em 'Finalizar Tentativa' para ver seu resumo.", "success", "Sessão Completa!", 5000); finalizeButton.focus(); }
    }

    function handleViewResolution(resolutionButton) {
        const qId = resolutionButton.dataset.questionId; const qDiv = document.getElementById(qId);
        const resArea = qDiv ? qDiv.querySelector(".resolution-area") : null;
        const resContent = resArea ? resArea.querySelector(".resolution-content") : null;
        const minimizeBtn = qDiv ? qDiv.querySelector(".minimize-resolution-btn") : null;
        const dataSource = (revisaoDetalhadaSection && revisaoDetalhadaSection.style.display === "block") ? lastSessionDataForPDF.questions : questionsDataStore;
        const qData = dataSource[qId];
        if (!qDiv || !resArea || !resContent || !minimizeBtn || !qData || !qData.resolution) { showPopup("Erro ao carregar a resolução da questão.", "error", "Erro na Resolução"); return; }
        const sanitizedRes = (qData.resolution || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        resContent.innerHTML = `<strong>Resolução:</strong><br>${sanitizedRes.replace(/\n/g, "<br>")}`;
        resArea.style.display = "block"; 
        minimizeBtn.style.display = "inline-flex"; 
        resolutionButton.style.display = "none"; 
        resolutionButton.disabled = true;
    }

    function handleMinimizeResolution(minimizeButton) {
        const qDiv = minimizeButton.closest(".question-item"); if (!qDiv) return;
        const resArea = qDiv.querySelector(".resolution-area");
        const viewResBtn = qDiv.querySelector(".view-resolution-btn");
        if (resArea) resArea.style.display = "none";
        if (minimizeButton) minimizeButton.style.display = "none";
        if (viewResBtn) { viewResBtn.style.display = "inline-flex"; viewResBtn.disabled = false; }
    }

    async function handleGenerateQuestions() {
        hidePopup();
        if (currentSessionStats.id && currentSessionStats.answeredCount > 0 && currentSessionStats.answeredCount < currentSessionStats.totalQuestions) {
            if (!confirm("Você tem uma sessão em andamento. Gerar novas questões irá descartar o progresso atual. Deseja continuar?")) return;
            finalizeSession(false); 
        }
        resetSessionState(); clearOutput(); 
        const assunto = assuntoInput.value.trim(); 
        let disciplinaSel = disciplinaSelect.value; // Permitir que seja "" ou "Geral"
        const numQ = parseInt(numQuestoesInput.value, 10); const tipoQ = tipoQuestaoSelect.value; const nivelQ = nivelQuestaoSelect.value;
        if (!assunto) { assuntoInput.focus(); return showError("Por favor, informe o Assunto Principal para as questões."); }
        if (isNaN(numQ) || numQ < 1 || numQ > 10) { numQuestoesInput.focus(); return showError("A quantidade de questões deve ser um número entre 1 e 10."); }
        if (!nivelQ) { nivelQuestaoSelect.focus(); return showError("Selecione o Nível de Dificuldade."); }
        if (!tipoQ) { tipoQuestaoSelect.focus(); return showError("Selecione o Tipo de Questão."); }
        if (!GEMINI_API_KEY.startsWith("AIza")) { return showError("A chave da API Gemini parece inválida ou não foi configurada corretamente."); }
        showLoading(true);
        let prompt = `Gere ${numQ} questão(ões) sobre "${assunto}".\n`;
        // Disciplina agora é opcional no prompt
        if (disciplinaSel && disciplinaSel !== "Geral" && disciplinaSel !== "") {
            prompt += `Disciplina: "${disciplinaSel}".\n`;
        } else {
            prompt += `Disciplina: Geral (não especificada).\n`;
            disciplinaSel = "Geral"; // Define como Geral se não especificado para consistência no storage
        }
        prompt += `Nível: ${nivelQ}. Tipo: ${tipoQ === "multipla_escolha" ? "Múltipla Escolha (com 5 alternativas: A, B, C, D, E)" : "Verdadeiro/Falso (com alternativas V e F)"}.\n`;
        prompt += `Formato OBRIGATÓRIO e ESTRITO para CADA questão: Use [SEP] para separar questões. Dentro de cada questão, use as seguintes tags:
[Q] enunciado completo da questão.
`;
        if (tipoQ === "multipla_escolha") {
            prompt += `[A] texto da alternativa A.
[B] texto da alternativa B.
[C] texto da alternativa C.
[D] texto da alternativa D.
[E] texto da alternativa E.
[R] LETRA_CORRETA (apenas a letra, ex: C).
`;
        } else {
            prompt += `[V] texto para Verdadeiro (pode ser só "Verdadeiro" ou a afirmação em si).
[F] texto para Falso (pode ser só "Falso" ou a afirmação em si).
[R] LETRA_CORRETA (V ou F).
`;
        }
        prompt += `[RES] resolução detalhada e explicativa da questão.
[META] Nome da fonte ou concurso (ex: ENEM, VUNESP, OBMEP). Se não aplicável, use "Original".
[ANO] Ano da questão (ex: 2023). Se não aplicável, use o ano atual.
Exemplo Múltipla Escolha:
[SEP]
[Q] Qual é a capital da França?
[A] Londres
[B] Berlim
[C] Paris
[D] Madri
[E] Roma
[R] C
[RES] Paris é a capital e a maior cidade da França, conhecida por sua arquitetura, museus e cultura vibrante.
[META] Conhecimentos Gerais
[ANO] 2024
[SEP]
Exemplo Verdadeiro/Falso:
[SEP]
[Q] O Sol gira em torno da Terra.
[V] Verdadeiro
[F] Falso
[R] F
[RES] O modelo heliocêntrico, proposto por Copérnico, estabelece que a Terra e outros planetas giram em torno do Sol.
[META] Astronomia Básica
[ANO] 2024
[SEP]
IMPORTANTE: Siga ESTRITAMENTE este formato. TODAS as tags ([Q], [A]..[E] ou [V]/[F], [R], [RES], [META], [ANO]) são OBRIGATÓRIAS para cada questão. Use [SEP] entre cada bloco de questão.`;

        try {
            const reqBody = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { "temperature": 0.65, "maxOutputTokens": 300 * numQ + 400, "topP": 0.9, "topK": 40 }, safetySettings: [{"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},{"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},{"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},{"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}]};
            const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody) });
            if (!response.ok) {
                let errTxt = await response.text(); 
                let errBody = {}; try { errBody = JSON.parse(errTxt); } catch (e) {}
                const detailMsg = errBody?.error?.message || `HTTP ${response.status}`;
                if (detailMsg.includes("API key not valid")) throw new Error("Chave da API Gemini inválida. Verifique a configuração.");
                else if (response.status === 429) throw new Error("API Gemini: Limite de requisições atingido. Tente novamente mais tarde.");
                else throw new Error(`Erro da API Gemini: ${detailMsg}`);
            }
            const data = await response.json();
            if (data.promptFeedback?.blockReason) { showError(`Conteúdo bloqueado pela API de segurança (${data.promptFeedback.blockReason}). Tente reformular o assunto ou os termos utilizados.`); return; }
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) { showError("A API retornou uma resposta vazia ou em formato inesperado."); return; }
            const rawTxt = data.candidates[0].content.parts[0].text;
            const questionsArr = parseGeneratedText(rawTxt, tipoQ);
            displayParsedQuestions(questionsArr); 
            const validQs = questionsArr.filter(q => q.type !== "error");
            const totalValidQs = validQs.length; const errorQsCount = questionsArr.length - totalValidQs;
            if (totalValidQs > 0) {
                currentSessionStats = { id: `sess-${Date.now()}`, totalQuestions: totalValidQs, answeredCount: 0, correctCount: 0, disciplina: disciplinaSel, assunto: assunto, nivel: nivelQ, tipo: tipoQ, startTime: Date.now(), endTime: null, userAnswers: {} }; 
                if(finalizeButton) finalizeButton.style.display = "inline-flex";
                let sucMsg = `${totalValidQs} questão(ões) gerada(s) com sucesso!`;
                if (totalValidQs < numQ && errorQsCount === 0) sucMsg = `Foram geradas ${totalValidQs} de ${numQ} questões solicitadas. A API pode ter retornado menos que o esperado.`;
                if (errorQsCount > 0) { sucMsg += ` (${errorQsCount} questão(ões) tiveram erro no processamento e foram descartadas.)`; showPopup(sucMsg, "warning", "Geração Parcial", 5000); }
                else showPopup(sucMsg, "success", "Questões Geradas!", 3000);
            } else {
                if (questionsArr.length > 0 && questionsArr.every(q => q.type === "error")) showError(questionsArr[0].text); 
                else if (errorQsCount > 0) showError(`Todas as ${errorQsCount} questão(ões) retornadas pela API tiveram erro no processamento e nenhuma pôde ser utilizada.`);
                else showError("Nenhuma questão foi retornada pela API ou o formato estava totalmente irreconhecível.");
                resetSessionState();
            }
            const finishReason = data.candidates[0].finishReason;
            if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") { showPopup(`Atenção: A geração pela API pode ter sido interrompida (${finishReason}). Verifique as questões.`, "warning", "API Interrompida", 5000); }
            else if (finishReason === "MAX_TOKENS" && totalValidQs < numQ) { showPopup(`Atenção: Limite de texto da API atingido. ${totalValidQs} de ${numQ} questões foram geradas.`, "warning", "Limite API Atingido", 5000); }
        } catch (error) {
            showError(`Erro durante a geração ou processamento das questões: ${error.message || "Falha desconhecida."}`);
            resetSessionState();
        } finally { showLoading(false); }
    }

    // === Funções de Gamificação ===
    function loadUserAchievements() {
        const stored = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
        if (stored) { try { unlockedAchievements = JSON.parse(stored); if(!Array.isArray(unlockedAchievements)) unlockedAchievements = []; } catch(e){ unlockedAchievements = []; } }
        else unlockedAchievements = [];
        Object.values(ALL_ACHIEVEMENTS).forEach(ach => ach.unlocked = unlockedAchievements.includes(ach.id));
    }
    function saveUserAchievements() { localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(unlockedAchievements)); }
    function unlockAchievement(achievementId) {
        if (!ALL_ACHIEVEMENTS[achievementId] || unlockedAchievements.includes(achievementId)) return;
        unlockedAchievements.push(achievementId);
        ALL_ACHIEVEMENTS[achievementId].unlocked = true;
        saveUserAchievements();
        showPopup(`Nova Conquista Desbloqueada: ${ALL_ACHIEVEMENTS[achievementId].nome}!`, "success", "Conquista!", 4000);
        loadAndDisplayConquistas(true);
    }
    function checkAndUnlockAchievements(currentSession, allSessions) {
        if (!currentSession) return;
        if (!ALL_ACHIEVEMENTS["PRIMEIRA_SESSAO"].unlocked) unlockAchievement("PRIMEIRA_SESSAO");
        if (!ALL_ACHIEVEMENTS["DEZ_SESSOES"].unlocked && allSessions.length >= 10) unlockAchievement("DEZ_SESSOES");
        if (!ALL_ACHIEVEMENTS["PERFEICAO_TOTAL"].unlocked && currentSession.totalQuestions >= 5 && currentSession.correctCount === currentSession.totalQuestions) unlockAchievement("PERFEICAO_TOTAL");
        let totalQuestoesRespondidasGlobal = 0;
        allSessions.forEach(s => { totalQuestoesRespondidasGlobal += (s.answeredCount || 0); });
        if (!ALL_ACHIEVEMENTS["CINQUENTA_QUESTOES"].unlocked && totalQuestoesRespondidasGlobal >= 50) unlockAchievement("CINQUENTA_QUESTOES");
        if (!ALL_ACHIEVEMENTS["CEM_QUESTOES"].unlocked && totalQuestoesRespondidasGlobal >= 100) unlockAchievement("CEM_QUESTOES");
        if (!ALL_ACHIEVEMENTS["EXPLORADOR_DISCIPLINAS"].unlocked) {
            const disciplinasUnicas = new Set();
            allSessions.forEach(s => { if(s.disciplina && s.disciplina !== "Geral") disciplinasUnicas.add(s.disciplina); });
            if (disciplinasUnicas.size >= 3) unlockAchievement("EXPLORADOR_DISCIPLINAS");
        }
    }

    function loadAndDisplayHistorico(isPopup = false) {
        const outputEl = isPopup ? historicoOutputPopup : historicoOutput;
        if (!outputEl) return;
        outputEl.innerHTML = "";
        const sessions = JSON.parse(localStorage.getItem(RESULTS_STORAGE_KEY) || "[]");
        if (sessions.length === 0) { outputEl.innerHTML = "<p><i class=\"far fa-calendar-alt\"></i> Nenhuma sessão de estudo registrada ainda.</p>"; return; }
        sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        sessions.forEach(session => {
            const itemDiv = document.createElement("div"); itemDiv.className = "historico-item";
            const date = new Date(session.timestamp).toLocaleString("pt-BR");
            const perc = session.answeredCount > 0 ? ((session.correctCount / session.answeredCount) * 100).toFixed(1) : 0;
            let scoreClass = "";
            if (perc == 100) scoreClass = "score-perfect"; else if (perc >= 70) scoreClass = "score-good"; else if (perc >= 50) scoreClass = "score-medium"; else scoreClass = "score-bad";
            const icon = perc == 100 ? "fas fa-star" : (perc >=70 ? "fas fa-thumbs-up" : (perc >= 50 ? "fas fa-smile" : "fas fa-meh"));
            itemDiv.innerHTML = `<h4><i class="${icon} ${scoreClass}"></i> Sessão de ${session.disciplina || "Geral"} (${session.assunto || "N/A"})</h4><p><i class="far fa-calendar-alt"></i> Data: ${date}</p><p><i class="fas fa-list-ol"></i> Questões: ${session.answeredCount}/${session.totalQuestions}</p><p><i class="fas fa-check-double"></i> Acertos: <span class="${scoreClass}">${session.correctCount} (${perc}%)</span></p>`;
            outputEl.appendChild(itemDiv);
        });
    }

    function loadAndDisplayConquistas(isPopup = false) {
        const outputEl = isPopup ? conquistasOutputPopup : conquistasOutput;
        if (!outputEl) return;
        loadUserAchievements(); 
        outputEl.innerHTML = "";
        if (Object.keys(ALL_ACHIEVEMENTS).length === 0) { outputEl.innerHTML = "<p><i class=\"fas fa-trophy\"></i> Nenhuma conquista definida no momento.</p>"; return; }
        Object.values(ALL_ACHIEVEMENTS).forEach(ach => {
            const itemDiv = document.createElement("div"); itemDiv.className = `conquista-item ${ach.unlocked ? "unlocked" : "locked"}`;
            itemDiv.innerHTML = `<span class="conquista-icon"><i class="${ach.icon || 'fas fa-question-circle'}"></i></span><div class="conquista-details"><h4>${ach.nome} ${ach.unlocked ? "<span class='unlocked-badge'>(Desbloqueada <i class='fas fa-lock-open'></i>)</span>" : "<span class='locked-badge'>(Bloqueada <i class='fas fa-lock'></i>)</span>"}</h4><p>${ach.descricao}</p></div>`;
            outputEl.appendChild(itemDiv);
        });
    }

    window.openTab = function(evt, tabName, contextId = null) {
        let i, tabcontent, tablinks;
        const context = contextId ? document.getElementById(contextId) : document;
        if (!context) return;
        tabcontent = context.getElementsByClassName("tab-content");
        for (i = 0; i < tabcontent.length; i++) { tabcontent[i].style.display = "none"; tabcontent[i].classList.remove("active"); }
        tablinks = context.getElementsByClassName("tab-button");
        for (i = 0; i < tablinks.length; i++) { tablinks[i].className = tablinks[i].className.replace(" active", ""); }
        const activeTab = context.querySelector("#" + tabName);
        if(activeTab) { activeTab.style.display = "block"; activeTab.classList.add("active"); }
        if(evt && evt.currentTarget) evt.currentTarget.className += " active";
        if (tabName === "historicoTabPopup") loadAndDisplayHistorico(true);
        if (tabName === "conquistasTabPopup") loadAndDisplayConquistas(true);
    }

    // === Event Listeners ===
    if(generateButton) generateButton.addEventListener("click", handleGenerateQuestions);
    if(finalizeButton) finalizeButton.addEventListener("click", () => finalizeSession(true));
    if(manageDisciplinasButton) manageDisciplinasButton.addEventListener("click", showDisciplinasPopup);
    if(closeDisciplinasPopup) closeDisciplinasPopup.addEventListener("click", hideDisciplinasPopup);
    if(minimizeDisciplinasPopup) minimizeDisciplinasPopup.addEventListener("click", toggleMinimizeDisciplinasPopup);
    if(addDisciplinaButton) addDisciplinaButton.addEventListener("click", adicionarDisciplina);
    if (disciplinasPopupOverlay) disciplinasPopupOverlay.addEventListener("click", (event) => { if (event.target === disciplinasPopupOverlay) hideDisciplinasPopup(); });
    
    if(openProgressPopupButton) openProgressPopupButton.addEventListener("click", showProgressPopup);
    if(closeProgressPopup) closeProgressPopup.addEventListener("click", hideProgressPopup);
    if(minimizeProgressPopup) minimizeProgressPopup.addEventListener("click", toggleMinimizeProgressPopup);
    if(progressPopupOverlay) progressPopupOverlay.addEventListener("click", (event) => { if (event.target === progressPopupOverlay) hideProgressPopup(); });

    if(revisarTentativaButton) revisarTentativaButton.addEventListener("click", mostrarRevisaoDetalhada);
    if(fecharRevisaoButton) fecharRevisaoButton.addEventListener("click", fecharRevisaoDetalhada);
    
    if(exportToPDFButton) exportToPDFButton.addEventListener("click", () => {
        showLoading(true);
        const htmlContent = gerarConteudoHTMLParaPDF();
        if (!htmlContent) { showLoading(false); return; }
        showPopup("Gerando HTML para PDF...", "info", "Exportação em Progresso");
        setTimeout(() => {
            showLoading(false);
            try {
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `relatorio_sessao_${new Date().toISOString().slice(0,10)}.html`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                showPopup("HTML do relatório baixado. A conversão para PDF (usando generate_pdf.py) deve ser feita no backend.", "success", "HTML Gerado", 6000);
            } catch (e) { showError("Erro ao tentar baixar o HTML do relatório: " + e.message); }
        }, 1500);
    });

    if(questoesOutput) questoesOutput.addEventListener("click", (event) => {
        const target = event.target.closest("button"); 
        if (!target) return;
        if (target.classList.contains("option-btn")) handleOptionClick(target);
        else if (target.classList.contains("confirm-answer-btn")) handleConfirmAnswer(target);
        else if (target.classList.contains("view-resolution-btn")) handleViewResolution(target);
        else if (target.classList.contains("minimize-resolution-btn")) handleMinimizeResolution(target); // Novo
    });

    if (popupCloseButton) popupCloseButton.addEventListener("click", hidePopup);
    if (popupOverlay) popupOverlay.addEventListener("click", (event) => { if (event.target === popupOverlay) hidePopup(); });

    window.addEventListener("beforeunload", handleBeforeUnload);

    // === Inicialização ===
    carregarDisciplinas();
    resetSessionState();
    fecharRevisaoDetalhada(); 
    loadUserAchievements(); 
    loadAndDisplayHistorico(true); // Carrega para o popup inicialmente
    loadAndDisplayConquistas(true); // Carrega para o popup inicialmente
    
    // Garante que a aba correta no popup de progresso seja mostrada ao abrir
    if(progressPopupOverlay) {
        const defaultProgressTabButton = progressPopupOverlay.querySelector(".tabs .tab-button.active");
        if (defaultProgressTabButton) {
            const tabId = defaultProgressTabButton.getAttribute("onclick").match(/'([^']+)'/)[1];
            window.openTab(null, tabId, 'progressPopupContent');
        }
    }

    // Adiciona ícones aos botões de controle dos popups
    if(minimizeDisciplinasPopup) minimizeDisciplinasPopup.innerHTML = '<i class="fas fa-minus"></i>';
    if(closeDisciplinasPopup) closeDisciplinasPopup.innerHTML = '<i class="fas fa-times"></i>';
    if(minimizeProgressPopup) minimizeProgressPopup.innerHTML = '<i class="fas fa-minus"></i>';
    if(closeProgressPopup) closeProgressPopup.innerHTML = '<i class="fas fa-times"></i>';
    
    // Adiciona ícones aos botões principais
    if(addDisciplinaButton) addDisciplinaButton.innerHTML = '<i class="fas fa-plus-circle"></i> Adicionar';
    if(generateButton) generateButton.innerHTML = '<i class="fas fa-cogs"></i> Gerar Questões';
    if(manageDisciplinasButton) manageDisciplinasButton.innerHTML = '<i class="fas fa-edit"></i> Gerenciar Disciplinas';
    if(finalizeButton) finalizeButton.innerHTML = '<i class="fas fa-flag-checkered"></i> Finalizar Tentativa';
    if(revisarTentativaButton) revisarTentativaButton.innerHTML = '<i class="fas fa-history"></i> Revisar Tentativa';
    if(exportToPDFButton) exportToPDFButton.innerHTML = '<i class="fas fa-file-pdf"></i> Exportar para PDF';
    if(fecharRevisaoButton) fecharRevisaoButton.innerHTML = '<i class="fas fa-times-circle"></i> Fechar Revisão';
    if(popupCloseButton) popupCloseButton.innerHTML = '<i class="fas fa-times"></i> Fechar';
    if(openProgressPopupButton) openProgressPopupButton.innerHTML = '<i class="fas fa-chart-line"></i> Ver Progresso';

    if(questoesOutput) questoesOutput.innerHTML = '<p class="empty-state"><i class="fas fa-lightbulb"></i> Configure e gere suas questões acima!</p>';
});