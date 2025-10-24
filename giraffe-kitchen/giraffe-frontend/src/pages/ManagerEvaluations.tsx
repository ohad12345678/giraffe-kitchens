import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { managerEvaluationAPI, branchAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { ManagerEvaluationSummary, Branch, EvaluationStatus } from '../types';
import {
  Users,
  Building2,
  Calendar,
  BarChart3,
  Plus,
  Eye,
  Trash2,
  CheckCircle,
  FileText
} from 'lucide-react';

export default function ManagerEvaluations() {
  const navigate = useNavigate();
  const { isHQ, user } = useAuth();
  const [evaluations, setEvaluations] = useState<ManagerEvaluationSummary[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<EvaluationStatus | ''>('');

  useEffect(() => {
    loadData();
  }, [selectedBranch, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load branches for filter (HQ only)
      if (isHQ) {
        const branchesData = await branchAPI.list();
        setBranches(branchesData);
      }

      // Load evaluations
      const filters: any = {};
      if (selectedBranch) filters.branch_id = selectedBranch;
      if (selectedStatus) filters.status = selectedStatus;
      if (!isHQ && user) filters.manager_id = user.id;

      const evaluationsData = await managerEvaluationAPI.list(filters);
      setEvaluations(evaluationsData);
    } catch (err: any) {
      console.error('Failed to load evaluations:', err);
      setError('שגיאה בטעינת ההערכות');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק הערכה זו?')) {
      return;
    }

    try {
      await managerEvaluationAPI.delete(id);
      setEvaluations(evaluations.filter(e => e.id !== id));
    } catch (err: any) {
      console.error('Failed to delete evaluation:', err);
      alert('שגיאה במחיקת ההערכה');
    }
  };

  const getPerformanceLevelColor = (level: string | null) => {
    if (!level) return 'bg-gray-100 text-gray-700';

    switch (level) {
      case 'outstanding':
        return 'bg-green-100 text-green-700';
      case 'exceeds_expectations':
        return 'bg-blue-100 text-blue-700';
      case 'meets_expectations':
        return 'bg-yellow-100 text-yellow-700';
      case 'needs_improvement':
        return 'bg-orange-100 text-orange-700';
      case 'does_not_meet':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPerformanceLevelText = (level: string | null) => {
    if (!level) return 'לא הוגדר';

    switch (level) {
      case 'outstanding':
        return 'מצטיין';
      case 'exceeds_expectations':
        return 'עולה על הציפיות';
      case 'meets_expectations':
        return 'עומד בציפיות';
      case 'needs_improvement':
        return 'דורש שיפור';
      case 'does_not_meet':
        return 'לא עומד בציפיות';
      default:
        return level;
    }
  };

  const getStatusColor = (status: EvaluationStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      case 'reviewed':
        return 'bg-purple-100 text-purple-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: EvaluationStatus) => {
    switch (status) {
      case 'draft':
        return 'טיוטה';
      case 'in_progress':
        return 'בתהליך';
      case 'completed':
        return 'הושלם';
      case 'reviewed':
        return 'נסקר';
      case 'approved':
        return 'אושר';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">טוען הערכות מנהלים...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">הערכות מנהלים</h1>
            <p className="text-gray-600 mt-2">
              {isHQ
                ? 'ניהול וצפייה בהערכות ביצועים של מנהלי הסניפים'
                : 'צפייה בהערכות הביצועים שלך'
              }
            </p>
          </div>

          {isHQ && (
            <button
              onClick={() => navigate('/manager-evaluations/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              הערכה חדשה
            </button>
          )}
        </div>

        {/* Filters */}
        {isHQ && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סניף</label>
                <select
                  value={selectedBranch || ''}
                  onChange={(e) => setSelectedBranch(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל הסניפים</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as EvaluationStatus | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל הסטטוסים</option>
                  <option value="draft">טיוטה</option>
                  <option value="in_progress">בתהליך</option>
                  <option value="completed">הושלם</option>
                  <option value="reviewed">נסקר</option>
                  <option value="approved">אושר</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Evaluations List */}
        {evaluations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {isHQ
                ? 'לא נמצאו הערכות. לחץ על "הערכה חדשה" כדי להתחיל'
                : 'אין לך הערכות זמינות לצפייה'
              }
            </p>
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
                      תקופה
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ציון כולל
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      רמת ביצועים
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      סטטוס
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      תאריך יצירה
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {evaluations.map(evaluation => (
                    <tr key={evaluation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserCircleIcon className="h-5 w-5 text-gray-400 ml-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {evaluation.manager_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <BuildingOfficeIcon className="h-5 w-5 text-gray-400 ml-2" />
                          <span className="text-sm text-gray-900">
                            {evaluation.branch_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(evaluation.evaluation_period_start)} - {formatDate(evaluation.evaluation_period_end)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          <ChartBarIcon className="h-5 w-5 text-gray-400 ml-2" />
                          <span className="text-sm font-bold text-gray-900">
                            {evaluation.total_score.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPerformanceLevelColor(evaluation.performance_level)}`}>
                          {getPerformanceLevelText(evaluation.performance_level)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(evaluation.status)}`}>
                          {getStatusText(evaluation.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 ml-2" />
                          {formatDate(evaluation.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/manager-evaluations/${evaluation.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </Link>

                          {isHQ && evaluation.status !== 'approved' && (
                            <button
                              onClick={() => handleDelete(evaluation.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}

                          {isHQ && evaluation.status === 'completed' && (
                            <button
                              onClick={async () => {
                                try {
                                  await managerEvaluationAPI.approve(evaluation.id);
                                  loadData();
                                } catch (err) {
                                  console.error('Failed to approve:', err);
                                  alert('שגיאה באישור ההערכה');
                                }
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="אשר הערכה"
                            >
                              <CheckBadgeIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}