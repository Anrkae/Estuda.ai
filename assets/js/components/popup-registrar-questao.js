<script type="module">
  // 1. Importar funções do Firebase SDK
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js"; // Importar Auth
  import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"; // Importar Firestore

  // 2. Configuração do Firebase (fornecida por você)
  const firebaseConfig = {
    apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc", // ATENÇÃO: Considere usar variáveis de ambiente para chaves sensíveis
    authDomain: "estudaai-ddb6a.firebaseapp.com",
    projectId: "estudaai-ddb6a",
    storageBucket: "estudaai-ddb6a.firebasestorage.app",
    messagingSenderId: "974312409515",
    appId: "1:974312409515:web:ef635d71abf934241d6aee",
    measurementId: "G-9X8PNR6S6L"
  };

  // 3. Inicializar Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const auth = getAuth(app);        // Instância do Auth
  const db = getFirestore(app);     // Instância do Firestore

  // 4. Lógica do Popup quando o DOM estiver pronto
  document.addEventListener("DOMContentLoaded", () => {

    // Contexto global (manter se necessário)
    /* ... */

    // Você pode usar isso para carregar o popup apenas em certas páginas
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

        // --- Injeção de CSS (com ajustes vh/vw) ---
        if (!document.getElementById("popupStyles")) {
            const style = document.createElement('style');
            style.id = 'popupStyles';
            style.innerHTML = `
/* --- Estilos Gerais do Popup --- */
.popup-container {
    position: fixed;
    bottom: 0;
    left: 0;
    /* width: 100vw; */ /* ALTERADO */
    width: 100%;
    /* height: 100vh; */ /* ALTERADO */
    height: 100%;
    max-height: 100%; /* Adicionado para segurança */
    z-index: 1000;
    transition: transform 0.4s ease-in-out;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    font-family: 'Montserrat', sans-serif;
    box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    border-top-left-radius: 32px;
    border-top-right-radius: 32px;
}

/* --- Estado Minimizado (level-2) --- */
.popup-container.level-2 {
    transform: translateY(calc(100% - 50px)); /* Altura do puxador */
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}
.popup-container.level-2 .popup-header {
    height: 50px;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background-color: #f8f8f8;
    border-top: 1px solid #e0e0e0;
    width: 100%;
    flex-shrink: 0;
    border-radius: 0;
}
 .popup-container.level-2 .popup-header #popupTitle {
    font-weight: 600;
    color: #474c5f;
    font-size: 1rem;
 }
.popup-container.level-2 .popup-content-wrapper {
    display: none;
    flex-grow: 1;
}

/* --- Estado Aberto (level-1) --- */
.popup-container.level-1 {
    transform: translateY(0);
    box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.15);
}
 .popup-container.level-1 .popup-header {
     display: none;
 }
.popup-container.level-1 .popup-content-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-grow: 1;
    overflow-y: auto;
    padding: 20px 30px 30px 30px; /* Espaçamento interno */
    position: relative;
    padding-top: 50px; /* Espaço acima do h2 (verifique se ainda é necessário/ideal) */
}
 .popup-container.level-1 #formRegistroPopup {
     width: 100%;
     max-width: 600px; /* Largura máxima do formulário */
 }

/* --- Estilos Comuns (Formulário, Botões, Feedback, etc.) --- */
 .popup-close-btn {
    position: absolute; top: 15px; right: 20px;
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
 .popup-btn {
    display: block; width: 100%; padding: 14px; background-color: #6735bc; color: white;
    border: none; border-radius: 6px; font-size: 1.1em; font-weight: 600;
    cursor: pointer; transition: background-color 0.2s ease; text-align: center;
    font-family: inherit; margin-top: 10px;
 }
 .popup-btn:hover { background-color: #562da4; }
 .popup-btn:active { background-color: #452482; }
 .popup-feedback {
    margin-top: 15px; padding: 10px; border-radius: 4px;
    text-align: center; font-size: 0.95em; display: none;
 }
 .popup-feedback.sucesso { background-color: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
 .popup-feedback.erro { background-color: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
 /* .alert { ... }  (Se você tiver estilos globais para alert) */
 @media (max-width: 600px) {
    .popup-container.level-1 .popup-content-wrapper { padding: 15px 20px 20px 20px; padding-top: 45px; }
    #formRegistroPopup h2 { font-size: 1.3em; }
    .popup-form-grupo-inline { flex-direction: column; gap: 15px; }
 }
            `;
            document.head.appendChild(style);
        }

        // --- Referências aos Elementos do DOM ---
        const popupContainer = document.getElementById("popupContainer");
        const popupHeader = document.getElementById("popupHeader");
        const popupCloseBtn = document.getElementById("popupCloseBtn");
        const formRegistroPopup = document.getElementById("formRegistroPopup");
        const disciplinaSelect = document.getElementById("popupDisciplinaSelect");
        const tempoInput = document.getElementById("popupTempoInput");
        const questoesInput = document.getElementById("popupQuestoesInput");
        const acertosInput = document.getElementById("popupAcertosInput");
        const feedbackDiv = document.getElementById("popupFeedback");
        const registerBtn = document.getElementById("popupRegisterBtn"); // Referência ao botão

        // --- Funções Auxiliares ---

        // Função para carregar disciplinas (AINDA USA LOCALSTORAGE)
        function carregarDisciplinasPopup() {
            // !!! ATENÇÃO: Esta função ainda busca disciplinas do localStorage.
            // Se você moveu as disciplinas para o Firebase, adapte esta função
            // para buscar da coleção apropriada no Firestore.
            console.log("Carregando disciplinas do localStorage..."); // Log para debug
            try {
                const disciplinasSalvas = JSON.parse(localStorage.getItem('disciplinas')) || [];
                disciplinaSelect.options.length = 1; // Limpa opções mantendo a primeira ("-- Selecione --")
                if (disciplinasSalvas.length === 0) {
                    disciplinaSelect.disabled = true;
                    // Adiciona opção indicando que não há disciplinas
                    if (disciplinaSelect.options.length === 1) { // Evita duplicar
                         const option = document.createElement('option');
                         option.textContent = "Nenhuma disciplina cadastrada";
                         option.disabled = true;
                         disciplinaSelect.appendChild(option);
                         disciplinaSelect.selectedIndex = 1; // Mostra a msg
                    }
                } else {
                    disciplinaSelect.disabled = false;
                    disciplinaSelect.selectedIndex = 0; // Seleciona "-- Selecione --"
                    disciplinasSalvas.forEach(disciplina => {
                        const option = document.createElement('option');
                        option.value = disciplina.nome; // Use o nome como valor
                        option.textContent = disciplina.nome;
                        disciplinaSelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.error("Erro ao carregar disciplinas do localStorage:", error);
                mostrarFeedbackPopup("Erro ao carregar lista de disciplinas.", "erro");
                disciplinaSelect.disabled = true;
            }
        }

        // Função para mostrar feedback (sucesso/erro)
        function mostrarFeedbackPopup(mensagem, tipo = 'sucesso') {
           feedbackDiv.textContent = mensagem;
           feedbackDiv.className = `popup-feedback ${tipo}`; // Aplica a classe correta
           feedbackDiv.style.display = 'block'; // Torna visível
           // Esconde após alguns segundos
           setTimeout(() => { feedbackDiv.style.display = 'none'; }, 4000);
        }

        // Função para registrar sessão (AGORA COM FIREBASE)
        async function registrarSessaoCompleta(event) { // Adicionado 'async'
             event.preventDefault(); // Impede o envio padrão do formulário
             feedbackDiv.style.display = 'none'; // Esconde feedback anterior
             registerBtn.disabled = true; // Desabilita botão durante o processo
             registerBtn.textContent = 'Registrando...'; // Feedback visual no botão

             // --- Obter valores do formulário ---
             const nomeDisciplina = disciplinaSelect.value;
             const tempoStr = tempoInput.value.trim();
             const questoesStr = questoesInput.value.trim();
             const acertosStr = acertosInput.value.trim();

             // --- Validações ---
             if (!nomeDisciplina) {
                 mostrarFeedbackPopup("Erro: Selecione uma disciplina.", 'erro');
                 registerBtn.disabled = false; registerBtn.textContent = 'Registrar Sessão'; return;
             }
             // Validar se os campos numéricos não estão vazios e são números válidos
             if (tempoStr === '' || isNaN(parseInt(tempoStr)) || parseInt(tempoStr) <= 0) {
                 mostrarFeedbackPopup("Erro: Tempo gasto inválido.", 'erro');
                 registerBtn.disabled = false; registerBtn.textContent = 'Registrar Sessão'; return;
             }
             if (questoesStr === '' || isNaN(parseInt(questoesStr)) || parseInt(questoesStr) < 0) {
                 mostrarFeedbackPopup("Erro: Número de questões inválido.", 'erro');
                 registerBtn.disabled = false; registerBtn.textContent = 'Registrar Sessão'; return;
             }
             if (acertosStr === '' || isNaN(parseInt(acertosStr)) || parseInt(acertosStr) < 0) {
                 mostrarFeedbackPopup("Erro: Número de acertos inválido.", 'erro');
                 registerBtn.disabled = false; registerBtn.textContent = 'Registrar Sessão'; return;
             }

             const tempo = parseInt(tempoStr);
             const questoes = parseInt(questoesStr);
             const acertos = parseInt(acertosStr);

             if (acertos > questoes) {
                 mostrarFeedbackPopup("Erro: Acertos não podem ser maior que questões.", 'erro');
                 registerBtn.disabled = false; registerBtn.textContent = 'Registrar Sessão'; return;
             }

             // --- Obter Usuário Logado ---
             const user = auth.currentUser;
             if (!user) {
                 mostrarFeedbackPopup("Erro: Você precisa estar logado para registrar.", 'erro');
                 // Poderia redirecionar para login aqui, se necessário
                 registerBtn.disabled = false; registerBtn.textContent = 'Registrar Sessão'; return;
             }

             // --- Preparar Dados para o Firestore ---
             const novaSessao = {
                 userId: user.uid, // Essencial para associar ao usuário
                 disciplina: nomeDisciplina,
                 tempo: tempo,
                 questoes: questoes,
                 acertos: acertos,
                 dataRegistro: serverTimestamp() // Timestamp do servidor Firebase
             };

             // --- Salvar no Firestore ---
             try {
                // *** IMPORTANTE: Configure as REGRAS DE SEGURANÇA no Firestore ***
                // Vá ao Console do Firebase > Firestore Database > Regras
                // Garanta que usuários só possam criar/ler seus próprios dados.
                // Exemplo de regra para a coleção 'sessoesEstudo':
                // match /sessoesEstudo/{sessionId} {
                //   allow read: if request.auth != null && resource.data.userId == request.auth.uid;
                //   allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
                //   // allow update, delete: if ... (defina conforme necessário)
                // }

                 console.log("Tentando salvar no Firestore:", novaSessao); // Log
                 const docRef = await addDoc(collection(db, "sessoesEstudo"), novaSessao);
                 console.log("Sessão registrada no Firestore com ID: ", docRef.id);

                 mostrarFeedbackPopup("Sessão registrada com sucesso online!", 'sucesso');
                 formRegistroPopup.reset(); // Limpa o formulário
                 disciplinaSelect.selectedIndex = 0; // Reseta o select

                 // Opcional: Minimizar a gaveta após sucesso
                  setTimeout(() => {
                      if (popupContainer.classList.contains('level-1')) {
                        popupContainer.classList.remove('level-1');
                        popupContainer.classList.add('level-2');
                        feedbackDiv.style.display = 'none'; // Garante que feedback suma ao fechar
                      }
                  }, 1500); // Espera 1.5s antes de fechar

                 // Chame aqui qualquer função que atualize a UI (ex: lista de sessões, resumo)
                 // if (typeof atualizarResumoGlobal === 'function') {
                 //    atualizarResumoGlobal();
                 // }

             } catch (error) {
                 console.error("Erro ao registrar sessão no Firestore: ", error);
                 mostrarFeedbackPopup(`Erro ao salvar online: ${error.message}`, 'erro');
             } finally {
                 // Reabilita o botão independente de sucesso ou erro
                 registerBtn.disabled = false;
                 registerBtn.textContent = 'Registrar Sessão';
             }
        }

        // --- Lógica de Interação da Gaveta (Abrir/Fechar) ---
        if (popupContainer && popupHeader && popupCloseBtn && formRegistroPopup) {

            // Abrir a gaveta ao clicar no header (estado minimizado)
            popupHeader.addEventListener("click", () => {
                if (popupContainer.classList.contains('level-2')) {
                    carregarDisciplinasPopup(); // Carrega disciplinas ao abrir
                    popupContainer.classList.remove('level-2');
                    popupContainer.classList.add('level-1');
                    feedbackDiv.style.display = 'none'; // Esconde feedback residual
                }
            });

            // Fechar a gaveta ao clicar no botão X (estado aberto)
            popupCloseBtn.addEventListener("click", () => {
                 if (popupContainer.classList.contains('level-1')) {
                    popupContainer.classList.remove('level-1');
                    popupContainer.classList.add('level-2');
                    feedbackDiv.style.display = 'none'; // Esconde feedback residual
                }
            });

            // Registrar a sessão ao submeter o formulário
            formRegistroPopup.addEventListener("submit", registrarSessaoCompleta);

            // Restrição para aceitar apenas números nos inputs numéricos
            const restrictToNumbers = (event) => {
                // Permite apenas dígitos. Remove qualquer caractere não numérico.
                event.target.value = event.target.value.replace(/[^0-9]/g, '');
            };
            if(tempoInput) tempoInput.addEventListener("input", restrictToNumbers);
            if(questoesInput) questoesInput.addEventListener("input", restrictToNumbers);
            if(acertosInput) acertosInput.addEventListener("input", restrictToNumbers);

        } else {
            console.error("Elementos essenciais do Popup (gaveta) não encontrados no DOM.");
        }

    } // Fim do if (!document.getElementById("popupContainer"))

  }); // Fim do DOMContentLoaded
</script>
