// /assets/js/script.js - VERSÃO MÓDULO COM FIRESTORE

// --- Importações Essenciais do Firebase no Topo ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, Timestamp, orderBy } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js"; // Descomente se for usar Analytics

// --- Variáveis Globais ---
let app;
let auth;
let db;
// let analytics; // Descomente se for usar Analytics
let currentUser = null;
let sessoesEstudo = []; // Armazena dados carregados do Firestore
let graficoLinha = null;
let graficoDisciplinas = null;

// --- Funções Auxiliares ---
// (Cole suas funções auxiliares aqui: ultimosDias, obterIntervalo, calcularConstancia, formatarDataResumida, interpolarCor, obterCorAcertos)
function ultimosDias(dataObj, dias) { if (!(dataObj instanceof Date) || isNaN(dataObj)) return false; const hoje = new Date(); const diasAtras = new Date(); diasAtras.setHours(0, 0, 0, 0); diasAtras.setDate(hoje.getDate() - (dias - 1)); const d = new Date(dataObj); d.setHours(0, 0, 0, 0); return d >= diasAtras && d <= hoje; }
function obterIntervalo() { const el = document.getElementById('intervaloGrafico'); return el ? parseInt(el.value) : 7; }
function calcularConstancia(sessoes) { let diasConstancia = 0; if (!sessoes || sessoes.length === 0) return 0; const hoje = new Date(); hoje.setHours(0, 0, 0, 0); const datasComSessao = new Set(sessoes.map(s => s.data instanceof Date ? s.data.toISOString().split('T')[0] : null).filter(Boolean)); for (let i = 0; ; i++) { const diaVerificar = new Date(hoje); diaVerificar.setDate(hoje.getDate() - i); const diaFormatado = diaVerificar.toISOString().split('T')[0]; if (datasComSessao.has(diaFormatado)) diasConstancia++; else break; } return diasConstancia; }
function formatarDataResumida(data) { if (!(data instanceof Date)) return ''; return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }); }
function interpolarCor(cor1, cor2, fator, opacidade = 0.7) { const r = Math.round(cor1[0] + (cor2[0] - cor1[0]) * fator); const g = Math.round(cor1[1] + (cor2[1] - cor1[1]) * fator); const b = Math.round(cor1[2] + (cor2[2] - cor1[2]) * fator); return `rgba(${r}, ${g}, ${b}, ${opacidade})`; }
function obterCorAcertos(taxa, opacidade = 0.7) { if (taxa < 50) return `rgba(239, 83, 80, ${opacidade})`; if (taxa < 75) return `rgba(255, 193, 7, ${opacidade})`; return `rgba(102, 187, 106, ${opacidade})`; }

// --- Carregar Dados do Firestore ---
async function carregarDadosFirestore(userId) {
    if (!db) { console.error("Instância do Firestore (db) não inicializada."); return []; }
    if (!userId) { console.error("UserID não disponível."); return []; }

    const sessoesRef = collection(db, "sessoesEstudo"); // CONFIRA O NOME DA SUA COLEÇÃO
    const q = query(sessoesRef, where("userId", "==", userId), orderBy("data", "desc"));

    try {
        console.log(`Buscando sessões Firestore para: ${userId}`);
        const querySnapshot = await getDocs(q);
        const sessoes = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            let dataJS = data.data;
            if (data.data && typeof data.data.toDate === 'function') { dataJS = data.data.toDate(); }
            else if (typeof data.data === 'string') { dataJS = new Date(data.data); }

            if (dataJS instanceof Date && !isNaN(dataJS)) {
                sessoes.push({
                    id: doc.id,
                    questoes: data.questoes || 0,
                    acertos: data.acertos || 0,
                    tempo: data.tempo || 0,
                    disciplina: data.disciplina || "Não especificada",
                    data: dataJS
                });
            } else { console.warn("Sessão Firestore ignorada (ID:", doc.id, ") - data inválida:", data.data); }
        });
        console.log(`Carregadas ${sessoes.length} sessões.`);
        return sessoes;
    } catch (error) {
        console.error("Erro ao buscar sessões do Firestore:", error);
        alert("Erro ao carregar dados de estudo.");
        return [];
    }
}

