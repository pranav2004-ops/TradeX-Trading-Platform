# Rules and Conventions - TradeX AI Chatbot

## 1. Coding Standards
- **Frontend:** Use React functional components, hooks, and JSX. Use Tailwind CSS for styling. Ensure the design is "premium" (glassmorphism, smooth transitions, dark theme consistency).
- **Backend:** Use Node.js, Express, and ES modules (`import`/`export`).
- **Icons:** Use `lucide-react` for any necessary iconography (e.g., chat bubble, send button, close button).

## 2. Security Rules
- **Never expose API keys:** The LLM API key must reside in the backend `server/.env` file. The frontend must never communicate directly with the LLM provider.
- **Sanitize Input:** Ensure user input is properly handled to prevent injection attacks before sending to the LLM.

## 3. Performance Rules
- **Lazy Initialization:** The chat widget should not connect to the backend until the user actually opens it or sends a message, saving resources on page load.
- **State Limits:** Limit the chat history stored in memory to a reasonable amount (e.g., last 50 messages) to prevent memory bloat.
