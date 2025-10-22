import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UnifiedAIChatProps {
  contextType?: 'all' | 'checks' | 'sanitation' | 'reviews';
  title?: string;
}

const UnifiedAIChat: React.FC<UnifiedAIChatProps> = ({
  contextType = 'all',
  title = 'ניתוח AI'
}) => {
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          question: userMessage,
          context_type: contextType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer
      }]);
    } catch (error: any) {
      console.error('AI request failed:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ שגיאה: ${error.message}\n\nאנא נסה שוב או פנה למנהל המערכת.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestedQuestions = () => {
    const suggestions: Record<string, string[]> = {
      all: [
        '• מה המגמות הכלליות במערכת?',
        '• איך הביצועים של הסניפים?',
        '• מה צריך לשפר?'
      ],
      checks: [
        '• איזו מנה הכי חלשה?',
        '• מה הטרנד בשבוע האחרון?',
        '• איך ביצועי הטבחים?'
      ],
      sanitation: [
        '• מה הבעיות השכיחות?',
        '• איך הציונים בחודש האחרון?',
        '• מה לשפר בתברואה?'
      ],
      reviews: [
        '• מי המנהל המצטיין?',
        '• מה התחומים החלשים?',
        '• מה ההמלצות לפיתוח?'
      ]
    };
    return suggestions[contextType] || suggestions.all;
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 left-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all z-50 flex items-center gap-2"
      >
        <MessageCircle className="h-6 w-6" />
        {!showChat && <span className="pr-2">שאל את הצ'אט</span>}
      </button>

      {/* Chat Window */}
      {showChat && (
        <div className="fixed bottom-24 left-6 w-96 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 z-50">
          <div className="bg-green-500 text-white p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">{title} - כל הנתונים</h3>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p className="mb-4">👋 שלום! אני יכול לעזור לך לנתח את כל הנתונים במערכת.</p>
                <p className="text-sm">נסה לשאול:</p>
                <div className="mt-2 space-y-2 text-sm">
                  {getSuggestedQuestions().map((q, i) => (
                    <p key={i} className="bg-gray-50 p-2 rounded">{q}</p>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans text-sm">{msg.content}</pre>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                  <span className="animate-pulse">מחשב תשובה...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="שאל שאלה..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={loading}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'שולח...' : 'שלח'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UnifiedAIChat;
