// /assets/js/script.js - Versão para Netlify com Firestore

// Tenta pegar funções Firebase do objeto global criado no HTML
const firebaseSDKLoaded = window.firebaseSDKLoaded || {};
const firestoreSDKLoaded = window.firestoreSDKLoaded || {};
const { initializeApp } = firebaseSDKLoaded;
const { getAuth, onAuthStateChanged, signOut } = firebaseSDKLoaded;
const { getFirestore, collection, query, where, getDocs, orderBy } = firestoreSDKLoaded;

// Variáveis Globais
let app;
let auth;
let db; // Instância do Firestore
let currentUser = null;
let sessoesEstudo = []; // Guarda dados do Firestore
let graficoLinha = null;
let graficoDisciplinas = null;

// --- Funções Auxiliares ---
// (Funções ultimosDias, obterIntervalo, calcularConstancia, formatarDataResumida, interpolarCor, obterCorAcertos - MANTENHA AS MESMAS)
function ultimosDias(dataObj, dias) { if (!(dataObj instanceof Date) || isNaN(dataObj)) return false; const hoje = new Date(); const diasAtras = new Date(); diasAtras.setHours(0, 0, 0, 0); diasAtras.setDate(hoje.getDate() - (dias - 1)); const d = new Date(dataObj); d.setHours(0, 0, 0, 0); return d >= diasAtras && d <= hoje; }
function obterIntervalo() { const el = document.getElementById('intervaloGrafico'); return el ? parseInt(el.value) : 7; }
function calcularConstancia(sessoes) { let diasConstancia = 0; if (!sessoes || sessoes.length === 0) return 0; const hoje = new Date(); hoje.setHours(0, 0, 0, 0); const datasComSessao = new Set(sessoes.map(s => s.data instanceof Date ? s.data.toISOString().split('T')[0] : null).filter(Boolean)); for (let i = 0; ; i++) { const diaVerificar = new Date(hoje); diaVerificar.setDate(hoje.getDate() - i); const diaFormatado = diaVerificar.toISOString().split('T')[0]; if (datasComSessao.has(diaFormatado)) diasConstancia++; else break; } return diasConstancia; }
function formatarDataResumida(data) { if (!(data instanceof Date)) return ''; return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }); }
function interpolarCor(cor1, cor2, fator, opacidade = 0.7) { const r = Math.round(cor1[0] + (cor2[0] - cor1[0]) * fator); const g = Math.round(cor1[1] + (cor2[1] - cor1[1]) * fator); const b = Math.round(cor1[2] + (cor2[2] - cor1[2]) * fator); return `rgba(${r}, ${g}, ${b}, ${opacidade})`; }
function obterCorAcertos(taxa, opacidade = 0.7) { if (taxa < 50) return `rgba(239, 83, 80, ${opacidade})`; if (taxa < 75) return `rgba(255, 193, 7, ${opacidade})`; return `rgba(102, 187, 106, ${opacidade})`; }


// --- Carregar Dados do Firestore ---
async function carregarDadosFirestore(userId) {
    if (!db) { // Verifica se db foi inicializado
         console.error("Instância do Firestore (db) não está pronta.");
         alert("Erro ao conectar com banco de dados.");
         return [];
    }
    if (!userId) {
         console.error("UserID não disponível para carregar dados.");
         return [];
    }

    // Define a coleção e a query
    const sessoesRef = collection(db, "sessoesEstudo"); // Use o nome da sua coleção
    const q = query(sessoesRef, where("userId", "==", userId), orderBy("data", "desc"));

    try {
        console.log(`Buscando sessões no Firestore para usuário: ${userId}`);
        const querySnapshot = await getDocs(q);
        const sessoes = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            let dataJS = data.data;

            // Converte Timestamp do Firestore para Date do JS (IMPORTANTE)
            if (data.data && typeof data.data.toDate === 'function') {
               dataJS = data.data.toDate();
            } else if (typeof data.data === 'string') {
                // Se salvou como string ISO, tenta converter
                dataJS = new Date(data.data);
            } // Se já for Date, mantém

            if (dataJS instanceof Date && !isNaN(dataJS)) {
                 // Garante que os campos esperados existam (vindos do Firestore)
                 sessoes.push({
                     id: doc.id,
                     questoes: data.questoes || 0, // Garante valor padrão 0
                     acertos: data.acertos || 0,
                     tempo: data.tempo || 0,
                     disciplina: data.disciplina || "Não especificada",
                     data: dataJS // Objeto Date
                 });
            } else {
                 console.warn("Sessão Firestore ignorada (ID:", doc.id, ") - formato de data inválido:", data.data);
            }
        });
        console.log(`Carregadas ${sessoes.length} sessões do Firestore.`);
        return sessoes;
    } catch (error) {
        console.error("Erro ao buscar sessões do Firestore:", error);
        alert("Erro ao carregar seus dados de estudo. Verifique sua conexão ou tente mais tarde.");
        return [];
    }
}


