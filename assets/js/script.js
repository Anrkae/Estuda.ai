// Função para alternar o tema
function toggleTheme() {
  const themeSelector = document.getElementById("theme-selector");
  const theme = themeSelector.value;
  if (theme === "light") {
    document.body.classList.add("light-theme");
    document.body.classList.remove("dark-theme");
  } else {
    document.body.classList.add("dark-theme");
    document.body.classList.remove("light-theme");
  }
}

// Função para abrir a sidebar
function toggleSidebar() {
  const sidebar = document.getElementById("menuLateral");
  sidebar.style.width = "250px";
}

// Função para fechar a sidebar
function closeSidebar() {
  const sidebar = document.getElementById("menuLateral");
  sidebar.style.width = "0";
}

// Definindo o tema inicial conforme preferências do dispositivo
window.onload = function() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add("dark-theme");
    document.body.classList.remove("light-theme");
    document.getElementById("theme-selector").value = "dark";
  } else {
    document.body.classList.add("light-theme");
    document.body.classList.remove("dark-theme");
    document.getElementById("theme-selector").value = "light";
  }
};
