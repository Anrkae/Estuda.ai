document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos ---
    const tabLinks = document.querySelectorAll('.tab-nav .tab-link');
    const tabContents = document.querySelectorAll('.tab-content-area .tab-content');
    const novaAnotacaoBtn = document.getElementById('btn-nova-anotacao');
    const modalAnotacao = document.getElementById('modal-anotacao');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalForm = document.getElementById('form-anotacao-modal');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalFeedback = document.getElementById('modal-feedback');
    const salvarAnotacaoBtn = document.getElementById('btn-salvar-modal');
    const cancelarModalBtn = document.getElementById('btn-cancelar-modal');
    const tituloInput = document.getElementById('titulo-anotacao-modal');
    const textoInput = document.getElementById('texto-anotacao-modal');
    const idEditandoInput = document.getElementById('id-anotacao-editando');
    const listaAnotacoesContainer = document.getElementById('lista-anotacoes');
    const listaResumosContainer = document.getElementById('lista-resumos');
    const placeholderResumos = document.querySelector('#tab-resumos .placeholder-tab');
    const buscaNotasInput = document.getElementById('busca-notas');
    const buscaResumosInput = document.getElementById('busca-resumos');

    // --- NOVOS Seletores para Adicionar Resumo ---
    const btnNovoResumo = document.getElementById('btn-novo-resumo'); // Adicione este botão no seu HTML
    const modalNovoResumo = document.getElementById('modal-novo-resumo'); // Adicione este modal no seu HTML
    const modalNovoResumoCloseBtn = document.getElementById('modal-novo-resumo-close-btn');
    const formNovoResumoModal = document.getElementById('form-novo-resumo-modal');
    const modalNovoResumoTitulo = document.getElementById('modal-novo-resumo-titulo');
    const modalNovoResumoFeedback = document.getElementById('modal-novo-resumo-feedback');
    const tituloNovoResumoInput = document.getElementById('titulo-novo-resumo-modal');
    const textoNovoResumoInput = document.getElementById('texto-novo-resumo-modal');
    const btnSalvarNovoResumoModal = document.getElementById('btn-salvar-novo-resumo-modal');
    const btnCancelarNovoResumoModal = document.getElementById('btn-cancelar-novo-resumo-modal');


    // --- Chaves do localStorage ---
    const ANOTACOES_STORAGE_KEY = 'minhasAnotacoes';
    const RESUMOS_STORAGE_KEY = 'estudaAiSummaries';

    // --- Lógica das Abas ---
    function ativarTab(tabId) {
        tabLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.tab === tabId);
        });
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });
        // Mostrar/Ocultar botão "Novo Resumo" dependendo da aba
        if (btnNovoResumo) {
            btnNovoResumo.style.display = (tabId === 'resumos') ? 'inline-block' : 'none';
        }

        if (tabId === 'notas') {
            if(buscaResumosInput) buscaResumosInput.value = '';
            if(listaAnotacoesContainer) carregarAnotacoes(); else console.error("#lista-anotacoes não encontrado.");
        } else if (tabId === 'resumos') {
            if(buscaNotasInput) buscaNotasInput.value = '';
            if(listaResumosContainer) carregarResumos(); else console.error("#lista-resumos não encontrado.");
        }
    }
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); const tabId = link.dataset.tab; if(tabId) ativarTab(tabId); });
    });

    // --- Lógica do Modal de Anotações ---
    function abrirModal(anotacaoParaEditar = null) {
        if (!modalAnotacao || !modalForm) return;
        modalForm.reset(); idEditandoInput.value = '';
        if(modalFeedback) { modalFeedback.textContent = ''; modalFeedback.className = 'modal-feedback'; modalFeedback.style.display = 'none'; }
        if(!tituloInput || !textoInput || !idEditandoInput || !modalTitulo) return;
        if (anotacaoParaEditar && typeof anotacaoParaEditar === 'object') {
            modalTitulo.textContent = 'Editar Anotação'; idEditandoInput.value = anotacaoParaEditar.id || '';
            tituloInput.value = anotacaoParaEditar.titulo || ''; textoInput.value = anotacaoParaEditar.texto || '';
        } else { modalTitulo.textContent = 'Nova Anotação'; }
        modalAnotacao.style.display = 'flex'; tituloInput.focus();
    }
    function fecharModal() { if (modalAnotacao) modalAnotacao.style.display = 'none'; }
    if (novaAnotacaoBtn) novaAnotacaoBtn.addEventListener('click', () => abrirModal());
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', fecharModal);
    if (cancelarModalBtn) cancelarModalBtn.addEventListener('click', fecharModal);
    if (modalAnotacao) { modalAnotacao.addEventListener('click', (event) => { if (event.target === modalAnotacao) fecharModal(); }); }

    // --- CRUD de Anotações (localStorage) ---
    function getAnotacoes() { try { const data = localStorage.getItem(ANOTACOES_STORAGE_KEY); return data ? JSON.parse(data) : []; } catch (e) { console.error("Erro ao ler anotações:", e); return []; } }
    function salvarAnotacoes(anotacoes) { if(!Array.isArray(anotacoes)) return false; try { localStorage.setItem(ANOTACOES_STORAGE_KEY, JSON.stringify(anotacoes)); return true; } catch (e) { console.error("Erro ao salvar anotações:", e); if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') mostrarFeedbackModal("Erro: Armazenamento cheio.", true); else mostrarFeedbackModal("Erro desconhecido ao salvar.", true); return false; } }
    function mostrarFeedbackModal(mensagem, erro = false) { if (!modalFeedback) return; modalFeedback.textContent = mensagem; modalFeedback.className = `modal-feedback ${erro ? 'erro' : 'sucesso'}`; modalFeedback.style.display = 'block'; setTimeout(() => { if (modalFeedback.textContent === mensagem) modalFeedback.style.display = 'none'; }, 4000); }
    if (modalForm) {
        modalForm.addEventListener('submit', (event) => {
            event.preventDefault(); if (!idEditandoInput || !tituloInput || !textoInput) { mostrarFeedbackModal("Erro interno.", true); return; }
            const id = idEditandoInput.value; const titulo = tituloInput.value.trim(); const texto = textoInput.value.trim(); if (!texto) { mostrarFeedbackModal("Anotação vazia.", true); return; }
            const anotacoes = getAnotacoes(); const agora = new Date().toISOString(); let sucesso = false;
            try {
                if (id) { const index = anotacoes.findIndex(a => a.id === id); if (index > -1) { anotacoes[index].titulo = titulo; anotacoes[index].texto = texto; anotacoes[index].modificadoEm = agora; } else { mostrarFeedbackModal("Erro: Anotação não encontrada.", true); return; } }
                else { anotacoes.push({ id: `anotacao_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, titulo: titulo, texto: texto, criadoEm: agora, modificadoEm: agora }); }
                anotacoes.sort((a, b) => new Date(b.modificadoEm) - new Date(a.modificadoEm));
                if (salvarAnotacoes(anotacoes)) { mostrarFeedbackModal(id ? "Atualizada!" : "Salva!", false); sucesso = true; const abaAtiva = document.getElementById('tab-notas')?.classList.contains('active'); if(abaAtiva) carregarAnotacoes(buscaNotasInput ? buscaNotasInput.value : ''); } else { sucesso = false; }
            } catch (error) { console.error("Erro salvar/editar:", error); mostrarFeedbackModal("Erro inesperado.", true); sucesso = false; }
            if (sucesso) setTimeout(fecharModal, 1200);
        });
    }
    function deletarAnotacao(id) { if(!id || !confirm("Excluir esta anotação?")) return; let anotacoes = getAnotacoes(); const len = anotacoes.length; anotacoes = anotacoes.filter(a => a.id !== id); if (anotacoes.length < len) { if(salvarAnotacoes(anotacoes)) { const abaAtiva = document.getElementById('tab-notas')?.classList.contains('active'); if(abaAtiva) carregarAnotacoes(buscaNotasInput ? buscaNotasInput.value : ''); } else { alert("Erro ao salvar após excluir."); } } }

    // --- Renderização das Anotações ---
    function renderizarAnotacaoCard(anotacao) {
        if (typeof anotacao !== 'object' || !anotacao?.id || !anotacao?.texto || !anotacao?.modificadoEm) return null;
        const card = document.createElement('div'); card.className = 'anotacao-card item-card'; card.dataset.id = anotacao.id;
        const tituloH4 = document.createElement('h4'); tituloH4.textContent = anotacao.titulo || "Anotação sem Título"; if (!anotacao.titulo) tituloH4.classList.add('sem-titulo');
        const previewP = document.createElement('p'); previewP.className = 'card-preview'; previewP.textContent = anotacao.texto;
        const dataSpan = document.createElement('span'); dataSpan.className = 'card-date'; try { dataSpan.textContent = `Modificado em: ${new Date(anotacao.modificadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`; } catch (e) { dataSpan.textContent = 'Data inválida'; }
        const cardContent = document.createElement('div'); cardContent.className = 'card-content'; cardContent.append(tituloH4, previewP, dataSpan);
        const cardActions = document.createElement('div'); cardActions.className = 'card-actions'; cardActions.innerHTML = `<button class="btn-icon btn-edit" aria-label="Editar"><i class="fas fa-edit"></i></button><button class="btn-icon btn-delete" aria-label="Excluir"><i class="fas fa-trash"></i></button>`;
        card.append(cardContent, cardActions);
        const editBtn = card.querySelector('.btn-edit'); const deleteBtn = card.querySelector('.btn-delete');
        if(editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); abrirModal(anotacao); }); if(deleteBtn) deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deletarAnotacao(anotacao.id); });
        cardContent.addEventListener('click', () => abrirModal(anotacao));
        return card;
    }

    // --- Carregamento das Anotações ---
    function carregarAnotacoes(termoBusca = '') {
        if (!listaAnotacoesContainer) return;
        const anotacoes = getAnotacoes(); listaAnotacoesContainer.innerHTML = ''; const termoLower = termoBusca.toLowerCase().trim();
        const anotacoesFiltradas = termoLower ? anotacoes.filter(a => (a.titulo?.toLowerCase().includes(termoLower)) || (a.texto?.toLowerCase().includes(termoLower))) : anotacoes;
        if (anotacoesFiltradas.length > 0) { anotacoesFiltradas.forEach(anotacao => { const card = renderizarAnotacaoCard(anotacao); if (card) listaAnotacoesContainer.appendChild(card); }); }
        else { const p = document.createElement('p'); p.className = 'placeholder-tab'; p.textContent = termoBusca ? `Nenhuma nota encontrada para "${escapeHTML(termoBusca)}".` : 'Nenhuma anotação criada.'; listaAnotacoesContainer.appendChild(p); }
    }

    // --- Lógica da Busca (Notas e Resumos) ---
    let debounceTimer;
    if (buscaNotasInput) { buscaNotasInput.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => { if (document.getElementById('tab-notas')?.classList.contains('active')) carregarAnotacoes(buscaNotasInput.value); }, 300); }); }
    if (buscaResumosInput) { buscaResumosInput.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => { if (document.getElementById('tab-resumos')?.classList.contains('active')) carregarResumos(buscaResumosInput.value); }, 300); }); }

    // --- Lógica da Aba Resumos ---

    // --- Lógica do Modal de Novo Resumo ---
    function abrirModalNovoResumo() {
        if (!modalNovoResumo || !formNovoResumoModal || !tituloNovoResumoInput || !textoNovoResumoInput) {
            console.error("Elementos do modal de novo resumo não encontrados.");
            return;
        }
        formNovoResumoModal.reset();
        if(modalNovoResumoFeedback) { modalNovoResumoFeedback.textContent = ''; modalNovoResumoFeedback.className = 'modal-feedback'; modalNovoResumoFeedback.style.display = 'none'; }
        if(modalNovoResumoTitulo) modalNovoResumoTitulo.textContent = 'Novo Resumo';
        modalNovoResumo.style.display = 'flex';
        textoNovoResumoInput.focus();
    }

    function fecharModalNovoResumo() {
        if (modalNovoResumo) modalNovoResumo.style.display = 'none';
    }

    function mostrarFeedbackModalNovoResumo(mensagem, erro = false) {
        if (!modalNovoResumoFeedback) return;
        modalNovoResumoFeedback.textContent = mensagem;
        modalNovoResumoFeedback.className = `modal-feedback ${erro ? 'erro' : 'sucesso'}`;
        modalNovoResumoFeedback.style.display = 'block';
        setTimeout(() => {
            if (modalNovoResumoFeedback.textContent === mensagem) modalNovoResumoFeedback.style.display = 'none';
        }, 4000);
    }

    if (btnNovoResumo) {
        btnNovoResumo.addEventListener('click', abrirModalNovoResumo);
    }
    if (modalNovoResumoCloseBtn) {
        modalNovoResumoCloseBtn.addEventListener('click', fecharModalNovoResumo);
    }
    if (btnCancelarNovoResumoModal) {
        btnCancelarNovoResumoModal.addEventListener('click', fecharModalNovoResumo);
    }
    if (modalNovoResumo) {
        modalNovoResumo.addEventListener('click', (event) => {
            if (event.target === modalNovoResumo) fecharModalNovoResumo();
        });
    }

    // --- Lógica para Salvar Novo Resumo ---
    if (formNovoResumoModal) {
        formNovoResumoModal.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!textoNovoResumoInput || !tituloNovoResumoInput) {
                mostrarFeedbackModalNovoResumo("Erro interno ao processar o formulário.", true);
                return;
            }

            const titulo = tituloNovoResumoInput.value.trim();
            const resumoTexto = textoNovoResumoInput.value.trim();

            if (!resumoTexto) {
                mostrarFeedbackModalNovoResumo("O conteúdo do resumo não pode estar vazio.", true);
                textoNovoResumoInput.focus();
                return;
            }

            try {
                let resumosSalvos = JSON.parse(localStorage.getItem(RESUMOS_STORAGE_KEY)) || [];
                // Adiciona o novo resumo no início da lista (mais recentes primeiro)
                // O ID não é estritamente usado pelo renderizarResumoCard ou deletarResumo atual,
                // mas é uma boa prática para futuras expansões.
                // A deleção atual usa o conteúdo do resumo, o que pode ser frágil.
                const novoResumo = {
                    // id: `resumo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // ID único
                    title: titulo,
                    summary: resumoTexto,
                    // createdAt: new Date().toISOString() // Data de criação, se necessário
                };

                resumosSalvos.unshift(novoResumo); // Adiciona no início

                localStorage.setItem(RESUMOS_STORAGE_KEY, JSON.stringify(resumosSalvos));
                mostrarFeedbackModalNovoResumo("Resumo salvo com sucesso!", false);
                carregarResumos(buscaResumosInput ? buscaResumosInput.value : ''); // Recarrega a lista de resumos
                setTimeout(fecharModalNovoResumo, 1200);

            } catch (e) {
                console.error("Erro ao salvar novo resumo:", e);
                mostrarFeedbackModalNovoResumo("Erro ao salvar o resumo. Verifique o console.", true);
                if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                    mostrarFeedbackModalNovoResumo("Erro: Limite de armazenamento local excedido.", true);
                }
            }
        });
    }


    function carregarResumos(termoBusca = '') {
        if (!listaResumosContainer) { console.error("Container #lista-resumos não encontrado."); return; }
        listaResumosContainer.innerHTML = '';
        try {
            const resumosSalvos = JSON.parse(localStorage.getItem(RESUMOS_STORAGE_KEY)) || [];
            const termoLower = termoBusca.toLowerCase().trim();
            const resumosFiltrados = termoLower ? resumosSalvos.filter(resumoObj => (resumoObj.title && resumoObj.title.toLowerCase().includes(termoLower)) || (resumoObj.summary && resumoObj.summary.toLowerCase().includes(termoLower))) : resumosSalvos;
            if (resumosFiltrados.length > 0) {
                if (placeholderResumos) placeholderResumos.style.display = 'none';
                resumosFiltrados.forEach((resumoObj) => { const cardElement = renderizarResumoCard(resumoObj); if (cardElement) listaResumosContainer.appendChild(cardElement); });
            } else {
                 if (placeholderResumos) {
                    placeholderResumos.textContent = termoLower ? `Nenhum resumo encontrado para "${escapeHTML(termoBusca)}".` : 'Nenhum resumo salvo ainda. Clique em "Criar Novo Resumo" para adicionar.';
                    placeholderResumos.style.display = 'block'; if (!listaResumosContainer.contains(placeholderResumos)) listaResumosContainer.appendChild(placeholderResumos); placeholderResumos.classList.remove('erro');
                 } else { const msg = termoLower ? `Nenhum resumo encontrado para "${escapeHTML(termoBusca)}".` : 'Nenhum resumo salvo. Clique em "Criar Novo Resumo" para adicionar.'; listaResumosContainer.innerHTML = `<p class="placeholder-tab">${msg}</p>`; }
            }
        } catch (e) {
            console.error("Erro ao carregar/filtrar resumos:", e);
             if (placeholderResumos) { placeholderResumos.textContent = 'Erro ao carregar resumos.'; placeholderResumos.style.display = 'block'; placeholderResumos.classList.add('erro'); if (!listaResumosContainer.contains(placeholderResumos)) listaResumosContainer.appendChild(placeholderResumos); }
             else { listaResumosContainer.innerHTML = '<p class="placeholder-tab erro">Erro ao carregar resumos.</p>'; }
        }
    }

    function renderizarResumoCard(resumoObj) {
        if (typeof resumoObj !== 'object' || !resumoObj.summary || typeof resumoObj.summary !== 'string' || resumoObj.summary.trim() === '') { console.warn("Objeto de resumo inválido:", resumoObj); return null; }

        const card = document.createElement('div');
        card.className = 'resumo-card item-card';
        // Usar o summary como data-summary-key é arriscado se houver resumos idênticos.
        // Se você adicionar um ID ao objeto resumo, use-o aqui: card.dataset.id = resumoObj.id;
        card.dataset.summaryKey = resumoObj.summary;


        const cardContent = document.createElement('div');
        cardContent.className = 'card-content';

        const tituloH4 = document.createElement('h4');
        tituloH4.textContent = resumoObj.title || "Resumo sem Título";
        if (!resumoObj.title) tituloH4.classList.add('sem-titulo');
        cardContent.appendChild(tituloH4);

        const previewP = document.createElement('p');
        previewP.className = 'card-preview resumo-texto';
        const fullText = resumoObj.summary;
        const MAX_PREVIEW_LENGTH = 250;
        const isTruncated = fullText.length > MAX_PREVIEW_LENGTH;
        const previewText = isTruncated ? fullText.substring(0, MAX_PREVIEW_LENGTH) + '...' : fullText;

        previewP.textContent = previewText;
        cardContent.appendChild(previewP);

        if (isTruncated) {
            const toggleBtn = document.createElement('button');
            toggleBtn.textContent = 'Ver Completo';
            toggleBtn.className = 'btn-link btn-toggle-resumo';
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isShowingPreview = !previewP.classList.contains('expanded');
                if (isShowingPreview) {
                    previewP.textContent = fullText;
                    previewP.classList.add('expanded');
                    toggleBtn.textContent = 'Minimizar';
                } else {
                    previewP.textContent = previewText;
                    previewP.classList.remove('expanded');
                    toggleBtn.textContent = 'Ver Completo';
                }
            });
            cardContent.appendChild(toggleBtn);
        }

        const cardActions = document.createElement('div');
        cardActions.className = 'card-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-icon btn-copy-resumo';
        copyBtn.setAttribute('aria-label', 'Copiar');
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.addEventListener('click', (e) => { e.stopPropagation(); copiarResumo(fullText, copyBtn); });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-icon btn-delete-resumo';
        deleteBtn.setAttribute('aria-label', 'Excluir');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        // A deleção aqui é baseada no CONTEÚDO do resumo (fullText).
        // Isso pode ser problemático se houver resumos com conteúdo idêntico.
        // Idealmente, cada resumo teria um ID único para deleção.
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deletarResumo(fullText); });

        cardActions.appendChild(copyBtn);
        cardActions.appendChild(deleteBtn);
        card.appendChild(cardContent);
        card.appendChild(cardActions);
        return card;
    }

    function deletarResumo(summaryToDelete) {
        if (typeof summaryToDelete !== 'string' || !confirm("Excluir este resumo?")) return;
        try {
            let resumosSalvos = JSON.parse(localStorage.getItem(RESUMOS_STORAGE_KEY)) || [];
            // ATENÇÃO: Esta lógica de deleção assume que o 'summary' é único.
            // Se houver resumos com o mesmo conteúdo, apenas o primeiro encontrado será deletado.
            // Para uma deleção mais robusta, seria necessário um ID único por resumo.
            const indexToDelete = resumosSalvos.findIndex(entry => entry.summary === summaryToDelete);
            if (indexToDelete !== -1) {
                resumosSalvos.splice(indexToDelete, 1);
                localStorage.setItem(RESUMOS_STORAGE_KEY, JSON.stringify(resumosSalvos));
                carregarResumos(buscaResumosInput ? buscaResumosInput.value : '');
            } else { console.warn("Resumo a ser deletado não encontrado:", summaryToDelete); alert("Não foi possível encontrar o resumo para excluir."); }
        } catch (e) { console.error("Erro ao deletar resumo:", e); alert("Erro ao excluir resumo."); }
    }

    async function copiarResumo(textoParaCopiar, botao) {
        if (!navigator.clipboard) { alert("Cópia não suportada."); return; }
        try {
            await navigator.clipboard.writeText(textoParaCopiar);
            const originalIconHTML = botao.innerHTML; botao.innerHTML = '<i class="fas fa-check" style="color: green;"></i>'; botao.disabled = true;
            setTimeout(() => { botao.innerHTML = originalIconHTML; botao.disabled = false; }, 1500);
        } catch (err) { console.error('Erro ao copiar:', err); alert('Falha ao copiar.'); }
    }

    // --- Inicialização ---
    function inicializarApp() {
        const abaPadrao = 'notas'; // Ou a aba que você preferir como padrão
        const abaLink = document.querySelector(`.tab-link[data-tab="${abaPadrao}"]`);
        if (abaLink) {
            ativarTab(abaPadrao);
        } else {
            const primeiraAba = document.querySelector('.tab-link');
            if (primeiraAba?.dataset.tab) {
                ativarTab(primeiraAba.dataset.tab);
            } else {
                console.error("Nenhuma aba encontrada para inicializar.");
                // Se nenhum botão de novo resumo existir, oculte-o por precaução
                if (btnNovoResumo) btnNovoResumo.style.display = 'none';
            }
        }
         // Se não houver resumos e o placeholder existir, atualize a mensagem
        if (listaResumosContainer && listaResumosContainer.children.length === 0 && placeholderResumos && placeholderResumos.textContent.includes('Nenhum resumo salvo ainda.')) {
            placeholderResumos.textContent = 'Nenhum resumo salvo ainda. Clique em "Criar Novo Resumo" para adicionar.';
        }
    }

    function escapeHTML(str) { if (typeof str !== 'string') return ''; const div = document.createElement('div'); div.appendChild(document.createTextNode(str)); return div.innerHTML; }

    inicializarApp();
});
