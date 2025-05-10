// netlify/functions/chat-completion.js

// Importa o node-fetch se você estiver usando uma versão antiga do Node.js no Netlify (< 18)
// Se estiver no Node 18+, o fetch nativo já está disponível e esta linha é opcional.
// Verifique a configuração de runtime das suas funções no Netlify se tiver dúvidas.
// const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Permite apenas requisições POST, já que seu frontend usa POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  // === Obtém a chave de API das variáveis de ambiente SEGURAS do Netlify ===
  // NUNCA coloque a chave diretamente aqui! Use process.env
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterApiKey) {
    console.error("OPENROUTER_API_KEY não configurada nas variáveis de ambiente do Netlify.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: API key not set.' })
    };
  }

  try {
    // Analisa o corpo da requisição JSON enviado pelo frontend
    // Seu frontend envia um objeto com model, messages, temperature, max_tokens
    const requestBody = JSON.parse(event.body);

    // Validação básica do corpo recebido
    if (!requestBody || !requestBody.model || !requestBody.messages) {
         console.error("Corpo da requisição inválido recebido pela função:", requestBody);
         return {
             statusCode: 400,
             body: JSON.stringify({ error: 'Invalid request body: model and messages are required.' })
         };
    }


    // Prepara os headers para a requisição ao OpenRouter
    const headers = {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      // É uma boa prática enviar Referer e X-Title a partir da função também
      // Podemos tentar obter o Referer original do cliente, se disponível nos headers do evento
      'HTTP-Referer': event.headers.referer || 'https://seu-site-no-netlify.netlify.app', // Substitua pelo seu domínio Netlify
      'X-Title': 'Meu App de Questões (via Netlify Function)', // Um título descritivo
    };

    const OPENROUTER_API_URL = `https://openrouter.ai/api/v1/chat/completions`;

    // Faz a chamada para a API REAL do OpenRouter
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: headers,
      // Envia o corpo JSON recebido do frontend diretamente para o OpenRouter
      body: JSON.stringify(requestBody)
    });

    // Lida com respostas de erro da API do OpenRouter
    if (!response.ok) {
        const errorBodyText = await response.text();
        console.error(`OpenRouter API returned status ${response.status}:`, errorBodyText);
        let errorDetail = 'Unknown API error';
        try {
            const errorJson = JSON.parse(errorBodyText);
            errorDetail = errorJson.error?.message || errorJson.message || errorBodyText;
        } catch (parseError) {
            // Se não for JSON, usa o texto puro
            errorDetail = errorBodyText;
        }

        // Retorna o status e a mensagem de erro da API do OpenRouter para o frontend
        return {
            statusCode: response.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: `OpenRouter API Error (${response.status}): ${errorDetail}`,
                originalStatus: response.status,
                originalBody: errorBodyText
            })
        };
    }

    // Lê a resposta de SUCESSO da API do OpenRouter
    const data = await response.json();

    // Retorna a resposta COMPLETA da API de volta para o frontend
    // Seu frontend espera data.choices[0].message.content, então retornar 'data' funciona
    return {
      statusCode: 200, // Status de sucesso
      headers: {
        'Content-Type': 'application/json',
        // CORS headers (pode ser necessário dependendo de como você chama a função,
        // mas geralmente Netlify Functions já lidam bem com requisições do mesmo site)
        // 'Access-Control-Allow-Origin': '*', // Use com cuidado em produção
        // 'Access-Control-Allow-Methods': 'POST',
        // 'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Erro inesperado na Netlify Function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error processing your request.' })
    };
  }
};
