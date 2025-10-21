import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { checkAPI } from '../services/api';
import { Building2, LogOut, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import NotificationBadge from '../components/manager-reviews/NotificationBadge';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isHQ } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await checkAPI.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (changePercent: number) => {
    if (changePercent > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (changePercent < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (changePercent: number) => {
    if (changePercent > 0) return 'text-green-600';
    if (changePercent < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              {/* Manager Reviews Notifications */}
              <NotificationBadge />

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
        {/* Dashboard Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

          {/* Card 1: Daily Checks + Average Score */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-4">בדיקות מנות היום</h3>
            <div className="space-y-4">
              {/* Checks Count */}
              <div>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-bold text-gray-900">{stats?.daily_checks.today_count || 0}</p>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(stats?.daily_checks.count_change_percent || 0)}
                    <span className={`text-sm font-medium ${getTrendColor(stats?.daily_checks.count_change_percent || 0)}`}>
                      {stats?.daily_checks.count_change_percent > 0 ? '+' : ''}
                      {stats?.daily_checks.count_change_percent?.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  לעומת {stats?.daily_checks.last_week_count || 0} בשבוע שעבר
                </p>
              </div>

              {/* Average Score */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-600 mb-1">ממוצע ציונים</p>
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats?.daily_checks.today_avg_score?.toFixed(1) || '0.0'}
                  </p>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(stats?.daily_checks.avg_change_percent || 0)}
                    <span className={`text-sm font-medium ${getTrendColor(stats?.daily_checks.avg_change_percent || 0)}`}>
                      {stats?.daily_checks.avg_change_percent > 0 ? '+' : ''}
                      {stats?.daily_checks.avg_change_percent?.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  לעומת {stats?.daily_checks.last_week_avg_score?.toFixed(1) || '0.0'} בשבוע שעבר
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Weekly Sanitation Audits */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-4">ביקורות תברואה שבועיות</h3>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-green-600">{stats?.weekly_audits.this_week_count || 0}</p>
              <div className="flex items-center gap-1">
                {getTrendIcon(stats?.weekly_audits.change_percent || 0)}
                <span className={`text-sm font-medium ${getTrendColor(stats?.weekly_audits.change_percent || 0)}`}>
                  {stats?.weekly_audits.change_percent > 0 ? '+' : ''}
                  {stats?.weekly_audits.change_percent?.toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              לעומת {stats?.weekly_audits.last_month_count || 0} באותו שבוע בחודש שעבר
            </p>
          </div>

          {/* Card 3: Strongest & Weakest Dishes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-4">מנות - 30 יום אחרונים</h3>
            <div className="space-y-4">
              {/* Strongest Dish */}
              <div>
                <p className="text-xs text-gray-500 mb-1">מנה חזקה 💪</p>
                {stats?.dishes.strongest ? (
                  <>
                    <p className="text-lg font-bold text-green-600">{stats.dishes.strongest.name}</p>
                    <p className="text-sm text-gray-600">
                      ציון: {stats.dishes.strongest.score} | {stats.dishes.strongest.check_count} בדיקות
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">אין מספיק נתונים</p>
                )}
              </div>

              {/* Weakest Dish */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">מנה חלשה ⚠️</p>
                {stats?.dishes.weakest ? (
                  <>
                    <p className="text-lg font-bold text-red-600">{stats.dishes.weakest.name}</p>
                    <p className="text-sm text-gray-600">
                      ציון: {stats.dishes.weakest.score} | {stats.dishes.weakest.check_count} בדיקות
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">אין מספיק נתונים</p>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Best & Worst Branches for Sanitation (HQ only) - Combined */}
          {isHQ && (stats?.branches.best || stats?.branches.worst) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <h3 className="text-sm font-medium text-gray-600 mb-4">סניפים - תברואה (90 יום)</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Best Branch */}
                {stats?.branches.best && (
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-xs text-gray-500 mb-2">סניף מצטיין 🏆</p>
                    <p className="text-lg font-bold text-green-600">{stats.branches.best.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      ציון: {stats.branches.best.score}
                    </p>
                    <p className="text-xs text-gray-500">{stats.branches.best.audit_count} ביקורות</p>
                  </div>
                )}

                {/* Worst Branch */}
                {stats?.branches.worst && (
                  <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-xs text-gray-500 mb-2">דורש שיפור ⚠️</p>
                    <p className="text-lg font-bold text-red-600">{stats.branches.worst.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      ציון: {stats.branches.worst.score}
                    </p>
                    <p className="text-xs text-gray-500">{stats.branches.worst.audit_count} ביקורות</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">פעולות מהירות</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/new-check')}
              className="p-4 border-2 border-primary-200 rounded-lg hover:bg-primary-50 transition-colors text-center"
            >
              <span className="font-medium text-gray-900">בדיקת מנות</span>
            </button>

            {isHQ && (
              <button
                onClick={() => navigate('/tasks')}
                className="p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-center"
              >
                <span className="font-medium text-gray-900">משימות</span>
              </button>
            )}

            <button
              onClick={() => navigate('/sanitation-audits')}
              className="p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors text-center"
            >
              <span className="font-medium text-gray-900">ביקורת תברואה</span>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <span className="font-medium text-gray-900">דוחות</span>
            </button>

            <button
              onClick={() => navigate('/manager-reviews')}
              className="p-4 border-2 border-orange-200 rounded-lg hover:bg-orange-50 transition-colors text-center"
            >
              <span className="font-medium text-gray-900">הערכות מנהלים</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
