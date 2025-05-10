const fs = require('fs');
const path = './caminho/para/questoes.html'; // Ex: './public/questoes.html'

let html = fs.readFileSync(path, 'utf-8');
html = html.replace('__OPENROUTER_API_KEY__', process.env.OPENROUTER_API_KEY);
fs.writeFileSync(path, html);

console.log('API Key injetada no HTML!');
