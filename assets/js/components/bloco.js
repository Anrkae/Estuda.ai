// Conteúdo para bloco.js (ou script equivalente)

// Seleciona TODOS os blocos e adiciona a funcionalidade a cada um
const todosOsBlocos = document.querySelectorAll('.bloco');

function toggleMinimizado(bloco) {
    if (!bloco) return; // Segurança: Sai se o bloco não for válido

    bloco.classList.toggle('minimizado');

    const botao = bloco.querySelector('.botao-minimizar'); // Procura o botão DENTRO do bloco atual
    const icone = botao ? botao.querySelector('i') : null; // Procura o ícone DENTRO do botão

    if (icone) {
        const estaMinimizado = bloco.classList.contains('minimizado');

        // LÓGICA CORRIGIDA:
        if (estaMinimizado) {
            // Se ESTÁ minimizado, o botão deve mostrar "+" para expandir
            icone.classList.remove('fa-minus');
            icone.classList.add('fa-plus');
            if (botao) botao.setAttribute('aria-label', 'Expandir'); // Atualiza acessibilidade
        } else {
            // Se NÃO ESTÁ minimizado (está expandido), o botão deve mostrar "-" para minimizar
            icone.classList.remove('fa-plus');
            icone.classList.add('fa-minus');
            if (botao) botao.setAttribute('aria-label', 'Minimizar'); // Atualiza acessibilidade
        }
    }
}

// Adiciona listeners para cada bloco encontrado
todosOsBlocos.forEach(bloco => {
    const titulo = bloco.querySelector('.tituloBloco');
    const botao = bloco.querySelector('.botao-minimizar');

    // Listener para clique no título
    if (titulo) {
        titulo.addEventListener('click', function() {
            toggleMinimizado(bloco);
        });
        // Adiciona cursor pointer ao título via JS (alternativa ao CSS)
        titulo.style.cursor = 'pointer';
    }

    // Listener para clique no botão dedicado
    if (botao) {
        botao.addEventListener('click', function(event) {
            event.stopPropagation(); // Impede que o clique no botão acione o listener do título também
            toggleMinimizado(bloco);
        });
    }

    // Define o estado inicial do ícone para este bloco específico
    const botaoInicial = bloco.querySelector('.botao-minimizar');
    const iconeInicial = botaoInicial ? botaoInicial.querySelector('i') : null;
    if (iconeInicial) {
        if (bloco.classList.contains('minimizado')) {
            iconeInicial.classList.remove('fa-minus');
            iconeInicial.classList.add('fa-plus');
             if (botaoInicial) botaoInicial.setAttribute('aria-label', 'Expandir');
        } else {
            iconeInicial.classList.remove('fa-plus');
            iconeInicial.classList.add('fa-minus');
            if (botaoInicial) botaoInicial.setAttribute('aria-label', 'Minimizar');
        }
    }
});

