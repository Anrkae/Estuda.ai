// /assets/js/script.js
let app;
let auth;
// let db; // Descomente quando for usar Firestore
let currentUser = null; // Guarda o usuário logado
let sessoesEstudo = []; // Guarda os dados carregados
let graficoLinha = null;
let graficoDisciplinas = null;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    // db = getFirestore(app); // Descomente quando for usar Firestore
    console.log("Firebase inicializado em script.js");
} catch (e) {
    console.error("Erro inicializando Firebase em script.js:", e);
    // Lidar com erro de inicialização (ex: mostrar mensagem na tela)
    const userStatusElement = document.getElementById('user-status');
    if (userStatusElement) userStatusElement.textContent = "Erro crítico ao iniciar.";
    // Travar a aplicação pode ser necessário aqui
}

// === Referências DOM (garantir que o DOM esteja pronto) ===
// É mais seguro buscar elementos após o DOM carregar
let userStatusElement, logoutButton, selectIntervalo, selectMetricaDisciplinas, canvasEstudos, canvasDisciplinas;

function inicializarDOMRefs() {
    userStatusElement = document.getElementById('user-status');
    logoutButton = document.getElementById('logout-btn');
    selectIntervalo = document.getElementById('intervaloGrafico');
    selectMetricaDisciplinas = document.getElementById('metricaGraficoDisciplinas');
    canvasEstudos = document.getElementById('graficoEstudos');
    canvasDisciplinas = document.getElementById('graficoDisciplinas');

    // Adiciona listeners DEPOIS que os elementos existem
    if (selectIntervalo) selectIntervalo.addEventListener('change', atualizarTudo);
    if (selectMetricaDisciplinas) selectMetricaDisciplinas.addEventListener('change', atualizarGraficoDisciplinas);
     if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            signOut(auth).catch((error) => {
                console.error('Erro ao fazer logout:', error);
            });
        });
    }
}

// === Funções Auxiliares (Cálculos, Formatação) ===
// (Coloque aqui as funções: ultimosDias, obterIntervalo, calcularConstancia, formatarDataResumida, interpolarCor, obterCorAcertos)
function ultimosDias(dataISO, dias) { const hoje = new Date(); const dA = new Date(); dA.setHours(0,0,0,0); dA.setDate(hoje.getDate()-(dias-1)); const d = typeof dataISO==='string'?new Date(dataISO):dataISO; if(!d||isNaN(d.getTime()))return false; d.setHours(0,0,0,0); return d>=dA && d<=hoje; }
function obterIntervalo() { return selectIntervalo ? parseInt(selectIntervalo.value) : 7; }
function calcularConstancia(sessoes) { let dC = 0; if (!sessoes || sessoes.length === 0) return 0; const hoje = new Date(); hoje.setHours(0,0,0,0); const dS = new Set(sessoes.map(s => s.data ? s.data.split('T')[0] : null).filter(Boolean)); for (let i = 0; ; i++) { const dV = new Date(hoje); dV.setDate(hoje.getDate()-i); const dF = dV.toISOString().split('T')[0]; if (dS.has(dF)) dC++; else break; } return dC; }
function formatarDataResumida(data) { return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }); }
function interpolarCor(c1, c2, f, op=0.7) { const r = Math.round(c1[0]+(c2[0]-c1[0])*f); const g = Math.round(c1[1]+(c2[1]-c1[1])*f); const b = Math.round(c1[2]+(c2[2]-c1[2])*f); return `rgba(${r},${g},${b},${op})`; }
function obterCorAcertos(t, op=0.7) { if (t < 50) return `rgba(239,83,80,${op})`; if (t < 75) return `rgba(255,193,7,${op})`; return `rgba(102,187,106,${op})`;}


