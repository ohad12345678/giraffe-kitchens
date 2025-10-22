import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitationAuditAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight } from 'lucide-react';
import UnifiedAIChat from '../components/UnifiedAIChat';
import type { SanitationAuditSummary } from '../types';

export default function SanitationAudits() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [audits, setAudits] = useState<SanitationAuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAudits();
  }, []);

  const loadAudits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sanitationAuditAPI.list();
      setAudits(data);
    } catch (err: any) {
      console.error('Failed to load audits:', err);
      setError(err.response?.data?.detail || 'שגיאה בטעינת ביקורות');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      in_progress: { text: 'בתהליך', color: 'bg-blue-100 text-blue-800' },
      completed: { text: 'הושלם', color: 'bg-green-100 text-green-800' },
      reviewed: { text: 'נבדק', color: 'bg-purple-100 text-purple-800' },
    };
    const badge = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">טוען ביקורות...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

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
              onClick={() => navigate('/dashboard')}
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
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">ביקורות תברואה</h1>
        {user?.role === 'hq' && (
          <button
            onClick={() => navigate('/sanitation-audits/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            + ביקורת חדשה
          </button>
        )}
      </div>

      {/* Stats Summary */}
      {audits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">סה"כ ביקורות</div>
            <div className="text-2xl font-bold">{audits.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">ממוצע ציונים</div>
            <div className="text-2xl font-bold">
              {(audits.reduce((sum, a) => sum + a.total_score, 0) / audits.length).toFixed(1)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">ביקורת אחרונה</div>
            <div className="text-2xl font-bold">
              {formatDate(audits[0].audit_date)}
            </div>
          </div>
        </div>
      )}

      {/* Audits Table */}
      {audits.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">אין ביקורות עדיין</p>
          {user?.role === 'hq' && (
            <p className="text-gray-400 text-sm mt-2">לחץ על "ביקורת חדשה" למעלה כדי ליצור ביקורת</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  תאריך
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  סניף
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  מבקר
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ציון
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ניקוד
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  סטטוס
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {audits.map((audit) => (
                <tr
                  key={audit.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/sanitation-audits/${audit.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(audit.audit_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {audit.branch_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {audit.auditor_name}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${getScoreColor(audit.total_score)}`}>
                    {audit.total_score.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    -{audit.total_deductions.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getStatusBadge(audit.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/sanitation-audits/${audit.id}`);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      צפה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </div>
      </main>

      {/* Unified AI Chat */}
      <UnifiedAIChat contextType="sanitation" title="ניתוח AI - ביקורות תברואה" />
    </div>
  );
}
