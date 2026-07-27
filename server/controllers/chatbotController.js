import { GoogleGenAI } from '@google/genai';

export const handleChat = async (req, res) => {
  try {
    // Initialize the SDK inside the handler so dotenv has time to load process.env
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemInstruction = `You are an expert trading assistant for the TradeX virtual trading platform. 
Provide concise, helpful, and accurate answers about trading concepts, stock markets, and how to use a trading platform.
Do not provide specific financial advice or tell the user exactly what to buy or sell. Maintain a professional yet approachable tone.`;

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
    res.status(500).json({ error: 'Failed to generate response' });
  }
};
