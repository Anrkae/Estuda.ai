const anotacoes = JSON.parse(localStorage.getItem('anotacoes')) || [];

function salvarAnotacoes() {
  localStorage.setItem('anotacoes', JSON.stringify(anotacoes));
}

function renderAnotacoes(tipo) {
  const container = document.getElementById(`lista-${tipo}`);
  container.innerHTML = '';
  anotacoes
    .filter(a => a.tipo === tipo)
    .forEach(a => {
      const div = document.createElement('div');
      div.className = 'anotacao';
      div.innerHTML = `
        <div class="anotacao-top">
          <strong>${a.titulo}</strong>
          <div class="acoes">
            <button class="editar" title="Editar" data-id="${a.id}"><i class="fas fa-edit"></i></button>
            <button class="excluir" title="Excluir" data-id="${a.id}"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
        <p>${a.conteudo}</p>
      `;
      container.appendChild(div);
    });
  
  // Eventos de editar
  container.querySelectorAll('.editar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const anotacao = anotacoes.find(a => a.id === id);
      const novoTitulo = prompt("Editar título:", anotacao.titulo);
      const novoConteudo = prompt("Editar conteúdo:", anotacao.conteudo);
      if (novoTitulo && novoConteudo) {
        anotacao.titulo = novoTitulo;
        anotacao.conteudo = novoConteudo;
        salvarAnotacoes();
        renderAnotacoes(anotacao.tipo);
      }
    });
  });
  
  // Eventos de excluir
  container.querySelectorAll('.excluir').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      if (confirm("Deseja excluir esta anotação?")) {
        const index = anotacoes.findIndex(a => a.id === id);
        const tipo = anotacoes[index].tipo;
        anotacoes.splice(index, 1);
        salvarAnotacoes();
        renderAnotacoes(tipo);
      }
    });
  });
}

document.getElementById('btnAdd').addEventListener('click', () => {
  const activeBtn = document.querySelector('.nav-btn.active');
  const tipo = activeBtn.dataset.tab;
  const titulo = prompt(`Título da anotação (${tipo})`);
  const conteudo = prompt(`Conteúdo da anotação (${tipo})`);
  if (titulo && conteudo) {
    anotacoes.push({ id: Date.now(), titulo, conteudo, tipo });
    salvarAnotacoes();
    renderAnotacoes(tipo);
  }
});

document.querySelectorAll('.busca').forEach(input => {
  input.addEventListener('input', () => {
    const tipo = input.dataset.type;
    const texto = input.value.toLowerCase();
    const container = document.getElementById(`lista-${tipo}`);
    container.innerHTML = '';
    anotacoes
      .filter(a => a.tipo === tipo && a.titulo.toLowerCase().includes(texto))
      .forEach(a => {
        const div = document.createElement('div');
        div.className = 'anotacao';
        div.innerHTML = `
          <div class="anotacao-top">
            <strong>${a.titulo}</strong>
            <div class="acoes">
              <button class="editar" title="Editar" data-id="${a.id}"><i class="fas fa-edit"></i></button>
              <button class="excluir" title="Excluir" data-id="${a.id}"><i class="fas fa-trash-alt"></i></button>
            </div>
          </div>
          <p>${a.conteudo}</p>
        `;
        container.appendChild(div);
      });
  });
});

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// Render inicial
['resumos', 'flashcards', 'mapas'].forEach(renderAnotacoes);