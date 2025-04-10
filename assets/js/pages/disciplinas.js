// assets/js/pages/disciplinas.js

// Importa TUDO que precisamos do Firebase
import {
    auth, db, onAuthStateChanged,
    collection, getDocs, addDoc, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove
} from '/Firebase.js'; // Ajuste o caminho se /Firebase.js não estiver na raiz

// --- Referências do DOM (pegas dentro do DOMContentLoaded) ---
let nomeDisciplinaInput;
let disciplinasContainer;
let addDisciplinaStatus;
// Modais
let modalConfirmacaoOverlay;
let modalMensagemEl;
let modalBotaoConfirmar;
let modalBotaoCancelar;
let modalInputOverlay;
let modalInputTituloEl;
let modalInputTexto;
let modalInputErroEl;
let modalInputBotaoAdicionar;
let modalInputBotaoCancelar;

// --- Estado da Aplicação ---
let disciplinas = []; // Array local para guardar dados lidos do Firestore
let currentUid = null; // Guarda o UID do usuário logado
let onConfirmCallback = null; // Para o modal de confirmação
// Para os listeners dos modais de input (evitar duplicação)
let currentInputHandler = null;
let currentCancelHandler = null;
let currentAddHandler = null;

// --- Funções Utilitárias ---
function removerAcentuacao(str) { return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

// --- Funções dos Modais ---
function mostrarModalConfirmacao(mensagem, callbackConfirmacao) {
    if (!modalConfirmacaoOverlay || !modalMensagemEl) return;
    modalMensagemEl.innerHTML = mensagem; // Usa innerHTML para permitir tags como <strong>
    onConfirmCallback = callbackConfirmacao;
    modalConfirmacaoOverlay.classList.add('show');
}

function ocultarModalConfirmacao() {
    if (!modalConfirmacaoOverlay) return;
    modalConfirmacaoOverlay.classList.remove('show');
    onConfirmCallback = null; // Limpa callback ao fechar
}

function mostrarModalInputTopico(disciplinaId) { // Recebe ID do Firestore
    if (!modalInputOverlay || !modalInputTituloEl || !modalInputTexto || !modalInputErroEl) return;
    const disciplina = disciplinas.find(d => d.id === disciplinaId); // Encontra a disciplina no array local
    if (!disciplina) { console.error("Disciplina não encontrada localmente para adicionar tópico:", disciplinaId); return; }

    modalInputTituloEl.textContent = `Adicionar Tópico em "${disciplina.nome}"`;
    modalInputTexto.value = '';
    modalInputErroEl.textContent = '';
    modalInputOverlay.classList.add('show');
    modalInputTexto.focus();

    // Limpa listeners antigos antes de adicionar novos
    if (currentAddHandler) modalInputBotaoAdicionar.removeEventListener('click', currentAddHandler);
    if (currentCancelHandler) modalInputBotaoCancelar.removeEventListener('click', currentCancelHandler);
    if (currentInputHandler) modalInputTexto.removeEventListener('keydown', currentInputHandler);

    // Define as novas ações passando o ID da disciplina
    currentAddHandler = () => handleAdicionarTopico(disciplinaId); // Passa ID
    currentCancelHandler = ocultarModalInputTopico;
    currentInputHandler = (event) => {
         if (event.key === 'Enter') { event.preventDefault(); handleAdicionarTopico(disciplinaId); } // Passa ID
         else { modalInputErroEl.textContent = ''; }
    };

    // Adiciona novos listeners
    modalInputBotaoAdicionar.addEventListener('click', currentAddHandler);
    modalInputBotaoCancelar.addEventListener('click', currentCancelHandler);
    modalInputTexto.addEventListener('keydown', currentInputHandler);
}

function ocultarModalInputTopico() {
    if (!modalInputOverlay) return;
    modalInputOverlay.classList.remove('show');
    // Remove listeners ao fechar
     if (currentAddHandler) modalInputBotaoAdicionar.removeEventListener('click', currentAddHandler);
     if (currentCancelHandler) modalInputBotaoCancelar.removeEventListener('click', currentCancelHandler);
     if (currentInputHandler) modalInputTexto.removeEventListener('keydown', currentInputHandler);
     currentAddHandler = null; currentCancelHandler = null; currentInputHandler = null;
}

// --- Lógica Principal de Disciplinas (com Firestore) ---

// Carrega disciplinas do Firestore e atualiza a tela
async function loadAndDisplayDisciplinas(uid) {
    if (!uid || !db) {
        console.error("UID ou DB não disponíveis para carregar disciplinas.");
        disciplinasContainer.innerHTML = "<p class='error-message'>Erro ao carregar. Faça login novamente.</p>";
        return;
    }
    console.log(`Carregando disciplinas do Firestore para UID: ${uid}`);
    disciplinasContainer.innerHTML = "<p>Carregando disciplinas...</p>"; // Feedback visual

    const disciplinasColRef = collection(db, 'usuarios', uid, 'disciplinas');
    let disciplinasTemp = []; // Array temporário para construir a lista

    try {
        const querySnapshot = await getDocs(disciplinasColRef);
        querySnapshot.forEach((doc) => {
            // Adiciona a disciplina ao array temporário, incluindo o ID do documento Firestore
            disciplinasTemp.push({
                id: doc.id, // <<< GUARDA O ID DO DOCUMENTO
                nome: doc.data().nome,
                topicos: doc.data().topicos || [], // Garante que tópicos seja um array
                // maximizado e excluirAtivo são estados de UI, não precisam vir do DB
                maximizado: false,
                excluirAtivo: false
            });
        });

        // Ordena alfabeticamente (opcional)
        disciplinasTemp.sort((a, b) => a.nome.localeCompare(b.nome));

        disciplinas = disciplinasTemp; // Atualiza o array global
        exibirDisciplinas(); // Renderiza a lista atualizada

    } catch (error) {
        console.error("Erro ao buscar disciplinas do Firestore:", error);
        disciplinasContainer.innerHTML = "<p class='error-message'>Não foi possível carregar as disciplinas.</p>";
        disciplinas = []; // Limpa array local em caso de erro
    }
}

// Renderiza a lista baseada no array global 'disciplinas' (que agora tem IDs do Firestore)
function exibirDisciplinas() {
    if (!disciplinasContainer) return;
    disciplinasContainer.innerHTML = ""; // Limpa container
    if (disciplinas.length === 0) {
        disciplinasContainer.innerHTML = "<p style='text-align: center; color: #888;'>Nenhuma disciplina registrada ainda.</p>";
        return;
    }

    disciplinas.forEach((disciplina) => { // Não precisamos mais do 'index' aqui
        const bloco = document.createElement('div');
        bloco.classList.add('disciplina-bloco');
        // Controla classes de UI baseado no estado local do objeto (não persistido)
        bloco.classList.toggle('maximizado', !!disciplina.maximizado);
        bloco.classList.toggle('minimizado', !disciplina.maximizado);
        bloco.classList.toggle('excluindo', !!disciplina.excluirAtivo);
        bloco.dataset.id = disciplina.id; // Guarda o ID do Firestore no elemento

        let topicosHtml = '<p class="no-topics">Nenhum tópico adicionado.</p>';
        if (disciplina.topicos && disciplina.topicos.length > 0) {
            topicosHtml = '<ul>' + disciplina.topicos.map((topico, topicoIndex) =>
                `<li>
                   ${topico}
                   <span class="lixeira topico-lixeira" data-disciplina-id="${disciplina.id}" data-topico="${topico}" title="Excluir Tópico">
                      <i class="fas fa-trash-alt"></i>
                   </span>
                 </li>`
            ).join('') + '</ul>';
        }

        let acoesHtml = '';
        if (disciplina.maximizado) {
            if (disciplina.excluirAtivo) {
                // Passa o ID do Firestore para as funções de confirmação/cancelamento
                acoesHtml = `<div class="confirmar-cancelar show">
                                <button title="Confirmar Exclusão Definitiva" class="modal-button modal-confirm btn-confirm-delete" data-disciplina-id="${disciplina.id}">
                                   <i class="fas fa-check"></i> Excluir Disciplina e Dados
                                </button>
                                <button title="Sair do Modo Exclusão" class="modal-button modal-cancel btn-cancel-delete" data-disciplina-id="${disciplina.id}">
                                   <i class="fas fa-times"></i> Concluir Edição
                                </button>
                             </div>`;
            } else {
                // Passa o ID do Firestore para adicionar tópico e ativar exclusão
                acoesHtml = `<div class="botao-adicionar-excluir">
                               <button title="Adicionar Tópico" class="btn-add btn-add-topic" data-disciplina-id="${disciplina.id}">
                                  <i class="fas fa-plus"></i> Adicionar Tópico
                               </button>
                               <button title="Ativar Exclusão" class="btn-excluir btn-activate-delete" data-disciplina-id="${disciplina.id}">
                                  <i class="fas fa-trash"></i> Excluir
                               </button>
                            </div>`;
            }
        }

        bloco.innerHTML = `
            <div class="disciplina-header" data-disciplina-id="${disciplina.id}">
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

    // Adiciona listeners DEPOIS que os elementos estão no DOM
    addDynamicListeners();
}

// Função para adicionar listeners aos botões criados dinamicamente
function addDynamicListeners() {
    // Listener para expandir/minimizar
    document.querySelectorAll('.disciplina-header').forEach(header => {
        // Remove listener antigo para evitar duplicação (se houver re-render sem limpar)
        header.replaceWith(header.cloneNode(true)); // Clona para remover listeners antigos
        document.getElementById(header.id || header.closest('.disciplina-bloco').dataset.id).querySelector('.disciplina-header') // Pega o novo elemento clonado
        .addEventListener('click', (e) => {
             // Verifica se o clique foi no botão de minimizar/maximizar ou no próprio header
             if (e.target.closest('.btn-minimizar')) {
                  alternarVisibilidade(e.currentTarget.dataset.disciplinaId);
             } else {
                  // Se clicou no header (fora do botão), também alterna
                  alternarVisibilidade(e.currentTarget.dataset.disciplinaId);
             }
        });
    });

    // Listener para adicionar tópico
    document.querySelectorAll('.btn-add-topic').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
        document.querySelector(`[data-disciplina-id="${btn.dataset.disciplinaId}"].btn-add-topic`)
        .addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarModalInputTopico(e.currentTarget.dataset.disciplinaId);
        });
    });

    // Listener para ativar exclusão de disciplina
    document.querySelectorAll('.btn-activate-delete').forEach(btn => {
         btn.replaceWith(btn.cloneNode(true));
         document.querySelector(`[data-disciplina-id="${btn.dataset.disciplinaId}"].btn-activate-delete`)
        .addEventListener('click', (e) => {
            e.stopPropagation();
            ativarExclusao(e.currentTarget.dataset.disciplinaId);
        });
    });

     // Listener para confirmar exclusão de disciplina
     document.querySelectorAll('.btn-confirm-delete').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
        document.querySelector(`[data-disciplina-id="${btn.dataset.disciplinaId}"].btn-confirm-delete`)
        .addEventListener('click', (e) => {
             e.stopPropagation();
             pedirConfirmacaoExcluir('disciplina', e.currentTarget.dataset.disciplinaId);
         });
     });

    // Listener para cancelar exclusão de disciplina
    document.querySelectorAll('.btn-cancel-delete').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
        document.querySelector(`[data-disciplina-id="${btn.dataset.disciplinaId}"].btn-cancel-delete`)
        .addEventListener('click', (e) => {
             e.stopPropagation();
             cancelarExclusao(e.currentTarget.dataset.disciplinaId);
         });
     });

     // Listener para excluir tópico
     document.querySelectorAll('.topico-lixeira').forEach(span => {
        span.replaceWith(span.cloneNode(true));
        document.querySelector(`[data-disciplina-id="${span.dataset.disciplinaId}"][data-topico="${span.dataset.topico}"].topico-lixeira`)
        .addEventListener('click', (e) => {
             e.stopPropagation();
             pedirConfirmacaoExcluir('topico', e.currentTarget.dataset.disciplinaId, e.currentTarget.dataset.topico);
         });
     });
}

// Adiciona disciplina no Firestore
window.adicionarDisciplina = async function() { // Torna async e anexa à window
    if (!currentUid || !db) { console.error("Usuário não logado ou DB não pronto."); return; }
    const nome = nomeDisciplinaInput.value.trim();
    if (addDisciplinaStatus) addDisciplinaStatus.textContent = ''; // Limpa status

    if (nome === "") {
        if (addDisciplinaStatus) addDisciplinaStatus.textContent = 'Digite um nome.';
        return;
    }
    const nomeSemAcentoLower = removerAcentuacao(nome).toLowerCase();
    // Verifica duplicidade no array local (já carregado do Firestore)
    const nomeExiste = disciplinas.some(d => removerAcentuacao(d.nome).toLowerCase() === nomeSemAcentoLower);
    if (nomeExiste) {
        if (addDisciplinaStatus) addDisciplinaStatus.textContent = 'Essa disciplina já existe.';
        nomeDisciplinaInput.value = "";
        return;
    }

    try {
        // Adiciona ao Firestore
        const disciplinasColRef = collection(db, 'usuarios', currentUid, 'disciplinas');
        const docRef = await addDoc(disciplinasColRef, {
            nome: nome,
            topicos: [] // Começa com array de tópicos vazio
        });
        console.log("Disciplina adicionada com ID: ", docRef.id);
        nomeDisciplinaInput.value = ""; // Limpa input
        // Recarrega a lista do Firestore para exibir a nova disciplina com seu ID correto
        await loadAndDisplayDisciplinas(currentUid);

    } catch (error) {
        console.error("Erro ao adicionar disciplina no Firestore: ", error);
        if (addDisciplinaStatus) addDisciplinaStatus.textContent = 'Erro ao salvar disciplina.';
    }
}

// Alterna visibilidade (lógica local, não persiste)
window.alternarVisibilidade = function(disciplinaId) { // Anexa à window
    const index = disciplinas.findIndex(d => d.id === disciplinaId);
    if (index !== -1) {
        disciplinas[index].maximizado = !disciplinas[index].maximizado;
        if (!disciplinas[index].maximizado && disciplinas[index].excluirAtivo) {
            disciplinas[index].excluirAtivo = false; // Cancela exclusão se minimizar
        }
        exibirDisciplinas(); // Re-renderiza para refletir a mudança visual
    } else {
        console.warn(`Disciplina com ID ${disciplinaId} não encontrada localmente.`);
    }
}

// Ativa modo de exclusão (lógica local, não persiste)
window.ativarExclusao = function(disciplinaId) { // Anexa à window
    disciplinas.forEach(d => { d.excluirAtivo = (d.id === disciplinaId); });
    const index = disciplinas.findIndex(d => d.id === disciplinaId);
    if (index !== -1) {
        disciplinas[index].maximizado = true; // Força maximizar ao ativar exclusão
        exibirDisciplinas();
    } else {
         console.warn(`Disciplina com ID ${disciplinaId} não encontrada localmente.`);
    }
}

// Cancela modo de exclusão (lógica local, não persiste)
window.cancelarExclusao = function(disciplinaId) { // Anexa à window
    const index = disciplinas.findIndex(d => d.id === disciplinaId);
    if (index !== -1 && disciplinas[index].excluirAtivo) {
        disciplinas[index].excluirAtivo = false;
        exibirDisciplinas();
    }
}

// Pede confirmação para excluir disciplina ou tópico
// Agora recebe ID da disciplina e valor do tópico (se for exclusão de tópico)
window.pedirConfirmacaoExcluir = function(tipo, disciplinaId, topicoValue = null) { // Anexa à window
    if (!currentUid || !db) { console.error("Usuário/DB não disponível para exclusão"); return; }

    const disciplina = disciplinas.find(d => d.id === disciplinaId);
    if (!disciplina) { console.error(`Erro: Disciplina ID ${disciplinaId} não encontrada localmente.`); return; }
    const disciplinaNome = disciplina.nome;
    let mensagem = '';
    let acaoConfirmada = async () => {}; // Torna async

    if (tipo === 'disciplina') {
        mensagem = `Tem certeza que deseja excluir a disciplina "<strong>${disciplinaNome}</strong>"?<br><br><strong>ATENÇÃO:</strong> Todos os tópicos E REGISTROS DE ESTUDO associados serão <strong>PERMANENTEMENTE excluídos</strong>.<br><br>Ação irreversível.`;
        acaoConfirmada = async () => {
            console.log(`Excluindo disciplina: ${disciplinaNome} (ID: ${disciplinaId})`);
            try {
                // Exclui do Firestore
                await deleteDoc(doc(db, 'usuarios', currentUid, 'disciplinas', disciplinaId));
                console.log("Disciplina excluída do Firestore.");

                // Exclui sessões de estudo associadas do localStorage (manter por enquanto)
                try {
                    let sessoesEstudo = JSON.parse(localStorage.getItem('sessoesEstudo')) || [];
                    const sessoesAntes = sessoesEstudo.length;
                    // IMPORTANTE: Se o nome da disciplina no log de estudo for diferente do nome atual,
                    // esta lógica pode falhar. Idealmente, sessoesEstudo deveria referenciar o ID da disciplina.
                    const sessoesMantidas = sessoesEstudo.filter(sessao => sessao.disciplina !== disciplinaNome);
                    if (sessoesMantidas.length < sessoesAntes) {
                         localStorage.setItem('sessoesEstudo', JSON.stringify(sessoesMantidas));
                         console.log(` -> ${sessoesAntes - sessoesMantidas.length} registro(s) de estudo local excluído(s).`);
                    }
                } catch (error) { console.error("Erro ao excluir registros de estudo locais:", error); }

                // Recarrega a lista da tela
                await loadAndDisplayDisciplinas(currentUid);
            } catch (error) {
                 console.error("Erro ao excluir disciplina do Firestore:", error);
                 alert("Erro ao excluir disciplina. Tente novamente."); // Feedback para usuário
            }
        };
    } else if (tipo === 'topico' && topicoValue !== null) {
        mensagem = `Tem certeza de que deseja excluir o tópico "<strong>${topicoValue}</strong>" da disciplina "<strong>${disciplinaNome}</strong>"?`;
        acaoConfirmada = async () => {
            console.log(`Excluindo tópico "${topicoValue}" de ${disciplinaNome} (ID: ${disciplinaId})`);
            try {
                // Remove o tópico do array no Firestore
                const disciplinaRef = doc(db, 'usuarios', currentUid, 'disciplinas', disciplinaId);
                await updateDoc(disciplinaRef, {
                    topicos: arrayRemove(topicoValue) // Função do Firestore para remover item de array
                });
                console.log("Tópico removido do Firestore.");
                 // Recarrega a lista da tela
                 await loadAndDisplayDisciplinas(currentUid);
            } catch (error) {
                 console.error("Erro ao remover tópico do Firestore:", error);
                 alert("Erro ao excluir tópico. Tente novamente."); // Feedback para usuário
            }
        };
    } else {
        console.error("Parâmetros inválidos para pedirConfirmacaoExcluir:", tipo, disciplinaId, topicoValue);
        return;
    }

    mostrarModalConfirmacao(mensagem, acaoConfirmada);
}

// Adiciona Tópico no Firestore
async function handleAdicionarTopico(disciplinaId) { // Recebe ID
    if (!currentUid || !db) { console.error("Usuário/DB não disponível"); return; }
    const nomeTopico = modalInputTexto.value.trim();
    if (nomeTopico === "") { modalInputErroEl.textContent = "Digite um nome para o tópico."; modalInputTexto.focus(); return; }

    const disciplinaRef = doc(db, 'usuarios', currentUid, 'disciplinas', disciplinaId);
    console.log(`Adicionando tópico "${nomeTopico}" para disciplina ID: ${disciplinaId}`);
    try {
        // Adiciona o tópico ao array 'topicos' no Firestore
        await updateDoc(disciplinaRef, {
             topicos: arrayUnion(nomeTopico) // Função do Firestore para adicionar item a array (evita duplicados)
        });
        console.log("Tópico adicionado no Firestore.");
        ocultarModalInputTopico();
        await loadAndDisplayDisciplinas(currentUid); // Recarrega a lista

    } catch (error) {
         console.error("Erro ao adicionar tópico no Firestore:", error);
         modalInputErroEl.textContent = "Erro ao salvar. Tente novamente.";
    }
}


// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Disciplinas.js: DOMContentLoaded");

    // Pega referências do DOM aqui, depois que o DOM está pronto
    nomeDisciplinaInput = document.getElementById('nomeDisciplina');
    disciplinasContainer = document.getElementById('disciplinasContainer');
    addDisciplinaStatus = document.getElementById('add-disciplina-status');
    modalConfirmacaoOverlay = document.getElementById('modalConfirmacaoOverlay');
    modalMensagemEl = document.getElementById('modalMensagem');
    modalBotaoConfirmar = document.getElementById('modalBotaoConfirmar');
    modalBotaoCancelar = document.getElementById('modalBotaoCancelar');
    modalInputOverlay = document.getElementById('modalInputOverlay');
    modalInputTituloEl = document.getElementById('modalInputTitulo');
    modalInputTexto = document.getElementById('modalInputTexto');
    modalInputErroEl = document.getElementById('modalInputErro');
    modalInputBotaoAdicionar = document.getElementById('modalInputBotaoAdicionar');
    modalInputBotaoCancelar = document.getElementById('modalInputBotaoCancelar');

    // --- Configura Listeners dos Modais (que não são dinâmicos) ---
     if (modalBotaoConfirmar) modalBotaoConfirmar.addEventListener('click', () => { if (typeof onConfirmCallback === 'function') { try { onConfirmCallback(); } catch (e) { console.error(e);}} ocultarModalConfirmacao(); });
     if (modalBotaoCancelar) modalBotaoCancelar.addEventListener('click', ocultarModalConfirmacao); // Simplificado, cancelamento de exclusão é tratado no onlick agora
     if (modalConfirmacaoOverlay) modalConfirmacaoOverlay.addEventListener('click', (event) => { if (event.target === modalConfirmacaoOverlay) { ocultarModalConfirmacao(); } });
     // Listeners do modal de input são adicionados/removidos dinamicamente em mostrar/ocultar

    // --- Verifica Autenticação e Carrega Dados ---
    if (auth) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("Usuário autenticado:", user.uid);
                currentUid = user.uid; // Guarda o UID globalmente
                loadAndDisplayDisciplinas(currentUid); // Carrega as disciplinas do Firestore
            } else {
                console.log("Nenhum usuário logado. Redirecionando para login.");
                currentUid = null;
                disciplinas = []; // Limpa disciplinas locais
                disciplinasContainer.innerHTML = "<p>Você precisa estar logado para ver suas disciplinas. Redirecionando...</p>";
                // Redireciona para login se não estiver autenticado
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            }
        });
    } else {
         console.error("Firebase Auth não inicializado!");
         disciplinasContainer.innerHTML = "<p class='error-message'>Erro ao inicializar sistema de autenticação.</p>";
    }

    // Adiciona info de contexto
    const now = new Date();
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Fortaleza' });
    console.log(`Script disciplinas.js executado em ${dateFormatter.format(now)}, Juazeiro do Norte - CE.`);

});
