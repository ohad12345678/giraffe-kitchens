import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { checkAPI, sanitationAuditAPI } from '../services/api';

interface Stats {
  bestDish: { name: string; score: number; check_count: number } | null;
  worstDish: { name: string; score: number; check_count: number } | null;
  bestBranch: { name: string; score: number; audit_count: number } | null;
  worstBranch: { name: string; score: number; audit_count: number } | null;
  checksThisWeek: number;
  checksLastWeek: number;
}

// Linear-style Card Component
function LinearCard({
  children,
  hover = false,
  className = ''
}: {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -2 } : undefined}
      className={`
        bg-white rounded-xl border border-gray-200 p-6
        transition-all duration-200
        ${hover ? 'hover:shadow-lg hover:border-gray-300' : 'shadow-sm'}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}

// Linear-style Stat Card
function LinearStatCard({
  label,
  value,
  change,
  trend,
  icon: Icon
}: {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  icon?: any;
}) {
  return (
    <LinearCard>
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        {Icon && <Icon className="w-5 h-5 text-gray-400" />}
      </div>

      <div className="flex items-end gap-3">
        <h3 className="text-3xl font-semibold text-gray-900">{value}</h3>

        {change && trend && (
          <div className={`flex items-center gap-1 text-sm font-medium mb-1 ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {change}
          </div>
        )}
      </div>
    </LinearCard>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch dish stats
      const dishData = await checkAPI.getDashboardStats();
      const sanitationData = await sanitationAuditAPI.getDashboardStats();

      setStats({
        bestDish: dishData.best_dish,
        worstDish: dishData.worst_dish,
        bestBranch: sanitationData.best_branch,
        worstBranch: sanitationData.worst_branch,
        checksThisWeek: dishData.this_week_checks,
        checksLastWeek: dishData.last_week_checks,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const checksChange = stats && stats.checksLastWeek > 0
    ? ((stats.checksThisWeek - stats.checksLastWeek) / stats.checksLastWeek * 100).toFixed(0)
    : '0';
  const checksChangeAbs = Math.abs(Number(checksChange));
  const checksTrend = Number(checksChange) >= 0 ? 'up' : 'down';

  // Calculate average rating
  const avgRating = stats?.bestDish?.score
    ? ((stats.bestDish.score + (stats.worstDish?.score || 0)) / 2).toFixed(1)
    : '0';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          דף הבית
        </h1>
        <p className="text-gray-600">
          סקירה כללית של פעילות המטבח
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LinearStatCard
          label="בדיקות השבוע"
          value={stats?.checksThisWeek || 0}
          change={checksChangeAbs > 0 ? `${checksChangeAbs}%` : undefined}
          trend={checksChangeAbs > 0 ? checksTrend : undefined}
          icon={BarChart3}
        />

        <LinearStatCard
          label="ציון ממוצע"
          value={avgRating}
          icon={TrendingUp}
        />
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LinearCard>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <h3 className="font-semibold text-gray-900">מנה מצטיינת</h3>
          </div>

          <div className="space-y-3">
            {stats?.bestDish ? (
              <div>
                <p className="text-2xl font-semibold text-gray-900 mb-1">
                  {stats.bestDish.name}
                </p>
                <p className="text-sm text-gray-600">
                  ציון {stats.bestDish.score}/10 • {stats.bestDish.check_count} בדיקות
                </p>
              </div>
            ) : (
              <p className="text-gray-400">אין נתונים</p>
            )}
          </div>
        </LinearCard>

        <LinearCard>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <h3 className="font-semibold text-gray-900">סניף מצטיין</h3>
          </div>

          <div className="space-y-3">
            {stats?.bestBranch ? (
              <div>
                <p className="text-2xl font-semibold text-gray-900 mb-1">
                  {stats.bestBranch.name}
                </p>
                <p className="text-sm text-gray-600">
                  ציון תברואה {stats.bestBranch.score}/100 • {stats.bestBranch.audit_count} ביקורות
                </p>
              </div>
            ) : (
              <p className="text-gray-400">אין נתונים</p>
            )}
          </div>
        </LinearCard>
      </div>

    </div>
  );
}
