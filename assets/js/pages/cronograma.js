// Variáveis globais e constantes
let cronogramaSalvo = {};
let todasDisciplinas = [];
let currentSlideIndex = 0;
let draggingElement = null;
let placeholder = null;

// Referências a elementos do DOM
const disciplinasSelecaoEl = document.getElementById('disciplinas-para-selecao');
const minutosPorDiaInput = document.getElementById('minutos-por-dia');
const subjectsPerDayInput = document.getElementById('subjects-per-day');
const breakTimeInput = document.getElementById('break-time');
const questionTimeInput = document.getElementById('question-time'); // Referência ao novo input
const botaoGerarEl = document.getElementById('botao-gerar');
const statusGeracaoEl = document.getElementById('status-geracao');
const cronogramaDiasContainerEl = document.getElementById('cronograma-dias-container');
const botaoAnteriorEl = document.getElementById('botao-anterior');
const botaoProximoEl = document.getElementById('botao-proximo');
const botaoSalvarEl = document.getElementById('botao-salvar');
const statusSalvarEl = document.getElementById('status-salvar');
// Referência ao botão da sidebar foi REMOVIDA

// Constantes
const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const HORA_INICIO_PADRAO = 7; // Horário de início (7:00 AM)
const MIN_STUDY_DURATION = 10; // Duração mínima de um bloco de estudo
const TOTAL_DIAS = DIAS_SEMANA.length;

// --- Funções de Drag and Drop (Priorização) ---

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
    if (e.target.type === 'checkbox') return;

   draggingElement = targetItem;
   draggingElement.classList.add('dragging');

   placeholder = document.createElement('div');
   placeholder.classList.add('drop-placeholder');
   // Insere o placeholder imediatamente após o elemento sendo arrastado inicialmente
   draggingElement.parentNode.insertBefore(placeholder, draggingElement.nextSibling);
   // Ajusta a altura do placeholder para corresponder ao item arrastado
   placeholder.style.height = `${draggingElement.offsetHeight}px`;


   document.addEventListener('pointermove', handlePointerMove);
   document.addEventListener('pointerup', handlePointerUp);
   document.addEventListener('pointercancel', handlePointerUp); // Cancela se necessário
    e.preventDefault(); // Previne seleção de texto ou outros comportamentos padrão
}

function handlePointerMove(e) {
   if (!draggingElement) return;
   e.preventDefault(); // Previne rolagem ou outros comportamentos durante o arraste

   const container = disciplinasSelecaoEl;
   const y = e.clientY; // Coordenada Y do ponteiro
   const afterElement = getDragAfterElement(container, y);

    // Move o placeholder para a posição correta
    if (placeholder) {
        if (afterElement == null) { // Se for para o final da lista
            container.appendChild(placeholder);
        } else { // Se for antes de outro elemento
            container.insertBefore(placeholder, afterElement);
        }
    }
    // Poderia adicionar feedback visual aqui (ex: rolar a página se chegar perto das bordas)
}

function handlePointerUp(e) {
   if (!draggingElement) return;

    // Remove o placeholder
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    placeholder = null;

   const container = disciplinasSelecaoEl;
   // Determina onde soltar o elemento baseado na posição final do ponteiro
   const afterElement = getDragAfterElement(container, e.clientY);

    // Move o elemento arrastado para a posição final (onde o placeholder estava)
    if (afterElement == null) {
        container.appendChild(draggingElement);
    } else {
        container.insertBefore(draggingElement, afterElement);
    }

   draggingElement.classList.remove('dragging');
   draggingElement = null; // Limpa a referência

   // Remove os listeners globais
   document.removeEventListener('pointermove', handlePointerMove);
   document.removeEventListener('pointerup', handlePointerUp);
   document.removeEventListener('pointercancel', handlePointerUp);
}

// --- Funções do Carrossel ---

