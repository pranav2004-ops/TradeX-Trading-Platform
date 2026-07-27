# Architecture Document - TradeX AI Chatbot

## 1. High-Level Architecture
The custom AI chatbot will follow a standard client-server architecture, communicating via REST API.

### 1.1 Frontend (Client)
- **Component:** `ChatWidget.jsx` located in `client/src/components/chatbot/`.
- **State Management:** Local React state (`useState`, `useRef`) for managing chat history, input, and loading states.
- **Styling:** Tailwind CSS for a premium, responsive, dark-mode compatible design.
- **Integration:** Rendered globally in `App.jsx`.

### 1.2 Backend (Server)
- **Routes:** `chatbotRoutes.js` exposing `POST /api/chat`.
- **Controller:** `chatbotController.js` handling the request parsing, prompt construction, and API calls to the LLM.
- **LLM Provider:** Uses an official SDK (e.g., `@google/genai`) to communicate with the AI model.

## 2. Data Flow
1. User types a message in the `ChatWidget` and clicks send.
2. Frontend updates local state with the user's message and shows a loading indicator.
3. Frontend sends an HTTP POST request with the message (and optional conversation history) to `server/api/chat`.
4. The `chatbotController` receives the request, constructs a prompt with a system instruction (e.g., "You are an expert trading assistant..."), and sends it to the AI Provider.
5. The AI Provider returns the response text.
6. The controller sends the response back to the frontend.
7. The frontend updates the chat history and removes the loading indicator.
