document.addEventListener("DOMContentLoaded", () => {

    const isHomePage = window.location.pathname === "/" || window.location.pathname.endsWith("/index.html") || window.location.pathname.endsWith("/"); // Ajustado para /
    const initialState = 'level-2';

    if (!document.getElementById("popupContainer")) {
        const popupHTML = `
            <div id="popupContainer" class="popup-container ${initialState}">
                <div id="popupHeader" class="popup-header">
                     <span id="popupTitle">Registrar Estudo</span>
                </div>
                <div class="popup-content-wrapper">
                    <button id="popupCloseBtn" class="popup-close-btn">&times;</button>
                    <form id="formRegistroPopup">
                        <h2>Registrar Sessão de Estudo</h2>
                        <div class="popup-form-grupo">
                            <label for="popupDisciplinaSelect">Disciplina:</label>
                            <select id="popupDisciplinaSelect" name="disciplina" required>
                                <option value="">-- Selecione --</option>
                            </select>
                        </div>
                        <div class="popup-form-grupo">
                            <label for="popupTempoInput">Tempo Gasto (minutos):</label>
                            <input type="number" id="popupTempoInput" name="tempo" min="1" placeholder="Ex: 60" required inputmode="numeric" pattern="[0-9]*">
                        </div>
                        <div class="popup-form-grupo-inline">
                            <div class="popup-form-grupo">
                                <label for="popupQuestoesInput">Questões Resolvidas:</label>
                                <input type="number" id="popupQuestoesInput" name="questoes" min="0" placeholder="Ex: 10" required inputmode="numeric" pattern="[0-9]*">
                            </div>
                            <div class="popup-form-grupo">
                                <label for="popupAcertosInput">Acertos:</label>
                                <input type="number" id="popupAcertosInput" name="acertos" min="0" placeholder="Ex: 8" required inputmode="numeric" pattern="[0-9]*">
                            </div>
                        </div>
                        <button type="submit" id="popupRegisterBtn" class="popup-btn">Registrar Sessão</button>
                        <div id="popupFeedback" class="popup-feedback"></div>
                    </form>
                </div>
            </div>`;
        document.body.insertAdjacentHTML("beforeend", popupHTML);

        if (!document.getElementById("popupStyles")) {
            const style = document.createElement('style');
            style.id = 'popupStyles';
            style.innerHTML = `
.popup-container {
    position: fixed; bottom: 0; left: 0; width: 100vw; height: 100vh; z-index: 1000;
    transition: transform 0.4s ease-in-out; background-color: #ffffff; display: flex; flex-direction: column;
    font-family: 'Montserrat', sans-serif; box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.1); overflow: hidden;
    border-top-left-radius: 32px; border-top-right-radius: 32px;
}
.popup-container.level-2 { transform: translateY(calc(100% - 50px)); box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1); }
.popup-container.level-2 .popup-header {
    height: 50px; padding: 0 20px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; background-color: #f8f8f8; border-top: 1px solid #e0e0e0; width: 100%; flex-shrink: 0; border-radius: 0;
}
.popup-container.level-2 .popup-header #popupTitle { font-weight: 600; color: #474c5f; font-size: 1rem; }
.popup-container.level-2 .popup-content-wrapper { display: none; flex-grow: 1; }
.popup-container.level-1 { transform: translateY(0); box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.15); }
.popup-container.level-1 .popup-header { display: none; }
.popup-container.level-1 .popup-content-wrapper {
    display: flex; flex-direction: column; align-items: center; flex-grow: 1; overflow-y: auto;
    padding: 20px 30px 30px 30px; position: relative; padding-top: 50px;
}
.popup-container.level-1 #formRegistroPopup { width: 100%; max-width: 600px; }
.popup-close-btn {
    position: absolute; top: 15px; right: 20px; background: none; border: none; font-size: 2.2rem; color: #aaa;
    cursor: pointer; line-height: 1; padding: 0; z-index: 10;
}
.popup-close-btn:hover { color: #555; }
#formRegistroPopup h2 { text-align: center; margin-bottom: 25px; color: #333; font-weight: 600; }
.popup-form-grupo { margin-bottom: 15px; }
.popup-form-grupo label { display: block; margin-bottom: 6px; font-weight: 500; color: #444; font-size: 0.9em; }
.popup-form-grupo input[type="number"], .popup-form-grupo select {
    width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; font-family: inherit; font-size: 1em;
}
.popup-form-grupo input:focus, .popup-form-grupo select:focus { border-color: #6735bc; outline: none; box-shadow: 0 0 0 3px rgba(103, 53, 188, 0.15); }
.popup-form-grupo-inline { display: flex; gap: 15px; margin-bottom: 15px;}
.popup-form-grupo-inline .popup-form-grupo { flex: 1; margin-bottom: 0;}
.popup-btn {
    display: block; width: 100%; padding: 14px; background-color: #6735bc; color: white; border: none; border-radius: 6px;
    font-size: 1.1em; font-weight: 600; cursor: pointer; transition: background-color 0.2s ease; text-align: center;
    font-family: inherit; margin-top: 10px;
}
.popup-btn:hover { background-color: #562da4; }
.popup-btn:active { background-color: #452482; }
.popup-feedback { margin-top: 15px; padding: 10px; border-radius: 4px; text-align: center; font-size: 0.95em; display: none; }
.popup-feedback.sucesso { background-color: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
.popup-feedback.erro { background-color: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
@media (max-width: 600px) {
    .popup-container.level-1 .popup-content-wrapper { padding: 15px 20px 20px 20px; padding-top: 45px; }
    #formRegistroPopup h2 { font-size: 1.3em; }
    .popup-form-grupo-inline { flex-direction: column; gap: 15px; }
}
            `;
            document.head.appendChild(style);
        }

        const popupContainer = document.getElementById("popupContainer");
        const popupHeader = document.getElementById("popupHeader");
        const popupCloseBtn = document.getElementById("popupCloseBtn");
        const formRegistroPopup = document.getElementById("formRegistroPopup");
        const disciplinaSelect = document.getElementById("popupDisciplinaSelect");
        const tempoInput = document.getElementById("popupTempoInput");
        const questoesInput = document.getElementById("popupQuestoesInput");
        const acertosInput = document.getElementById("popupAcertosInput");
        const feedbackDiv = document.getElementById("popupFeedback");
        const registerBtn = document.getElementById("popupRegisterBtn"); // Referência adicionada

        function carregarDisciplinasPopup() {
            try {
                const disciplinasSalvas = JSON.parse(localStorage.getItem('disciplinas')) || [];
                disciplinaSelect.options.length = 1;
                if (disciplinasSalvas.length === 0) {
                    disciplinaSelect.disabled = true;
                    if (disciplinaSelect.options.length === 1) {
                        const option = document.createElement('option');
                        option.textContent = "Nenhuma disciplina registrada";
                        option.disabled = true;
                        disciplinaSelect.appendChild(option);
                        disciplinaSelect.selectedIndex = 1;
                    }
                } else {
                    disciplinaSelect.disabled = false;
                    disciplinaSelect.selectedIndex = 0;
                    disciplinasSalvas.forEach(disciplina => {
                        const option = document.createElement('option');
                        option.value = disciplina.nome;
                        option.textContent = disciplina.nome;
                        disciplinaSelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.error("Erro ao carregar disciplinas:", error);
                if (typeof mostrarFeedbackPopup === 'function') { // Verifica se a função existe
                     mostrarFeedbackPopup("Erro ao carregar disciplinas.", "erro");
                }
                disciplinaSelect.disabled = true;
            }
        }

        function mostrarFeedbackPopup(mensagem, tipo = 'sucesso') {
           feedbackDiv.textContent = mensagem;
           feedbackDiv.className = `popup-feedback ${tipo}`;
           feedbackDiv.style.display = 'block';
           setTimeout(() => { feedbackDiv.style.display = 'none'; }, 4000);
        }

        function registrarSessaoCompleta(event) {
             event.preventDefault();
             feedbackDiv.style.display = 'none';
             if(registerBtn) registerBtn.disabled = true; // Desabilita botão

             const nomeDisciplina = disciplinaSelect.value;
             const tempoStr = tempoInput.value.trim();
             const questoesStr = questoesInput.value.trim();
             const acertosStr = acertosInput.value.trim();

             if (!nomeDisciplina) {
                 mostrarFeedbackPopup("Erro: Selecione uma disciplina.", 'erro');
                 if(registerBtn) registerBtn.disabled = false; return;
             }
             if (tempoStr === '' || isNaN(parseInt(tempoStr)) || parseInt(tempoStr) <= 0) {
                 mostrarFeedbackPopup("Erro: Tempo gasto inválido.", 'erro');
                 if(registerBtn) registerBtn.disabled = false; return;
             }
             if (questoesStr === '' || isNaN(parseInt(questoesStr)) || parseInt(questoesStr) < 0) {
                 mostrarFeedbackPopup("Erro: Número de questões inválido.", 'erro');
                 if(registerBtn) registerBtn.disabled = false; return;
             }
              if (acertosStr === '' || isNaN(parseInt(acertosStr)) || parseInt(acertosStr) < 0) {
                 mostrarFeedbackPopup("Erro: Número de acertos inválido.", 'erro');
                 if(registerBtn) registerBtn.disabled = false; return;
             }

             const tempo = parseInt(tempoStr);
             const questoes = parseInt(questoesStr);
             const acertos = parseInt(acertosStr);

             if (acertos > questoes) {
                 mostrarFeedbackPopup("Erro: Acertos não podem ser maior que questões.", 'erro');
                 if(registerBtn) registerBtn.disabled = false; return;
             }

             const novaSessao = {
                disciplina: nomeDisciplina,
                tempo: tempo,
                questoes: questoes,
                acertos: acertos,
                data: new Date().toISOString()
             };

             try {
                 const sessoesSalvas = JSON.parse(localStorage.getItem('sessoesEstudo')) || [];
                 sessoesSalvas.push(novaSessao);
                 localStorage.setItem('sessoesEstudo', JSON.stringify(sessoesSalvas));

                 // *** ADICIONADO: Chama a função de atualização da home page ***
                 if (window.appContext && typeof window.appContext.atualizarTudo === 'function') {
                    console.log("Popup: Chamando appContext.atualizarTudo()");
                    window.appContext.atualizarTudo();
                 } else {
                    console.warn("Popup: appContext.atualizarTudo não encontrada. Gráficos não serão atualizados automaticamente.");
                 }
                 // *** FIM DA ADIÇÃO ***

                 mostrarFeedbackPopup("Sessão registrada com sucesso!", 'sucesso');
                 formRegistroPopup.reset();
                 disciplinaSelect.selectedIndex = 0;

                  setTimeout(() => {
                      if (popupContainer && popupContainer.classList.contains('level-1')) {
                        popupContainer.classList.remove('level-1');
                        popupContainer.classList.add('level-2');
                        if(feedbackDiv) feedbackDiv.style.display = 'none';
                      }
                  }, 1500);

             } catch (error) {
                console.error("Erro ao salvar sessão no localStorage:", error);
                mostrarFeedbackPopup("Erro ao salvar sessão localmente.", 'erro');
             } finally {
                 if(registerBtn) registerBtn.disabled = false; // Reabilita botão
             }
        }

        if (popupContainer && popupHeader && popupCloseBtn && formRegistroPopup) {
            popupHeader.addEventListener("click", () => {
                if (popupContainer.classList.contains('level-2')) {
                    carregarDisciplinasPopup();
                    popupContainer.classList.remove('level-2');
                    popupContainer.classList.add('level-1');
                    if(feedbackDiv) feedbackDiv.style.display = 'none';
                }
            });
            popupCloseBtn.addEventListener("click", () => {
                 if (popupContainer.classList.contains('level-1')) {
                    popupContainer.classList.remove('level-1');
                    popupContainer.classList.add('level-2');
                    if(feedbackDiv) feedbackDiv.style.display = 'none';
                }
            });
            formRegistroPopup.addEventListener("submit", registrarSessaoCompleta);

            const restrictToNumbers = (event) => { event.target.value = event.target.value.replace(/[^0-9]/g, ''); };
            if(tempoInput) tempoInput.addEventListener("input", restrictToNumbers);
            if(questoesInput) questoesInput.addEventListener("input", restrictToNumbers);
            if(acertosInput) acertosInput.addEventListener("input", restrictToNumbers);
        } else {
            console.error("Elementos essenciais do Popup (gaveta) não encontrados.");
        }
    }

});
