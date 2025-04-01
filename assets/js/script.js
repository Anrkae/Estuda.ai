// /assets/js/script.js

// Variáveis Globais (Mantenha as que precisam ser acessadas por várias funções)
let currentUser = null;
let sessoesEstudo = [];
let graficoLinha = null;
let graficoDisciplinas = null;

// --- Funções Auxiliares ---
// (Coloque aqui as funções: ultimosDias, obterIntervalo, calcularConstancia, formatarDataResumida, interpolarCor, obterCorAcertos - MANTENHA IGUAL)
function ultimosDias(dataISO, dias) { /* ... seu código ... */ }
function obterIntervalo() { /* ... seu código ... */ }
function calcularConstancia(sessoes) { /* ... seu código ... */ }
function formatarDataResumida(data) { /* ... seu código ... */ }
function interpolarCor(c1, c2, f, op=0.7) { /* ... seu código ... */ }
function obterCorAcertos(t, op=0.7) { /* ... seu código ... */ }


// --- Funções de Atualização de Gráficos ---
// (Coloque aqui as funções: atualizarGraficoLinha, atualizarGraficoDisciplinas - MANTENHA IGUAL, mas elas só serão chamadas se 'atualizarTudo' rodar)
function atualizarGraficoLinha(sessoesFiltradas, intervalo) {
    const canvasEstudos = document.getElementById('graficoEstudos'); // Pega aqui dentro ou passa como parâmetro
    if (!canvasEstudos) { console.error("Canvas 'graficoEstudos' não encontrado"); return; }
    const ctx = canvasEstudos.getContext('2d');
    if (!ctx) { console.error("Contexto 2D não encontrado para 'graficoEstudos'"); return; }
    // ... Resto do seu código para configurar e criar/atualizar o gráfico de linha ...
    if (graficoLinha) graficoLinha.destroy();
    // Exemplo simplificado - Use sua lógica completa aqui
    graficoLinha = new Chart(ctx, {
         type: 'line',
         data: { labels: [], datasets: [] }, // Preencher com seus dados
         options: { /* ... suas opções ... */ }
     });
     console.log("Grafico Linha ATUALIZADO."); // Log de confirmação
}

function atualizarGraficoDisciplinas() {
    const canvasDisciplinas = document.getElementById('graficoDisciplinas'); // Pega aqui dentro ou passa como parâmetro
    const selectMetricaDisciplinas = document.getElementById('metricaGraficoDisciplinas'); // Precisa ter acesso
    if (!canvasDisciplinas) { console.error("Canvas 'graficoDisciplinas' não encontrado"); return; }
    const ctxD = canvasDisciplinas.getContext('2d');
     if (!ctxD) { console.error("Contexto 2D não encontrado para 'graficoDisciplinas'"); return; }
    // ... Resto do seu código para buscar métrica, filtrar dados, calcular e criar/atualizar o gráfico de disciplinas ...
    if (graficoDisciplinas) graficoDisciplinas.destroy();
    // Exemplo simplificado - Use sua lógica completa aqui
    graficoDisciplinas = new Chart(ctxD, {
        type: 'bar',
        data: { labels: [], datasets: [] }, // Preencher com seus dados
        options: { /* ... suas opções ... */ }
    });
     console.log("Grafico Disciplinas ATUALIZADO."); // Log de confirmação
}


// --- Função Principal de Atualização UI (Chamada após login e em mudanças de filtro) ---
function atualizarTudo() {
    if (!currentUser) {
        console.log("Atualização UI cancelada: Nenhum usuário logado.");
        return;
    }
    console.log(`Atualizando UI para usuário: ${currentUser.uid}`);

    // =============================================================
    // === PONTO CRÍTICO: SUBSTITUIR POR BUSCA NO FIRESTORE ===
    // Carregando do localStorage (temporário)
    sessoesEstudo = JSON.parse(localStorage.getItem('sessoesEstudo')) || []; // <<< SUBSTITUIR ISSO
    if (!localStorage.getItem('sessoesEstudo')) {
         console.warn("AVISO: Não há dados no localStorage! Gráficos podem ficar vazios. Adapte para buscar do Firestore!");
    }
    // =============================================================

    const intervalo = obterIntervalo();
    const sessoesFiltradas = sessoesEstudo.filter(s => s.data && ultimosDias(new Date(s.data), intervalo)); // Garante que data exista e seja válida

    // Atualiza Cards (Seu código aqui)
    const tempoTotal = sessoesFiltradas.reduce((s, i) => s + (i.tempo || 0), 0);
    const qTotal = sessoesFiltradas.reduce((s, i) => s + (i.questoes || 0), 0);
    const aTotal = sessoesFiltradas.reduce((s, i) => s + (i.acertos || 0), 0);
    const tAcertos = qTotal > 0 ? Math.round(aTotal * 100 / qTotal) : 0;
    const dConstancia = calcularConstancia(sessoesEstudo); // Constância pode usar todas as sessões

    const tEl = document.getElementById('tempo-total'); if(tEl){const h=Math.floor(tempoTotal/60); const m=tempoTotal%60; tEl.innerText=`${h}h ${m}min`;}
    const qEl = document.getElementById('questoes-semana'); if(qEl)qEl.innerText=qTotal;
    const aEl = document.getElementById('acertos-semana'); if(aEl)aEl.innerText=`${tAcertos}%`;
    const cEl = document.getElementById('dias-constancia'); if(cEl)cEl.innerText=`${dConstancia} dia${dConstancia !== 1 ? 's' : ''}`;

    // Atualiza Gráficos
    atualizarGraficoLinha(sessoesFiltradas, intervalo);
    atualizarGraficoDisciplinas(); // A função busca os filtros internamente
}

