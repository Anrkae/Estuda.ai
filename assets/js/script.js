// Verifica o tema preferido do usuário e aplica
const body = document.body;
const themeToggle = document.querySelector('.theme-toggle');
const savedTheme = localStorage.getItem('theme');

// Aplica o tema salvo ou usa o preferido pelo sistema
if (savedTheme) {
  body.classList.add(savedTheme);
} else {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    body.classList.add('dark');
  } else {
    body.classList.add('light');
  }
}

// Alterna entre tema claro e escuro
themeToggle.addEventListener('click', () => {
  if (body.classList.contains('dark')) {
    body.classList.replace('dark', 'light');
    localStorage.setItem('theme', 'light');
  } else {
    body.classList.replace('light', 'dark');
    localStorage.setItem('theme', 'dark');
  }
});

// Funções para abrir e fechar o menu lateral
function abrirMenu() {
  document.getElementById("menu-lateral").style.width = "250px";
}

function fecharMenu() {
  document.getElementById("menu-lateral").style.width = "0";
}