function atualizarBotoesCarrossel() {
    if (!botaoAnteriorEl || !botaoProximoEl) return; // Checagem de segurança
    const hasContent = Object.keys(cronogramaSalvo).length > 0 && Object.values(cronogramaSalvo).some(day => day.length > 0);

    botaoAnteriorEl.disabled = currentSlideIndex === 0;
    botaoProximoEl.disabled = currentSlideIndex === TOTAL_DIAS - 1;

    botaoAnteriorEl.style.display = hasContent ? 'flex' : 'none';
    botaoProximoEl.style.display = hasContent ? 'flex' : 'none';
}

function mostrarSlide(index) {
   if (!cronogramaDiasContainerEl) return;
    // Calcula a largura de cada slide (dia) como percentual
    const slideWidthPercent = 100 / TOTAL_DIAS;
    // Calcula o deslocamento necessário para mostrar o slide 'index'
    const offset = index * slideWidthPercent;
    // Aplica a transformação CSS para mover o container
    cronogramaDiasContainerEl.style.transform = `translateX(-${offset}%)`;
    currentSlideIndex = index; // Atualiza o índice atual
    atualizarBotoesCarrossel(); // Atualiza o estado dos botões
}

function slideAnterior() {
    if (currentSlideIndex > 0) {
        mostrarSlide(currentSlideIndex - 1);
    }
}

function slideProximo() {
    if (currentSlideIndex < TOTAL_DIAS - 1) {
        mostrarSlide(currentSlideIndex + 1);
    }
}

// --- Carregamento e Exibição ---

