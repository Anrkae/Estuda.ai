// netlify/functions/startGeneration.js
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid'); // Importa a função v4 da uuid

// --- Configuração da API OpenRouter ---
const OPENROUTER_API_URL = `https://openrouter.ai/api/v1/chat/completions`;
const OPENROUTER_MODEL = 'deepseek/deepseek-prover-v2:free'; // Mantenha ou mude

// --- Placeholder para Armazenamento de Estado (NÃO USE ISSO EM PRODUÇÃO) ---
// Em produção, use um banco de dados real, K/V store (como Upstash Redis, FaunaDB, etc.)
// Este objeto será limpo a cada nova instância da função Netlify!
const taskStorage = {};

async function storeTaskState(taskId, state) {
    console.log(`[STORAGE] Saving state for ${taskId}: ${state.status}`);
    // >>> SUBSTITUIR POR LÓGICA DE BANCO DE DADOS/ARMAZENAMENTO EXTERNO REAL <<<
    // Ex: await yourDatabaseService.set(taskId, state);
    taskStorage[taskId] = state; // Simulação
    // <<< FIM SUBSTITUIÇÃO >>>
}

async function getTaskState(taskId) {
     console.log(`[STORAGE] Getting state for ${taskId}`);
     // >>> SUBSTITUIR POR LÓGICA DE BANCO DE DADOS/ARMAZENAMENTO EXTERNO REAL <<<
     // Ex: return await yourDatabaseService.get(taskId);
     return taskStorage[taskId]; // Simulação
     // <<< FIM SUBSTITUIÇÃO >>>
}
// --- Fim Placeholder de Armazenamento ---