// --- Função para Limpar UI (Chamada no Logout) ---
function limparDadosUI() {
    if(graficoLinha) graficoLinha.destroy();
    if(graficoDisciplinas) graficoDisciplinas.destroy();
    graficoLinha = null;
    graficoDisciplinas = null;
    sessoesEstudo = [];
    const tEl = document.getElementById('tempo-total'); if(tEl) tEl.innerText = '0h 0min';
    const qEl = document.getElementById('questoes-semana'); if(qEl) qEl.innerText = '0';
    const aEl = document.getElementById('acertos-semana'); if(aEl) aEl.innerText = '0%';
    const cEl = document.getElementById('dias-constancia'); if(cEl) cEl.innerText = '0 dias';
    console.log("UI Limpa.");
}

// --- Exposição via appContext (Opcional) ---
window.appContext = window.appContext || {};
window.appContext.atualizarTudo = atualizarTudo;


// === Listener Principal e Inicialização ===
document.addEventListener('DOMContentLoaded', () => {
    // Define refs DOM aqui dentro ou chame uma função para isso
    const userStatusElement = document.getElementById('user-status');
    const logoutButton = document.getElementById('logout-btn');
    const selectIntervalo = document.getElementById('intervaloGrafico');
    const selectMetricaDisciplinas = document.getElementById('metricaGraficoDisciplinas');

    // Adiciona listeners aos seletores (se eles existem nesta página)
    if (selectIntervalo) selectIntervalo.addEventListener('change', atualizarTudo);
    if (selectMetricaDisciplinas) selectMetricaDisciplinas.addEventListener('change', atualizarGraficoDisciplinas); // Ou chamar atualizarTudo se preferir

    // TENTA INICIALIZAR FIREBASE E AUTH AQUI DENTRO
    try {
        // Assumindo que firebaseConfig está definido globalmente no HTML antes deste script
        if (typeof firebaseConfig === 'undefined') throw new Error("firebaseConfig não está definida!");
        if (typeof initializeApp === 'undefined') throw new Error("Função initializeApp do Firebase não carregada!");
        if (typeof getAuth === 'undefined') throw new Error("Função getAuth do Firebase não carregada!");

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        // const db = getFirestore(app); // Se for usar Firestore

        console.log("Firebase inicializado DENTRO de DOMContentLoaded.");

        // Configura o listener de autenticação AGORA que 'auth' existe
        onAuthStateChanged(auth, (user) => {
            const pathAtual = window.location.pathname;
            const paginaLogin = 'login.html'; // Ajuste o caminho completo se necessário (ex: '/login.html')

            if (user) { // Logado
                currentUser = user;
                console.log("Usuário autenticado:", currentUser.uid);
                if (userStatusElement) userStatusElement.textContent = `Logado como: ${user.displayName || user.email}`;

                 // Configura botão logout aqui pois precisa do 'auth' e do elemento
                if (logoutButton) {
                    logoutButton.style.display = 'inline-block';
                    // Remove listener antigo para evitar duplicação se o DOMContentLoaded rodar mais de uma vez (?)
                    logoutButton.replaceWith(logoutButton.cloneNode(true)); // Clona para remover listeners antigos
                    document.getElementById('logout-btn').addEventListener('click', () => { // Adiciona listener ao novo botão
                        signOut(auth).catch((error) => {
                            console.error('Erro ao fazer logout:', error);
                            alert('Erro ao tentar sair.');
                        });
                    });
                 } else {
                     console.warn("Botão logout não encontrado para configurar listener.");
                 }

                atualizarTudo(); // CARREGA OS DADOS E ATUALIZA OS GRÁFICOS

            } else { // Deslogado
                currentUser = null;
                console.log("Nenhum usuário logado.");
                if (userStatusElement) userStatusElement.textContent = 'Você não está logado.';
                if (logoutButton) logoutButton.style.display = 'none';
                limparDadosUI(); // Limpa gráficos e cards

                // Verifica se JÁ ESTÁ na página de login para evitar loop infinito
                if (!pathAtual.endsWith(paginaLogin) && pathAtual !== '/'+paginaLogin) {
                    console.log(`Redirecionando para ${paginaLogin} pois path atual é ${pathAtual}`);
                     window.location.href = paginaLogin; // Redireciona
                } else {
                    console.log("Já está na página de login ou path não termina com login.html, não redirecionando.");
                }
            }
        });

    } catch (e) {
        console.error("ERRO CRÍTICO - Inicialização do Firebase ou Auth Listener falhou:", e);
        if (userStatusElement) userStatusElement.textContent = 'Erro crítico. Recarregue.';
        // Aqui você pode querer desabilitar botões ou mostrar uma mensagem mais clara
    }
}); // Fim do DOMContentLoaded

