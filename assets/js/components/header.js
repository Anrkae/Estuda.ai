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
            <a href="index.html" class="header-center-link" aria-label="Ir para Início">
                <i class="fa-solid fa-graduation-cap"></i>
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
                <button onclick="window.location.href='questoes.html'" class="sidebarBtn" data-target="questoes.html">Questões</button>
                <button onclick="window.location.href='trilha.html'" class="sidebarBtn" data-target="trilha.html">Trilha</button>
                <button onclick="window.location.href='anotacoes.html'" class="sidebarBtn" data-target="anotacoes.html">Anotações</button>
                <button onclick="window.location.href='resumos.html'" class="sidebarBtn" data-target="resumos.html">Resumos</button>
                <button onclick="window.location.href='simulados.html'" class="sidebarBtn" data-target="simulados.html">Simulados</button>
                <button onclick="window.location.href='disciplinas.html'" class="sidebarBtn" data-target="disciplinas.html">Disciplinas</button>
                <button onclick="window.location.href='cronograma.html'" class="sidebarBtn" data-target="cronograma.html">Cronograma</button>
                <button onclick="window.location.href='perfil.html'" class="sidebarBtn" data-target="perfil.html">Perfil e Config.</button>
            </nav>
        </div>`;

    /* HTML do Overlay (sem alterações) */
    const overlayHTML = `<div id="overlay" class="overlay"></div>`;

    /* **** CSS Compartilhado (sem alteração) **** */
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
            z-index: 9990; justify-content: space-between;
            border-bottom: 1px solid #eee;
        }
        .header-left, .header-right { display: flex; align-items: center; }
        .header-center-link {
            line-height: 0; text-decoration: none;
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.2s ease;
            font-size: 1.7rem; color: #2C2C2C;
        }
        .header-center-link:hover { transform: scale(1.05); }
        header #toggleSidebar {
            background: none; border: none; font-size: 1.7rem;
            color: #2C2C2C; cursor: pointer; z-index: 15;
            padding: 5px; margin-right: 5px; line-height: 1;
            transition: color 0.2s;
        }
        header #toggleSidebar:hover { color: #111; }

        .sidebar {
            display: flex; flex-direction: column; height: 100vh;
            position: fixed; top: 0; left: -300px; width: 260px; max-width: 85%;
            background-color: #f5f4f0; color: #333;
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 9996; box-shadow: 4px 0 15px rgba(0,0,0,0.08); padding: 0;
        }
        .sidebar.active { left: 0; }

        .sidebar .top-bar {
            display: flex; align-items: center; padding: 15px;
            min-height: 70px; box-sizing: border-box; flex-shrink: 0;
        }
        .sidebar .sidebar-title-link { text-decoration: none; color: inherit; display: inline-block; margin-left: 10px; }
        .sidebar h1#headerInside { font-size: 1.3rem; color: #333; margin: 0; font-weight: 600; }
        .sidebar #toggleSidebarInside {
            background: none; border: none; font-size: 1.7rem;
            color: #555; cursor: pointer; z-index: 9996;
            padding: 5px; margin-right: 5px; line-height: 1;
            transition: color 0.2s;
        }
        .sidebar #toggleSidebarInside:hover { color: #111; }

        .sidebar-navigation {
            padding: 15px 0px; padding-right: 10px;
            display: flex; flex-direction: column; gap: 8px;
            overflow-y: auto; flex-grow: 1;
        }

        .sidebar .sidebarBtn {
            font-family: 'Montserrat', sans-serif;
            background-color: transparent; border: none;
            color: #444; font-weight: 500; font-size: 1rem;
            padding: 12px 20px !important; margin: 0px !important;
            display: flex; align-items: center; text-align: left;
            cursor: pointer; border-radius: 0 10px 10px 0;
            width: 100% !important; box-sizing: border-box;
            transition: color 0.2s ease, background-color 0.2s ease;
        }
        .sidebar .sidebarBtn:hover { background-color: #f0f0f0; color: #333; }
        .sidebar .sidebarBtn.active-link {
            background-color: #6c2fd6; color: #ffffff;
            font-weight: 600; box-shadow: 0 0 12px rgba(0, 0, 0, 0.3);
        }
        .sidebar .sidebarBtn.active-link:hover {
            background-color: #5e35b1; color: #ffffff;
        }

        .overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4); z-index: 9995;
            opacity: 0; pointer-events: none;
            transition: opacity 0.3s ease-in-out;
        }
        .overlay.active { opacity: 1; pointer-events: auto; }

        .header-action-btn {
            background: none; border: none; color: #444;
            font-size: 1.8rem; cursor: pointer; padding: 0;
            margin-left: 15px; line-height: 1; display: flex;
            align-items: center; justify-content: center;
            width: 40px; height: 40px; border-radius: 50%;
            position: relative; overflow: hidden;
            transition: background-color 0.2s;
        }
        .header-action-btn:hover { background-color: rgba(0, 0, 0, 0.04); }
        #profileButton #profileImage {
            display: none; width: 38px; height: 38px;
            border-radius: 50%; object-fit: cover;
            outline: 3px inset #6735bc; outline-offset: 1px;
        }
        #profileButton #profileIconFallback { display: block; }
        
        /* Container do menu */
        .tippy-box .tippy-menu {
          display: flex;
          flex-direction: column;
          background-color: #fff !important;
          padding: 8px 0;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          min-width: 160px;
        }
        
        /* Botões internos */
        .tippy-menu button {
          background: none;
          border: none;
          padding: 10px 16px;
          text-align: left;
          font-family: 'Montserrat', sans-serif;
          color: #333;
          cursor: pointer;
          transition: background 0.2s ease;
          width: 100%;
        }
        
        /* Hover dos botões */
        .tippy-menu button:hover {
          background-color: #f5f4f0;
          color: #6735bc;
        }
        
        /* Personaliza o container externo */
        .tippy - box[data - theme~ = 'light'] {
                background - color: transparent; /* ou remova o fundo se quiser só o .tippy-menu */
                box - shadow: none; /* se quiser remover sombra dupla */
                border: none;
                padding: 0;
            }
            
            /* Remove padding interno do conteúdo */
            .tippy - box.tippy - content {
                padding: 0!important; /* muito importante! */
            }
    `;

    // Injeta CSS e HTML
    const styleElement = document.createElement('style');
    styleElement.textContent = sharedCSS;
    document.head.appendChild(styleElement);
    document.body.insertAdjacentHTML('afterbegin', overlayHTML);
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    /* --- Lógica Sidebar, Overlay e Link Ativo (sem alterações) --- */
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const toggleBtnInside = document.getElementById('toggleSidebarInside');
    const overlay = document.getElementById('overlay');
    function closeSidebar() {
        sidebar?.classList.remove('active');
        overlay?.classList.remove('active');
    }
    function openSidebar() {
        sidebar?.classList.add('active');
        overlay?.classList.add('active');
    }
    toggleBtn?.addEventListener('click', e => {
        e.stopPropagation();
        sidebar?.classList.toggle('active');
        overlay?.classList.toggle('active');
    });
    toggleBtnInside?.addEventListener('click', e => {
        e.stopPropagation();
        closeSidebar();
    });
    overlay?.addEventListener('click', closeSidebar);

    /* --- Foto de Perfil no Botão --- */
    const profileBtn = document.getElementById('profileButton');
    const profileIconFallback = document.getElementById('profileIconFallback');
    const profileImage = document.getElementById('profileImage');
    function loadProfilePicOnButton() {
        const userInfo = getUserInfoFromStorage();
        if (userInfo?.profilePicBase64) {
            profileImage.src = userInfo.profilePicBase64;
            profileImage.style.display = 'block';
            profileIconFallback.style.display = 'none';
        } else {
            profileImage.style.display = 'none';
            profileIconFallback.style.display = 'block';
        }
    }
    loadProfilePicOnButton();

    /* --- Popup com Tippy.js --- */
    // carrega Tippy (JS + CSS) via CDN
    const tippyCss = document.createElement('link');
    tippyCss.rel = 'stylesheet';
    tippyCss.href = 'https://unpkg.com/tippy.js@6/dist/tippy.css';
    document.head.appendChild(tippyCss);

    const tippyScript = document.createElement('script');
    tippyScript.src = 'https://unpkg.com/@popperjs/core@2';
    tippyScript.onload = () => {
        const tippyScript2 = document.createElement('script');
        tippyScript2.src = 'https://unpkg.com/tippy.js@6';
        tippyScript2.onload = () => {
            // inicializa o tooltip
            tippy(profileBtn, {
                content: `
                    <div class="tippy-menu">
                        <button onclick="window.location.href='perfil.html#aba-perfil'"> Perfil</button>
                        <button onclick="window.location.href='perfil.html#aba-estatisticas'"> Estatísticas</button>
                        <button onclick="window.location.href='perfil.html#aba-missoes'"> Missões</button>
                        <button onclick="window.location.href='perfil.html#aba-configuracoes'"> Configurações</button>
                    </div>
                `,
                allowHTML: true,
                interactive: true,
                trigger: 'click',
                placement: 'bottom-end',
                animation: 'shift-away'
            });
        };
        document.body.appendChild(tippyScript2);
    };
    document.body.appendChild(tippyScript);

    /* --- Mantém link ativo na sidebar --- */
    function setActiveSidebarLink() {
        const current = window.location.pathname.split('/').pop();
        document.querySelectorAll('.sidebarBtn[data-target]').forEach(btn => {
            btn.classList.toggle('active-link', btn.dataset.target === (current || 'index.html'));
        });
    }
    setActiveSidebarLink();

    console.log("Header e Sidebar inicializados com popup de perfil.");
});