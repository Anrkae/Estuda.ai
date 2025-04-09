document.addEventListener('DOMContentLoaded', () => {

    // --- Função Utilitária para buscar userInfo ---
    function getUserInfoFromStorage() {
        try {
            const uS = localStorage.getItem('userInfo');
            if (uS) return JSON.parse(uS);
        } catch (e) {
            console.error("Erro ao ler userInfo no header.js:", e);
        }
        return null;
    }
    // -------------------------------------------------

    // HTML do Header (sem mudanças na estrutura)
    const headerHTML = `
        <header>
            <div class="header-left">
                <button id="toggleSidebar"><i class="fas fa-bars"></i></button>
            </div>
            <a href="index.html" class="header-center-link" aria-label="Ir para Início">
                <img style="display: block; filter: grayscale(40%); width: 40px; height: 40px;" src="assets/images/brain.png" alt="Estuda AI Logo">
            </a>
            <div class="header-right">
                <button id="profileButton" class="header-action-btn" aria-label="Perfil">
                    <i class="fas fa-user-circle" id="profileIconFallback"></i>
                    <img id="profileImage" src="" alt="Foto de Perfil">
                </button>
            </div>
        </header>`;

    // HTML da Sidebar (sem mudanças)
    const sidebarHTML = `
        <div id="sidebar" class="sidebar">
            <div class="top-bar">
                <button id="toggleSidebarInside"><i class="fas fa-bars"></i></button>
                <a href="index.html" class="sidebar-title-link">
                    <h1 id="headerInside">Estuda AI</h1>
                </a>
            </div>
            <div class="sidebarButtons">
                <button onclick="window.location.href='index.html'" class="sidebarBtn"><i class="fa-solid fa-house"></i>&nbsp;&nbsp;Inicio</button>
                <button onclick="window.location.href='anotacoes.html'" class="sidebarBtn"><i class="fa-regular fa-calendar"></i>&nbsp;&nbsp;Anotações</button>
                <button onclick="window.location.href='resumos.html'" class="sidebarBtn"><i class="fa-regular fa-pen-to-square"></i>&nbsp;&nbsp;Resumos</button>
                <button onclick="window.location.href='disciplinas.html'" class="sidebarBtn"><i class="fa-solid fa-square-root-variable"></i>&nbsp;&nbsp;Disciplinas</button>
                <button onclick="window.location.href='cronograma.html'" class="sidebarBtn"><i class="fa-regular fa-calendar"></i>&nbsp;&nbsp;Cronograma</button>
                 <button onclick="window.location.href='perfil.html'" class="sidebarBtn"><i class="fa-solid fa-user-gear"></i>&nbsp;&nbsp;Perfil e Config.</button>
            </div>
        </div>`;

    // HTML do Overlay (sem mudanças)
    const overlayHTML = `<div id="overlay" class="overlay"></div>`;

    // CSS Compartilhado (Regras da borda removidas)
    const sharedCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap');

        body {
            font-family: 'Montserrat', sans-serif;
            padding-top: 70px;
        }

        header {
            position: fixed; top: 0; left: 0; right: 0; height: 70px; background-color: #f5f4f0;
            display: flex; align-items: center; padding: 0 1rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            z-index: 1000; justify-content: space-between;
        }
        .header-left, .header-right { display: flex; align-items: center; }
        .header-center-link { line-height: 0; text-decoration: none; display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease; }
        .header-center-link:hover { transform: scale(1.05); }
        header #toggleSidebar { background: none; border: none; font-size: 1.8rem; color: #2C2C2C; cursor: pointer; z-index: 15; padding: 5px; margin-right: 0; line-height: 1; }

        /* Estilos Sidebar */
        .sidebar { display: flex; flex-direction: column; height: 100vh; position: fixed; top: 0; left: -290px; width: 250px; max-width: 80%; background-color: #f8f8f7; color: #474c5f; transition: left 0.35s ease-in-out; padding: 1rem; padding-top: 0; z-index: 1002; box-shadow: 3px 0 6px rgba(0,0,0,0.1); }
        .sidebar.active { left: 0; }
        .sidebar .top-bar { display: flex; align-items: center; margin-bottom: 20px; padding-top: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .sidebar .sidebar-title-link { text-decoration: none; color: inherit; display: inline-block; }
        .sidebar h1#headerInside { font-size: 1.4rem; color: #2C2C2C; margin: 0; margin-left: 15px; font-weight: 600; }
        .sidebar #toggleSidebarInside { background: none; border: none; font-size: 1.8rem; color: #2C2C2C; cursor: pointer; z-index: 15; padding: 5px; margin-right: 10px; line-height: 1; }
        .sidebar .sidebarButtons { display: flex; flex-direction: column; }
        .sidebar .sidebarBtn { font-family: 'Montserrat', sans-serif; background: none; border: none; color: #2c2c2c; font-weight: 600 !important; font-size: 1rem; padding: 10px 15px; display: flex; align-items: center; gap: 15px; text-align: left; cursor: pointer; border-radius: 6px; transition: background-color 0.2s ease, color 0.2s ease; }
        .sidebar .sidebarBtn:hover { background-color: #e8eaf6; color: #542aa3; }
        .sidebar .sidebarBtn i { width: 20px; text-align: center; font-size: 1.1em; }

        /* Estilos Overlay */
        .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 1001; opacity: 0; pointer-events: none; transition: opacity 0.35s ease-in-out; }
        .overlay.active { opacity: 1; pointer-events: auto; }

        /* Estilos Botão de Ação (Perfil) */
        .header-action-btn {
            background: none; border: none; color: #2C2C2C; font-size: 1.9rem; /* Ícone */
            cursor: pointer; padding: 0; margin-left: 15px; line-height: 1;
            display: flex; align-items: center; justify-content: center;
            width: 40px; height: 40px; border-radius: 50%;
            position: relative; /* Mantido caso precise no futuro */
            overflow: hidden; /* Garante que imagem não vaze */
        }
        .header-action-btn:hover { background-color: rgba(0, 0, 0, 0.05); }

        /* Imagem de perfil DENTRO do botão */
        #profileButton #profileImage {
            display: none; /* Começa escondida */
            width: 36px;   /* Aumentado ligeiramente */
            height: 36px;
            border-radius: 50%;
            object-fit: cover;
            /* Nenhuma borda extra necessária */
        }
        /* Ícone de fallback DENTRO do botão */
         #profileButton #profileIconFallback {
             display: block; /* Começa visível */
         }

         /* --- Regras da Borda Google REMOVIDAS --- */
         /* #profileButton::before { ... } REMOVIDO */
         /* #profileButton.has-image::before { ... } REMOVIDO */
    `;

    // Injeta CSS e HTML
    const styleElement = document.createElement('style');
    styleElement.textContent = sharedCSS;
    document.head.appendChild(styleElement);
    document.body.insertAdjacentHTML('afterbegin', overlayHTML);
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    document.body.insertAdjacentHTML('afterbegin', headerHTML);


    // --- Lógica Sidebar e Overlay ---
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const toggleBtnInside = document.getElementById('toggleSidebarInside');
    const overlay = document.getElementById('overlay');
    function closeSidebar() { if(sidebar)sidebar.classList.remove('active'); if(overlay)overlay.classList.remove('active'); }
    function openSidebar() { if(sidebar)sidebar.classList.add('active'); if(overlay)overlay.classList.add('active'); }
    if(toggleBtn) { toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); if (sidebar && sidebar.classList.contains('active')) closeSidebar(); else openSidebar(); }); }
    if(toggleBtnInside) { toggleBtnInside.addEventListener('click', (e) => { e.stopPropagation(); closeSidebar(); }); }
    if(overlay) { overlay.addEventListener('click', closeSidebar); }


    // --- Lógica Botão Perfil ---
    const profileBtn = document.getElementById('profileButton');
    const profileIconFallback = document.getElementById('profileIconFallback');
    const profileImage = document.getElementById('profileImage');

    // Função para carregar a foto de perfil no botão
    function loadProfilePicOnButton() {
        const userInfo = getUserInfoFromStorage();
        if (userInfo && userInfo.profilePicBase64 && profileBtn && profileIconFallback && profileImage) {
            try {
                profileImage.src = userInfo.profilePicBase64;
                profileImage.style.display = 'block';
                profileIconFallback.style.display = 'none';
                // Não adiciona/remove mais a classe 'has-image'
                console.log("Foto de perfil carregada no botão.");
            } catch (e) {
                console.error("Erro ao definir src da imagem de perfil:", e);
                profileImage.style.display = 'none';
                profileIconFallback.style.display = 'block';
            }
        } else if (profileIconFallback && profileImage) {
            profileImage.style.display = 'none';
            profileIconFallback.style.display = 'block';
        }
    }

    // Chama a função para tentar carregar a foto
    loadProfilePicOnButton();

    // Listener de clique do botão de perfil (Redirecionamento corrigido)
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            window.location.href = 'perfil.html'; // CORRIGIDO
        });
    }

    console.log("Header e Sidebar inicializados.");
});
