// File: netlify/functions/get-api-key.js

exports.handler = async (event, context) => {
  // Pega o valor da variável de ambiente que você configurou no painel do Netlify.
  const apiKey = process.env.MINHA_API_KEY;

  // Verifica se a variável de ambiente foi definida no Netlify.
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "A variável de ambiente da API Key não foi configurada no servidor." })
    };
  }

  // Retorna a chave em um objeto JSON, como o frontend espera.
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*" // Opcional, mas recomendado para evitar problemas de CORS.
    },
    body: JSON.stringify({ apiKey: apiKey })
  };
};
