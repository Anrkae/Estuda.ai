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
let addDisciplinaForm; // Adicionado referência ao form
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
let disciplinas = []; // Array local para guardar dados lidos do Firestore (incluirá ID)
let currentUid = null; // Guarda o UID do usuário logado
let onConfirmCallback = null; // Para o modal de confirmação
// Para os listeners dos modais de input (evitar duplicação)
let currentInputHandler = null;
let currentCancelHandler = null;
let currentAddHandler = null;

// --- Funções Utilitárias ---
function removerAcentuacao(str) { return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : ""; }

// --- Funções dos Modais ---
function mostrarModalConfirmacao(mensagem, callbackConfirmacao) {
    if (!modalConfirmacaoOverlay || !modalMensagemEl) return;
    modalMensagemEl.innerHTML = mensagem;
    onConfirmCallback = callbackConfirmacao;
    modalConfirmacaoOverlay.classList.add('show');
}

function ocultarModalConfirmacao() {
    if (!modalConfirmacaoOverlay) return;
    modalConfirmacaoOverlay.classList.remove('show');
    onConfirmCallback = null;
}

function mostrarModalInputTopico(disciplinaId) {
    if (!modalInputOverlay || !modalInputTituloEl || !modalInputTexto || !modalInputErroEl) return;
    const disciplina = disciplinas.find(d => d.id === disciplinaId);
    if (!disciplina) { console.error("Disciplina não encontrada localmente para adicionar tópico:", disciplinaId); return; }

    modalInputTituloEl.textContent = `Adicionar Tópico em "${disciplina.nome}"`;
    modalInputTexto.value = '';
    modalInputErroEl.textContent = '';
    modalInputOverlay.classList.add('show');
    modalInputTexto.focus();

    // Limpa listeners antigos
    if (currentAddHandler) modalInputBotaoAdicionar.removeEventListener('click', currentAddHandler);
    if (currentCancelHandler) modalInputBotaoCancelar.removeEventListener('click', currentCancelHandler);
    if (currentInputHandler) modalInputTexto.removeEventListener('keydown', currentInputHandler);

    // Define novas ações
    currentAddHandler = () => handleAdicionarTopico(disciplinaId);
    currentCancelHandler = ocultarModalInputTopico;
    currentInputHandler = (event) => {
         if (event.key === 'Enter') { event.preventDefault(); handleAdicionarTopico(disciplinaId); }
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
     // Remove listeners
     if (currentAddHandler) modalInputBotaoAdicionar.removeEventListener('click', currentAddHandler);
     if (currentCancelHandler) modalInputBotaoCancelar.removeEventListener('click', currentCancelHandler);
     if (currentInputHandler) modalInputTexto.removeEventListener('keydown', currentInputHandler);
     currentAddHandler = null; currentCancelHandler = null; currentInputHandler = null;
}

// --- Lógica Principal de Disciplinas (com Firestore) ---

// Carrega disciplinas do Firestore e atualiza a tela
async function loadAndDisplayDisciplinas(uid) {
    if (!uid || !db || !disciplinasContainer) { // Verifica container também
        console.error("UID, DB ou Container não disponíveis para carregar disciplinas.");
        if(disciplinasContainer) disciplinasContainer.innerHTML = "<p class='error-message'>Erro ao carregar. Faça login novamente.</p>";
        return;
    }
    console.log(`Carregando disciplinas do Firestore para UID: ${uid}`);
    disciplinasContainer.innerHTML = "<p>Carregando disciplinas...</p>";

    const disciplinasColRef = collection(db, 'usuarios', uid, 'disciplinas');
    let disciplinasTemp = [];

    try {
        const querySnapshot = await getDocs(disciplinasColRef);
        querySnapshot.forEach((doc) => {
            disciplinasTemp.push({
                id: doc.id,
                nome: doc.data().nome,
                topicos: doc.data().topicos || [],
                maximizado: false, // Estado de UI, reseta ao carregar
                excluirAtivo: false // Estado de UI, reseta ao carregar
            });
        });
        disciplinasTemp.sort((a, b) => a.nome.localeCompare(b.nome));
        disciplinas = disciplinasTemp;
        exibirDisciplinas(); // Renderiza a lista atualizada
    } catch (error) {
        console.error("Erro ao buscar disciplinas do Firestore:", error);
        disciplinasContainer.innerHTML = "<p class='error-message'>Não foi possível carregar as disciplinas.</p>";
        disciplinas = [];
    }
}

// Renderiza a lista baseada no array global 'disciplinas'
function exibirDisciplinas() {
    if (!disciplinasContainer) { console.error("disciplinasContainer não definido em exibirDisciplinas"); return; }
    disciplinasContainer.innerHTML = ""; // Limpa container
    if (disciplinas.length === 0) {
        disciplinasContainer.innerHTML = "<p style='text-align: center; color: #888;'>Nenhuma disciplina registrada ainda.</p>";
        return;
    }

    disciplinas.forEach((disciplina) => {
        const bloco = document.createElement('div');
        bloco.classList.add('disciplina-bloco');
        bloco.classList.toggle('maximizado', !!disciplina.maximizado);
        bloco.classList.toggle('minimizado', !disciplina.maximizado);
        bloco.classList.toggle('excluindo', !!disciplina.excluirAtivo);
        bloco.dataset.id = disciplina.id; // Guarda o ID do Firestore

        let topicosHtml = '<p class="no-topics" style="font-size: 0.8em; color: #999; margin-left: 15px;">Nenhum tópico adicionado.</p>'; // Estilo inline para teste
        if (disciplina.topicos && disciplina.topicos.length > 0) {
            topicosHtml = '<ul style="margin-top: 5px; padding-left: 20px;">' + disciplina.topicos.map((topico) => // Removido topicoIndex
                `<li style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0;">
                   <span>${topico}</span>
                   <span class="lixeira topico-lixeira" data-disciplina-id="${disciplina.id}" data-topico="${topico}" title="Excluir Tópico" style="cursor: pointer; color: #aaa; margin-left: 10px;">
                      <i class="fas fa-trash-alt"></i>
                   </span>
                 </li>`
            ).join('') + '</ul>';
        }

        let acoesHtml = '';
        if (disciplina.maximizado) {
            if (disciplina.excluirAtivo) {
                acoesHtml = `<div class="confirmar-cancelar show" style="padding: 10px; border-top: 1px solid #eee; margin-top: 10px; display: flex; justify-content: space-around;">
                                <button title="Confirmar Exclusão" class="modal-button modal-confirm btn-confirm-delete" data-disciplina-id="${disciplina.id}" style="background-color: #d9534f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                                   <i class="fas fa-check"></i> Excluir
                                </button>
                                <button title="Cancelar Exclusão" class="modal-button modal-cancel btn-cancel-delete" data-disciplina-id="${disciplina.id}" style="background-color: #f0f0f0; color: #555; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                                   <i class="fas fa-times"></i> Cancelar
                                </button>
                             </div>`;
            } else {
                acoesHtml = `<div class="botao-adicionar-excluir" style="padding: 10px; border-top: 1px solid #eee; margin-top: 10px; display: flex; justify-content: space-around;">
                               <button title="Adicionar Tópico" class="btn-add btn-add-topic" data-disciplina-id="${disciplina.id}" style="background-color: #5cb85c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                                  <i class="fas fa-plus"></i> Tópico
                               </button>
                               <button title="Excluir Disciplina" class="btn-excluir btn-activate-delete" data-disciplina-id="${disciplina.id}" style="background-color: #f0ad4e; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                                  <i class="fas fa-trash"></i> Excluir
                               </button>
                            </div>`;
            }
        }

        // Header com dataset.id para o listener de toggle
        bloco.innerHTML = `
            <div class="disciplina-header" data-disciplina-id="${disciplina.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background-color: #eee; cursor: pointer;">
                 <strong style="flex-grow: 1;">${disciplina.nome || 'Disciplina s/ Nome'}</strong>
                 <button class="btn-minimizar" title="${disciplina.maximizado ? 'Minimizar' : 'Maximizar'}" style="background: none; border: none; font-size: 1em; cursor: pointer; padding: 5px;">
                     <i class="fas ${disciplina.maximizado ? 'fa-chevron-up' : 'fa-chevron-down'}"></i> </button>
            </div>
            <div class="topicos" style="padding: 0 10px 10px 10px; ${disciplina.maximizado ? '' : 'display: none;'}">${topicosHtml}</div>
            <div class="actions-container" style="${disciplina.maximizado ? '' : 'display: none;'}">${acoesHtml}</div>
        `;
        disciplinasContainer.appendChild(bloco); // Usa a variável correta
    });

    addDynamicListeners(); // Adiciona listeners aos elementos recém-criados
}

// Função para adicionar listeners dinamicamente (MELHOR ABORDAGEM)
function addDynamicListeners() {
    if (!disciplinasContainer) return;

    // Usar delegação de eventos no container principal é mais eficiente
    disciplinasContainer.addEventListener('click', (event) => {
        const target = event.target; // O elemento exato que foi clicado

        // Alternar Visibilidade (clique no header ou botão de toggle)
        const header = target.closest('.disciplina-header');
        if (header) {
            alternarVisibilidade(header.dataset.disciplinaId);
            return; // Impede que outros listeners abaixo sejam acionados sem necessidade
        }

        // Adicionar Tópico
        const addTopicBtn = target.closest('.btn-add-topic');
        if (addTopicBtn) {
            event.stopPropagation();
            mostrarModalInputTopico(addTopicBtn.dataset.disciplinaId);
            return;
        }

        // Ativar Exclusão Disciplina
        const activateDeleteBtn = target.closest('.btn-activate-delete');
        if (activateDeleteBtn) {
             event.stopPropagation();
            ativarExclusao(activateDeleteBtn.dataset.disciplinaId);
            return;
        }

        // Confirmar Exclusão Disciplina
        const confirmDeleteBtn = target.closest('.btn-confirm-delete');
        if (confirmDeleteBtn) {
            event.stopPropagation();
            pedirConfirmacaoExcluir('disciplina', confirmDeleteBtn.dataset.disciplinaId);
            return;
        }

        // Cancelar Exclusão Disciplina
        const cancelDeleteBtn = target.closest('.btn-cancel-delete');
        if (cancelDeleteBtn) {
            event.stopPropagation();
            cancelarExclusao(cancelDeleteBtn.dataset.disciplinaId);
            return;
        }

        // Excluir Tópico
        const deleteTopicSpan = target.closest('.topico-lixeira');
        if (deleteTopicSpan) {
            event.stopPropagation();
            pedirConfirmacaoExcluir('topico', deleteTopicSpan.dataset.disciplinaId, deleteTopicSpan.dataset.topico);
            return;
        }
    });
}

// Adiciona disciplina no Firestore
async function adicionarDisciplina() { // Não precisa anexar à window se o listener está no form
    if (!currentUid || !db || !nomeDisciplinaInput) return;
    const nome = nomeDisciplinaInput.value.trim();
    if (addDisciplinaStatus) addDisciplinaStatus.textContent = '';

    if (nome === "") { if (addDisciplinaStatus) addDisciplinaStatus.textContent = 'Digite um nome.'; return; }
    const nomeSemAcentoLower = removerAcentuacao(nome).toLowerCase();
    const nomeExiste = disciplinas.some(d => removerAcentuacao(d.nome).toLowerCase() === nomeSemAcentoLower);
    if (nomeExiste) { if (addDisciplinaStatus) addDisciplinaStatus.textContent = 'Essa disciplina já existe.'; nomeDisciplinaInput.value = ""; return; }

    addDisciplinaStatus.textContent = 'Adicionando...'; // Feedback
    try {
        const disciplinasColRef = collection(db, 'usuarios', currentUid, 'disciplinas');
        const docRef = await addDoc(disciplinasColRef, { nome: nome, topicos: [] });
        console.log("Disciplina adicionada com ID: ", docRef.id);
        nomeDisciplinaInput.value = "";
        if (addDisciplinaStatus) addDisciplinaStatus.textContent = '';
        await loadAndDisplayDisciplinas(currentUid); // Recarrega e exibe
    } catch (error) {
        console.error("Erro ao adicionar disciplina no Firestore: ", error);
        if (addDisciplinaStatus) addDisciplinaStatus.textContent = 'Erro ao salvar.';
    }
}

// Alterna visibilidade (UI local)
function alternarVisibilidade(disciplinaId) {
    const index = disciplinas.findIndex(d => d.id === disciplinaId);
    if (index !== -1) {
        disciplinas[index].maximizado = !disciplinas[index].maximizado;
        if (!disciplinas[index].maximizado && disciplinas[index].excluirAtivo) {
            disciplinas[index].excluirAtivo = false;
        }
        exibirDisciplinas(); // Re-renderiza com estado atualizado
    }
}

// Ativa modo de exclusão (UI local)
function ativarExclusao(disciplinaId) {
    disciplinas.forEach(d => { d.excluirAtivo = (d.id === disciplinaId); });
    const index = disciplinas.findIndex(d => d.id === disciplinaId);
    if (index !== -1) {
        disciplinas[index].maximizado = true;
        exibirDisciplinas();
    }
}

// Cancela modo de exclusão (UI local)
function cancelarExclusao(disciplinaId) {
    const index = disciplinas.findIndex(d => d.id === disciplinaId);
    if (index !== -1 && disciplinas[index].excluirAtivo) {
        disciplinas[index].excluirAtivo = false;
        exibirDisciplinas();
    }
}

// Pede confirmação para excluir (Prepara callback para Firestore)
function pedirConfirmacaoExcluir(tipo, disciplinaId, topicoValue = null) {
    if (!currentUid || !db) { console.error("Usuário/DB não disponível"); return; }
    const disciplina = disciplinas.find(d => d.id === disciplinaId);
    if (!disciplina) { console.error(`Erro: Disciplina ID ${disciplinaId} não encontrada.`); return; }

    let mensagem = '';
    let acaoConfirmada = async () => {};

    if (tipo === 'disciplina') {
        mensagem = `Excluir disciplina "<strong>${disciplina.nome}</strong>"?<br>(Tópicos e histórico associado no localStorage serão removidos). Ação irreversível.`;
        acaoConfirmada = async () => {
            console.log(`Excluindo disciplina ID: ${disciplinaId}`);
            try {
                await deleteDoc(doc(db, 'usuarios', currentUid, 'disciplinas', disciplinaId));
                console.log("Disciplina excluída do Firestore.");
                // Limpa localStorage associado (manter?)
                try { /* ... seu código para limpar sessoesEstudo ... */ } catch(e){}
                await loadAndDisplayDisciplinas(currentUid);
            } catch (error) { console.error("Erro ao excluir disciplina:", error); alert("Erro ao excluir."); }
        };
    } else if (tipo === 'topico' && topicoValue !== null) {
        mensagem = `Excluir tópico "<strong>${topicoValue}</strong>" de "<strong>${disciplina.nome}</strong>"?`;
        acaoConfirmada = async () => {
            console.log(`Excluindo tópico "${topicoValue}" da disciplina ID: ${disciplinaId}`);
            try {
                const disciplinaRef = doc(db, 'usuarios', currentUid, 'disciplinas', disciplinaId);
                await updateDoc(disciplinaRef, { topicos: arrayRemove(topicoValue) });
                console.log("Tópico removido do Firestore.");
                await loadAndDisplayDisciplinas(currentUid);
            } catch (error) { console.error("Erro ao remover tópico:", error); alert("Erro ao excluir tópico."); }
        };
    } else { return; }
    mostrarModalConfirmacao(mensagem, acaoConfirmada);
}

// Adiciona Tópico no Firestore
async function handleAdicionarTopico(disciplinaId) {
    if (!currentUid || !db) return;
    const nomeTopico = modalInputTexto.value.trim();
    if (nomeTopico === "") { modalInputErroEl.textContent = "Digite um nome."; modalInputTexto.focus(); return; }
    const disciplinaRef = doc(db, 'usuarios', currentUid, 'disciplinas', disciplinaId);
    console.log(`Adicionando tópico "${nomeTopico}" para disciplina ID: ${disciplinaId}`);
    modalInputErroEl.textContent = 'Adicionando...'; // Feedback
    try {
        await updateDoc(disciplinaRef, { topicos: arrayUnion(nomeTopico) });
        console.log("Tópico adicionado.");
        ocultarModalInputTopico();
        await loadAndDisplayDisciplinas(currentUid);
    } catch (error) { console.error("Erro ao adicionar tópico:", error); modalInputErroEl.textContent = "Erro ao salvar."; }
}

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Disciplinas.js: DOMContentLoaded");

    // Pega referências do DOM
    nomeDisciplinaInput = document.getElementById('nomeDisciplina');
    disciplinasContainer = document.getElementById('disciplinasContainer');
    addDisciplinaStatus = document.getElementById('add-disciplina-status');
    addDisciplinaForm = document.getElementById('add-disciplina-form'); // Pega o form
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

    // --- Configura Listeners ---
    // Listener para o formulário de adicionar disciplina
    if(addDisciplinaForm) {
        addDisciplinaForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Previne recarregamento da página
            adicionarDisciplina(); // Chama a função async
        });
    } else {
        console.error("Elemento #add-disciplina-form não encontrado!");
    }

    // Listeners dos modais (confirmação e input - botões principais)
    if (modalBotaoConfirmar) modalBotaoConfirmar.addEventListener('click', () => { if (typeof onConfirmCallback === 'function') { try { onConfirmCallback(); } catch (e) { console.error(e);}} ocultarModalConfirmacao(); });
    if (modalBotaoCancelar) modalBotaoCancelar.addEventListener('click', ocultarModalConfirmacao);
    if (modalConfirmacaoOverlay) modalConfirmacaoOverlay.addEventListener('click', (event) => { if (event.target === modalConfirmacaoOverlay) { ocultarModalConfirmacao(); } });
    if (modalInputOverlay) modalInputOverlay.addEventListener('click', (event) => { if (event.target === modalInputOverlay) { ocultarModalInputTopico(); } });
    // Listeners internos do modal de input (Adicionar/Cancelar/Enter) são gerenciados em mostrar/ocultar


    // --- Verifica Autenticação e Carrega Dados Iniciais ---
    if (auth) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("Usuário autenticado:", user.uid);
                currentUid = user.uid;
                loadAndDisplayDisciplinas(currentUid); // Carrega as disciplinas
            } else {
                console.log("Nenhum usuário logado. Redirecionando para login.");
                currentUid = null;
                disciplinas = [];
                if(disciplinasContainer) disciplinasContainer.innerHTML = "<p>Você precisa estar logado. Redirecionando...</p>";
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            }
        });
    } else {
         console.error("Firebase Auth não inicializado!");
         if(disciplinasContainer) disciplinasContainer.innerHTML = "<p class='error-message'>Erro ao inicializar autenticação.</p>";
    }

    // Adiciona info de contexto
    const now = new Date();
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Fortaleza' });
    console.log(`Script disciplinas.js executado em ${dateFormatter.format(now)}, Juazeiro do Norte - CE.`);

});