// === Funções de Atualização de Gráficos ===
// (Coloque aqui as funções: atualizarGraficoLinha, atualizarGraficoDisciplinas)
// IMPORTANTE: Adaptar para buscar dados do Firestore quando estiver pronto
function atualizarGraficoLinha(sessoesFiltradas, intervalo) { /* ... código da função ... */ if (!canvasEstudos) return; const labels = []; let questoesPU = []; let acertosPU = []; const hoje = new Date(); if (intervalo === 7) { const dM={}; sessoesFiltradas.forEach(s=>{if(!s.data)return; const k=s.data.split('T')[0]; if(!dM[k])dM[k]={q:0,a:0}; dM[k].q+=s.questoes||0; dM[k].a+=s.acertos||0;}); for (let i=6;i>=0;i--) {const dia=new Date();dia.setDate(hoje.getDate()-i); const df=dia.toISOString().split('T')[0]; labels.push(dia.toLocaleDateString('pt-BR',{weekday:'short'}).substring(0,3)); questoesPU.push(dM[df]?.q||0); acertosPU.push(dM[df]?.a||0);} } else if (intervalo === 30) { questoesPU=[0,0,0,0]; acertosPU=[0,0,0,0]; const fS0=new Date(hoje); fS0.setHours(0,0,0,0); const fS1=new Date(hoje); fS1.setDate(hoje.getDate()-7); fS1.setHours(0,0,0,0); const fS2=new Date(hoje); fS2.setDate(hoje.getDate()-14); fS2.setHours(0,0,0,0); const fS3=new Date(hoje); fS3.setDate(hoje.getDate()-21); fS3.setHours(0,0,0,0); const iP=new Date(hoje); iP.setDate(hoje.getDate()-28); iP.setHours(0,0,0,0); const lT=[`${formatarDataResumida(fS0)} - ${formatarDataResumida(new Date(fS1.getTime()+864e5))}`, `${formatarDataResumida(fS1)} - ${formatarDataResumida(new Date(fS2.getTime()+864e5))}`, `${formatarDataResumida(fS2)} - ${formatarDataResumida(new Date(fS3.getTime()+864e5))}`, `${formatarDataResumida(fS3)} - ${formatarDataResumida(iP)}`]; labels.push(...lT.reverse()); sessoesFiltradas.forEach(s=>{if(!s.data)return; const sD=new Date(s.data); sD.setHours(0,0,0,0); if(sD>fS1){questoesPU[3]+=s.questoes||0; acertosPU[3]+=s.acertos||0;} else if(sD>fS2){questoesPU[2]+=s.questoes||0; acertosPU[2]+=s.acertos||0;} else if(sD>fS3){questoesPU[1]+=s.questoes||0; acertosPU[1]+=s.acertos||0;} else if(sD>=iP){questoesPU[0]+=s.questoes||0; acertosPU[0]+=s.acertos||0;}}); } else if (intervalo === 365) { const dM={}; sessoesFiltradas.forEach(s=>{if(!s.data)return; const k=s.data.substring(0,7); if(!dM[k])dM[k]={q:0,a:0}; dM[k].q+=s.questoes||0; dM[k].a+=s.acertos||0;}); const m=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]; const aA=hoje.getFullYear(); const mA=hoje.getMonth(); for (let i=11;i>=0;i--){ let mI=(mA-i+12)%12; let a=aA; if(i>mA)a--; labels.push(m[mI]); const mf=`${a}-${String(mI+1).padStart(2,'0')}`; questoesPU.push(dM[mf]?.q||0); acertosPU.push(dM[mf]?.a||0);} } let chartOptions={responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, scales:{x:{ticks:{display:true}}, y:{type:'linear',display:true, position:'left', beginAtZero:true, title:{display:false}}}, plugins:{legend:{position:'bottom'}}}; if(intervalo===30){if(!chartOptions.scales.x.ticks)chartOptions.scales.x.ticks={}; chartOptions.scales.x.ticks.display=false;} const ctx=canvasEstudos.getContext('2d'); if(!ctx)return; if(graficoLinha)graficoLinha.destroy(); graficoLinha=new Chart(ctx,{type:'line',data:{labels:labels, datasets:[{label:'Questões Corretas',data:acertosPU, borderColor:'rgba(76, 175, 80, 1)',backgroundColor:'rgba(76, 175, 80, 0.2)',borderWidth:2, tension:0.3, yAxisID:'y',order:2},{label:'Questões Resolvidas',data:questoesPU, borderColor:'rgba(54, 162, 235, 1)',backgroundColor:'rgba(54, 162, 235, 0.2)',borderWidth:2, tension:0.3, yAxisID:'y',order:1}]}, options:chartOptions}); }
function atualizarGraficoDisciplinas() { /* ... código idêntico ao da resposta anterior ... */ if (!canvasDisciplinas) return; const intervalo = obterIntervalo(); const metrica = selectMetricaDisciplinas ? selectMetricaDisciplinas.value : 'tempo'; const sessoesFiltradas = sessoesEstudo.filter(sessao => sessao.data && ultimosDias(sessao.data, intervalo)); const statsPorDisciplina={}; sessoesFiltradas.forEach(s=>{ const nD=s.disciplina||"Não especificada"; if(!statsPorDisciplina[nD])statsPorDisciplina[nD]={t:0,q:0,a:0}; statsPorDisciplina[nD].t+=s.tempo||0; statsPorDisciplina[nD].q+=s.questoes||0; statsPorDisciplina[nD].a+=s.acertos||0; }); const labelsD=Object.keys(statsPorDisciplina); let dBrutos=[]; let lMetrica=''; switch(metrica){case 'tempo':lMetrica='Tempo (min)';dBrutos=labelsD.map(d=>statsPorDisciplina[d].t); break; case 'questoes':lMetrica='Questões';dBrutos=labelsD.map(d=>statsPorDisciplina[d].q); break; case 'acertos':lMetrica='Acertos (%)';dBrutos=labelsD.map(d=>statsPorDisciplina[d].q>0?Math.round(statsPorDisciplina[d].a*100/statsPorDisciplina[d].q):0); break; default:lMetrica='Tempo (min)';dBrutos=labelsD.map(d=>statsPorDisciplina[d].t); } const combined=labelsD.map((l,i)=>({label:l, data:dBrutos[i]})); combined.sort((a,b)=>b.data-a.data); const sLabels=combined.map(item=>item.label); const sData=combined.map(item=>item.data); let bgColors=[]; let bdColors=[]; const cI=[209,196,233]; const cF=[81,45,168]; if(metrica==='acertos'){bgColors=sData.map(t=>obterCorAcertos(t,0.7)); bdColors=sData.map(t=>obterCorAcertos(t,1));} else {const minV=Math.min(...sData); const maxV=Math.max(...sData); const range=maxV-minV; bgColors=sData.map(v=>interpolarCor(cI,cF,range===0?0.5:(v-minV)/range,0.7)); bdColors=sData.map(v=>interpolarCor(cI,cF,range===0?0.5:(v-minV)/range,1));} const ctxD=canvasDisciplinas.getContext('2d'); if(!ctxD)return; if(graficoDisciplinas)graficoDisciplinas.destroy(); graficoDisciplinas=new Chart(ctxD,{type:'bar', data:{labels:sLabels, datasets:[{label:lMetrica, data:sData, backgroundColor:bgColors, borderColor:bdColors, borderWidth:1, borderRadius:{topRight:4,bottomRight:4,topLeft:0,bottomLeft:0}}]}, options:{responsive:true, maintainAspectRatio:false, indexAxis:'y', scales:{x:{beginAtZero:true, title:{display:true, text:lMetrica}, grid:{display:false}}, y:{ticks:{autoSkip:false}}}, plugins:{legend:{display:false}, tooltip:{callbacks:{label:function(ctx){let l=ctx.dataset.label||''; if(l){l+=': ';} let v=ctx.raw; if(metrica==='acertos'){v+='%';} else if(metrica==='tempo'){v+=' min';} l+=v; return l;}}}}}}); }