// --- Funções de Atualização de Gráficos ---
// (O código interno delas permanece o mesmo, pois já recebem o array de sessões como argumento ou usam a variável global 'sessoesEstudo' que será preenchida pelo Firestore)
function atualizarGraficoLinha(sessoesFiltradas, intervalo) {
    const canvasEstudos = document.getElementById('graficoEstudos');
    if (!canvasEstudos) { console.error("Canvas 'graficoEstudos' não encontrado"); return; }
    const ctx = canvasEstudos.getContext('2d');
    if (!ctx) { console.error("Contexto 2D não encontrado para 'graficoEstudos'"); return; }
    // ... (sua lógica de agregação e criação/update do Chart.js AQUI)...
    // Exemplo mínimo:
     if (graficoLinha) graficoLinha.destroy();
     graficoLinha = new Chart(ctx, {/*...*/}); // Use sua config completa
    console.log("Grafico Linha ATUALIZADO.");
}

function atualizarGraficoDisciplinas(sessoesFiltradas) {
    const canvasDisciplinas = document.getElementById('graficoDisciplinas');
    const selectMetricaDisciplinas = document.getElementById('metricaGraficoDisciplinas');
    if (!canvasDisciplinas || !selectMetricaDisciplinas) return;
    const ctxDisciplinas = canvasDisciplinas.getContext('2d');
    if (!ctxDisciplinas) return;
     // ... (sua lógica de agregação por disciplina, métrica, ordenação, cores e criação/update do Chart.js AQUI)...
     // Exemplo mínimo:
     if (graficoDisciplinas) graficoDisciplinas.destroy();
     graficoDisciplinas = new Chart(ctxDisciplinas, {/*...*/}); // Use sua config completa
    console.log("Grafico Disciplinas ATUALIZADO.");
}


