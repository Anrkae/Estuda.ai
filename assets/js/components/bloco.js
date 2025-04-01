// Dentro de bloco.js (substitua o conteúdo anterior)

const titulo = document.querySelector('.tituloBloco'); // Pega o PRIMEIRO título que encontrar
const blocoPai = document.querySelector('.bloco');     // Pega o PRIMEIRO bloco que encontrar

if (titulo && blocoPai) { // Verifica se encontrou os elementos
     titulo.addEventListener('click', function() {
         // Alterna a classe 'minimizado' diretamente no bloco
         blocoPai.classList.toggle('minimizado'); 

         // Teste visual extra (opcional):
         // alert("Clicou! Classe 'minimizado' agora está: " + blocoPai.classList.contains('minimizado'));
     });
}