// === Função Principal de Atualização ===
function atualizarTudo() {
    if (!currentUser) { console.log("Atualização cancelada: Nenhum usuário logado."); return; }
    console.log(`Atualizando UI para usuário: ${currentUser.uid}`);

    // =============================================================
    // === PONTO CRÍTICO: SUBSTITUIR POR BUSCA NO FIRESTORE ===
    // =============================================================
    // Exemplo: Carregando do localStorage (temporário)
    sessoesEstudo = JSON.parse(localStorage.getItem('sessoesEstudo')) || []; // <<< SUBSTITUIR ISSO
    console.warn("AVISO: Usando dados do localStorage! Adapte para buscar do Firestore!");
    // =============================================================

    const intervalo = obterIntervalo();
    const sessoesFiltradas = sessoesEstudo.filter(s => ultimosDias(s.data, intervalo));

    // Atualiza Cards
    const tempoTotal = sessoesFiltradas.reduce((s,i)=>s+(i.tempo||0),0); const qTotal=sessoesFiltradas.reduce((s,i)=>s+(i.questoes||0),0); const aTotal=sessoesFiltradas.reduce((s,i)=>s+(i.acertos||0),0); const tAcertos=qTotal>0?Math.round(aTotal*100/qTotal):0;
    const dConstancia=calcularConstancia(sessoesEstudo);
    const tEl=document.getElementById('tempo-total'); if(tEl){const h=Math.floor(tempoTotal/60); const m=tempoTotal%60; tEl.innerText=`${h}h ${m}min`;}
    const qEl=document.getElementById('questoes-semana'); if(qEl)qEl.innerText=qTotal; const aEl=document.getElementById('acertos-semana'); if(aEl)aEl.innerText=`${tAcertos}%`; const cEl=document.getElementById('dias-constancia'); if(cEl)cEl.innerText=`${dConstancia} dia${dConstancia!==1?'s':''}`;

    // Atualiza Gráficos
    atualizarGraficoLinha(sessoesFiltradas, intervalo);
    atualizarGraficoDisciplinas(); // Usa sessoesEstudo global
}

