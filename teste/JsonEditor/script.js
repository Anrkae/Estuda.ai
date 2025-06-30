// script.js COMPLETO com suporte a Cropper.js para recorte manual

let questoes = JSON.parse(localStorage.getItem("questoes") || "[]");
let idAtual = questoes.length > 0 ? Math.max(...questoes.map(q => q.id)) + 1 : 241;

const form = document.getElementById("questionForm");
const output = document.getElementById("jsonOutput");
const lista = document.getElementById("listaQuestoes");
const statusMsg = document.getElementById("statusMsg");
const pdfTextArea = document.getElementById("pdfText");
const imageContainer = document.getElementById("pdfImages");
const imagemSelect = document.getElementById("imagemSelect");
const removerPdfBtn = document.getElementById("removerPdf");

let imagensExtraidas = [];

// Leitura do PDF: texto + imagens

const renderizarPaginasPdf = async (arrayBuffer) => {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  imageContainer.innerHTML = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL();

    const img = document.createElement("img");
    img.src = dataUrl;
    img.title = `Clique para recortar imagem da página ${i}`;
    img.style.maxWidth = "120px";
    img.style.cursor = "pointer";
    img.addEventListener("click", () => abrirCropModal(dataUrl));
    imageContainer.appendChild(img);
  }
};

document.getElementById("pdfInput").addEventListener("change", async function() {
  const file = this.files[0];
  if (!file) return;

  removerPdfBtn.style.display = "inline-block";
  pdfTextArea.value = "";
  imagemSelect.innerHTML = '<option value="">Sem imagem</option>';
  imageContainer.innerHTML = "";
  imagensExtraidas = [];

  const arrayBuffer = await file.arrayBuffer();
  const texto = await extrairTextoPdf(arrayBuffer);
  pdfTextArea.value = texto;
  await renderizarPaginasPdf(arrayBuffer);
  statusMsg.textContent = "Clique em uma imagem para recortar manualmente.";
});

removerPdfBtn.addEventListener("click", () => {
  document.getElementById("pdfInput").value = "";
  pdfTextArea.value = "";
  imagemSelect.innerHTML = '<option value="">Sem imagem</option>';
  imageContainer.innerHTML = "";
  removerPdfBtn.style.display = "none";
  imagensExtraidas = [];
  statusMsg.textContent = "";
});

async function extrairTextoPdf(arrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let textoCompleto = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const lines = [];
    let currentY = null;
    let currentLine = [];

    for (const item of textContent.items) {
      const y = item.transform[5];
      if (currentY === null || Math.abs(currentY - y) > 5) {
        if (currentLine.length) lines.push(currentLine.join(" "));
        currentLine = [item.str];
        currentY = y;
      } else {
        currentLine.push(item.str);
      }
    }
    if (currentLine.length) lines.push(currentLine.join(" "));
    textoCompleto += lines.join("\n") + "\n\n";
  }
  return textoCompleto.trim();
}

// ==== RECORTE MANUAL COM CROPPER ====
let cropper = null;
const cropModal = document.getElementById("cropModal");
const cropImage = document.getElementById("cropImage");
const cropConfirm = document.getElementById("cropConfirm");

function abrirCropModal(dataUrl) {
  cropImage.src = dataUrl;
  cropModal.style.display = "flex";
  cropImage.onload = () => {
    cropper?.destroy?.();
    cropper = new Cropper(cropImage, {
      aspectRatio: NaN,
      viewMode: 1,
      movable: true,
      zoomable: true
    });
  };
}

function fecharCropModal() {
  cropper?.destroy?.();
  cropper = null;
  cropModal.style.display = "none";
}

cropConfirm.addEventListener("click", () => {
  if (!cropper) return;
  const canvas = cropper.getCroppedCanvas();
  const dataUrl = canvas.toDataURL("image/png");
  const disciplina = form.disciplina.value.toLowerCase().replace(/\s+/g, '') || "disciplina";
  const nome = `${disciplina}${idAtual}.png`;
  const opt = new Option(nome, `../assets/data/img/questoes/${nome}`);
  imagemSelect.appendChild(opt);
  imagemSelect.value = opt.value;

  const imgEl = document.createElement("img");
  imgEl.src = dataUrl;
  imgEl.alt = nome;
  imgEl.title = nome;
  imgEl.style.maxWidth = "120px";
  imgEl.style.border = "2px solid green";
  imageContainer.appendChild(imgEl);

  fecharCropModal();
  statusMsg.textContent = `Imagem recortada salva como ${nome}`;
});

