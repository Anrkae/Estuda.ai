// assets/js/components/timerPopup.js

document.addEventListener("DOMContentLoaded", () => {
    const popupId = "timerPopupContainer";
    const styleId = "timerPopupStyles";
    const initialState = 'level-2'; // Começa minimizado
    const RESULTS_STORAGE_KEY = 'sessoesEstudo';

    if (!document.getElementById(popupId)) {
        // --- HTML do Popup (sem alterações) ---
        const timerPopupHTML = `
            <div id="${popupId}" class="popup-container ${initialState}">
                <div id="timerPopupHeader" class="popup-header">
                     <span id="timerPopupTitle">Sessão de Estudos</span>
                </div>
                <div class="popup-content-wrapper">
                    <span id="timerPopupDragHandle" class="popup-drag-handle">arraste para minimizar</span>
                    <div id="timerContent">
                        <div id="Cronometro">
                        <h3><i class="fa-regular fa-clock"></i> Cronômetro</h3>
                        <div id="timerDisplay">00:00:00</div>
                        <div id="timerControls">
                            <button id="timerPauseBtn" class="timer-btn pause" disabled><i class="fa-solid fa-pause"></i> Pausar</button>
                            <button id="timerResumeBtn" class="timer-btn resume" disabled><i class="fa-solid fa-play"></i> Retomar</button>
                        </div>
                        </div>
                        <div id="timerSessionStats">
                            <h3><i class="fa-solid fa-list-check"></i> Resumo da Sessão</h3>
                             <p id="statsDisciplina">Disciplina: <span>--</span></p>
                            <p id="statsResolved">Resolvidas: <span class="count">0 / 0</span></p>
                            <p id="statsCorrect">Acertos: <span class="count">0</span> (<span class="percentage">0%</span>)</p>
                        </div>
                        <button id="timerFinishBtn" class="timer-btn finish" disabled>
                            <i class="fa-solid fa-flag-checkered"></i> Finalizar e Salvar Sessão
                        </button>
                        <div id="timerFeedback" class="popup-feedback"></div>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML("beforeend", timerPopupHTML);

        // --- CSS do Popup (sem alterações) ---
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
/* Estilos base do container e header */
#${popupId} { position: fixed; bottom: 0; left: 0; width: 100vw; height: 100vh; z-index: 1000; transition: transform 0.4s ease-in-out; background-color: #ffffff; display: flex; flex-direction: column; font-family: 'Montserrat', sans-serif; box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.1); overflow: hidden; border-top-left-radius: 32px; border-top-right-radius: 32px; }
#${popupId}.level-2 { transform: translateY(calc(100% - 50px)); box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1); }
#${popupId}.level-2 #timerPopupHeader { height: 50px; padding: 0 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; background-color: #f8f8f8; border-top: 1px solid #e0e0e0; width: 100%; flex-shrink: 0; border-radius: 0; }
#${popupId}.level-2 #timerPopupTitle { font-weight: 600; color: #2C2C2C; font-size: 1rem; }
#${popupId}.level-2 .popup-content-wrapper { display: none; }
#${popupId}.level-1 { transform: translateY(0); box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.15); }
#${popupId}.level-1 #timerPopupHeader { display: none; }
#${popupId}.level-1 .popup-content-wrapper { display: flex; flex-direction: column; align-items: center; flex-grow: 1; overflow-y: auto; padding: 20px 30px 30px 30px; position: relative; padding-top: 35px; }
#${popupId}.level-1 #timerContent { width: 100%; max-width: 450px; text-align: center; }
#${popupId} .popup-drag-handle { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); background: none; border: none; font-size: 0.8rem; color: red; opacity: 0.5; cursor: ns-resize; padding: 8px 15px; z-index: 10; transition: opacity 0.2s ease, color 0.2s ease; white-space: nowrap; font-family: 'Montserrat', sans-serif; font-weight: 400; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; touch-action: none; }
#${popupId} .popup-drag-handle:hover { color: #444; opacity: 1; }
/* Estilos Timer e Conteúdo */
 h2 { top: 10px; margin-top: 0; margin-bottom: 25px; font-size: 1.3em; color: #444; font-weight: 600; padding-bottom: 0; display: flex; align-items: center; }
#timerContent h2 i { margin-right: 8px; color: #555; }
#timerDisplay { font-size: 3em; color: #333; margin-bottom: 15px; font-weight: 500; font-family: 'Courier New', Courier, monospace; background-color: #f0f0f0; padding: 8px 15px; border-radius: 8px; display: inline-block; min-width: 180px; }
#Cronometro { margin-top: 30px; margin-bottom: 25px; padding: 15px 20px; background-color: #f9f9f9; border-radius: 8px; border: 1px solid #eee; text-align: center; }
#timerControls { display: flex; justify-content: center; gap: 15px; margin-bottom: 25px; }
#timerSessionStats { margin-bottom: 25px; padding: 15px 20px; background-color: #f9f9f9; border-radius: 8px; border: 1px solid #eee; text-align: left; }
h3 { margin-top: 0; margin-bottom: 15px; font-size: 1.1em; color: #444; font-weight: 600; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; display: flex; align-items: center; gap: 8px; }
h3 i { color: #666; }
#timerSessionStats p { margin: 10px 0; font-size: 1em; color: #555; }
#timerSessionStats span { font-weight: 600; color: #222; margin-left: 5px; }
#timerSessionStats span.percentage { color: #007bff; }
.timer-btn { padding: 10px 20px; font-size: 1em; font-weight: 500; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s ease; min-width: 110px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.timer-btn i { font-size: 1em; line-height: 1; }
.timer-btn:disabled { background-color: #d0d0d0 !important; color: #888 !important; cursor: not-allowed; opacity: 0.7; }
.timer-btn.pause { background-color: #ff9800; color: white; }
.timer-btn.pause:hover:not(:disabled) { background-color: #f57c00; }
.timer-btn.resume { background-color: #4CAF50; color: white; }
.timer-btn.resume:hover:not(:disabled) { background-color: #45a049; }
.timer-btn.finish { background-color: #007bff; color: white; width: 100%; margin-top: 10px; padding: 12px; font-size: 1.1em; font-weight: 600; }
.timer-btn.finish:hover:not(:disabled) { background-color: #0056b3; }
.timer-btn.finish i { margin-right: 10px; }
#timerFeedback { margin-top: 15px; padding: 10px; border-radius: 4px; text-align: center; font-size: 0.95em; display: none; }
#timerFeedback.sucesso { background-color: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
#timerFeedback.erro { background-color: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
@media (max-width: 600px) { #timerPopup.level-1 .popup-content-wrapper { padding: 15px 20px 20px 20px; padding-top: 35px; } #timerContent h2 { font-size: 1.2em; } #timerDisplay { font-size: 2.5em; } #timerSessionStats h3 { font-size: 1em; } #timerSessionStats p { font-size: 0.9em; } .timer-btn { padding: 8px 15px; font-size: 0.95em; min-width: 90px; } .timer-btn.finish { font-size: 1em; } #${popupId} .popup-drag-handle { font-size: 0.75rem; top: 6px;} }
            `;
            document.head.appendChild(style);
        }

        // --- Lógica do Timer e Sessão ---
        const timerPopupContainer = document.getElementById(popupId);
        const timerPopupHeader = document.getElementById("timerPopupHeader");
        const timerPopupDragHandle = document.getElementById("timerPopupDragHandle");
        const timerDisplay = document.getElementById("timerDisplay");
        const pauseBtn = document.getElementById("timerPauseBtn");
        const resumeBtn = document.getElementById("timerResumeBtn");
        const finishBtn = document.getElementById("timerFinishBtn");
        const feedbackDiv = document.getElementById("timerFeedback");
        const statsDisciplinaSpan = document.querySelector("#statsDisciplina span");
        const statsResolvedSpan = document.querySelector("#statsResolved span.count");
        const statsCorrectSpan = document.querySelector("#statsCorrect span.count");
        const statsPercentageSpan = document.querySelector("#statsCorrect span.percentage");

        let timerInterval = null;
        let startTime = 0;
        let elapsedTime = 0;
        let isRunning = false;
        let isPaused = false;
        let sessionInfo = { totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null };

        // --- Funções do Timer ---
        function formatTime(totalMilliseconds) {
            const totalSeconds = Math.floor(totalMilliseconds / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const pad = (num) => String(num).padStart(2, '0');
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
         }
        function updateDisplay() {
            const currentTime = Date.now();
            const currentElapsedTime = isRunning ? elapsedTime + (currentTime - startTime) : elapsedTime;
            timerDisplay.textContent = formatTime(currentElapsedTime);
        }
        function startTimerInternal() {
            if (isRunning) return;
            isRunning = true;
            isPaused = false;
            startTime = Date.now();
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(updateDisplay, 100);
            pauseBtn.disabled = false;
            resumeBtn.disabled = true;
            finishBtn.disabled = false;
        }
        function pauseTimerInternal() {
            if (!isRunning) return;
            isRunning = false;
            isPaused = true;
            clearInterval(timerInterval);
            timerInterval = null;
            elapsedTime += Date.now() - startTime;
            pauseBtn.disabled = true;
            resumeBtn.disabled = false;
            finishBtn.disabled = false;
            updateDisplay();
            console.log("Timer pausado. Tempo decorrido:", elapsedTime);
        }
        function resumeTimerInternal() {
             if (isRunning || !isPaused) return;
             startTimerInternal();
        }
        function resetTimerAndStats() {
             isRunning = false;
             isPaused = false;
             if (timerInterval) clearInterval(timerInterval);
             timerInterval = null;
             elapsedTime = 0;
             startTime = 0;
             sessionInfo = { totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null };
             updateDisplay();
             updateStatsDisplay();
             pauseBtn.disabled = true;
             resumeBtn.disabled = true;
             finishBtn.disabled = true;
             feedbackDiv.style.display = 'none';
             // Não mexe mais no transform/transition ao resetar, deixa o estado como está
             // timerPopupContainer.style.transition = '';
             // timerPopupContainer.style.transform = '';
        }

        // --- Funções de Controle da Sessão e Stats ---
        function updateStatsDisplay() {
             statsDisciplinaSpan.textContent = sessionInfo.disciplina || '--';
             statsResolvedSpan.textContent = `${sessionInfo.answeredCount} / ${sessionInfo.totalQuestions}`;
             statsCorrectSpan.textContent = sessionInfo.correctCount;
             const percentage = sessionInfo.answeredCount > 0 ? Math.round((sessionInfo.correctCount / sessionInfo.answeredCount) * 100) : 0;
             statsPercentageSpan.textContent = `${percentage}%`;
             const canFinish = (elapsedTime > 0 || sessionInfo.answeredCount > 0) && (sessionInfo.totalQuestions > 0 || elapsedTime > 0);
             finishBtn.disabled = !canFinish;
        }

        let localStorageFullErrorOccurred = false;
        function handleFinishSession() {
            if (sessionInfo.answeredCount === 0 && elapsedTime < 1000) {
                mostrarTimerFeedback("Responda ao menos uma questão ou estude por mais tempo para salvar.", "erro");
                 finishBtn.disabled = false; return;
            }
            const finalElapsedTimeMs = elapsedTime;
            const tempoEmMinutos = (finalElapsedTimeMs > 5000 || sessionInfo.answeredCount > 0) ? Math.max(1, Math.round(finalElapsedTimeMs / 60000)) : 0;
             if (tempoEmMinutos === 0 && sessionInfo.answeredCount === 0) {
                 mostrarTimerFeedback("Sessão muito curta e sem respostas. Nada foi salvo.", "erro");
                 finishBtn.disabled = false; return;
             }
            const tempoMedioMs = sessionInfo.answeredCount > 0 ? Math.round(finalElapsedTimeMs / sessionInfo.answeredCount) : 0;
            const summaryRecord = {
                disciplina: sessionInfo.disciplina || "Indefinida", tempo: tempoEmMinutos, questoes: sessionInfo.answeredCount,
                acertos: sessionInfo.correctCount, data: new Date().toISOString(), tempoMedioMs: tempoMedioMs,
                totalQuestoesSimulado: sessionInfo.totalQuestions
            };
            console.log("Salvando resumo da sessão:", summaryRecord);
            finishBtn.disabled = true;
            if (saveSessionSummary(summaryRecord)) {
                mostrarTimerFeedback("Resumo da sessão salvo com sucesso!", "sucesso");
                setTimeout(() => {
                     resetTimerAndStats(); // Reseta após salvar
                     // Mantém o painel aberto após salvar (não minimiza mais automaticamente)
                     // if (timerPopupContainer.classList.contains('level-1')) {
                     //      timerPopupContainer.classList.remove('level-1');
                     //      timerPopupContainer.classList.add('level-2');
                     // }
                }, 1800);
            } else {
                 mostrarTimerFeedback("Erro ao salvar o resumo. Tente novamente.", "erro");
                 if (!localStorageFullErrorOccurred) { finishBtn.disabled = false; }
            }
        }
        function saveSessionSummary(record) { /* ...código original sem mudanças... */
             localStorageFullErrorOccurred = false;
            try {
                let allResults = []; const storedResults = localStorage.getItem(RESULTS_STORAGE_KEY);
                if (storedResults) { try { allResults = JSON.parse(storedResults); if (!Array.isArray(allResults)) { allResults = []; } } catch (parseError) { allResults = []; } }
                allResults.push(record); localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(allResults)); return true;
            } catch (storageError) {
                console.error(`Erro ao salvar em '${RESULTS_STORAGE_KEY}':`, storageError);
                if (storageError.name === 'QuotaExceededError' || storageError.name === 'NS_ERROR_DOM_QUOTA_REACHED') { mostrarTimerFeedback("Erro: Armazenamento local cheio. Não foi possível salvar.", "erro"); localStorageFullErrorOccurred = true; }
                return false;
            }
        }
        function mostrarTimerFeedback(mensagem, tipo = 'sucesso') { /* ...código original sem mudanças... */
           feedbackDiv.textContent = mensagem; feedbackDiv.className = `popup-feedback ${tipo}`; feedbackDiv.style.display = 'block';
            if (tipo !== 'erro' || !localStorageFullErrorOccurred) {
                 const displayTime = tipo === 'erro' ? 5000 : 4000; setTimeout(() => { if (feedbackDiv.textContent === mensagem) { feedbackDiv.style.display = 'none'; } }, displayTime);
           }
        }

        // --- Event Listeners Internos do Popup ---
        if (timerPopupContainer && timerPopupHeader && timerPopupDragHandle && pauseBtn && resumeBtn && finishBtn) {
            // Abrir Gaveta
            timerPopupHeader.addEventListener("click", () => {
                if (timerPopupContainer.classList.contains('level-2')) {
                    timerPopupContainer.classList.remove('level-2');
                    timerPopupContainer.classList.add('level-1');
                    feedbackDiv.style.display = 'none';
                }
             });
            // Lógica de Arrastar (sem alterações)
            let isDragging = false; let startY = 0; let currentY = 0; let deltaY = 0; const dragThreshold = 180; const getClientY = (event) => { /* ...código original sem mudanças... */ if (event.touches && event.touches.length > 0) return event.touches[0].clientY; if (event.changedTouches && event.changedTouches.length > 0) return event.changedTouches[0].clientY; return event.clientY; }; const handleDragStart = (event) => { /* ...código original sem mudanças... */ if (!timerPopupContainer.classList.contains('level-1')) return; isDragging = true; startY = getClientY(event); deltaY = 0; timerPopupContainer.style.transition = 'none'; document.addEventListener('mousemove', handleDragMove); document.addEventListener('touchmove', handleDragMove, { passive: false }); document.addEventListener('mouseup', handleDragEnd); document.addEventListener('touchend', handleDragEnd); document.addEventListener('mouseleave', handleDragEnd); if (event.type === 'touchstart') {} else { event.preventDefault(); } }; const handleDragMove = (event) => { /* ...código original sem mudanças... */ if (!isDragging) return; event.preventDefault(); currentY = getClientY(event); deltaY = currentY - startY; if (deltaY > 0) { timerPopupContainer.style.transform = `translateY(${deltaY}px)`; } else { timerPopupContainer.style.transform = 'translateY(0px)'; } }; const handleDragEnd = (event) => { /* ...código original sem mudanças... */ if (!isDragging) return; isDragging = false; timerPopupContainer.style.transition = ''; timerPopupContainer.style.transform = ''; if (deltaY > dragThreshold) { timerPopupContainer.classList.remove('level-1'); timerPopupContainer.classList.add('level-2'); feedbackDiv.style.display = 'none'; } document.removeEventListener('mousemove', handleDragMove); document.removeEventListener('touchmove', handleDragMove); document.removeEventListener('mouseup', handleDragEnd); document.removeEventListener('touchend', handleDragEnd); document.removeEventListener('mouseleave', handleDragEnd); };
            timerPopupDragHandle.addEventListener('mousedown', handleDragStart);
            timerPopupDragHandle.addEventListener('touchstart', handleDragStart, { passive: false });
            // Controles do Timer
            pauseBtn.addEventListener("click", pauseTimerInternal);
            resumeBtn.addEventListener("click", resumeTimerInternal);
            // Botão Finalizar (alterado na versão anterior, mantido)
            finishBtn.addEventListener("click", () => {
                if (isRunning) { mostrarTimerFeedback("Necessário parar o cronômetro para finalizar.", "erro"); console.log("Tentativa de finalizar com timer ativo."); return; }
                handleFinishSession();
            });
            resetTimerAndStats();
        } else { console.error("Elementos essenciais do Timer Popup não encontrados."); }

        // --- API Exposta para ser chamada por Simulados.js ---
        window.timerPopupAPI = {
            startSession: (totalQuestions, disciplina) => {
                console.log("timerPopupAPI: Iniciando sessão...", { totalQuestions, disciplina });
                resetTimerAndStats(); // OK
                sessionInfo.totalQuestions = totalQuestions; // OK
                sessionInfo.disciplina = disciplina; // OK
                updateStatsDisplay(); // OK

                // ### CORREÇÃO: Bloco que abria o painel foi REMOVIDO daqui ###

                // Apenas reseta estilos de drag se houver
                timerPopupContainer.style.transition = '';
                timerPopupContainer.style.transform = '';

                startTimerInternal(); // OK: Inicia contagem
                feedbackDiv.style.display = 'none'; // OK: Esconde feedback antigo
                console.log("timerPopupAPI: startSession executado sem forçar abertura do painel."); // Log confirmação
            },
            updateStats: (answered, correct) => { /* ...código original sem mudanças... */
                 sessionInfo.answeredCount = answered; sessionInfo.correctCount = correct; updateStatsDisplay();
            },
            resetAndClose: () => { /* ...código original sem mudanças... */
                console.log("timerPopupAPI: Resetando e fechando..."); resetTimerAndStats();
                if (timerPopupContainer.classList.contains('level-1')) { timerPopupContainer.classList.remove('level-1'); timerPopupContainer.classList.add('level-2'); }
                timerPopupContainer.style.transition = ''; timerPopupContainer.style.transform = '';
             },
             stopTimer: () => { /* ...código original sem mudanças... */
                console.log("timerPopupAPI: Chamando stopTimer (pauseTimerInternal)"); pauseTimerInternal();
             },
             openPanel: () => { /* ...código original sem mudanças... */
                console.log("timerPopupAPI: Chamando openPanel");
                if (timerPopupContainer && timerPopupContainer.classList.contains('level-2')) {
                     timerPopupContainer.classList.remove('level-2'); timerPopupContainer.classList.add('level-1');
                     feedbackDiv.style.display = 'none'; timerPopupContainer.style.transition = ''; timerPopupContainer.style.transform = '';
                }
             },
             getDuration: () => { // Função para retornar o tempo decorrido em ms
                const currentElapsedTime = isRunning ? elapsedTime + (Date.now() - startTime) : elapsedTime;
                console.log("timerPopupAPI: getDuration chamado, retornando:", currentElapsedTime);
                return currentElapsedTime; // Ou { ms: currentElapsedTime } se preferir objeto
             },
             isTimerRunning: () => { /* ...código original sem mudanças... */
                return isRunning;
             }
        };
        // --- Fim da API Exposta ---

    } // Fim do if (!document.getElementById(popupId))

}); // Fim do DOMContentLoaded
