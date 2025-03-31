document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Define HTML Structure ---
    const headerHTML = `
        <header>
            <button id="toggleSidebar"><i class="fas fa-bars"></i></button>
            <h1 id="header">Estuda.ai</h1>
        </header>`;

    const sidebarHTML = `
        <div id="sidebar" class="sidebar">
            <div class="top-bar">
                <button id="toggleSidebarInside"><i class="fas fa-bars"></i></button>
                <h1 id="headerInside">Estuda.ai</h1>
            </div>
            <div class="sidebarButtons">
                <button onclick="window.location.href='index.html'" class="sidebarBtn"><i class="fa-solid fa-house"></i> Inicio</button>
                <button onclick="window.location.href='disciplinas.html'" class="sidebarBtn"><i class="fa-regular fa-pen-to-square"></i> Disciplinas</button>
                <button onclick="window.location.href='cronograma.html'" class="sidebarBtn"><i class="fa-regular fa-calendar"></i> Cronograma</button>
            </div>
        </div>`;

    const overlayHTML = `<div id="overlay" class="overlay"></div>`;

    // --- 2. Define CSS Styles ---
    const sharedCSS = `
        /* Importação de Fonte */
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap');

        /* Estilos Globais para Body se necessário (como fonte base) */
        body {
            font-family: 'Montserrat', sans-serif;
            /* Padding top para header fixo é importante estar no CSS principal ou da página */
        }

        /* Header Fixo */
        header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 70px;
            background-color: rgba(255, 255, 255, 0.3);
            display: flex;
            align-items: center;
            padding: 0 1rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            z-index: 1000;
        }
        header h1#header { /* ID específico */
            margin: 0;
            font-size: 1.4rem;
            margin-left: 15px;
            color: #333; /* Ajuste cor se necessário */
            font-weight: 600;
        }
         /* Estilo para o botão toggle PRINCIPAL no header */
        header #toggleSidebar {
            background: none;
            border: none;
            font-size: 1.8rem;
            color: #6735bc;
            cursor: pointer;
            z-index: 15; /* Acima da sidebar quando fechada */
            padding: 5px;
            margin-right: 10px;
            line-height: 1;
        }
         header #toggleSidebar.active { /* Aparência do botão quando sidebar está aberta */
            /* Pode adicionar estilos aqui, ex: color: black; */
         }


        /* Sidebar */
        .sidebar {
            display: flex;
            flex-direction: column;
            height: 100vh;
            position: fixed;
            top: 0;
            left: -290px; /* Começa fora da tela */
            width: 250px;
            max-width: 80%; /* Limite em telas pequenas */
            background-color: #f8f8f7; /* Cor ligeiramente diferente */
            color: #474c5f;
            transition: left 0.35s ease-in-out; /* Transição suave */
            padding: 1rem;
            padding-top: 0;
            z-index: 1002; /* Acima do overlay */
            box-shadow: 3px 0 6px rgba(0,0,0,0.1); /* Sombra lateral */
        }
        .sidebar.active {
            left: 0; /* Mostra a sidebar */
        }
        .sidebar .top-bar {
            display: flex;
            align-items: center;
            margin-bottom: 20px; /* Aumenta espaço */
            padding-top: 15px; /* Espaçamento superior */
            border-bottom: 1px solid #eee; /* Linha divisória */
            padding-bottom: 10px;
        }
         /* Estilo para o H1 DENTRO da sidebar */
        .sidebar h1#headerInside {
            font-size: 1.4rem; /* Consistente com header */
            color: #542aa3;
            margin: 0;
            margin-left: 15px; /* Consistente */
            font-weight: 600;
        }
         /* Estilo para o botão toggle DENTRO da sidebar */
         .sidebar #toggleSidebarInside {
            background: none;
            border: none;
            font-size: 1.8rem;
            color: #6735bc;
            cursor: pointer;
            z-index: 15;
            padding: 5px;
            margin-right: 10px;
            line-height: 1;
         }

        .sidebar .sidebarButtons {
            margin-top: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px; /* Espaço entre botões */
        }
        .sidebar .sidebarBtn {
            background: none;
            border: none; /* Remove borda padrão do botão */
            color: #474c5f;
            font-weight: 500; /* Peso médio */
            font-size: 1rem; /* Tamanho */
            padding: 10px 15px; /* Padding */
            display: flex;
            align-items: center; /* Alinha ícone e texto */
            gap: 15px; /* Espaço entre ícone e texto */
            text-align: left; /* Alinha texto à esquerda */
            cursor: pointer;
            border-radius: 6px;
            transition: background-color 0.2s ease, color 0.2s ease;
        }
        .sidebar .sidebarBtn:hover {
            background-color: #e8eaf6; /* Fundo suave no hover */
            color: #542aa3; /* Cor roxa no hover */
        }
        .sidebar .sidebarBtn i {
             width: 20px; /* Largura fixa para ícones */
             text-align: center; /* Centraliza ícone */
             font-size: 1.1em; /* Tamanho do ícone */
        }


        /* Overlay */
        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1001; /* Abaixo da sidebar, acima do conteúdo */
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.35s ease-in-out;
        }
        .overlay.active {
            opacity: 1;
            pointer-events: auto;
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = sharedCSS;
    document.head.appendChild(styleElement);

    document.body.insertAdjacentHTML('afterbegin', overlayHTML);
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    document.body.insertAdjacentHTML('afterbegin', headerHTML);


    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const toggleBtnInside = document.getElementById('toggleSidebarInside');
    // const toggleHeader = document.getElementById('header'); // O H1 do header principal
    const overlay = document.getElementById('overlay');

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('active');
        // if (toggleHeader) toggleHeader.classList.remove('active');
        if (toggleBtn) toggleBtn.classList.remove('active'); // Resetar botão principal
        if (overlay) overlay.classList.remove('active');
    }

    function openSidebar() {
         if (sidebar) sidebar.classList.add('active');
         // if (toggleHeader) toggleHeader.classList.add('active');
         if (toggleBtn) toggleBtn.classList.add('active');
         if (overlay) overlay.classList.add('active');
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (sidebar.classList.contains('active')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (toggleBtnInside) {
        toggleBtnInside.addEventListener('click', (e) => {
            e.stopPropagation();
             // O botão interno sempre fecha (ou pode ter a mesma lógica do toggle principal)
             closeSidebar();
            // OU: sidebar.classList.toggle('active'); overlay.classList.toggle('active'); etc.
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

}); // End DOMContentLoaded


