// ADICIONADA: Função para alternar o estado minimizado/expandido (MANTIDA)
function toggleMinimizado(bloco) {
    // ... (código original sem alterações) ...
    if (!bloco) return; // Segurança: Sai se o bloco não for válido

    bloco.classList.toggle('minimizado'); // Adiciona ou remove a classe 'minimizado'

    const botao = bloco.querySelector('.botao-minimizar'); // Procura o botão DENTRO do bloco atual
    const icone = botao ? botao.querySelector('i') : null; // Procura o ícone DENTRO do botão

    if (icone) {
        const estaMinimizado = bloco.classList.contains('minimizado');

        // Lógica para trocar ícone e texto acessível
        if (estaMinimizado) {
            icone.classList.remove('fa-minus');
            icone.classList.add('fa-plus');
            if (botao) botao.setAttribute('aria-label', 'Expandir');
        } else {
            icone.classList.remove('fa-plus');
            icone.classList.add('fa-minus');
            if (botao) botao.setAttribute('aria-label', 'Minimizar');
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Elementos da UI (REMOVIDOS idAnotacaoEditandoEl e btnCancelarEdicaoEl)
    const listaSecoesEl = document.getElementById('lista-secoes');
    const tituloSecaoEl = document.getElementById('titulo-secao');
    const listaAnotacoesEl = document.getElementById('lista-anotacoes');
    const textoAnotacaoEl = document.getElementById('texto-anotacao');
    // const idAnotacaoEditandoEl = document.getElementById('id-anotacao-editando'); // REMOVIDO
    const btnSalvarEl = document.getElementById('btn-salvar');
    // const btnCancelarEdicaoEl = document.getElementById('btn-cancelar-edicao'); // REMOVIDO
    const campoBuscaEl = document.getElementById('campo-busca');
    const resultadosBuscaEl = document.getElementById('resultados-busca');
    const secaoSelecionadaEdicaoEl = document.getElementById('secao-selecionada-edicao');
    const tituloAnotacaoEl = document.getElementById('titulo-anotacao');

    const STORAGE_KEY = 'minhasAnotacoes';
    let secaoAtual = null;
    let todasAnotacoes = carregarAnotacoesDoStorage();

    // --- Funções Principais ---

    // carregarAnotacoesDoStorage (sem alterações)
    function carregarAnotacoesDoStorage() {
        // ... (código original sem alterações) ...
        const dados = localStorage.getItem(STORAGE_KEY);
        if (!dados) {
            return { 'Lembretes': [], 'Resumos': [], 'Flashcards': [] };
        }
        try {
            return JSON.parse(dados);
        } catch (error) {
            console.error("Erro ao carregar anotações do localStorage:", error);
            return { 'Lembretes': [], 'Resumos': [], 'Flashcards': [] };
        }
    }

    // salvarAnotacoesNoStorage (sem alterações)
    function salvarAnotacoesNoStorage() {
        // ... (código original sem alterações) ...
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(todasAnotacoes));
        } catch (error) {
            console.error("Erro ao salvar anotações no localStorage:", error);
            alert("Não foi possível salvar as anotações. O armazenamento pode estar cheio.");
        }
    }

    // gerarIdUnico (sem alterações)
    function gerarIdUnico() {
        // ... (código original sem alterações) ...
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    }

    // renderizarSecoes (sem alterações na lógica do listener)
    function renderizarSecoes() {
        // ... (código original sem alterações) ...
        listaSecoesEl.innerHTML = '';
        Object.keys(todasAnotacoes).sort().forEach(nomeSecao => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = nomeSecao;
            a.dataset.secao = nomeSecao;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                selecionarSecao(nomeSecao);
            });
            li.appendChild(a);
            listaSecoesEl.appendChild(li);
        });
    }

    // renderizarDropdownSecoes (sem alterações)
    function renderizarDropdownSecoes() {
        // ... (código original sem alterações) ...
        const valorSelecionadoAntes = secaoSelecionadaEdicaoEl.value;
        const placeholderOption = secaoSelecionadaEdicaoEl.querySelector('option[value=""]');
        secaoSelecionadaEdicaoEl.innerHTML = '';
        if (placeholderOption) {
             secaoSelecionadaEdicaoEl.appendChild(placeholderOption);
        }
        Object.keys(todasAnotacoes).sort().forEach(nomeSecao => {
            const option = document.createElement('option');
            option.value = nomeSecao;
            option.textContent = nomeSecao;
            secaoSelecionadaEdicaoEl.appendChild(option);
        });
        // Lógica para manter seleção ou default (sem alterações)
        if (secaoSelecionadaEdicaoEl.querySelector(`option[value="${valorSelecionadoAntes}"]`)) {
            secaoSelecionadaEdicaoEl.value = valorSelecionadoAntes;
        } else if (secaoAtual && secaoSelecionadaEdicaoEl.querySelector(`option[value="${secaoAtual}"]`)) {
             secaoSelecionadaEdicaoEl.value = secaoAtual;
        } else if (placeholderOption) {
             secaoSelecionadaEdicaoEl.value = "";
        }
    }

    // selecionarSecao (sem alterações)
    function selecionarSecao(nomeSecao) {
        // ... (código original sem alterações) ...
        if (!todasAnotacoes[nomeSecao] && Object.keys(todasAnotacoes).length > 0) {
            console.warn(`Tentativa de selecionar seção inexistente: ${nomeSecao}`);
            const primeiraSecao = Object.keys(todasAnotacoes).sort()[0];
             if (primeiraSecao) {
                  nomeSecao = primeiraSecao;
                  console.log(`Selecionando a primeira seção disponível: ${nomeSecao}`);
             } else {
                  secaoAtual = null;
                  tituloSecaoEl.textContent = "Nenhuma seção disponível";
                  listaAnotacoesEl.innerHTML = '<p>Crie ou carregue seções.</p>';
                  limparFormularioEdicao(); // Ainda útil para limpar o form
                  secaoSelecionadaEdicaoEl.value = "";
                  document.querySelectorAll('#lista-secoes a.ativo').forEach(link => link.classList.remove('ativo'));
                  return;
             }
        } else if (Object.keys(todasAnotacoes).length === 0) {
             secaoAtual = null;
             tituloSecaoEl.textContent = "Nenhuma seção criada";
             listaAnotacoesEl.innerHTML = '<p>Adicione uma anotação para criar a primeira seção.</p>';
             limparFormularioEdicao(); // Ainda útil
             secaoSelecionadaEdicaoEl.value = "";
             document.querySelectorAll('#lista-secoes a.ativo').forEach(link => link.classList.remove('ativo'));
             return;
        }

        document.querySelectorAll('#lista-secoes a.ativo').forEach(link => link.classList.remove('ativo'));
        const linkAtivo = document.querySelector(`#lista-secoes a[data-secao="${nomeSecao}"]`);
        if (linkAtivo) {
            linkAtivo.classList.add('ativo');
        } else {
            console.warn(`Link da seção "${nomeSecao}" não encontrado na UI da sidebar.`);
        }
        secaoAtual = nomeSecao;
        tituloSecaoEl.textContent = `Seção: ${nomeSecao}`;
        campoBuscaEl.value = '';
        resultadosBuscaEl.innerHTML = '';
        resultadosBuscaEl.style.display = 'none';
        listaAnotacoesEl.style.display = 'block';
        renderizarAnotacoesDaSecao(nomeSecao);
        limparFormularioEdicao(); // Limpa o form ao mudar de seção
        if (secaoSelecionadaEdicaoEl.querySelector(`option[value="${nomeSecao}"]`)) {
             secaoSelecionadaEdicaoEl.value = nomeSecao;
        } else {
             secaoSelecionadaEdicaoEl.value = "";
        }
    }

    // *** ATUALIZADA: renderizarAnotacoesDaSecao (Botão Editar REMOVIDO) ***
    function renderizarAnotacoesDaSecao(nomeSecao) {
        listaAnotacoesEl.innerHTML = '';
        const anotacoes = todasAnotacoes[nomeSecao] || [];
        if (anotacoes.length === 0) {
            listaAnotacoesEl.innerHTML = '<p>Nenhuma anotação nesta seção ainda.</p>';
            return;
        }

        anotacoes.forEach(anotacao => {
            // 1. Cria o Div principal (sem alterações)
            const div = document.createElement('div');
            div.classList.add('anotacao', 'bloco');
            div.dataset.id = anotacao.id;

            // 2. Cria o wrapper para título e botão minimizar (sem alterações)
            const divTituloBtn = document.createElement('div');
            divTituloBtn.classList.add('tituloBtn');

            // Cria o elemento de título (sem alterações)
            let elementoTitulo;
            if (anotacao.titulo) {
                elementoTitulo = document.createElement('h4');
                elementoTitulo.classList.add('anotacao-titulo');
                elementoTitulo.textContent = anotacao.titulo;
            } else {
                elementoTitulo = document.createElement('span');
                elementoTitulo.innerHTML = '&nbsp;';
            }
            elementoTitulo.classList.add('tituloBloco');
            elementoTitulo.style.cursor = 'pointer';
            elementoTitulo.addEventListener('click', () => {
                toggleMinimizado(div);
            });
            divTituloBtn.appendChild(elementoTitulo);

            // 3. Cria o botão Minimizar/Expandir (sem alterações)
            const btnMinimizar = document.createElement('button');
            btnMinimizar.classList.add('botao-minimizar');
            // ... (resto da criação do botão minimizar)
             const estaMinimizadoInicial = div.classList.contains('minimizado');
            btnMinimizar.setAttribute('aria-label', estaMinimizadoInicial ? 'Expandir' : 'Minimizar');
            const iconeMinimizar = document.createElement('i');
            iconeMinimizar.classList.add('fas');
            iconeMinimizar.classList.add(estaMinimizadoInicial ? 'fa-plus' : 'fa-minus');
            btnMinimizar.appendChild(iconeMinimizar);
            btnMinimizar.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleMinimizado(div);
            });
            divTituloBtn.appendChild(btnMinimizar);
            div.appendChild(divTituloBtn);

            // 4. Cria o parágrafo do conteúdo (sem alterações)
            const p = document.createElement('p');
            p.classList.add('anotacao-texto', 'conteudo-bloco');
            p.style.whiteSpace = 'pre-wrap';
            p.textContent = anotacao.texto;
            div.appendChild(p);

            // 5. Cria o wrapper dos botões de ação (AGORA SÓ DELETAR)
            const BotoesWrapper = document.createElement('div');
            BotoesWrapper.classList.add('anotacao-botoes', 'conteudo-bloco');

            // --- BOTÃO EDITAR REMOVIDO ---
            // const btnEditar = document.createElement('button');
            // btnEditar.textContent = 'Editar';
            // btnEditar.title = 'Editar esta anotação';
            // btnEditar.addEventListener('click', () => iniciarEdicao(nomeSecao, anotacao.id)); // iniciarEdicao não existe mais
            // BotoesWrapper.appendChild(btnEditar);
            // --- FIM DA REMOÇÃO ---

            // 6. Cria o Botão Deletar (sem alterações na criação)
            const btnDeletar = document.createElement('button');
            btnDeletar.innerHTML = '&#x2715;'; // Símbolo 'X'
            btnDeletar.classList.add('delete', 'conteudo-bloco');
            btnDeletar.title = 'Excluir anotação';
            btnDeletar.addEventListener('click', () => deletarAnotacao(nomeSecao, anotacao.id));
            BotoesWrapper.appendChild(btnDeletar); // Adiciona o Deletar ao wrapper

            // Adiciona o wrapper (agora só com Deletar) ao bloco principal
            div.appendChild(BotoesWrapper);

            // 7. Adiciona o bloco completo à lista
            listaAnotacoesEl.appendChild(div);
        });
    }

    // --- FUNÇÃO iniciarEdicao REMOVIDA ---
    // function iniciarEdicao(nomeSecao, idAnotacao) { ... }

    // *** FUNÇÃO limparFormularioEdicao SIMPLIFICADA ***
    function limparFormularioEdicao() {
        tituloAnotacaoEl.value = '';
        textoAnotacaoEl.value = '';
        // idAnotacaoEditandoEl.value = ''; // REMOVIDO
        if (secaoAtual && secaoSelecionadaEdicaoEl.querySelector(`option[value="${secaoAtual}"]`)) {
             secaoSelecionadaEdicaoEl.value = secaoAtual; // Mantém a seção atual selecionada
        } else {
             secaoSelecionadaEdicaoEl.value = ""; // Ou limpa se não houver seção
        }
        btnSalvarEl.textContent = 'Salvar Anotação'; // Sempre será para salvar nova
        // btnCancelarEdicaoEl.style.display = 'none'; // REMOVIDO
    }

    // *** FUNÇÃO salvarAnotacao SIMPLIFICADA ***
    function salvarAnotacao() {
        const titulo = tituloAnotacaoEl.value.trim();
        const texto = textoAnotacaoEl.value.trim();
        // const idEditando = idAnotacaoEditandoEl.value; // REMOVIDO
        const secaoDestino = secaoSelecionadaEdicaoEl.value;

        if (!secaoDestino) {
             alert('Por favor, selecione a seção onde deseja salvar a anotação.');
             secaoSelecionadaEdicaoEl.focus();
             return;
        }
        if (!texto && !titulo) {
            alert('A anotação precisa ter pelo menos um título ou um conteúdo.');
            if(!titulo) tituloAnotacaoEl.focus(); else textoAnotacaoEl.focus();
            return;
        }

        // REMOVIDA a lógica de encontrar seção de origem e editar
        // if(idEditando) { ... }

        // A lógica agora é SEMPRE criar uma nova anotação
        const novaAnotacao = {
            id: gerarIdUnico(),
            titulo: titulo,
            texto: texto,
            dataCriacao: new Date().toISOString()
        };

        if (!todasAnotacoes[secaoDestino]) {
             todasAnotacoes[secaoDestino] = [];
             renderizarSecoes(); // Atualiza lista de seções se for nova
             renderizarDropdownSecoes(); // Atualiza dropdown
        }
        todasAnotacoes[secaoDestino].push(novaAnotacao);

        salvarAnotacoesNoStorage();
        // Renderiza apenas a seção onde a nota foi adicionada (se for a atual)
        if (secaoAtual === secaoDestino) {
            renderizarAnotacoesDaSecao(secaoDestino);
        }
        limparFormularioEdicao(); // Limpa o formulário após salvar
    }


    // deletarAnotacao (sem alterações)
    function deletarAnotacao(nomeSecao, idAnotacao) {
        // ... (código original sem alterações) ...
        const anotacao = todasAnotacoes[nomeSecao]?.find(a => a.id === idAnotacao);
        const tituloParaConfirmar = anotacao?.titulo ? `"${anotacao.titulo}"` : "esta anotação";
        if (confirm(`Tem certeza que deseja excluir ${tituloParaConfirmar}?`)) {
            todasAnotacoes[nomeSecao] = todasAnotacoes[nomeSecao].filter(a => a.id !== idAnotacao);
            salvarAnotacoesNoStorage();
            if(nomeSecao === secaoAtual) {
                renderizarAnotacoesDaSecao(nomeSecao); // Re-renderiza a seção atual
            }
             // Se a seção ficar vazia após deletar, pode adicionar lógica para remover a seção aqui, se desejado.
        }
    }

    // buscarAnotacoes (sem alterações)
    function buscarAnotacoes(termoBusca) {
        // ... (código original sem alterações) ...
        termoBusca = termoBusca.toLowerCase().trim();
        resultadosBuscaEl.innerHTML = '';
        if (!termoBusca) {
            resultadosBuscaEl.style.display = 'none';
            if(secaoAtual) {
                 listaAnotacoesEl.style.display = 'block';
                 renderizarAnotacoesDaSecao(secaoAtual);
            } else {
                 listaAnotacoesEl.style.display = 'none';
            }
            return;
        }
        listaAnotacoesEl.style.display = 'none';
        resultadosBuscaEl.style.display = 'block';
        let encontrouResultados = false;
        const highlightRegex = new RegExp(termoBusca.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        const highlight = (text) => text ? text.replace(highlightRegex, '<mark>$&</mark>') : '';
        Object.keys(todasAnotacoes).forEach(nomeSecao => {
            todasAnotacoes[nomeSecao].forEach(anotacao => {
                const tituloLower = anotacao.titulo?.toLowerCase() || '';
                const textoLower = anotacao.texto?.toLowerCase() || '';
                if (tituloLower.includes(termoBusca) || textoLower.includes(termoBusca)) {
                    encontrouResultados = true;
                    const divResultado = document.createElement('div');
                    divResultado.classList.add('resultado-busca');
                    divResultado.innerHTML = `
                        <small>Seção: ${nomeSecao}</small>
                        ${anotacao.titulo ? `<h4>${highlight(anotacao.titulo)}</h4>` : ''}
                        <p style="white-space: pre-wrap;">${highlight(anotacao.texto)}</p>
                        <hr>
                    `;
                    resultadosBuscaEl.appendChild(divResultado);
                }
            });
        });
        if (!encontrouResultados) {
            resultadosBuscaEl.innerHTML = '<p>Nenhuma anotação encontrada com este termo (no título ou no texto).</p>';
        }
    }

    // --- Inicialização (sem alterações) ---
    renderizarSecoes();
    renderizarDropdownSecoes();
    // Código para iniciar na seção 'Lembretes' (sem alterações)
    const secaoInicial = 'Lembretes';
     if (todasAnotacoes[secaoInicial]) {
         selecionarSecao(secaoInicial);
    } else {
        console.log(`Seção inicial '${secaoInicial}' não encontrada. Tentando a primeira disponível.`);
        const primeiraSecao = Object.keys(todasAnotacoes).sort()[0];
        if (primeiraSecao) {
             selecionarSecao(primeiraSecao);
        } else {
             console.log("Nenhuma seção encontrada para selecionar inicialmente.");
             limparFormularioEdicao(); // Garante que o form esteja limpo se não houver seções
        }
    }

    // --- Event Listeners (REMOVIDO listener do btnCancelarEdicaoEl) ---
    btnSalvarEl.addEventListener('click', salvarAnotacao);
    // btnCancelarEdicaoEl.addEventListener('click', limparFormularioEdicao); // REMOVIDO
    campoBuscaEl.addEventListener('input', (e) => buscarAnotacoes(e.target.value)); // Listener de busca corrigido/completo

}); // Fim do DOMContentLoaded
  
