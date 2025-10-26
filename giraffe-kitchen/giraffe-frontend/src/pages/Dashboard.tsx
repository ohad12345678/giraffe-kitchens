import React, { useState, useEffect } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { checkAPI, sanitationAuditAPI } from '../services/api';
import { Building2, LogOut, TrendingUp, TrendingDown } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, logout, isHQ } = useAuth();
  const [loading, setLoading] = useState(true);

  // New dashboard stats
  const [dishStats, setDishStats] = useState<{
    best_dish: { name: string; score: number; check_count: number } | null;
    worst_dish: { name: string; score: number; check_count: number } | null;
    this_week_checks: number;
    last_week_checks: number;
  } | null>(null);

  const [sanitationStats, setSanitationStats] = useState<{
    best_branch: { name: string; score: number; audit_count: number } | null;
    worst_branch: { name: string; score: number; audit_count: number } | null;
  } | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load dish stats (quality checks)
      const dishData = await checkAPI.getDashboardStats();
      setDishStats(dishData);

      // Load sanitation stats
      const sanitData = await sanitationAuditAPI.getDashboardStats();
      setSanitationStats(sanitData);
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
          {/* Box 1: Best & Worst Dishes (Week) */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-4 text-center">מנות - שבוע אחרון</h3>
            <div className="space-y-4">
              {/* Best Dish */}
              <div className="flex items-start gap-2">
                <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">הכי טוב</p>
                  {dishStats?.best_dish ? (
                    <>
                      <p className="text-lg font-bold text-green-600">{dishStats.best_dish.name}</p>
                      <p className="text-xs text-gray-500">
                        ציון: {dishStats.best_dish.score} | {dishStats.best_dish.check_count} בדיקות
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">אין נתונים</p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200"></div>

              {/* Worst Dish */}
              <div className="flex items-start gap-2">
                <TrendingDown className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">דורש שיפור</p>
                  {dishStats?.worst_dish ? (
                    <>
                      <p className="text-lg font-bold text-red-600">{dishStats.worst_dish.name}</p>
                      <p className="text-xs text-gray-500">
                        ציון: {dishStats.worst_dish.score} | {dishStats.worst_dish.check_count} בדיקות
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">אין נתונים</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: Best & Worst Branches Sanitation (Month) */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-4 text-center">תברואה - חודש אחרון</h3>
            <div className="space-y-4">
              {/* Best Branch */}
              <div className="flex items-start gap-2">
                <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">הכי טוב</p>
                  {sanitationStats?.best_branch ? (
                    <>
                      <p className="text-lg font-bold text-green-600">{sanitationStats.best_branch.name}</p>
                      <p className="text-xs text-gray-500">
                        ציון: {sanitationStats.best_branch.score} | {sanitationStats.best_branch.audit_count} ביקורות
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">אין נתונים</p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200"></div>

              {/* Worst Branch */}
              <div className="flex items-start gap-2">
                <TrendingDown className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">דורש שיפור</p>
                  {sanitationStats?.worst_branch ? (
                    <>
                      <p className="text-lg font-bold text-red-600">{sanitationStats.worst_branch.name}</p>
                      <p className="text-xs text-gray-500">
                        ציון: {sanitationStats.worst_branch.score} | {sanitationStats.worst_branch.audit_count} ביקורות
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">אין נתונים</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Box 3: Quality Checks This Week vs Last Week */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-4 text-center">בדיקות איכות</h3>
            <div className="space-y-4">
              {/* This Week */}
              <div>
                <p className="text-sm font-medium text-gray-700">השבוע</p>
                <p className="text-3xl font-bold text-gray-900">{dishStats?.this_week_checks || 0}</p>
                <p className="text-xs text-gray-500">בדיקות מנות</p>
              </div>

              <div className="border-t border-gray-200"></div>

              {/* Last Week */}
              <div>
                <p className="text-sm font-medium text-gray-700">שבוע שעבר</p>
                <p className="text-3xl font-bold text-gray-600">{dishStats?.last_week_checks || 0}</p>
                <p className="text-xs text-gray-500">בדיקות מנות</p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;
