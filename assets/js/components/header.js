document.addEventListener('DOMContentLoaded', () => {

    /* --- Função Utilitária para buscar userInfo --- */
    function getUserInfoFromStorage() {
        try {
            const uS = localStorage.getItem('userInfo');
            if (uS) return JSON.parse(uS);
        } catch (e) {
            console.error("Erro ao ler userInfo no header.js:", e);
        }
        return null;
    }
    /* ------------------------------------------------- */

    /* HTML do Header (sem alterações) */
    const headerHTML = `
        <header>
            <div class="header-left">
                <button id="toggleSidebar"><i class="fas fa-bars"></i></button>
            </div>
            <a href="index.html" class="header-center-link" aria-label="Ir para Início"> <i class="fa-solid fa-graduation-cap"></i>
            </a>
            <div class="header-right">
                <button id="profileButton" class="header-action-btn" aria-label="Perfil">
                    <i class="fas fa-user-circle" id="profileIconFallback"></i>
                    <img id="profileImage" src="" alt="Foto de Perfil">
                </button>
            </div>
        </header>`;

    /* HTML da Sidebar (sem alterações na estrutura) */
    const sidebarHTML = `
        <div id="sidebar" class="sidebar">
            <div class="top-bar">
                <button id="toggleSidebarInside"><i class="fas fa-bars"></i></button>
                <a href="index.html" class="sidebar-title-link">
                    <h1 id="headerInside">Estuda AI</h1>
                </a>
            </div>
            <nav class="sidebar-navigation">
                <button onclick="window.location.href='index.html'" class="sidebarBtn" data-target="index.html">Inicio</button>
                <button onclick="window.location.href='simulados.html'" class="sidebarBtn" data-target="simulados.html">Questões</button>
                <button onclick="window.location.href='anotacoes.html'" class="sidebarBtn" data-target="anotacoes.html">Anotações</button>
                <button onclick="window.location.href='resumos.html'" class="sidebarBtn" data-target="resumos.html">Resumos</button>
                <button onclick="window.location.href='disciplinas.html'" class="sidebarBtn" data-target="disciplinas.html">Disciplinas</button>
                <button onclick="window.location.href='cronograma.html'" class="sidebarBtn" data-target="cronograma.html">Cronograma</button>
                <button onclick="window.location.href='perfil.html'" class="sidebarBtn" data-target="perfil.html">Perfil e Config.</button>
            </nav>
        </div>`;

    /* HTML do Overlay (sem alterações) */
    const overlayHTML = `<div id="overlay" class="overlay"></div>`;

    /* **** CSS Compartilhado REVISADO (Pílulas) **** */
    const sharedCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap');

        body {
            font-family: 'Montserrat', sans-serif;
            padding-top: 70px;
            margin: 0;
        }

        header {
            position: fixed; top: 0; left: 0; right: 0; height: 70px; background-color: #f5f4f0;
            display: flex; align-items: center; padding: 0 1.2rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
            z-index: 1000; justify-content: space-between;
            border-bottom: 1px solid #eee;
        }
        .header-left, .header-right { display: flex; align-items: center; }
        .header-center-link { line-height: 0; text-decoration: none; display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease; font-size: 1.7rem; color: #2C2C2C; }
        .header-center-link:hover { transform: scale(1.05); }
        header #toggleSidebar { background: none; border: none; font-size: 1.7rem; color: #2C2C2C; cursor: pointer; z-index: 15; padding: 5px; margin-right: 5px; line-height: 1; transition: color 0.2s; }
        header #toggleSidebar:hover { color: #111; }


        /* === Estilos Sidebar (Pílulas) === */
        .sidebar {
            display: flex;
            flex-direction: column;
            height: 100vh;
            position: fixed;
            top: 0;
            left: -300px;
            width: 260px;
            max-width: 85%;
            background-color: #f5f4f0; /* Fundo original mantido */
            color: #333;
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 1002;
            box-shadow: 4px 0 15px rgba(0,0,0,0.08);
            padding: 0;
        }
        .sidebar.active {
            left: 0;
        }

        .sidebar .top-bar {
            display: flex;
            align-items: center;
            padding: 15px;
            min-height: 70px;
            box-sizing: border-box;
            flex-shrink: 0;
            /* Sem borda inferior */
        }
        .sidebar .sidebar-title-link { text-decoration: none; color: inherit; display: inline-block; margin-left: 10px; }
        .sidebar h1#headerInside { font-size: 1.3rem; color: #333; margin: 0; font-weight: 600; }
        .sidebar #toggleSidebarInside { background: none; border: none; font-size: 1.7rem; color: #555; cursor: pointer; z-index: 15; padding: 5px; margin-right: 5px; line-height: 1; transition: color 0.2s; }
        .sidebar #toggleSidebarInside:hover { color: #111; }

        /* Navegação da Sidebar */
        .sidebar-navigation {
            padding: 15px 0px; /* Padding para dar espaço às pílulas */
            padding-right: 10px;
            display: flex;
            flex-direction: column;
            /* **** MODIFICAÇÃO: Reintroduz gap para espaçamento **** */
            gap: 8px;
            overflow-y: auto;
            flex-grow: 1;
        }

        .sidebar .sidebarBtn {
            font-family: 'Montserrat', sans-serif;
            background-color: transparent;
            border: none;
            color: #444;
            font-weight: 500;
            font-size: 1rem;
            /* **** MODIFICAÇÃO: Padding pode ser ajustado para estética da pílula **** */
            padding: 12px 20px !important;
            margin: 0px !important;
            display: flex;
            align-items: center;
            text-align: left;
            cursor: pointer;
            border-radius: 0 10px 10px 0; /* Cantos arredondados essenciais para a pílula */
            width: 100% !important;
            box-sizing: border-box;
            transition: color 0.2s ease, background-color 0.2s ease;
            /* **** REMOVIDO: border-top **** */
        }

         /* **** REMOVIDO: Regra para :first-child **** */

        .sidebar .sidebarBtn:hover {
             /* **** MODIFICAÇÃO: Hover com fundo pílula cinza claro **** */
            background-color: #f0f0f0;
            color: #333; /* Mantém texto escuro ou ajusta se necessário */
        }

        /* Estilo do Link Ativo (Pílula Roxa) */
        .sidebar .sidebarBtn.active-link {
            /* **** MODIFICAÇÃO: Fundo roxo sólido **** */
            background-color: #6735bc;
            /* **** MODIFICAÇÃO: Texto branco **** */
            color: #ffffff;
            font-weight: 600;
            box-shadow: 0 0 12px rgba(0, 0, 0, 0.3);
        }
        /* Hover do link ativo (opcional, pode manter igual ao ativo) */
         .sidebar .sidebarBtn.active-link:hover {
             background-color: #5e35b1; /* Escurece ligeiramente */
             color: #ffffff;
         }


        /* Estilos Overlay */
        .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.4); z-index: 1001; opacity: 0; pointer-events: none; transition: opacity 0.3s ease-in-out; }
        .overlay.active { opacity: 1; pointer-events: auto; }


        /* Estilos Botão de Ação (Perfil) */
        .header-action-btn { background: none; border: none; color: #444; font-size: 1.8rem; cursor: pointer; padding: 0; margin-left: 15px; line-height: 1; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; position: relative; overflow: hidden; transition: background-color 0.2s; }
        .header-action-btn:hover { background-color: rgba(0, 0, 0, 0.04); }
        #profileButton #profileImage { display: none; width: 38px; height: 38px; border-radius: 50%; object-fit: cover;
        outline: 12px outset #6735bc; /* Adiciona o contorno: espessura, estilo, cor */
        outline-offset: 1px; /* Opcional: Afasta o contorno da imagem */

    }
        #profileButton #profileIconFallback { display: block; }
    `;

    // Injeta CSS e HTML
    const styleElement = document.createElement('style');
    styleElement.textContent = sharedCSS;
    document.head.appendChild(styleElement);
    document.body.insertAdjacentHTML('afterbegin', overlayHTML);
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    document.body.insertAdjacentHTML('afterbegin', headerHTML);


    /* --- Lógica Sidebar, Overlay, Botão Perfil, Link Ativo (sem alterações) --- */
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const toggleBtnInside = document.getElementById('toggleSidebarInside');
    const overlay = document.getElementById('overlay');
    function closeSidebar() { if(sidebar)sidebar.classList.remove('active'); if(overlay)overlay.classList.remove('active'); }
    function openSidebar() { if(sidebar)sidebar.classList.add('active'); if(overlay)overlay.classList.add('active'); }
    if(toggleBtn) { toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); if (sidebar && sidebar.classList.contains('active')) closeSidebar(); else openSidebar(); }); }
    if(toggleBtnInside) { toggleBtnInside.addEventListener('click', (e) => { e.stopPropagation(); closeSidebar(); }); }
    if(overlay) { overlay.addEventListener('click', closeSidebar); }

    const profileBtn = document.getElementById('profileButton');
    const profileIconFallback = document.getElementById('profileIconFallback');
    const profileImage = document.getElementById('profileImage');
    function loadProfilePicOnButton() { /* ... código loadProfilePicOnButton ... */ const userInfo=getUserInfoFromStorage();if(userInfo&&userInfo.profilePicBase64&&profileBtn&&profileIconFallback&&profileImage){try{profileImage.src=userInfo.profilePicBase64;profileImage.style.display='block';profileIconFallback.style.display='none';console.log("Foto de perfil carregada no botão.")}catch(e){console.error("Erro ao definir src da imagem de perfil:",e);profileImage.style.display='none';profileIconFallback.style.display='block'}}else if(profileIconFallback&&profileImage){profileImage.style.display='none';profileIconFallback.style.display='block'}}
    loadProfilePicOnButton();
    if (profileBtn) {
        profileBtn.addEventListener('click', () => { window.location.href = 'perfil.html'; });
    }

    function setActiveSidebarLink() { /* ... código setActiveSidebarLink ... */ const currentPath=window.location.pathname.split('/').pop();const sidebarButtons=document.querySelectorAll('.sidebarBtn[data-target]');sidebarButtons.forEach(button=>{const targetFile=button.getAttribute('data-target');if(targetFile===currentPath||(currentPath===''&&targetFile==='index.html')){button.classList.add('active-link')}else{button.classList.remove('active-link')}})}
    setActiveSidebarLink();


    console.log("Header e Sidebar inicializados (v5 - Pílulas).");
});
