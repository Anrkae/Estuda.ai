// netlify/functions/startGeneration.js
const fetch = require('node-fetch'); // ou usar fetch nativo se Node.js >= 18
const { v4: uuidv4 } = require('uuid');
const { Redis } = require('@upstash/redis'); // Importa o cliente Redis da Upstash

// --- Configuração Upstash Redis ---
// As credenciais são acessadas via variáveis de ambiente do Netlify
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// --- Configuração da API OpenRouter ---
const OPENROUTER_API_URL = `https://openrouter.ai/api/v1/chat/completions`;
const OPENROUTER_MODEL = 'deepseek/deepseek-prover-v2:free'; // Mantenha ou mude

// === Função: Parsear o Texto da API ===
// Mantenha a função parseGeneratedText AQUI ou importe-a.
// Copie o código completo da função parseGeneratedText do exemplo anterior aqui.
function parseGeneratedText(text, expectedType) {
     const questions = []; /* ... implementação completa da função ... */
      const startIndex = Math.min(
          text.indexOf("[Q]") !== -1 ? text.indexOf("[Q]") : Infinity,
          text.indexOf("[SEP]") !== -1 ? text.indexOf("[SEP]") : Infinity,
          text.indexOf("[META_SOURCE]") !== -1 ? text.indexOf("[META_SOURCE]") : Infinity,
          text.indexOf("[META_YEAR]") !== -1 ? text.indexOf("[META_YEAR]") : Infinity
      );
      const relevantText = startIndex !== Infinity ? text.substring(startIndex) : text;

      const questionBlocks = relevantText.trim().split(/\s*\[SEP\]\s*/i).filter(block => block.trim() !== '' && block.trim().toUpperCase().startsWith('[Q]'));

      if (questionBlocks.length === 0 && relevantText.trim() !== '' && relevantText.trim().toUpperCase().startsWith('[Q]')) {
          questionBlocks.push(relevantText.trim());
      } else if (questionBlocks.length === 0 && relevantText.trim() !== '') {
           console.error("Texto da API não reconhecido no backend. Não começa com [Q] e não tem [SEP]s válidos:", relevantText);
           return [{ id: `q-error-parse-${Date.now()}-global`, text: `Erro Crítico do Servidor: Formato da resposta da API irreconhecível.`, type: 'error', options: {}, correctAnswer: null, resolution: null, image: null, metaSource: null, metaYear: null }];
      }

      questionBlocks.forEach((block, index) => {
          try {
              const questionData = {
                  id: `q-${Date.now()}-${index}`,
                  text: '',
                  options: {},
                  correctAnswer: null,
                  type: expectedType,
                  answered: false,
                  resolution: null,
                  image: null,
                  metaSource: null,
                  metaYear: null
              };

              const qMatch = block.match(/\[Q\]([\s\S]*?)(?:\[META_SOURCE\]|\[META_YEAR\]|\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]|\[IMG\]|\[RES\]|$)/i);
              if (qMatch && qMatch[1]) {
                  questionData.text = qMatch[1].trim();
              } else {
                   const linesBeforeOption = block.split(/\[META_SOURCE\]|\[META_YEAR\]|\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]|\[IMG\]|\[RES\]/i)[0];
                   questionData.text = linesBeforeOption.replace(/^\[Q\]/i, '').trim();
                   if (!questionData.text) {
                       console.warn(`Bloco ${index+1}: Não encontrou [Q] nem texto antes dos marcadores.`);
                   }
               }

              const lines = block.trim().split('\n');
              let foundCorrectAnswerMarker = false;
              let foundResolutionMarker = false;

              lines.forEach(line => {
                  line = line.trim();
                  if (/^\[META_SOURCE\]/i.test(line)) { questionData.metaSource = line.substring(13).trim(); }
                  else if (/^\[META_YEAR\]/i.test(line)) { questionData.metaYear = line.substring(11).trim(); }
                  else if (/^\[A\]/i.test(line)) questionData.options['A'] = line.substring(3).trim();
                  else if (/^\[B\]/i.test(line)) questionData.options['B'] = line.substring(3).trim();
                  else if (/^\[C\]/i.test(line)) questionData.options['C'] = line.substring(3).trim();
                  else if (/^\[D\]/i.test(line)) questionData.options['D'] = line.substring(3).trim();
                  else if (/^\[V\]/i.test(line)) questionData.options['V'] = line.substring(3).trim() || 'Verdadeiro';
                  else if (/^\[F\]/i.test(line)) questionData.options['F'] = line.substring(3).trim() || 'Falso';
                  else if (/^\[R\]/i.test(line)) {
                      questionData.correctAnswer = line.substring(3).trim();
                      foundCorrectAnswerMarker = true;
                  } else if (/^\[G\]/i.test(line)) {
                      questionData.suggestedAnswer = line.substring(3).trim();
                      foundCorrectAnswerMarker = true;
                  } else if (/^\[IMG\]/i.test(line)) {
                       const imageUrl = line.substring(5).trim();
                       if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:image/'))) {
                           questionData.image = imageUrl;
                       } else if (imageUrl) {
                            console.warn(`Bloco ${index+1}: URL de imagem inválida ou perigosa detectada: ${imageUrl}`);
                            questionData.image = null;
                       }
                   } else if (/^\[RES\]/i.test(line)) {
                       questionData.resolution = line.substring(5).trim();
                       foundResolutionMarker = true;
                   }
               });

            if (expectedType === 'multipla_escolha' || expectedType === 'verdadeiro_falso') {
                if (!foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Marcador de resposta [R] não encontrado.`);
                if (!questionData.correctAnswer && foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Valor da resposta [R] está vazio.`);
                if (Object.keys(questionData.options).length === 0) console.warn(`Bloco ${index+1}: Nenhuma opção ([A],[B]... ou [V],[F]) encontrada.`);
                if (!foundResolutionMarker) console.warn(`Bloco ${index+1}: Resolução [RES] não encontrada.`);
                if (!questionData.resolution && foundResolutionMarker) console.warn(`Bloco ${index+1}: Valor da resolução [RES] está vazio.`);

               if (expectedType === 'multipla_escolha') {
                   const upperCaseCorrect = (questionData.correctAnswer || '').toUpperCase();
                   if (foundCorrectAnswerMarker && !['A', 'B', 'C', 'D'].includes(upperCaseCorrect)) console.warn(`Bloco ${index+1}: Resposta [R] "${questionData.correctAnswer}" inválida. Use A, B, C ou D.`);
                    if (foundCorrectAnswerMarker && questionData.options[upperCaseCorrect] === undefined) console.warn(`Bloco ${index+1}: Resposta [R] "${upperCaseCorrect}" não corresponde a nenhuma opção fornecida.`);
                  if (foundCorrectAnswerMarker) questionData.correctAnswer = upperCaseCorrect;
               } else {
                   const upperCaseCorrect = (questionData.correctAnswer || '').toUpperCase();
                   if (upperCaseCorrect === 'VERDADEIRO' || upperCaseCorrect === 'V') questionData.correctAnswer = 'V';
                   else if (upperCaseCorrect === 'FALSO' || upperCaseCorrect === 'F') questionData.correctAnswer = 'F';
                    else if (foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Resposta [R] "${questionData.correctAnswer}" inválida para V/F. Use V ou F.`);
                  if (questionData.options['V'] === undefined) questionData.options['V'] = 'Verdadeiro';
                  if (questionData.options['F'] === undefined) questionData.options['F'] = 'Falso';
               }
           } else if (expectedType === 'dissertativa_curta') {
               if (!foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Gabarito [G] não encontrado.`);
               if (!questionData.suggestedAnswer && foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Valor do gabarito [G] está vazio.`);
               if (foundResolutionMarker && !questionData.resolution) console.warn(`Bloco ${index+1}: Valor da resolução [RES] está vazio.`);
           }

            if (!questionData.text) {
                 console.error(`Erro ao processar bloco ${index + 1}: Enunciado [Q] vazio.`);
                  questions.push({
                      id: `q-error-process-${Date.now()}-${index}`,
                      text: `Erro ao carregar esta questão: Enunciado vazio ou formato inválido.`,
                      type: 'error',
                      options: {}, correctAnswer: null, resolution: null, image: null, metaSource: null, metaYear: null
                  });
            } else if (questionData.type !== 'error') {
                questions.push(questionData);
            }

        } catch (error) {
            console.error(`Erro ao processar bloco ${index + 1}:`, error, "\nBloco Original:\n---\n", block, "\n---");
             questions.push({
                 id: `q-error-process-${Date.now()}-${index}`,
                 text: `Erro ao carregar esta questão (Erro interno durante o parsing). Verifique os logs do servidor.`,
                 type: 'error',
                 options: {}, correctAnswer: null, resolution: null, image: null, metaSource: null, metaYear: null
             });
        }
    });
    return questions;
}

// --- O Worker (FALTA AQUI - VEJA EXPLICAÇÃO ABAIXO) ---
// Esta lógica de worker PRECISA rodar separadamente, lendo tarefas do Redis
// e processando a chamada longa para a OpenRouter. Ela NÃO pode ser
// executada diretamente DENTRO desta função startGeneration de forma confiável
// se levar mais de 10 segundos.

// A função handleOpenRouterCall (que antes estava no .then/.catch de fetch)
// precisaria ser movida para o CÓDIGO DO WORKER.

async function handleOpenRouterCallAndSaveResult(taskId, prompt, openRouterRequestBody, tipoQuestao) {
    console.log(`[WORKER - SIMULADO] Task ${taskId}: Iniciando chamada para OpenRouter.`);
     const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; // Worker também precisa da chave

     let finalState;
     try {
         const openRouterResponse = await fetch(OPENROUTER_API_URL, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                 // Headers podem ser passados dos parâmetros originais da tarefa
                  'HTTP-Referer': 'https://sua-ferramenta-netlify-app.netlify.app', // Use um referer fixo ou passe o original
                  'X-Title': 'Meu App de Questões (Worker)'
             },
             body: JSON.stringify(openRouterRequestBody)
         });

         if (!openRouterResponse.ok) {
             let errorBodyText = await openRouterResponse.text();
             console.error(`[WORKER ${taskId}] OpenRouter API HTTP Error ${openRouterResponse.status}:`, errorBodyText);
             let errorBody = {}; try { errorBody = JSON.parse(errorBodyText); } catch (e) {}
             const detailMessage = errorBody?.error?.message || `Erro HTTP ${openRouterResponse.status} da API externa.`;
             finalState = {
                 status: 'ERROR',
                 timestamp: new Date().toISOString(),
                 message: `Erro na comunicação com a API externa: ${detailMessage}`,
                 statusCode: openRouterResponse.status
             };
         } else {
              const openRouterData = await openRouterResponse.json();
              console.log(`[WORKER ${taskId}] Resposta da API OpenRouter recebida.`);

               if (openRouterData.error) {
                    console.error(`[WORKER ${taskId}] Erro retornado pela API OpenRouter:`, openRouterData.error);
                    const errorMessage = openRouterData.error.message || openRouterData.error.type || 'Erro desconhecido retornado pela API.';
                    finalState = {
                        status: 'ERROR',
                        timestamp: new Date().toISOString(),
                        message: `Erro da API externa: ${errorMessage}`
                    };
               } else if (!openRouterData.choices || openRouterData.choices.length === 0 || !openRouterData.choices[0].message?.content) {
                   console.error(`[WORKER ${taskId}] Resposta inesperada da API OpenRouter:`, openRouterData);
                   finalState = {
                       status: 'ERROR',
                       timestamp: new Date().toISOString(),
                       message: 'Erro no servidor: A API externa retornou uma resposta vazia ou em formato inesperado.'
                   };
               }
              else {
                  const rawTextFromAPI = openRouterData.choices[0].message.content;
                  try {
                      const questionsArray = parseGeneratedText(rawTextFromAPI, tipoQuestao);
                      finalState = {
                          status: 'COMPLETED',
                          timestamp: new Date().toISOString(),
                          data: {
                              questionsArray: questionsArray,
                              totalValidQuestions: questionsArray.filter(q => q.type !== 'error').length,
                              errorQuestionsCount: questionsArray.length - questionsArray.filter(q => q.type !== 'error').length,
                              finishReason: openRouterData.choices[0].finish_reason
                          }
                      };
                      console.log(`[WORKER ${taskId}] Tarefa concluída com sucesso.`);
                  } catch (parseError) {
                       console.error(`[WORKER ${taskId}] Erro durante o parsing:`, parseError);
                       finalState = {
                           status: 'ERROR',
                           timestamp: new Date().toISOString(),
                           message: `Erro interno do servidor ao processar a resposta.`,
                           parseError: parseError.message
                       };
                  }
              }
         }
     } catch (error) {
         console.error(`[WORKER ${taskId}] Erro na requisição fetch para OpenRouter:`, error);
         finalState = {
             status: 'ERROR',
             timestamp: new Date().toISOString(),
             message: `Erro de rede ou comunicação com a API externa: ${error.message || 'Falha desconhecida.'}`
         };
     }

      // === Salva o estado final (COMPLETED ou ERROR) no Redis ===
     await redis.set(taskId, JSON.stringify(finalState), { ex: 3600 }); // Salva por 1 hora (ajuste)
     console.log(`[WORKER ${taskId}] Estado final salvo no Redis: ${finalState.status}`);

     // Opcional: remover a tarefa de uma fila de processamento se estiver usando uma
}


// === Handler da Função Start Generation ===
exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // Verifica se as credenciais do Redis estão configuradas
     if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
         console.error("Credenciais Upstash Redis não configuradas!");
         return { statusCode: 500, body: JSON.stringify({ error: 'Erro de configuração do servidor: Credenciais de armazenamento não encontradas.' }) };
     }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; // Ainda precisa da chave aqui para validar inputs talvez
    if (!OPENROUTER_API_KEY || !OPENROUTER_API_KEY.startsWith('sk-or-v1-')) {
        console.error("OPENROUTER_API_KEY não configurada ou inválida.");
        // Retornar 500 para o frontend sem detalhes sensíveis
        return { statusCode: 500, body: JSON.stringify({ error: 'Erro de configuração do servidor.' }) };
    }


    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        console.error("Erro ao parsear corpo da requisição:", error);
        return { statusCode: 400, body: JSON.stringify({ error: 'Corpo da requisição inválido.' }) };
    }

    const { assunto, bibliografia, disciplinaSelecionada, numQuestoes, tipoQuestao, nivelQuestao } = requestBody;

    if (!assunto || !numQuestoes || isNaN(numQuestoes) || numQuestoes < 1 || numQuestoes > 20 || !nivelQuestao || !tipoQuestao) {
         console.error("Validação de input falhou:", requestBody);
         return { statusCode: 400, body: JSON.stringify({ error: 'Parâmetros de entrada inválidos ou ausentes.' }) };
    }

    const taskId = uuidv4(); // Gera um ID único

    // Prepara os dados da tarefa para salvar
    const taskData = {
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        parameters: requestBody // Salva os parâmetros necessários para o worker
        // NÃO inclua aqui o prompt grande nem o requestBody da OpenRouter pronto.
        // O worker irá reconstruir o prompt usando os parâmetros.
    };

    try {
        // === Salva o estado inicial da tarefa (PENDING) no Redis ===
        // Usamos PENDING_ como prefixo ou outro mecanismo para uma fila simples
        // ou apenas o status PENDING para que o worker saiba o que processar.
        await redis.set(`task:${taskId}`, JSON.stringify(taskData), { ex: 60 * 15 }); // Salva por 15 minutos (ajuste)
        // Opcional: adicionar o taskId a uma lista/fila no Redis para o worker ler
        // await redis.rpush('taskQueue', taskId);

        console.log(`Task ${taskId} saved to Redis with status PENDING.`);

        // === AQUI PRECISARIA ATIVAR O WORKER ===
        // ** ISTO NÃO ESTÁ IMPLEMENTADO NO NETLIFY FREE FACILMENTE **
        // Você precisaria de:
        // 1. Um worker que roda periodicamente (Scheduled Function, talvez) para ler 'taskQueue' ou scanear chaves 'task:*' com status PENDING.
        // 2. Ou usar um serviço de fila (SQS, etc.) que dispare outro tipo de função ou processo.
        // 3. Ou ter um pequeno servidor sempre ligado que leia do Redis.
        // A chamada 'handleOpenRouterCallAndSaveResult' acima seria o CÓDIGO desse worker.
        console.warn(`[TASK ${taskId}] WORKER ATIVATION NEEDED HERE.`);
        // Para FINS DE TESTE BEM LIMITADO (que provavelmente dará timeout), você pode tentar
        // rodar a função do worker AQUI MESMO, mas ela não sobreviverá ao timeout de 10s.
        // handleOpenRouterCallAndSaveResult(taskId, /* prompt params */, /* OR body */, tipoQuestao); // NÃO FAÇA ISSO EM PROD ASSIM

    } catch (error) {
        console.error(`Erro ao salvar tarefa ${taskId} no Redis:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro do servidor ao salvar a tarefa. Tente novamente.' })
        };
    }


    // === Retorna IMEDIATAMENTE o ID da tarefa para o frontend ===
    // A execução principal da função termina aqui.
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            taskId: taskId,
            status: 'STARTED', // Confirma que a tarefa foi iniciada no backend (salva no Redis)
            message: 'Geração iniciada, por favor, aguarde (polling)...'
        })
    };
};
