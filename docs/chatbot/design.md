# Design Document - TradeX AI Chatbot

## 1. Visual Aesthetics (The "Wow" Factor)
The Chatbot must feel like a premium, integral part of the TradeX platform, not an afterthought.

- **Theme:** Dark mode by default, matching the trading platform's aesthetic.
- **Materials:** Use glassmorphism (translucency + background blur) for the chat window container.
- **Colors:**
  - Background: Deep, rich dark colors (e.g., Tailwind `slate-900` or `zinc-950` with opacity).
  - Accents: Vibrant, high-contrast colors for user messages and buttons (e.g., electric blue, neon purple, or the brand's primary color).
  - AI Messages: Subtle, slightly lighter background to differentiate from user messages.
- **Typography:** Clean, modern sans-serif fonts (Inter or Roboto), inheriting from the global stylesheet.

## 2. Micro-Animations
- **Widget Toggle:** The floating action button (FAB) should scale and rotate slightly when clicked.
- **Window Opening:** The chat window should fade in and scale up smoothly from the bottom right corner.
- **Message Appearance:** New messages should slide up and fade in.
- **Typing Indicator:** A smooth, pulsing animation (e.g., three bouncing dots) when waiting for the AI response.

## 3. UI Components
- **Floating Button:** Bottom-right fixed position. Icon changes from "MessageCircle" to "X" when opened.
- **Header:** Contains the bot's name ("TradeX Assistant") and a close button.
- **Message List:** Scrollable area showing the conversation.
- **Input Area:** Text input field with a send button. Supports "Enter" to send.
