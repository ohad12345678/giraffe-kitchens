import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitationAuditAPI, aiAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, MessageCircle } from 'lucide-react';
import type { SanitationAuditSummary } from '../types';

export default function SanitationAudits() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [audits, setAudits] = useState<SanitationAuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Chat State
  const [showAIChat, setShowAIChat] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadAudits();
  }, []);

  const loadAudits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sanitationAuditAPI.list();
      setAudits(data);
    } catch (err: any) {
      console.error('Failed to load audits:', err);
      setError(err.response?.data?.detail || 'שגיאה בטעינת ביקורות');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      in_progress: { text: 'בתהליך', color: 'bg-blue-100 text-blue-800' },
      completed: { text: 'הושלם', color: 'bg-green-100 text-green-800' },
      reviewed: { text: 'נבדק', color: 'bg-purple-100 text-purple-800' },
    };
    const badge = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || aiLoading) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiLoading(true);

    try {
      const response = await aiAPI.askSanitation({
        question: userMessage,
        date_range: 'month'
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.answer
      }]);
    } catch (error: any) {
      console.error('AI request failed:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ שגיאה: ${error.response?.data?.detail || 'אנא נסה שוב או פנה למנהל המערכת.'}`
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">טוען ביקורות...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowRight className="h-5 w-5" />
            <span>חזרה לדשבורד</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-semibold text-gray-900">ביקורות תברואה</h1>
        {user?.role === 'hq' && (
          <button
            onClick={() => navigate('/sanitation-audits/new')}
            className="bg-[#f97316] hover:bg-[#ea580c] text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-all"
          >
            + ביקורת חדשה
          </button>
        )}
      </div>

      {/* Stats Summary */}
      {audits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="text-sm font-medium text-gray-600 mb-2">סה"כ ביקורות</div>
            <div className="text-4xl font-semibold text-gray-900 mb-1">{audits.length}</div>
            <div className="text-sm text-gray-500">ביקורות תברואה</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="text-sm font-medium text-gray-600 mb-2">ממוצע ציונים</div>
            <div className="text-4xl font-semibold text-gray-900 mb-1">
              {(audits.reduce((sum, a) => sum + a.total_score, 0) / audits.length).toFixed(1)}
            </div>
            <div className="text-sm text-gray-500">מתוך 100</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="text-sm font-medium text-gray-600 mb-2">ביקורת אחרונה</div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">
              {formatDate(audits[0].audit_date)}
            </div>
            <div className="text-sm text-gray-500">{audits[0].branch_name}</div>
          </div>
        </div>
      )}

      {/* Audits Table */}
      {audits.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-gray-500 text-lg">אין ביקורות עדיין</p>
          {user?.role === 'hq' && (
            <p className="text-gray-400 text-sm mt-2">לחץ על "ביקורת חדשה" למעלה כדי ליצור ביקורת</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    תאריך
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    סניף
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    מבקר
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    ציון
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    ניקוד
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    סטטוס
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => (
                  <tr
                    key={audit.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-all cursor-pointer"
                    onClick={() => navigate(`/sanitation-audits/${audit.id}`)}
                  >
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(audit.audit_date)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {audit.branch_name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {audit.auditor_name}
                    </td>
                    <td className={`px-4 py-4 text-sm font-semibold ${audit.total_score >= 95 ? 'text-green-600' : audit.total_score < 90 ? 'text-red-600' : 'text-gray-900'}`}>
                      {audit.total_score.toFixed(1)}
                    </td>
                    <td className={`px-4 py-4 text-sm ${audit.total_deductions === 0 ? 'text-green-600' : audit.total_deductions >= 5 ? 'text-red-600' : 'text-gray-600'}`}>
                      -{audit.total_deductions.toFixed(1)}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {getStatusBadge(audit.status)}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/sanitation-audits/${audit.id}`);
                        }}
                        className="text-[#f97316] hover:text-[#ea580c] font-medium transition-all"
                      >
                        צפה
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>
      </main>

      {/* AI Chat Button - בצבע ירוק בהיר */}
      <button
        onClick={() => setShowAIChat(!showAIChat)}
        className="fixed bottom-6 left-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all z-50 flex items-center gap-2"
      >
        <MessageCircle className="h-6 w-6" />
        {!showAIChat && <span className="pr-2">שאל את הצ'אט</span>}
      </button>

      {/* AI Chat Window */}
      {showAIChat && (
        <div className="fixed bottom-24 left-6 w-96 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 z-50">
          <div className="bg-green-500 text-white p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">ניתוח AI - ביקורות תברואה</h3>
            </div>
            <button
              onClick={() => setShowAIChat(false)}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="h-96 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p className="mb-4">👋 שלום! אני כאן לעזור לך לנתח ביקורות תברואה.</p>
                <p className="text-sm">נסה לשאול:</p>
                <div className="mt-2 space-y-2 text-sm">
                  <p className="bg-gray-50 p-2 rounded">• מה הבעיות השכיחות?</p>
                  <p className="bg-gray-50 p-2 rounded">• איך הציונים בחודש האחרון?</p>
                  <p className="bg-gray-50 p-2 rounded">• מה לשפר בתברואה?</p>
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
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="שאל שאלה על ביקורות התברואה..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={aiLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={aiLoading}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {aiLoading ? 'שולח...' : 'שלח'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
