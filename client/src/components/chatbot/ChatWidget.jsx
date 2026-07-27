import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const getUserFromStorage = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(getUserFromStorage());
  const [messages, setMessages] = useState([
    { 
      role: 'model', 
      text: user?.name 
        ? `Hello **${user.name.split(' ')[0]}**! I am your TradeX Assistant. How can I help you today?`
        : 'Hello! I am your TradeX Assistant. How can I help you today?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setUser(getUserFromStorage());
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
      const currentUser = getUserFromStorage();
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: userMessage.text,
          history: messages.filter(m => m.role !== 'model' || !m.text.includes('I am your TradeX Assistant')),
          user: currentUser,
        }),
      });

      if (!response.ok) {
        setMessages((prev) => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again later.' }]);
        return;
      }

      setMessages((prev) => [...prev, { role: 'model', text: '' }]);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text += chunk;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { role: 'model', text: 'Sorry, I am unable to connect to the server right now.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 sm:w-[420px] h-[540px] max-h-[75vh] bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out transform origin-bottom-right">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/50">
            <div className="flex items-center gap-2 text-blue-400">
              <Bot size={20} />
              <div>
                <h3 className="font-semibold text-slate-100 text-sm">TradeX Assistant</h3>
                {user?.name && <p className="text-[10px] text-slate-400">Helping {user.name}</p>}
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-200">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`group relative flex items-start gap-2 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                  {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-blue-400" />}
                </div>
                
                <div 
                  className={`relative p-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-none pr-8'
                  }`}
                >
                  {msg.role === 'model' ? (
                    <div className="prose prose-invert prose-sm max-w-none text-slate-200 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-blue-300">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <span>{msg.text}</span>
                  )}

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(msg.text, index)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded"
                    title="Copy message"
                  >
                    {copiedIndex === index ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-2 max-w-[85%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                  <Bot size={16} className="text-blue-400" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 rounded-tl-none flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-slate-800/80 border-t border-slate-700/50">
            <div className="relative flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about trading..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none max-h-32 min-h-[44px]"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors h-[44px] flex items-center justify-center"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/50 flex items-center justify-center transition-all duration-300 hover:scale-105"
        style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
};

export default ChatWidget;