function carregarDisciplinas() {
    try {
        const disciplinasStorage = JSON.parse(localStorage.getItem('disciplinas')) || [];
        // Validação simples do formato esperado (array de objetos com 'nome')
        if (disciplinasStorage.length > 0 && typeof disciplinasStorage[0]?.nome === 'undefined') {
            console.error("Formato inválido das disciplinas no localStorage:", disciplinasStorage);
            disciplinasSelecaoEl.innerHTML = '<p style="color: red;">Erro: Formato das disciplinas inválido.</p>';
            todasDisciplinas = []; return;
        }
        todasDisciplinas = disciplinasStorage;
        disciplinasSelecaoEl.innerHTML = ''; // Limpa conteúdo anterior

        if (todasDisciplinas.length === 0) {
            disciplinasSelecaoEl.innerHTML = '<p>Nenhuma disciplina cadastrada. Vá para a página de cadastro.</p>';
            return;
        }

        todasDisciplinas.forEach((disciplina, index) => {
            const div = document.createElement('div');
            div.classList.add('disciplina-item');
            div.dataset.id = `disciplina-${index}`; // ID para referência
            div.setAttribute('draggable', false); // Desativar drag HTML5 nativo

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `check-disciplina-${index}`;
            checkbox.value = disciplina.nome;
            checkbox.name = 'disciplinasSelecionadas';
            checkbox.checked = true; // Começa selecionada por padrão

            const label = document.createElement('label');
            label.htmlFor = `check-disciplina-${index}`;
            label.textContent = disciplina.nome;

            // Ícone para indicar que é arrastável (opcional)
            const dragHandle = document.createElement('i');
            dragHandle.classList.add('fas', 'fa-grip-vertical', 'drag-handle'); // Estilizar via CSS

            div.appendChild(dragHandle); // Adiciona o handle
            div.appendChild(checkbox);
            div.appendChild(label);
            disciplinasSelecaoEl.appendChild(div);

            // Adiciona o listener para o drag and drop customizado
            div.addEventListener('pointerdown', handlePointerDown);
        });
    } catch (error) {
        console.error("Erro ao carregar disciplinas:", error);
        disciplinasSelecaoEl.innerHTML = '<p style="color: red;">Erro ao carregar disciplinas do localStorage.</p>';
        todasDisciplinas = [];
    }
 }

 function exibirCronogramaPorDias(scheduleData) {
    if (!cronogramaDiasContainerEl) return;
    cronogramaDiasContainerEl.innerHTML = ''; // Limpa o conteúdo anterior

    const hasSchedule = Object.keys(scheduleData).length > 0 && Object.values(scheduleData).some(day => day.length > 0);

    if (!hasSchedule) {
        cronogramaDiasContainerEl.innerHTML = '<div class="dia-container" style="width: 100%; text-align: center; color: #888; padding: 30px 15px;"><p>Nenhum cronograma para exibir.<br>Gere um novo ou verifique se há um salvo.</p></div>';
        cronogramaDiasContainerEl.style.width = '100%'; // Garante que ocupe o espaço correto
        atualizarBotoesCarrossel();
        return;
    }

    // Configura o container para o layout de múltiplos slides
    cronogramaDiasContainerEl.style.width = `${TOTAL_DIAS * 100}%`; // Largura total é N dias * 100%

    DIAS_SEMANA.forEach((nomeDia, diaIdx) => {
        const diaContainer = document.createElement('div');
        diaContainer.classList.add('dia-container'); // Estilo para cada dia

        const tituloDia = document.createElement('h4');
        tituloDia.textContent = nomeDia;
        diaContainer.appendChild(tituloDia);

        const listaEventos = document.createElement('ul');
        listaEventos.classList.add('lista-eventos');

        const eventosDoDia = scheduleData[diaIdx] || [];

        if (eventosDoDia.length > 0) {
            // Ordena os eventos pela hora de início para garantir a ordem cronológica
            eventosDoDia.sort((a, b) => a.startTime - b.startTime);

            eventosDoDia.forEach(evento => {
                const itemEvento = document.createElement('li');
                itemEvento.classList.add('evento-item'); // Classe base para todos os itens

                // Formata a hora (ex: 07:30) - Opcional
                // const horaInicio = Math.floor(evento.startTime / 60).toString().padStart(2, '0');
                // const minutoInicio = (evento.startTime % 60).toString().padStart(2, '0');
                // const horaFormatada = `${horaInicio}:${minutoInicio}`;

                if (evento.type === 'study') {
                    itemEvento.classList.add('evento-estudo');
                    itemEvento.innerHTML = `<strong>${evento.subject}</strong><span>Tempo: ${evento.duration} min</span>`;
                    // itemEvento.innerHTML = `<strong>${evento.subject}</strong><span>${horaFormatada} (${evento.duration} min)</span>`; // Com hora
                } else if (evento.type === 'break') {
                    itemEvento.classList.add('evento-descanso');
                    itemEvento.innerHTML = `<strong>Descanso</strong><span>Tempo: ${evento.duration} min</span>`;
                    // itemEvento.innerHTML = `<strong>Descanso</strong><span>${horaFormatada} (${evento.duration} min)</span>`; // Com hora
                } else if (evento.type === 'question') { // LÓGICA PARA EXIBIR QUESTÕES
                    itemEvento.classList.add('evento-questoes'); // Adiciona classe específica
                    itemEvento.innerHTML = `<strong>Questões: ${evento.subject}</strong><span>Tempo: ${evento.duration} min</span>`;
                    // itemEvento.innerHTML = `<strong>Questões: ${evento.subject}</strong><span>${horaFormatada} (${evento.duration} min)</span>`; // Com hora
                }
                listaEventos.appendChild(itemEvento);
            });
        } else {
            // Mensagem se não houver eventos para o dia
            const semEventos = document.createElement('p');
            semEventos.textContent = 'Nenhuma atividade programada.';
            semEventos.style.textAlign = 'center';
            semEventos.style.fontSize = '12px';
            semEventos.style.color = '#999';
            semEventos.style.padding = '10px 0';
            listaEventos.appendChild(semEventos);
        }
        diaContainer.appendChild(listaEventos);
        cronogramaDiasContainerEl.appendChild(diaContainer); // Adiciona o container do dia ao wrapper
    });

    // Garante que o slide inicial seja exibido corretamente
    mostrarSlide(currentSlideIndex); // Usa o índice atual ou 0 se for a primeira vez
}


// --- Geração do Cronograma ---

// Função auxiliar para embaralhar arrays (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Troca elementos
    }
    return array;
}

