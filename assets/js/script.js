// Função para alternar a visibilidade da sidebar
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    // Adiciona ou remove a classe 'open' para abrir/fechar a sidebar
    sidebar.classList.toggle('open');
}

// Função para fechar a sidebar se o usuário clicar fora dela
document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');

    // Verifica se o clique foi fora da sidebar e do botão de alternância
    if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
        sidebar.classList.remove('open');
    }
});
