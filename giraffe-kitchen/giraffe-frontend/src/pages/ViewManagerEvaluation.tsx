import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { managerEvaluationAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Trash2, Sparkles, CheckCircle, Clock, Eye, Pencil } from 'lucide-react';
import type { ManagerEvaluation } from '../types';

export default function ViewManagerEvaluation() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [evaluation, setEvaluation] = useState<ManagerEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authorized emails
  const AUTHORIZED_EMAILS = [
    'nofar@giraffe.co.il',
    'aviv@giraffe.co.il',
    'ohadb@giraffe.co.il',
    'avital@giraffe.co.il',
  ];

  const hasAccess = user?.role === 'hq' && user.email && AUTHORIZED_EMAILS.includes(user.email);

  useEffect(() => {
    if (!hasAccess) {
      navigate('/dashboard');
      return;
    }
    if (id) {
      loadEvaluation(Number(id));
    }
  }, [id]);

  const loadEvaluation = async (evaluationId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await managerEvaluationAPI.get(evaluationId);
      setEvaluation(data);
    } catch (err: any) {
      console.error('Failed to load evaluation:', err);
      setError(err.response?.data?.detail || 'שגיאה בטעינת הערכה');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק הערכה זו? פעולה זו לא ניתנת לביטול.')) {
      return;
    }

    try {
      await managerEvaluationAPI.delete(Number(id));
      alert('ההערכה נמחקה בהצלחה');
      navigate('/manager-evaluations');
    } catch (err: any) {
      console.error('Failed to delete evaluation:', err);
      alert(err.response?.data?.detail || 'שגיאה במחיקת הערכה');
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            הושלם
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            <Eye className="h-4 w-4" />
            נבדק
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
            <Clock className="h-4 w-4" />
            טיוטה
          </span>
        );
      default:
        return null;
    }
  };

  if (!hasAccess) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-lg">טוען הערכה...</div>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error || 'הערכה לא נמצאה'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/manager-evaluations')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
              <span>חזרה להערכות</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/manager-evaluations/${id}/edit`)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Pencil className="h-5 w-5" />
                ערוך
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Trash2 className="h-5 w-5" />
                מחק
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    הערכת {evaluation.manager_name}
                  </h1>
                  <p className="text-gray-600">
                    {formatDate(evaluation.evaluation_date)}
                  </p>
                </div>
                {getStatusBadge(evaluation.status)}
              </div>

              {/* Rating Display */}
              {evaluation.overall_score !== null && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">ציון כללי משוקלל</div>
                    <div className={`text-4xl font-bold ${getRatingColor(evaluation.overall_score)}`}>
                      {evaluation.overall_score.toFixed(2)}/10
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* General Comments */}
            {evaluation.general_comments && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">הערות כלליות</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{evaluation.general_comments}</p>
              </div>
            )}

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">קטגוריות הערכה</h2>
              <div className="space-y-4">
                {evaluation.categories.map((category) => (
                  <div key={category.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{category.category_name}</h3>
                      <span className={`text-2xl font-bold ${getRatingColor(category.rating)}`}>
                        {category.rating}/10
                      </span>
                    </div>
                    {category.comments && (
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">{category.comments}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Summary */}
            {evaluation.ai_summary && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  סיכום AI מקצועי
                </h2>
                <div className="prose prose-sm max-w-none">
                  <div className="text-gray-700 whitespace-pre-wrap">{evaluation.ai_summary}</div>
                </div>
              </div>
            )}
        </div>
      </main>
    </div>
  );
}