// --- Função para Limpar UI (Chamada no Logout) ---
function limparDadosUI() { /* ... código idêntico ao anterior ... */ if(graficoLinha) graficoLinha.destroy(); if(graficoDisciplinas) graficoDisciplinas.destroy(); graficoLinha = null; graficoDisciplinas = null; sessoesEstudo = []; document.getElementById('tempo-total').innerText = '0h 0min'; document.getElementById('questoes-semana').innerText = '0'; document.getElementById('acertos-semana').innerText = '0%'; document.getElementById('dias-constancia').innerText = '0 dias'; }

// --- Exposição via appContext (Opcional, para o popup interagir) ---
window.appContext = window.appContext || {};
window.appContext.atualizarTudo = atualizarTudo;


// === Listener Principal e Inicialização de Auth ===
// Espera o DOM carregar para buscar elementos e adicionar listeners
document.addEventListener('DOMContentLoaded', () => {
    inicializarDOMRefs(); // Busca os elementos do DOM

    // Configura o listener de autenticação só se o 'auth' foi inicializado
    if (auth) {
        onAuthStateChanged(auth, (user) => {
            const pathAtual = window.location.pathname;
            const paginaLogin = '/login.html'; // AJUSTE SE NECESSÁRIO

            if (user) { // Logado
                currentUser = user;
                console.log("Usuário autenticado:", currentUser.uid);
                if (userStatusElement) userStatusElement.textContent = `Logado como: ${user.displayName || user.email}`;
                if (logoutButton) logoutButton.style.display = 'inline-block';
                atualizarTudo(); // Carrega/Atualiza dados
            } else { // Deslogado
                currentUser = null;
                console.log("Nenhum usuário logado.");
                if (userStatusElement) userStatusElement.textContent = 'Você não está logado.';
                if (logoutButton) logoutButton.style.display = 'none';
                limparDadosUI();
                if (!pathAtual.endsWith(paginaLogin)) { // Evita loop
                    console.log(`Redirecionando para ${paginaLogin}`);
                    window.location.href = paginaLogin;
                }
            }
        });
    } else {
        // Se o auth falhou na inicialização, informa o usuário e impede o uso
        console.error("Auth não inicializado. Aplicação não pode verificar login.");
         if (userStatusElement) userStatusElement.textContent = 'Erro na autenticação. Recarregue.';
         // Poderia desabilitar outras interações aqui
    }
}); // Fim do DOMContentLoaded
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
