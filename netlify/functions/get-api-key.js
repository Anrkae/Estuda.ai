// netlify/functions/get-api-key.js
exports.handler = async function (event, context) {
    // Por segurança, idealmente você restringiria o acesso a esta função
    // (ex: checando um token secreto enviado pelo frontend, ou limitando origens).
    // Mas para o caso mais simples de apenas retornar a chave:

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("Chave GEMINI_API_KEY não encontrada nas variáveis de ambiente do Netlify.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Configuração de API Key ausente no servidor." }),
        };
    }

    return {
        statusCode: 200,
        // Retorna a chave dentro de um objeto JSON
        body: JSON.stringify({ apiKey: apiKey }),
    };
};
