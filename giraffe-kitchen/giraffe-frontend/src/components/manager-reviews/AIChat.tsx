import React, { useState, useRef, useEffect } from 'react';
import { managerReviewAPI } from '../../services/managerReviewAPI';
import { Bot, Send, Loader, MessageCircle, X } from 'lucide-react';

interface AIChatProps {
  reviewId: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIChat: React.FC<AIChatProps> = ({ reviewId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const suggestedQuestions = [
    'מה נקודות החוזק של המנהל?',
    'באילו תחומים המנהל צריך לשפר?',
    'תן לי המלצות לתוכנית התפתחות',
    'איך אפשר לשפר את ציון התפעול?',
    'מה ההבדל בין הציונים האוטומטיים לציונים שניתנו?'
  ];

  const handleSubmit = async (question?: string) => {
    const messageText = question || input;
    if (!messageText.trim() || loading) return;

    const newUserMessage: Message = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = [...messages, newUserMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await managerReviewAPI.chatWithAI(reviewId, apiMessages);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'מצטער, אירעה שגיאה בתקשורת עם מערכת הAI. נסה שוב מאוחר יותר.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-105"
      >
        <Bot className="h-5 w-5" />
        <span className="font-medium">דבר עם AI על ההערכה</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: '600px' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold">יועץ AI</h3>
            <p className="text-xs text-purple-100">מנתח הערכות ביצועים</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-6">שאל אותי כל שאלה על ההערכה</p>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-3">שאלות מוצעות:</p>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(q)}
                  className="block w-full text-right px-4 py-2 text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2 text-purple-600">
                  <Bot className="h-4 w-4" />
                  <span className="text-xs font-medium">יועץ AI</span>
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader className="h-4 w-4 text-purple-600 animate-spin" />
              <span className="text-sm text-gray-600">מנתח...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="כתוב שאלה..."
            disabled={loading}
            rows={2}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            className="h-10 w-10 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          AI עשוי לטעות. בדוק מידע חשוב.
        </p>
      </div>
    </div>
  );
};

export default AIChat;
