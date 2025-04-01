document.addEventListener("DOMContentLoaded", () => {

    // Contexto global (manter se necessário)
    /* ... */

    const isHomePage = window.location.pathname === "/" || window.location.pathname.endsWith("/index.html");
    const initialState = 'level-2'; // Começa minimizado

    // --- Cria o Popup Dinâmico (se não existir) ---
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

        // --- Injeção de CSS (com border-radius e ajuste) ---
        if (!document.getElementById("popupStyles")) {
            const style = document.createElement('style');
            style.id = 'popupStyles';
            style.innerHTML = `
/* --- Estilos Gerais do Popup --- */
.popup-container {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
    transition: transform 0.4s ease-in-out; /* Transição principal */
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    font-family: 'Montserrat', sans-serif;
    box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.1);
    overflow: hidden; /* Essencial para não vazar conteúdo antes da hora */
    border-top-left-radius: 32px;
    border-top-right-radius: 32px;
}

/* --- Estado Minimizado (level-2) --- */
.popup-container.level-2 {
    transform: translateY(calc(100% - 50px)); /* Altura do puxador */
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}
.popup-container.level-2 .popup-header {
    /* Estilo do Puxador */
    height: 50px; /* Mesma altura do translateY */
    padding: 0 20px;
    display: flex; /* Garante que está visível */
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background-color: #f8f8f8;
    border-top: 1px solid #e0e0e0;
    width: 100%;
    flex-shrink: 0;
    border-radius: 0; /* Reseta radius local se necessário */
}
 .popup-container.level-2 .popup-header #popupTitle {
    font-weight: 600;
    color: #474c5f;
    font-size: 1rem;
 }
.popup-container.level-2 .popup-content-wrapper {
    display: none; /* SIMPLESMENTE ESCONDE o conteúdo */
    flex-grow: 1; /* Ainda permite que o container pai calcule o espaço */
}

/* --- Estado Aberto (level-1) --- */
.popup-container.level-1 {
    transform: translateY(0); /* Posição aberta */
    box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.15);
}
 .popup-container.level-1 .popup-header {
     display: none; /* Esconde o puxador quando aberto */
 }
.popup-container.level-1 .popup-content-wrapper {
    display: flex; /* MOSTRA o conteúdo e usa flex para alinhamento interno */
    flex-direction: column; /* Empilha botão fechar e form */
    align-items: center; /* Centraliza o form horizontalmente */
    flex-grow: 1; /* Ocupa o espaço vertical restante */
    overflow-y: auto; /* Permite rolagem do conteúdo */
    padding: 20px 30px 30px 30px; /* Espaçamento interno */
    position: relative; /* Para posicionar o botão fechar */
    padding-top: 50px; /* Espaço acima do h2 */
}
 .popup-container.level-1 #formRegistroPopup {
     width: 100%;
     max-width: 600px; /* Largura máxima do formulário */
 }

/* --- Estilos do Formulário, Botões, Feedback, Alert (iguais) --- */
 .popup-close-btn {
    position: absolute; /* Relativo ao .popup-content-wrapper */
    top: 15px;
    right: 20px;
    background: none; border: none; font-size: 2.2rem; color: #aaa;
    cursor: pointer; line-height: 1; padding: 0; z-index: 10;
}
 .popup-close-btn:hover { color: #555; }
 #formRegistroPopup h2 { text-align: center; margin-bottom: 25px; color: #333; font-weight: 600; }
.popup-form-grupo { margin-bottom: 15px; }
.popup-form-grupo label { display: block; margin-bottom: 6px; font-weight: 500; color: #444; font-size: 0.9em; }
.popup-form-grupo input[type="number"], .popup-form-grupo select { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; font-family: inherit; font-size: 1em; }
.popup-form-grupo input:focus, .popup-form-grupo select:focus { border-color: #6735bc; outline: none; box-shadow: 0 0 0 3px rgba(103, 53, 188, 0.15); }
.popup-form-grupo-inline { display: flex; gap: 15px; margin-bottom: 15px;}
.popup-form-grupo-inline .popup-form-grupo { flex: 1; margin-bottom: 0;}
 .popup-btn { /* ... */ }
 .popup-btn:hover { /* ... */ }
 .popup-btn:active { /* ... */ }
 .popup-feedback { /* ... */ }
 .popup-feedback.sucesso { /* ... */ }
 .popup-feedback.erro { /* ... */ }
 .alert { /* ... */ }
 @media (max-width: 600px) { /* ... */ }

            `;
            document.head.appendChild(style);
        }

        // --- Lógica de Interação e Registro (JS - sem forçar transform inline no final) ---
        const popupContainer = document.getElementById("popupContainer");
        const popupHeader = document.getElementById("popupHeader");
        const popupCloseBtn = document.getElementById("popupCloseBtn");
        const formRegistroPopup = document.getElementById("formRegistroPopup");
        const disciplinaSelect = document.getElementById("popupDisciplinaSelect");
        const tempoInput = document.getElementById("popupTempoInput");
        const questoesInput = document.getElementById("popupQuestoesInput");
        const acertosInput = document.getElementById("popupAcertosInput");
        const feedbackDiv = document.getElementById("popupFeedback");

        // --- Função carregarDisciplinasPopup (igual anterior) ---
        function carregarDisciplinasPopup() {
            // (Mesmo código da função carregarDisciplinasPopup)
            const disciplinasSalvas = JSON.parse(localStorage.getItem('disciplinas')) || [];
            disciplinaSelect.options.length = 1;
            if (disciplinasSalvas.length === 0) {
                disciplinaSelect.disabled = true;
                const option = document.createElement('option');
                option.textContent = "Nenhuma disciplina registrada";
                option.disabled = true;
                disciplinaSelect.appendChild(option);
                disciplinaSelect.selectedIndex = 1;
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
        }

        // --- Função mostrarFeedbackPopup (igual anterior) ---
        function mostrarFeedbackPopup(mensagem, tipo = 'sucesso') {
           // (Mesmo código da função mostrarFeedbackPopup)
           feedbackDiv.textContent = mensagem;
           feedbackDiv.className = `popup-feedback ${tipo}`;
           feedbackDiv.style.display = 'block';
           setTimeout(() => { feedbackDiv.style.display = 'none'; }, 4000);
        }

        // --- Função registrarSessaoCompleta (igual anterior) ---
        function registrarSessaoCompleta(event) {
             // (Mesmo código da função registrarSessaoCompleta)
             event.preventDefault();
             feedbackDiv.style.display = 'none';
             // ... (validações) ...
             const nomeDisciplina = disciplinaSelect.value;
             const tempo = parseInt(tempoInput.value);
             const questoes = parseInt(questoesInput.value);
             const acertos = parseInt(acertosInput.value);
             if (!nomeDisciplina) { mostrarFeedbackPopup("Erro: Selecione uma disciplina.", 'erro'); return; }
             if (isNaN(tempo) || tempo <= 0) { mostrarFeedbackPopup("Erro: Tempo inválido.", 'erro'); return; }
             if (isNaN(questoes) || questoes < 0) { mostrarFeedbackPopup("Erro: Número de questões inválido.", 'erro'); return; }
             if (isNaN(acertos) || acertos < 0) { mostrarFeedbackPopup("Erro: Número de acertos inválido.", 'erro'); return; }
             if (acertos > questoes) { mostrarFeedbackPopup("Erro: Acertos não podem ser maior que questões.", 'erro'); return; }

             const novaSessao = { /* ... */ disciplina: nomeDisciplina, tempo: tempo, questoes: questoes, acertos: acertos, data: new Date().toISOString() };
             try {
                 const sessoesSalvas = JSON.parse(localStorage.getItem('sessoesEstudo')) || [];
                 sessoesSalvas.push(novaSessao);
                 localStorage.setItem('sessoesEstudo', JSON.stringify(sessoesSalvas));
                 mostrarFeedbackPopup("Sessão registrada com sucesso!", 'sucesso');
                 formRegistroPopup.reset();
                 disciplinaSelect.selectedIndex = 0;
                 // Opcional: Minimizar após sucesso
                  setTimeout(() => {
                      if (popupContainer.classList.contains('level-1')) {
                        popupContainer.classList.remove('level-1');
                        popupContainer.classList.add('level-2');
                        feedbackDiv.style.display = 'none';
                      }
                  }, 1500);
                 // if (atualizarResumoGlobal) atualizarResumoGlobal();
             } catch (error) { /* ... */ }
        }

        // --- Lógica de Abrir/Fechar Gaveta (igual anterior) ---
        if (popupContainer && popupHeader && popupCloseBtn && formRegistroPopup) {
            popupHeader.addEventListener("click", () => {
                if (popupContainer.classList.contains('level-2')) {
                    carregarDisciplinasPopup();
                    popupContainer.classList.remove('level-2');
                    popupContainer.classList.add('level-1');
                }
            });
            popupCloseBtn.addEventListener("click", () => {
                 if (popupContainer.classList.contains('level-1')) {
                    popupContainer.classList.remove('level-1');
                    popupContainer.classList.add('level-2');
                    feedbackDiv.style.display = 'none';
                }
            });
            formRegistroPopup.addEventListener("submit", registrarSessaoCompleta);
            // Restrição de Inputs Numéricos (igual anterior)
            const restrictToNumbers = (event) => { event.target.value = event.target.value.replace(/[^0-9]/g, ''); };
            if(tempoInput) tempoInput.addEventListener("input", restrictToNumbers);
            if(questoesInput) questoesInput.addEventListener("input", restrictToNumbers);
            if(acertosInput) acertosInput.addEventListener("input", restrictToNumbers);
        } else {
            console.error("Elementos essenciais do Popup (gaveta) não encontrados.");
        }

         // --- Função Alert Global (mantida, se necessária) ---
         // const showAlert = (message) => { /* ... */ };

        // REMOVIDO: Não forçar transform inline aqui, deixar CSS cuidar disso com base na classe inicial
        // if (initialState === 'level-1') { ... } else { ... }

    } // Fim do if (!document.getElementById("popupContainer"))

}); // Fim do DOMContentLoaded
