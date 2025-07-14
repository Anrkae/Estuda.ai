document.addEventListener("DOMContentLoaded", () => {

    const initialState = 'level-2';
    const popupId = "popupContainer"; // ID do container deste popup
    const styleId = 'popupStyles'; // ID da tag de estilo

    if (!document.getElementById(popupId)) {
        // --- HTML do Popup (com Ícone no Handle) ---
        const popupHTML = `
            <div id="${popupId}" class="popup-container ${initialState}">
                <div id="popupHeader" class="popup-header">
                    <span id="popupTitle">Registrar Estudo</span>
                </div>
                <div class="popup-content-wrapper">
                    <span id="registerPopupDragHandle" class="register-popup-drag-handle">
                        </i>deslize para minimizar
                    </span>
                    <form id="formRegistroPopup">
                        <div id="primeiroBloco" class="popup-form-grupo">
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

        // --- CSS do Popup (com Ajustes no Handle) ---
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
/* Estilos base do container e header (sem alterações) */
.popup-container {
    position: fixed; bottom: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999;
    transition: transform 0.4s ease-in-out;
    background-color: #ffffff; display: flex; flex-direction: column;
    font-family: 'Montserrat', sans-serif; box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.1); overflow: hidden;
    border-top-left-radius: 32px; border-top-right-radius: 32px;
}
.popup-container.level-2 { transform: translateY(calc(100% - 50px)); box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1); }
.popup-container.level-2 .popup-header {
    height: 50px; padding: 0 20px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; background-color: #f8f8f8; border-top: 1px solid #e0e0e0; width: 100%; flex-shrink: 0; border-radius: 0;
}
.popup-container.level-2 .popup-header #popupTitle { font-weight: 600; color: #2C2C2C; font-size: 1rem; }
.popup-container.level-2 .popup-content-wrapper { display: none; flex-grow: 1; }
.popup-container.level-1 { transform: translateY(0); box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.15); }
.popup-container.level-1 .popup-header { display: none; }
.popup-container.level-1 .popup-content-wrapper {
    display: flex; flex-direction: column; align-items: center; flex-grow: 1; overflow-y: auto;
    padding: 20px 30px 30px 30px; position: relative; padding-top: 35px;
}
.popup-container.level-1 #formRegistroPopup { width: 100%; max-width: 600px; }

/* **** MODIFICAÇÃO AQUI: Estilo do handle com Flexbox para ícone + texto **** */
#${popupId} .register-popup-drag-handle {
    display: inline-flex; /* Para alinhar ícone e texto na mesma linha */
    align-items: center;  /* Alinha verticalmente */
    gap: 6px;              /* Espaço entre ícone e texto */
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
/* Ajuste opcional de cor/tamanho do ícone se necessário */
#${popupId} .register-popup-drag-handle i {
    line-height: 1; /* Garante alinhamento do ícone */
    /* font-size: 0.9em; /* Exemplo: se precisar ajustar tamanho do ícone */
}
#${popupId} .register-popup-drag-handle:hover {
    color: #444;
    opacity: 1;
}
/* **** FIM DA MODIFICAÇÃO **** */

#primeiroBloco {
            margin-top: 50px;
}
        
/* Estilos do Formulário (sem alterações) */
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

/* Responsividade (sem alterações) */
@media (max-width: 600px) {
    .popup-container.level-1 .popup-content-wrapper { padding: 15px 20px 20px 20px; padding-top: 35px; }
    #formRegistroPopup h2 { font-size: 1.3em; }
    .popup-form-grupo-inline { flex-direction: column; gap: 15px; }
    #${popupId} .register-popup-drag-handle { font-size: 0.75rem; top: 6px;}
    /* Ajusta gap no mobile se ficar apertado */
    #${popupId} .register-popup-drag-handle { gap: 4px; }
}
            `;
            document.head.appendChild(style);
        }

        // --- Lógica do Popup (Restante do código JS idêntico ao anterior) ---
        const popupContainer = document.getElementById(popupId);
        const popupHeader = document.getElementById("popupHeader");
        const popupDragHandle = document.getElementById("registerPopupDragHandle"); // Pega o handle
        const formRegistroPopup = document.getElementById("formRegistroPopup");
        const disciplinaSelect = document.getElementById("popupDisciplinaSelect");
        const tempoInput = document.getElementById("popupTempoInput");
        const questoesInput = document.getElementById("popupQuestoesInput");
        const acertosInput = document.getElementById("popupAcertosInput");
        const feedbackDiv = document.getElementById("popupFeedback");
        const registerBtn = document.getElementById("popupRegisterBtn");

        // Funções do Popup (Carregar, Feedback, Registro - sem alterações)
        function carregarDisciplinasPopup(){try{const e=JSON.parse(localStorage.getItem("disciplinas"))||[];if(disciplinaSelect.options.length=1,e.length===0){disciplinaSelect.disabled=!0;if(disciplinaSelect.options.length<=1){const a=document.createElement("option");a.textContent="Nenhuma disciplina registrada",a.disabled=!0,disciplinaSelect.appendChild(a)}disciplinaSelect.selectedIndex=1}else{disciplinaSelect.disabled=!1,disciplinaSelect.selectedIndex=0;e.forEach(e=>{const a=document.createElement("option");a.value=e.nome,a.textContent=e.nome,disciplinaSelect.appendChild(a)})}}catch(e){console.error("Erro ao carregar disciplinas:",e);typeof mostrarFeedbackPopup=="function"&&mostrarFeedbackPopup("Erro ao carregar disciplinas.","erro"),disciplinaSelect.disabled=!0}}
        function mostrarFeedbackPopup(e,a="sucesso"){feedbackDiv&&(feedbackDiv.textContent=e,feedbackDiv.className=`popup-feedback ${a}`,feedbackDiv.style.display="block",setTimeout(()=>{feedbackDiv.textContent===e&&(feedbackDiv.style.display="none")},4e3))}
        function registrarSessaoCompleta(e){e.preventDefault(),feedbackDiv&&(feedbackDiv.style.display="none"),registerBtn&&(registerBtn.disabled=!0);const a=disciplinaSelect.value,t=tempoInput.value.trim(),o=questoesInput.value.trim(),i=acertosInput.value.trim();if(!a)return mostrarFeedbackPopup("Erro: Selecione uma disciplina.","erro"),void(registerBtn&&(registerBtn.disabled=!1));if(t===""||isNaN(parseInt(t))||parseInt(t)<=0)return mostrarFeedbackPopup("Erro: Tempo gasto inválido.","erro"),void(registerBtn&&(registerBtn.disabled=!1));if(o===""||isNaN(parseInt(o))||parseInt(o)<0)return mostrarFeedbackPopup("Erro: Número de questões inválido.","erro"),void(registerBtn&&(registerBtn.disabled=!1));if(i===""||isNaN(parseInt(i))||parseInt(i)<0)return mostrarFeedbackPopup("Erro: Número de acertos inválido.","erro"),void(registerBtn&&(registerBtn.disabled=!1));const n=parseInt(t),s=parseInt(o),l=parseInt(i);if(l>s)return mostrarFeedbackPopup("Erro: Acertos não podem ser maior que questões.","erro"),void(registerBtn&&(registerBtn.disabled=!1));const d={disciplina:a,tempo:n,questoes:s,acertos:l,data:(new Date).toISOString()};try{const c=JSON.parse(localStorage.getItem("sessoesEstudo"))||[];c.push(d),localStorage.setItem("sessoesEstudo",JSON.stringify(c)),window.appContext&&typeof window.appContext.atualizarTudo=="function"?(console.log("Popup Registro: Chamando appContext.atualizarTudo()"),window.appContext.atualizarTudo()):console.warn("Popup Registro: appContext.atualizarTudo não encontrada."),mostrarFeedbackPopup("Sessão registrada com sucesso!","sucesso"),formRegistroPopup.reset(),disciplinaSelect.selectedIndex=0,setTimeout(()=>{popupContainer&&popupContainer.classList.contains("level-1")&&(popupContainer.classList.remove("level-1"),popupContainer.classList.add("level-2"),popupContainer.style.transition="",popupContainer.style.transform="",feedbackDiv&&(feedbackDiv.style.display="none"))},1500)}catch(e){console.error("Erro ao salvar sessão no localStorage:",e),mostrarFeedbackPopup("Erro ao salvar sessão localmente.","erro")}finally{registerBtn&&(registerBtn.disabled=!1)}}

        // --- Event Listeners do Popup (Lógica de Arrastar sem alterações na funcionalidade) ---
        if (popupContainer && popupHeader && popupDragHandle && formRegistroPopup) {

            // Abrir Gaveta
            popupHeader.addEventListener("click", () => {
                if (popupContainer.classList.contains('level-2')) {
                    carregarDisciplinasPopup();
                    popupContainer.classList.remove('level-2');
                    popupContainer.classList.add('level-1');
                    popupContainer.style.transition = ''; // Garante reset visual
                    popupContainer.style.transform = '';
                    if(feedbackDiv) feedbackDiv.style.display = 'none';
                }
            });

            // Lógica de arrastar para minimizar (sem alterações na funcionalidade)
            let isDragging = false;
            let startY = 0;
            let currentY = 0;
            let deltaY = 0;
            const dragThreshold = 70; 

            const getClientY = (event) => { if(event.touches&&event.touches.length>0){return event.touches[0].clientY}if(event.changedTouches&&event.changedTouches.length>0){return event.changedTouches[0].clientY}return event.clientY};
            const handleDragStart = (event) => { if(!popupContainer.classList.contains('level-1'))return;isDragging=!0;startY=getClientY(event);deltaY=0;popupContainer.style.transition='none';document.addEventListener('mousemove',handleDragMove);document.addEventListener('touchmove',handleDragMove,{passive:!1});document.addEventListener('mouseup',handleDragEnd);document.addEventListener('touchend',handleDragEnd);document.addEventListener('mouseleave',handleDragEnd);if(event.type!=='touchstart'){event.preventDefault()}};
            const handleDragMove = (event) => { if(!isDragging)return;event.preventDefault();currentY=getClientY(event);deltaY=currentY-startY;if(deltaY>0){popupContainer.style.transform=`translateY(${deltaY}px)`}else{popupContainer.style.transform='translateY(0px)'}};
            const handleDragEnd = (event) => { if(!isDragging)return;isDragging=!1;popupContainer.style.transition='';popupContainer.style.transform='';if(deltaY>dragThreshold){popupContainer.classList.remove('level-1');popupContainer.classList.add('level-2');if(feedbackDiv)feedbackDiv.style.display='none'}document.removeEventListener('mousemove',handleDragMove);document.removeEventListener('touchmove',handleDragMove);document.removeEventListener('mouseup',handleDragEnd);document.removeEventListener('touchend',handleDragEnd);document.removeEventListener('mouseleave',handleDragEnd)};
            
            // Adiciona listeners ao handle
            popupDragHandle.addEventListener('mousedown', handleDragStart);
            popupDragHandle.addEventListener('touchstart', handleDragStart, { passive: false });

            // Listener do Formulário e Inputs (sem alterações)
            formRegistroPopup.addEventListener("submit", registrarSessaoCompleta);
            const restrictToNumbers = (event) => { event.target.value = event.target.value.replace(/[^0-9]/g, ''); };
            if(tempoInput) tempoInput.addEventListener("input", restrictToNumbers);
            if(questoesInput) questoesInput.addEventListener("input", restrictToNumbers);
            if(acertosInput) acertosInput.addEventListener("input", restrictToNumbers);

        } else {
            console.error("Elementos essenciais do Popup de Registro (container, header, dragHandle, form) não encontrados.");
            // Adicionado log para ajudar a identificar qual elemento pode estar faltando, se for o caso
            console.error({
                popupContainer: !!popupContainer,
                popupHeader: !!popupHeader,
                popupDragHandle: !!popupDragHandle,
                formRegistroPopup: !!formRegistroPopup
            });
        }
    }

});