function gerarCronogramaAutomatico() {
    statusGeracaoEl.textContent = ''; // Limpa status anterior
    statusGeracaoEl.style.color = '#ff7043'; // Cor padrão para erros/avisos

    // 1. Obter Disciplinas Selecionadas e Ordenadas pela Prioridade Atual
    const disciplinasSelecionadasNomes = [];
    const itensDisciplinasOrdenados = disciplinasSelecaoEl.querySelectorAll('.disciplina-item');
    itensDisciplinasOrdenados.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
            disciplinasSelecionadasNomes.push(checkbox.value);
        }
    });

    // 2. Obter Inputs Numéricos
    const minutosTotaisDia = parseInt(minutosPorDiaInput.value);
    const disciplinasPorDia = parseInt(subjectsPerDayInput.value);
    const tempoDescanso = parseInt(breakTimeInput.value);
    const tempoQuestoes = parseInt(questionTimeInput.value); // Obter tempo de questões

    // 3. Validações
    if (disciplinasSelecionadasNomes.length === 0) {
        statusGeracaoEl.textContent = 'Selecione pelo menos uma disciplina.'; return;
    }
    if (isNaN(minutosTotaisDia) || minutosTotaisDia <= 0) {
        statusGeracaoEl.textContent = 'Informe os minutos totais de estudo por dia.'; return;
    }
    if (isNaN(disciplinasPorDia) || disciplinasPorDia <= 0) {
        statusGeracaoEl.textContent = 'Informe quantas disciplinas diferentes estudar por dia.'; return;
    }
    if (disciplinasPorDia > disciplinasSelecionadasNomes.length) {
         // Permite gerar mesmo se disciplinasPorDia > selecionadas (vai repetir mais)
         console.warn(`Aviso: Estudando ${disciplinasPorDia} disciplinas por dia com apenas ${disciplinasSelecionadasNomes.length} selecionadas. Haverá repetição intensiva.`);
         // Poderia adicionar uma mensagem de aviso aqui se quisesse, mas não impede a geração.
         // statusGeracaoEl.textContent = `Aviso: Você quer estudar ${disciplinasPorDia} disciplina(s) por dia, mas só selecionou ${disciplinasSelecionadasNomes.length}. Haverá repetição.`;
    }
    if (isNaN(tempoDescanso) || tempoDescanso < 0) {
        statusGeracaoEl.textContent = 'Informe um tempo de descanso válido (0 ou mais minutos).'; return;
    }
    if (isNaN(tempoQuestoes) || tempoQuestoes < 0) { // Validar tempo de questões
        statusGeracaoEl.textContent = 'Informe um tempo para questões válido (0 ou mais minutos).'; return;
    }

    // 4. Calcular Tempo Disponível para Estudo (Considerando Descansos e Questões)
    const numeroDescansos = disciplinasPorDia > 1 ? disciplinasPorDia - 1 : 0;
    const tempoTotalDescanso = numeroDescansos * tempoDescanso;
    const tempoTotalQuestoes = disciplinasPorDia * tempoQuestoes; // Tempo de questão ocorre após CADA disciplina

    const tempoDisponivelEstudo = minutosTotaisDia - tempoTotalDescanso - tempoTotalQuestoes;

    if (tempoDisponivelEstudo <= 0) {
        statusGeracaoEl.textContent = 'Tempo total diário insuficiente para estudo, questões e descansos.';
        return;
    }

    let duracaoEstudoPorBloco = Math.floor(tempoDisponivelEstudo / disciplinasPorDia);

    if (duracaoEstudoPorBloco < MIN_STUDY_DURATION) {
        statusGeracaoEl.textContent = `Tempo de estudo por disciplina (${duracaoEstudoPorBloco} min) é muito baixo (mínimo ${MIN_STUDY_DURATION} min) após descontar questões e descansos. Aumente o tempo total ou reduza o número de disciplinas/descansos/questões.`;
        return;
    }

    // 5. Criar Lista Ponderada e Embaralhar
    const weightedDisciplinas = [];
    const numSelecionadas = disciplinasSelecionadasNomes.length;
    disciplinasSelecionadasNomes.forEach((nome, index) => {
        // Peso: Mais repetições para itens no topo (índice menor)
        const repetitions = Math.max(1, numSelecionadas - index);
        for (let i = 0; i < repetitions; i++) {
            weightedDisciplinas.push(nome);
        }
    });
    const weightedShuffledDisciplinas = shuffleArray([...weightedDisciplinas]); // Embaralha a lista ponderada

    // 6. Gerar o Cronograma Dia a Dia
    cronogramaSalvo = {}; // Limpa o cronograma anterior
    let disciplinaGlobalIndex = 0; // Índice para percorrer a lista embaralhada globalmente

    for (let diaIdx = 0; diaIdx < TOTAL_DIAS; diaIdx++) {
        cronogramaSalvo[diaIdx] = []; // Inicializa o array para o dia
        let horaAtualMinutos = HORA_INICIO_PADRAO * 60; // Reinicia a hora para cada dia
        let disciplinasUsadasHoje = new Set(); // Controla disciplinas usadas no dia para evitar repetição imediata
        let tentativasRepeticao = 0; // Contador para evitar loop infinito na seleção

        for (let i = 0; i < disciplinasPorDia; i++) {
            if (horaAtualMinutos >= 24 * 60) break; // Para se passar da meia-noite

            // Seleciona a próxima disciplina da lista global embaralhada
            let disciplinaAtual;
            let indiceOriginalLoop = disciplinaGlobalIndex % weightedShuffledDisciplinas.length; // Guarda o ponto de partida

            do {
                 // Garante que o índice não saia dos limites
                 if (weightedShuffledDisciplinas.length === 0) { // Caso extremo: nenhuma disciplina ponderada
                     disciplinaAtual = "Erro"; // Ou alguma indicação de falha
                     break;
                 }
                disciplinaAtual = weightedShuffledDisciplinas[disciplinaGlobalIndex % weightedShuffledDisciplinas.length];
                disciplinaGlobalIndex++;
                tentativasRepeticao++;

                // Condição de parada do Do-While:
                // 1. Achou uma disciplina NÃO usada hoje
                // 2. OU só tem 1 disciplina selecionada (não tem como evitar repetição)
                // 3. OU já tentou todas as disciplinas ponderadas e não achou uma nova (evita loop)
            } while (disciplinasUsadasHoje.has(disciplinaAtual) &&
                     numSelecionadas > 1 && // Só tenta evitar repetição se houver mais de uma opção
                     tentativasRepeticao <= weightedShuffledDisciplinas.length); // Limite de tentativas

            disciplinasUsadasHoje.add(disciplinaAtual); // Marca como usada hoje
            tentativasRepeticao = 0; // Reseta o contador para a próxima disciplina do dia

            // Adiciona Bloco de Estudo
            const studyStartTime = horaAtualMinutos;
            // Garante que a duração não ultrapasse a meia-noite
            const studyDuration = Math.min(duracaoEstudoPorBloco, (24 * 60) - studyStartTime);
            if (studyDuration <= 0) break; // Se não há tempo, para o dia

            cronogramaSalvo[diaIdx].push({ type: 'study', subject: disciplinaAtual, duration: studyDuration, startTime: studyStartTime });
            horaAtualMinutos += studyDuration;

            // Adiciona Bloco de Questões (se tempo > 0)
            if (tempoQuestoes > 0) {
                if (horaAtualMinutos >= 24 * 60) break;
                const questionStartTime = horaAtualMinutos;
                const questionDuration = Math.min(tempoQuestoes, (24 * 60) - questionStartTime);
                if (questionDuration > 0) {
                     cronogramaSalvo[diaIdx].push({ type: 'question', subject: disciplinaAtual, duration: questionDuration, startTime: questionStartTime });
                     horaAtualMinutos += questionDuration;
                }
            }

            // Adiciona Bloco de Descanso (se aplicável)
            if (i < disciplinasPorDia - 1 && tempoDescanso > 0) { // Só adiciona descanso ENTRE disciplinas
                if (horaAtualMinutos >= 24 * 60) break;
                const breakStartTime = horaAtualMinutos;
                const breakDuration = Math.min(tempoDescanso, (24 * 60) - breakStartTime);
                if (breakDuration > 0) {
                    cronogramaSalvo[diaIdx].push({ type: 'break', subject: 'Descanso', duration: breakDuration, startTime: breakStartTime });
                    horaAtualMinutos += breakDuration;
                }
            }
        }
        // disciplinasUsadasHoje.clear(); // Limpa para o próximo dia (já é feito pela recriação do Set no loop externo)
    }

    // 7. Exibir e Dar Feedback
    currentSlideIndex = 0; // Volta para o primeiro dia ao gerar novo cronograma
    exibirCronogramaPorDias(cronogramaSalvo);
    statusGeracaoEl.textContent = 'Cronograma gerado com sucesso! Verifique e clique em Salvar.';
    statusGeracaoEl.style.color = 'green';

    // Rola a tela para visualizar o cronograma gerado (opcional)
    const carrosselElement = document.querySelector('.carrossel-container');
    if (carrosselElement) {
        carrosselElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}


