document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM carregado. Iniciando script de configuracao_inicial.js.");

    const stepIndicatorDisplay = document.getElementById('step-indicator-display');
    const stepContents = document.querySelectorAll('.step-content');
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');
    const skipButton = document.getElementById('skip-btn');
    const statusMessage = document.getElementById('status-message');

    const nomeInput = document.getElementById('nome');
    const dobInput = document.getElementById('dob');
    const ageDisplay = document.getElementById('age-display');

    const nomeDisciplinaInput = document.getElementById('nomeDisciplinaInput');
    const addDisciplinaBtn = document.getElementById('addDisciplinaBtn');
    const disciplinasListUl = document.getElementById('disciplinas-list');

    let currentStep = 1;
    const totalSteps = 2;
    let userData = JSON.parse(localStorage.getItem('userInfo')) || { nome: null, dob: null };
    let disciplinas = JSON.parse(localStorage.getItem('disciplinas')) || [];

    // Funções Utilitárias (data, acentuação)
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    function parseAndValidateDdMmYyyy(ds) {
        const m = ds.match(dateRegex); if (!m) return null;
        const d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
        if (y < 1900 || y > new Date().getFullYear() - 5 || mo < 1 || mo > 12 || d < 1 || d > 31) return null; // Idade mínima 5 anos
        if ((mo === 4 || mo === 6 || mo === 9 || mo === 11) && d > 30) return null;
        if (mo === 2) { const iL = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0); if (d > (iL ? 29 : 28)) return null; }
        const dt = new Date(y, mo - 1, d);
        return (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) ? null : dt;
    }
    function calculateAgeFromDate(bdo) {
        if (!bdo || isNaN(bdo.getTime())) return { age: null, error: "Data inválida" };
        const t = new Date();
        const tm = new Date(t.getFullYear(), t.getMonth(), t.getDate());
        const bm = new Date(bdo.getFullYear(), bdo.getMonth(), bdo.getDate());
        if (bm > tm) return { age: null, error: "Data futura" };
        let a = t.getFullYear() - bdo.getFullYear();
        const md = t.getMonth() - bdo.getMonth();
        if (md < 0 || (md === 0 && t.getDate() < bdo.getDate())) { a--; }
        if (a < 5) return { age: a, error: "Idade mínima de 5 anos." };
        return { age: Math.max(0, a), error: null };
    }
    function applyDateMask(inp) {
        let v = inp.value.replace(/\D/g, ''), fv = '';
        if (v.length > 0) fv += v.substring(0, 2);
        if (v.length >= 3) fv += '/' + v.substring(2, 4);
        if (v.length >= 5) fv += '/' + v.substring(4, 8);
        inp.value = fv.substring(0, 10);
    }
    function removerAcentuacao(str) { return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

    function displayStatus(message, type = 'info', duration = 3000) {
        if (!statusMessage) return;
        statusMessage.textContent = message;
        statusMessage.className = type; // Assume que as classes são 'sucesso', 'erro', 'info'
        statusMessage.style.display = 'block';
        if (duration > 0) {
            setTimeout(() => {
                if (statusMessage.textContent === message) { // Só limpa se a msg não mudou
                     statusMessage.textContent = '';
                     statusMessage.style.display = 'none';
                }
            }, duration);
        }
    }
    
    // Lógica de Disciplinas
    function exibirDisciplinasNaLista() {
        if (!disciplinasListUl) return;
        disciplinasListUl.innerHTML = '';
        if (disciplinas.length === 0) {
            disciplinasListUl.innerHTML = '<li class="empty-message">Nenhuma disciplina adicionada ainda.</li>';
            return;
        }
        disciplinas.forEach((disciplinaObj, index) => {
            const li = document.createElement('li');
            li.textContent = disciplinaObj.nome;
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-disciplina-btn';
            removeButton.innerHTML = '<i class="fas fa-times"></i>';
            removeButton.title = `Remover "${disciplinaObj.nome}"`;
            removeButton.onclick = () => removerDisciplinaDaLista(index);
            li.appendChild(removeButton);
            disciplinasListUl.appendChild(li);
        });
    }

    function adicionarDisciplinaNaLista() {
        if (!nomeDisciplinaInput) return;
        const nome = nomeDisciplinaInput.value.trim();
        displayStatus('', ''); // Limpa status anterior
        if (nome === "") {
            displayStatus('Por favor, digite um nome para a disciplina.', 'erro');
            nomeDisciplinaInput.focus(); return;
        }
        const nomeSemAcentoLower = removerAcentuacao(nome).toLowerCase();
        const existe = disciplinas.some(d => removerAcentuacao(d.nome).toLowerCase() === nomeSemAcentoLower);
        if (existe) {
            displayStatus('Essa disciplina já foi adicionada.', 'erro');
            nomeDisciplinaInput.focus(); return;
        }
        disciplinas.push({ nome: nome, topicos: [], maximizado: false, excluirAtivo: false });
        exibirDisciplinasNaLista();
        nomeDisciplinaInput.value = '';
        nomeDisciplinaInput.focus();
    }

    function removerDisciplinaDaLista(index) {
        if (index >= 0 && index < disciplinas.length) {
            disciplinas.splice(index, 1);
            exibirDisciplinasNaLista();
        }
    }

    // Navegação e Validação das Etapas
    function showStep(stepNumber) {
        stepContents.forEach((stepEl, index) => { stepEl.classList.toggle('active', index + 1 === stepNumber); });
        if(stepIndicatorDisplay) stepIndicatorDisplay.textContent = `Etapa ${stepNumber} de ${totalSteps}`;
        
        if(prevButton) prevButton.disabled = stepNumber === 1;
        if(nextButton) nextButton.textContent = stepNumber === totalSteps ? 'Finalizar Configuração' : 'Próximo';
        if(skipButton) skipButton.style.display = (stepNumber === 2) ? 'inline-block' : 'none';
        
        displayStatus('', ''); // Limpa mensagens de status ao trocar de etapa

        if (stepNumber === 1 && nomeInput) nomeInput.focus();
        if (stepNumber === 2) {
            exibirDisciplinasNaLista(); // Garante que a lista seja mostrada ao ir para a etapa 2
            if(nomeDisciplinaInput) nomeDisciplinaInput.focus();
        }
    }

    function validateStep1() {
        displayStatus('', ''); 
        const nomeVal = nomeInput.value.trim();
        const dobVal = dobInput.value;
        if (!nomeVal || nomeVal.length < 3) {
            displayStatus('Nome inválido (mínimo 3 caracteres).', 'erro');
            nomeInput.focus(); return false;
        }
        const dataNascimentoObj = parseAndValidateDdMmYyyy(dobVal);
        if (!dataNascimentoObj) {
            displayStatus('Data de nascimento inválida (dd/mm/aaaa).', 'erro');
            if (ageDisplay) { ageDisplay.textContent = 'Inválida'; ageDisplay.className = 'invalid'; }
            dobInput.focus(); return false;
        }
        const { age, error: ageError } = calculateAgeFromDate(dataNascimentoObj);
        if (ageError) {
            displayStatus(ageError === "Data futura" ? 'Data não pode ser futura.' : 'Idade inválida ou menor que 5 anos.', 'erro');
            if (ageDisplay) { ageDisplay.textContent = ageError === "Data futura" ? 'Futura' : 'Inválida'; ageDisplay.className = 'invalid'; }
            dobInput.focus(); return false;
        }
        userData.nome = nomeVal;
        userData.dob = dobVal; // Salva como string "dd/mm/aaaa"
        console.log("Etapa 1 OK:", userData);
        return true;
    }

    function validateStep2() {
        // Disciplinas são opcionais, então esta etapa é sempre "válida" para prosseguir.
        // Os dados de disciplinas já estão no array 'disciplinas'.
        console.log("Etapa 2 (Disciplinas) processada. Disciplinas atuais:", disciplinas);
        return true;
    }

    function finalizeSetup() {
        console.log("Finalizando configuração...");
        if (!userData.nome || !userData.dob) {
            console.error("Erro: Dados de 'userInfo' ausentes na finalização.");
            displayStatus('Erro interno: dados de perfil incompletos. Volte para a Etapa 1.', 'erro', 0);
            currentStep = 1; showStep(currentStep); // Força volta para etapa 1
            return;
        }
        try {
            localStorage.setItem('userInfo', JSON.stringify(userData));
            localStorage.setItem('disciplinas', JSON.stringify(disciplinas)); 
            // Remove o item de cronograma se existir, pois não foi configurado aqui
            if (localStorage.getItem('cronograma')) localStorage.removeItem('cronograma');

            console.log("Salvo userInfo:", userData);
            console.log("Salvo disciplinas:", disciplinas);
            
            displayStatus('Configuração Concluída! Redirecionando...', 'sucesso', 0);
            if(nextButton) nextButton.disabled = true;
            if(prevButton) prevButton.disabled = true;
            if(skipButton) skipButton.disabled = true;
            if(nextButton) nextButton.textContent = 'Salvo!';
            
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        } catch (error) {
            console.error("Erro ao salvar dados finais no localStorage:", error);
            displayStatus('Ocorreu um erro ao salvar a configuração final.', 'erro', 0);
        }
    }

    function handleNext() {
        let isValid = false;
        if (currentStep === 1) {
            isValid = validateStep1();
        } else if (currentStep === 2) {
            isValid = validateStep2(); 
            if (isValid) {
                finalizeSetup();
                return; 
            }
        }
        if (isValid && currentStep < totalSteps) {
            currentStep++;
            showStep(currentStep);
        }
    }

    function handlePrev() {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    }

    function handleSkip() {
        console.log(`Pulando Etapa ${currentStep}`);
        if (currentStep === 2) { // Pulando a etapa de disciplinas
            // As disciplinas ficam como estão (podem ser vazias ou com dados pré-existentes se o usuário voltou)
            finalizeSetup();
        }
    }

    function checkInitialSetup() {
        const userInfoSaved = localStorage.getItem('userInfo');
        if (userInfoSaved) {
            try {
                const userInfoParsed = JSON.parse(userInfoSaved);
                if (userInfoParsed && userInfoParsed.nome && userInfoParsed.dob && parseAndValidateDdMmYyyy(userInfoParsed.dob)) {
                    console.log("Configuração inicial já realizada. Redirecionando para index.html...");
                    if(document.body.classList.contains('login-page') && loginContainer) { // Evita mostrar em outras páginas
                        loginContainer.innerHTML = '<p style="text-align:center; padding:20px; font-size:1.1em; color:#333;">Configuração já realizada. Redirecionando...</p>';
                    }
                    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
                    return true; 
                } else {
                    // userInfo existe mas é inválido, remove para recomeçar.
                    localStorage.removeItem('userInfo');
                }
            } catch (e) {
                console.error("Erro ao parsear userInfo do localStorage, removendo item corrompido.", e);
                localStorage.removeItem('userInfo');
            }
        }
        console.log("Nenhuma configuração inicial válida encontrada. Exibindo formulário.");
        return false; 
    }

    const loginContainer = document.querySelector('.login-container'); // Para a mensagem de redirecionamento
    if (!checkInitialSetup()) {
        // Preenche os campos se dados já existirem (ex: usuário voltou uma etapa)
        if (userData.nome && nomeInput) nomeInput.value = userData.nome;
        if (userData.dob && dobInput) {
             dobInput.value = userData.dob;
             applyDateMask(dobInput); // Formata e calcula idade se já houver
             const birthDateObj = parseAndValidateDdMmYyyy(dobInput.value);
             if (birthDateObj && ageDisplay) {
                const { age, error } = calculateAgeFromDate(birthDateObj);
                if(!error && age !== null) ageDisplay.textContent = `Idade: ${age} ${age === 1 ? 'ano' : 'anos'}`;
             }
        }
        
        showStep(currentStep); // Mostra a primeira etapa (ou a atual se o usuário recarregar)

        if(prevButton) prevButton.addEventListener('click', handlePrev);
        if(nextButton) nextButton.addEventListener('click', handleNext);
        if(skipButton) skipButton.addEventListener('click', handleSkip);
        if(addDisciplinaBtn) addDisciplinaBtn.addEventListener('click', adicionarDisciplinaNaLista);
        if(nomeDisciplinaInput) nomeDisciplinaInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') { e.preventDefault(); adicionarDisciplinaNaLista(); }});
        if (dobInput && ageDisplay) {
            dobInput.addEventListener('input', (e) => {
                applyDateMask(e.target);
                const dobValue = e.target.value;
                let msg = '', cssClass = '';
                if (dobValue.length === 10) {
                    const bdo = parseAndValidateDdMmYyyy(dobValue);
                    if (bdo) {
                        const { age: ageCalc, error: ageErr } = calculateAgeFromDate(bdo);
                        if (ageErr) { msg = ageErr === "Data futura" ? 'Data futura!' : 'Idade/Data inválida!'; cssClass = 'invalid'; }
                        else if (ageCalc !== null) { msg = `Idade: ${ageCalc} ${ageCalc === 1 ? 'ano' : 'anos'}`; }
                    } else { msg = 'Data inválida!'; cssClass = 'invalid'; }
                }
                ageDisplay.textContent = msg;
                ageDisplay.className = cssClass;
            });
        }
        console.log("Listeners de navegação e formulário configurados.");
    }
});
