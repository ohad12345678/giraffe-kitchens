import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerEvaluationAPI, aiAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Plus, MessageCircle } from 'lucide-react';
import type { ManagerEvaluationSummary } from '../types';

export default function ManagerEvaluations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<ManagerEvaluationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Chat State
  const [showAIChat, setShowAIChat] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Authorized emails
  const AUTHORIZED_EMAILS = [
    'nofar@giraffe.co.il',
    'aviv@giraffe.co.il',
    'ohadb@giraffe.co.il',
    'avital@giraffe.co.il',
  ];

  // Check if user has access
  const hasAccess = user?.role === 'hq' && user.email && AUTHORIZED_EMAILS.includes(user.email);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || aiLoading) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiLoading(true);

    try {
      const response = await aiAPI.askManagerEvaluations({
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
        content: `שגיאה: ${error.response?.data?.detail || 'אנא נסה שוב או פנה למנהל המערכת.'}`
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAccess) {
      navigate('/dashboard');
      return;
    }
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await managerEvaluationAPI.list();
      setEvaluations(data);
    } catch (err: any) {
      console.error('Failed to load evaluations:', err);
      setError(err.response?.data?.detail || 'שגיאה בטעינת הערכות');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!hasAccess) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">טוען הערכות...</div>
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
    <div className="min-h-screen bg-gray-50">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">הערכות מנהלים</h1>
            <button
              onClick={() => navigate('/manager-evaluations/new')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              הערכה חדשה
            </button>
          </div>

          {/* Stats Summary */}
          {evaluations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">סה"כ הערכות</div>
                <div className="text-2xl font-bold">{evaluations.length}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">סניפים</div>
                <div className="text-2xl font-bold">
                  {new Set(evaluations.map(e => e.branch_id)).size}
                </div>
              </div>
            </div>
          )}

          {/* Evaluations List */}
          {evaluations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 text-lg mb-4">אין הערכות עדיין</p>
              <button
                onClick={() => navigate('/manager-evaluations/new')}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                צור הערכה ראשונה
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        מנהל
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        סניף
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        תאריך הערכה
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        מעריך
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        פעולות
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {evaluations.map((evaluation) => (
                      <tr
                        key={evaluation.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/manager-evaluations/${evaluation.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {evaluation.manager_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{evaluation.branch_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {formatDate(evaluation.evaluation_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {evaluation.created_by_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/manager-evaluations/${evaluation.id}`);
                            }}
                            className="text-blue-600 hover:text-blue-900"
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

      {/* AI Chat Button - בצבע סגול */}
      <button
        onClick={() => setShowAIChat(!showAIChat)}
        className="fixed bottom-6 left-6 bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-full shadow-lg transition-all z-50 flex items-center gap-2"
      >
        <MessageCircle className="h-6 w-6" />
        {!showAIChat && <span className="pr-2">שאל את הצ'אט</span>}
      </button>

      {/* AI Chat Window */}
      {showAIChat && (
        <div className="fixed bottom-24 left-6 w-96 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 z-50">
          <div className="bg-purple-500 text-white p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">ניתוח AI - הערכות מנהלים</h3>
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
                <p className="mb-4">שלום! אני כאן לעזור לך לנתח הערכות מנהלים.</p>
                <p className="text-sm">נסה לשאול:</p>
                <div className="mt-2 space-y-2 text-sm">
                  <p className="bg-gray-50 p-2 rounded">• מה הקטגוריות החזקות והחלשות?</p>
                  <p className="bg-gray-50 p-2 rounded">• איך הציונים בחודש האחרון?</p>
                  <p className="bg-gray-50 p-2 rounded">• מה צריך לשפר במנהלים?</p>
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
                        ? 'bg-purple-500 text-white'
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
                placeholder="שאל שאלה על הערכות המנהלים..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={aiLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={aiLoading}
                className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
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