// --- Funções de Atualização de Gráficos ---
// (Cole suas funções ATUALIZADAS aqui: atualizarGraficoLinha, atualizarGraficoDisciplinas)
// Certifique-se que elas usam os nomes corretos das propriedades vindas do Firestore
// Exemplo (estrutura básica, cole sua lógica completa dentro):
function atualizarGraficoLinha(sessoesFiltradas, intervalo) {
    const canvasEstudos = document.getElementById('graficoEstudos');
    if (!canvasEstudos) { console.error("Canvas 'graficoEstudos' não encontrado."); return; }
    const ctx = canvasEstudos.getContext('2d');
    if (!ctx) { console.error("Contexto 2D não encontrado para 'graficoEstudos'."); return; }

    // *** SUA LÓGICA COMPLETA DE AGREGAÇÃO E CONFIGURAÇÃO VAI AQUI ***
    // Exemplo:
    const labels = ['Exemplo'];
    const acertosPorUnidade = [0];
    const questoesPorUnidade = [0];
    // ... calcule labels, acertosPorUnidade, questoesPorUnidade baseado em sessoesFiltradas ...
     console.log("Dados para Gráfico Linha:", { labels, acertosPorUnidade, questoesPorUnidade }); // Log para debug

    if (graficoLinha) graficoLinha.destroy();
    try {
         graficoLinha = new Chart(ctx, {
             type: 'line',
             data: { labels: labels, datasets: [ { label: 'Questões Corretas', data: acertosPorUnidade, /* ... */ }, { label: 'Questões Resolvidas', data: questoesPorUnidade, /* ... */ } ] },
             options: { /* ... suas opções ... */ }
         });
         console.log("Grafico Linha ATUALIZADO.");
    } catch (chartError) {
         console.error("Erro ao criar/atualizar Chart Linha:", chartError);
    }
}

function atualizarGraficoDisciplinas(sessoesFiltradas) {
    const canvasDisciplinas = document.getElementById('graficoDisciplinas');
    const selectMetricaDisciplinas = document.getElementById('metricaGraficoDisciplinas');
    if (!canvasDisciplinas || !selectMetricaDisciplinas) return;
    const ctxDisciplinas = canvasDisciplinas.getContext('2d');
    if (!ctxDisciplinas) return;

     // *** SUA LÓGICA COMPLETA DE AGREGAÇÃO POR DISCIPLINA, MÉTRICA, ORDENAÇÃO E CORES VAI AQUI ***
     // Exemplo:
     const sortedLabels = ['Exemplo Disc'];
     const sortedData = [0];
     const backgroundColors = ['blue'];
     const borderColors = ['blue'];
     const labelMetrica = 'Métrica';
     // ... calcule sortedLabels, sortedData, etc. baseado em sessoesFiltradas e na métrica selecionada ...
      console.log("Dados para Gráfico Disciplinas:", { sortedLabels, sortedData }); // Log para debug

    if (graficoDisciplinas) graficoDisciplinas.destroy();
     try {
        graficoDisciplinas = new Chart(ctxDisciplinas, {
            type: 'bar',
            data: { labels: sortedLabels, datasets: [{ label: labelMetrica, data: sortedData, backgroundColor: backgroundColors, borderColor: borderColors, /* ... */ }] },
            options: { /* ... suas opções ... */ }
        });
        console.log("Grafico Disciplinas ATUALIZADO.");
     } catch (chartError) {
          console.error("Erro ao criar/atualizar Chart Disciplinas:", chartError);
     }
}

// --- Função Principal de Atualização UI (Async) ---
async function atualizarTudo() {
    if (!currentUser) { console.log("Atualização UI cancelada: Não logado."); return; }
    console.log(`Atualizando UI para usuário: ${currentUser.uid}`);
    sessoesEstudo = await carregarDadosFirestore(currentUser.uid); // Carrega do Firestore
    const intervalo = obterIntervalo();
    const sessoesFiltradas = sessoesEstudo.filter(s => s.data instanceof Date && ultimosDias(s.data, intervalo));
    // --- Atualiza Cards ---
    const tempoTotal = sessoesEstudo.reduce((s, i) => s + (i.tempo || 0), 0);
    const questoesTotalPeriodo = sessoesFiltradas.reduce((s, i) => s + (i.questoes || 0), 0);
    const acertosTotalPeriodo = sessoesFiltradas.reduce((s, i) => s + (i.acertos || 0), 0);
    const taxaAcertos = questoesTotalPeriodo > 0 ? Math.round((acertosTotalPeriodo / questoesTotalPeriodo) * 100) : 0;
    const diasConstancia = calcularConstancia(sessoesEstudo);
    const tEl=document.getElementById('tempo-total'); if(tEl){const h=Math.floor(tempoTotal/60);const m=tempoTotal%60; tEl.innerText=`${h}h ${m}min`;}
    const qEl=document.getElementById('questoes-semana'); if(qEl) qEl.innerText = questoesTotalPeriodo;
    const aEl=document.getElementById('acertos-semana'); if(aEl) aEl.innerText = `${taxaAcertos}%`;
    const cEl=document.getElementById('dias-constancia'); if(cEl) cEl.innerText=`${diasConstancia} dia${diasConstancia!==1?'s':''}`;
    // --- Atualiza Gráficos ---
    atualizarGraficoLinha(sessoesFiltradas, intervalo);
    atualizarGraficoDisciplinas(sessoesFiltradas);
}

