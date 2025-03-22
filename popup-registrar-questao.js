document.addEventListener("DOMContentLoaded", () => {
    const isHomePage = window.location.pathname === "/";

    if (!document.getElementById("popupContainer")) {
        const popupHTML = `
            <div id="popupContainer" class="popup-container ${isHomePage ? 'level-2' : 'level-1'}">
                <div id="atendimentoText" class="atendimento-text">Registro de estudos</div>
                <div class="popup-inputs">
                    <h3>Questões resolvidas</h3>
                    <input type="number" id="questaoInput" placeholder="Quantidade resolvidas" />
                    <input type="number" id="acertosInput" placeholder="Quantidade de acertos" />
                </div>
                <div class="popup-btns-wrapper">
                    <button id="registerQuestaoBtn" class="popup-btn">Registrar Questões</button>
                </div>
                <div class="popup-inputs">
                    <h3>Tempo de estudo</h3>
                    <input type="number" id="tempoInput" placeholder="Tempo de estudo (min)" />
                </div>
                <div class="popup-btns-wrapper">
                    <button id="registerTempoBtn" class="popup-btn">Registrar Tempo</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", popupHTML);

        if (!document.getElementById("popupStyles")) {
            const style = document.createElement('style');
            style.id = 'popupStyles';
            style.innerHTML = `
                #atendimentoText {
                    font-size: 20px; /* Altera o tamanho da fonte */
                    color: #474c5f; /* Altera a cor do texto */
                    font-weight: bold; /* Altera o peso da fonte */
                    cursor: pointer; /* Adiciona um cursor de mão ao passar o mouse */
                    padding-bottom: 15px;
                    border-radius: 5px; /* Cantos arredondados */
                    transition: all 0.3s ease; /* Adiciona transição suave */
                }
                .popup-container {
                    position: fixed;
                    bottom: 30px;
                    right: 10px;
                    width: 300px;
                    padding: 15px;
                    background-color: rgba(0, 0, 0, 0.065);
                    backdrop-filter: blur(8px);
                    border-radius: 12px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    transition: transform 0.4s ease, opacity 0.4s ease;
                    z-index: 1;
                    opacity: 0;
                    transform: translateY(100%);
                }
                .popup-container.level-2 {
                    opacity: 1;
                    transform: translateY(95%);
                }
                .popup-container.level-1 {
                    opacity: 1;
                    transform: translateY(0);
                }
                .popup-inputs {
                    width: 100%;
                }
                .popup-inputs h3 {
                    font-size: 16px;
                    margin-top: 15px;
                    margin-bottom: 8px;
                    color: #6735bc;
                }
                .popup-inputs input {
                    width: 100%;
                    padding: 10px;
                    margin-bottom: 10px;
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: border-color 0.3s ease;
                }
                .popup-inputs input:focus {
                    border-color: #6735bc;
                    outline: none;
                }
                .popup-btn {
                    font-family: 'Montserrat', sans-serif;
                    font-weight: bold;
                    padding: 12px 20px;
                    background-color: #474c5f;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-bottom: 25px;
                }
                .popup-btn:hover {
                    background-color: #5731a8;
                }
                .alert {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    padding: 15px;
                    background-color: #f44336;
                    color: white;
                    border-radius: 5px;
                    font-size: 14px;
                    opacity: 0;
                    transition: opacity 0.5s ease-in-out;
                    z-index: 9999;
                }
                .alert.show {
                    opacity: 1;
                }
            `;
            document.head.appendChild(style);
        }

        const atendimentoText = document.getElementById("atendimentoText");
        const popupContainer = document.getElementById("popupContainer");

        const changePopupLevel = () => {
            if (popupContainer.classList.contains("level-1")) {
                popupContainer.classList.remove("level-1");
                popupContainer.classList.add("level-2");
            } else if (popupContainer.classList.contains("level-2")) {
                popupContainer.classList.remove("level-2");
                popupContainer.classList.add("level-1");
            }
        };

        atendimentoText.addEventListener("click", changePopupLevel);

        const closePopupOnClickOutside = (event) => {
            if (!popupContainer.contains(event.target) && popupContainer.classList.contains('level-2')) {
                popupContainer.classList.remove('level-2');
                popupContainer.classList.add('level-1');
            }
        };
        window.addEventListener('click', closePopupOnClickOutside);

        document.getElementById("questaoInput").addEventListener("input", (event) => {
            event.target.value = event.target.value.replace(/[^0-9]/g, '');
        });

        document.getElementById("tempoInput").addEventListener("input", (event) => {
            event.target.value = event.target.value.replace(/[^0-9]/g, '');
        });

        document.getElementById("acertosInput").addEventListener("input", (event) => {
            event.target.value = event.target.value.replace(/[^0-9]/g, '');
        });

        const salvarDados = () => {
            localStorage.setItem('estudos', JSON.stringify(estudos));
            localStorage.setItem('questoes', JSON.stringify(questoes));
        };

        const registrarQuestao = () => {
            const questao = document.getElementById("questaoInput").value;
            const acertos = document.getElementById("acertosInput").value;

            if (questao && acertos) {
                questoes.push({ total: parseInt(questao), acertos: parseInt(acertos), data: new Date().toISOString() });
                salvarDados();
                atualizarResumo();
                alert("Questões registradas!");
            } else {
                showAlert("Por favor, preencha todos os campos.");
            }
        };

        const registrarEstudo = () => {
            const tempo = document.getElementById("tempoInput").value;
            if (tempo && !isNaN(tempo)) {
                estudos.push({ minutos: parseInt(tempo), data: new Date().toISOString() });
                salvarDados();
                atualizarResumo();
                alert("Tempo de estudo registrado!");
            } else {
               showAlert("Por favor, preencha todos os campos.");
            }
        };

        const showAlert = (message) => {
            const alert = document.createElement('div');
            alert.classList.add('alert');
            alert.textContent = message;
            document.body.appendChild(alert);
            setTimeout(() => alert.classList.add('show'), 10);
            setTimeout(() => alert.classList.remove('show'), 3000);
            setTimeout(() => alert.remove(), 3500);
        };

        document.getElementById("registerQuestaoBtn").addEventListener("click", registrarQuestao);
        document.getElementById("registerTempoBtn").addEventListener("click", registrarEstudo);
    }
});

atualizarResumo();
          
