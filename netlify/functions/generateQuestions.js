// netlify/functions/generateQuestions.js
const fetch = require('node-fetch'); // Use require para node-fetch v2

// --- Configuração da API OpenRouter (agora segura no backend) ---
// !!! A chave é acessada via variáveis de ambiente do Netlify !!!
const OPENROUTER_API_URL = `https://openrouter.ai/api/v1/chat/completions`;
// Escolha um modelo compatível com chat completions no OpenRouter.
const OPENROUTER_MODEL = 'deepseek/deepseek-prover-v2:free'; // Mantenha ou mude conforme o frontend

// === Função: Parsear o Texto da API ===
// MOVIDA DO FRONTEND PARA O BACKEND
function parseGeneratedText(text, expectedType) {
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
        // Pode ser uma única questão sem [SEP]
        questionBlocks.push(relevantText.trim());
    } else if (questionBlocks.length === 0 && relevantText.trim() !== '') {
         console.error("Texto da API não reconhecido no backend. Não começa com [Q] e não tem [SEP]s válidos:", relevantText);
         // Retornar um erro processável para o frontend
         return [{ id: `q-error-parse-${Date.now()}-global`, text: `Erro Crítico do Servidor: Formato da resposta da API irreconhecível.`, type: 'error', options: {}, correctAnswer: null, resolution: null, image: null, metaSource: null, metaYear: null }];
    }


    questionBlocks.forEach((block, index) => {
        try {
            const questionData = {
                id: `q-${Date.now()}-${index}`, // IDs serão gerados no backend agora
                text: '',
                options: {},
                correctAnswer: null,
                type: expectedType, // Usa o tipo solicitado pelo frontend
                answered: false, // Estado inicial
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
                     // Validação básica da URL da imagem
                    const imageUrl = line.substring(5).trim();
                    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:image/'))) {
                        questionData.image = imageUrl;
                    } else if (imageUrl) {
                         console.warn(`Bloco ${index+1}: URL de imagem inválida ou perigosa detectada: ${imageUrl}`);
                         // Opcional: definir para null ou adicionar um placeholder de erro
                         questionData.image = null;
                    }
                } else if (/^\[RES\]/i.test(line)) {
                    questionData.resolution = line.substring(5).trim();
                    foundResolutionMarker = true;
                }
            });

             // Validação específica do tipo (mantida)
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
                } else { // verdadeiro_falso
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
                       id: `q-error-${Date.now()}-${index}`,
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
                 text: `Erro ao carregar esta questão (Erro interno). Verifique os logs do servidor.`,
                 type: 'error',
                 options: {}, correctAnswer: null, resolution: null, image: null, metaSource: null, metaYear: null
             });
        }
    });
    return questions;
}


