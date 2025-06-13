// Constantes e seletores DOM
const abas = document.querySelectorAll(".aba-btn");
const secoes = document.querySelectorAll(".conteudo-aba section");
let abaAtiva = 0; // Index da aba ativa

// Elementos do Dashboard e Progresso
const checkboxes = document.querySelectorAll(".topicos-lista input[type=checkbox]");
const progressoGeralBarra = document.getElementById("barra-progresso-geral"); // Mantido para a aba Progresso
const progressoTexto = document.getElementById("texto-progresso-geral"); // Mantido para a aba Progresso
const progressoMatematicaBarra = document.getElementById("barra-progresso-matematica"); // Mantido para a aba Progresso
const progressoPortuguesBarra = document.getElementById("barra-progresso-portugues"); // Mantido para a aba Progresso
const pendenciasLista = document.getElementById("pendencias-lista"); // Lista de pendências na aba Progresso

// Elementos específicos do Dashboard
const totalTopicosEl = document.getElementById("total-topicos");
const concluidosEl = document.getElementById("concluidos-topicos");
const pendentesEl = document.getElementById("pendentes-topicos");
const pendenciasDashboardEl = document.getElementById("pendencias-dashboard"); // Lista de pendências na aba Dashboard
const progressoGeralCentroEl = document.getElementById("progressoGeralCentro"); // Elemento para o texto central do gráfico de rosca

// Elementos das novas barras de progresso no Dashboard
const barraProgressoDisciplinaMatematica = document.getElementById("barra-progresso-disciplina-matematica");
const percentualMatematicaEl = document.getElementById("percentual-matematica");
const barraProgressoDisciplinaPortugues = document.getElementById("barra-progresso-disciplina-portugues");
const percentualPortuguesEl = document.getElementById("percentual-portugues");


const STORAGE_KEY = "progresso_trilha_estudo"; // Chave para o localStorage
let graficoDoughnut; // Variável para a instância do Chart.js (Doughnut)

// Mapeamento de tópicos por disciplina para facilitar o cálculo de progresso
const disciplinaTopicos = {
    matematica: ['algebra', 'geometria', 'combinatoria', 'probabilidade', 'estatistica'],
    portugues: ['interpretação', 'gramatica', 'ortografia', 'redacao']
};

// --- Funções de Navegação por Abas (GSAP e Hammer.js) ---

/**
 * Anima a transição entre as seções das abas.
 * Usa GSAP para um efeito de fade in/out suave.
 * @param {number} index - O índice da seção a ser ativada.
 */
function animarAba(index) {
    secoes.forEach((sec, i) => {
        if (i === index) {
            gsap.to(sec, { duration: 0.5, autoAlpha: 1, display: "block", ease: "power2.out" });
            sec.classList.add("active");
        } else {
            gsap.to(sec, { duration: 0.3, autoAlpha: 0, display: "none", ease: "power2.in" });
            sec.classList.remove("active");
        }
    });
}

/**
 * Ativa uma aba específica, atualizando a classe 'active' e o atributo 'aria-selected'.
 * Em seguida, chama a função para animar a transição da seção.
 * @param {number} index - O índice da aba a ser ativada.
 */
function ativarAba(index) {
    abas.forEach((btn, i) => {
        btn.classList.toggle("active", i === index);
        btn.setAttribute("aria-selected", i === index ? "true" : "false");
    });
    animarAba(index);
    abaAtiva = index;
}

// Inicializa a primeira aba como ativa ao carregar a página
ativarAba(0);

// Adiciona event listeners para os cliques nas abas
abas.forEach((aba, i) => {
    aba.addEventListener("click", () => ativarAba(i));
});

// Adiciona funcionalidade de swipe para trocar de abas (Hammer.js)
const hammer = new Hammer(document.querySelector(".conteudo-aba"));
hammer.on("swipeleft", () => {
    let next = (abaAtiva + 1) % abas.length;
    ativarAba(next);
});
hammer.on("swiperight", () => {
    let prev = (abaAtiva - 1 + abas.length) % abas.length;
    ativarAba(prev);
});

// --- Funções de Gerenciamento de Tópicos e Progresso ---