// === SALVAR QUESTÕES ===
form.addEventListener("submit", function(e) {
  e.preventDefault();
  const data = new FormData(form);
  const editId = data.get("editandoId");
  const questaoId = editId ? parseInt(editId) : idAtual;

  const imagemSelecionada = data.get("imagem_url");
  let imagemPath = imagemSelecionada || "";

  const questao = {
    id: questaoId,
    contexto: data.get("contexto") || undefined,
    enunciado: data.get("enunciado"),
    imagem_url: imagemPath || undefined,
    disciplina: data.get("disciplina"),
    assunto: data.get("assunto"),
    dificuldade: data.get("dificuldade"),
    tipo: data.get("tipo"),
    metadata: {
      fonte: data.get("fonte"),
      ano: parseInt(data.get("ano")),
    },
    opcoes: [
      { letra: "A", texto: data.get("opcaoA") },
      { letra: "B", texto: data.get("opcaoB") },
      { letra: "C", texto: data.get("opcaoC") },
      { letra: "D", texto: data.get("opcaoD") },
      { letra: "E", texto: data.get("opcaoE") },
    ],
    resposta_correta: data.get("resposta_correta"),
    resolucao: data.get("resolucao"),
  };

  if (editId) {
    const idx = questoes.findIndex(q => q.id == editId);
    if (idx >= 0) questoes[idx] = questao;
  } else {
    questoes.push(questao);
    idAtual++;
  }

  form.reset();
  atualizarJsonOutput();
  renderListaQuestoes();
  statusMsg.textContent = editId ? "Questão atualizada!" : "Questão adicionada!";
  setTimeout(() => (statusMsg.textContent = ""), 2000);
});

function atualizarJsonOutput() {
  output.textContent = JSON.stringify(questoes, null, 2);
  localStorage.setItem("questoes", JSON.stringify(questoes));
}

function renderListaQuestoes() {
  lista.innerHTML = "";
  questoes.forEach(q => {
    const div = document.createElement("div");
    div.className = "questao-item";
    div.innerHTML = `
      <b>#${q.id}</b> - <i>${q.enunciado?.slice(0, 80) || ''}...</i><br>
      <button onclick="editarQuestao(${q.id})">Editar</button>
      <button onclick="removerQuestao(${q.id})">Remover</button>
      <button onclick="copiarQuestao(${q.id})">Copiar JSON</button>
    `;
    lista.appendChild(div);
  });
}

window.editarQuestao = function(id) {
  const q = questoes.find(q => q.id === id);
  if (!q) return;
  form.contexto.value = q.contexto || "";
  form.enunciado.value = q.enunciado;
  form.imagem_url.value = q.imagem_url || "";
  form.disciplina.value = q.disciplina;
  form.assunto.value = q.assunto;
  form.dificuldade.value = q.dificuldade;
  form.tipo.value = q.tipo;
  form.fonte.value = q.metadata.fonte;
  form.ano.value = q.metadata.ano;
  form.opcaoA.value = q.opcoes[0]?.texto || "";
  form.opcaoB.value = q.opcoes[1]?.texto || "";
  form.opcaoC.value = q.opcoes[2]?.texto || "";
  form.opcaoD.value = q.opcoes[3]?.texto || "";
  form.opcaoE.value = q.opcoes[4]?.texto || "";
  form.resposta_correta.value = q.resposta_correta;
  form.resolucao.value = q.resolucao;
  form.editandoId.value = q.id;
  form.querySelector("button").textContent = "Atualizar Questão";
  document.getElementById("formTitle").textContent = `Editando questão #${q.id}`;
};

window.removerQuestao = function(id) {
  if (!confirm("Tem certeza que deseja excluir esta questão?")) return;
  questoes = questoes.filter(q => q.id !== id);
  atualizarJsonOutput();
  renderListaQuestoes();
};

window.copiarQuestao = function(id) {
  const q = questoes.find(q => q.id === id);
  if (q) {
    const texto = JSON.stringify(q, null, 2);
    navigator.clipboard.writeText(texto).then(() => {
      alert("Questão copiada para a área de transferência!");
    });
  }
};

renderListaQuestoes();