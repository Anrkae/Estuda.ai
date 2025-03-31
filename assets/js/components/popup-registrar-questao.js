document.addEventListener("DOMContentLoaded", () => {

    // --- Verifica se o contexto global foi criado ---
    if (!window.appContext || !window.appContext.estudos || !window.appContext.questoes || !window.appContext.salvarDados || !window.appContext.atualizarResumo) {
        console.error("Erro Crítico: appContext ou suas propriedades não encontradas. Verifique se 'script.js' foi carregado ANTES deste script e está expondo as variáveis/funções corretamente.");
        return; // Interrompe a execução deste script se o contexto não estiver pronto
    }

    const estudos = window.appContext.estudos; // Referência ao array de estudos do script.js
    const questoes = window.appContext.questoes; // Referência ao array de questoes do script.js
    const salvarDadosGlobais = window.appContext.salvarDados; // Referência à função salvarDados do script.js
    const atualizarResumoGlobal = window.appContext.atualizarResumo; // Referência à função atualizarResumo do script.js

    const isHomePage = window.location.pathname === "/" || window.location.pathname.endsWith("/index.html");

    // Só cria o popup se ele ainda não existe
    if (!document.getElementById("popupContainer")) {
        const popupHTML = `
            <div id="popupContainer" class="popup-container ${isHomePage ? 'level-2' : 'level-1'}">
                <div id="atendimentoText" class="atendimento-text">Registro de estudos</div>
                <div class="popup-inputs">
                    <h3>Questões resolvidas</h3>
                    <input type="number" id="questaoInput" placeholder="Quantidade resolvidas" inputmode="numeric" pattern="[0-9]*" />
                    <input type="number" id="acertosInput" placeholder="Quantidade de acertos" inputmode="numeric" pattern="[0-9]*" />
                </div>
                <div class="popup-btns-wrapper">
                    <button id="registerQuestaoBtn" class="popup-btn">Registrar Questões</button>
                </div>
                <div class="popup-inputs">
                    <h3>Tempo de estudo</h3>
                    <input type="number" id="tempoInput" placeholder="Tempo de estudo (min)" inputmode="numeric" pattern="[0-9]*" />
                </div>
                <div class="popup-btns-wrapper">
                    <button id="registerTempoBtn" class="popup-btn">Registrar Tempo</button>
                </div>
            </div>`;
        document.body.insertAdjacentHTML("beforeend", popupHTML);

        // Injeção de CSS (Só injeta se não existir)
        if (!document.getElementById("popupStyles")) {
            const style = document.createElement('style');
            style.id = 'popupStyles';
            // COLE AQUI O SEU BLOCO CSS PARA O POPUP
            style.innerHTML = `
                #atendimentoText {
                    font-size: 1.1em; /* Ajustado */
                    color: #444;
                    font-weight: 600; /* Ajustado */
                    cursor: pointer;
                    padding-bottom: 10px; /* Ajustado */
                    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
                    width: 100%;
                    text-align: center;
                    margin-bottom: 15px; /* Espaço abaixo */
                }
                .popup-container {
                    position: fixed;
                    bottom: 20px; /* Ajustado */
                    right: 20px; /* Ajustado */
                    width: 280px; /* Ajustado */
                    padding: 20px; /* Ajustado */
                    background-color: rgba(0, 0, 0, 0.05);
                    backdrop-filter: blur(5px); /* Blur sutil se suportado */
                    border-radius: 15px; /* Mais arredondado */
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15); /* Sombra mais pronunciada */
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    transition: transform 0.4s ease-in-out, opacity 0.4s ease-in-out;
                    z-index: 999; /* Abaixo do header/sidebar */
                    opacity: 0;
                    transform: translateY(100%); /* Começa escondido abaixo */
                    border: 1px solid rgba(0, 0, 0, 0.06);
                }
                /* Estado minimizado */
                .popup-container.level-2 {
                    opacity: 1;
                    transform: translateY(calc(100% - 30px)); /* Mostra só o topo */
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1); /* Sombra menor */
                }
                 /* Efeito hover no minimizado */
                 .popup-container.level-2:hover {
                     transform: translateY(calc(100% - 30px)); /* Sobe um pouquinho */
                 }
                 /* Esconde inputs/botões no minimizado */
                 .popup-container.level-2 .popup-inputs,
                 .popup-container.level-2 .popup-btns-wrapper {
                      display: none;
                 }

                /* Estado maximizado */
                .popup-container.level-1 {
                    opacity: 1;
                    transform: translateY(0); /* Posição normal */
                }
                 /* Mostra inputs/botões no maximizado */
                 .popup-container.level-1 .popup-inputs,
                 .popup-container.level-1 .popup-btns-wrapper {
                      display: block; /* Ou flex, etc. conforme necessário */
                 }

                .popup-inputs {
                    width: 100%;
                    text-align: center; /* Centraliza o h3 */
                }
                .popup-inputs h3 {
                    font-size: 0.95rem; /* Ajustado */
                    margin-top: 10px; /* Ajustado */
                    margin-bottom: 8px;
                    color: #6735bc;
                    font-weight: 600;
                }
                .popup-inputs input {
                    width: calc(100% - 22px); /* Desconta padding */
                    padding: 10px;
                    margin-bottom: 10px;
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: border-color 0.3s ease;
                    box-sizing: border-box; /* Garante padding dentro da largura */
                }
                .popup-inputs input:focus {
                    border-color: #6735bc;
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(103, 53, 188, 0.2); /* Outline suave no foco */
                }
                 .popup-btns-wrapper { /* Container dos botões */
                     width: 100%;
                     text-align: center; /* Centraliza botão */
                     margin-bottom: 5px; /* Espaço final */
                 }

                .popup-btn {
                    font-family: 'Montserrat', sans-serif;
                    font-weight: 600; /* Ajustado */
                    padding: 10px 20px; /* Ajustado */
                    background-color: #6735bc; /* Roxo */
                    color: white;
                    border: none;
                    border-radius: 8px; /* Consistente */
                    cursor: pointer;
                    font-size: 0.9rem; /* Ajustado */
                    transition: background-color 0.3s ease, transform 0.1s ease;
                    width: 90%; /* Largura maior */
                    box-sizing: border-box;
                }
                .popup-btn:hover {
                    background-color: #512a97; /* Roxo mais escuro */
                }
                 .popup-btn:active {
                      transform: scale(0.98);
                 }

                /* Estilo do Alert (mantido como você enviou) */
                .alert {
                    position: fixed; top: 10px; right: 10px; padding: 15px;
                    background-color: #ef5350; /* Vermelho mais suave */
                    color: white; border-radius: 5px; font-size: 14px;
                    opacity: 0; transition: opacity 0.5s ease-in-out; z-index: 9999;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                }
                .alert.show { opacity: 1; }
            `;
            document.head.appendChild(style);
        }

        // --- Lógica de Interação do Popup ---
        const atendimentoText = document.getElementById("atendimentoText");
        const popupContainer = document.getElementById("popupContainer");

        if (atendimentoText && popupContainer) {
            const changePopupLevel = () => {
                popupContainer.classList.toggle('level-1');
                popupContainer.classList.toggle('level-2');
            };
            atendimentoText.addEventListener("click", changePopupLevel);

            const closePopupOnClickOutside = (event) => {
                // Fecha somente se estiver aberto (level-1) e o clique NÃO for no próprio container ou no botão de abrir (atendimentoText)
                if (popupContainer.classList.contains('level-1') && !popupContainer.contains(event.target) && event.target !== atendimentoText ) {
                   popupContainer.classList.remove('level-1');
                   popupContainer.classList.add('level-2');
                }
            };
            // Usar 'mousedown' pode ser melhor para pegar o clique antes de outros eventos
            document.addEventListener('mousedown', closePopupOnClickOutside);
        }

        // --- Restrição de Inputs ---
         const questaoInputEl = document.getElementById("questaoInput");
         const acertosInputEl = document.getElementById("acertosInput");
         const tempoInputEl = document.getElementById("tempoInput");

         const restrictToNumbers = (event) => { event.target.value = event.target.value.replace(/[^0-9]/g, ''); };

         if(questaoInputEl) questaoInputEl.addEventListener("input", restrictToNumbers);
         if(acertosInputEl) acertosInputEl.addEventListener("input", restrictToNumbers);
         if(tempoInputEl) tempoInputEl.addEventListener("input", restrictToNumbers);


        // --- Funções de Registro (Usando Contexto Global) ---
        const showAlert = (message) => {
            // Remove alerts existentes antes de criar um novo
            document.querySelectorAll('.alert.show').forEach(a => a.remove());

            const alert = document.createElement('div');
            alert.classList.add('alert');
            alert.textContent = message;
            document.body.appendChild(alert);
            // Força reflow para garantir transição
            void alert.offsetWidth;
            alert.classList.add('show');

            setTimeout(() => {
                alert.classList.remove('show');
                // Remove o elemento após a transição de fade out
                alert.addEventListener('transitionend', () => alert.remove());
            }, 3000); // Tempo que o alert fica visível
        };

        const registrarQuestao = () => {
            const questaoEl = document.getElementById("questaoInput");
            const acertosEl = document.getElementById("acertosInput");
            const totalStr = questaoEl ? questaoEl.value : '';
            const acertosStr = acertosEl ? acertosEl.value : '';
            const totalNum = parseInt(totalStr);
            const acertosNum = parseInt(acertosStr);

            if (totalStr && acertosStr && !isNaN(totalNum) && !isNaN(acertosNum) && totalNum > 0 && acertosNum >= 0 && acertosNum <= totalNum) {
                questoes.push({ total: totalNum, acertos: acertosNum, data: new Date().toISOString() });
                salvarDadosGlobais();
                atualizarResumoGlobal();
                showAlert("Questões registradas com sucesso!");
                if(questaoEl) questaoEl.value = '';
                if(acertosEl) acertosEl.value = '';
                if (popupContainer) popupContainer.classList.replace('level-1', 'level-2');
            } else if (totalStr && acertosStr && acertosNum > totalNum) {
                 showAlert("Erro: O número de acertos não pode ser maior que o total de questões.");
            } else {
                showAlert("Erro: Preencha os campos de questões com números válidos.");
            }
        };

        const registrarEstudo = () => {
            const tempoEl = document.getElementById("tempoInput");
            const tempoStr = tempoEl ? tempoEl.value : '';
            const tempoNum = parseInt(tempoStr);

            if (tempoStr && !isNaN(tempoNum) && tempoNum > 0) {
                estudos.push({ minutos: tempoNum, data: new Date().toISOString() });
                salvarDadosGlobais();
                atualizarResumoGlobal();
                showAlert("Tempo de estudo registrado com sucesso!");
                if(tempoEl) tempoEl.value = '';
                if (popupContainer) popupContainer.classList.replace('level-1', 'level-2');
            } else {
               showAlert("Erro: Informe um tempo de estudo válido em minutos.");
            }
        };

        // --- Adiciona Listeners aos Botões do Popup ---
        const registerQuestaoBtnEl = document.getElementById("registerQuestaoBtn");
        const registerTempoBtnEl = document.getElementById("registerTempoBtn");

        if(registerQuestaoBtnEl) {
             registerQuestaoBtnEl.addEventListener("click", registrarQuestao);
        } else {
             console.warn("Botão #registerQuestaoBtn não encontrado após injeção.");
        }
        if(registerTempoBtnEl) {
            registerTempoBtnEl.addEventListener("click", registrarEstudo);
        } else {
             console.warn("Botão #registerTempoBtn não encontrado após injeção.");
        }

    }
});