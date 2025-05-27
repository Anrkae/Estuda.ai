document.addEventListener('DOMContentLoaded', () => {
    let cronogramaSalvo = {};
    let todasDisciplinas = [];
    let currentSlideIndex = 0;
    let draggingElement = null;
    let placeholder = null;
    let modoEdicaoAtivo = false;
    let disciplinasDoRascunhoAtual = [];
    let diasDeDescansoSelecionados = [];
    let diasDeRevisaoSelecionados = [];
    let duracaoRevisaoUsuario = 120;
    let diasDeSimuladoSelecionados = [];
    let duracaoSimuladoUsuario = 180;
    let tipoDiaEspecialAtualModal = null;

    const disciplinasSelecaoEl = document.getElementById('disciplinas-para-selecao');
    const minutosPorDiaInput = document.getElementById('minutos-por-dia');
    const subjectsPerDayInput = document.getElementById('subjects-per-day');
    const breakTimeInput = document.getElementById('break-time');
    const questionTimeInput = document.getElementById('question-time');
    const botaoGerarEl = document.getElementById('botao-gerar');
    const statusGeracaoEl = document.getElementById('status-geracao');
    const cronogramaDiasContainerEl = document.getElementById('cronograma-dias-container');
    const botaoAnteriorEl = document.getElementById('botao-anterior');
    const botaoProximoEl = document.getElementById('botao-proximo');
    const botaoSalvarEl = document.getElementById('botao-salvar');
    const statusSalvarEl = document.getElementById('status-salvar');
    const checkDiaDescansoEl = document.getElementById('check-dia-descanso');
    const checkDiaRevisaoEl = document.getElementById('check-dia-revisao');
    const checkDiaSimuladoEl = document.getElementById('check-dia-simulado');
    const modalSelecionarDiasEl = document.getElementById('modal-selecionar-dias');
    const modalTipoDiaTituloEl = document.getElementById('modal-tipo-dia-titulo');
    const modalDiasSemanaCheckboxesEl = document.getElementById('modal-dias-semana-checkboxes');
    const modalBotaoConfirmarEl = document.getElementById('modal-botao-confirmar');
    const modalBotaoCancelarEl = document.getElementById('modal-botao-cancelar');
    const modalOpcoesDuracaoEl = modalSelecionarDiasEl.querySelector('.modal-opcoes-duracao');
    const modalInputDuracaoLabelEl = modalOpcoesDuracaoEl.querySelector('label[for="modal-input-duracao"]');
    const modalInputDuracaoEl = document.getElementById('modal-input-duracao');
    const modalSubstituirDisciplinaEl = document.getElementById('modal-substituir-disciplina');
    const disciplinaAtualModalEl = document.getElementById('disciplina-atual-modal');
    const selectNovaDisciplinaEl = document.getElementById('select-nova-disciplina');
    const modalSubstituirConfirmarEl = document.getElementById('modal-substituir-confirmar');
    const modalSubstituirCancelarEl = document.getElementById('modal-substituir-cancelar');
    let eventoParaEditarInfo = null;

    const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const HORA_INICIO_PADRAO = 7;
    const MIN_STUDY_DURATION = 10;
    const TOTAL_DIAS = DIAS_SEMANA.length;

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.disciplina-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    function handlePointerDown(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const targetItem = e.currentTarget;
        if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL' || e.target.classList.contains('drag-handle')) {
             if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') return;
        }
        draggingElement = targetItem;
        draggingElement.classList.add('dragging');
        placeholder = document.createElement('div');
        placeholder.classList.add('drop-placeholder');
        draggingElement.parentNode.insertBefore(placeholder, draggingElement.nextSibling);
        placeholder.style.height = `${draggingElement.offsetHeight}px`;
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerUp);
        e.preventDefault();
    }
    function handlePointerMove(e) {
        if (!draggingElement) return;
        e.preventDefault();
        const container = disciplinasSelecaoEl;
        const y = e.clientY;
        const afterElement = getDragAfterElement(container, y);
        if (placeholder) {
            if (afterElement == null) { container.appendChild(placeholder); }
            else { container.insertBefore(placeholder, afterElement); }
        }
    }
    function handlePointerUp(e) {
        if (!draggingElement) return;
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
        placeholder = null;
        const container = disciplinasSelecaoEl;
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) { container.appendChild(draggingElement); }
        else { container.insertBefore(draggingElement, afterElement); }
        draggingElement.classList.remove('dragging');
        draggingElement = null;
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('pointercancel', handlePointerUp);
    }

    function atualizarBotoesCarrossel() {
        if (!botaoAnteriorEl || !botaoProximoEl) return;
        const hasContent = cronogramaSalvo && Object.keys(cronogramaSalvo).length > 0 && Object.values(cronogramaSalvo).some(day => day && day.length > 0);
        botaoAnteriorEl.disabled = currentSlideIndex === 0;
        botaoProximoEl.disabled = currentSlideIndex >= TOTAL_DIAS - 1;
        botaoAnteriorEl.style.display = hasContent ? 'flex' : 'none';
        botaoProximoEl.style.display = hasContent ? 'flex' : 'none';
    }
    function mostrarSlide(index) {
        if (!cronogramaDiasContainerEl) return;
        const offsetPercentage = index * (100 / TOTAL_DIAS);
        cronogramaDiasContainerEl.style.transform = `translateX(-${offsetPercentage}%)`;
        currentSlideIndex = index;
        atualizarBotoesCarrossel();
    }
    function slideAnterior() { if (currentSlideIndex > 0) mostrarSlide(currentSlideIndex - 1); }
    function slideProximo() { if (currentSlideIndex < TOTAL_DIAS - 1) mostrarSlide(currentSlideIndex + 1); }

    function carregarDisciplinas() {
        try {
            const disciplinasStorage = JSON.parse(localStorage.getItem('disciplinas')) || [];
            if (disciplinasStorage.length > 0 && typeof disciplinasStorage[0]?.nome === 'undefined') {
                if (disciplinasSelecaoEl) disciplinasSelecaoEl.innerHTML = '<p style="color: red;">Erro: Formato das disciplinas inválido.</p>';
                todasDisciplinas = []; return;
            }
            todasDisciplinas = disciplinasStorage;
            if (!disciplinasSelecaoEl) return;
            disciplinasSelecaoEl.innerHTML = '';
            if (todasDisciplinas.length === 0) {
                disciplinasSelecaoEl.innerHTML = '<p>Nenhuma disciplina cadastrada. Vá para a página de cadastro.</p>';
                return;
            }
            todasDisciplinas.forEach((disciplina, index) => {
                const div = document.createElement('div');
                div.classList.add('disciplina-item');
                div.dataset.id = `disciplina-${index}`;
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `check-disciplina-${index}`;
                checkbox.value = disciplina.nome;
                checkbox.name = 'disciplinasSelecionadas';
                checkbox.checked = true;
                const label = document.createElement('label');
                label.htmlFor = `check-disciplina-${index}`;
                label.textContent = disciplina.nome;
                const dragHandle = document.createElement('i');
                dragHandle.classList.add('fas', 'fa-grip-vertical', 'drag-handle');
                div.appendChild(dragHandle); div.appendChild(checkbox); div.appendChild(label);
                disciplinasSelecaoEl.appendChild(div);
                div.addEventListener('pointerdown', handlePointerDown);
            });
        } catch (error) {
            if (disciplinasSelecaoEl) disciplinasSelecaoEl.innerHTML = '<p style="color: red;">Erro ao carregar disciplinas.</p>';
            todasDisciplinas = [];
        }
    }

    function exibirCronogramaPorDias(scheduleData) {
        if (!cronogramaDiasContainerEl) return;
        cronogramaDiasContainerEl.innerHTML = '';
        const hasSchedule = scheduleData && Object.keys(scheduleData).length > 0 && Object.values(scheduleData).some(day => day && day.length > 0);

        if (!hasSchedule) {
            cronogramaDiasContainerEl.innerHTML = '<div class="dia-container" style="width: 100%; text-align: center; color: #888; padding: 30px 15px;"><p>Nenhum cronograma para exibir.<br>Gere um novo ou verifique se há um salvo.</p></div>';
            cronogramaDiasContainerEl.style.width = '100%';
            atualizarBotoesCarrossel();
            return;
        }
        cronogramaDiasContainerEl.style.width = `${TOTAL_DIAS * 100}%`;
        DIAS_SEMANA.forEach((nomeDia, diaIdx) => {
            const diaContainer = document.createElement('div');
            diaContainer.classList.add('dia-container');
            const tituloDia = document.createElement('h4');
            tituloDia.textContent = nomeDia;
            diaContainer.appendChild(tituloDia);
            const listaEventos = document.createElement('ul');
            listaEventos.classList.add('lista-eventos');
            const eventosDoDia = scheduleData[diaIdx] || [];
            if (eventosDoDia.length > 0) {
                eventosDoDia.sort((a, b) => a.startTime - b.startTime);
                eventosDoDia.forEach((evento) => {
                    const itemEvento = document.createElement('li');
                    itemEvento.classList.add('evento-item');
                    let innerHTMLContent = "";
                    if (evento.type === 'study') {
                        itemEvento.classList.add('evento-estudo');
                        innerHTMLContent = `<strong>${evento.subject}</strong><span>Tempo: ${evento.duration} min</span>`;
                        if (modoEdicaoAtivo) {
                            const originalEventIndex = cronogramaSalvo[diaIdx].indexOf(evento);
                            itemEvento.dataset.dayIdx = diaIdx;
                            itemEvento.dataset.eventIdx = originalEventIndex;
                            innerHTMLContent += `<button class="edit-event-btn" title="Substituir disciplina"><i class="fas fa-exchange-alt"></i></button>`;
                        }
                    } else if (evento.type === 'break') {
                        itemEvento.classList.add('evento-descanso');
                        innerHTMLContent = `<strong>Descanso</strong><span>Tempo: ${evento.duration} min</span>`;
                    } else if (evento.type === 'question') {
                        itemEvento.classList.add('evento-questoes');
                        innerHTMLContent = `<strong>Questões: ${evento.subject}</strong><span>Tempo: ${evento.duration} min</span>`;
                    } else if (evento.type === 'review_general') {
                        itemEvento.classList.add('evento-revisao-geral');
                        innerHTMLContent = `<strong>${evento.subject}</strong><span>Tempo: ${evento.duration} min</span>`;
                    } else if (evento.type === 'mock_exam') {
                        itemEvento.classList.add('evento-simulado');
                        innerHTMLContent = `<strong>${evento.subject}</strong><span>Tempo: ${evento.duration} min</span>`;
                    } else if (evento.type === 'rest_day') {
                        itemEvento.classList.add('evento-dia-descanso-programado');
                        innerHTMLContent = `<strong>${evento.subject}</strong>`;
                    }
                    itemEvento.innerHTML = innerHTMLContent;
                    listaEventos.appendChild(itemEvento);
                });
            } else {
                const semEventos = document.createElement('p');
                semEventos.textContent = 'Nenhuma atividade programada.';
                semEventos.style.textAlign = 'center'; semEventos.style.fontSize = '12px';
                semEventos.style.color = '#999'; semEventos.style.padding = '10px 0';
                listaEventos.appendChild(semEventos);
            }
            diaContainer.appendChild(listaEventos);
            cronogramaDiasContainerEl.appendChild(diaContainer);
        });
        mostrarSlide(currentSlideIndex);
        atualizarBotoesCarrossel();
    }

    function preencherModalDiasSemana(tipoAtual, selecionadosParaEsteTipo) {
        if (!modalDiasSemanaCheckboxesEl) return;
        modalDiasSemanaCheckboxesEl.innerHTML = '';
        DIAS_SEMANA.forEach((dia, index) => {
            const div = document.createElement('div');
            div.classList.add('modal-dia-item');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.id = `modal-check-dia-${index}`;
            checkbox.value = index; checkbox.checked = selecionadosParaEsteTipo.includes(index);
            let isTakenByOtherType = false; let takenByTypeDisplay = '';
            if (tipoAtual !== 'descanso' && diasDeDescansoSelecionados.includes(index)) { isTakenByOtherType = true; takenByTypeDisplay = 'Descanso'; }
            else if (tipoAtual !== 'revisao' && diasDeRevisaoSelecionados.includes(index)) { isTakenByOtherType = true; takenByTypeDisplay = 'Revisão'; }
            else if (tipoAtual !== 'simulado' && diasDeSimuladoSelecionados.includes(index)) { isTakenByOtherType = true; takenByTypeDisplay = 'Simulado'; }
            const label = document.createElement('label');
            label.htmlFor = `modal-check-dia-${index}`; label.textContent = dia;
            if (isTakenByOtherType) {
                checkbox.disabled = true; div.classList.add('dia-ocupado');
                const spanOcupado = document.createElement('span');
                spanOcupado.textContent = ` ( ${takenByTypeDisplay} )`;
                spanOcupado.style.fontSize = '0.8em'; spanOcupado.style.marginLeft = '4px'; spanOcupado.style.color = '#757575';
                label.appendChild(spanOcupado);
                label.title = `Este dia já está como ${takenByTypeDisplay}.`;
            }
            div.appendChild(checkbox); div.appendChild(label);
            modalDiasSemanaCheckboxesEl.appendChild(div);
        });
    }
    function abrirModalDiasEspeciais(tipoDia, tituloTipoDia, diasJaSelecionados, mostrarDuracao = false, duracaoPadrao = 0) {
        if (!modalSelecionarDiasEl || !modalTipoDiaTituloEl || !modalOpcoesDuracaoEl || !modalInputDuracaoLabelEl || !modalInputDuracaoEl) return;
        tipoDiaEspecialAtualModal = tipoDia;
        modalTipoDiaTituloEl.textContent = tituloTipoDia;
        preencherModalDiasSemana(tipoDia, diasJaSelecionados);
        if (mostrarDuracao) {
            modalOpcoesDuracaoEl.style.display = 'block';
            modalInputDuracaoLabelEl.style.display = 'inline';
            modalInputDuracaoEl.style.display = 'inline-block';
            modalInputDuracaoEl.value = duracaoPadrao;
            if (tipoDia === 'revisao') modalInputDuracaoLabelEl.textContent = 'Duração por dia de revisão (min):';
            else if (tipoDia === 'simulado') modalInputDuracaoLabelEl.textContent = 'Duração por dia de simulado (min):';
        } else {
            modalOpcoesDuracaoEl.style.display = 'none';
            modalInputDuracaoLabelEl.style.display = 'none';
            modalInputDuracaoEl.style.display = 'none';
        }
        modalSelecionarDiasEl.style.display = 'flex';
    }
    function fecharModalDiasEspeciais() {
        if (modalSelecionarDiasEl) modalSelecionarDiasEl.style.display = 'none';
        tipoDiaEspecialAtualModal = null;
    }
    function confirmarSelecaoDiasEspeciais() {
        if (!modalDiasSemanaCheckboxesEl || !tipoDiaEspecialAtualModal) return;
        const checkboxesMarcadosNoModal = modalDiasSemanaCheckboxesEl.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)');
        const diasEfetivamenteSelecionadosNoModal = Array.from(checkboxesMarcadosNoModal).map(cb => parseInt(cb.value));
        let duracaoInputadaPeloUsuario = 0;
        if (modalInputDuracaoEl.style.display !== 'none' && modalInputDuracaoEl.value) {
            duracaoInputadaPeloUsuario = parseInt(modalInputDuracaoEl.value);
            if (isNaN(duracaoInputadaPeloUsuario) || duracaoInputadaPeloUsuario < MIN_STUDY_DURATION) {
                alert(`Por favor, insira uma duração válida (mínimo ${MIN_STUDY_DURATION} minutos).`);
                return;
            }
        }
        diasEfetivamenteSelecionadosNoModal.forEach(dayIdx => {
            if (tipoDiaEspecialAtualModal !== 'descanso') diasDeDescansoSelecionados = diasDeDescansoSelecionados.filter(d => d !== dayIdx);
            if (tipoDiaEspecialAtualModal !== 'revisao') diasDeRevisaoSelecionados = diasDeRevisaoSelecionados.filter(d => d !== dayIdx);
            if (tipoDiaEspecialAtualModal !== 'simulado') diasDeSimuladoSelecionados = diasDeSimuladoSelecionados.filter(d => d !== dayIdx);
        });
        if (tipoDiaEspecialAtualModal === 'descanso') diasDeDescansoSelecionados = [...diasEfetivamenteSelecionadosNoModal].sort((a,b)=>a-b);
        else if (tipoDiaEspecialAtualModal === 'revisao') {
            diasDeRevisaoSelecionados = [...diasEfetivamenteSelecionadosNoModal].sort((a,b)=>a-b);
            if (diasDeRevisaoSelecionados.length > 0 && duracaoInputadaPeloUsuario >= MIN_STUDY_DURATION) duracaoRevisaoUsuario = duracaoInputadaPeloUsuario;
            else if (diasDeRevisaoSelecionados.length > 0 && duracaoRevisaoUsuario < MIN_STUDY_DURATION) duracaoRevisaoUsuario = 120;
        } else if (tipoDiaEspecialAtualModal === 'simulado') {
            diasDeSimuladoSelecionados = [...diasEfetivamenteSelecionadosNoModal].sort((a,b)=>a-b);
            if (diasDeSimuladoSelecionados.length > 0 && duracaoInputadaPeloUsuario >= MIN_STUDY_DURATION) duracaoSimuladoUsuario = duracaoInputadaPeloUsuario;
            else if (diasDeSimuladoSelecionados.length > 0 && duracaoSimuladoUsuario < MIN_STUDY_DURATION) duracaoSimuladoUsuario = 180;
        }
        if(checkDiaDescansoEl) checkDiaDescansoEl.checked = diasDeDescansoSelecionados.length > 0;
        if(checkDiaRevisaoEl) checkDiaRevisaoEl.checked = diasDeRevisaoSelecionados.length > 0;
        if(checkDiaSimuladoEl) checkDiaSimuladoEl.checked = diasDeSimuladoSelecionados.length > 0;
        fecharModalDiasEspeciais();
    }

    function abrirModalSubstituir(dayIdx, eventIdx) {
        if (!modalSubstituirDisciplinaEl || !disciplinaAtualModalEl || !selectNovaDisciplinaEl ||
            !cronogramaSalvo[dayIdx] || !cronogramaSalvo[dayIdx][eventIdx]) return;
        eventoParaEditarInfo = { dayIdx, eventIdx };
        const evento = cronogramaSalvo[dayIdx][eventIdx];
        disciplinaAtualModalEl.textContent = evento.subject;
        selectNovaDisciplinaEl.innerHTML = '';
        disciplinasDoRascunhoAtual.forEach(nomeDisciplina => {
            if (nomeDisciplina !== evento.subject) {
                const option = document.createElement('option');
                option.value = nomeDisciplina; option.textContent = nomeDisciplina;
                selectNovaDisciplinaEl.appendChild(option);
            }
        });
        if (selectNovaDisciplinaEl.options.length === 0) {
            selectNovaDisciplinaEl.innerHTML = '<option value="">Nenhuma outra disciplina disponível</option>';
            selectNovaDisciplinaEl.disabled = true;
            if(modalSubstituirConfirmarEl) modalSubstituirConfirmarEl.disabled = true;
        } else {
            selectNovaDisciplinaEl.disabled = false;
            if(modalSubstituirConfirmarEl) modalSubstituirConfirmarEl.disabled = false;
        }
        modalSubstituirDisciplinaEl.style.display = 'flex';
    }
    function fecharModalSubstituir() {
        if (modalSubstituirDisciplinaEl) modalSubstituirDisciplinaEl.style.display = 'none';
        eventoParaEditarInfo = null;
    }
    function confirmarTrocaDisciplina() {
        if (!eventoParaEditarInfo || !selectNovaDisciplinaEl || selectNovaDisciplinaEl.value === "" || !cronogramaSalvo) return;
        const { dayIdx, eventIdx } = eventoParaEditarInfo;
        if (!cronogramaSalvo[dayIdx] || !cronogramaSalvo[dayIdx][eventIdx]) return;

        const novaDisciplina = selectNovaDisciplinaEl.value;
        const eventoEstudo = cronogramaSalvo[dayIdx][eventIdx];
        if (eventoEstudo && eventoEstudo.type === 'study') {
            const disciplinaOriginal = eventoEstudo.subject;
            eventoEstudo.subject = novaDisciplina;
            if (eventIdx + 1 < cronogramaSalvo[dayIdx].length) {
                const proximoEvento = cronogramaSalvo[dayIdx][eventIdx + 1];
                if (proximoEvento.type === 'question' && proximoEvento.subject === disciplinaOriginal) {
                    proximoEvento.subject = novaDisciplina;
                }
            }
            exibirCronogramaPorDias(cronogramaSalvo);
        }
        fecharModalSubstituir();
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    function gerarCronogramaAutomatico() {
        if (!statusGeracaoEl || !disciplinasSelecaoEl || !minutosPorDiaInput || !subjectsPerDayInput || !breakTimeInput || !questionTimeInput) {
            return;
        }
        statusGeracaoEl.textContent = ''; statusGeracaoEl.style.color = '#ff7043';
        
        const itensOrdenadosParaGeracao = Array.from(disciplinasSelecaoEl.querySelectorAll('.disciplina-item'))
                                     .map(item => item.querySelector('input[type="checkbox"]'))
                                     .filter(cb => cb.checked)
                                     .map(cb => cb.value);

        const minutosTotaisDiaOriginal = parseInt(minutosPorDiaInput.value);
        const disciplinasPorDiaOriginal = parseInt(subjectsPerDayInput.value);
        const tempoDescansoOriginal = parseInt(breakTimeInput.value);
        const tempoQuestoesOriginal = parseInt(questionTimeInput.value);

        let temAlgumaConfiguracao = itensOrdenadosParaGeracao.length > 0 || diasDeDescansoSelecionados.length > 0 || diasDeRevisaoSelecionados.length > 0 || diasDeSimuladoSelecionados.length > 0;
        if (!temAlgumaConfiguracao) { statusGeracaoEl.textContent = 'Selecione disciplinas ou configure dias especiais.'; return; }
        
        let numDiasNormaisAgendaveis = 0;
        for (let i = 0; i < TOTAL_DIAS; i++) {
            if (!diasDeDescansoSelecionados.includes(i) && !diasDeRevisaoSelecionados.includes(i) && !diasDeSimuladoSelecionados.includes(i)) {
                numDiasNormaisAgendaveis++;
            }
        }

        if (itensOrdenadosParaGeracao.length > 0 && numDiasNormaisAgendaveis > 0) {
            if (isNaN(minutosTotaisDiaOriginal) || minutosTotaisDiaOriginal <= 0) { statusGeracaoEl.textContent = 'Minutos totais por dia (dias normais) inválido.'; return; }
            if (isNaN(disciplinasPorDiaOriginal) || disciplinasPorDiaOriginal <= 0) { statusGeracaoEl.textContent = 'Disciplinas por dia (dias normais) inválido.'; return; }
            if (isNaN(tempoDescansoOriginal) || tempoDescansoOriginal < 0) { statusGeracaoEl.textContent = 'Tempo de descanso (dias normais) inválido.'; return; }
            if (isNaN(tempoQuestoesOriginal) || tempoQuestoesOriginal < 0) { statusGeracaoEl.textContent = 'Tempo para questões (dias normais) inválido.'; return; }
            if (disciplinasPorDiaOriginal > itensOrdenadosParaGeracao.length && itensOrdenadosParaGeracao.length > 0) {
            }
        }

        let weightedShuffledDisciplinas = [];
        if (itensOrdenadosParaGeracao.length > 0) {
            const weightedDisciplinas = [];
            const numSelecionadas = itensOrdenadosParaGeracao.length;
            itensOrdenadosParaGeracao.forEach((nome, index) => {
                const priorityScore = numSelecionadas - 1 - index; 
                const repetitions = 1 + Math.ceil(Math.pow(Math.max(0, priorityScore), 1.2));
                for (let i = 0; i < repetitions; i++) { weightedDisciplinas.push(nome); }
            });
            weightedShuffledDisciplinas = shuffleArray([...weightedDisciplinas]);
        }

        cronogramaSalvo = {};
        let disciplinaGlobalIndex = 0;

        for (let diaIdx = 0; diaIdx < TOTAL_DIAS; diaIdx++) {
            cronogramaSalvo[diaIdx] = [];
            let horaAtualMinutos = HORA_INICIO_PADRAO * 60;

            if (diasDeDescansoSelecionados.includes(diaIdx)) {
                cronogramaSalvo[diaIdx].push({ type: 'rest_day', subject: 'Dia de Descanso', duration: 0, startTime: horaAtualMinutos });
                continue;
            }
            if (diasDeRevisaoSelecionados.includes(diaIdx)) {
                if (duracaoRevisaoUsuario >= MIN_STUDY_DURATION) {
                    const dur = Math.min(duracaoRevisaoUsuario, (24 * 60) - horaAtualMinutos);
                    if (dur >= MIN_STUDY_DURATION) {
                        cronogramaSalvo[diaIdx].push({ type: 'review_general', subject: 'Revisão Geral', duration: dur, startTime: horaAtualMinutos });
                    }
                }
                continue;
            }
            if (diasDeSimuladoSelecionados.includes(diaIdx)) {
                if (duracaoSimuladoUsuario >= MIN_STUDY_DURATION) {
                    const dur = Math.min(duracaoSimuladoUsuario, (24 * 60) - horaAtualMinutos);
                    if (dur >= MIN_STUDY_DURATION) {
                        cronogramaSalvo[diaIdx].push({ type: 'mock_exam', subject: 'Simulado', duration: dur, startTime: horaAtualMinutos });
                    }
                }
                continue;
            }

            if (itensOrdenadosParaGeracao.length === 0 || disciplinasPorDiaOriginal === 0 || minutosTotaisDiaOriginal === 0) continue;

            const numeroDescansos = disciplinasPorDiaOriginal > 1 ? disciplinasPorDiaOriginal - 1 : 0;
            const tempoTotalDescanso = numeroDescansos * (tempoDescansoOriginal || 0);
            const tempoTotalQuestoes = disciplinasPorDiaOriginal * (tempoQuestoesOriginal || 0);
            const tempoDisponivelEstudo = minutosTotaisDiaOriginal - tempoTotalDescanso - tempoTotalQuestoes;

            if (tempoDisponivelEstudo <= 0) { continue; }
            let duracaoEstudoPorBloco = Math.floor(tempoDisponivelEstudo / disciplinasPorDiaOriginal);
            if (duracaoEstudoPorBloco <= 0) continue;
            if (duracaoEstudoPorBloco < MIN_STUDY_DURATION) {
            }

            let disciplinasUsadasHoje = new Set();
            let tentativasRepeticao = 0;
            for (let i = 0; i < disciplinasPorDiaOriginal; i++) {
                if (horaAtualMinutos >= 24 * 60 || weightedShuffledDisciplinas.length === 0) break;
                let disciplinaAtual;
                let indiceInicialLoop = weightedShuffledDisciplinas.length > 0 ? disciplinaGlobalIndex % weightedShuffledDisciplinas.length : 0;
                do {
                    if (weightedShuffledDisciplinas.length === 0) break; 
                    disciplinaAtual = weightedShuffledDisciplinas[disciplinaGlobalIndex % weightedShuffledDisciplinas.length];
                    disciplinaGlobalIndex++;
                    tentativasRepeticao++;
                    if (disciplinaGlobalIndex % weightedShuffledDisciplinas.length === indiceInicialLoop && tentativasRepeticao > weightedShuffledDisciplinas.length){
                        break;
                    }
                } while (disciplinasUsadasHoje.has(disciplinaAtual) &&
                         itensOrdenadosParaGeracao.length > disciplinasUsadasHoje.size && 
                         tentativasRepeticao <= weightedShuffledDisciplinas.length * 2);
                
                if(!disciplinaAtual) break;

                disciplinasUsadasHoje.add(disciplinaAtual);
                tentativasRepeticao = 0;

                const studyStartTime = horaAtualMinutos;
                const actualStudyDuration = Math.min(duracaoEstudoPorBloco, (24 * 60) - studyStartTime);

                if (actualStudyDuration >= MIN_STUDY_DURATION) {
                    cronogramaSalvo[diaIdx].push({ type: 'study', subject: disciplinaAtual, duration: actualStudyDuration, startTime: studyStartTime });
                    horaAtualMinutos += actualStudyDuration;
                    if ((tempoQuestoesOriginal || 0) > 0) {
                        if (horaAtualMinutos >= 24 * 60) break;
                        const qStartTime = horaAtualMinutos;
                        const actualQDuration = Math.min(tempoQuestoesOriginal, (24 * 60) - qStartTime);
                        if (actualQDuration > 0) {
                            cronogramaSalvo[diaIdx].push({ type: 'question', subject: disciplinaAtual, duration: actualQDuration, startTime: qStartTime });
                            horaAtualMinutos += actualQDuration;
                        }
                    }
                } else if (actualStudyDuration > 0) { }
                  else { break; }

                if (i < disciplinasPorDiaOriginal - 1 && (tempoDescansoOriginal || 0) > 0 && actualStudyDuration >= MIN_STUDY_DURATION) {
                    if (horaAtualMinutos >= 24 * 60) break;
                    const bStartTime = horaAtualMinutos;
                    const actualBDuration = Math.min(tempoDescansoOriginal, (24 * 60) - bStartTime);
                    if (actualBDuration > 0) {
                        cronogramaSalvo[diaIdx].push({ type: 'break', subject: 'Descanso', duration: actualBDuration, startTime: bStartTime });
                        horaAtualMinutos += actualBDuration;
                    }
                }
            }
        }
        modoEdicaoAtivo = true;
        disciplinasDoRascunhoAtual = [...itensOrdenadosParaGeracao];
        currentSlideIndex = 0;
        exibirCronogramaPorDias(cronogramaSalvo);
        if(statusGeracaoEl) {
            statusGeracaoEl.textContent = 'Rascunho gerado! Edite os blocos de estudo ou salve.';
            statusGeracaoEl.style.color = 'green';
        }
        const carrosselEl = document.querySelector('.carrossel-container');
        if (carrosselEl) carrosselEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function salvarCronograma() {
        if(!statusSalvarEl) return;
        if (Object.keys(cronogramaSalvo).length === 0 || Object.values(cronogramaSalvo).every(day => day.length ===0)) {
            statusSalvarEl.textContent = 'Gere um cronograma antes de salvar.'; statusSalvarEl.style.color = 'red';
            setTimeout(() => { if(statusSalvarEl) statusSalvarEl.textContent = ''; }, 3000); return;
        }
        try {
            localStorage.setItem('cronograma', JSON.stringify(cronogramaSalvo));
            modoEdicaoAtivo = false;
            disciplinasDoRascunhoAtual = [];
            exibirCronogramaPorDias(cronogramaSalvo);
            if(statusSalvarEl) {
                statusSalvarEl.textContent = 'Cronograma salvo!'; statusSalvarEl.style.color = 'green';
                setTimeout(() => { if(statusSalvarEl) statusSalvarEl.textContent = ''; }, 3000);
            }
        } catch (error) {
            if(statusSalvarEl) { statusSalvarEl.textContent = 'Erro ao salvar.'; statusSalvarEl.style.color = 'red';}
        }
    }
    function carregarCronogramaSalvo() {
        const salvo = localStorage.getItem('cronograma');
        cronogramaSalvo = {}; 
        modoEdicaoAtivo = false; 
        disciplinasDoRascunhoAtual = [];

        if (salvo) {
            try {
                const parsed = JSON.parse(salvo);
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                     const keysAreValid = Object.keys(parsed).every(key => !isNaN(parseInt(key)) && parseInt(key) >= 0 && parseInt(key) < TOTAL_DIAS);
                     const valuesAreValid = Object.values(parsed).every(value => Array.isArray(value));
                     if (keysAreValid && valuesAreValid) {
                         cronogramaSalvo = parsed;
                     } else { localStorage.removeItem('cronograma'); }
                 } else { localStorage.removeItem('cronograma'); }
            } catch (error) { localStorage.removeItem('cronograma');}
        }
        
        if (Object.keys(cronogramaSalvo).length > 0 && Object.values(cronogramaSalvo).some(day => day && day.length > 0)) {
            const dataAtual = new Date();
            const diaDaSemanaJs = dataAtual.getDay(); 
            let diaDaSemanaApp = (diaDaSemanaJs === 0) ? 6 : diaDaSemanaJs - 1;
            currentSlideIndex = diaDaSemanaApp;
        } else {
            currentSlideIndex = 0; 
        }
        
        exibirCronogramaPorDias(cronogramaSalvo);
    }

    if (disciplinasSelecaoEl) carregarDisciplinas();
    carregarCronogramaSalvo();
    if (botaoGerarEl) botaoGerarEl.addEventListener('click', gerarCronogramaAutomatico);
    if (botaoSalvarEl) botaoSalvarEl.addEventListener('click', salvarCronograma);
    if (botaoAnteriorEl) botaoAnteriorEl.addEventListener('click', slideAnterior);
    if (botaoProximoEl) botaoProximoEl.addEventListener('click', slideProximo);

    [checkDiaDescansoEl, checkDiaRevisaoEl, checkDiaSimuladoEl].forEach(el => {
        if (el) {
            el.addEventListener('change', (e) => {
                const type = e.target.value;
                let title = '', currentSelections = [], showDuration = false, defaultDuration = 0;
                if (type === 'descanso') { title = 'Descanso Programado'; currentSelections = diasDeDescansoSelecionados; }
                else if (type === 'revisao') { title = 'Revisão'; currentSelections = diasDeRevisaoSelecionados; showDuration = true; defaultDuration = duracaoRevisaoUsuario; }
                else if (type === 'simulado') { title = 'Simulado'; currentSelections = diasDeSimuladoSelecionados; showDuration = true; defaultDuration = duracaoSimuladoUsuario; }
                if (e.target.checked) abrirModalDiasEspeciais(type, title, currentSelections, showDuration, defaultDuration);
                else {
                    if (type === 'descanso') diasDeDescansoSelecionados = [];
                    else if (type === 'revisao') diasDeRevisaoSelecionados = [];
                    else if (type === 'simulado') diasDeSimuladoSelecionados = [];
                }
            });
        }
    });

    if (modalBotaoConfirmarEl) modalBotaoConfirmarEl.addEventListener('click', confirmarSelecaoDiasEspeciais);
    if (modalBotaoCancelarEl) modalBotaoCancelarEl.addEventListener('click', () => {
        let cb;
        if (tipoDiaEspecialAtualModal === 'descanso') cb = checkDiaDescansoEl;
        else if (tipoDiaEspecialAtualModal === 'revisao') cb = checkDiaRevisaoEl;
        else if (tipoDiaEspecialAtualModal === 'simulado') cb = checkDiaSimuladoEl;
        if (cb && ((tipoDiaEspecialAtualModal === 'descanso' && diasDeDescansoSelecionados.length === 0) ||
                   (tipoDiaEspecialAtualModal === 'revisao' && diasDeRevisaoSelecionados.length === 0) ||
                   (tipoDiaEspecialAtualModal === 'simulado' && diasDeSimuladoSelecionados.length === 0))) {
            if(cb) cb.checked = false;
        }
        fecharModalDiasEspeciais();
    });
    if (modalSelecionarDiasEl) modalSelecionarDiasEl.addEventListener('click', (event) => {
        if (event.target === modalSelecionarDiasEl) {
            let cb;
            if (tipoDiaEspecialAtualModal === 'descanso') cb = checkDiaDescansoEl;
            else if (tipoDiaEspecialAtualModal === 'revisao') cb = checkDiaRevisaoEl;
            else if (tipoDiaEspecialAtualModal === 'simulado') cb = checkDiaSimuladoEl;
            if (cb && ((tipoDiaEspecialAtualModal === 'descanso' && diasDeDescansoSelecionados.length === 0) ||
                       (tipoDiaEspecialAtualModal === 'revisao' && diasDeRevisaoSelecionados.length === 0) ||
                       (tipoDiaEspecialAtualModal === 'simulado' && diasDeSimuladoSelecionados.length === 0))) {
                if(cb) cb.checked = false;
            }
            fecharModalDiasEspeciais();
        }
    });

    if (cronogramaDiasContainerEl) {
        cronogramaDiasContainerEl.addEventListener('click', function(event) {
            const targetButton = event.target.closest('.edit-event-btn');
            if (targetButton && modoEdicaoAtivo) {
                const eventoItemEl = targetButton.closest('.evento-item');
                if (eventoItemEl && eventoItemEl.dataset.dayIdx !== undefined && eventoItemEl.dataset.eventIdx !== undefined) {
                    const dayIdx = parseInt(eventoItemEl.dataset.dayIdx);
                    const eventIdx = parseInt(eventoItemEl.dataset.eventIdx);
                    abrirModalSubstituir(dayIdx, eventIdx);
                }
            }
        });
    }
    if (modalSubstituirConfirmarEl) modalSubstituirConfirmarEl.addEventListener('click', confirmarTrocaDisciplina);
    if (modalSubstituirCancelarEl) modalSubstituirCancelarEl.addEventListener('click', fecharModalSubstituir);
    if (modalSubstituirDisciplinaEl) {
        modalSubstituirDisciplinaEl.addEventListener('click', (event) => {
            if (event.target === modalSubstituirDisciplinaEl) fecharModalSubstituir();
        });
    }
});