/**
 * Adiciona funcionalidade de toggle para os botões "Ver tópicos".
 * Expande/contrai a lista de tópicos e atualiza o texto do botão e o atributo aria-expanded.
 */
document.querySelectorAll(".btn-ver-topicos").forEach(btn => {
    btn.addEventListener("click", () => {
        const ul = btn.nextElementSibling;
        const expanded = btn.getAttribute("aria-expanded") === "true";

        ul.hidden = expanded;
        btn.setAttribute("aria-expanded", !expanded);
        btn.textContent = expanded ? "Ver tópicos" : "Esconder tópicos";
    });
});

/**
 * Salva o estado dos checkboxes no localStorage.
 * Exibe um SweetAlert2 de sucesso e atualiza o progresso na UI.
 */
function salvarProgresso() {
    try {
        let estado = {};
        checkboxes.forEach(cb => {
            estado[cb.id] = cb.checked;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));

        Swal.fire({
            icon: 'success',
            title: 'Progresso salvo!',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
        atualizarProgresso();
    } catch (e) {
        console.error("Erro ao salvar progresso:", e);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao salvar!',
            text: 'Não foi possível salvar o seu progresso. Verifique o espaço de armazenamento do seu navegador.',
            showConfirmButton: true
        });
    }
}

/**
 * Carrega o estado dos checkboxes do localStorage e os aplica.
 * Em seguida, atualiza o progresso na UI.
 */
function carregarProgresso() {
    try {
        const dados = localStorage.getItem(STORAGE_KEY);
        if (!dados) return;

        let estado = JSON.parse(dados);
        checkboxes.forEach(cb => {
            cb.checked = !!estado[cb.id];
        });
        atualizarProgresso();
    } catch (e) {
        console.error("Erro ao carregar progresso:", e);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao carregar!',
            text: 'Não foi possível carregar o seu progresso salvo.',
            showConfirmButton: true
        });
    }
}

/**
 * Calcula o progresso percentual de uma disciplina com base nos seus tópicos.
 * @param {string[]} ids - Um array de IDs de checkboxes pertencentes à disciplina.
 * @returns {number} O percentual de progresso da disciplina (0-100).
 */
function calcularProgressoDisciplina(ids) {
    const totalTopicosDisciplina = ids.length;
    const marcadosDisciplina = ids.filter(id => {
        const cb = document.getElementById(id);
        return cb ? cb.checked : false;
    }).length;
    return totalTopicosDisciplina > 0 ? Math.round((marcadosDisciplina / totalTopicosDisciplina) * 100) : 0;
}

/**
 * Atualiza uma barra de progresso e seu texto de percentual.
 * @param {HTMLElement} barraElement - O elemento da barra de progresso (div.progresso-preenchido).
 * @param {HTMLElement} percentualElement - O elemento de texto que exibe o percentual.
 * @param {number} percentual - O valor percentual a ser exibido.
 */
function atualizarBarraProgresso(barraElement, percentualElement, percentual) {
    if (barraElement) {
        barraElement.style.width = percentual + "%";
    }
    if (percentualElement) {
        percentualElement.textContent = `${percentual}%`;
    }
}

/**
 * Calcula e atualiza todos os indicadores de progresso na UI:
 * - Cards do Dashboard (total, concluídos, pendentes)
 * - Listas de pendências
 * - Progresso geral (barra e texto - aba Progresso)
 * - Progresso por disciplina (barras - aba Progresso e Dashboard)
 * - Gráfico de rosca por disciplina (Dashboard)
 */
