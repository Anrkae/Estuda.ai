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
    const buscaResumosInput = document.getElementById('busca-resumos'); // << NOVO SELETOR

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

        // Limpa busca e recarrega conteúdo da aba ativa (sem filtro inicial)
        if (tabId === 'notas') {
            if(buscaResumosInput) buscaResumosInput.value = ''; // Limpa busca de resumos
            if(listaAnotacoesContainer) {
                carregarAnotacoes(); // Carrega notas sem filtro
            } else { console.error("Elemento #lista-anotacoes não encontrado."); }
        } else if (tabId === 'resumos') {
            if(buscaNotasInput) buscaNotasInput.value = ''; // Limpa busca de notas
            if(listaResumosContainer) {
                carregarResumos(); // Carrega resumos sem filtro
            } else { console.error("Elemento #lista-resumos não encontrado."); }
            console.log("Aba Resumos ativada.");
        }
    }

    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.dataset.tab;
            if(tabId) ativarTab(tabId);
            else console.error("Link da aba sem data-tab:", link);
        });
    });

    // --- Lógica do Modal de Anotações ---
    function abrirModal(anotacaoParaEditar = null) {
        // ... (código do modal sem alterações) ...
        if (!modalAnotacao || !modalForm) return;
        modalForm.reset();
        idEditandoInput.value = '';
        if(modalFeedback) {
            modalFeedback.textContent = '';
            modalFeedback.className = 'modal-feedback';
            modalFeedback.style.display = 'none';
        }
        if(!tituloInput || !textoInput || !idEditandoInput || !modalTitulo) return;

        if (anotacaoParaEditar && typeof anotacaoParaEditar === 'object') {
            modalTitulo.textContent = 'Editar Anotação';
            idEditandoInput.value = anotacaoParaEditar.id || '';
            tituloInput.value = anotacaoParaEditar.titulo || '';
            textoInput.value = anotacaoParaEditar.texto || '';
        } else {
            modalTitulo.textContent = 'Nova Anotação';
        }
        modalAnotacao.style.display = 'flex';
        tituloInput.focus();
    }

    function fecharModal() {
        if (modalAnotacao) modalAnotacao.style.display = 'none';
    }

    if (novaAnotacaoBtn) novaAnotacaoBtn.addEventListener('click', () => abrirModal());
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', fecharModal);
    if (cancelarModalBtn) cancelarModalBtn.addEventListener('click', fecharModal);
    if (modalAnotacao) {
        modalAnotacao.addEventListener('click', (event) => {
            if (event.target === modalAnotacao) fecharModal();
        });
    }

    // --- CRUD de Anotações (localStorage) ---
    // ... (Funções getAnotacoes, salvarAnotacoes, mostrarFeedbackModal, submit do form, deletarAnotacao sem alterações)...
    function getAnotacoes() {
        try { const data = localStorage.getItem(ANOTACOES_STORAGE_KEY); return data ? JSON.parse(data) : []; }
        catch (e) { console.error("Erro ao ler anotações:", e); return []; }
    }
    function salvarAnotacoes(anotacoes) {
        if(!Array.isArray(anotacoes)) return false;
        try { localStorage.setItem(ANOTACOES_STORAGE_KEY, JSON.stringify(anotacoes)); return true; }
        catch (e) {
            console.error("Erro ao salvar anotações:", e);
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') mostrarFeedbackModal("Erro: Armazenamento cheio.", true);
            else mostrarFeedbackModal("Erro desconhecido ao salvar.", true);
            return false;
        }
    }
    function mostrarFeedbackModal(mensagem, erro = false) {
        if (!modalFeedback) return;
        modalFeedback.textContent = mensagem;
        modalFeedback.className = `modal-feedback ${erro ? 'erro' : 'sucesso'}`;
        modalFeedback.style.display = 'block';
         setTimeout(() => { if (modalFeedback.textContent === mensagem) modalFeedback.style.display = 'none'; }, 4000);
    }
    if (modalForm) {
        modalForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!idEditandoInput || !tituloInput || !textoInput) { mostrarFeedbackModal("Erro interno.", true); return; }
            const id = idEditandoInput.value; const titulo = tituloInput.value.trim(); const texto = textoInput.value.trim();
            if (!texto) { mostrarFeedbackModal("Anotação vazia.", true); return; }
            const anotacoes = getAnotacoes(); const agora = new Date().toISOString(); let sucesso = false;
            try {
                if (id) { const index = anotacoes.findIndex(a => a.id === id); if (index > -1) { anotacoes[index].titulo = titulo; anotacoes[index].texto = texto; anotacoes[index].modificadoEm = agora; } else { mostrarFeedbackModal("Erro: Anotação não encontrada.", true); return; } }
                else { anotacoes.push({ id: `anotacao_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, titulo: titulo, texto: texto, criadoEm: agora, modificadoEm: agora }); }
                anotacoes.sort((a, b) => new Date(b.modificadoEm) - new Date(a.modificadoEm));
                if (salvarAnotacoes(anotacoes)) { mostrarFeedbackModal(id ? "Atualizada!" : "Salva!", false); sucesso = true; const abaAtiva = document.getElementById('tab-notas')?.classList.contains('active'); if(abaAtiva) carregarAnotacoes(buscaNotasInput ? buscaNotasInput.value : ''); }
                else { sucesso = false; }
            } catch (error) { console.error("Erro salvar/editar:", error); mostrarFeedbackModal("Erro inesperado.", true); sucesso = false; }
            if (sucesso) setTimeout(fecharModal, 1200);
        });
    }
    function deletarAnotacao(id) {
        if(!id || !confirm("Excluir esta anotação?")) return;
        let anotacoes = getAnotacoes(); const len = anotacoes.length; anotacoes = anotacoes.filter(a => a.id !== id);
        if (anotacoes.length < len) { if(salvarAnotacoes(anotacoes)) { const abaAtiva = document.getElementById('tab-notas')?.classList.contains('active'); if(abaAtiva) carregarAnotacoes(buscaNotasInput ? buscaNotasInput.value : ''); } else { alert("Erro ao salvar após excluir."); } }
    }


    // --- Renderização das Anotações ---
    // ... (Função renderizarAnotacaoCard sem alterações) ...
    function renderizarAnotacaoCard(anotacao) {
        if (typeof anotacao !== 'object' || !anotacao?.id || !anotacao?.texto || !anotacao?.modificadoEm) return null;
        const card = document.createElement('div'); card.className = 'anotacao-card item-card'; card.dataset.id = anotacao.id;
        const tituloH4 = document.createElement('h4'); tituloH4.textContent = anotacao.titulo || "Anotação sem Título"; if (!anotacao.titulo) tituloH4.classList.add('sem-titulo');
        const previewP = document.createElement('p'); previewP.className = 'card-preview'; previewP.textContent = anotacao.texto.length > 150 ? anotacao.texto.substring(0, 150) + '...' : anotacao.texto;
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
    // ... (Função carregarAnotacoes sem alterações significativas, apenas chama renderizarAnotacaoCard) ...
    function carregarAnotacoes(termoBusca = '') {
        if (!listaAnotacoesContainer) return;
        const anotacoes = getAnotacoes(); listaAnotacoesContainer.innerHTML = ''; const termoLower = termoBusca.toLowerCase().trim();
        const anotacoesFiltradas = termoLower ? anotacoes.filter(a => (a.titulo?.toLowerCase().includes(termoLower)) || (a.texto?.toLowerCase().includes(termoLower))) : anotacoes;
        if (anotacoesFiltradas.length > 0) { anotacoesFiltradas.forEach(anotacao => { const card = renderizarAnotacaoCard(anotacao); if (card) listaAnotacoesContainer.appendChild(card); }); }
        else { const p = document.createElement('p'); p.className = 'placeholder-tab'; p.textContent = termoBusca ? `Nenhuma nota encontrada para "${escapeHTML(termoBusca)}".` : 'Nenhuma anotação criada.'; listaAnotacoesContainer.appendChild(p); }
    }

    // --- Lógica da Busca (Notas e Resumos) --- // << ATUALIZADO >>
    let debounceTimer;

    // Listener para busca de NOTAS
    if (buscaNotasInput) {
        buscaNotasInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // Só busca notas se a aba de NOTAS estiver ativa
                if (document.getElementById('tab-notas')?.classList.contains('active')) {
                     carregarAnotacoes(buscaNotasInput.value);
                }
            }, 300);
        });
    }

    // Listener para busca de RESUMOS (NOVO)
    if (buscaResumosInput) {
        buscaResumosInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // Só busca resumos se a aba de RESUMOS estiver ativa
                if (document.getElementById('tab-resumos')?.classList.contains('active')) {
                    carregarResumos(buscaResumosInput.value); // Chama carregarResumos com filtro
                }
            }, 300);
        });
    }

    // --- Lógica da Aba Resumos --- // << ATUALIZADO >>

    /**
     * Carrega e exibe os resumos salvos no localStorage, filtrando opcionalmente.
     * @param {string} termoBusca - Termo para filtrar os resumos.
     */
    function carregarResumos(termoBusca = '') {
        if (!listaResumosContainer) { console.error("Container #lista-resumos não encontrado."); return; }
        listaResumosContainer.innerHTML = '';

        try {
            const resumosSalvos = JSON.parse(localStorage.getItem(RESUMOS_STORAGE_KEY)) || [];
            const termoLower = termoBusca.toLowerCase().trim();

            // Filtra os resumos baseado no termo de busca
            const resumosFiltrados = termoLower
                ? resumosSalvos.filter(resumoTexto =>
                    resumoTexto.toLowerCase().includes(termoLower)
                  )
                : resumosSalvos;

            // Renderiza ou mostra placeholder
            if (resumosFiltrados.length > 0) {
                if (placeholderResumos) placeholderResumos.style.display = 'none'; // Esconde placeholder

                resumosFiltrados.forEach((resumoTexto) => {
                    // Encontra o índice original para garantir que delete/copy funcionem
                    const originalIndex = resumosSalvos.findIndex(original => original === resumoTexto);
                    if (originalIndex !== -1) { // Garante que encontrou
                        const cardElement = renderizarResumoCard(resumoTexto, originalIndex);
                        if (cardElement) listaResumosContainer.appendChild(cardElement);
                    } else {
                        console.warn("Não foi possível encontrar índice original para:", resumoTexto.substring(0, 50) + "...");
                    }
                });
            } else {
                 // Mostra placeholder apropriado
                 if (placeholderResumos) {
                    placeholderResumos.textContent = termoLower
                        ? `Nenhum resumo encontrado para "${escapeHTML(termoBusca)}".`
                        : 'Nenhum resumo salvo ainda.';
                    placeholderResumos.style.display = 'block';
                    if (!listaResumosContainer.contains(placeholderResumos)) listaResumosContainer.appendChild(placeholderResumos);
                    placeholderResumos.classList.remove('erro');
                 } else {
                    const msg = termoLower ? `Nenhum resumo encontrado para "${escapeHTML(termoBusca)}".` : 'Nenhum resumo salvo.';
                    listaResumosContainer.innerHTML = `<p class="placeholder-tab">${msg}</p>`;
                 }
            }
        } catch (e) {
            console.error("Erro ao carregar/filtrar resumos:", e);
             if (placeholderResumos) {
                 placeholderResumos.textContent = 'Erro ao carregar resumos.';
                 placeholderResumos.style.display = 'block';
                 placeholderResumos.classList.add('erro');
                 if (!listaResumosContainer.contains(placeholderResumos)) listaResumosContainer.appendChild(placeholderResumos);
             } else { listaResumosContainer.innerHTML = '<p class="placeholder-tab erro">Erro ao carregar resumos.</p>'; }
        }
    }

    /**
     * Cria e retorna o elemento HTML para um card de resumo.
     * Inclui funcionalidade de "Ver Completo" / "Minimizar".
     * @param {string} resumoTexto - O texto completo do resumo.
     * @param {number} index - O índice ORIGINAL do resumo no array do localStorage.
     * @returns {HTMLElement|null}
     */
    function renderizarResumoCard(resumoTexto, index) {
        // ... (Função renderizarResumoCard com toggle Ver/Minimizar - sem alterações desde a última versão) ...
        if (typeof resumoTexto !== 'string' || resumoTexto.trim() === '') return null;
        const card = document.createElement('div'); card.className = 'resumo-card item-card'; card.dataset.index = index; // Usa índice original
        const cardContent = document.createElement('div'); cardContent.className = 'card-content';
        const previewP = document.createElement('p'); previewP.className = 'card-preview resumo-texto';
        const MAX_PREVIEW_LENGTH = 250; const isTruncated = resumoTexto.length > MAX_PREVIEW_LENGTH; const previewTextoTruncado = resumoTexto.substring(0, MAX_PREVIEW_LENGTH) + '...';
        previewP.textContent = isTruncated ? previewTextoTruncado : resumoTexto; cardContent.appendChild(previewP);
        if (isTruncated) {
            const toggleBtn = document.createElement('button'); toggleBtn.textContent = 'Ver Completo'; toggleBtn.className = 'btn-link btn-toggle-resumo'; toggleBtn.style.marginTop = '5px'; toggleBtn.style.display = 'block';
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation(); const isShowingPreview = toggleBtn.textContent === 'Ver Completo';
                if (isShowingPreview) { previewP.textContent = resumoTexto; toggleBtn.textContent = 'Minimizar'; previewP.classList.add('expanded'); }
                else { previewP.textContent = previewTextoTruncado; toggleBtn.textContent = 'Ver Completo'; previewP.classList.remove('expanded'); }
            });
            cardContent.appendChild(toggleBtn);
        }
        const cardActions = document.createElement('div'); cardActions.className = 'card-actions';
        const copyBtn = document.createElement('button'); copyBtn.className = 'btn-icon btn-copy-resumo'; copyBtn.setAttribute('aria-label', 'Copiar'); copyBtn.innerHTML = '<i class="fas fa-copy"></i>'; copyBtn.addEventListener('click', (e) => { e.stopPropagation(); copiarResumo(resumoTexto, copyBtn); });
        const deleteBtn = document.createElement('button'); deleteBtn.className = 'btn-icon btn-delete-resumo'; deleteBtn.setAttribute('aria-label', 'Excluir'); deleteBtn.innerHTML = '<i class="fas fa-trash"></i>'; deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deletarResumo(index); }); // Usa índice original
        cardActions.appendChild(copyBtn); cardActions.appendChild(deleteBtn);
        card.appendChild(cardContent); card.appendChild(cardActions);
        return card;
    }

    /**
     * Deleta um resumo específico do localStorage pelo seu índice ORIGINAL.
     * @param {number} index - O índice original do resumo a ser deletado.
     */
    function deletarResumo(index) {
        // ... (Função deletarResumo sem alterações - já usa índice) ...
        if (typeof index !== 'number' || index < 0 || !confirm("Excluir este resumo?")) return;
        try {
            let resumosSalvos = JSON.parse(localStorage.getItem(RESUMOS_STORAGE_KEY)) || [];
            if (index >= resumosSalvos.length) throw new Error("Índice inválido para delete");
            resumosSalvos.splice(index, 1); // Remove pelo índice original
            localStorage.setItem(RESUMOS_STORAGE_KEY, JSON.stringify(resumosSalvos));
            // Recarrega com o filtro atual (se houver) para manter a busca ativa
            carregarResumos(buscaResumosInput ? buscaResumosInput.value : '');
        } catch (e) { console.error("Erro ao deletar resumo:", e); alert("Erro ao excluir resumo."); }
    }

    /**
     * Copia o texto do resumo para a área de transferência.
     */
    async function copiarResumo(textoParaCopiar, botao) {
        // ... (Função copiarResumo sem alterações) ...
        if (!navigator.clipboard) { alert("Cópia não suportada."); return; }
        try {
            await navigator.clipboard.writeText(textoParaCopiar);
            const originalIconHTML = botao.innerHTML; botao.innerHTML = '<i class="fas fa-check" style="color: green;"></i>'; botao.disabled = true;
            setTimeout(() => { botao.innerHTML = originalIconHTML; botao.disabled = false; }, 1500);
        } catch (err) { console.error('Erro ao copiar:', err); alert('Falha ao copiar.'); }
    }

    // --- Inicialização ---
    function inicializarApp() {
        // ... (Código de inicialização sem alterações) ...
        const abaPadrao = 'notas';
        const abaLink = document.querySelector(`.tab-link[data-tab="${abaPadrao}"]`);
        if (abaLink) ativarTab(abaPadrao);
        else { const primeiraAba = document.querySelector('.tab-link'); if (primeiraAba?.dataset.tab) ativarTab(primeiraAba.dataset.tab); else console.error("Nenhuma aba encontrada."); }
        console.log("Página de Anotações/Resumos inicializada.");
    }

    // Função auxiliar para escapar HTML
    function escapeHTML(str) {
        // ... (Função escapeHTML sem alterações) ...
        if (typeof str !== 'string') return ''; const div = document.createElement('div'); div.appendChild(document.createTextNode(str)); return div.innerHTML;
    }

    // Inicia a aplicação
    inicializarApp();

}); // Fim DOMContentLoaded
