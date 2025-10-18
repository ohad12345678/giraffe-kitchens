import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { branchAPI, checkAPI } from '../services/api';
import { Building2, LogOut, Plus } from 'lucide-react';
import type { Branch } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isHQ } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [weakestDish, setWeakestDish] = useState<{
    dish_name: string | null;
    avg_score: number | null;
    check_count: number;
    message?: string;
  } | null>(null);

  useEffect(() => {
    loadBranches();
    loadWeakestDish();
  }, []);

  const loadBranches = async () => {
    try {
      const data = await branchAPI.list();
      setBranches(data);

      // Auto-select branch for branch managers
      if (!isHQ && user?.branch_id) {
        setSelectedBranch(user.branch_id);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeakestDish = async () => {
    try {
      const data = await checkAPI.getWeakestDish();
      setWeakestDish(data);
    } catch (error) {
      console.error('Failed to load weakest dish:', error);
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
        {/* Branch Selector (HQ only) */}
        {isHQ && (
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              בחר סניף
            </label>
            <select
              value={selectedBranch || ''}
              onChange={(e) => setSelectedBranch(Number(e.target.value) || null)}
              className="block w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">כל הסניפים</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} {branch.location && `- ${branch.location}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">בדיקות היום</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">12</p>
              </div>
              <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ממוצע ציונים</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">8.5</p>
              </div>
              <div className="h-12 w-12 bg-secondary-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⭐</span>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
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
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6 relative z-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">פעולות מהירות</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                if (isHQ && !selectedBranch) {
                  alert('⚠️ יש לבחור סניף לפני יצירת בדיקה');
                  return;
                }
                navigate('/new-check', { state: { branchId: selectedBranch || user?.branch_id } });
              }}
              className="flex items-center gap-3 p-4 border-2 border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
            >
              <div className="h-10 w-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium text-gray-900">בדיקה חדשה</span>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="h-10 w-10 bg-gray-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">📊</span>
              </div>
              <span className="font-medium text-gray-900">דוחות</span>
            </button>

            {/* Tasks button - HQ only */}
            {isHQ && (
              <button
                onClick={() => navigate('/tasks')}
                className="flex items-center gap-3 p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
              >
                <div className="h-10 w-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">✓</span>
                </div>
                <span className="font-medium text-gray-900">ניהול משימות</span>
              </button>
            )}
          </div>
        </div>

        {/* Recent Checks */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">בדיקות אחרונות</h2>
          <div className="text-center text-gray-500 py-8">
            אין בדיקות להצגה
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