// === Handler principal da Netlify Function ===
exports.handler = async function(event, context) {
    // Permitir apenas requisições POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    // Obter a chave da API das variáveis de ambiente
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY || !OPENROUTER_API_KEY.startsWith('sk-or-v1-')) {
        console.error("OPENROUTER_API_KEY não configurada ou inválida nas variáveis de ambiente do Netlify!");
        return {
            statusCode: 500, // Internal Server Error
            body: JSON.stringify({ error: 'Erro de configuração do servidor: Chave da API não encontrada ou inválida.' })
        };
    }

    // Parsear o corpo da requisição do frontend
    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        console.error("Erro ao parsear corpo da requisição:", error);
        return {
            statusCode: 400, // Bad Request
            body: JSON.stringify({ error: 'Corpo da requisição inválido (não é um JSON válido).' })
        };
    }

    // Validar inputs básicos recebidos do frontend
    const { assunto, bibliografia, disciplinaSelecionada, numQuestoes, tipoQuestao, nivelQuestao } = requestBody;

    if (!assunto || !numQuestoes || isNaN(numQuestoes) || numQuestoes < 1 || numQuestoes > 20 || !nivelQuestao || !tipoQuestao) {
         console.error("Validação de input falhou:", requestBody);
         return {
             statusCode: 400, // Bad Request
             body: JSON.stringify({ error: 'Parâmetros de entrada inválidos ou ausentes.' })
         };
    }

    const disciplinaParaSessao = disciplinaSelecionada || "Geral";

    // === Construir Prompt (Igual ao do frontend original) ===
     let prompt = `Gere ${numQuestoes} questão(ões) EXCLUSIVAMENTE sobre o Assunto Principal "${assunto}".\n`;
     if (disciplinaSelecionada) prompt += `Considere o contexto da Disciplina: "${disciplinaSelecionada}".\n`;
     prompt += `GENERE AS QUESTÕES COM NÍVEL DE DIFICULDADE ESTRITAMENTE: ${nivelQuestao.toUpperCase()}.\n`;
     prompt += `A complexidade, vocabulário e conceitos abordados devem ser consistentes com o nível ${nivelQuestao.toUpperCase()}.\n`;
     if (bibliografia) prompt += `Use a seguinte Bibliografia como inspiração/referência (se aplicável ao assunto): "${bibliografia}".\n`;
     prompt += `Tipo de questão desejada: ${tipoQuestao === 'multipla_escolha' ? 'Múltipla Escolha (A, B, C, D)' : tipoQuestao === 'verdadeiro_falso' ? 'Verdadeiro/Falso (V/F)' : 'Dissertativa Curta'}.\n`;

     // --- INSTRUÇÃO PARA METADADOS ---
     prompt += `Para cada questão, inclua os seguintes metadados IMEDIATAMENTE APÓS o marcador [Q] e ANTES de quaisquer outros marcadores ([A], [B], [V], [F], [G], [R], [IMG], [RES]).\n`;
     prompt += `- Fonte/Assunto: Use EXATAMENTE o formato "[META_SOURCE] Texto da fonte ou assunto". Use algo relevante como "Disciplina: ${disciplinaParaSessao}", "Assunto: ${assunto}", ou "Simulado ENEM", "Prova OAB", etc., se aplicável e se o modelo puder inferir do contexto/assunto.\n`;
     prompt += `- Ano de Geração/Referência: Use EXATAMENTE o formato "[META_YEAR] Ano". Sugira o ano atual ou um ano de referência relevante, se aplicável.\n`;
      const currentYear = new Date().getFullYear();
     prompt += `Utilize o ano atual (${currentYear}) como padrão, a menos que o assunto ou contexto sugira fortemente um ano específico.\n`;
     // ----------------------------------

     prompt += `Formato de saída OBRIGATÓRIO:\n`;
     prompt += `- Separe CADA questão completa (enunciado, metadados, imagem?, opções/gabarito, resposta, resolução) usando APENAS "[SEP]" como separador.\n`;
     prompt += `- Dentro de cada bloco de questão:\n`;
     prompt += `  - Inicie o enunciado OBRIGATORIAMENTE com "[Q] ".\n`;
     // Metadados vêm AQUI no formato [META_SOURCE]... e [META_YEAR]...
     prompt += `  - (Opcional) Se a questão NECESSITAR de uma imagem... use EXATAMENTE o formato "[IMG] URL_ou_descrição_detalhada". Use isso RARAMENTE...\n`;
     switch (tipoQuestao) {
         case 'multipla_escolha': prompt += `  - Para CADA alternativa, use EXATAMENTE o formato "[A] texto...".\n  - Indique a resposta correta usando "[R] " seguido APENAS pela LETRA maiúscula (A, B, C ou D).\n`; break;
         case 'verdadeiro_falso': prompt += `  - Forneça a afirmação no enunciado [Q].\n  - Use "[V]" ou deixe vazio.\n  - Use "[F]" ou deixe vazio.\n  - Indique a resposta correta usando "[R] " seguido APENAS por "V" ou "F".\n`; break;
         case 'dissertativa_curta': prompt += `  - Forneça uma resposta/gabarito curto e direto usando "[G] ".\n`; break;
     }
     prompt += `  - Forneça uma resolução/explicação DETALHADA... usando OBRIGATORIAMENTE o formato "[RES] Texto...".\n`;

     // --- Exemplos atualizados para incluir metadados ---
     prompt += `Exemplo Múltipla Escolha com Metadados e Resolução (nível fácil):
[Q] Qual a capital da França?
[META_SOURCE] Geografia - Capitais
[META_YEAR] ${currentYear}
[A] Londres
[B] Berlim
[C] Paris
[D] Madri
[R] C
[RES] Paris é a capital e maior cidade da França, localizada no norte do país, às margens do rio Sena. Londres é a capital da Inglaterra, Berlim da Alemanha e Madri da Espanha.
[SEP]
`;
     prompt += `Exemplo V/F com Metadados, Imagem e Resolução (nível médio):
[Q] A imagem abaixo mostra um triângulo equilátero?
[META_SOURCE] Matemática - Geometria Plana
[META_YEAR] ${currentYear}
[IMG] https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Regular_triangle.svg/200px-Regular_triangle.svg.png
[V]
[F]
[R] V
[RES] Sim, a imagem mostra um triângulo equilátero, que possui todos os três lados de igual comprimento e todos os três ângulos internos iguais a 60 graus. Um triângulo isósceles tem apenas dois lados iguais, e um escaleno tem todos os lados diferentes.
[SEP]
`;
     // -----------------------------------------------------

     prompt += `
 IMPORTANTE: Siga ESTRITAMENTE o formato pedido usando os marcadores ([Q], [META_SOURCE], [META_YEAR], [IMG], [A], [B], [C], [D], [V], [F], [R], [G], [RES], [SEP]). NÃO adicione NENHUMA outra formatação, numeração automática, texto introdutório ou comentários fora do formato especificado. Gere APENAS o texto das questões conforme solicitado. Certifique-se de que TODAS as questões de múltipla escolha e V/F tenham o marcador [RES] com uma explicação.`;


    try {
        // === Corpo da requisição para OpenRouter (formato OpenAI Chat Completions) ===
        const openRouterRequestBody = {
            model: OPENROUTER_MODEL,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 450 * numQuestoes + 500, // Ajustado um pouco para mais segurança
        };

        // === Requisição Fetch para OpenRouter (AGORA DO BACKEND) ===
        const openRouterResponse = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Usa a chave segura das variáveis de ambiente
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                // Headers HTTP-Referer e X-Title são boas práticas, mas aqui são mais relevantes
                // se a API OpenRouter os usar para billing ou analytics a partir do seu servidor.
                // Eles são obrigatórios pela política do OpenRouter, então é bom mantê-los.
                 'HTTP-Referer': event.headers.referer || 'https://sua-ferramenta-netlify-app.netlify.app', // Use o referer original ou um fallback seguro
                 'X-Title': 'Meu App de Questões (Backend Function)'
            },
            body: JSON.stringify(openRouterRequestBody)
        });

        if (!openRouterResponse.ok) {
            let errorBodyText = await openRouterResponse.text();
            console.error(`OpenRouter API HTTP Error ${openRouterResponse.status}:`, errorBodyText);
            let errorBody = {};
            try { errorBody = JSON.parse(errorBodyText); } catch (e) { console.error("Erro ao parsear erro JSON da API:", e); }

            const detailMessage = errorBody?.error?.message || `Erro HTTP ${openRouterResponse.status} da API externa.`;

            let statusCodeToReturn = 500; // Erro interno padrão
            if (openRouterResponse.status === 401 || openRouterResponse.status === 403) {
                 statusCodeToReturn = 500; // Não exponha 401/403 diretamente ao frontend, sugere problema de chave no server
                 console.error("Erro de autenticação/permissão na API OpenRouter. Verifique a chave.");
                 // Detail message pode ser útil nos logs, mas não envia para o frontend por segurança
                 return {
                     statusCode: statusCodeToReturn,
                     body: JSON.stringify({ error: 'Erro de configuração ou credenciais na comunicação externa.' })
                 };
             } else if (openRouterResponse.status === 429) {
                  statusCodeToReturn = 429; // Too Many Requests (pode ser enviado ao frontend)
                  return {
                      statusCode: statusCodeToReturn,
                      body: JSON.stringify({ error: `Limite de requisições atingido. Tente novamente mais tarde. (${detailMessage})` })
                  };
              } else if (openRouterResponse.status >= 400 && openRouterResponse.status < 500) {
                   statusCodeToReturn = 400; // Erro do cliente, mas originado na API externa
              } else if (openRouterResponse.status >= 500) {
                   statusCodeToReturn = 502; // Bad Gateway (API externa com problema)
              }


            return {
                statusCode: statusCodeToReturn,
                body: JSON.stringify({ error: `Erro na comunicação com a API externa: ${detailMessage}` })
            };
        }

        const openRouterData = await openRouterResponse.json();
        console.log("Resposta completa da API OpenRouter (dados):", openRouterData);


         if (openRouterData.error) {
              console.error("Erro retornado pela API OpenRouter:", openRouterData.error);
              const errorMessage = openRouterData.error.message || openRouterData.error.type || 'Erro desconhecido retornado pela API externa.';
               return {
                   statusCode: 500, // Erro interno causado por um erro da API
                   body: JSON.stringify({ error: `Erro da API externa: ${errorMessage}` })
               };
         }

        if (!openRouterData.choices || openRouterData.choices.length === 0 || !openRouterData.choices[0].message?.content) {
            console.error("Resposta inesperada da API OpenRouter (sem choices ou conteúdo válido):", openRouterData);
            return {
                statusCode: 500, // Erro interno
                body: JSON.stringify({ error: 'Erro no servidor: A API externa retornou uma resposta vazia ou em formato inesperado.' })
            };
        }

        const rawTextFromAPI = openRouterData.choices[0].message.content;
        console.log("Texto cru extraído da API (backend):", rawTextFromAPI);

        // === Parsear o texto para formato estruturado ===
        const questionsArray = parseGeneratedText(rawTextFromAPI, tipoQuestao);

        const validQuestions = questionsArray.filter(q => q.type !== 'error');
        const totalValidQuestions = validQuestions.length;
        const errorQuestionsCount = questionsArray.length - totalValidQuestions;

        // === Retornar os dados processados para o frontend ===
        // O frontend espera um array de questões e as contagens
        return {
            statusCode: 200, // Sucesso
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                questionsArray: questionsArray, // Inclui até as questões com erro para exibição no frontend
                totalValidQuestions: totalValidQuestions,
                errorQuestionsCount: errorQuestionsCount,
                finishReason: openRouterData.choices[0].finish_reason // Pode ser útil para debug no frontend
            })
        };

    } catch (error) {
        console.error("Erro interno do servidor ao gerar questões:", error);
        // Retornar um erro genérico para o frontend para não expor detalhes internos
        return {
            statusCode: 500, // Internal Server Error
            body: JSON.stringify({ error: 'Ocorreu um erro interno no servidor ao processar sua requisição.' })
        };
    }
};
