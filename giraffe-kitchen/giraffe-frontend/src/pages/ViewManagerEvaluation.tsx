import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { managerEvaluationAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Trash2, MessageCircle, Send, Sparkles } from 'lucide-react';
import type { ManagerEvaluation } from '../types';

export default function ViewManagerEvaluation() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [evaluation, setEvaluation] = useState<ManagerEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Chat State
  const [showAIChat, setShowAIChat] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Authorized emails
  const AUTHORIZED_EMAILS = [
    'nofar@giraffe.co.il',
    'aviv@giraffe.co.il',
    'ohadb@giraffe.co.il',
    'avital@giraffe.co.il',
  ];

  const hasAccess = user?.role === 'hq' && user.email && AUTHORIZED_EMAILS.includes(user.email);

  useEffect(() => {
    if (!hasAccess) {
      navigate('/dashboard');
      return;
    }
    if (id) {
      loadEvaluation(Number(id));
    }
  }, [id]);

  useEffect(() => {
    if (showAIChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showAIChat]);

  const loadEvaluation = async (evaluationId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await managerEvaluationAPI.get(evaluationId);
      setEvaluation(data);
    } catch (err: any) {
      console.error('Failed to load evaluation:', err);
      setError(err.response?.data?.detail || 'שגיאה בטעינת הערכה');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק הערכה זו? פעולה זו לא ניתנת לביטול.')) {
      return;
    }

    try {
      await managerEvaluationAPI.delete(Number(id));
      alert('ההערכה נמחקה בהצלחה');
      navigate('/manager-evaluations');
    } catch (err: any) {
      console.error('Failed to delete evaluation:', err);
      alert(err.response?.data?.detail || 'שגיאה במחיקת הערכה');
    }
  };

  const handleGenerateSummary = async () => {
    if (!id) return;

    setGeneratingSummary(true);
    try {
      const updated = await managerEvaluationAPI.generateSummary(Number(id));
      setEvaluation(updated);
    } catch (err: any) {
      console.error('Failed to generate summary:', err);
      alert(err.response?.data?.detail || 'שגיאה ביצירת סיכום AI');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || aiLoading || !id) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiLoading(true);

    try {
      const response = await managerEvaluationAPI.chat(Number(id), userMessage);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.answer
      }]);
    } catch (error: any) {
      console.error('AI request failed:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ שגיאה: ${error.response?.data?.detail || 'אנא נסה שוב.'}`
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    return 'text-red-600';
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
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-lg">טוען הערכה...</div>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error || 'הערכה לא נמצאה'}
        </div>
      </div>
    );
  }

  const averageRating = evaluation.categories.reduce((sum, cat) => sum + cat.rating, 0) / evaluation.categories.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/manager-evaluations')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
              <span>חזרה להערכות</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAIChat(!showAIChat)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                {showAIChat ? 'סגור צ\'אט' : 'שאל שאלה'}
              </button>

              <button
                onClick={handleDelete}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Trash2 className="h-5 w-5" />
                מחק
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                הערכת {evaluation.manager_name}
              </h1>
              <p className="text-gray-600 mb-4">
                {formatDate(evaluation.evaluation_date)}
              </p>

              {/* Rating Display */}
              <div className="grid grid-cols-2 gap-4">
                {evaluation.overall_rating !== null && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">דירוג כללי</div>
                    <div className={`text-4xl font-bold ${getRatingColor(evaluation.overall_rating)}`}>
                      {evaluation.overall_rating}/10
                    </div>
                  </div>
                )}
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">ממוצע קטגוריות</div>
                  <div className={`text-4xl font-bold ${getRatingColor(averageRating)}`}>
                    {averageRating.toFixed(1)}/10
                  </div>
                </div>
              </div>
            </div>

            {/* General Comments */}
            {evaluation.general_comments && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">הערות כלליות</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{evaluation.general_comments}</p>
              </div>
            )}

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">קטגוריות הערכה</h2>
              <div className="space-y-4">
                {evaluation.categories.map((category) => (
                  <div key={category.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{category.category_name}</h3>
                      <span className={`text-2xl font-bold ${getRatingColor(category.rating)}`}>
                        {category.rating}/10
                      </span>
                    </div>
                    {category.comments && (
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">{category.comments}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Summary */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  סיכום AI מקצועי
                </h2>
                {!evaluation.ai_summary && (
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {generatingSummary ? 'מייצר...' : 'צור סיכום'}
                  </button>
                )}
              </div>

              {evaluation.ai_summary ? (
                <div className="prose prose-sm max-w-none">
                  <div className="text-gray-700 whitespace-pre-wrap">{evaluation.ai_summary}</div>
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  לחץ על "צור סיכום" כדי לקבל ניתוח מקצועי מבוסס AI של ההערכה
                </p>
              )}
            </div>
          </div>

          {/* Right Column - AI Chatbox */}
          {showAIChat && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-24">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    שאל על ההערכה
                  </h3>
                </div>

                {/* Messages */}
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-gray-500 text-sm text-center mt-8">
                      <p>שאל שאלות על ההערכה, קבל המלצות ותובנות</p>
                      <p className="mt-2 text-xs">לדוגמה: "מה נקודות החוזק של המנהל?"</p>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-gray-100 text-gray-900'
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}

                  {aiLoading && (
                    <div className="flex justify-end">
                      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg px-4 py-2">
                        <p className="text-sm">מחשב תשובה...</p>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="שאל שאלה..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={aiLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={aiLoading || !inputMessage.trim()}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
