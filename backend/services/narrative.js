const OpenAI = require('openai');
require('dotenv').config();

const client = new OpenAI({
  apiKey:  process.env.FEATHERLESS_API_KEY,
  baseURL: 'https://api.featherless.ai/v1',
});

async function generateNarrative(farmerData, score) {
  const riskFlags = score.flags
    .filter(f => f.type === 'risk')
    .map(f => f.title)
    .join(', ') || 'None';

  const warningFlags = score.flags
    .filter(f => f.type === 'warning')
    .map(f => f.title)
    .join(', ') || 'None';

  const prompt = `You are a credit analyst assistant for smallholder farmers in Kenya.
Given the farmer profile below, write exactly three sections with these headings:

FARMER EXPLANATION:
(2 sentences in simple English the farmer can understand — explain their score and what it means for their loan application)

LENDER MEMO:
(3 sentences for the loan officer — professional credit assessment recommendation)

FOLLOW-UP QUESTIONS:
(2 specific questions the loan officer should ask this farmer before making a final decision)

Farmer profile:
- Name: ${farmerData.name}, County: ${farmerData.county}
- Crop: ${farmerData.crop}, Farm size: ${farmerData.size} acres, Seasons farmed: ${farmerData.seasons}
- FarmScore: ${score.total}/100, Grade: ${score.grade}
- Last season yield: ${farmerData.yield}, Crop loss: ${farmerData.loss}
- Planting timing: ${farmerData.timing}
- Advisory access: ${farmerData.advisory}, Follow-through: ${farmerData.follow}
- Cooperative: ${farmerData.coop}, Prior loan: ${farmerData.prevLoan}
- Loan purpose: ${farmerData.purpose || 'not specified'}
- Risk flags: ${riskFlags}
- Warning flags: ${warningFlags}`;

  const response = await client.chat.completions.create({
    model:      process.env.FEATHERLESS_MODEL || 'meta-llama/Llama-3.3-70B-Instruct',
    messages:   [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

module.exports = { generateNarrative };
