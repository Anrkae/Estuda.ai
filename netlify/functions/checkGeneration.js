// netlify/functions/checkGeneration.js

const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

     if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
         console.error("Credenciais Upstash Redis não configuradas!");
         return { statusCode: 500, body: JSON.stringify({ error: 'Erro de configuração do servidor: Credenciais de armazenamento não encontradas.' }) };
     }

    const taskId = event.queryStringParameters.taskId;

    if (!taskId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Task ID parameter missing' }) };
    }

    try {
        const taskString = await redis.get(`task:${taskId}`);

        if (!taskString) {
            console.warn(`Task ID task:${taskId} not found in Redis.`);
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'NOT_FOUND', message: 'Task not found or expired.' })
            };
        }

        // === ADICIONE ESTE LOG AQUI ===
        console.log(`[DEBUG] Task ${taskId}: Valor Lido do Redis (taskString):`, taskString);
        console.log(`[DEBUG] Task ${taskId}: Tipo do Valor Lido do Redis:`, typeof taskString);
        // ==============================


        const task = JSON.parse(taskString); // Linha que está dando erro

        // ... restante do código ...
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: task.status, // PENDING, COMPLETED, ERROR
                message: task.message, // Mensagem de erro se houver
                data: task.data // Dados da questão se status for COMPLETED
            })
        };


    } catch (error) {
        console.error(`Erro interno do servidor ao verificar status da tarefa ${taskId} no Redis:`, error);
         return {
             statusCode: 500,
             body: JSON.stringify({ status: 'ERROR', message: 'Erro interno ao verificar status da tarefa.' })
         };
    }
};
