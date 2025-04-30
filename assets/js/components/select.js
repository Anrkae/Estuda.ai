// Arquivo: meu-select-script-data-attr.js
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM carregado, inicializando selects customizados via data-attributes...");

    // Seleciona todos os containers pelo atributo data-widget
    const todosOsSelects = document.querySelectorAll('[data-widget="meu-select"]');

    todosOsSelects.forEach(container => {
        // Seleciona elementos internos usando seletores de atributo DENTRO do container
        const gatilho = container.querySelector('[data-role="trigger"]');
        const painelOpcoes = container.querySelector('[data-role="options"]');
        const inputValor = container.querySelector('[data-role="value"]');
        const textoSelecionado = container.querySelector('[data-role="text"]');
        // Seleciona todas as opções dentro do painel específico
        const todasAsOpcoes = painelOpcoes.querySelectorAll('[data-role="option"]');

        // Verifica se todos os elementos essenciais foram encontrados
        if (!gatilho || !painelOpcoes || !inputValor || !textoSelecionado) {
            console.warn("Estrutura HTML (data-roles) incompleta encontrada para um select. Abortando:", container);
            return;
        }
        console.log("Inicializando select:", container);

        // --- Lógica de Abrir/Fechar, Selecionar, Fechar Fora, Fechar com ESC ---
        // A LÓGICA INTERNA É EXATAMENTE A MESMA DO SCRIPT ANTERIOR
        // Só mudou a forma como os elementos são selecionados no início.

        // Abrir/Fechar
        gatilho.addEventListener('click', (event) => {
            event.stopPropagation();
            // Alterna uma classe no container (ainda útil para estado CSS)
            container.classList.toggle('open');
            if (container.classList.contains('open')) {
                container.focus();
            }
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (event) => {
            if (container.classList.contains('open') && !container.contains(event.target)) {
                container.classList.remove('open');
            }
        });

        // Fechar com ESC
        container.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && container.classList.contains('open')) {
                container.classList.remove('open');
            }
        });

        // Selecionar Opção
        todasAsOpcoes.forEach(opcao => {
            opcao.addEventListener('click', () => {
                const valor = opcao.getAttribute('data-value'); // Pega o valor do data-value
                const texto = opcao.textContent;

                textoSelecionado.textContent = texto;
                inputValor.value = valor;

                // Remove a classe 'selecionada' de outras opções (se estiver usando)
                todasAsOpcoes.forEach(opt => opt.classList.remove('selecionada'));
                opcao.classList.add('selecionada'); // Adiciona classe na clicada

                container.classList.remove('open');
                inputValor.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`Opção selecionada: Texto=${texto}, Valor=${valor}`);
            });
        });
    });
});