// --- Função Principal de Atualização UI (Async) ---
async function atualizarTudo() {
    if (!currentUser) { console.log("Atualização UI cancelada: Nenhum usuário logado."); return; }
    console.log(`Atualizando UI para usuário: ${currentUser.uid}`);

    // Carrega dados do Firestore ASYNCRONAMENTE
    sessoesEstudo = await carregarDadosFirestore(currentUser.uid);

    const intervalo = obterIntervalo();
    const sessoesFiltradas = sessoesEstudo.filter(s => s.data instanceof Date && ultimosDias(s.data, intervalo));

    // --- Atualiza Cards ---
    const tempoTotal = sessoesEstudo.reduce((soma, s) => soma + (s.tempo || 0), 0);
    const questoesTotalPeriodo = sessoesFiltradas.reduce((soma, s) => soma + (s.questoes || 0), 0);
    const acertosTotalPeriodo = sessoesFiltradas.reduce((soma, s) => soma + (s.acertos || 0), 0);
    const taxaAcertos = questoesTotalPeriodo > 0 ? Math.round((acertosTotalPeriodo / questoesTotalPeriodo) * 100) : 0;
    const diasConstancia = calcularConstancia(sessoesEstudo);

    const tempoTotalEl = document.getElementById('tempo-total'); if(tempoTotalEl){const h=Math.floor(tempoTotal/60); const m=tempoTotal%60; tempoTotalEl.innerText=`${h}h ${m}min`;}
    const questoesSemanaEl = document.getElementById('questoes-semana'); if(questoesSemanaEl) questoesSemanaEl.innerText = questoesTotalPeriodo;
    const acertosSemanaEl = document.getElementById('acertos-semana'); if(acertosSemanaEl) acertosSemanaEl.innerText = `${taxaAcertos}%`;
    const constanciaEl = document.getElementById('dias-constancia'); if(constanciaEl) constanciaEl.innerText = `${diasConstancia} dia${diasConstancia !== 1 ? 's' : ''}`;

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
    const userStatusElement = document.getElementById('user-status');
    let logoutButton = document.getElementById('logout-btn');
    const selectIntervalo = document.getElementById('intervaloGrafico');
    const selectMetricaDisciplinas = document.getElementById('metricaGraficoDisciplinas');

    if (selectIntervalo) selectIntervalo.addEventListener('change', atualizarTudo);
    if (selectMetricaDisciplinas) selectMetricaDisciplinas.addEventListener('change', () => {
        const intervalo = obterIntervalo();
        const sessoesFiltradas = sessoesEstudo.filter(s => s.data instanceof Date && ultimosDias(s.data, intervalo));
        atualizarGraficoDisciplinas(sessoesFiltradas);
    });

    // TENTA INICIALIZAR FIREBASE, AUTH e FIRESTORE
    try {
        // Verifica se SDKs e Config estão carregados (via objeto global do HTML)
        if (!firebaseSDKLoaded || !firebaseSDKLoaded.initializeApp || !firebaseSDKLoaded.getAuth) { throw new Error("SDK Firebase (App/Auth) não carregado. Verifique o HTML."); }
        if (!firestoreSDKLoaded || !firestoreSDKLoaded.getFirestore) { throw new Error("SDK Firebase (Firestore) não carregado. Verifique o HTML."); }
        if (typeof firebaseConfig === 'undefined') { throw new Error("firebaseConfig não definida. Verifique o HTML."); }

        // Inicializa
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app); // Inicializa Firestore

        console.log("Firebase App, Auth e Firestore inicializados DENTRO de DOMContentLoaded.");

        // Configura Listener de Autenticação
        onAuthStateChanged(auth, (user) => {
            const pathAtual = window.location.pathname;
            const paginaLogin = '/login.html'; // Ajuste se necessário

            if (user) { // LOGADO
                currentUser = user;
                console.log("Usuário autenticado:", currentUser.uid);
                if (userStatusElement) userStatusElement.textContent = `Logado como: ${user.displayName || user.email}`;

                logoutButton = document.getElementById('logout-btn'); // Busca novamente
                if (logoutButton) {
                    logoutButton.style.display = 'inline-block';
                    const newLogoutButton = logoutButton.cloneNode(true);
                    logoutButton.parentNode.replaceChild(newLogoutButton, logoutButton);
                    newLogoutButton.addEventListener('click', () => {
                        signOut(auth).catch((error) => { console.error('Erro ao fazer logout:', error); alert('Erro ao tentar sair.'); });
                    });
                 }

                atualizarTudo(); // Chama a função ASYNC para carregar dados do Firestore e atualizar UI

            } else { // DESLOGADO
                currentUser = null;
                console.log("Nenhum usuário logado.");
                if (userStatusElement) userStatusElement.textContent = 'Você não está logado.';
                logoutButton = document.getElementById('logout-btn'); // Busca novamente
                if (logoutButton) logoutButton.style.display = 'none';
                limparDadosUI();

                const nomePaginaAtual = pathAtual.substring(pathAtual.lastIndexOf('/') + 1);
                if (nomePaginaAtual !== paginaLogin.substring(1) && pathAtual !== '/') { // Evita redirect se já estiver no login ou raiz
                     console.log(`Redirecionando para ${paginaLogin} pois path atual é ${pathAtual}`);
                     window.location.href = paginaLogin;
                 } else {
                     console.log("Na página raiz ou de login, não redirecionando.");
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
        if (userStatusElement) userStatusElement.textContent = 'Erro crítico na inicialização. Recarregue.';
        alert('Ocorreu um erro crítico ao carregar a aplicação.'); // Alerta para o usuário
    }
}); // Fim do DOMContentLoaded
