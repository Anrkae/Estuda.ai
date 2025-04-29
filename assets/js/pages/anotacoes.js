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
    const listaResumosContainer = document.getElementById('lista-resumos'); // Mantém o seletor
    const buscaNotasInput = document.getElementById('busca-notas');
    const placeholderResumos = document.querySelector('#tab-resumos .placeholder-tab'); // Placeholder da aba Resumos

    const ANOTACOES_STORAGE_KEY = 'minhasAnotacoes';
    // const RESUMOS_STORAGE_KEY = 'sessoesEstudo'; // Chave removida por enquanto

    // --- Lógica das Abas ---
    function ativarTab(tabId) {
        // Atualiza links das abas
        tabLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.tab === tabId);
        });
        // Atualiza conteúdo das abas
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });

        // Carregar conteúdo da aba ativa (Apenas Notas por enquanto)
        if (tabId === 'notas') {
            // Verifica se o container existe antes de carregar
            if(listaAnotacoesContainer) {
                carregarAnotacoes();
            } else {
                console.error("Elemento #lista-anotacoes não encontrado.");
            }
        } else if (tabId === 'resumos') {
            // Lógica para carregar resumos será adicionada futuramente
            if(listaResumosContainer) {
                listaResumosContainer.innerHTML = ''; // Limpa
                if(placeholderResumos) placeholderResumos.textContent = 'O conteúdo dos resumos será definido futuramente.';
            }
             console.log("Aba Resumos ativada - Lógica de carregamento pendente.");
        }
    }

    // Adiciona listeners aos links das abas
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Previne comportamento padrão se o link for um 'a' href="#"
            e.preventDefault();
            const tabId = link.dataset.tab;
            if(tabId) { // Verifica se o data-tab existe
               ativarTab(tabId);
            } else {
                console.error("Link da aba sem data-tab definido:", link);
            }
        });
    });

    // --- Lógica do Modal de Anotações ---
    function abrirModal(anotacaoParaEditar = null) {
        if (!modalAnotacao || !modalForm) {
            console.error("Modal ou formulário do modal não encontrado.");
            return;
        }
        modalForm.reset();
        idEditandoInput.value = '';
        if(modalFeedback) {
            modalFeedback.textContent = '';
            modalFeedback.className = 'modal-feedback';
        }
        // Garante que os inputs existem antes de acessá-los
        if(!tituloInput || !textoInput || !idEditandoInput || !modalTitulo) {
             console.error("Elementos internos do modal não encontrados.");
             return;
        }

        if (anotacaoParaEditar && typeof anotacaoParaEditar === 'object') {
            modalTitulo.textContent = 'Editar Anotação';
            idEditandoInput.value = anotacaoParaEditar.id || ''; // Garante que ID existe
            tituloInput.value = anotacaoParaEditar.titulo || '';
            textoInput.value = anotacaoParaEditar.texto || ''; // Garante que texto existe
        } else {
            modalTitulo.textContent = 'Nova Anotação';
        }
        modalAnotacao.style.display = 'flex';
    }

    function fecharModal() {
        if (modalAnotacao) {
            modalAnotacao.style.display = 'none';
        }
    }

    // Adiciona listeners aos botões do modal e overlay
    if (novaAnotacaoBtn) {
        novaAnotacaoBtn.addEventListener('click', () => abrirModal());
    } else { console.warn("Botão #btn-nova-anotacao não encontrado."); }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', fecharModal);
    } else { console.warn("Botão #modal-close-btn não encontrado."); }

    if (cancelarModalBtn) {
        cancelarModalBtn.addEventListener('click', fecharModal);
    } else { console.warn("Botão #btn-cancelar-modal não encontrado."); }

    if (modalAnotacao) {
        modalAnotacao.addEventListener('click', (event) => {
            if (event.target === modalAnotacao) {
                fecharModal();
            }
        });
    } else { console.warn("Elemento #modal-anotacao não encontrado."); }

    // --- CRUD de Anotações (localStorage) ---
    function getAnotacoes() {
        try {
            const data = localStorage.getItem(ANOTACOES_STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Erro ao ler anotações:", e);
            return [];
        }
    }

    function salvarAnotacoes(anotacoes) {
        if(!Array.isArray(anotacoes)) {
            console.error("Tentativa de salvar dados que não são um array em anotações.");
            return false; // Indica falha
        }
        try {
            localStorage.setItem(ANOTACOES_STORAGE_KEY, JSON.stringify(anotacoes));
            return true; // Indica sucesso
        } catch (e) {
            console.error("Erro ao salvar anotações:", e);
            // Verifica se é erro de quota
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                 mostrarFeedbackModal("Erro: Armazenamento cheio. Não foi possível salvar.", true);
            } else {
                mostrarFeedbackModal("Erro desconhecido ao salvar. Tente novamente.", true);
            }
            return false; // Indica falha
        }
    }

    function mostrarFeedbackModal(mensagem, erro = false) {
        if (!modalFeedback) return;
        modalFeedback.textContent = mensagem;
        modalFeedback.className = `modal-feedback ${erro ? 'erro' : 'sucesso'}`;
        modalFeedback.style.display = 'block'; // Garante visibilidade

         // Esconde após um tempo (opcional)
         setTimeout(() => {
             if (modalFeedback.textContent === mensagem) { // Só esconde se a msg for a mesma
                 modalFeedback.style.display = 'none';
             }
         }, 4000);
    }

    // Listener do Submit do Formulário do Modal (CORRIGIDO/REVISADO)
    if (modalForm) {
        modalForm.addEventListener('submit', (event) => {
            event.preventDefault(); // IMPEDE o envio padrão do formulário
            console.log("Formulário do modal submetido."); // Log para debug

            // Verifica se os inputs existem antes de pegar os valores
            if (!idEditandoInput || !tituloInput || !textoInput) {
                 console.error("Inputs do formulário não encontrados no submit.");
                 mostrarFeedbackModal("Erro interno no formulário.", true);
                 return;
            }

            const id = idEditandoInput.value;
            const titulo = tituloInput.value.trim();
            const texto = textoInput.value.trim();

            console.log("Salvando:", { id, titulo, texto }); // Log para debug

            if (!texto) {
                mostrarFeedbackModal("O campo de anotação não pode estar vazio.", true);
                 console.log("Texto vazio, salvamento cancelado."); // Log para debug
                return;
            }

            const anotacoes = getAnotacoes();
            const agora = new Date().toISOString();
            let sucesso = false;

            try {
                if (id) { // Editando
                    const index = anotacoes.findIndex(a => a.id === id);
                    if (index > -1) {
                        anotacoes[index].titulo = titulo;
                        anotacoes[index].texto = texto;
                        anotacoes[index].modificadoEm = agora;
                        console.log("Anotação encontrada para edição, index:", index); // Log
                    } else {
                         console.error("ID para edição não encontrado:", id); // Log
                         mostrarFeedbackModal("Erro: Anotação para editar não encontrada.", true);
                         return; // Sai se não encontrar o ID para editar
                    }
                } else { // Criando
                    const novaAnotacao = {
                        id: `anotacao_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // ID mais robusto
                        titulo: titulo,
                        texto: texto,
                        criadoEm: agora,
                        modificadoEm: agora
                    };
                    anotacoes.push(novaAnotacao);
                     console.log("Nova anotação criada:", novaAnotacao.id); // Log
                }

                // Ordena por data de modificação (mais recentes primeiro)
                anotacoes.sort((a, b) => new Date(b.modificadoEm) - new Date(a.modificadoEm));

                // Tenta salvar
                if (salvarAnotacoes(anotacoes)) {
                     console.log("Anotações salvas no localStorage com sucesso."); // Log
                     mostrarFeedbackModal(id ? "Anotação atualizada com sucesso!" : "Anotação salva com sucesso!", false);
                     sucesso = true;
                     // Verifica se a aba de notas está ativa antes de recarregar
                     const abaNotasAtiva = document.getElementById('tab-notas')?.classList.contains('active');
                     if(abaNotasAtiva) {
                         carregarAnotacoes(); // Atualiza a lista APENAS se a aba estiver ativa
                     }
                } else {
                     console.error("Falha ao chamar salvarAnotacoes."); // Log
                     // O feedback de erro já é mostrado dentro de salvarAnotacoes
                     sucesso = false;
                }

            } catch (error) {
                 console.error("Erro durante o processo de salvar/editar anotação:", error);
                 mostrarFeedbackModal("Ocorreu um erro inesperado.", true);
                 sucesso = false;
            }


            if (sucesso) {
                // Fecha o modal após um pequeno delay
                setTimeout(fecharModal, 1200);
            }
             // Não reabilitar o botão aqui, pois não foi desabilitado
             // Se precisar desabilitar/reabilitar, adicione a lógica correspondente
        });
    } else { console.error("Formulário #form-anotacao-modal não encontrado."); }


    function deletarAnotacao(id) {
        // Adiciona verificação do ID
        if(!id){
             console.error("Tentativa de deletar anotação sem ID.");
             return;
        }
        // Confirmação com o usuário
        if (!confirm("Tem certeza que deseja excluir esta anotação?\nEsta ação não pode ser desfeita.")) {
            return;
        }
        console.log("Tentando deletar anotação ID:", id); // Log
        let anotacoes = getAnotacoes();
        const tamanhoOriginal = anotacoes.length;
        anotacoes = anotacoes.filter(a => a.id !== id);

        // Verifica se alguma anotação foi removida
        if (anotacoes.length < tamanhoOriginal) {
            if(salvarAnotacoes(anotacoes)) {
                console.log("Anotação deletada e lista salva."); // Log
                // Verifica se a aba de notas está ativa antes de recarregar
                const abaNotasAtiva = document.getElementById('tab-notas')?.classList.contains('active');
                 if(abaNotasAtiva) {
                    carregarAnotacoes(); // Atualiza a lista
                 }
            } else {
                 console.error("Falha ao salvar anotações após deletar."); // Log
                 alert("Erro ao salvar após excluir a anotação."); // Feedback simples para o usuário
            }
        } else {
             console.warn("Nenhuma anotação encontrada com o ID para deletar:", id); // Log
        }
    }

    // --- Renderização das Anotações ---
    function renderizarAnotacaoCard(anotacao) {
        // Verifica se anotacao é um objeto válido e tem as propriedades esperadas
        if (typeof anotacao !== 'object' || anotacao === null || !anotacao.id || !anotacao.texto || !anotacao.modificadoEm) {
            console.error("Tentativa de renderizar anotação inválida:", anotacao);
            return null; // Retorna null para não adicionar nada ao DOM
        }

        const card = document.createElement('div');
        card.className = 'anotacao-card item-card';
        card.dataset.id = anotacao.id;

        // Usa textContent para segurança ao inserir título e preview
        const tituloH4 = document.createElement('h4');
        if (anotacao.titulo) {
            tituloH4.textContent = anotacao.titulo;
        } else {
             tituloH4.textContent = "Anotação sem Título"; // Placeholder se não houver título
             tituloH4.style.fontStyle = "italic";
             tituloH4.style.color = "#888";
        }


        const previewP = document.createElement('p');
        previewP.className = 'card-preview';
        const previewTexto = anotacao.texto.length > 150
                           ? anotacao.texto.substring(0, 150) + '...'
                           : anotacao.texto;
        previewP.textContent = previewTexto; // Usa textContent

        const dataSpan = document.createElement('span');
        dataSpan.className = 'card-date';
        try {
            dataSpan.textContent = `Modificado em: ${new Date(anotacao.modificadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
        } catch (e) {
             console.warn("Data de modificação inválida:", anotacao.modificadoEm);
             dataSpan.textContent = 'Data inválida';
        }


        const cardContent = document.createElement('div');
        cardContent.className = 'card-content';
        cardContent.appendChild(tituloH4);
        cardContent.appendChild(previewP);
        cardContent.appendChild(dataSpan);

        const cardActions = document.createElement('div');
        cardActions.className = 'card-actions';
        cardActions.innerHTML = `
            <button class="btn-icon btn-edit" aria-label="Editar">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon btn-delete" aria-label="Excluir">
                 <i class="fas fa-trash"></i>
            </button>
        `;

        card.appendChild(cardContent);
        card.appendChild(cardActions);


        // Event listeners para editar e deletar
        const editBtn = card.querySelector('.btn-edit');
        const deleteBtn = card.querySelector('.btn-delete');

        if(editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                abrirModal(anotacao);
            });
        }
         if(deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deletarAnotacao(anotacao.id);
            });
        }
        // Abrir para editar ao clicar no card (exceto nos botões)
        cardContent.addEventListener('click', () => { // Adiciona listener ao conteúdo
             abrirModal(anotacao);
        });

        return card;
    }

    function carregarAnotacoes(termoBusca = '') {
        if (!listaAnotacoesContainer) {
             console.error("Container #lista-anotacoes não encontrado ao carregar.");
             return;
        }

        const anotacoes = getAnotacoes();
        listaAnotacoesContainer.innerHTML = ''; // Limpa a lista

        const termoLower = termoBusca.toLowerCase().trim();
        const anotacoesFiltradas = termoLower
            ? anotacoes.filter(a =>
                (a.titulo && a.titulo.toLowerCase().includes(termoLower)) ||
                (a.texto && a.texto.toLowerCase().includes(termoLower)) // Verifica se texto existe
              )
            : anotacoes;

        if (anotacoesFiltradas.length > 0) {
            anotacoesFiltradas.forEach(anotacao => {
                const cardElement = renderizarAnotacaoCard(anotacao);
                if (cardElement) { // Adiciona apenas se a renderização foi bem sucedida
                    listaAnotacoesContainer.appendChild(cardElement);
                }
            });
        } else {
            const placeholder = document.createElement('p');
            placeholder.className = 'placeholder-tab';
            placeholder.textContent = termoBusca ? `Nenhuma anotação encontrada para "${escapeHTML(termoBusca)}".` : 'Nenhuma anotação criada ainda. Clique em "Nova Anotação"!';
            listaAnotacoesContainer.appendChild(placeholder);
        }
    }

     // --- Lógica da Busca de Notas ---
    let debounceTimer;
    if (buscaNotasInput) {
        buscaNotasInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                carregarAnotacoes(buscaNotasInput.value);
            }, 300);
        });
    } else { console.warn("Input de busca #busca-notas não encontrado."); }


    // --- Lógica da Aba Resumos (Placeholder) ---
    function carregarResumos() {
        // Função será implementada quando os detalhes forem fornecidos
        if (listaResumosContainer && placeholderResumos) {
            listaResumosContainer.innerHTML = ''; // Limpa
            placeholderResumos.textContent = 'O conteúdo dos resumos será definido futuramente.';
            listaResumosContainer.appendChild(placeholderResumos);
        } else {
            console.error("Elementos da aba Resumos não encontrados (#lista-resumos ou .placeholder-tab).")
        }
    }


    // --- Inicialização ---
    // Verifica se a aba padrão 'notas' existe antes de ativá-la
    if(document.getElementById('tab-notas')) {
        ativarTab('notas');
    } else {
        console.error("Aba padrão 'notas' não encontrada na inicialização.")
        // Opcional: ativar outra aba se existir, ou mostrar erro.
    }


    // Função auxiliar para escapar HTML (evitar XSS)
    function escapeHTML(str) {
        if (typeof str !== 'string') return ''; // Retorna string vazia se não for string
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    console.log("Página de Anotações/Resumos (Tabs) inicializada.");

}); // Fim DOMContentLoaded
