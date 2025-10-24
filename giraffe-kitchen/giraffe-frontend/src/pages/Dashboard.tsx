import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { checkAPI } from '../services/api';
import { Building2, LogOut } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isHQ } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayChecks, setTodayChecks] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [weakestDish, setWeakestDish] = useState<{
    dish_name: string | null;
    avg_score: number | null;
    check_count: number;
    message?: string;
  } | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load today's analytics
      const today = new Date().toISOString().split('T')[0];
      const analyticsData = await checkAPI.getAnalytics({
        start_date: today,
        end_date: today,
      });

      setTodayChecks(analyticsData.kpis.total_checks);
      setAverageRating(analyticsData.kpis.average_rating);

      // Load weakest dish for the week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weakestDishData = await checkAPI.getWeakestDish();
      setWeakestDish(weakestDishData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-primary-500 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Giraffe Kitchens</h1>
                <p className="text-sm text-gray-600">מערכת בקרת איכות מזון</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500">
                  {isHQ ? 'משתמש מטה' : 'מנהל סניף'}
                </p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                התנתק
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">בדיקות היום</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{todayChecks}</p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">ממוצע ציונים</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
              </p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">מנה חלשה השבוע</p>
              {weakestDish?.dish_name ? (
                <>
                  <p className="text-2xl font-bold text-red-600 mt-2">{weakestDish.dish_name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    ממוצע: {weakestDish.avg_score?.toFixed(1)} | {weakestDish.check_count} בדיקות
                  </p>
                </>
              ) : (
                <p className="text-lg text-gray-400 mt-2">{weakestDish?.message || 'טוען...'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 relative z-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">פעולות מהירות</h2>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/new-check')}
              className="p-4 border-2 border-primary-200 rounded-lg hover:bg-primary-50 transition-colors text-center"
            >
              <span className="font-medium text-gray-900">בדיקת מנות</span>
            </button>

            {/* Tasks button - HQ only */}
            {isHQ && (
              <button
                onClick={() => navigate('/tasks')}
                className="p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-center"
              >
                <span className="font-medium text-gray-900">משימות</span>
              </button>
            )}

            {/* Sanitation Audits button */}
            <button
              onClick={() => navigate('/sanitation-audits')}
              className="p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors text-center"
            >
              <span className="font-medium text-gray-900">ביקורת תברואה</span>
            </button>

            {/* Manager Evaluations button */}
            <button
              onClick={() => navigate('/manager-evaluations')}
              className="p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-center"
            >
              <span className="font-medium text-gray-900">הערכות מנהלים</span>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <span className="font-medium text-gray-900">דוחות</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
