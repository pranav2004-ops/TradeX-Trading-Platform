import { GoogleGenAI } from '@google/genai';
import { getSummaryByUser, getHoldingsByUser, getUserMetrics } from '../services/tradingEngineService.js';
import { getBatchStockQuotes } from '../services/stockService.js';

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
        const metrics = await getUserMetrics(req.user.id);
        
        const symbols = holdings.map(h => h.symbol);
        const quotes = await getBatchStockQuotes(symbols);
        const quotesMap = quotes.reduce((acc, q) => { acc[q.symbol] = q; return acc; }, {});

        let holdingsString = 'No open positions.';
        if (holdings.length > 0) {
          holdingsString = holdings.map(h => {
            const currentPrice = quotesMap[h.symbol]?.currentPrice || h.averagePrice;
            const pnl = (currentPrice - h.averagePrice) * h.quantity;
            const pnlPercent = h.averagePrice > 0 ? ((currentPrice - h.averagePrice) / h.averagePrice) * 100 : 0;
            return `${h.quantity} shares of ${h.symbol} (Avg Price: $${h.averagePrice.toFixed(2)}, Current Price: $${currentPrice.toFixed(2)}, PnL: $${pnl.toFixed(2)} / ${pnlPercent.toFixed(2)}%)`;
          }).join('\n  ');
        }
        
        const totalValue = summary.cash + summary.investedAmount;

        portfolioContext = `\n\nUSER PORTFOLIO DATA:
- Total Portfolio Value: $${totalValue.toFixed(2)}
- Buying Power (Cash): $${summary.cash.toFixed(2)}
- Historical Win Rate: ${metrics.totalClosedTrades > 0 ? metrics.winRate.toFixed(1) + '%' : 'N/A (No closed trades yet)'}
- Current Holdings:
  ${holdingsString}
You now have access to the user's real-time portfolio data, unrealized PnL, and historical win rate. You MUST act as their personal virtual trading advisor. When asked, analyze their portfolio, suggest improvements, and tailor your advice to their specific holdings.`;
      } catch (err) {
        console.error("Error fetching portfolio context:", err);
      }
    }

    const systemInstruction = `You are TradeX Assistant, a highly professional and expert AI trading advisor for the TradeX platform. 
You are speaking with ${userName}.
${portfolioContext}

Guidelines for Professional Formatting:
- Keep responses EXTREMELY concise and direct, adopting a clean, ChatGPT-like style.
- NEVER output a single massive wall of text. Always break your response into short paragraphs or use bullet points.
- Use Markdown formatting (bolding, bullet points) to make information highly scannable.
- Limit your response to a few short sentences, or a maximum of 3-4 very brief bullet points unless the user explicitly asks for a detailed explanation.
- Suggest 2-3 specific ticker symbols to research based on current market trends when appropriate.
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
