document.addEventListener('DOMContentLoaded', () => {

    const headerHTML = `
        <header>
            <div class="header-left">
                <button id="toggleSidebar"><i class="fas fa-bars"></i></button>
                <h1 id="header">Estuda.ai</h1>
            </div>
            <div class="header-right">
                <button id="profileButton" class="header-action-btn" aria-label="Perfil">
                    <i class="fas fa-user-circle"></i>
                </button>
            </div>
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

    const sharedCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap');

        body {
            font-family: 'Montserrat', sans-serif;
        }

        header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 70px;
            background-color: #f5f4f0;
            display: flex;
            align-items: center;
            padding: 0 1rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            z-index: 1000;
            justify-content: space-between;
        }
        header h1#header {
            margin: 0;
            font-size: 1.4rem;
            margin-left: 15px;
            color: #542aa3;
            font-weight: 600;
        }
        header #toggleSidebar {
            background: none;
            border: none;
            font-size: 1.8rem;
            color: #6735bc;
            cursor: pointer;
            z-index: 15;
            padding: 5px;
            margin-right: 0;
            line-height: 1;
        }
         header #toggleSidebar.active {
         }

        .sidebar {
            display: flex;
            flex-direction: column;
            height: 100vh;
            position: fixed;
            top: 0;
            left: -290px;
            width: 250px;
            max-width: 80%;
            background-color: #f8f8f7;
            color: #474c5f;
            transition: left 0.35s ease-in-out;
            padding: 1rem;
            padding-top: 0;
            z-index: 1002;
            box-shadow: 3px 0 6px rgba(0,0,0,0.1);
        }
        .sidebar.active {
            left: 0;
        }
        .sidebar .top-bar {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-top: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        .sidebar h1#headerInside {
            font-size: 1.4rem;
            color: #542aa3;
            margin: 0;
            margin-left: 15px;
            font-weight: 600;
        }
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
            display: flex;
            flex-direction: column;
        }
        .sidebar .sidebarBtn {
            background: none;
            border: none;
            color: #474c5f;
            font-weight: 500;
            font-size: 1rem;
            padding: 10px 15px;
            display: flex;
            align-items: center;
            gap: 15px;
            text-align: left;
            cursor: pointer;
            border-radius: 6px;
            transition: background-color 0.2s ease, color 0.2s ease;
        }
        .sidebar .sidebarBtn:hover {
            background-color: #e8eaf6;
            color: #542aa3;
        }
        .sidebar .sidebarBtn i {
             width: 20px;
             text-align: center;
             font-size: 1.1em;
        }

        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1001;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.35s ease-in-out;
        }
        .overlay.active {
            opacity: 1;
            pointer-events: auto;
        }

        .header-left {
            display: flex;
            align-items: center;
        }
        .header-right {
            display: flex;
            align-items: center;
        }
        .header-action-btn {
            background: none;
            border: none;
            color: #6735bc;
            font-size: 1.9rem;
            cursor: pointer;
            padding: 5px;
            margin-left: 15px;
            line-height: 1;
        }
        .header-action-btn:hover {
            color: #542aa3;
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
    const overlay = document.getElementById('overlay');

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('active');
        if (toggleBtn) toggleBtn.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    function openSidebar() {
         if (sidebar) sidebar.classList.add('active');
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
             closeSidebar();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    const profileBtn = document.getElementById('profileButton');

    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            window.location.href = 'perfil.html';
        });
    }

});
