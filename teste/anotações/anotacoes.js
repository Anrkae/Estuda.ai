document.addEventListener('DOMContentLoaded', () => {
    // --- SETUP INICIAL ---
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    // --- CONSTANTES ---
    const COLORS = [
        { name: 'gray', bg: 'bg-gray-300' }, { name: 'red', bg: 'bg-red-300' },
        { name: 'yellow', bg: 'bg-yellow-300' }, { name: 'green', bg: 'bg-green-300' },
        { name: 'blue', bg: 'bg-blue-300' }, { name: 'purple', bg: 'bg-purple-300' },
    ];
    const DEFAULT_COLOR = COLORS[0].name;

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
        editCard: $('#edit-card-modal'),
    };

    // --- ESTADO DA APLICAÇÃO ---
    let state = {
        currentTab: 'resumos',
        currentFolderId: null,
        viewingResumoId: null,
        viewingDeckId: null,
        editingCardId: null,
        folders: [],
        resumos: [],
        flashcardDecks: [],
        tempSelectedColor: DEFAULT_COLOR,
        tempIsFavorite: false,
        searchTerm: '',
        tagifyInstance: null,
        modal: { createType: null }
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

    // --- LÓGICA DE AÇÕES ---
    const deleteItem = (id, type) => {
        Swal.fire({
            title: 'Tem certeza?',
            text: "Esta ação não pode ser desfeita!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                if (type === 'folder') {
                    let foldersToDelete = [id];
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
                Swal.fire('Excluído!', 'O item foi removido.', 'success');
            }
        });
    };

    const toggleFavorite = (resumoId) => {
        const resumo = state.resumos.find(r => r.id === resumoId);
        if (resumo) {
            resumo.isFavorite = !resumo.isFavorite;
            saveData();
            if (state.currentView === 'resumoView' && state.viewingResumoId === resumoId) {
                updateFavoriteButton($('#resumo-view-favorite-btn'), resumo.isFavorite);
            }
            render();
        }
    };
    
    // --- CONTROLE DE VISUALIZAÇÃO ---
    const showView = (viewName) => {
        Object.values(views).forEach(v => v.classList.add('hidden'));
        views[viewName].classList.remove('hidden');
        $('#add-fab').classList.toggle('hidden', viewName !== 'explorer');
    };

    const showExplorerView = () => {
        state.viewingResumoId = null;
        state.viewingDeckId = null;
        showView('explorer');
        render();
    };
    
    const showResumoReaderView = (resumoId) => {
        const resumo = state.resumos.find(r => r.id === resumoId);
        if (!resumo) return;
        state.viewingResumoId = resumoId;
        $('#resumo-view-title').textContent = resumo.titulo;
        $('#resumo-view-content').innerHTML = marked.parse(resumo.conteudo);
        // Ação de favoritar foi movida para o menu de opções
        showView('resumoView');
    };
    
    const showResumoEditView = (resumoId) => {
        state.viewingResumoId = resumoId;
        
        // Atualiza a whitelist e limpa as tags existentes
        state.tagifyInstance.settings.whitelist = getAllUniqueTags();
        state.tagifyInstance.removeAllTags();

        if (resumoId) { // Editando
            const resumo = state.resumos.find(r => r.id === resumoId);
            if (!resumo) return;
            $('#resumo-edit-title').value = resumo.titulo;
            $('#resumo-textarea').value = resumo.conteudo;
            state.tempSelectedColor = resumo.color || DEFAULT_COLOR;
            state.tempIsFavorite = resumo.isFavorite || false;
            state.tagifyInstance.loadOriginalValues(resumo.tags || []);
        } else { // Criando
            $('#resumo-edit-title').value = '';
            $('#resumo-textarea').value = '';
            state.tempSelectedColor = DEFAULT_COLOR;
            state.tempIsFavorite = false;
        }
        updateFavoriteButton($('#favorite-btn'), state.tempIsFavorite);
        renderColorPalette();
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
            { text: 'Nova Pasta', icon: 'folder-plus', action: () => openCreateModal('folder') }
        ];

        if (isResumosTab) {
            options.push({ text: 'Novo Resumo', icon: 'file-text', action: () => showResumoEditView(null) });
        } else {
            options.push({ text: 'Novo Baralho', icon: 'layers', action: () => openCreateModal('deck') });
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
        const titles = { folder: 'Nova Pasta', deck: 'Novo Baralho' };
        $('#create-modal-title').textContent = titles[type];
        const input = $('#create-modal-input');
        input.value = '';
        input.placeholder = `Nome d${type === 'folder' ? 'a' : 'o'} ${titles[type].split(' ')[1].toLowerCase()}...`;
        openModal('create');
        input.focus();
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
    const renderBreadcrumbs = () => {
        const container = $('#breadcrumbs');
        container.innerHTML = '';
        if(state.currentFolderId === null) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';

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
        rootBtn.className = 'p-1 hover:bg-gray-200 rounded-full';
        rootBtn.innerHTML = `<i data-lucide="home" class="h-4 w-4"></i>`;
        rootBtn.addEventListener('click', () => navigateToFolder(null));
        container.appendChild(rootBtn);

        path.forEach(folder => {
            const separator = document.createElement('span');
            separator.className = 'mx-2 text-gray-400';
            separator.textContent = '/';
            container.appendChild(separator);

            const folderBtn = document.createElement('button');
            folderBtn.className = 'hover:text-blue-600';
            folderBtn.textContent = folder.name;
            folderBtn.addEventListener('click', () => navigateToFolder(folder.id));
            container.appendChild(folderBtn);
        });
        lucide.createIcons();
    };

    const renderItemList = () => {
        if (window.autoAnimate) window.autoAnimate($('#item-list'));
        $('#item-list').innerHTML = '';
        const isResumosTab = state.currentTab === 'resumos';
        
        let itemsToRender = isResumosTab ? state.resumos : state.flashcardDecks;
        
        if (isResumosTab && state.searchTerm) {
            const term = state.searchTerm.toLowerCase();
            itemsToRender = itemsToRender.filter(resumo => 
                resumo.titulo.toLowerCase().includes(term) ||
                (resumo.tags && resumo.tags.some(tag => tag.toLowerCase().includes(term)))
            );
        }

        const foldersInView = state.folders.filter(f => f.parentId === state.currentFolderId);
        const itemsInView = itemsToRender.filter(i => i.folderId === state.currentFolderId);

        if (foldersInView.length === 0 && itemsInView.length === 0) {
            $('#item-list').innerHTML = `<div class="text-center text-gray-500 mt-10 p-4"><i data-lucide="folder-open" class="mx-auto h-16 w-16"></i><p class="mt-4 font-semibold">${state.searchTerm ? 'Nenhum resultado encontrado' : 'Esta pasta está vazia'}.</p></div>`;
        }

        foldersInView.forEach(folder => {
            const itemEl = document.createElement('div');
            itemEl.className = 'relative flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 hover:bg-gray-200';
            itemEl.innerHTML = `<div class="flex items-center gap-3 cursor-pointer flex-1" data-id="${folder.id}" data-type="folder"><i data-lucide="folder" class="text-blue-500"></i><span class="font-medium">${folder.name}</span></div><button class="options-btn p-2 rounded-full hover:bg-gray-300" data-id="${folder.id}" data-type="folder"><i data-lucide="more-vertical" class="h-5 w-5 pointer-events-none"></i></button>`;
            $('#item-list').appendChild(itemEl);
        });

        itemsInView.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'bg-white rounded-lg mb-2 border border-gray-200 hover:bg-gray-50';
            
            let contentHtml = '';
            if (isResumosTab) {
                const colorName = item.color || DEFAULT_COLOR;
                const colorClass = COLORS.find(c => c.name === colorName)?.bg || 'bg-gray-300';
                const heartIcon = `<button class="favorite-toggle-btn p-1 rounded-full" data-id="${item.id}">${item.isFavorite ? '<i data-lucide="heart" class="h-5 w-5 favorite-icon"></i>' : '<i data-lucide="heart" class="h-5 w-5 text-gray-300 hover:text-red-400"></i>'}</button>`;
                
                contentHtml = `
                    <div class="flex items-center">
                        <div class="flex-1 p-4 flex items-center gap-3 cursor-pointer" data-id="${item.id}" data-type="resumo">
                            <div class="color-indicator ${colorClass}"></div>
                            <span class="font-medium">${item.titulo}</span>
                        </div>
                        <div class="item-actions flex items-center p-2">
                            ${heartIcon}
                            <button class="options-btn p-2 rounded-full hover:bg-gray-200" data-id="${item.id}" data-type="resumo">
                                <i data-lucide="more-vertical" class="h-5 w-5 pointer-events-none"></i>
                            </button>
                        </div>
                    </div>`;
                
                if (item.tags && item.tags.length > 0) {
                    const tagsHtml = item.tags.map(tag => `<span class="tag-pill">${tag}</span>`).join('');
                    contentHtml += `<div class="tags-container px-4 pb-3">${tagsHtml}</div>`;
                }
            } else {
                contentHtml = `
                    <div class="p-4 flex items-center gap-3 cursor-pointer" data-id="${item.id}" data-type="deck">
                        <i data-lucide="layers" class="text-purple-500"></i>
                        <span class="flex-1 font-medium">${item.nome}</span>
                        <button class="options-btn p-2 rounded-full hover:bg-gray-200" data-id="${item.id}" data-type="deck">
                            <i data-lucide="more-vertical" class="h-5 w-5 pointer-events-none"></i>
                        </button>
                    </div>`;
            }
            
            itemEl.innerHTML = contentHtml;
            $('#item-list').appendChild(itemEl);
        });
        lucide.createIcons();
    };
    
    const renderColorPalette = () => {
        const paletteContainer = $('#color-palette');
        paletteContainer.innerHTML = '';
        COLORS.forEach(color => {
            const circle = document.createElement('button');
            circle.className = `color-circle ${color.bg}`;
            circle.dataset.color = color.name;
            if (color.name === state.tempSelectedColor) {
                circle.classList.add('selected');
                circle.innerHTML = `<i data-lucide="check" class="h-4 w-4 text-black opacity-60"></i>`;
            }
            paletteContainer.appendChild(circle);
        });
        lucide.createIcons();
    };

    const render = () => {
        $('#tab-resumos').classList.toggle('tab-active', state.currentTab === 'resumos');
        $('#tab-flashcards').classList.toggle('tab-active', state.currentTab === 'flashcards');
        $('#search-container').classList.toggle('hidden', state.currentTab !== 'resumos');
        renderBreadcrumbs();
        renderItemList();
    };

    // --- LÓGICA DE AÇÕES ---
    const switchTab = (tabName) => {
        state.currentTab = tabName;
        state.currentFolderId = null;
        state.searchTerm = '';
        $('#search-input').value = '';
        showExplorerView();
    };

    const navigateToFolder = (folderId) => {
        state.currentFolderId = folderId;
        render();
    };

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
        } else if (type === 'deck') {
            newItem.nome = name;
            newItem.cards = [];
            state.flashcardDecks.push(newItem);
        }
        
        saveData();
        render();
        closeModal('create');
    };

    const saveResumo = () => {
        const titulo = $('#resumo-edit-title').value.trim() || 'Resumo sem título';
        const conteudo = $('#resumo-textarea').value;
        const color = state.tempSelectedColor;
        const isFavorite = state.tempIsFavorite;
        const tags = state.tagifyInstance.value.map(tag => tag.value);

        if (state.viewingResumoId) { // Atualizando
            const resumo = state.resumos.find(r => r.id === state.viewingResumoId);
            if (resumo) {
                resumo.titulo = titulo;
                resumo.conteudo = conteudo;
                resumo.color = color;
                resumo.isFavorite = isFavorite;
                resumo.tags = tags;
            }
        } else { // Criando
            state.resumos.push({
                id: crypto.randomUUID(), folderId: state.currentFolderId,
                titulo, conteudo, color, isFavorite, tags
            });
        }
        saveData();
        showExplorerView();
    };

    const copyResumo = async () => {
        const resumo = state.resumos.find(r => r.id === state.viewingResumoId);
        if (!resumo || !navigator.clipboard) return;
        try {
            await navigator.clipboard.writeText(`${resumo.titulo}\n\n${resumo.conteudo}`);
            Swal.fire({ icon: 'success', title: 'Copiado!', showConfirmButton: false, timer: 1500 });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Oops...', text: 'Falha ao copiar o texto.' });
        }
    };

    const shareResumo = async () => {
        const resumo = state.resumos.find(r => r.id === state.viewingResumoId);
        if (!resumo || !navigator.share) {
            Swal.fire({ icon: 'error', title: 'Oops...', text: 'Seu navegador não suporta esta função.' });
            return;
        }
        try {
            await navigator.share({ title: resumo.titulo, text: resumo.conteudo });
        } catch (err) { /* Silencioso se o usuário cancelar */ }
    };

    const updateFavoriteButton = (buttonElement, isFavorite) => {
        if (buttonElement) {
            buttonElement.classList.toggle('favorited', isFavorite);
        }
    };

    const getAllUniqueTags = () => {
        const allTags = state.resumos.flatMap(resumo => resumo.tags || []);
        return [...new Set(allTags)];
    };

    // --- MENU DE OPÇÕES ---
    const openOptionsMenu = (target, id, type) => {
        closeOptionsMenu();
        const menu = document.createElement('div');
        menu.id = 'options-menu-popup';
        menu.className = 'options-menu';

        let buttons = '';
        if (type === 'resumo') {
            buttons += `<button class="edit-from-menu-btn" data-id="${id}"><i data-lucide="pencil" class="h-4 w-4 text-blue-500"></i><span>Editar</span></button>`;
        }
        buttons += `<button class="delete-from-menu-btn" data-id="${id}" data-type="${type}"><i data-lucide="trash-2" class="h-4 w-4 text-red-500"></i><span>Excluir</span></button>`;
        
        menu.innerHTML = buttons;
        document.body.appendChild(menu);
        lucide.createIcons();
        const rect = target.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;
    };
    
    const openResumoViewMenu = (target) => {
        closeOptionsMenu();
        const menu = document.createElement('div');
        menu.id = 'options-menu-popup';
        menu.className = 'options-menu';
        const resumo = state.resumos.find(r => r.id === state.viewingResumoId);
        const favoriteText = resumo?.isFavorite ? 'Desfavoritar' : 'Favoritar';
        const favoriteIconClass = resumo?.isFavorite ? 'favorite-icon' : 'text-gray-600';

        menu.innerHTML = `
            <button id="favorite-resumo-menu-btn"><i data-lucide="heart" class="h-4 w-4 ${favoriteIconClass}"></i><span>${favoriteText}</span></button>
            <button id="copy-resumo-btn"><i data-lucide="copy" class="h-4 w-4 text-gray-600"></i><span>Copiar</span></button>
            <button id="edit-resumo-menu-btn"><i data-lucide="pencil" class="h-4 w-4 text-blue-500"></i><span>Editar</span></button>
            <button id="share-resumo-btn"><i data-lucide="share-2" class="h-4 w-4 text-green-500"></i><span>Compartilhar</span></button>
        `;
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
        $('#add-fab').addEventListener('click', openChoiceModal);
        $('#tab-resumos').addEventListener('click', () => switchTab('resumos'));
        $('#tab-flashcards').addEventListener('click', () => switchTab('flashcards'));

        $('#view-resumo-back-btn').addEventListener('click', showExplorerView);
        $('#edit-resumo-back-btn').addEventListener('click', showExplorerView);
        $('#deck-back-btn').addEventListener('click', showExplorerView);
        
        $('#resumo-save-btn').addEventListener('click', saveResumo);
        $('#resumo-view-options-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openResumoViewMenu(e.currentTarget);
        });

        $('#color-palette').addEventListener('click', (e) => {
            const circle = e.target.closest('.color-circle');
            if (circle) {
                state.tempSelectedColor = circle.dataset.color;
                renderColorPalette();
            }
        });

        $('#search-input').addEventListener('input', (e) => {
            state.searchTerm = e.target.value;
            render();
        });

        $('#favorite-btn').addEventListener('click', () => {
            state.tempIsFavorite = !state.tempIsFavorite;
            updateFavoriteButton($('#favorite-btn'), state.tempIsFavorite);
        });

        $('#item-list').addEventListener('click', (e) => {
            const favoriteBtn = e.target.closest('.favorite-toggle-btn');
            if (favoriteBtn) {
                e.stopPropagation();
                toggleFavorite(favoriteBtn.dataset.id);
                return;
            }

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
            if (e.target.closest('#favorite-resumo-menu-btn')) { toggleFavorite(state.viewingResumoId); closeOptionsMenu(); }
            if (e.target.closest('#copy-resumo-btn')) { copyResumo(); closeOptionsMenu(); }
            if (e.target.closest('#share-resumo-btn')) { shareResumo(); closeOptionsMenu(); }
            if (e.target.closest('#edit-resumo-menu-btn')) { showResumoEditView(state.viewingResumoId); closeOptionsMenu(); }
        });
        
        $('#close-choice-modal').addEventListener('click', () => closeModal('choice'));
        $('#confirm-create-btn').addEventListener('click', createItem);
        $$('.modal-cancel-btn').forEach(btn => btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-backdrop');
            if(modal) modal.classList.add('hidden');
        }));
    };
    
    // --- INICIALIZAÇÃO ---
    const tagInputElement = $('#tags-input');
    state.tagifyInstance = new Tagify(tagInputElement); // Inicializa uma vez
    loadData();
    showExplorerView();
    setupEventListeners();
});
