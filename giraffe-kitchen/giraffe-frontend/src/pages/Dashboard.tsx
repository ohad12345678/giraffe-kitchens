import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkAPI, sanitationAuditAPI } from '../services/api';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Layout from '../components/Layout';

// Hebrew name mappings for special users
const HEBREW_NAMES: Record<string, string> = {
  'aviv@giraffe.com': 'אביב',
  'nofar@giraffe.com': 'נופר',
  'ohad@giraffe.com': 'אוהד',
  'avital@giraffe.co.il': 'אביטל',
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Weekly comparison data
  const [weeklyComparison, setWeeklyComparison] = useState<{
    this_week: number;
    last_week: number;
    change: number;
  } | null>(null);

  // Branch rankings data
  const [branchRankings, setBranchRankings] = useState<{
    best_branch: { name: string; avg_score: number } | null;
    worst_branch: { name: string; avg_score: number } | null;
    message?: string;
  } | null>(null);

  // Best/worst dishes data
  const [dishComparison, setDishComparison] = useState<{
    best_dish: { name: string | null; avg_score: number | null } | null;
    worst_dish: { name: string | null; avg_score: number | null } | null;
    message?: string;
  } | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all dashboard data in parallel
      const [weeklyData, branchData, dishData] = await Promise.all([
        checkAPI.getWeeklyComparison(),
        sanitationAuditAPI.getBranchRankings(),
        checkAPI.getBestWorstDishes(),
      ]);

      setWeeklyComparison(weeklyData);
      setBranchRankings(branchData);
      setDishComparison(dishData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get Hebrew greeting name
  const getGreetingName = () => {
    if (user?.email && HEBREW_NAMES[user.email]) {
      return HEBREW_NAMES[user.email];
    }
    return user?.full_name || user?.email || 'אורח';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-xl text-gray-600">טוען...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">שלום, {getGreetingName()}!</h1>
          <p className="text-gray-600 mt-1">סקירת מערכת איכות מזון</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Weekly Check Comparison */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">בדיקות איכות מזון</h3>
            <div className="space-y-4">
              {/* This Week */}
              <div className="border-b border-gray-200 pb-3">
                <p className="text-xs text-gray-500 mb-1">השבוע</p>
                <p className="text-3xl font-bold text-gray-900">
                  {weeklyComparison?.this_week || 0}
                </p>
              </div>
              {/* Last Week */}
              <div className="pt-1">
                <p className="text-xs text-gray-500 mb-1">שבוע שעבר</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold text-gray-600">
                    {weeklyComparison?.last_week || 0}
                  </p>
                  {weeklyComparison && weeklyComparison.change !== 0 && (
                    <span
                      className={`flex items-center gap-1 text-sm font-medium ${
                        weeklyComparison.change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {weeklyComparison.change > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {Math.abs(weeklyComparison.change)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Branch Sanitation Rankings */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">סניפים בתברואה - החודש</h3>
            <div className="space-y-4">
              {/* Best Branch */}
              <div className="border-b border-gray-200 pb-3">
                <p className="text-xs text-gray-500 mb-1">מצטיין</p>
                {branchRankings?.best_branch ? (
                  <>
                    <p className="text-xl font-bold text-green-600">
                      {branchRankings.best_branch.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      ציון: {branchRankings.best_branch.avg_score}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">{branchRankings?.message || 'אין נתונים'}</p>
                )}
              </div>
              {/* Worst Branch */}
              <div className="pt-1">
                <p className="text-xs text-gray-500 mb-1">לשיפור</p>
                {branchRankings?.worst_branch ? (
                  <>
                    <p className="text-lg font-semibold text-orange-600">
                      {branchRankings.worst_branch.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      ציון: {branchRankings.worst_branch.avg_score}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">אין נתונים נוספים</p>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Best/Worst Dishes */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">מנות השבוע</h3>
            <div className="space-y-4">
              {/* Best Dish */}
              <div className="border-b border-gray-200 pb-3">
                <p className="text-xs text-gray-500 mb-1">מנה חזקה</p>
                {dishComparison?.best_dish?.name ? (
                  <>
                    <p className="text-xl font-bold text-green-600">
                      {dishComparison.best_dish.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      ממוצע: {dishComparison.best_dish.avg_score?.toFixed(1)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">{dishComparison?.message || 'אין נתונים'}</p>
                )}
              </div>
              {/* Worst Dish */}
              <div className="pt-1">
                <p className="text-xs text-gray-500 mb-1">מנה חלשה</p>
                {dishComparison?.worst_dish?.name ? (
                  <>
                    <p className="text-lg font-semibold text-red-600">
                      {dishComparison.worst_dish.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      ממוצע: {dishComparison.worst_dish.avg_score?.toFixed(1)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">אין נתונים נוספים</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
