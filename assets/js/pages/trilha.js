document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES GLOBAIS ---
    const abas = document.querySelectorAll(".nav-item");
    const secoes = document.querySelectorAll(".conteudo-aba section");
    const checkboxes = document.querySelectorAll(".checkbox-original");

    // --- VARIÁVEIS DE ESTADO ---
    let abaAtiva = 0;
    let graficoDoughnut;
    const STORAGE_KEY_PROGRESSO = "progresso_trilha_estudo";

    // --- DADOS SIMULADOS PARA OS TÓPICOS ---
    const dadosDosTopicos = {
        'algebra': { nome: 'Álgebra', desc: 'Estudo de estruturas algébricas, relações e quantidade. Foco em equações, inequações e funções.', peso: 'Alto', aulas: [{ t: 'Fundamentos de Álgebra', u: '#' }, { t: 'Equações de 1º Grau', u: '#' }] },
        'geometria': { nome: 'Geometria', desc: 'Análise de formas, tamanhos e propriedades do espaço.', peso: 'Alto', aulas: [{ t: 'Geometria Plana', u: '#' }, { t: 'Geometria Espacial', u: '#' }] },
        'combinatoria': { nome: 'Análise Combinatória', desc: 'Técnicas de contagem e agrupamento de elementos. Essencial para probabilidade.', peso: 'Médio', aulas: [{ t: 'Princípio Fundamental da Contagem', u: '#' }] },
        'probabilidade': { nome: 'Probabilidade', desc: 'Estudo das chances de ocorrência de eventos aleatórios.', peso: 'Médio', aulas: [{ t: 'Conceitos Iniciais e Prob. Condicional', u: '#' }] },
        'estatistica': { nome: 'Estatística', desc: 'Coleta, organização, análise e interpretação de dados.', peso: 'Baixo', aulas: [{ t: 'Medidas de Tendência Central', u: '#' }] },
        'interpretação': { nome: 'Interpretação de Texto', desc: 'Habilidade de compreender, analisar e extrair informações de textos escritos.', peso: 'Alto', aulas: [{ t: 'Tipos Textuais e Gêneros', u: '#' }, { t: 'Inferência e Contexto', u: '#' }] },
        'gramatica': { nome: 'Gramática', desc: 'Estudo das regras e princípios que regem o uso da língua, incluindo sintaxe e morfologia.', peso: 'Alto', aulas: [{ t: 'Concordância Verbal e Nominal', u: '#' }] },
        'ortografia': { nome: 'Ortografia', desc: 'Conjunto de regras para a escrita correta das palavras e uso de acentuação.', peso: 'Baixo', aulas: [{ t: 'Uso da Crase', u: '#' }] },
        'redacao': { nome: 'Redação', desc: 'Técnicas e práticas para a produção de textos coesos, coerentes e bem estruturados.', peso: 'Médio', aulas: [{ t: 'Estrutura Dissertativa-Argumentativa', u: '#' }] },
    };
    
    const disciplinaTopicos = {
        matematica: ['algebra', 'geometria', 'combinatoria', 'probabilidade', 'estatistica'],
        portugues: ['interpretação', 'gramatica', 'ortografia', 'redacao']
    };

    // --- LÓGICA DE NAVEGAÇÃO POR ABAS ---
    function animarAba(index) {
        gsap.to(secoes, { duration: 0.3, autoAlpha: 0, display: 'none', ease: 'power2.in' });
        gsap.to(secoes[index], { duration: 0.5, autoAlpha: 1, display: 'block', ease: 'power2.out' });
    }

    function ativarAba(index) {
        abas.forEach((btn, i) => btn.classList.toggle("active", i === index));
        animarAba(index);
        abaAtiva = index;
    }

    // --- LÓGICA DE PROGRESSO ---
    function salvarProgresso() {
        let estado = {};
        checkboxes.forEach(cb => { estado[cb.id] = cb.checked; });
        localStorage.setItem(STORAGE_KEY_PROGRESSO, JSON.stringify(estado));
        atualizarProgresso();
    }

    function carregarProgresso() {
        const dados = localStorage.getItem(STORAGE_KEY_PROGRESSO);
        if (dados) {
            let estado = JSON.parse(dados);
            checkboxes.forEach(cb => { cb.checked = !!estado[cb.id]; });
        }
        atualizarProgresso();
    }
    
    function calcularProgressoDisciplina(ids) {
        if (!ids || ids.length === 0) return 0;
        const marcadosDisciplina = ids.filter(id => {
            const cb = document.getElementById(id);
            return cb ? cb.checked : false;
        }).length;
        return Math.round((marcadosDisciplina / ids.length) * 100);
    }
    
    function atualizarBarraProgresso(barraId, percentualId, percentual) {
        const barraElement = document.getElementById(barraId);
        const percentualElement = document.getElementById(percentualId);
        if (barraElement) {
            barraElement.style.width = percentual + "%";
        }
        if (percentualElement) {
            percentualElement.textContent = `${percentual}%`;
        }
    }

    function atualizarProgresso() {
        const total = checkboxes.length;
        const marcados = document.querySelectorAll(".checkbox-original:checked").length;
        const pendentes = total - marcados;
        const percGeral = total > 0 ? Math.round((marcados / total) * 100) : 0;
        
        document.getElementById("total-topicos").textContent = total;
        document.getElementById("concluidos-topicos").textContent = marcados;
        document.getElementById("pendentes-topicos").textContent = pendentes;
        
        atualizarBarraProgresso('barra-progresso-total-dashboard', 'percentual-total-dashboard', percGeral);
        
        const percMatematica = calcularProgressoDisciplina(disciplinaTopicos.matematica);
        const percPortugues = calcularProgressoDisciplina(disciplinaTopicos.portugues);
        
        atualizarBarraProgresso('barra-progresso-disciplina-matematica', 'percentual-matematica', percMatematica);
        atualizarBarraProgresso('barra-progresso-disciplina-portugues', 'percentual-portugues', percPortugues);
        
        const pendenciasDashboardEl = document.getElementById("pendencias-dashboard");
        pendenciasDashboardEl.innerHTML = '';
        checkboxes.forEach(cb => {
            if (!cb.checked) {
                const button = document.querySelector(`button[data-topic-id="${cb.id}"]`);
                if (button) {
                    const liDash = document.createElement('li');
                    liDash.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${button.textContent}`;
                    pendenciasDashboardEl.appendChild(liDash);
                }
            }
        });

        atualizarGraficoDoughnut(percMatematica, percPortugues, percGeral);
    }

    // --- LÓGICA DOS GRÁFICOS (Chart.js) ---
    function atualizarGraficoDoughnut(matematica, portugues, percGeral) {
        const ctx = document.getElementById('graficoProgresso')?.getContext('2d');
        if (!ctx) return;
        
        document.getElementById("progressoGeralCentro").textContent = `${percGeral}%`;

        if (graficoDoughnut) {
            graficoDoughnut.destroy();
        }

        graficoDoughnut = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Matemática', 'Português', 'Outros'],
                datasets: [{
                    data: [matematica, portugues, (100 - matematica - portugues)],
                    backgroundColor: [ '#4CAF50', '#FF7043', '#CCCCCC' ],
                    hoverOffset: 8,
                    borderColor: '#f5f4f0',
                    borderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '75%',
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    function criarGraficoPesos() {
        const ctx = document.getElementById('graficoPesos');
        if (!ctx) return;

        const datasets = [
            { label: 'Matemática', data: [30], backgroundColor: '#4CAF50' },
            { label: 'Português', data: [25], backgroundColor: '#FF7043' },
            { label: 'Direito', data: [20], backgroundColor: '#2196F3' },
            { label: 'Outros', data: [15], backgroundColor: '#FFC107' },
            { label: 'Inglês', data: [10], backgroundColor: '#E91E63' }
        ];

        datasets.forEach((d, i) => {
            const radius = 10;
            d.borderRadius = (i === 0) 
                ? { topRight: 0, bottomRight: 0, topLeft: radius, bottomLeft: radius }
                : (i === datasets.length - 1) 
                ? { topRight: radius, bottomRight: radius, topLeft: 0, bottomLeft: 0 }
                : 0;
        });

        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: { labels: [''], datasets: datasets },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true,
                        position: 'bottom',
                        labels: { boxWidth: 15, font: { size: 12 } }
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: (context) => ` ${context.dataset.label}: ${context.raw}%`
                        }
                    }
                },
                scales: {
                    x: { stacked: true, max: 100, grid: { display: false }, ticks: { display: false } },
                    y: { stacked: true, grid: { display: false }, ticks: { display: false } }
                }
            }
        });
    }

    // --- LÓGICA DA ABA DICAS (Tópicos de Hoje) ---
    function mostrarTopicosDeHoje() {
        const listaEl = document.getElementById('lista-topicos-hoje');
        if (!listaEl) return;

        const cronogramaSalvo = JSON.parse(localStorage.getItem('cronograma')) || {};
        const hoje = (new Date().getDay() + 6) % 7;
        const eventosDeHoje = cronogramaSalvo[hoje] || [];
        const disciplinasDeHoje = eventosDeHoje
            .filter(evento => evento.type === 'study')
            .map(evento => evento.subject);
            
        listaEl.innerHTML = '';
        if (disciplinasDeHoje.length > 0) {
            const disciplinasUnicas = [...new Set(disciplinasDeHoje)];
            disciplinasUnicas.forEach(disciplina => {
                const li = document.createElement('li');
                li.textContent = disciplina;
                listaEl.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = "Dia de descanso ou nenhuma matéria programada!";
            listaEl.appendChild(li);
        }
    }

    // --- LÓGICA DO DRAWER CUSTOMIZADO ---
    function configurarDrawerCustomizado() {
        const drawerTriggers = document.querySelectorAll('[data-drawer-trigger]');
        const drawerId = 'drawer-main';
        const drawer = document.getElementById(drawerId);
        const modalCheckbox = document.getElementById('drawer-checkbox');

        if (!drawer) return;

        const openDrawer = (topicButton) => {
            const topicId = topicButton.dataset.topicId;
            const topicData = dadosDosTopicos[topicId];
            const originalCheckbox = document.getElementById(topicId);

            if (!topicData || !originalCheckbox) return;

            // Preenche o drawer
            document.getElementById('drawer-title').textContent = topicData.nome;
            document.getElementById('drawer-description').textContent = topicData.desc;
            document.getElementById('drawer-peso').textContent = topicData.peso;
            
            const aulasListaEl = document.getElementById('drawer-aulas-lista');
            aulasListaEl.innerHTML = '';
            topicData.aulas.forEach(aula => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = aula.u;
                a.textContent = aula.t;
                a.target = '_blank';
                li.appendChild(a);
                aulasListaEl.appendChild(li);
            });
            
            // Sincroniza o checkbox
            modalCheckbox.checked = originalCheckbox.checked;
            modalCheckbox.dataset.originalId = topicId;

            drawer.classList.add('is-open');
        };

        const closeDrawer = () => {
            drawer.classList.remove('is-open');
        };

        drawerTriggers.forEach(button => {
            button.addEventListener('click', () => openDrawer(button));
        });

        drawer.querySelectorAll('[data-drawer-close]').forEach(element => {
            element.addEventListener('click', closeDrawer);
        });
        
        modalCheckbox.addEventListener('change', () => {
            const originalId = modalCheckbox.dataset.originalId;
            const originalCheckbox = document.getElementById(originalId);
            if (originalCheckbox) {
                originalCheckbox.checked = modalCheckbox.checked;
                originalCheckbox.dispatchEvent(new Event('change'));
            }
        });
    }

    // --- INICIALIZAÇÃO GERAL ---
    abas.forEach((aba, i) => aba.addEventListener("click", () => ativarAba(i)));
    checkboxes.forEach(cb => cb.addEventListener('change', () => {
        salvarProgresso();
        Swal.fire({
            icon: 'success',
            title: 'Progresso salvo!',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    }));
    
    // Roda tudo ao carregar a página
    carregarProgresso();
    criarGraficoPesos();
    configurarDrawerCustomizado();
    mostrarTopicosDeHoje();
});