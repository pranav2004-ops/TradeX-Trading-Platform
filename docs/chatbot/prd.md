# Product Requirements Document (PRD) - TradeX AI Chatbot

## 1. Overview
The TradeX platform currently uses a third-party, injected widget (sketricgen.ai) for chatbot functionality. This approach limits customization, aesthetic integration, and context-awareness. The goal of this project is to replace the third-party widget with a custom-built AI trading assistant directly integrated into the TradeX architecture.

## 2. Objectives
- **Remove** the existing third-party chatbot script.
- **Build** a native, in-app floating chat widget using React and Tailwind CSS.
- **Integrate** a backend AI service (e.g., Google Gemini) to process user queries.
- **Provide** intelligent, trading-focused assistance to users.

## 3. Scope
### In-Scope
- Frontend chat UI (floating button, message history, input area).
- Backend API endpoint to handle chat requests.
- Integration with an LLM provider via API key.
- Basic system prompt to specialize the AI as a trading assistant.

### Out-of-Scope (Future Enhancements)
- Voice input/output.
- Direct execution of trades by the AI.
- Deep integration with real-time portfolio data (can be added later).

## 4. User Scenarios
- **Scenario A:** A beginner trader asks the AI to explain what a "limit order" is. The AI responds with a clear, concise explanation.
- **Scenario B:** A user asks for the current market trend for technology stocks (general knowledge).
