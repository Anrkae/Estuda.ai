document.addEventListener('DOMContentLoaded', () => {
    // --- SETUP INICIAL ---
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    // --- ELEMENTOS DO DOM ---
    const views = {
        explorer: $('#explorer-view'),
        resumoView: $('#resumo-view'),
        resumoEdit: $('#resumo-edit-view'),
        deck: $('#deck-view')
    };
    const modals = {
        choice: $('#add-choice-modal'),
        create: $('#create-item-modal'),
        ai: $('#ai-generate-modal'),
        editCard: $('#edit-card-modal'),
        loading: $('#loading-modal')
    };
    const addFab = $('#add-fab');
    const tabResumosBtn = $('#tab-resumos');
    const tabFlashcardsBtn = $('#tab-flashcards');
    const itemListContainer = $('#item-list');
    const breadcrumbsContainer = $('#breadcrumbs');
    
    // --- ESTADO DA APLICAÇÃO ---
    let state = {
        currentView: 'explorer',
        currentTab: 'resumos',
        currentFolderId: null,
        editingResumoId: null,
        viewingDeckId: null,
        editingCardId: null,
        folders: [],
        resumos: [],
        flashcardDecks: [],
        modal: { createType: null, aiType: null }
    };

    // --- FUNÇÕES DE DADOS ---
    const loadData = () => {
        state.folders = JSON.parse(localStorage.getItem('estuda_ai_folders')) || [];
        state.resumos = JSON.parse(localStorage.getItem('estuda_ai_resumos')) || [];
        state.flashcardDecks = JSON.parse(localStorage.getItem('estuda_ai_flashcardDecks')) || [];
    };
    const saveData = () => {
        localStorage.setItem('estuda_ai_folders', JSON.stringify(state.folders));
        localStorage.setItem('estuda_ai_resumos', JSON.stringify(state.resumos));
        localStorage.setItem('estuda_ai_flashcardDecks', JSON.stringify(state.flashcardDecks));
    };

    // --- CONTROLE DE VISUALIZAÇÃO ---
    const showView = (viewName) => {
        state.currentView = viewName;
        Object.values(views).forEach(v => v.classList.add('hidden'));
        views[viewName].classList.remove('hidden');
        addFab.classList.toggle('hidden', viewName !== 'explorer');
    };

    const showExplorerView = () => {
        state.editingResumoId = null;
        state.viewingDeckId = null;
        showView('explorer');
        render();
    };
    
    const showResumoReaderView = (resumoId) => {
        const resumo = state.resumos.find(r => r.id === resumoId);
        if (!resumo) return;
        $('#resumo-view-title').textContent = resumo.titulo;
        $('#resumo-view-content').innerHTML = marked.parse(resumo.conteudo);
        showView('resumoView');
    };
    
    const showResumoEditView = (resumoId) => {
        const resumo = state.resumos.find(r => r.id === resumoId);
        if (!resumo) return;
        state.editingResumoId = resumoId;
        $('#resumo-edit-title').value = resumo.titulo;
        $('#resumo-textarea').value = resumo.conteudo;
        showView('resumoEdit');
    };

    const showDeckView = (deckId) => {
        const deck = state.flashcardDecks.find(d => d.id === deckId);
        if (!deck) return;
        state.viewingDeckId = deckId;
        $('#deck-title').textContent = deck.nome;
        renderCardList(deck.cards);
        showView('deck');
    };
    
    // --- LÓGICA DOS MODAIS ---
    const openModal = (modalName) => modals[modalName].classList.remove('hidden');
    const closeModal = (modalName) => modals[modalName].classList.add('hidden');

    const openChoiceModal = () => {
        const optionsContainer = $('#add-choice-options');
        optionsContainer.innerHTML = '';
        const isResumosTab = state.currentTab === 'resumos';

        const options = [
            { text: 'Nova Pasta', icon: 'folder-plus', action: () => openCreateModal('folder') },
            { text: isResumosTab ? 'Novo Resumo' : 'Novo Baralho', icon: isResumosTab ? 'file-text' : 'layers', action: () => openCreateModal(isResumosTab ? 'resumo' : 'deck') },
        ];
        if (!isResumosTab) {
            options.push({ text: '✨ Gerar Baralho com IA', icon: 'sparkles', action: () => openAiModal('deck') });
        }
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'w-full flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg';
            btn.innerHTML = `<i data-lucide="${opt.icon}"></i> <span>${opt.text}</span>`;
            btn.onclick = () => { closeModal('choice'); opt.action(); };
            optionsContainer.appendChild(btn);
        });
        lucide.createIcons();
        openModal('choice');
    };
    
    const openCreateModal = (type) => {
        state.modal.createType = type;
        const titles = { folder: 'Nova Pasta', resumo: 'Novo Resumo', deck: 'Novo Baralho' };
        $('#create-modal-title').textContent = titles[type];
        const input = $('#create-modal-input');
        input.value = '';
        input.placeholder = `Nome d${type === 'folder' ? 'a' : 'o'} ${titles[type].split(' ')[1].toLowerCase()}...`;
        openModal('create');
        input.focus();
    };

    const openAiModal = (type) => {
        state.modal.aiType = type;
        $('#ai-modal-title').textContent = 'Gerar Baralho com IA';
        $('#ai-modal-input').value = '';
        openModal('ai');
        $('#ai-modal-input').focus();
    };
    
    const openEditCardModal = (cardId) => {
        const deck = state.flashcardDecks.find(d => d.id === state.viewingDeckId);
        const card = deck?.cards.find(c => c.id === cardId);
        if (!card) return;
        
        state.editingCardId = cardId;
        $('#edit-card-front').value = card.frente;
        $('#edit-card-back').value = card.verso;
        openModal('editCard');
    };

    // --- RENDERIZAÇÃO ---
    const updateActiveTab = () => {
        tabResumosBtn.classList.toggle('tab-active', state.currentTab === 'resumos');
        tabFlashcardsBtn.classList.toggle('tab-active', state.currentTab === 'flashcards');
    };

    const renderBreadcrumbs = () => {
        breadcrumbsContainer.innerHTML = '';
        let path = [];
        let currentId = state.currentFolderId;
        while (currentId) {
            const folder = state.folders.find(f => f.id === currentId);
            if (folder) {
                path.unshift(folder);
                currentId = folder.parentId;
            } else break;
        }
        const rootBtn = document.createElement('button');
        rootBtn.className = 'hover:text-blue-600';
        rootBtn.textContent = 'Início';
        rootBtn.onclick = () => navigateToFolder(null);
        breadcrumbsContainer.appendChild(rootBtn);
        path.forEach(folder => {
            const separator = document.createElement('span');
            separator.className = 'mx-2';
            separator.textContent = '/';
            breadcrumbsContainer.appendChild(separator);
            const folderBtn = document.createElement('button');
            folderBtn.className = 'hover:text-blue-600';
            folderBtn.textContent = folder.name;
            folderBtn.onclick = () => navigateToFolder(folder.id);
            breadcrumbsContainer.appendChild(folderBtn);
        });
    };

    const renderItemList = () => {
        if (window.autoAnimate) window.autoAnimate(itemListContainer);
        itemListContainer.innerHTML = '';
        const foldersInView = state.folders.filter(f => f.parentId === state.currentFolderId);
        const isResumosTab = state.currentTab === 'resumos';
        const itemsInView = (isResumosTab ? state.resumos : state.flashcardDecks).filter(i => i.folderId === state.currentFolderId);

        if (foldersInView.length === 0 && itemsInView.length === 0) {
            itemListContainer.innerHTML = `<div class="text-center text-gray-500 mt-10 p-4"><i data-lucide="folder-open" class="mx-auto h-16 w-16"></i><p class="mt-4 font-semibold">Esta pasta está vazia.</p></div>`;
        }

        foldersInView.forEach(folder => {
            const itemEl = document.createElement('div');
            itemEl.className = 'relative flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 hover:bg-gray-200 transition-colors';
            itemEl.innerHTML = `<div class="flex items-center gap-3 cursor-pointer flex-1" data-id="${folder.id}" data-type="folder"><i data-lucide="folder" class="text-blue-500"></i><span class="font-medium">${folder.name}</span></div><button class="options-btn p-2 rounded-full hover:bg-gray-300" data-id="${folder.id}" data-type="folder"><i data-lucide="more-vertical" class="h-5 w-5 pointer-events-none"></i></button>`;
            itemListContainer.appendChild(itemEl);
        });

        itemsInView.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'relative flex items-center justify-between p-3 bg-white rounded-lg mb-2 border border-gray-200 hover:bg-gray-50';
            const icon = isResumosTab ? 'file-text' : 'layers';
            const color = isResumosTab ? 'text-green-500' : 'text-purple-500';
            itemEl.innerHTML = `<div class="flex items-center gap-3 cursor-pointer flex-1" data-id="${item.id}" data-type="${isResumosTab ? 'resumo' : 'deck'}"><i data-lucide="${icon}" class="${color}"></i><span>${item.titulo || item.nome}</span></div><button class="options-btn p-2 rounded-full hover:bg-gray-300" data-id="${item.id}" data-type="${isResumosTab ? 'resumo' : 'deck'}"><i data-lucide="more-vertical" class="h-5 w-5 pointer-events-none"></i></button>`;
            itemListContainer.appendChild(itemEl);
        });
        lucide.createIcons();
    };
    
    const renderCardList = (cards) => {
        const cardListContainer = $('#card-list');
        if (window.autoAnimate) window.autoAnimate(cardListContainer);
        cardListContainer.innerHTML = '';
        if (!cards || cards.length === 0) {
            cardListContainer.innerHTML = `<div class="text-center text-gray-500 mt-10 p-4"><i data-lucide="inbox" class="mx-auto h-16 w-16"></i><p class="mt-4 font-semibold">Nenhum cartão aqui.</p></div>`;
        } else {
            cards.forEach(card => {
                const cardEl = document.createElement('div');
                cardEl.className = 'bg-white border border-gray-200 rounded-lg mb-3 shadow-sm';
                cardEl.innerHTML = `
                    <div class="p-3 border-b border-gray-100"><p class="text-xs text-gray-500 font-semibold">FRENTE</p><p class="text-gray-800">${card.frente.replace(/\n/g, '<br>')}</p></div>
                    <div class="p-3 bg-gray-50"><p class="text-xs text-gray-500 font-semibold">VERSO</p><p class="text-gray-800">${card.verso.replace(/\n/g, '<br>')}</p></div>
                    <div class="p-2 flex justify-end gap-2 border-t border-gray-100">
                        <button class="edit-card-btn p-2 text-gray-500 hover:text-blue-600" data-card-id="${card.id}"><i data-lucide="pencil" class="h-4 w-4 pointer-events-none"></i></button>
                        <button class="delete-card-btn p-2 text-gray-500 hover:text-red-600" data-card-id="${card.id}"><i data-lucide="trash-2" class="h-4 w-4 pointer-events-none"></i></button>
                    </div>`;
                cardListContainer.appendChild(cardEl);
            });
        }
        lucide.createIcons();
    };

    const render = () => {
        updateActiveTab();
        renderBreadcrumbs();
        renderItemList();
    };

    // --- LÓGICA DE AÇÕES (CRUD) ---
    const createItem = () => {
        const input = $('#create-modal-input');
        const name = input.value.trim();
        if (!name) return;
        const type = state.modal.createType;
        const newItem = { id: crypto.randomUUID(), folderId: state.currentFolderId };

        if (type === 'folder') {
            newItem.name = name;
            newItem.parentId = state.currentFolderId;
            delete newItem.folderId;
            state.folders.push(newItem);
        } else if (type === 'resumo') {
            newItem.titulo = name;
            newItem.conteudo = `# ${name}\n\n`;
            state.resumos.push(newItem);
        } else if (type === 'deck') {
            newItem.nome = name;
            newItem.cards = [];
            state.flashcardDecks.push(newItem);
        }
        
        saveData();
        render();
        closeModal('create');
    };

    const deleteItem = (id, type) => {
        const confirmation = confirm(`Tem certeza que deseja excluir? Se for uma pasta, todo o seu conteúdo será perdido.`);
        if (!confirmation) return;

        if (type === 'folder') {
            const foldersToDelete = [id];
            for (let i = 0; i < foldersToDelete.length; i++) {
                const parentId = foldersToDelete[i];
                state.folders.filter(f => f.parentId === parentId).forEach(f => foldersToDelete.push(f.id));
            }
            state.folders = state.folders.filter(f => !foldersToDelete.includes(f.id));
            state.resumos = state.resumos.filter(r => !foldersToDelete.includes(r.folderId));
            state.flashcardDecks = state.flashcardDecks.filter(d => !foldersToDelete.includes(d.folderId));
        } else if (type === 'resumo') {
            state.resumos = state.resumos.filter(r => r.id !== id);
        } else if (type === 'deck') {
            state.flashcardDecks = state.flashcardDecks.filter(d => d.id !== id);
        }
        saveData();
        render();
    };

    const saveResumo = () => {
        const resumo = state.resumos.find(r => r.id === state.editingResumoId);
        if(resumo) {
            resumo.titulo = $('#resumo-edit-title').value.trim() || 'Resumo sem título';
            resumo.conteudo = $('#resumo-textarea').value;
            saveData();
            showExplorerView();
        }
    };
    
    const saveCard = (isNew = false) => {
        const deck = state.flashcardDecks.find(d => d.id === state.viewingDeckId);
        if (!deck) return;

        const front = $('#edit-card-front').value.trim();
        const back = $('#edit-card-back').value.trim();
        if (!front || !back) {
            alert('A frente e o verso não podem estar vazios.');
            return;
        }

        if (isNew) {
            deck.cards.push({ id: crypto.randomUUID(), frente: front, verso: back });
        } else {
            const card = deck.cards.find(c => c.id === state.editingCardId);
            if (card) {
                card.frente = front;
                card.verso = back;
            }
        }
        
        saveData();
        renderCardList(deck.cards);
        closeModal('editCard');
    };
    
    const deleteCard = (cardId) => {
        const deck = state.flashcardDecks.find(d => d.id === state.viewingDeckId);
        if (!deck) return;
        
        const confirmation = confirm('Tem certeza que deseja excluir este cartão?');
        if (confirmation) {
            deck.cards = deck.cards.filter(c => c.id !== cardId);
            saveData();
            renderCardList(deck.cards);
        }
    };
    
    // --- MENU DE OPÇÕES ---
    const openOptionsMenu = (target, id, type) => {
        closeOptionsMenu();
        const menu = document.createElement('div');
        menu.id = 'options-menu-popup';
        menu.className = 'options-menu';

        let buttons = '';
        if (type === 'resumo') {
            buttons += `<button class="edit-from-menu-btn" data-id="${id}" data-type="${type}"><i data-lucide="pencil" class="h-4 w-4 text-blue-500"></i><span>Editar</span></button>`;
        }
        buttons += `<button class="delete-from-menu-btn" data-id="${id}" data-type="${type}"><i data-lucide="trash-2" class="h-4 w-4 text-red-500"></i><span>Excluir</span></button>`;
        
        menu.innerHTML = buttons;
        document.body.appendChild(menu);
        lucide.createIcons();
        const rect = target.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;
    };

    const closeOptionsMenu = () => {
        $('#options-menu-popup')?.remove();
    };

    // --- EVENT LISTENERS ---
    const setupEventListeners = () => {
        // Navegação
        addFab.addEventListener('click', openChoiceModal);
        tabResumosBtn.addEventListener('click', () => switchTab('resumos'));
        tabFlashcardsBtn.addEventListener('click', () => switchTab('flashcards'));

        // Botões de voltar
        $('#view-resumo-back-btn').addEventListener('click', showExplorerView);
        $('#edit-resumo-back-btn').addEventListener('click', showExplorerView);
        $('#deck-back-btn').addEventListener('click', showExplorerView);
        
        // Salvar resumo
        $('#resumo-save-btn').addEventListener('click', saveResumo);

        // Ações na lista principal
        itemListContainer.addEventListener('click', (e) => {
            const itemDiv = e.target.closest('div[data-id][data-type]');
            const optionsButton = e.target.closest('.options-btn');
            if (optionsButton) {
                e.stopPropagation();
                openOptionsMenu(optionsButton, optionsButton.dataset.id, optionsButton.dataset.type);
            } else if (itemDiv) {
                const { id, type } = itemDiv.dataset;
                if (type === 'folder') navigateToFolder(id);
                if (type === 'resumo') showResumoReaderView(id);
                if (type === 'deck') showDeckView(id);
            }
        });

        // Ações no menu de opções e modais
        document.body.addEventListener('click', (e) => {
            if (!e.target.closest('.options-btn') && !e.target.closest('#options-menu-popup')) {
                closeOptionsMenu();
            }
            const deleteBtn = e.target.closest('.delete-from-menu-btn');
            if (deleteBtn) {
                deleteItem(deleteBtn.dataset.id, deleteBtn.dataset.type);
                closeOptionsMenu();
            }
            const editBtn = e.target.closest('.edit-from-menu-btn');
            if (editBtn) {
                showResumoEditView(editBtn.dataset.id);
                closeOptionsMenu();
            }
        });
        
        // Modais
        $('#close-choice-modal').addEventListener('click', () => closeModal('choice'));
        $('#confirm-create-btn').addEventListener('click', createItem);
        $$('.modal-cancel-btn').forEach(btn => btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-backdrop');
            if(modal) modal.classList.add('hidden');
        }));
        
        // Tela de Baralho
        $('#add-card-btn').addEventListener('click', () => {
            state.editingCardId = null; 
            $('#edit-card-front').value = '';
            $('#edit-card-back').value = '';
            openModal('editCard');
        });
        $('#confirm-edit-card-btn').addEventListener('click', () => saveCard(state.editingCardId === null));
        $('#card-list').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-card-btn');
            const deleteBtn = e.target.closest('.delete-card-btn');
            if (editBtn) openEditCardModal(editBtn.dataset.cardId);
            if (deleteBtn) deleteCard(deleteBtn.dataset.cardId);
        });
    };
    
    // --- INICIALIZAÇÃO ---
    const navigateToFolder = (folderId) => {
        state.currentFolderId = folderId;
        render();
    };
    loadData();
    render();
    setupEventListeners();
    lucide.createIcons();
});
