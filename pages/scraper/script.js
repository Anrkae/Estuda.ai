let questoes = [];
let OPENROUTER_API_KEY = localStorage.getItem('openrouter_api_key') || "";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELO_IA = "qwen/qwq-32b:free";

// === MODAL ===
function abrirModalKey() {
  document.getElementById('modalKey').classList.remove('hidden');
  document.getElementById('apiKeyInput').value = OPENROUTER_API_KEY || "";
}

function fecharModalKey() {
  document.getElementById('modalKey').classList.add('hidden');
}

function salvarApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key.startsWith("sk-")) {
    alert("Chave inválida. Deve começar com 'sk-'");
    return;
  }
  OPENROUTER_API_KEY = key;
  localStorage.setItem('openrouter_api_key', key);
  fecharModalKey();
  alert("✅ Chave salva!");
}

// === UPLOAD JSON ===
document.getElementById('arquivoInput').addEventListener('change', function (event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      questoes = JSON.parse(e.target.result);
      document.getElementById('saidaIA').textContent = JSON.stringify(questoes.slice(0, 5), null, 2);
      carregarCamposDropdown();
    } catch (err) {
      document.getElementById('saidaIA').textContent = 'Erro ao ler JSON: ' + err.message;
    }
  };

  if (file) reader.readAsText(file);
});

// === IA ===
async function processarIA() {
  if (!OPENROUTER_API_KEY) {
    alert("Configure sua API Key primeiro.");
    abrirModalKey();
    return;
  }

  if (questoes.length === 0) {
    document.getElementById('saidaIA').textContent = 'Nenhuma questão carregada.';
    return;
  }

  document.getElementById('saidaIA').textContent = '🔄 Analisando com IA...';

  for (let i = 0; i < questoes.length; i++) {
    const q = questoes[i];
    if (q.resposta_correta && q.resolucao) continue;

    const prompt = gerarPrompt(q);
    const resposta = await enviarParaIA(prompt);
    if (resposta && resposta.resposta_correta) {
      q.resposta_correta = resposta.resposta_correta;
      q.resolucao = resposta.resolucao;
    }
  }

  document.getElementById('saidaIA').textContent = JSON.stringify(questoes.slice(0, 5), null, 2);
  navigator.clipboard.writeText(JSON.stringify(questoes, null, 2));
}

function gerarPrompt(q) {
  const texto = `Enunciado:\n${q.enunciado}\n\nAlternativas:\n` +
    q.opcoes.map(opt => `${opt.letra}) ${opt.texto}`).join("\n");

  return `${texto}\n\nInstrução:\nDiga apenas a letra correta e uma resolução concisa e direta.\nFormato da resposta:\n{\n  "resposta_correta": "X",\n  "resolucao": "..." \n}`;
}

