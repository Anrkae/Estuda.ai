document.addEventListener('DOMContentLoaded', () => {
    const abas = document.querySelectorAll(".nav-item");
    const secoes = document.querySelectorAll(".conteudo-aba section");
    
    let editalData = {};
    let graficoDoughnut;
    const STORAGE_KEY_PROGRESSO = "progresso_trilha_estudo";

    function animarAba(index) {
        gsap.to(secoes, { duration: 0.3, autoAlpha: 0, display: 'none', ease: 'power2.in' });
        gsap.to(secoes[index], { duration: 0.5, autoAlpha: 1, display: 'block', ease: 'power2.out' });
    }

    function ativarAba(index) {
        abas.forEach((btn, i) => btn.classList.toggle("active", i === index));
        animarAba(index);
    }

    function salvarProgresso() {
        let estado = {};
        const checkboxes = document.querySelectorAll(".checkbox-original");
        checkboxes.forEach(cb => { estado[cb.id] = cb.checked; });
        localStorage.setItem(STORAGE_KEY_PROGRESSO, JSON.stringify(estado));
        atualizarProgresso();
    }

    function carregarProgresso() {
        const dados = localStorage.getItem(STORAGE_KEY_PROGRESSO);
        if (dados) {
            let estado = JSON.parse(dados);
            const checkboxes = document.querySelectorAll(".checkbox-original");
            checkboxes.forEach(cb => {
                if (estado[cb.id] !== undefined) {
                    cb.checked = !!estado[cb.id];
                }
            });
        }
        atualizarProgresso();
    }
    
    function calcularProgressoDisciplina(disciplinaId) {
        const disciplina = editalData.disciplinas.find(d => d.id === disciplinaId);
        if (!disciplina || disciplina.topicos.length === 0) return 0;
        
        const ids = disciplina.topicos.map(t => t.id);
        const marcadosDisciplina = ids.filter(id => {
            const cb = document.getElementById(id);
            return cb ? cb.checked : false;
        }).length;
        
        return Math.round((marcadosDisciplina / ids.length) * 100);
    }
    
    function atualizarBarraProgresso(barraId, percentualId, percentual) {
        const barraElement = document.getElementById(barraId);
        const percentualElement = document.getElementById(percentualId);
        if (barraElement) barraElement.style.width = percentual + "%";
        if (percentualElement) percentualElement.textContent = `${percentual}%`;
    }

    function atualizarProgresso() {
        if (!editalData.disciplinas) return;

        const todosTopicos = editalData.disciplinas.flatMap(d => d.topicos);
        const total = todosTopicos.length;
        const marcados = document.querySelectorAll(".checkbox-original:checked").length;
        const pendentes = total - marcados;
        const percGeral = total > 0 ? Math.round((marcados / total) * 100) : 0;
        
        document.getElementById("total-topicos").textContent = total;
        document.getElementById("concluidos-topicos").textContent = marcados;
        document.getElementById("pendentes-topicos").textContent = pendentes;
        
        atualizarBarraProgresso('barra-progresso-total-dashboard', 'percentual-total-dashboard', percGeral);
        
        const containerProgressoDashboard = document.getElementById('disciplinas-progresso-container-dashboard');
        containerProgressoDashboard.innerHTML = '';
        let progressosDisciplinas = {};

        editalData.disciplinas.forEach(disciplina => {
            const perc = calcularProgressoDisciplina(disciplina.id);
            progressosDisciplinas[disciplina.nome] = perc;
            const progressoItem = document.createElement('div');
            progressoItem.className = 'progresso-item';
            progressoItem.innerHTML = `
                <strong>${disciplina.nome}:</strong>
                <div class="progresso-barra" aria-label="Barra de progresso de ${disciplina.nome}">
                    <div class="progresso-preenchido" style="width: ${perc}%;"></div>
                </div>
                <span class="progresso-percentual">${perc}%</span>`;
            containerProgressoDashboard.appendChild(progressoItem);
        });

        const pendenciasDashboardEl = document.getElementById("pendencias-dashboard");
        pendenciasDashboardEl.innerHTML = '';
        todosTopicos.forEach(topico => {
            const cb = document.getElementById(topico.id);
            if (cb && !cb.checked) {
                const liDash = document.createElement('li');
                liDash.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${topico.nome}`;
                pendenciasDashboardEl.appendChild(liDash);
            }
        });
        
        atualizarGraficoDoughnut(progressosDisciplinas, percGeral);
    }

    function atualizarGraficoDoughnut(progressos, percGeral) {
        const ctx = document.getElementById('graficoProgresso')?.getContext('2d');
        if (!ctx) return;
        
        document.getElementById("progressoGeralCentro").textContent = `${percGeral}%`;

        if (graficoDoughnut) graficoDoughnut.destroy();

        const labels = Object.keys(progressos);
        const data = Object.values(progressos);
        const colors = editalData.pesos_gerais.colors.slice(0, labels.length);

        graficoDoughnut = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors, hoverOffset: 8, borderColor: '#f5f4f0', borderWidth: 4 }] },
            options: { responsive: true, maintainAspectRatio: true, cutout: '75%', plugins: { legend: { position: 'bottom' } } }
        });
    }

    function criarGraficoPesos() {
        const ctx = document.getElementById('graficoPesos');
        if (!ctx || !editalData || !editalData.pesos_gerais) return;

        const { labels, data, colors } = editalData.pesos_gerais;
        const datasets = labels.map((label, index) => ({
            label: label,
            data: [data[index]],
            backgroundColor: colors[index]
        }));
        
        datasets.forEach((d, i) => {
            const radius = 10;
            d.borderRadius = (i === 0) ? { topRight: 0, bottomRight: 0, topLeft: radius, bottomLeft: radius }
                : (i === datasets.length - 1) ? { topRight: radius, bottomRight: radius, topLeft: 0, bottomLeft: 0 }
                : 0;
        });

        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: { labels: [''], datasets: datasets },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { boxWidth: 15, font: { size: 12 } } },
                    tooltip: { enabled: true, callbacks: { label: (c) => ` ${c.dataset.label}: ${c.raw}%` } }
                },
                scales: { x: { stacked: true, max: 100, grid: { display: false }, ticks: { display: false } }, y: { stacked: true, grid: { display: false }, ticks: { display: false } } }
            }
        });
    }
    
    function preencherAbaEdital() {
        document.getElementById('edital-nome').textContent = editalData.nome;
        document.getElementById('edital-data').textContent = editalData.data_prova;
        document.getElementById('edital-banca').textContent = editalData.banca;
        document.getElementById('edital-vagas').textContent = editalData.vagas;
        document.getElementById('edital-obs').textContent = editalData.observacoes;
    }

    function gerarBlocosDisciplinas() {
        const container = document.getElementById('disciplinas-container');
        if (!container || !editalData.disciplinas) return;

        container.innerHTML = '';
        editalData.disciplinas.forEach(disciplina => {
            const bloco = document.createElement('div');
            bloco.className = 'bloco minimizado';

            const topicosHtml = disciplina.topicos.map(topico => `
                <li>
                    <input type="checkbox" id="${topico.id}" class="checkbox-original" hidden>
                    <button class="topico-btn" data-drawer-trigger="drawer-main" data-topic-id="${topico.id}" data-discipline-id="${disciplina.id}">
                        ${topico.nome}
                    </button>
                </li>
            `).join('');

            bloco.innerHTML = `
                <div class="disciplina-card">
                    <div class="tituloBtn botao-minimizar">
                        <h3>${disciplina.nome}</h3>
                        <button class="btn-toggle-bloco botao-minimizar"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="conteudo-bloco">
                        <small>${disciplina.topicos.length} tópicos • Peso: ${disciplina.peso_disciplina}%</small>
                        <ul class="topicos-lista-botoes">${topicosHtml}</ul>
                    </div>
                </div>`;
            container.appendChild(bloco);
        });
    }

    function abrirDrawer(topicId, disciplineId) {
        const disciplina = editalData.disciplinas.find(d => d.id === disciplineId);
        if (!disciplina) return;
        const topicData = disciplina.topicos.find(t => t.id === topicId);
        if (!topicData) return;
        
        const drawer = document.getElementById('drawer-main');
        const originalCheckbox = document.getElementById(topicId);
        const modalCheckbox = document.getElementById('drawer-checkbox');
        
        document.getElementById('drawer-title').textContent = topicData.nome;
        document.getElementById('drawer-description').textContent = topicData.desc;
        document.getElementById('drawer-peso').textContent = topicData.peso_topico;
        
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
        
        modalCheckbox.checked = originalCheckbox.checked;
        modalCheckbox.dataset.originalId = topicId;
        drawer.classList.add('is-open');
    }

    function configurarOuvintesEventos() {
        abas.forEach((aba, i) => aba.addEventListener("click", () => ativarAba(i)));
        
        const containerDisciplinas = document.getElementById('disciplinas-container');
        containerDisciplinas.addEventListener('click', (e) => {
            const topicButton = e.target.closest('.topico-btn');
            if (topicButton) {
                const { topicId, disciplineId } = topicButton.dataset;
                abrirDrawer(topicId, disciplineId);
                return; 
            }

            const checkbox = e.target.closest('.checkbox-original');
            if(checkbox) {
                 salvarProgresso();
                 Swal.fire({ icon: 'success', title: 'Progresso salvo!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                 return;
            }

            const toggleButton = e.target.closest('.botao-minimizar');
            if (toggleButton) {
                const bloco = toggleButton.closest('.bloco');
                if (bloco) {
                    bloco.classList.toggle('minimizado');
                    const icon = toggleButton.querySelector('i.fas');
                    if (icon) {
                        icon.classList.toggle('fa-plus');
                        icon.classList.toggle('fa-minus');
                    }
                }
            }
        });
        
        const drawer = document.getElementById('drawer-main');
        drawer.querySelectorAll('[data-drawer-close]').forEach(el => el.addEventListener('click', () => drawer.classList.remove('is-open')));
        
        document.getElementById('drawer-checkbox').addEventListener('change', (e) => {
            const originalId = e.target.dataset.originalId;
            const originalCheckbox = document.getElementById(originalId);
            if (originalCheckbox) {
                originalCheckbox.checked = e.target.checked;
                salvarProgresso();
            }
        });
    }

    async function iniciar() {
        try {
            const response = await fetch('../assets/data/edital.json');
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            editalData = await response.json();
            
            preencherAbaEdital();
            criarGraficoPesos();
            gerarBlocosDisciplinas();
            carregarProgresso();
            configurarOuvintesEventos();
            
        } catch (error) {
            console.error('Falha ao iniciar a aplicação:', error);
            document.getElementById('edital-nome').textContent = 'Falha ao carregar dados';
        }
    }

    iniciar();
});