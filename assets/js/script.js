// Atraso na inicialização para garantir que o DOM esteja completamente carregado
document.addEventListener("DOMContentLoaded", function() {

    // Variáveis para capturar a interação do toque com o carrossel
    const carousel = document.querySelector('.carousel');
    let isTouching = false;
    let startX = 0;
    let scrollLeft = 0;

    // Função que gerencia o início do toque
    carousel.addEventListener('touchstart', (e) => {
        isTouching = true;
        startX = e.touches[0].pageX;
        scrollLeft = carousel.scrollLeft;
    });

    // Função que gerencia o movimento de arrasto do toque
    carousel.addEventListener('touchmove', (e) => {
        if (!isTouching) return;
        const moveX = e.touches[0].pageX;
        const distance = startX - moveX;
        carousel.scrollLeft = scrollLeft + distance;
    });

    // Função para gerenciar o fim do toque
    carousel.addEventListener('touchend', () => {
        isTouching = false;
    });

    // Se o dispositivo for desktop, permite a rolagem com o mouse (ou no caso do touchpad)
    carousel.addEventListener('mousedown', (e) => {
        isTouching = true;
        startX = e.pageX;
        scrollLeft = carousel.scrollLeft;
    });

    // Continua o movimento do mouse (no desktop) para mover o carrossel
    carousel.addEventListener('mousemove', (e) => {
        if (!isTouching) return;
        const moveX = e.pageX;
        const distance = startX - moveX;
        carousel.scrollLeft = scrollLeft + distance;
    });

    // Termina o movimento do mouse (no desktop)
    carousel.addEventListener('mouseup', () => {
        isTouching = false;
    });

    // Se o mouse sair da área do carrossel, também termina a interação
    carousel.addEventListener('mouseleave', () => {
        isTouching = false;
    });

    // Evitar que a página seja rolada ao usar o toque no carrossel
    document.addEventListener("touchstart", function(e) {
        if (e.target.closest('.carousel')) {
            e.stopPropagation(); // Impede a interferência no carrossel
        }
    }, { passive: true });

    // Permite a rolagem da página fora do carrossel
    document.addEventListener("touchmove", function(e) {
        if (!e.target.closest('.carousel')) {
            e.preventDefault(); // Permite a rolagem da página fora do carrossel
        }
    }, { passive: false });

});
