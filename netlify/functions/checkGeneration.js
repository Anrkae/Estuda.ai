// netlify/functions/checkGeneration.js
const { Redis } = require('@upstash/redis');

// --- Configuração Upstash Redis ---
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// === Handler da Função Check Generation ===
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
        // === Consulta o estado da tarefa no Redis ===
        // O log mostrou que isso retorna um OBJETO direto, não uma string JSON
        const task = await redis.get(`task:${taskId}`); // Agora esperamos receber o objeto aqui

        if (!task) { // Redis retorna null se key not found
            console.warn(`Task ID task:${taskId} not found in Redis.`);
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'NOT_FOUND', message: 'Task not found or expired.' })
            };
        }

        // === REMOVA ESTA LINHA QUE ESTÁ CAUSANDO O ERRO ===
        // const task = JSON.parse(taskString); // <-- REMOVER ESTA LINHA

        // O log mostrou que a variável que antes se chamava taskString
        // (e que agora chamamos apenas task) JÁ É o objeto JavaScript:
        // { status: 'PENDING', timestamp: '...', parameters: {...} }
        // Use 'task' diretamente.


        // === Remova os logs de debug que adicionamos ===
        // console.log(`[DEBUG] Task ${taskId}: Valor Lido do Redis (taskString):`, task); // Remova
        // console.log(`[DEBUG] Task ${taskId}: Tipo do Valor Lido do Redis:`, typeof task); // Remova
        // =============================================


        // === Retorna o estado atual da tarefa ===
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: task.status, // PENDING, COMPLETED, ERROR
                message: task.message, // Mensagem de erro se houver (lido do objeto task)
                data: task.data // Dados da questão se status for COMPLETED (lido do objeto task)
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