// === Função: Parsear o Texto da API (MOVIDA PARA O BACKEND) ===
// Esta função deve ser a mesma que você usou anteriormente.
// Ela pode estar aqui ou ser importada de um arquivo compartilhado no backend.
// Para este exemplo, vamos incluí-la aqui por simplicidade.
function parseGeneratedText(text, expectedType) {
    // Implementação da função parseGeneratedText (COPIE A VERSÃO DO backend generateQuestions.js AQUI)
    // ... (código da função parseGeneratedText copiado) ...
     const questions = [];
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
// --- Fim Função Parsear Texto ---


// === Handler da Função Start Generation ===
exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY || !OPENROUTER_API_KEY.startsWith('sk-or-v1-')) {
        console.error("OPENROUTER_API_KEY não configurada ou inválida.");
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

    const taskId = uuidv4(); // Gera um ID único para esta tarefa

    // === Construir Prompt === (Igual ao anterior)
     let prompt = `Gere ${numQuestoes} questão(ões) EXCLUSIVAMENTE sobre o Assunto Principal "${assunto}".\n`;
     if (disciplinaSelecionada) prompt += `Considere o contexto da Disciplina: "${disciplinaSelecionada}".\n`;
     prompt += `GENERE AS QUESTÕES COM NÍVEL DE DIFICULDADE ESTRITAMENTE: ${nivelQuestao.toUpperCase()}.\n`;
     prompt += `A complexidade, vocabulário e conceitos abordados devem ser consistentes com o nível ${nivelQuestao.toUpperCase()}.\n`;
     if (bibliografia) prompt += `Use a seguinte Bibliografia como inspiração/referência (se aplicável ao assunto): "${bibliografia}".\n`;
     prompt += `Tipo de questão desejada: ${tipoQuestao === 'multipla_escolha' ? 'Múltipla Escolha (A, B, C, D)' : tipoQuestao === 'verdadeiro_falso' ? 'Verdadeiro/Falso (V/F)' : 'Dissertativa Curta'}.\n`;

     // --- INSTRUÇÃO PARA METADADOS ---
     const disciplinaParaSessao = disciplinaSelecionada || "Geral";
     prompt += `Para cada questão, inclua os seguintes metadados IMEDIATAMENTE APÓS o marcador [Q] e ANTES de quaisquer outros marcadores...\n`; // Texto abreviado
      const currentYear = new Date().getFullYear();
     prompt += `- Fonte/Assunto: Use EXATAMENTE o formato "[META_SOURCE] Texto da fonte ou assunto". Use algo relevante como "Disciplina: ${disciplinaParaSessao}", "Assunto: ${assunto}", etc.\n`;
     prompt += `- Ano de Geração/Referência: Use EXATAMENTE o formato "[META_YEAR] Ano". Utilize o ano atual (${currentYear}) como padrão...\n`; // Texto abreviado
     // ----------------------------------

     prompt += `Formato de saída OBRIGATÓRIO: Separe CADA questão completa... usando APENAS "[SEP]"... Dentro de cada bloco...`; // Texto abreviado
      // Inclua aqui os exemplos completos e a instrução final do formato do prompt anterior
     prompt += `
 IMPORTANTE: Siga ESTRITAMENTE o formato pedido usando os marcadores ([Q], [META_SOURCE], [META_YEAR], [IMG], [A], [B], [C], [D], [V], [F], [R], [G], [RES], [SEP]). NÃO adicione NENHUMA outra formatação... Gere APENAS o texto das questões conforme solicitado. Certifique-se de que TODAS as questões... tenham o marcador [RES] com uma explicação.`;


    // === Corpo da requisição para OpenRouter ===
    const openRouterRequestBody = {
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 450 * numQuestoes + 500,
    };

    // === Salva o estado inicial da tarefa como PENDING ===
    const initialState = {
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        parameters: requestBody // Salva os parâmetros se precisar deles depois
        // Não salva o prompt ou requestBody da OpenRouter aqui, pode ser grande
    };
    await storeTaskState(taskId, initialState);

    // === Inicia a chamada assíncrona à API OpenRouter ===
    // NOTA: Esta é a parte potencialmente instável em serverless simples.
    // A função retorna imediatamente, mas o `.then()` e `.catch()`
    // rodam *se a instância da função não for morta antes*.
    fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
             'HTTP-Referer': event.headers.referer || 'https://sua-ferramenta-netlify-app.netlify.app',
             'X-Title': 'Meu App de Questões (Backend Function)'
        },
        body: JSON.stringify(openRouterRequestBody)
    })
    .then(async (openRouterResponse) => {
        let finalState;
        if (!openRouterResponse.ok) {
            let errorBodyText = await openRouterResponse.text();
            console.error(`[TASK ${taskId}] OpenRouter API HTTP Error ${openRouterResponse.status}:`, errorBodyText);
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
             console.log(`[TASK ${taskId}] Resposta da API OpenRouter recebida.`);

              if (openRouterData.error) {
                   console.error(`[TASK ${taskId}] Erro retornado pela API OpenRouter:`, openRouterData.error);
                   const errorMessage = openRouterData.error.message || openRouterData.error.type || 'Erro desconhecido retornado pela API.';
                   finalState = {
                       status: 'ERROR',
                       timestamp: new Date().toISOString(),
                       message: `Erro da API externa: ${errorMessage}`
                   };
              } else if (!openRouterData.choices || openRouterData.choices.length === 0 || !openRouterData.choices[0].message?.content) {
                  console.error(`[TASK ${taskId}] Resposta inesperada da API OpenRouter:`, openRouterData);
                  finalState = {
                      status: 'ERROR',
                      timestamp: new Date().toISOString(),
                      message: 'Erro no servidor: A API externa retornou uma resposta vazia ou em formato inesperado.'
                  };
              }
             else {
                 const rawTextFromAPI = openRouterData.choices[0].message.content;
                 // === Parsear o texto e salvar o resultado ===
                 try {
                     const questionsArray = parseGeneratedText(rawTextFromAPI, tipoQuestao); // Usa o tipo original
                     finalState = {
                         status: 'COMPLETED',
                         timestamp: new Date().toISOString(),
                         data: { // Salva os dados parseados
                             questionsArray: questionsArray,
                             totalValidQuestions: questionsArray.filter(q => q.type !== 'error').length,
                             errorQuestionsCount: questionsArray.filter(q => q.type === 'error').length,
                             finishReason: openRouterData.choices[0].finish_reason
                         }
                     };
                     console.log(`[TASK ${taskId}] Tarefa concluída com sucesso.`);
                 } catch (parseError) {
                      console.error(`[TASK ${taskId}] Erro durante o parsing:`, parseError);
                      finalState = {
                          status: 'ERROR',
                          timestamp: new Date().toISOString(),
                          message: `Erro interno do servidor ao processar a resposta.`,
                          parseError: parseError.message // Opcional: incluir detalhes do erro de parsing
                      };
                 }
             }
        }
         // === Salva o estado final (COMPLETED ou ERROR) ===
         await storeTaskState(taskId, finalState);
         console.log(`[TASK ${taskId}] Estado final salvo: ${finalState.status}`);

    })
    .catch(async (error) => {
        console.error(`[TASK ${taskId}] Erro na requisição fetch para OpenRouter:`, error);
        const finalState = {
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            message: `Erro de rede ou comunicação com a API externa: ${error.message || 'Falha desconhecida.'}`
        };
         // === Salva o estado final de ERRO ===
        await storeTaskState(taskId, finalState);
        console.log(`[TASK ${taskId}] Estado final de ERRO salvo.`);
    });


    // === Retorna IMEDIATAMENTE o ID da tarefa para o frontend ===
    // A chamada fetch acima continua rodando "em background" (melhor, não bloqueando)
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            taskId: taskId,
            status: 'STARTED', // Confirma que a tarefa foi iniciada
            message: 'Geração iniciada, por favor, aguarde...'
        })
    };
};

