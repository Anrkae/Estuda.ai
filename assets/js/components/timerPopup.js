// assets/js/components/timerPopup.js

document.addEventListener("DOMContentLoaded", () => {
    const popupId = "timerPopupContainer";
    const styleId = "timerPopupStyles";
    const initialState = 'level-2'; // Começa minimizado
    const RESULTS_STORAGE_KEY = 'sessoesEstudo'; // Chave para salvar resumos no localStorage

    // Só cria o popup se ele não existir
    if (!document.getElementById(popupId)) {
        // --- HTML do Popup ---
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

        // --- CSS do Popup ---
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
/* Estilos base do container e header */
#${popupId} {
    position: fixed; bottom: 0; left: 0; width: 100vw; height: 100vh; z-index: 100;
    /* A transição padrão é definida aqui */
    transition: transform 0.4s ease-in-out;
    background-color: #ffffff; display: flex; flex-direction: column;
    font-family: 'Montserrat', sans-serif; box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.1); overflow: hidden;
    border-top-left-radius: 32px; border-top-right-radius: 32px;
}
#${popupId}.level-2 { transform: translateY(calc(100% - 50px)); box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1); }
#${popupId}.level-2 #timerPopupHeader {
    height: 50px; padding: 0 20px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; background-color: #f8f8f8; border-top: 1px solid #e0e0e0; width: 100%; flex-shrink: 0; border-radius: 0;
}
#${popupId}.level-2 #timerPopupTitle { font-weight: 600; color: #2C2C2C; font-size: 1rem; }
#${popupId}.level-2 .popup-content-wrapper { display: none; }

#${popupId}.level-1 { transform: translateY(0); box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.15); }
#${popupId}.level-1 #timerPopupHeader { display: none; }
#${popupId}.level-1 .popup-content-wrapper {
    display: flex; flex-direction: column; align-items: center; flex-grow: 1; overflow-y: auto;
    padding: 20px 30px 30px 30px; position: relative; padding-top: 35px; /* Espaço para handle */
}
#${popupId}.level-1 #timerContent { width: 100%; max-width: 450px; text-align: center; }

/* Handle de arrastar */
#${popupId} .popup-drag-handle {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    background: none;
    border: none;
    font-size: 0.8rem;
    color: #888;
    opacity: 0.7;
    cursor: ns-resize;
    padding: 8px 15px;
    z-index: 10;
    transition: opacity 0.2s ease, color 0.2s ease;
    white-space: nowrap;
    font-family: 'Montserrat', sans-serif;
    font-weight: 400;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    touch-action: none;
}
#${popupId} .popup-drag-handle:hover {
    color: #444;
    opacity: 1;
}

/* Estilos Timer e Conteúdo */
 h2 { top: 10px; margin-top: 0; margin-bottom: 25px; font-size: 1.3em; color: #444; font-weight: 600; padding-bottom: 0; display: flex; align-items: center;
 }
