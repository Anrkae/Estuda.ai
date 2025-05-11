// Conteúdo para bloco.js (ou script equivalente)

// --- CÓDIGO PARA INJETAR O CSS DE ANIMAÇÃO (MANTIDO POIS JÁ ROTACIONA O ÍCONE) ---
const style = document.createElement('style');
style.textContent = `
/* CSS injetado pelo JavaScript para animação do ícone */
.bloco .btn-toggle-bloco i {
  /* Adiciona uma transição suave para transform (rotação) */
  transition: transform 0.3s ease-in-out;
  /* Define a rotação inicial (estado expandido) - + horizontal */
  /* Para um '+' que vira '-', o estado expandido deve ser 90deg */
  transform: rotate(225deg); /* Estado 'menos' visual */
}

.minimizado .conteudo-bloco {
    display: none;
} /* Minimizar o bloco */

.tituloBloco {
    margin-top: 0px;
    margin-bottom: -3px;
    text-align: left;
}

.tituloBtn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer; /* Opcional */
}

.botao-minimizar {
    color: #2C2C2C;
    background: none;
    font-size: 1.3rem;
    border: none;
}

.botao-minimizar:hover {
    background: none !important;
    box-shadow: 0 0 0 !important;
}


/* Estilos do ícone quando o bloco pai tem a classe 'minimizado' */
.bloco.minimizado .botao-minimizar i {
  /* Rotaciona o ícone (ex: - para + visualmente) */
  /* Quando minimizado, o + rotaciona para 0deg (estado 'mais' visual) */
  transform: rotate(0deg); /* Estado 'mais' visual */
}

/* Opcional: Adiciona cursor pointer ao botão se ele não for um <button> nativo */
.bloco .botao-minimizar {
    cursor: pointer;
}
/* Adicionar transição para altura ou max-height do bloco pode complementar a animação */
/* Exemplo básico (requer ajuste fino com seu layout) */
/* .bloco {
    transition: max-height 0.3s ease-in-out;
    max-height: 500px; // Altura expandida (valor grande o suficiente)
    overflow: hidden; // Esconde o conteúdo extra
}
.bloco.minimizado {
    max-height: 40px; // Altura do cabeçalho minimizado
} */
`; // Fim do conteúdo CSS

document.head.appendChild(style);
// --- FIM: CÓDIGO PARA INJETAR O CSS DE ANIMAÇÃO ---


// Seleciona TODOS os blocos e adiciona a funcionalidade a cada um
const todosOsBlocos = document.querySelectorAll('.bloco');

function toggleMinimizado(bloco) {
    if (!bloco) return; // Segurança: Sai se o bloco não for válido

    // Apenas alterna a classe de estado no bloco principal
    bloco.classList.toggle('minimizado');

    const botao = bloco.querySelector('.botao-minimizar'); // Procura o botão DENTRO do bloco atual
    // Não precisamos mais procurar o ícone para trocar as classes fa-minus/fa-plus
    // const icone = botao ? botao.querySelector('i') : null;

    // Agora, apenas atualizamos o aria-label do botão
    if (botao) {
        const estaMinimizado = bloco.classList.contains('minimizado');

        if (estaMinimizado) {
            // Se ESTÁ minimizado, o botão tem a função de Expandir
            botao.setAttribute('aria-label', 'Expandir');
        } else {
            // Se NÃO ESTÁ minimizado, o botão tem a função de Minimizar
            botao.setAttribute('aria-label', 'Minimizar');
        }
        // O CSS gerencia a rotação visual do ícone único
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
            // Impede que o clique no botão 'suba' e acione o listener do título também
            event.stopPropagation();
            toggleMinimizado(bloco);
        });
    }

    // Define o estado inicial da acessibilidade (aria-label) ao carregar
    // Não precisamos mais ajustar classes de ícone fa-plus/fa-minus aqui
    const botaoInicial = bloco.querySelector('.botao-minimizar');
     if (botaoInicial) {
        if (bloco.classList.contains('minimizado')) {
            // Se começa minimizado, o label deve ser 'Expandir'
             botaoInicial.setAttribute('aria-label', 'Expandir');
             // O CSS já cuida da rotação inicial do ícone com base na classe 'minimizado'
        } else {
            // Se começa expandido, o label deve ser 'Minimizar'
            botaoInicial.setAttribute('aria-label', 'Minimizar');
             // O CSS já cuida da rotação inicial do ícone
        }
    }
});
