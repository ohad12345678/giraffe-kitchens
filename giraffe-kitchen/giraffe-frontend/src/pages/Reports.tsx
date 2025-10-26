import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { aiAPI, checkAPI, branchAPI, dishAPI } from '../services/api';
import { ArrowRight, TrendingUp, TrendingDown, AlertCircle, MessageSquare } from 'lucide-react';
import type { Branch, Dish } from '../types';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { user, isHQ } = useAuth();

  // Filter states
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [selectedDish, setSelectedDish] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<string>('week');

  // Data states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Chat states
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');

  // Admin delete states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState('');
  const [deleteEndDate, setDeleteEndDate] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if current user is admin (ohadb@giraffe.co.il)
  const isAdmin = user?.email === 'ohadb@giraffe.co.il';

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Load branches and dishes on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [branchesData, dishesData] = await Promise.all([
          branchAPI.list(),
          dishAPI.list(),
        ]);
        setBranches(branchesData);
        setDishes(dishesData);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    loadInitialData();
  }, []);

  // Load analytics when filters change
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        // Calculate date range
        const today = new Date();
        let startDate: Date;
        let endDate = today;

        switch (dateRange) {
          case 'today':
            startDate = today;
            break;
          case 'week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(today);
            startDate.setMonth(today.getMonth() - 1);
            break;
          case 'quarter':
            startDate = new Date(today);
            startDate.setMonth(today.getMonth() - 3);
            break;
          default:
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
        }

        const filters: any = {
          start_date: new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().split('T')[0],
          end_date: new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().split('T')[0],
        };

        if (selectedBranch) {
          filters.branch_id = selectedBranch;
        }

        if (selectedDish) {
          filters.dish_id = selectedDish;
        }

        const data = await checkAPI.getAnalytics(filters);
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [dateRange, selectedBranch, selectedDish]);

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <span className="h-4 w-4">→</span>;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8.5) return 'text-green-600 bg-green-50';
    if (rating >= 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getMockResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('מנה') || lowerQuestion.includes('מנות')) {
      return 'המנות עם הציונים הנמוכים ביותר השבוע הן: צ\'אזה (6.8) וסלט דג לבן (6.5). מומלץ לתת תשומת לב לשיפור ההכנה והצגה של מנות אלו. ייתכן שיש צורך בהדרכת הטבחים או בשינוי המתכון.';
    }

    if (lowerQuestion.includes('טבח') || lowerQuestion.includes('שף')) {
      return 'הטבחים המובילים השבוע: דוד (9.1) ושרה (8.9), שניהם מסניף חיפה. מומלץ לשתף את השיטות והטכניקות שלהם עם שאר הטבחים בכל הסניפים.';
    }

    if (lowerQuestion.includes('ממוצע') || lowerQuestion.includes('ציון')) {
      return 'הממוצע הכללי עומד על 8.2, עם מגמת שיפור של 0.3 נקודות ביחס לשבוע הקודם. זוהי מגמה מצוינת! המשיכו בעבודה הטובה.';
    }

    if (lowerQuestion.includes('המלצ') || lowerQuestion.includes('שיפור')) {
      return '3 המלצות מרכזיות: (1) הכשרה ממוקדת לטבחים בהכנת צ\'אזה וסלט דג לבן (2) שיתוף שיטות עבודה של הטבחים המובילים מחיפה (3) מעקב יומי אחר המנות החלשות לזיהוי מהיר של בעיות.';
    }

    return 'אני כאן כדי לעזור לך לנתח את נתוני בקרת האיכות. אתה יכול לשאול אותי על מנות ספציפיות, ביצועי טבחים, מגמות, או להתייעץ לגבי דרכי שיפור.';
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages([...chatMessages, { role: 'user', content: userMessage }]);

    try {
      // קריאה אמיתית ל-Claude API
      const branchId = !isHQ && user?.branch_id ? user.branch_id : undefined;
      const response = await aiAPI.ask(userMessage, branchId);

      setChatMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error: any) {
      console.error('AI API error:', error);
      console.error('Error details:', error.response?.data);

      // Show actual error message if available
      const errorMessage = error.response?.data?.detail || error.message;

      // If it's an API key error, show mock response
      if (errorMessage?.includes('API key') || errorMessage?.includes('ANTHROPIC_API_KEY')) {
        const mockAnswer = getMockResponse(userMessage);
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: mockAnswer + '\n\n_[הערה: זוהי תשובת דמו. כדי לקבל ניתוח AI מלא, נא להגדיר ANTHROPIC_API_KEY]_'
        }]);
      } else {
        // Show actual error to user
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ שגיאה: ${errorMessage}\n\nאנא נסה שוב או פנה למנהל המערכת.`
        }]);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('יש להקליד DELETE לאישור המחיקה');
      return;
    }

    setIsDeleting(true);
    try {
      const filters: any = {};

      if (deleteStartDate) {
        filters.start_date = deleteStartDate;
      }
      if (deleteEndDate) {
        filters.end_date = deleteEndDate;
      }

      const response = await checkAPI.bulkDelete(filters);
      alert(response.message);

      // Reset and close modal
      setShowDeleteModal(false);
      setDeleteStartDate('');
      setDeleteEndDate('');
      setDeleteConfirmText('');

      // Reload analytics
      const loadAnalytics = async () => {
        setLoading(true);
        try {
          const today = new Date();
          let startDate: Date;
          let endDate = today;

          switch (dateRange) {
            case 'today':
              startDate = today;
              break;
            case 'week':
              startDate = new Date(today);
              startDate.setDate(today.getDate() - 7);
              break;
            case 'month':
              startDate = new Date(today);
              startDate.setMonth(today.getMonth() - 1);
              break;
            case 'quarter':
              startDate = new Date(today);
              startDate.setMonth(today.getMonth() - 3);
              break;
            default:
              startDate = new Date(today);
              startDate.setDate(today.getDate() - 7);
          }

          const filters: any = {
            start_date: new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().split('T')[0],
            end_date: new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().split('T')[0],
          };

          if (selectedBranch) {
            filters.branch_id = selectedBranch;
          }

          if (selectedDish) {
            filters.dish_id = selectedDish;
          }

          const data = await checkAPI.getAnalytics(filters);
          setAnalytics(data);
        } catch (error) {
          console.error('Failed to load analytics:', error);
        } finally {
          setLoading(false);
        }
      };

      loadAnalytics();
    } catch (error: any) {
      console.error('Delete error:', error);
      alert('שגיאה במחיקה: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowRight className="h-5 w-5" />
            <span>חזרה לדשבורד</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">דוחות וניתוחים</h1>
          <p className="text-lg text-gray-600">ניתוח מעמיק של בדיקות האיכות במערכת</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">סינון נתונים</h2>
            {isAdmin && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                מחיקת נתונים
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">טווח תאריכים</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition-all"
              >
                <option value="today">היום</option>
                <option value="week">שבוע אחרון</option>
                <option value="month">חודש אחרון</option>
                <option value="quarter">רבעון</option>
              </select>
            </div>

            {isHQ && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סניף</label>
                <select
                  value={selectedBranch || ''}
                  onChange={(e) => setSelectedBranch(e.target.value ? Number(e.target.value) : null)}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition-all"
                >
                  <option value="">כל הסניפים</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">מנה</label>
              <select
                value={selectedDish || ''}
                onChange={(e) => setSelectedDish(e.target.value ? Number(e.target.value) : null)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition-all"
              >
                <option value="">כל המנות</option>
                {Array.isArray(dishes) && dishes.map((dish) => (
                  <option key={dish.id} value={dish.id}>
                    {dish.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPIs */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse">
              <div className="h-8 w-8 bg-primary-500 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">טוען נתונים...</p>
            </div>
          </div>
        ) : analytics ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow"
              >
                <p className="text-sm font-medium text-gray-600 mb-2">סך הבדיקות</p>
                <p className="text-4xl font-bold text-gray-900">{analytics.kpis.total_checks}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow"
              >
                <p className="text-sm font-medium text-gray-600 mb-2">ממוצע ציונים</p>
                <p className="text-4xl font-bold text-green-600">{analytics.kpis.average_rating}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow"
              >
                <p className="text-sm font-medium text-gray-600 mb-2">מנות בעייתיות</p>
                <p className="text-4xl font-bold text-red-600">{analytics.kpis.weak_dishes}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow"
              >
                <p className="text-sm font-medium text-gray-600 mb-2">טבח מוביל</p>
                {analytics.kpis.top_chef ? (
                  <>
                    <p className="text-2xl font-bold text-gray-900">{analytics.kpis.top_chef}</p>
                    <p className="text-sm text-green-600 mt-1">ציון: {analytics.kpis.top_chef_rating}</p>
                  </>
                ) : (
                  <p className="text-xl text-gray-400">אין נתונים</p>
                )}
              </motion.div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Daily Trend */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">מגמת בדיקות לפי תאריך</h3>
                <div className="space-y-3">
                  {analytics.daily_trend.length > 0 ? (
                    analytics.daily_trend.map((day: any) => {
                      const maxChecks = Math.max(...analytics.daily_trend.map((d: any) => d.checks));
                      return (
                        <div key={day.date} className="flex items-center gap-4 hover:bg-gray-50 rounded-lg p-2 transition-all">
                          <div className="w-24 text-sm text-gray-600">
                            {new Date(day.date).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                            <div
                              className="bg-[#f97316] h-full flex items-center justify-end px-3 text-white text-xs font-medium transition-all"
                              style={{ width: `${(day.checks / maxChecks) * 100}%`, minWidth: day.checks > 0 ? '60px' : '0' }}
                            >
                              {day.checks > 0 && `${day.checks} בדיקות`}
                            </div>
                          </div>
                          <div className="w-16 text-sm font-medium text-gray-900">{day.avg_rating}</div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-center py-8">אין נתונים לתקופה זו</p>
                  )}
                </div>
              </motion.div>

              {/* Dish Ratings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">דירוג מנות</h3>
                <div className="space-y-3">
                  {analytics.dish_ratings.length > 0 ? (
                    analytics.dish_ratings.slice(0, 8).map((dish: any) => (
                      <div key={dish.dish_id} className="flex items-center justify-between hover:bg-gray-50 rounded-lg p-2 transition-all">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-sm text-gray-700">{dish.name}</span>
                          {dish.category && <span className="text-xs text-gray-500">({dish.category})</span>}
                          <span className="text-xs text-gray-400">({dish.check_count} בדיקות)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(dish.trend)}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(dish.rating)}`}>
                            {dish.rating}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">אין נתונים לתקופה זו</p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Chef Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow mb-8"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ביצועי טבחים</h3>
              <div className="overflow-x-auto">
                {analytics.chef_performance.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">שם טבח</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">סניף</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">מספר בדיקות</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">ציון ממוצע</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.chef_performance.map((chef: any) => (
                        <tr key={chef.chef_id} className="border-b border-gray-100 hover:bg-gray-50 transition-all">
                          <td className="py-3 px-4 font-medium text-gray-900">{chef.name}</td>
                          <td className="py-3 px-4 text-gray-600">{chef.branch}</td>
                          <td className="py-3 px-4 text-gray-600">{chef.checks_count}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(chef.rating)}`}>
                              {chef.rating}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {chef.rating >= 8.5 ? (
                              <span className="text-green-600 text-sm">מצוין</span>
                            ) : chef.rating >= 7 ? (
                              <span className="text-yellow-600 text-sm">טוב</span>
                            ) : (
                              <span className="text-red-600 text-sm flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                דורש שיפור
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 text-center py-8">אין נתונים לתקופה זו</p>
                )}
              </div>
            </motion.div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">אין נתונים זמינים</p>
          </div>
        )}

        {/* AI Chatbot Toggle Button */}
        <button
          onClick={() => setShowChatbot(!showChatbot)}
          className="fixed bottom-6 left-6 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-all z-50 flex items-center gap-2"
        >
          <MessageSquare className="h-6 w-6" />
          {!showChatbot && <span className="pr-2">שאל את הצ'אט</span>}
        </button>

        {/* AI Chatbot Window */}
        {showChatbot && (
          <div className="fixed bottom-24 left-6 w-96 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 z-50">
            <div className="bg-green-500 text-white p-4 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <h3 className="font-semibold">ניתוח AI - דוחות בדיקות</h3>
              </div>
              <button onClick={() => setShowChatbot(false)} className="text-white hover:text-gray-200">
                ✕
              </button>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <p className="mb-4">👋 שלום! אני כאן לעזור לך לנתח את הנתונים.</p>
                  <p className="text-sm">נסה לשאול:</p>
                  <div className="mt-2 space-y-2 text-sm">
                    <p className="bg-gray-50 p-2 rounded">• איזו מנה הכי חלשה?</p>
                    <p className="bg-gray-50 p-2 rounded">• מה הטרנד בשבוע האחרון?</p>
                    <p className="bg-gray-50 p-2 rounded">• איך ביצועי הטבחים?</p>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="שאל שאלה על הנתונים..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  שלח
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && isAdmin && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">מחיקת בדיקות</h3>

              <div className="space-y-4 mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm font-medium">⚠️ אזהרה: פעולה זו בלתי הפיכה!</p>
                  <p className="text-red-700 text-sm mt-1">הבדיקות שיימחקו לא יהיה ניתן לשחזר.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">תאריך התחלה (אופציונלי)</label>
                  <input
                    type="date"
                    value={deleteStartDate}
                    onChange={(e) => setDeleteStartDate(e.target.value)}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">אם ריק - יימחקו כל הבדיקות עד תאריך הסיום</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">תאריך סיום (אופציונלי)</label>
                  <input
                    type="date"
                    value={deleteEndDate}
                    onChange={(e) => setDeleteEndDate(e.target.value)}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">אם ריק - יימחקו כל הבדיקות מתאריך ההתחלה</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    הקלד <span className="font-mono bg-gray-100 px-2 py-1 rounded">DELETE</span> לאישור
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteStartDate('');
                    setDeleteEndDate('');
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isDeleting}
                >
                  ביטול
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'מוחק...' : 'מחק'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;