#timerContent h2 i { margin-right: 8px; color: #555; }
#timerDisplay {
    font-size: 3em; color: #333; margin-bottom: 15px; font-weight: 500;
    font-family: 'Courier New', Courier, monospace; background-color: #f0f0f0;
    padding: 8px 15px; border-radius: 8px; display: inline-block; min-width: 180px;
}
#Cronometro {
    margin-top: 30px;
    margin-bottom: 25px; padding: 15px 20px; background-color: #f9f9f9;
    border-radius: 8px; border: 1px solid #eee; text-align: center;
}
#timerControls { display: flex; justify-content: center; gap: 15px; margin-bottom: 25px; }
#timerSessionStats {
    margin-bottom: 25px; padding: 15px 20px; background-color: #f9f9f9;
    border-radius: 8px; border: 1px solid #eee; text-align: left;
}
h3 {
    margin-top: 0; margin-bottom: 15px; font-size: 1.1em; color: #444; font-weight: 600;
    border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; display: flex; align-items: center; gap: 8px;
}
h3 i { color: #666; }
#timerSessionStats p { margin: 10px 0; font-size: 1em; color: #555; }
#timerSessionStats span { font-weight: 600; color: #222; margin-left: 5px; }
#timerSessionStats span.percentage { color: #007bff; }
.timer-btn {
    padding: 10px 20px; font-size: 1em; font-weight: 500; border: none;
    border-radius: 6px; cursor: pointer; transition: all 0.2s ease;
    min-width: 110px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
}
.timer-btn i { font-size: 1em; line-height: 1; }
.timer-btn:disabled { background-color: #d0d0d0 !important; color: #888 !important; cursor: not-allowed; opacity: 0.7; }
.timer-btn.pause { background-color: #ff9800; color: white; }
.timer-btn.pause:hover:not(:disabled) { background-color: #f57c00; }
.timer-btn.resume { background-color: #4CAF50; color: white; }
.timer-btn.resume:hover:not(:disabled) { background-color: #45a049; }
.timer-btn.finish {
    background-color: #007bff; color: white; width: 100%; margin-top: 10px;
    padding: 12px; font-size: 1.1em; font-weight: 600;
}
.timer-btn.finish:hover:not(:disabled) { background-color: #0056b3; }
.timer-btn.finish i { margin-right: 10px; }
#timerFeedback { margin-top: 15px; padding: 10px; border-radius: 4px; text-align: center; font-size: 0.95em; display: none; }
#timerFeedback.sucesso { background-color: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
#timerFeedback.erro { background-color: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }

/* Responsividade */
@media (max-width: 600px) {
    #${popupId}.level-1 .popup-content-wrapper { padding: 15px 20px 20px 20px; padding-top: 35px; }
    #timerContent h2 { font-size: 1.2em; }
    #timerDisplay { font-size: 2.5em; }
    #timerSessionStats h3 { font-size: 1em; }
    #timerSessionStats p { font-size: 0.9em; }
    .timer-btn { padding: 8px 15px; font-size: 0.95em; min-width: 90px; }
    .timer-btn.finish { font-size: 1em; }
    #${popupId} .popup-drag-handle { font-size: 0.75rem; top: 6px;}
}
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
            finishBtn.disabled = sessionInfo.answeredCount === 0;
        }
        function pauseTimerInternal() {
            if (!isRunning) return;
            isRunning = false;
            isPaused = true;
            clearInterval(timerInterval);
            elapsedTime += Date.now() - startTime;
            pauseBtn.disabled = true;
            resumeBtn.disabled = false;
            finishBtn.disabled = sessionInfo.answeredCount === 0;
            updateDisplay();
        }
        function resumeTimerInternal() {
             if (isRunning || !isPaused) return;
             startTimerInternal();
        }
        function resetTimerAndStats() {
             isRunning = false;
             isPaused = false;
             clearInterval(timerInterval);
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
             // Garante que o popup esteja na posição correta ao resetar
             timerPopupContainer.style.transition = ''; // Garante transição ativa
             timerPopupContainer.style.transform = ''; // Garante sem transform inline
        }

        // --- Funções de Controle da Sessão e Stats ---
        function updateStatsDisplay() {
             statsDisciplinaSpan.textContent = sessionInfo.disciplina || '--';
             statsResolvedSpan.textContent = `${sessionInfo.answeredCount} / ${sessionInfo.totalQuestions}`;
             statsCorrectSpan.textContent = sessionInfo.correctCount;
             const percentage = sessionInfo.answeredCount > 0
                 ? Math.round((sessionInfo.correctCount / sessionInfo.answeredCount) * 100)
                 : 0;
             statsPercentageSpan.textContent = `${percentage}%`;
             finishBtn.disabled = sessionInfo.answeredCount === 0 || isRunning;
        }

        let localStorageFullErrorOccurred = false;
        function handleFinishSession() {
            if (sessionInfo.answeredCount === 0 && elapsedTime < 1000) {
                mostrarTimerFeedback("Responda ao menos uma questão ou estude por mais tempo para salvar.", "erro");
                return;
            }
            if (isRunning) {
                 pauseTimerInternal();
            }
            const finalElapsedTimeMs = elapsedTime;
            const tempoEmMinutos = (finalElapsedTimeMs > 5000 || sessionInfo.answeredCount > 0) ? Math.max(1, Math.round(finalElapsedTimeMs / 60000)) : 0;

             if (tempoEmMinutos === 0 && sessionInfo.answeredCount === 0) {
                 mostrarTimerFeedback("Sessão muito curta e sem respostas. Nada foi salvo.", "erro");
                 return;
             }
            const tempoMedioMs = sessionInfo.answeredCount > 0 ? Math.round(finalElapsedTimeMs / sessionInfo.answeredCount) : 0;
            const summaryRecord = {
                disciplina: sessionInfo.disciplina || "Indefinida",
                tempo: tempoEmMinutos,
                questoes: sessionInfo.answeredCount,
                acertos: sessionInfo.correctCount,
                data: new Date().toISOString(),
                tempoMedioMs: tempoMedioMs,
                totalQuestoesSimulado: sessionInfo.totalQuestions
            };

            console.log("Salvando resumo da sessão:", summaryRecord);
            finishBtn.disabled = true;

            if (saveSessionSummary(summaryRecord)) {
                mostrarTimerFeedback("Resumo da sessão salvo com sucesso!", "sucesso");
                setTimeout(() => {
                     resetTimerAndStats();
                     // Garante que feche após salvar
                     if (timerPopupContainer.classList.contains('level-1')) {
                          timerPopupContainer.classList.remove('level-1');
                          timerPopupContainer.classList.add('level-2');
                     }
                }, 1800);
            } else {
                 mostrarTimerFeedback("Erro ao salvar o resumo. Tente novamente.", "erro");
                 if (!localStorageFullErrorOccurred) {
                     finishBtn.disabled = false;
                 }
            }
        }

        function saveSessionSummary(record) {
             localStorageFullErrorOccurred = false;
            try {
                let allResults = [];
                const storedResults = localStorage.getItem(RESULTS_STORAGE_KEY);
                if (storedResults) {
                    try {
                        allResults = JSON.parse(storedResults);
                        if (!Array.isArray(allResults)) {
                            console.warn(`Dado em '${RESULTS_STORAGE_KEY}' não era array. Resetando.`);
                            allResults = [];
                        }
                    } catch (parseError) {
                        console.error(`Erro ao parsear '${RESULTS_STORAGE_KEY}':`, parseError);
                        allResults = [];
                    }
                }
                allResults.push(record);
                localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(allResults));
                return true;
            } catch (storageError) {
                console.error(`Erro ao salvar em '${RESULTS_STORAGE_KEY}':`, storageError);
                if (storageError.name === 'QuotaExceededError' || storageError.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                     mostrarTimerFeedback("Erro: Armazenamento local cheio. Não foi possível salvar.", "erro");
                     localStorageFullErrorOccurred = true;
                }
                return false;
            }
        }

        function mostrarTimerFeedback(mensagem, tipo = 'sucesso') {
           feedbackDiv.textContent = mensagem;
           feedbackDiv.className = `popup-feedback ${tipo}`;
           feedbackDiv.style.display = 'block';
            if (tipo !== 'erro' || !localStorageFullErrorOccurred) {
                 const displayTime = tipo === 'erro' ? 5000 : 4000;
                 setTimeout(() => {
                    if (feedbackDiv.textContent === mensagem) {
                         feedbackDiv.style.display = 'none';
                    }
                 }, displayTime);
           }
        }


        // --- Event Listeners Internos do Popup ---
        if (timerPopupContainer && timerPopupHeader && timerPopupDragHandle && pauseBtn && resumeBtn && finishBtn) {

            // Abrir Gaveta (Clicando no Header quando minimizado)
            timerPopupHeader.addEventListener("click", () => {
                if (timerPopupContainer.classList.contains('level-2')) {
                    timerPopupContainer.classList.remove('level-2');
                    timerPopupContainer.classList.add('level-1');
                    feedbackDiv.style.display = 'none';
                }
             });

            // **** LÓGICA DE ARRASTAR PARA MINIMIZAR (COM FEEDBACK VISUAL) ****
            let isDragging = false;
            let startY = 0;
            let currentY = 0;
            let deltaY = 0;
            // **** MODIFICAÇÃO AQUI: Aumentando o threshold ****
            const dragThreshold = 180; // Distância mínima em pixels para minimizar (AUMENTADA)
            // **** FIM DA MODIFICAÇÃO ****

            const getClientY = (event) => {
                // Verifica se é um evento de toque e se há toques registrados
                if (event.touches && event.touches.length > 0) {
                    return event.touches[0].clientY;
                }
                // Verifica se é um evento de mudança de toque e se há toques alterados
                 if (event.changedTouches && event.changedTouches.length > 0) {
                    return event.changedTouches[0].clientY;
                 }
                 // Senão, assume que é um evento de mouse
                return event.clientY;
            };


            const handleDragStart = (event) => {
                if (!timerPopupContainer.classList.contains('level-1')) return;

                isDragging = true;
                startY = getClientY(event);
                deltaY = 0;

                // Desabilita a transição durante o arraste
                timerPopupContainer.style.transition = 'none';

                document.addEventListener('mousemove', handleDragMove);
                document.addEventListener('touchmove', handleDragMove, { passive: false });
                document.addEventListener('mouseup', handleDragEnd);
                document.addEventListener('touchend', handleDragEnd);
                document.addEventListener('mouseleave', handleDragEnd); // Importante para mouse

                if (event.type === 'touchstart') {
                    // passive: false no listener de touchmove já deve prevenir scroll
                } else {
                     event.preventDefault(); // Prevenir seleção de texto no mouse
                }
            };

            const handleDragMove = (event) => {
                if (!isDragging) return;

                 // Previne scroll da página enquanto arrasta (especialmente no touch)
                event.preventDefault();

                currentY = getClientY(event);
                deltaY = currentY - startY;

                // Aplica o transform APENAS se movendo para baixo
                if (deltaY > 0) {
                    timerPopupContainer.style.transform = `translateY(${deltaY}px)`;
                } else {
                    // Se tentar arrastar para cima, mantém na posição original (0)
                    timerPopupContainer.style.transform = 'translateY(0px)';
                }
            };

            const handleDragEnd = (event) => {
                if (!isDragging) return;
                isDragging = false;

                // Pega a posição final caso seja touchend
                // currentY já foi atualizado no último move, mas para garantir:
                // deltaY já contém a diferença total do arraste

                // Reabilita a transição ANTES de mudar classe/resetar
                timerPopupContainer.style.transition = '';

                // Remove o transform inline para a transição funcionar corretamente
                timerPopupContainer.style.transform = '';

                // Minimiza se arrastou para baixo o suficiente
                if (deltaY > dragThreshold) {
                    timerPopupContainer.classList.remove('level-1');
                    timerPopupContainer.classList.add('level-2');
                    feedbackDiv.style.display = 'none';
                }
                // Se não minimizou, a remoção do transform e a classe 'level-1'
                // fazem ele voltar para translateY(0) com a transição CSS.

                // Remove listeners globais
                document.removeEventListener('mousemove', handleDragMove);
                document.removeEventListener('touchmove', handleDragMove);
                document.removeEventListener('mouseup', handleDragEnd);
                document.removeEventListener('touchend', handleDragEnd);
                document.removeEventListener('mouseleave', handleDragEnd);
            };

            // Adiciona os listeners iniciais ao handle
            timerPopupDragHandle.addEventListener('mousedown', handleDragStart);
            timerPopupDragHandle.addEventListener('touchstart', handleDragStart, { passive: false });

            // **** FIM DA LÓGICA DE ARRASTAR ****

            // Controles do Timer
            pauseBtn.addEventListener("click", pauseTimerInternal);
            resumeBtn.addEventListener("click", resumeTimerInternal);
            finishBtn.addEventListener("click", handleFinishSession);

            // Estado inicial
            resetTimerAndStats();

        } else {
            console.error("Elementos essenciais do Timer Popup (incluindo drag handle) não encontrados no DOM.");
            console.error({ timerPopupContainer: !!timerPopupContainer, timerPopupHeader: !!timerPopupHeader, timerPopupDragHandle: !!timerPopupDragHandle, pauseBtn: !!pauseBtn, resumeBtn: !!resumeBtn, finishBtn: !!finishBtn });
        }

        // --- API Exposta para ser chamada por Simulados.js ---
        window.timerPopupAPI = {
            startSession: (totalQuestions, disciplina) => {
                console.log("timerPopupAPI: Iniciando sessão...", { totalQuestions, disciplina });
                resetTimerAndStats();
                sessionInfo.totalQuestions = totalQuestions;
                sessionInfo.disciplina = disciplina;
                updateStatsDisplay();
                // Garante que abre ao iniciar
                if (timerPopupContainer.classList.contains('level-2')) {
                    timerPopupContainer.classList.remove('level-2');
                    timerPopupContainer.classList.add('level-1');
                }
                 // Garante reset visual caso estivesse sendo arrastado antes
                timerPopupContainer.style.transition = '';
                timerPopupContainer.style.transform = '';
                startTimerInternal();
                feedbackDiv.style.display = 'none';
            },
            updateStats: (answered, correct) => {
                 sessionInfo.answeredCount = answered;
                 sessionInfo.correctCount = correct;
                 updateStatsDisplay();
            },
             resetAndClose: () => {
                console.log("timerPopupAPI: Resetando e fechando...");
                resetTimerAndStats();
                // Garante que fecha
                if (timerPopupContainer.classList.contains('level-1')) {
                     timerPopupContainer.classList.remove('level-1');
                     timerPopupContainer.classList.add('level-2');
                 }
                 // Garante reset visual
                timerPopupContainer.style.transition = '';
                timerPopupContainer.style.transform = '';
             }
        };
        // --- Fim da API Exposta ---

    } // Fim do if (!document.getElementById(popupId))

}); // Fim do DOMContentLoaded

