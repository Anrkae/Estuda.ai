// netlify/functions/checkGeneration.js

// --- Placeholder para Armazenamento de Estado (NÃO USE ISSO EM PRODUÇÃO) ---
// Precisa ser o MESMO mecanismo de armazenamento que startGeneration.js acessa.
// Em produção, use um banco de dados real, K/V store (como Upstash Redis, FaunaDB, etc.)
// IMPORTANTE: Este objeto será limpo a cada nova instância da função!
const taskStorage = {}; // <<< ISSO NÃO FUNCIONA ENTRE INSTÂNCIAS DIFERENTES DA FUNÇÃO! USE SERVIÇO EXTERNO REAL! >>>

async function getTaskState(taskId) {
     console.log(`[STORAGE] Getting state for ${taskId}`);
     // >>> SUBSTITUIR POR LÓGICA DE BANCO DE DADOS/ARMAZENAMENTO EXTERNO REAL <<<
     // Ex: return await yourDatabaseService.get(taskId);
     return taskStorage[taskId]; // Simulação - LEMBRE: NÃO FUNCIONA ENTRE INSTÂNCIAS REAIS
     // <<< FIM SUBSTITUIÇÃO >>>
}
// --- Fim Placeholder de Armazenamento ---

// === Handler da Função Check Generation ===
exports.handler = async function(event, context) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // Obtém o ID da tarefa dos parâmetros da URL
    const taskId = event.queryStringParameters.taskId;

    if (!taskId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Task ID parameter missing' }) };
    }

    try {
        // === Consulta o estado da tarefa ===
        const task = await getTaskState(taskId);

        if (!task) {
            // Tarefa não encontrada (ID inválido ou expirou no armazenamento)
            console.warn(`Task ID ${taskId} not found in storage.`);
            return {
                statusCode: 404, // Not Found
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'NOT_FOUND', message: 'Task not found or expired.' })
            };
        }

        // === Retorna o estado atual da tarefa ===
        // Inclui os dados se a tarefa estiver completa ou a mensagem de erro se falhou
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
        console.error(`Erro interno do servidor ao verificar status da tarefa ${taskId}:`, error);
         return {
             statusCode: 500,
             body: JSON.stringify({ status: 'ERROR', message: 'Erro interno ao verificar status da tarefa.' })
         };
    }
};