// --- Função para Limpar UI ---
function limparDadosUI() { /* ... (código igual ao anterior) ... */ }

// --- Exposição via appContext (Opcional) ---
window.appContext = window.appContext || {}; window.appContext.atualizarTudo = atualizarTudo;

// === Listener Principal e Inicialização ===
document.addEventListener('DOMContentLoaded', () => {
    const userStatusElement = document.getElementById('user-status'); // Adicione este elemento no HTML se quiser ver o status
    let logoutButton = document.getElementById('logout-btn'); // Adicione um botão com este ID no HTML se quiser logout por aqui
    const selectIntervalo = document.getElementById('intervaloGrafico');
    const selectMetricaDisciplinas = document.getElementById('metricaGraficoDisciplinas');

    if (selectIntervalo) selectIntervalo.addEventListener('change', atualizarTudo); // Ok chamar async
    if (selectMetricaDisciplinas) selectMetricaDisciplinas.addEventListener('change', () => {
        const intervalo = obterIntervalo();
        const sessoesFiltradas = sessoesEstudo.filter(s => s.data instanceof Date && ultimosDias(s.data, intervalo));
        atualizarGraficoDisciplinas(sessoesFiltradas); // Redesenha com dados já carregados
    });

    try {
        // Verifica apenas a config global definida no HTML
        if (typeof firebaseConfig === 'undefined') {
             throw new Error("firebaseConfig não definida! Verifique o HTML.");
        }

        // Inicializa usando as funções importadas no topo deste arquivo
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        // analytics = getAnalytics(app); // Descomente se importar e precisar

        console.log("Firebase (App, Auth, Firestore) inicializado via módulo.");

        // Configura Listener de Autenticação
        onAuthStateChanged(auth, (user) => {
            const pathAtual = window.location.pathname;
            const paginaLogin = '/login.html'; // Caminho RELATIVO À RAIZ do site no Netlify

            if (user) { // LOGADO
                currentUser = user;
                console.log("Usuário autenticado:", currentUser.uid);
                if (userStatusElement) userStatusElement.textContent = `Logado: ${user.displayName || user.email}`;

                logoutButton = document.getElementById('logout-btn');
                if (logoutButton) {
                    logoutButton.style.display = 'inline-block';
                    const newLogoutButton = logoutButton.cloneNode(true);
                    logoutButton.parentNode.replaceChild(newLogoutButton, logoutButton);
                    newLogoutButton.addEventListener('click', () => {
                        signOut(auth).catch((error) => { console.error('Erro ao fazer logout:', error); alert('Erro ao sair.'); });
                    });
                 }
                atualizarTudo(); // <<< CHAMA A FUNÇÃO ASYNC PRINCIPAL

            } else { // DESLOGADO
                currentUser = null;
                console.log("Nenhum usuário logado.");
                if (userStatusElement) userStatusElement.textContent = 'Deslogado.';
                logoutButton = document.getElementById('logout-btn');
                if (logoutButton) logoutButton.style.display = 'none';
                limparDadosUI();

                const nomePaginaAtual = pathAtual.substring(pathAtual.lastIndexOf('/') + 1);
                 // Evita redirecionar se já estiver no login ou se for a raiz E não for login.html
                if (nomePaginaAtual !== paginaLogin.substring(1)) {
                     console.log(`Redirecionando para ${paginaLogin} de ${pathAtual}`);
                     window.location.href = paginaLogin;
                 } else {
                      console.log("Na página de login, não redirecionando.");
                 }
            }
        });

    } catch (e) {
        console.error("--- ERRO CRÍTICO DETECTADO ---");
        console.error("Mensagem:", e ? e.message : 'Erro sem mensagem');
        console.error("Nome:", e ? e.name : 'Erro sem nome');
        console.error("Stack Trace:", e ? e.stack : 'Sem stack trace');
        console.error("Objeto Erro Completo:", e);
        const userStatusElement = document.getElementById('user-status');
        if (userStatusElement) userStatusElement.textContent = 'Erro crítico.';
        // Considerar remover o alert para não travar a página em produção
        // alert('Ocorreu um erro crítico ao carregar a aplicação.');
    }
}); // Fim do DOMContentLoaded

    
