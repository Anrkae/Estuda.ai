const fs = require('fs');
const path = '/pages/questoes.html'; // Ajuste esse caminho se o HTML estiver em outra pasta

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error('Erro: variável OPENROUTER_API_KEY não definida.');
  process.exit(1);
}

let html = fs.readFileSync(path, 'utf-8');

html = html.replace('__OPENROUTER_API_KEY__', apiKey);

fs.writeFileSync(path, html);

console.log('Chave da OpenRouter injetada com sucesso no questoes.html!');
