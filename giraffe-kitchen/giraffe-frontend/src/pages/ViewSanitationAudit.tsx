import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sanitationAuditAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { SanitationAudit } from '../types';

export default function ViewSanitationAudit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isHQ } = useAuth();
  const [audit, setAudit] = useState<SanitationAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadAudit(Number(id));
    }
  }, [id]);

  const loadAudit = async (auditId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await sanitationAuditAPI.get(auditId);
      setAudit(data);
    } catch (err: any) {
      console.error('Failed to load audit:', err);
      setError(err.response?.data?.detail || 'שגיאה בטעינת ביקורת');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק ביקורת זו? פעולה זו לא ניתנת לביטול.')) {
      return;
    }

    try {
      await sanitationAuditAPI.delete(Number(id));
      alert('הביקורת נמחקה בהצלחה');
      navigate('/sanitation-audits');
    } catch (err: any) {
      console.error('Failed to delete audit:', err);
      alert(err.response?.data?.detail || 'שגיאה במחיקת ביקורת');
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
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-lg">טוען ביקורת...</div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error || 'ביקורת לא נמצאה'}
        </div>
      </div>
    );
  }

  const categoriesWithIssues = audit.categories.filter(cat => cat.score_deduction > 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                ביקורת תברואה #{audit.id}
              </h1>
              <p className="text-gray-600">
                {formatDate(audit.audit_date)} • {formatTime(audit.start_time)}
              </p>
            </div>
            {getStatusBadge(audit.status)}
          </div>

          {/* Score Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">ציון סופי</div>
              <div className={`text-4xl font-bold ${getScoreColor(audit.total_score)}`}>
                {audit.total_score.toFixed(1)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">ליקויים</div>
              <div className="text-4xl font-bold text-gray-900">
                {categoriesWithIssues.length}
              </div>
              <div className="text-xs text-gray-500">מתוך {audit.categories.length}</div>
            </div>
          </div>
        </div>

        {/* Audit Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">פרטי ביקורת</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">סניף</div>
              <div className="text-lg font-medium">{audit.branch_id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">מבקר</div>
              <div className="text-lg font-medium">{audit.auditor_name}</div>
            </div>
            {audit.accompanist_name && (
              <div>
                <div className="text-sm text-gray-500">מלווה מהסניף</div>
                <div className="text-lg font-medium">{audit.accompanist_name}</div>
              </div>
            )}
            {audit.end_time && (
              <div>
                <div className="text-sm text-gray-500">שעת סיום</div>
                <div className="text-lg font-medium">{formatTime(audit.end_time)}</div>
              </div>
            )}
          </div>

          {audit.general_notes && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">הערות כלליות</div>
              <p className="text-gray-900 whitespace-pre-wrap">{audit.general_notes}</p>
            </div>
          )}

          {audit.equipment_issues && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">בעיות ציוד</div>
              <p className="text-gray-900 whitespace-pre-wrap">{audit.equipment_issues}</p>
            </div>
          )}
        </div>

        {/* Issues Summary */}
        {categoriesWithIssues.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-red-900 mb-4">סיכום ליקויים</h2>
            <div className="space-y-3">
              {categoriesWithIssues.map((category) => (
                <div key={category.id} className="bg-white rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">{category.category_name}</div>
                    <div className="text-red-600 font-bold">-{category.score_deduction}</div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">סטטוס:</span> {category.status}
                  </div>
                  {category.notes && (
                    <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                      {category.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Categories */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">כל הקטגוריות</h2>
          <div className="space-y-4">
            {audit.categories.map((category, index) => (
              <div
                key={category.id}
                className={`border rounded-lg p-4 ${
                  category.score_deduction > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-gray-900">
                    {index + 1}. {category.category_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm px-2 py-1 rounded ${
                        category.status === 'תקין'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {category.status}
                    </span>
                    {category.score_deduction > 0 && (
                      <span className="text-red-600 font-bold">
                        -{category.score_deduction}
                      </span>
                    )}
                  </div>
                </div>

                {category.check_performed !== null && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">{category.check_name}:</span>{' '}
                    {category.check_performed ? 'כן' : 'לא'}
                  </div>
                )}

                {category.notes && (
                  <div className="text-sm text-gray-700 mt-2 bg-white p-2 rounded border border-gray-200">
                    {category.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Deficiencies Summary */}
        {audit.deficiencies_summary && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">סיכום ליקויים (טקסט)</h2>
            <div className="text-gray-700 whitespace-pre-wrap">
              {audit.deficiencies_summary}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/sanitation-audits')}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            חזרה לרשימה
          </button>
          {isHQ && (
            <>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                הדפס
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                מחק ביקורת
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