// --- Salvar e Carregar do LocalStorage ---

function salvarCronograma() {
    if (Object.keys(cronogramaSalvo).length === 0) {
         statusSalvarEl.textContent = 'Gere um cronograma antes de salvar.';
         statusSalvarEl.style.color = 'red';
         setTimeout(() => { statusSalvarEl.textContent = ''; }, 3000);
        return;
    }
     try {
         localStorage.setItem('cronograma', JSON.stringify(cronogramaSalvo));
         statusSalvarEl.textContent = 'Cronograma salvo com sucesso!';
         statusSalvarEl.style.color = 'green';
         setTimeout(() => { statusSalvarEl.textContent = ''; }, 3000); // Limpa a mensagem após 3s
     } catch (error) {
         console.error("Erro ao salvar o cronograma:", error);
         statusSalvarEl.textContent = 'Erro ao salvar o cronograma. Verifique o console.';
         statusSalvarEl.style.color = 'red';
     }
 }

 function carregarCronogramaSalvo() {
     const salvo = localStorage.getItem('cronograma');
     if (salvo) {
         try {
            const parsedData = JSON.parse(salvo);
             // Validação básica da estrutura (objeto não nulo, não array, chaves numéricas, valores são arrays)
             if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) {
                 const keysAreValid = Object.keys(parsedData).every(key => !isNaN(parseInt(key)) && parseInt(key) >= 0 && parseInt(key) < TOTAL_DIAS);
                 const valuesAreValid = Object.values(parsedData).every(value => Array.isArray(value));

                 if(keysAreValid && valuesAreValid) {
                     cronogramaSalvo = parsedData;
                 } else {
                     console.warn("Dados de cronograma salvos parecem inválidos. Ignorando.", parsedData);
                     cronogramaSalvo = {};
                     localStorage.removeItem('cronograma'); // Remove dados inválidos
                 }
             } else {
                 console.warn("Formato inesperado para cronograma salvo. Ignorando.", parsedData);
                 cronogramaSalvo = {};
                 localStorage.removeItem('cronograma'); // Remove dados inválidos
             }
         } catch(error) {
             console.error("Erro ao parsear cronograma salvo:", error);
             cronogramaSalvo = {};
             localStorage.removeItem('cronograma'); // Remove dados inválidos
         }
     } else {
         cronogramaSalvo = {}; // Nenhum cronograma salvo
     }
     currentSlideIndex = 0; // Começa exibindo o primeiro dia
     exibirCronogramaPorDias(cronogramaSalvo); // Exibe o cronograma carregado (ou vazio)
 }


// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    carregarDisciplinas();      // Carrega as disciplinas disponíveis
    carregarCronogramaSalvo(); // Carrega e exibe o último cronograma salvo (se houver)

    // Adiciona listeners aos botões principais
    if (botaoGerarEl) botaoGerarEl.addEventListener('click', gerarCronogramaAutomatico);
    if (botaoSalvarEl) botaoSalvarEl.addEventListener('click', salvarCronograma);
    if (botaoAnteriorEl) botaoAnteriorEl.addEventListener('click', slideAnterior);
    if (botaoProximoEl) botaoProximoEl.addEventListener('click', slideProximo);

    // Listener da sidebar foi REMOVIDO
});
