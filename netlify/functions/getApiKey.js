exports.handler = async (event, context) => {
  const { OPENROUTER_API_KEY } = process.env;

  if (!OPENROUTER_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API Key não configurada no servidor." }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ apiKey: OPENROUTER_API_KEY }),
  };
};
