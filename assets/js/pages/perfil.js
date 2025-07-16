document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(localStorage.getItem('userInfo'));
    const disciplinas = JSON.parse(localStorage.getItem('disciplinas')) || [];
    const resolvidas = JSON.parse(localStorage.getItem('questoesResolvidas')) || [];
    const sessoes = parseInt(localStorage.getItem('totalSessoes') || '0');
    
    // ========================
    // FOTO DE PERFIL + NOME
    // ========================
    
    const fotoEl = document.getElementById('profile-pic');
    const btnFoto = document.getElementById('btnTrocarFoto');
    const nomeEl = document.getElementById('profile-name');
    const idadeEl = document.getElementById('profile-dob');
    
    const fotoBase64 = localStorage.getItem('fotoPerfil');
    if (fotoBase64) fotoEl.src = fotoBase64;
    
    btnFoto.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
            const file = input.files[0];
            if (file && file.size < 2 * 1024 * 1024) {
                const reader = new FileReader();
                reader.onload = () => {
                    fotoEl.src = reader.result;
                    localStorage.setItem('fotoPerfil', reader.result);
                };
                reader.readAsDataURL(file);
            } else {
                alert('Imagem inválida ou maior que 2MB.');
            }
        };
        input.click();
    });
    
    if (userData?.nome) nomeEl.textContent = userData.nome;
    if (userData?.dob) idadeEl.textContent = calcularIdade(userData.dob) + ' anos';
    
    // ========================
    // NÍVEL E XP (mock)
    // ========================
    
    const nivel = 3;
    const xp = 1200;
    const xpMax = 2000;
    
    document.getElementById('nivel-atual').textContent = nivel;
    document.getElementById('xp-total').textContent = `${xp} XP`;
    
    const progressoEl = document.getElementById('xp-progresso');
    const percent = Math.min((xp / xpMax) * 100, 100);
    progressoEl.style.width = `${percent}%`;
    
    // ========================
    // ESTATÍSTICAS
    // ========================
    
    document.getElementById('estat-respondidas').textContent = resolvidas.length;
    document.getElementById('estat-acertos').textContent = resolvidas.filter(q => q.correta).length;
    document.getElementById('estat-sessoes').textContent = sessoes;
    
    // ========================
    // MISSÕES TEMPORÁRIAS
    // ========================
    
    const missoes = [
        { id: 1, texto: 'Responda 5 questões hoje', concluida: resolvidas.length >= 5 },
        { id: 2, texto: 'Acerte 3 questões seguidas', concluida: resolvidas.filter(q => q.correta).length >= 3 },
        { id: 3, texto: 'Conclua uma sessão completa', concluida: sessoes >= 1 }
    ];
    
    const ul = document.getElementById('lista-missoes');
    missoes.forEach(m => {
        const li = document.createElement('li');
        li.className = m.concluida ? 'missao pronta' : 'missao pendente';
        li.innerHTML = `${m.concluida ? '✅' : '🕒'} ${m.texto}`;
        ul.appendChild(li);
    });
    
    // ========================
    // ABAS
    // ========================
    
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(`aba-${btn.dataset.tab}`).classList.add('active');
            btn.classList.add('active');
        });
    });
    
    // ========================
    // SAIR E RESETAR DADOS
    // ========================
    
    const btnLogout = document.querySelector('.btn-logout');
    btnLogout?.addEventListener('click', () => {
        if (confirm('Deseja apagar todos os dados salvos localmente?')) {
            localStorage.clear();
            location.reload();
        }
    });
    
    // ========================
    // Função auxiliar
    // ========================
    function calcularIdade(dataNascimento) {
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
        return idade;
    }
    
    // ✅ Detecta hash na URL e ativa a aba correspondente
    const hash = window.location.hash?.replace('#', '');
    if (hash && document.getElementById(hash)) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
        
        const targetTab = document.getElementById(hash);
        targetTab.classList.add('active');
        
        const btnMatch = document.querySelector(`.menu-btn[data-tab="${hash.replace('aba-', '')}"]`);
        if (btnMatch) btnMatch.classList.add('active');
    }
    
const btnCopiar = document.getElementById('btnCopiarLS');
btnCopiar?.addEventListener('click', () => {
    try {
        const json = JSON.stringify(localStorage, null, 2);
        navigator.clipboard.writeText(json).then(() => {
            alert('📋 Copiado com sucesso!');
        }).catch(() => {
            alert('❌ Erro ao copiar!');
        });
    } catch (e) {
        console.error('Erro ao copiar localStorage:', e);
        alert('❌ Erro inesperado.');
    }
});
});