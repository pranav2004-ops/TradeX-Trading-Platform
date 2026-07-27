import { GoogleGenAI } from '@google/genai';

export const handleChat = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server environment variables.' });
    }

    // Initialize the SDK inside the handler so dotenv has time to load process.env
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { message, history, user } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userName = user && user.name ? user.name : 'Trader';

    const systemInstruction = `You are TradeX Assistant, an expert AI trading advisor for the TradeX virtual trading platform. 
You are speaking with ${userName}. Greet them by name when appropriate.

Response Guidelines:
- Provide professional, beautifully structured responses using Markdown (headings, bold text, clean bullet points).
- Be polite, encouraging, and clear.
- Explain trading concepts with clarity and practical examples.
- Format responses cleanly with section titles and bullet points so it is easy to read.
- Do not provide specific illegal/unauthorized financial advice, but guide them on paper trading and strategies.`;

    let contents = [];
    if (history && Array.isArray(history)) {
      contents = history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));
    }

    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error('Error generating chat response:', error);
    res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
};
