        // Estado da aplicação (lista de disciplinas)
        let disciplinas = JSON.parse(localStorage.getItem('disciplinas')) || [];

        // --- Referências dos Modais ---
        const modalConfirmacaoOverlay = document.getElementById('modalConfirmacaoOverlay');
        const modalMensagemEl = document.getElementById('modalMensagem');
        const modalBotaoConfirmar = document.getElementById('modalBotaoConfirmar');
        const modalBotaoCancelar = document.getElementById('modalBotaoCancelar');
        let onConfirmCallback = null;

        const modalInputOverlay = document.getElementById('modalInputOverlay');
        const modalInputTituloEl = document.getElementById('modalInputTitulo');
        const modalInputTexto = document.getElementById('modalInputTexto');
        const modalInputErroEl = document.getElementById('modalInputErro');
        const modalInputBotaoAdicionar = document.getElementById('modalInputBotaoAdicionar');
        const modalInputBotaoCancelar = document.getElementById('modalInputBotaoCancelar');
        let currentInputHandler = null;
        let currentCancelHandler = null;
        let currentAddHandler = null;

        // --- Funções do Modal de Confirmação ---
        function mostrarModalConfirmacao(mensagem, callbackConfirmacao) {
            modalMensagemEl.innerHTML = mensagem;
            onConfirmCallback = callbackConfirmacao;
            modalConfirmacaoOverlay.classList.add('show');
        }

        function ocultarModalConfirmacao() {
            modalConfirmacaoOverlay.classList.remove('show');
            onConfirmCallback = null;
        }

        // --- Funções do Modal de Input de Tópico ---
        function mostrarModalInputTopico(indexDisciplina) {
            const disciplinaNome = disciplinas[indexDisciplina]?.nome || 'Disciplina';
            if (!disciplinas[indexDisciplina]) return;

            modalInputTituloEl.textContent = `Adicionar Tópico em "${disciplinaNome}"`;
            modalInputTexto.value = '';
            modalInputErroEl.textContent = '';
            modalInputOverlay.classList.add('show');
            modalInputTexto.focus();

            // Limpa listeners antigos antes de adicionar novos
            if (currentAddHandler) modalInputBotaoAdicionar.removeEventListener('click', currentAddHandler);
            if (currentCancelHandler) modalInputBotaoCancelar.removeEventListener('click', currentCancelHandler);
            if (currentInputHandler) modalInputTexto.removeEventListener('keydown', currentInputHandler);

            // Define as novas ações
            currentAddHandler = () => handleAdicionarTopico(indexDisciplina);
            currentCancelHandler = ocultarModalInputTopico;
            currentInputHandler = (event) => {
                 if (event.key === 'Enter') { event.preventDefault(); handleAdicionarTopico(indexDisciplina); }
                 else { modalInputErroEl.textContent = ''; }
            };

            // Adiciona novos listeners
            modalInputBotaoAdicionar.addEventListener('click', currentAddHandler);
            modalInputBotaoCancelar.addEventListener('click', currentCancelHandler);
            modalInputTexto.addEventListener('keydown', currentInputHandler);
        }

        function ocultarModalInputTopico() {
            modalInputOverlay.classList.remove('show');
            // Remove listeners ao fechar
             if (currentAddHandler) modalInputBotaoAdicionar.removeEventListener('click', currentAddHandler);
             if (currentCancelHandler) modalInputBotaoCancelar.removeEventListener('click', currentCancelHandler);
             if (currentInputHandler) modalInputTexto.removeEventListener('keydown', currentInputHandler);
             currentAddHandler = null; currentCancelHandler = null; currentInputHandler = null;
        }

        function handleAdicionarTopico(indexDisciplina) {
            const nomeTopico = modalInputTexto.value.trim();
            if (nomeTopico === "") { modalInputErroEl.textContent = "Por favor, digite um nome para o tópico."; modalInputTexto.focus(); return; }
            if (!disciplinas[indexDisciplina]) { console.error("Índice de disciplina inválido."); modalInputErroEl.textContent = "Erro interno."; return; }
            if (!disciplinas[indexDisciplina].topicos) disciplinas[indexDisciplina].topicos = [];

            disciplinas[indexDisciplina].topicos.unshift(nomeTopico);
            disciplinas[indexDisciplina].maximizado = true;
            disciplinas[indexDisciplina].excluirAtivo = false;
            localStorage.setItem('disciplinas', JSON.stringify(disciplinas));
            ocultarModalInputTopico();
            exibirDisciplinas();
        }

        // --- Listeners de Evento do Modal de Confirmação ---
        modalBotaoConfirmar.addEventListener('click', () => { if (typeof onConfirmCallback === 'function') { try { onConfirmCallback(); } catch (e) { console.error(e);}} ocultarModalConfirmacao(); });
        modalBotaoCancelar.addEventListener('click', () => { ocultarModalConfirmacao(); const idx = disciplinas.findIndex(d => d.excluirAtivo); if(idx !== -1) cancelarExclusao(idx); });
        modalConfirmacaoOverlay.addEventListener('click', (event) => { if (event.target === modalConfirmacaoOverlay) { ocultarModalConfirmacao(); const idx = disciplinas.findIndex(d => d.excluirAtivo); if(idx !== -1) cancelarExclusao(idx); } });

        // --- Funções Utilitárias e de Disciplina ---
        function removerAcentuacao(str) { return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

        function adicionarDisciplina() {
             const nomeInput = document.getElementById('nomeDisciplina'); const nome = nomeInput.value.trim(); if (nome === "") return;
             const nomeSemAcentoLower = removerAcentuacao(nome).toLowerCase();
             const nomeExiste = disciplinas.some(d => removerAcentuacao(d.nome).toLowerCase() === nomeSemAcentoLower);
             if (nomeExiste) { alert("Essa disciplina já está registrada."); nomeInput.value = ""; return; }
             disciplinas.push({ nome: nome, topicos: [], maximizado: false, excluirAtivo: false });
             localStorage.setItem('disciplinas', JSON.stringify(disciplinas)); nomeInput.value = ""; exibirDisciplinas();
        }

        function alternarVisibilidade(index) {
             if (disciplinas[index]) { disciplinas[index].maximizado = !disciplinas[index].maximizado; if (!disciplinas[index].maximizado && disciplinas[index].excluirAtivo) { disciplinas[index].excluirAtivo = false; } exibirDisciplinas(); }
             else { console.warn(`Índice inválido: ${index}`); }
        }

        function adicionarTopico(index) { // Agora apenas chama o modal
             if (!disciplinas[index]) { console.warn(`Índice inválido: ${index}`); return; }
             mostrarModalInputTopico(index);
        }

        function ativarExclusao(index) {
             if (disciplinas[index]) { disciplinas.forEach((d, i) => { d.excluirAtivo = (i === index); }); disciplinas[index].maximizado = true; exibirDisciplinas(); }
             else { console.warn(`Índice inválido: ${index}`); }
        }

        function cancelarExclusao(index) {
             if (disciplinas[index] && disciplinas[index].excluirAtivo) { disciplinas[index].excluirAtivo = false; exibirDisciplinas(); }
        }

        function pedirConfirmacaoExcluir(tipo, indexDisciplina, indexTopico = null) {
            let mensagem = ''; const disciplina = disciplinas[indexDisciplina];
            if (!disciplina) { console.error(`Erro: Disciplina índice ${indexDisciplina} não encontrada.`); return; }
            const disciplinaNome = disciplina.nome; let acaoConfirmada = () => {};

            if (tipo === 'disciplina') {
                mensagem = `Você tem certeza que deseja excluir a disciplina "<strong>${disciplinaNome}</strong>"?<br><br><strong>ATENÇÃO:</strong> Todos os tópicos associados E TODOS OS REGISTROS DE ESTUDO (tempo, questões, acertos) para esta disciplina também serão <strong>PERMANENTEMENTE excluídos</strong>.<br><br>Esta ação não pode ser desfeita.`;
                acaoConfirmada = () => {
                    console.log(`Excluindo disciplina: ${disciplinaNome}`);
                    try {
                        let sessoesEstudo = JSON.parse(localStorage.getItem('sessoesEstudo')) || [];
                        const sessoesAntes = sessoesEstudo.length;
                        const sessoesMantidas = sessoesEstudo.filter(sessao => sessao.disciplina !== disciplinaNome);
                        if (sessoesMantidas.length < sessoesAntes) { localStorage.setItem('sessoesEstudo', JSON.stringify(sessoesMantidas)); console.log(` -> ${sessoesAntes - sessoesMantidas.length} registro(s) de estudo excluído(s).`); }
                    } catch (error) { console.error("Erro ao excluir registros de estudo:", error); }
                    disciplinas.splice(indexDisciplina, 1);
                    localStorage.setItem('disciplinas', JSON.stringify(disciplinas)); exibirDisciplinas();
                };
            } else if (tipo === 'topico' && indexTopico !== null && disciplina.topicos && disciplina.topicos[indexTopico] !== undefined) {
                 const topicoNome = disciplina.topicos[indexTopico];
                 mensagem = `Tem certeza de que deseja excluir o tópico "<strong>${topicoNome}</strong>" da disciplina "<strong>${disciplinaNome}</strong>"?`;
                 acaoConfirmada = () => {
                     console.log(`Excluindo tópico "${topicoNome}" de ${disciplinaNome}`);
                     disciplina.topicos.splice(indexTopico, 1); localStorage.setItem('disciplinas', JSON.stringify(disciplinas)); exibirDisciplinas();
                 };
            } else { console.error("Parâmetros inválidos:", tipo, indexDisciplina, indexTopico); return; }

            mostrarModalConfirmacao(mensagem, acaoConfirmada);
        }

        // Função Principal para Renderizar a Lista
        function exibirDisciplinas() {
            const container = document.getElementById('disciplinasContainer'); if (!container) return;
            container.innerHTML = "";
            if (disciplinas.length === 0) { container.innerHTML = "<p style='text-align: center; color: #888;'>Nenhuma disciplina registrada ainda.</p>"; return; }

            disciplinas.forEach((disciplina, index) => {
                const bloco = document.createElement('div');
                bloco.classList.add('disciplina-bloco');
                bloco.classList.toggle('maximizado', !!disciplina.maximizado);
                bloco.classList.toggle('minimizado', !disciplina.maximizado);
                bloco.classList.toggle('excluindo', !!disciplina.excluirAtivo);

                let topicosHtml = '<p style="font-size: 0.8em; color: #999;">Nenhum tópico adicionado.</p>';
                if (disciplina.topicos && disciplina.topicos.length > 0) {
                    topicosHtml = '<ul>' + disciplina.topicos.map((topico, topicoIndex) => `<li>${topico}<span class="lixeira topico-lixeira" onclick="event.stopPropagation(); pedirConfirmacaoExcluir('topico', ${index}, ${topicoIndex})"><i class="fas fa-trash-alt"></i></span></li>`).join('') + '</ul>';
                }

                let acoesHtml = '';
                if (disciplina.maximizado) {
                    if (disciplina.excluirAtivo) {
                        acoesHtml = `<div class="confirmar-cancelar show"><button title="Confirmar Exclusão Definitiva" class="modal-button modal-confirm" onclick="event.stopPropagation(); pedirConfirmacaoExcluir('disciplina', ${index})"><i class="fas fa-check"></i> Excluir Disciplina e Dados</button><button title="Sair do Modo Exclusão" class="modal-button modal-cancel" onclick="event.stopPropagation(); cancelarExclusao(${index})"><i class="fas fa-times"></i> Concluir Edição</button></div>`;
                    } else {
                        acoesHtml = `<div class="botao-adicionar-excluir"><button title="Adicionar Tópico" class="btn-add" onclick="event.stopPropagation(); adicionarTopico(${index})"><i class="fas fa-plus"></i> Adicionar Tópico</button><button title="Ativar Exclusão" class="btn-excluir" onclick="event.stopPropagation(); ativarExclusao(${index})"><i class="fas fa-trash"></i> Excluir</button></div>`;
                    }
                }

                bloco.innerHTML = `
                    <div class="disciplina-header" onclick="alternarVisibilidade(${index})">
                         <strong>${disciplina.nome || 'Disciplina s/ Nome'}</strong>
                         <button class="btn-minimizar" title="${disciplina.maximizado ? 'Minimizar' : 'Maximizar'}">
                             <i class="fas fa-plus ${disciplina.maximizado ? 'open' : ''}"></i>
                         </button>
                    </div>
                    <div class="topicos">${topicosHtml}</div>
                    ${acoesHtml}
                `;
                container.appendChild(bloco);
            });
        }

        // --- Inicialização ---
        document.addEventListener('DOMContentLoaded', exibirDisciplinas);