async function enviarParaIA(prompt) {
  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODELO_IA,
        messages: [
          { role: "system", content: "Você é um corretor de questões objetivas." },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await resposta.json();
    const conteudo = data.choices?.[0]?.message?.content || "";

    try {
      const limpo = conteudo.trim()
        .replace(/^```json/i, '')
        .replace(/^```/, '')
        .replace(/```$/, '')
        .trim();
      return JSON.parse(limpo);
    } catch (e) {
      console.warn("Resposta inválida da IA:", conteudo);
      return null;
    }

  } catch (e) {
    console.warn("Erro IA:", e);
    return null;
  }
}

// === CAMPOS DINÂMICOS ===
function carregarCamposDropdown() {
  const dropdown = document.getElementById('campoDropdown');
  dropdown.innerHTML = `<option value="">Selecionar campo...</option>`;
  const campos = new Set();
  questoes.forEach(q => Object.keys(q).forEach(k => campos.add(k)));
  Array.from(campos).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    dropdown.appendChild(opt);
  });
}

function carregarValoresCampo() {
  const campo = document.getElementById('campoDropdown').value;
  const valores = new Set();
  const valorDropdown = document.getElementById('valorAtualDropdown');
  valorDropdown.innerHTML = `<option value="">Selecionar valor atual...</option>`;

  if (campo === "metadata") {
    document.getElementById('grupoSubcampo').classList.remove('hidden');

    const subcampos = new Set();
    questoes.forEach(q => {
      const meta = q.metadata || {};
      Object.keys(meta).forEach(k => subcampos.add(k));
    });

    const subcampoDropdown = document.getElementById('subcampoDropdown');
    subcampoDropdown.innerHTML = `<option value="">Selecionar subcampo...</option>`;
    Array.from(subcampos).forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = k;
      subcampoDropdown.appendChild(opt);
    });

    subcampoDropdown.onchange = () => {
      const chave = subcampoDropdown.value;
      const valoresMeta = new Set();
      questoes.forEach(q => {
        if (q.metadata && q.metadata[chave] !== undefined) {
          valoresMeta.add(q.metadata[chave]);
        }
      });

      valorDropdown.innerHTML = `<option value="">Selecionar valor atual...</option>`;
      Array.from(valoresMeta).forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        valorDropdown.appendChild(opt);
      });
    };

    return;
  }

  document.getElementById('grupoSubcampo').classList.add('hidden');
  questoes.forEach(q => {
    const valor = q[campo];
    if (Array.isArray(valor)) {
      valor.forEach(v => valores.add(v));
    } else if (typeof valor === 'object' && valor !== null) {
      valores.add(JSON.stringify(valor));
    } else {
      valores.add(valor);
    }
  });

  Array.from(valores).sort().forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    valorDropdown.appendChild(opt);
  });
}

// === SUBSTITUIÇÃO ===
function executarSubstituicao() {
  const campo = document.getElementById('campoDropdown').value;
  const valorAntigo = document.getElementById('valorAtualDropdown').value;
  const valorNovo = document.getElementById('valorNovoInput').value;
  const subcampo = document.getElementById('subcampoDropdown')?.value || null;

  if (!campo || !valorNovo) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  if (campo === "metadata" && subcampo) {
    substituirSubcampoMetadata(subcampo, valorAntigo, valorNovo);
  } else {
    substituirCampo(campo, valorAntigo, valorNovo);
  }
}

function substituirCampo(campo, valorAntigo, valorNovo) {
  let alteradas = 0;
  questoes.forEach(q => {
    if (Array.isArray(q[campo])) {
      const novaLista = q[campo].map(item => item === valorAntigo ? valorNovo : item);
      if (JSON.stringify(novaLista) !== JSON.stringify(q[campo])) {
        q[campo] = novaLista;
        alteradas++;
      }
    } else if (typeof q[campo] === 'object' && q[campo] !== null) {
      const stringAtual = JSON.stringify(q[campo]);
      if (stringAtual === valorAntigo) {
        try {
          q[campo] = JSON.parse(valorNovo);
          alteradas++;
        } catch {
          alert("❌ Novo valor inválido.");
        }
      }
    } else if (q[campo] === valorAntigo) {
      q[campo] = valorNovo;
      alteradas++;
    }
  });

  alert(`🔄 ${alteradas} registros alterados`);
  document.getElementById('saidaAdmin').textContent = JSON.stringify(questoes, null, 2);
}

function substituirSubcampoMetadata(chave, valorAntigo, valorNovo) {
  let alteradas = 0;
  questoes.forEach(q => {
    if (q.metadata && q.metadata[chave] == valorAntigo) {
      q.metadata[chave] = inferirTipo(valorNovo);
      alteradas++;
    }
  });

  alert(`🛠️ ${alteradas} registros alterados (metadata.${chave})`);
  document.getElementById('saidaAdmin').textContent = JSON.stringify(questoes, null, 2);
}

function inferirTipo(valor) {
  if (!isNaN(valor)) return Number(valor);
  if (valor === "true") return true;
  if (valor === "false") return false;
  return valor;
}

// === FUNÇÕES ADMIN ===
function definirDificuldadeParaVazias(valor) {
  let alteradas = 0;
  questoes.forEach(q => {
    if (!q.dificuldade || q.dificuldade === 'Desconhecida') {
      q.dificuldade = valor;
      alteradas++;
    }
  });
  alert(`⚙️ ${alteradas} atualizadas com dificuldade '${valor}'`);
  document.getElementById('saidaAdmin').textContent = JSON.stringify(questoes, null, 2);
}

function filtrarQuestoes() {
  const historia = questoes.filter(q => q.disciplina === 'História');
  document.getElementById('saidaAdmin').textContent = JSON.stringify(historia, null, 2);
}

function removerSemGabarito() {
  const filtradas = questoes.filter(q => !!q.resposta_correta);
  document.getElementById('saidaAdmin').textContent = JSON.stringify(filtradas, null, 2);
}

function copiarJSON() {
  const final = JSON.stringify(questoes, null, 2);
  navigator.clipboard.writeText(final)
    .then(() => alert("📋 JSON copiado"))
    .catch(() => alert("Erro ao copiar JSON"));
}

// === ABAS ===
function mostrarAba(n) {
  document.getElementById('aba1').classList.add('hidden');
  document.getElementById('aba2').classList.add('hidden');
  document.getElementById('aba1btn').classList.remove('tab-active');
  document.getElementById('aba2btn').classList.remove('tab-active');
  document.getElementById('aba1btn').classList.add('tab-inactive');
  document.getElementById('aba2btn').classList.add('tab-inactive');

  document.getElementById(`aba${n}`).classList.remove('hidden');
  document.getElementById(`aba${n}btn`).classList.remove('tab-inactive');
  document.getElementById(`aba${n}btn`).classList.add('tab-active');
}

// === EXPOSE FUNÇÕES GLOBALMENTE (porque script é type=module) ===
window.processarIA = processarIA;
window.abrirModalKey = abrirModalKey;
window.fecharModalKey = fecharModalKey;
window.salvarApiKey = salvarApiKey;
window.mostrarAba = mostrarAba;
window.executarSubstituicao = executarSubstituicao;
window.definirDificuldadeParaVazias = definirDificuldadeParaVazias;
window.filtrarQuestoes = filtrarQuestoes;
window.removerSemGabarito = removerSemGabarito;
window.copiarJSON = copiarJSON;
window.carregarValoresCampo = carregarValoresCampo;