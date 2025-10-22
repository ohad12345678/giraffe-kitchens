import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { checkAPI, branchAPI, dishAPI } from '../services/api';
import { ArrowRight, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import UnifiedAIChat from '../components/UnifiedAIChat';
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
          <div className="flex items-center justify-between">
            {/* Left side - empty or future action buttons */}
            <div></div>

            {/* Right side - Back button (RTL layout) */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span>חזרה לדשבורד</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">דוחות וניתוחים</h1>
          <p className="text-gray-600">ניתוח מעמיק של בדיקות האיכות במערכת</p>
        </div>

        {/* Filters */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
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
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-600 mb-1">סך הבדיקות</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.kpis.total_checks}</p>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-600 mb-1">ממוצע ציונים</p>
                <p className="text-3xl font-bold text-green-600">{analytics.kpis.average_rating}</p>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-600 mb-1">מנות בעייתיות</p>
                <p className="text-3xl font-bold text-red-600">{analytics.kpis.weak_dishes}</p>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-600 mb-1">טבח מוביל</p>
                {analytics.kpis.top_chef ? (
                  <>
                    <p className="text-xl font-bold text-gray-900">{analytics.kpis.top_chef}</p>
                    <p className="text-sm text-green-600">ציון: {analytics.kpis.top_chef_rating}</p>
                  </>
                ) : (
                  <p className="text-lg text-gray-400">אין נתונים</p>
                )}
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Daily Trend */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">מגמת בדיקות לפי תאריך</h3>
                <div className="space-y-3">
                  {analytics.daily_trend.length > 0 ? (
                    analytics.daily_trend.map((day: any) => {
                      const maxChecks = Math.max(...analytics.daily_trend.map((d: any) => d.checks));
                      return (
                        <div key={day.date} className="flex items-center gap-4">
                          <div className="w-24 text-sm text-gray-600">
                            {new Date(day.date).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                            <div
                              className="bg-primary-500 h-full flex items-center justify-end px-3 text-white text-xs font-medium transition-all"
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
              </div>

              {/* Dish Ratings */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">דירוג מנות</h3>
                <div className="space-y-3">
                  {analytics.dish_ratings.length > 0 ? (
                    analytics.dish_ratings.slice(0, 8).map((dish: any) => (
                      <div key={dish.dish_id} className="flex items-center justify-between">
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
              </div>
            </div>

            {/* Chef Performance */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ביצועי טבחים</h3>
              <div className="overflow-x-auto">
                {analytics.chef_performance.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">שם טבח</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">סניף</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">מספר בדיקות</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">ציון ממוצע</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.chef_performance.map((chef: any) => (
                        <tr key={chef.chef_id} className="border-b border-gray-100 hover:bg-gray-50">
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
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">אין נתונים זמינים</p>
          </div>
        )}

        {/* Unified AI Chat */}
        <UnifiedAIChat contextType="checks" title="ניתוח AI - דוחות בדיקות" />

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