function atualizarProgresso() {
    const total = checkboxes.length;
    const marcados = Array.from(checkboxes).filter(cb => cb.checked).length;
    const pendentes = total - marcados;
    const percGeral = total > 0 ? Math.round((marcados / total) * 100) : 0;
    
    // 1. Atualiza Dashboard Cards
    totalTopicosEl.textContent = total;
    concluidosEl.textContent = marcados;
    pendentesEl.textContent = pendentes;
    
    // 2. Atualiza listas de pendências (Dashboard e Progresso)
    pendenciasDashboardEl.innerHTML = '';
    pendenciasLista.innerHTML = '';
    
    Array.from(checkboxes).forEach(cb => {
        if (!cb.checked) {
            const label = document.querySelector(`label[for="${cb.id}"]`);
            if (label) {
                // Para a dashboard
                const liDash = document.createElement('li');
                liDash.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${label.textContent}`;
                pendenciasDashboardEl.appendChild(liDash);
                
                // Para a aba progresso
                const liProg = document.createElement('li');
                liProg.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${label.textContent}`;
                pendenciasLista.appendChild(liProg);
            }
        }
    });
    
    // Calcula progresso por disciplina
    const percMatematica = calcularProgressoDisciplina(disciplinaTopicos.matematica);
    const percPortugues = calcularProgressoDisciplina(disciplinaTopicos.portugues);
    
    // 3. Atualiza barras de progresso na aba 'Progresso'
    atualizarBarraProgresso(progressoGeralBarra, progressoTexto, percGeral);
    atualizarBarraProgresso(progressoMatematicaBarra, null, percMatematica); // Não tem elemento de texto separado na aba Progresso
    atualizarBarraProgresso(progressoPortuguesBarra, null, percPortugues); // Não tem elemento de texto separado na aba Progresso

    // 4. Atualiza as NOVAS barras de progresso no Dashboard
    atualizarBarraProgresso(barraProgressoDisciplinaMatematica, percentualMatematicaEl, percMatematica);
    atualizarBarraProgresso(barraProgressoDisciplinaPortugues, percentualPortuguesEl, percPortugues);

    // 5. Atualiza o gráfico de rosca na dashboard
    atualizarGraficoDoughnut(percMatematica, percPortugues, percGeral);
}

// --- Gráfico de Rosca para Progresso por Disciplina (Corrigido para Distorção) ---

// Plugin para desenhar texto no centro do Doughnut Chart
const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: function(chart, args, options) {
        // Nada aqui, o texto é manipulado por um elemento HTML externo
    }
};

// Registrar o plugin (se ainda não estiver registrado)
Chart.register(centerTextPlugin);

/**
 * Inicializa ou atualiza o gráfico de rosca na Dashboard.
 * @param {number} matematica - Percentual de progresso de Matemática.
 * @param {number} portugues - Percentual de progresso de Português.
 * @param {number} percGeral - Percentual de progresso geral.
 */
function atualizarGraficoDoughnut(matematica, portugues, percGeral) {
    const ctx = document.getElementById('graficoProgresso').getContext('2d');
    progressoGeralCentroEl.textContent = `${percGeral}%`; // Atualiza o texto externo ao gráfico

    // Destroi a instância antiga do gráfico se ela existir para evitar sobreposição
    if (graficoDoughnut) {
        graficoDoughnut.destroy();
    }

    const outros = 100 - matematica - portugues;
    const finalOutros = Math.max(0, outros); // Garante que "outros" não seja negativo

    graficoDoughnut = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Matemática', 'Português', 'Outros'],
            datasets: [{
                data: [matematica, portugues, finalOutros],
                backgroundColor: [
                    getComputedStyle(document.documentElement).getPropertyValue('--grafico-matematica').trim(),
                    getComputedStyle(document.documentElement).getPropertyValue('--grafico-portugues').trim(),
                    getComputedStyle(document.documentElement).getPropertyValue('--grafico-outros').trim()
                ],
                hoverOffset: 8,
                borderColor: 'white',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true, // Garante que o gráfico mantenha sua proporção 1:1
            cutout: '75%', // Tamanho do furo central
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 14,
                            family: 'Inter'
                        },
                        boxWidth: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed + '%';
                            }
                            return label;
                        }
                    },
                    bodyFont: {
                        family: 'Inter'
                    }
                },
            }
        },
        plugins: [centerTextPlugin]
    });
}


// --- Inicialização ---

// Adiciona event listeners para salvar o progresso sempre que um checkbox é alterado
checkboxes.forEach(cb => cb.addEventListener("change", salvarProgresso));

// Carrega o progresso salvo ao carregar a página
carregarProgresso();

// Inicializa os tooltips da Tippy.js (seus elementos 'Como começar')
document.addEventListener('DOMContentLoaded', () => {
    tippy('.comecar-link', {
        animation: 'scale',
        placement: 'top',
        theme: 'light-border',
        allowHTML: true,
    });
});
