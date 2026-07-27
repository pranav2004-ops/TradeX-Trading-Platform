import { GoogleGenAI } from '@google/genai';
import { getSummaryByUser, getHoldingsByUser } from '../services/tradingEngineService.js';

export const handleChat = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server environment variables.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { message, history, user } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userName = user && user.name ? user.name : 'Trader';

    // Fetch user portfolio data if authenticated
    let portfolioContext = "";
    if (req.user && req.user.id) {
      try {
        const summary = await getSummaryByUser(req.user.id);
        const holdings = await getHoldingsByUser(req.user.id);
        
        portfolioContext = `\n\nUSER PORTFOLIO DATA:
- Total Funds: $${summary.totalFunds?.toFixed(2)}
- Buying Power: $${summary.buyingPower?.toFixed(2)}
- Current Holdings: ${holdings.length === 0 ? 'No open positions.' : holdings.map(h => `${h.quantity} shares of ${h.symbol}`).join(', ')}
You now have access to the user's real-time portfolio data. You MUST act as their personal virtual trading advisor. When asked, analyze their portfolio, suggest improvements, and tailor your advice to their specific holdings.`;
      } catch (err) {
        console.error("Error fetching portfolio context:", err);
      }
    }

    const systemInstruction = `You are TradeX Assistant, a highly professional and expert AI trading advisor for the TradeX platform. 
You are speaking with ${userName}.
${portfolioContext}

Guidelines:
- Keep responses EXTREMELY concise and direct (ChatGPT style).
- Do NOT output massive walls of text or long essays. 
- Limit your response to 2-4 short sentences or a maximum of 3 very brief bullet points unless the user explicitly asks for a detailed explanation.
- Use Markdown formatting (bold, bullet points) to make it scannable.
- Do not provide unauthorized financial advice; guide them on paper trading instead.`;

    let contents = [];
    if (history && Array.isArray(history)) {
      contents = history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));
    }

    contents.push({ role: 'user', parts: [{ text: message }] });

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }
    res.end();
  } catch (error) {
    console.error('Error generating chat response:', error);
    res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
};
