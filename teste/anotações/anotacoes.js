document.addEventListener('DOMContentLoaded', () => {
    // --- SETUP INICIAL ---
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    // --- CONSTANTES ---
    const COLORS = [
        { name: 'gray', bg: 'bg-gray-300', border: 'border-gray-300' }, 
        { name: 'red', bg: 'bg-red-300', border: 'border-red-300' },
        { name: 'yellow', bg: 'bg-yellow-300', border: 'border-yellow-300' }, 
        { name: 'green', bg: 'bg-green-300', border: 'border-green-300' },
        { name: 'blue', bg: 'bg-blue-300', border: 'border-blue-300' }, 
        { name: 'purple', bg: 'bg-purple-300', border: 'border-purple-300' },
    ];
    const DEFAULT_COLOR = COLORS[0].name;

    const SORT_MODES = ['default', 'alpha_asc', 'alpha_desc', 'favorites_first'];
    const SORT_LABELS = {
        default: 'Padrão',
        alpha_asc: 'A-Z',
        alpha_desc: 'Z-A',
        favorites_first: 'Favoritos Primeiro'
    };

    // --- ELEMENTOS DO DOM ---
    const views = {
        explorer: $('#explorer-view'),
        resumoView: $('#resumo-view'),
        resumoEdit: $('#resumo-edit-view'),
        deck: $('#deck-view'),
        deckEdit: $('#deck-edit-view'),
        study: $('#study-view'),
    };
    const modals = {
        choice: $('#add-choice-modal'),
        create: $('#create-item-modal'),
        editCard: $('#edit-card-modal'),
        confirmation: $('#confirmation-modal'),
        input: $('#input-modal'),
    };
    const filterDrawer = {
        backdrop: $('#filter-drawer-backdrop'),
        drawer: $('#filter-drawer'),
        colorPalette: $('#filter-color-palette'),
        tagsInput: $('#filter-tags-input'),
        favoritesToggle: $('#filter-favorites-toggle'),
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
        resumoTagify: null,
        deckTagify: null,
        filterTagify: null,
        modal: { createType: null },
        studySession: { deck: null, currentIndex: 0, shuffle: false, dueCards: [] },
        filters: { colors: [], tags: [], showFavoritesOnly: false },
        tempFilters: { colors: [], tags: [], showFavoritesOnly: false },
        sortMode: 'default',
    };

    // --- FUNÇÕES DE DADOS ---
    const loadData = () => {
        state.folders = JSON.parse(localStorage.getItem('estuda_ai_folders')) || [];
        state.resumos = JSON.parse(localStorage.getItem('estuda_ai_resumos')) || [];
        state.flashcardDecks = JSON.parse(localStorage.getItem('estuda_ai_flashcardDecks')) || [];
        state.sortMode = localStorage.getItem('sortMode') || 'default';
    };
    const saveData = () => {
        localStorage.setItem('estuda_ai_folders', JSON.stringify(state.folders));
        localStorage.setItem('estuda_ai_resumos', JSON.stringify(state.resumos));
        localStorage.setItem('estuda_ai_flashcardDecks', JSON.stringify(state.flashcardDecks));
        localStorage.setItem('sortMode', state.sortMode);
    };

    // --- LÓGICA DE NOTIFICAÇÕES PERSONALIZADAS ---
    const showToast = (message, type = 'info') => {
        const toastContainer = $('#toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    };

    const showConfirmationModal = ({ title, text, confirmText = 'Confirmar', onConfirm }) => {
        const modal = modals.confirmation;
        $('#confirmation-title').textContent = title;
        $('#confirmation-text').textContent = text;
        const confirmBtn = $('#confirmation-confirm-btn');
        confirmBtn.textContent = confirmText;

        const handleConfirm = () => {
            onConfirm();
            closeModal('confirmation');
            cleanup();
        };

        const handleCancel = () => {
            closeModal('confirmation');
            cleanup();
        };

        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            $('#confirmation-cancel-btn').removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        $('#confirmation-cancel-btn').addEventListener('click', handleCancel);

        openModal('confirmation');
    };

    const showInputModal = ({ title, inputValue, onConfirm }) => {
        const modal = modals.input;
        $('#input-modal-title').textContent = title;
        const input = $('#input-modal-input');
        const errorEl = $('#input-modal-error');
        input.value = inputValue;
        errorEl.classList.add('hidden');

        const handleConfirm = () => {
            if (!input.value.trim()) {
                errorEl.textContent = 'O nome não pode estar vazio!';
                errorEl.classList.remove('hidden');
                return;
            }
            onConfirm(input.value);
            closeModal('input');
            cleanup();
        };

        const handleCancel = () => {
            closeModal('input');
            cleanup();
        };

        const cleanup = () => {
            $('#input-modal-confirm-btn').removeEventListener('click', handleConfirm);
            $('#input-modal-cancel-btn').removeEventListener('click', handleCancel);
        };

        $('#input-modal-confirm-btn').addEventListener('click', handleConfirm);
        $('#input-modal-cancel-btn').addEventListener('click', handleCancel);

        openModal('input');
        input.focus();
    };


    // --- LÓGICA DE REPETIÇÃO ESPAÇADA (SRS) ---
    const getTodayDate = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    };

    const addDays = (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const calculateNextReview = (card, rating) => {
        card.srs = card.srs || { repetitions: 0, interval: 1, easeFactor: 2.5, dueDate: getTodayDate().toISOString() };

        if (rating < 2) {
            card.srs.repetitions = 0;
            card.srs.interval = 1;
        } else {
            card.srs.repetitions += 1;
            if (card.srs.repetitions === 1) {
                card.srs.interval = 1;
            } else if (card.srs.repetitions === 2) {
                card.srs.interval = 6;
            } else {
                card.srs.interval = Math.ceil(card.srs.interval * card.srs.easeFactor);
            }
        }

        card.srs.easeFactor = Math.max(1.3, card.srs.easeFactor + 0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02));
        
        card.srs.dueDate = addDays(getTodayDate(), card.srs.interval).toISOString();
    };

    const getDueCards = (deck) => {
        const today = getTodayDate();
        return deck.cards.filter(card => {
            const dueDate = new Date((card.srs && card.srs.dueDate) || today);
            return dueDate <= today;
        });
    };

    // --- LÓGICA DE AÇÕES ---
    const deleteItem = (id, type) => {
        showConfirmationModal({
            title: 'Tem certeza?', text: "Esta ação não pode ser desfeita!", confirmText: 'Sim, excluir',
            onConfirm: () => {
                if (type === 'folder') {
                    let foldersToDelete = [id];
                    for (let i = 0; i < foldersToDelete.length; i++) {
                        const parentId = foldersToDelete[i];
                        state.folders.filter(f => f.parentId === parentId).forEach(f => foldersToDelete.push(f.id));
                    }
                    state.folders = state.folders.filter(f => !foldersToDelete.includes(f.id));
                    state.resumos = state.resumos.filter(r => !foldersToDelete.includes(r.folderId));
                } else if (type === 'resumo') {
                    state.resumos = state.resumos.filter(r => r.id !== id);
                } else if (type === 'deck') {
                    state.flashcardDecks = state.flashcardDecks.filter(d => d.id !== id);
                }
                saveData();
                render();
                showToast('Item removido', 'success');
            }
        });
    };

    const toggleFavorite = (itemId, type) => {
        const item = type === 'resumo' ? state.resumos.find(r => r.id === itemId) : state.flashcardDecks.find(d => d.id === itemId);
        if (item) {
            item.isFavorite = !item.isFavorite;
            saveData();
            if (state.currentView === 'resumoView' && state.viewingResumoId === itemId) {
                updateFavoriteButton($('#resumo-view-favorite-btn'), item.isFavorite);
            }
            render();
        }
    };
    
    // --- CONTROLE DE VISUALIZAÇÃO E FILTROS ---
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
        showView('resumoView');
    };
    
    const showResumoEditView = (resumoId) => {
        state.viewingResumoId = resumoId;
        state.resumoTagify.settings.whitelist = getAllUniqueTags('resumo');
        state.resumoTagify.removeAllTags();

        if (resumoId) { // Editando
            const resumo = state.resumos.find(r => r.id === resumoId);
            if (!resumo) return;
            $('#resumo-edit-title').value = resumo.titulo;
            $('#resumo-textarea').value = resumo.conteudo;
            state.tempSelectedColor = resumo.color || DEFAULT_COLOR;
            state.tempIsFavorite = resumo.isFavorite || false;
            state.resumoTagify.loadOriginalValues(resumo.tags || []);
        } else { // Criando
            $('#resumo-edit-title').value = '';
            $('#resumo-textarea').value = '';
            state.tempSelectedColor = DEFAULT_COLOR;
            state.tempIsFavorite = false;
        }
        updateFavoriteButton($('#favorite-btn'), state.tempIsFavorite);
        renderColorPalette('color-palette');
        showView('resumoEdit');
    };

    const showDeckView = (deckId) => {
        const deck = state.flashcardDecks.find(d => d.id === deckId);
        if (!deck) return;
        state.viewingDeckId = deckId;
        $('#deck-title').textContent = deck.nome;

        const dueCardsCount = getDueCards(deck).length;
        const studyBtn = $('#study-deck-btn');
        const studyBtnText = $('#study-deck-btn-text');
        const indicator = $('#study-count-indicator');
        const helperText = $('#study-helper-text');

        if (dueCardsCount > 0) {
            indicator.textContent = dueCardsCount;
            indicator.classList.remove('hidden');
            studyBtnText.textContent = 'Estudar';
            studyBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
            studyBtn.classList.add('bg-green-500', 'hover:bg-green-600');
            helperText.classList.add('hidden');
        } else {
            indicator.classList.add('hidden');
            studyBtnText.textContent = 'Revisar Tudo';
            studyBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
            studyBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
            helperText.textContent = 'Nenhum cartão agendado para hoje.';
            helperText.classList.remove('hidden');
        }

        renderCardList(deck.cards);
        showView('deck');
    };

    const showDeckEditView = (deckId) => {
        state.viewingDeckId = deckId;
        const deck = state.flashcardDecks.find(d => d.id === deckId);
        if (!deck) return;

        state.deckTagify.settings.whitelist = getAllUniqueTags('deck');
        state.deckTagify.removeAllTags();

        $('#deck-edit-title').value = deck.nome;
        state.tempSelectedColor = deck.color || DEFAULT_COLOR;
        state.deckTagify.loadOriginalValues(deck.tags || []);
        
        renderColorPalette('deck-color-palette');
        showView('deckEdit');
    };

    const showStudyView = (deckId, shuffle = false) => {
        const deck = state.flashcardDecks.find(d => d.id === deckId);
        let dueCards = getDueCards(deck);

        if (!deck || deck.cards.length === 0) {
            showToast('Adicione cartões para poder estudar', 'info');
            return;
        }

        if (dueCards.length === 0) {
            dueCards = deck.cards; // Estuda todos se não houver nenhum agendado
        }
        
        if (shuffle) {
            dueCards.sort(() => Math.random() - 0.5);
        }
        state.studySession = { deck: deck, dueCards: dueCards, currentIndex: 0, shuffle: shuffle };
        renderCurrentCard();
        showView('study');
    };

    const openFilterDrawer = () => {
        state.tempFilters = JSON.parse(JSON.stringify(state.filters));
        renderFilterDrawer();
        filterDrawer.backdrop.classList.add('visible');
        filterDrawer.drawer.classList.add('open');
    };

    const closeFilterDrawer = () => {
        filterDrawer.backdrop.classList.remove('visible');
        filterDrawer.drawer.classList.remove('open');
    };

    const applyFilters = () => {
        state.filters = JSON.parse(JSON.stringify(state.tempFilters));
        state.filters.tags = state.filterTagify.value.map(tag => tag.value);
        closeFilterDrawer();
        render();
    };

    const clearFilters = () => {
        state.tempFilters = { colors: [], tags: [], showFavoritesOnly: false };
        applyFilters();
    };

    // --- LÓGICA DOS MODAIS ---
    const openModal = (modalName) => modals[modalName].classList.add('visible');
    const closeModal = (modalName) => modals[modalName].classList.remove('visible');

    const openChoiceModal = () => {
        const optionsContainer = $('#add-choice-options');
        optionsContainer.innerHTML = '';
        const isResumosTab = state.currentTab === 'resumos';

        const options = [];
        if (isResumosTab) {
            options.push({ text: 'Nova Pasta', icon: 'folder-plus', action: () => openCreateModal('folder') });
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
        
        const colorContainer = $('#create-modal-color-container');
        if (type === 'deck') {
            state.tempSelectedColor = DEFAULT_COLOR;
            renderColorPalette('create-modal-color-palette');
            colorContainer.classList.remove('hidden');
        } else {
            colorContainer.classList.add('hidden');
        }

        openModal('create');
        input.focus();
    };

    const openEditCardModal = (cardId) => {
        const deck = state.flashcardDecks.find(d => d.id === state.viewingDeckId);
        const card = cardId ? deck?.cards.find(c => c.id === cardId) : null;
        
        state.editingCardId = cardId;
        $('#edit-card-modal-title').textContent = cardId ? 'Editar Cartão' : 'Novo Cartão';
        $('#edit-card-front').value = card ? card.frente : '';
        $('#edit-card-back').value = card ? card.verso : '';
        openModal('editCard');
    };

    // --- RENDERIZAÇÃO ---
    const renderBreadcrumbs = () => {
        const container = $('#breadcrumbs');
        container.innerHTML = '';
        if(state.currentTab === 'flashcards' || state.currentFolderId === null) {
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
        
        let itemsToRender, foldersInView = [];
        
        if (isResumosTab) {
            itemsToRender = state.resumos;
            foldersInView = state.folders.filter(f => f.parentId === state.currentFolderId);
            itemsToRender = itemsToRender.filter(i => i.folderId === state.currentFolderId);
        } else {
            itemsToRender = state.flashcardDecks;
        }

        // Aplicar filtros
        if (state.filters.showFavoritesOnly) {
            itemsToRender = itemsToRender.filter(item => item.isFavorite);
        }
        if (state.filters.colors.length > 0) {
            itemsToRender = itemsToRender.filter(item => state.filters.colors.includes(item.color || DEFAULT_COLOR));
        }
        if (state.filters.tags.length > 0) {
            itemsToRender = itemsToRender.filter(item => 
                item.tags && state.filters.tags.every(filterTag => item.tags.includes(filterTag))
            );
        }
        
        const term = state.searchTerm.toLowerCase();
        if (term) {
            itemsToRender = itemsToRender.filter(item => 
                (item.titulo || item.nome).toLowerCase().includes(term) ||
                (item.tags && item.tags.some(tag => tag.toLowerCase().includes(term)))
            );
        }

        // Ordenação
        const sorter = (a, b) => {
            if (state.sortMode === 'alpha_asc') {
                return (a.titulo || a.nome).localeCompare(b.titulo || b.nome);
            }
            if (state.sortMode === 'alpha_desc') {
                return (b.titulo || b.nome).localeCompare(a.titulo || a.nome);
            }
            if (state.sortMode === 'favorites_first') {
                return (b.isFavorite || false) - (a.isFavorite || false);
            }
            return 0; // Padrão
        };
        itemsToRender.sort(sorter);

        if (foldersInView.length === 0 && itemsToRender.length === 0) {
            $('#item-list').innerHTML = `<div class="text-center text-gray-500 mt-10 p-4"><i data-lucide="folder-open" class="mx-auto h-16 w-16"></i><p class="mt-4 font-semibold">${state.searchTerm || state.filters.colors.length > 0 || state.filters.tags.length > 0 || state.filters.showFavoritesOnly ? 'Nenhum resultado encontrado' : 'Nada por aqui ainda'}.</p></div>`;
        }

        foldersInView.forEach(folder => {
            const itemEl = document.createElement('div');
            itemEl.className = 'relative flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 hover:bg-gray-200';
            itemEl.innerHTML = `<div class="flex items-center gap-3 cursor-pointer flex-1" data-id="${folder.id}" data-type="folder"><i data-lucide="folder" class="text-blue-500"></i><span class="font-medium">${folder.name}</span></div><button class="options-btn p-2 rounded-full hover:bg-gray-300" data-id="${folder.id}" data-type="folder"><i data-lucide="more-vertical" class="h-5 w-5 pointer-events-none"></i></button>`;
            $('#item-list').appendChild(itemEl);
        });

        itemsToRender.forEach(item => {
            const colorName = item.color || DEFAULT_COLOR;
            const colorClass = COLORS.find(c => c.name === colorName)?.border || 'border-gray-300';
            const itemEl = document.createElement('div');
            itemEl.className = `item-card bg-white rounded-lg mb-2 border hover:bg-gray-50 ${colorClass}`;
            
            let contentHtml = '';
            const heartIcon = `<button class="favorite-toggle-btn p-1 rounded-full" data-id="${item.id}" data-type="${isResumosTab ? 'resumo' : 'deck'}">${item.isFavorite ? '<i data-lucide="heart" class="h-5 w-5 favorite-icon"></i>' : '<i data-lucide="heart" class="h-5 w-5 text-gray-300 hover:text-red-400"></i>'}</button>`;
            
            if (isResumosTab) {
                contentHtml = `
                    <div class="flex items-center">
                        <div class="flex-1 p-4 flex items-center gap-3 cursor-pointer" data-id="${item.id}" data-type="resumo">
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
                    <div class="p-4 flex items-center gap-3">
                        <div class="flex-1 flex items-center gap-3 cursor-pointer" data-id="${item.id}" data-type="deck">
                            <span class="font-medium">${item.nome}</span>
                        </div>
                        <div class="item-actions flex items-center">
                            ${heartIcon}
                            <button class="options-btn p-2 rounded-full hover:bg-gray-200" data-id="${item.id}" data-type="deck">
                                <i data-lucide="more-vertical" class="h-5 w-5 pointer-events-none"></i>
                            </button>
                        </div>
                    </div>`;
                 if (item.tags && item.tags.length > 0) {
                    const tagsHtml = item.tags.map(tag => `<span class="tag-pill">${tag}</span>`).join('');
                    contentHtml += `<div class="tags-container px-4 pt-0 pb-3">${tagsHtml}</div>`;
                }
            }
            
            itemEl.innerHTML = contentHtml;
            $('#item-list').appendChild(itemEl);
        });
        lucide.createIcons();
    };
    
    const renderColorPalette = (containerId) => {
        const paletteContainer = $(`#${containerId}`);
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

    const renderFilterDrawer = () => {
        filterDrawer.colorPalette.innerHTML = '';
        COLORS.forEach(color => {
            const circle = document.createElement('button');
            const isSelected = state.tempFilters.colors.includes(color.name);
            circle.className = `color-circle ${color.bg} ${isSelected ? 'selected' : ''}`;
            circle.dataset.color = color.name;
            if (isSelected) circle.innerHTML = `<i data-lucide="check" class="h-4 w-4 text-black opacity-60"></i>`;
            filterDrawer.colorPalette.appendChild(circle);
        });
        
        filterDrawer.favoritesToggle.classList.toggle('active', state.tempFilters.showFavoritesOnly);

        state.filterTagify.settings.whitelist = getAllUniqueTags(state.currentTab);
        state.filterTagify.loadOriginalValues(state.tempFilters.tags);

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

    const renderCurrentCard = () => {
        const { dueCards, currentIndex } = state.studySession;
        if (!dueCards || dueCards.length === 0) return;

        const card = dueCards[currentIndex];
        $('#study-card-front').textContent = card.frente;
        $('#study-card-back').textContent = card.verso;
        $('#study-progress').textContent = `${currentIndex + 1} / ${dueCards.length}`;
        
        $('#study-card-inner').classList.remove('is-flipped');
        $('#study-instructions').classList.remove('hidden');
        $('#study-actions').classList.add('hidden');
    };

    const render = () => {
        $('#tab-resumos').classList.toggle('tab-active', state.currentTab === 'resumos');
        $('#tab-flashcards').classList.toggle('tab-active', state.currentTab === 'flashcards');
        $('#search-input').placeholder = state.currentTab === 'resumos' ? 'Procurar por título ou tag...' : 'Procurar por nome do baralho...';
        
        const activeFiltersCount = state.filters.colors.length + state.filters.tags.length + (state.filters.showFavoritesOnly ? 1 : 0);
        const filterIndicator = $('#filter-indicator');
        if (activeFiltersCount > 0) {
            filterIndicator.textContent = activeFiltersCount;
            filterIndicator.classList.remove('hidden');
        } else {
            filterIndicator.classList.add('hidden');
        }

        renderBreadcrumbs();
        renderItemList();
    };

    // --- LÓGICA DE AÇÕES ---
    const switchTab = (tabName) => {
        state.currentTab = tabName;
        state.currentFolderId = null;
        state.searchTerm = '';
        $('#search-input').value = '';
        clearFilters();
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
        
        if (type === 'folder') {
            const newItem = { id: crypto.randomUUID(), parentId: state.currentFolderId, name: name };
            state.folders.push(newItem);
        } else if (type === 'deck') {
            const newItem = { id: crypto.randomUUID(), nome: name, cards: [], isFavorite: false, color: state.tempSelectedColor, tags: [] };
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
        const tags = state.resumoTagify.value.map(tag => tag.value);

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

    const saveDeck = () => {
        const deck = state.flashcardDecks.find(d => d.id === state.viewingDeckId);
        if (!deck) return;

        deck.nome = $('#deck-edit-title').value.trim() || 'Baralho sem nome';
        deck.color = state.tempSelectedColor;
        deck.tags = state.deckTagify.value.map(tag => tag.value);

        saveData();
        showExplorerView();
    };

    const saveCard = (isNew = false) => {
        const deck = state.flashcardDecks.find(d => d.id === state.viewingDeckId);
        if (!deck) return;

        const front = $('#edit-card-front').value.trim();
        const back = $('#edit-card-back').value.trim();
        if (!front || !back) {
            showToast('A frente e o verso não podem estar vazios.', 'error');
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
        
        showConfirmationModal({
            title: 'Excluir Cartão?', text: "Esta ação não pode ser desfeita.",
            onConfirm: () => {
                deck.cards = deck.cards.filter(c => c.id !== cardId);
                saveData();
                renderCardList(deck.cards);
            }
        });
    };

    const copyResumo = async () => {
        const resumo = state.resumos.find(r => r.id === state.viewingResumoId);
        if (!resumo || !navigator.clipboard) return;
        try {
            await navigator.clipboard.writeText(`${resumo.titulo}\n\n${resumo.conteudo}`);
            showToast('Copiado para a área de transferência', 'success');
        } catch (err) {
            showToast('Falha ao copiar o texto.', 'error');
        }
    };

    const shareResumo = async () => {
        const resumo = state.resumos.find(r => r.id === state.viewingResumoId);
        if (!resumo || !navigator.share) {
            showToast('O seu navegador não suporta esta função.', 'error');
            return;
        }
        try {
            await navigator.share({ title: resumo.titulo, text: resumo.conteudo });
        } catch (err) { /* Silencioso se o utilizador cancelar */ }
    };

    const updateFavoriteButton = (buttonElement, isFavorite) => {
        if (buttonElement) {
            buttonElement.classList.toggle('favorited', isFavorite);
        }
    };

    const getAllUniqueTags = (type) => {
        const items = type === 'resumo' ? state.resumos : state.flashcardDecks;
        const allTags = items.flatMap(item => item.tags || []);
        return [...new Set(allTags)];
    };

    const cycleSortMode = () => {
        const currentIndex = SORT_MODES.indexOf(state.sortMode);
        const nextIndex = (currentIndex + 1) % SORT_MODES.length;
        state.sortMode = SORT_MODES[nextIndex];
        
        showToast(`Ordenado por: ${SORT_LABELS[state.sortMode]}`, 'info');

        render();
    };

    const renameItem = (id, type) => {
        const item = type === 'folder' ? state.folders.find(f => f.id === id) : null;
        
        if (!item) return;

        showInputModal({
            title: `Renomear Pasta`,
            inputValue: item.name,
            onConfirm: (newValue) => {
                item.name = newValue;
                saveData();
                render();
            }
        });
    };

    // --- MENU DE OPÇÕES ---
    const openOptionsMenu = (target, id, type) => {
        closeOptionsMenu();
        const menu = document.createElement('div');
        menu.id = 'options-menu-popup';
        menu.className = 'options-menu';

        let buttons = '';
        if (type === 'folder') {
            buttons += `<button class="rename-from-menu-btn" data-id="${id}" data-type="${type}"><i data-lucide="pencil" class="h-4 w-4 text-blue-500"></i><span>Renomear</span></button>`;
        } else {
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
            <button id="share-resumo-btn"><i data-lucide="share-2" class="h-4 w-4 text-green-500"></i><span>Partilhar</span></button>
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
        $('#edit-deck-back-btn').addEventListener('click', showExplorerView);
        
        $('#resumo-save-btn').addEventListener('click', saveResumo);
        $('#deck-save-btn').addEventListener('click', saveDeck);
        $('#resumo-view-options-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openResumoViewMenu(e.currentTarget);
        });

        $('#color-palette').addEventListener('click', (e) => {
            const circle = e.target.closest('.color-circle');
            if (circle) {
                state.tempSelectedColor = circle.dataset.color;
                renderColorPalette('color-palette');
            }
        });
        $('#deck-color-palette').addEventListener('click', (e) => {
            const circle = e.target.closest('.color-circle');
            if (circle) {
                state.tempSelectedColor = circle.dataset.color;
                renderColorPalette('deck-color-palette');
            }
        });
        
        $('#create-modal-color-palette').addEventListener('click', (e) => {
            const circle = e.target.closest('.color-circle');
            if (circle) {
                state.tempSelectedColor = circle.dataset.color;
                renderColorPalette('create-modal-color-palette');
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
                toggleFavorite(favoriteBtn.dataset.id, favoriteBtn.dataset.type);
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
                const { id, type } = editBtn.dataset;
                if (type === 'resumo') showResumoEditView(id);
                if (type === 'deck') showDeckEditView(id);
                closeOptionsMenu();
            }
            const renameBtn = e.target.closest('.rename-from-menu-btn');
            if (renameBtn) {
                renameItem(renameBtn.dataset.id, renameBtn.dataset.type);
                closeOptionsMenu();
            }
            if (e.target.closest('#favorite-resumo-menu-btn')) { toggleFavorite(state.viewingResumoId, 'resumo'); closeOptionsMenu(); }
            if (e.target.closest('#copy-resumo-btn')) { copyResumo(); closeOptionsMenu(); }
            if (e.target.closest('#share-resumo-btn')) { shareResumo(); closeOptionsMenu(); }
            if (e.target.closest('#edit-resumo-menu-btn')) { showResumoEditView(state.viewingResumoId); closeOptionsMenu(); }
        });
        
        $('#close-choice-modal').addEventListener('click', () => closeModal('choice'));
        $('#confirm-create-btn').addEventListener('click', createItem);
        $$('.modal-cancel-btn').forEach(btn => btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-backdrop');
            if(modal) modal.classList.remove('visible');
        }));

        // Listeners do Filtro
        $('#filter-btn').addEventListener('click', openFilterDrawer);
        $('#close-filter-drawer-btn').addEventListener('click', closeFilterDrawer);
        filterDrawer.backdrop.addEventListener('click', closeFilterDrawer);
        $('#apply-filters-btn').addEventListener('click', applyFilters);
        $('#clear-filters-btn').addEventListener('click', clearFilters);

        filterDrawer.colorPalette.addEventListener('click', (e) => {
            const circle = e.target.closest('.color-circle');
            if (circle) {
                const color = circle.dataset.color;
                const index = state.tempFilters.colors.indexOf(color);
                if (index > -1) {
                    state.tempFilters.colors.splice(index, 1);
                } else {
                    state.tempFilters.colors.push(color);
                }
                renderFilterDrawer();
            }
        });

        filterDrawer.favoritesToggle.addEventListener('click', (e) => {
            state.tempFilters.showFavoritesOnly = !state.tempFilters.showFavoritesOnly;
            e.currentTarget.classList.toggle('active', state.tempFilters.showFavoritesOnly);
        });

        // Listeners do Modo de Estudo
        $('#study-deck-btn').addEventListener('click', () => {
            showStudyView(state.viewingDeckId, state.shuffleMode);
        });
        $('#add-card-btn').addEventListener('click', () => openEditCardModal(null));
        $('#confirm-edit-card-btn').addEventListener('click', () => saveCard(state.editingCardId === null));
        $('#card-list').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-card-btn');
            const deleteBtn = e.target.closest('.delete-card-btn');
            if (editBtn) openEditCardModal(editBtn.dataset.cardId);
            if (deleteBtn) deleteCard(deleteBtn.dataset.cardId);
        });

        $('#study-exit-btn').addEventListener('click', () => {
            showDeckView(state.studySession.deck.id);
        });

        $('#study-card-inner').addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('is-flipped');
            $('#study-instructions').classList.add('hidden');
            $('#study-actions').classList.remove('hidden');
        });

        $('#study-actions').addEventListener('click', (e) => {
            const ratingBtn = e.target.closest('.study-rating-btn');
            if (ratingBtn) {
                const rating = parseInt(ratingBtn.dataset.rating, 10);
                const currentCard = state.studySession.dueCards[state.studySession.currentIndex];
                calculateNextReview(currentCard, rating);

                state.studySession.currentIndex++;
                if (state.studySession.currentIndex >= state.studySession.dueCards.length) {
                    saveData();
                    Toast.fire({ icon: 'success', title: 'Parabéns! Sessão concluída.' });
                    showDeckView(state.studySession.deck.id);
                } else {
                    renderCurrentCard();
                }
            }
        });

        $('#shuffle-toggle').addEventListener('click', (e) => {
            state.shuffleMode = !state.shuffleMode;
            e.currentTarget.classList.toggle('active', state.shuffleMode);
        });
        
        $('#sort-btn').addEventListener('click', cycleSortMode);
    };
    
    // --- INICIALIZAÇÃO ---
    const init = () => {
        state.resumoTagify = new Tagify($('#tags-input'));
        state.deckTagify = new Tagify($('#deck-tags-input'));
        state.filterTagify = new Tagify(filterDrawer.tagsInput);
        loadData();
        showExplorerView();
        setupEventListeners();
    };

    init();
});
