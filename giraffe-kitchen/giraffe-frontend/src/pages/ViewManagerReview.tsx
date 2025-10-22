import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { managerReviewAPI } from '../services/managerReviewAPI';
import type { DetailedReview, UpdateReviewRequest } from '../types/managerReview';
import ScoreInput from '../components/manager-reviews/ScoreInput';
import TrendChart from '../components/manager-reviews/TrendChart';
import AIChat from '../components/manager-reviews/AIChat';
import { exportReviewToPDF } from '../utils/pdfExport';
import { REVIEW_CATEGORIES } from '../config/reviewCategories';
import {
  ArrowLeft,
  Building2,
  Calendar,
  User,
  Save,
  Send,
  TrendingUp,
  AlertCircle,
  FileDown,
  Trash2
} from 'lucide-react';

const ViewManagerReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<DetailedReview | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Helper function to get points for a subcategory
  const getSubcategoryPoints = (subcategoryId: string): string[] => {
    for (const category of REVIEW_CATEGORIES) {
      const subcategory = category.subcategories.find(sub => sub.id === subcategoryId);
      if (subcategory) {
        return subcategory.points;
      }
    }
    return [];
  };

  // Form state for all scores
  const [scores, setScores] = useState({
    // Operational (35%)
    sanitation: { score: null as number | null, comments: '' },
    inventory: { score: null as number | null, comments: '' },
    quality: { score: null as number | null, comments: '' },
    maintenance: { score: null as number | null, comments: '' },

    // People (30%)
    recruitment: { score: null as number | null, comments: '' },
    scheduling: { score: null as number | null, comments: '' },
    retention: { score: null as number | null, comments: '' },

    // Business (25%)
    sales: { score: null as number | null, comments: '' },
    efficiency: { score: null as number | null, comments: '' },

    // Leadership (10%)
    leadership: { score: null as number | null, comments: '' },
  });

  useEffect(() => {
    if (id) {
      loadReview();
    }
  }, [id]);

  const loadReview = async () => {
    try {
      setLoading(true);
      const data = await managerReviewAPI.getReview(Number(id));
      setReview(data);

      // Load manager history for trend chart
      if (data.manager?.id) {
        try {
          const historyData = await managerReviewAPI.getManagerHistory(data.manager.id);
          setHistory(historyData.history || []);
        } catch (err) {
          console.error('Failed to load history:', err);
          setHistory([]);
        }
      }

      // Populate form with existing scores
      setScores({
        sanitation: {
          score: data.operational.sanitation.score,
          comments: data.operational.sanitation.comments || ''
        },
        inventory: {
          score: data.operational.inventory.score,
          comments: data.operational.inventory.comments || ''
        },
        quality: {
          score: data.operational.quality.score,
          comments: data.operational.quality.comments || ''
        },
        maintenance: {
          score: data.operational.maintenance.score,
          comments: data.operational.maintenance.comments || ''
        },
        recruitment: {
          score: data.people.recruitment.score,
          comments: data.people.recruitment.comments || ''
        },
        scheduling: {
          score: data.people.scheduling.score,
          comments: data.people.scheduling.comments || ''
        },
        retention: {
          score: data.people.retention.score,
          comments: data.people.retention.comments || ''
        },
        sales: {
          score: data.business.sales.score,
          comments: data.business.sales.comments || ''
        },
        efficiency: {
          score: data.business.efficiency.score,
          comments: data.business.efficiency.comments || ''
        },
        leadership: {
          score: data.leadership.score,
          comments: data.leadership.comments || ''
        },
      });
    } catch (err: any) {
      console.error('Failed to load review:', err);
      setError('שגיאה בטעינת ההערכה');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const updateData: UpdateReviewRequest = {
        sanitation: scores.sanitation.score !== null ? scores.sanitation : undefined,
        inventory: scores.inventory.score !== null ? scores.inventory : undefined,
        quality: scores.quality.score !== null ? scores.quality : undefined,
        maintenance: scores.maintenance.score !== null ? scores.maintenance : undefined,
        recruitment: scores.recruitment.score !== null ? scores.recruitment : undefined,
        scheduling: scores.scheduling.score !== null ? scores.scheduling : undefined,
        retention: scores.retention.score !== null ? scores.retention : undefined,
        sales: scores.sales.score !== null ? scores.sales : undefined,
        efficiency: scores.efficiency.score !== null ? scores.efficiency : undefined,
        leadership: scores.leadership.score !== null ? scores.leadership : undefined,
      };

      await managerReviewAPI.updateReview(Number(id), updateData);
      await loadReview(); // Reload to get updated overall score
      alert('ההערכה נשמרה בהצלחה!');
    } catch (err: any) {
      console.error('Failed to save review:', err);
      setError(err.response?.data?.detail || 'שגיאה בשמירת ההערכה');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('האם אתה בטוח שברצונך לשלוח את ההערכה? לא ניתן לערוך אותה לאחר השליחה.')) {
      return;
    }

    try {
      setSaving(true);
      await managerReviewAPI.submitReview(Number(id));
      await loadReview();
      alert('ההערכה נשלחה בהצלחה!');
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setError(err.response?.data?.detail || 'שגיאה בשליחת ההערכה');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את ההערכה? פעולה זו אינה ניתנת לביטול.')) {
      return;
    }

    try {
      setSaving(true);
      await managerReviewAPI.deleteReview(Number(id));
      alert('ההערכה נמחקה בהצלחה');
      navigate('/manager-reviews');
    } catch (err: any) {
      console.error('Failed to delete review:', err);
      setError(err.response?.data?.detail || 'שגיאה במחיקת ההערכה');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setGeneratingSummary(true);
      setError(null);
      const result = await managerReviewAPI.generateAISummary(Number(id));
      await loadReview(); // Reload to get updated summary
      alert('✅ ' + result.message);
    } catch (err: any) {
      console.error('Failed to generate summary:', err);
      setError(err.response?.data?.detail || 'שגיאה ביצירת סיכום AI');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
    };
    const labels = {
      draft: 'טיוטה',
      submitted: 'הוגש',
      completed: 'הושלם',
    };
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">טוען הערכה...</p>
        </div>
      </div>
    );
  }

  if (error && !review) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">שגיאה</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => navigate('/manager-reviews')}
            className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            חזרה לרשימה
          </button>
        </div>
      </div>
    );
  }

  if (!review) return null;

  const isEditable = review.status === 'draft';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {getStatusBadge(review.status)}

              {/* Export PDF Button - Always visible */}
              <button
                onClick={() => exportReviewToPDF(review)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <FileDown className="h-4 w-4" />
                ייצא PDF
              </button>

              {isEditable && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    שמור טיוטה
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    שלח להערכה
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    מחק
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">הערכת ביצועים</h1>
                <p className="text-sm text-gray-600">{review.manager?.name}</p>
              </div>
              <button
                onClick={() => navigate('/manager-reviews')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <User className="h-4 w-4" />
              <span className="text-sm">מנהל</span>
            </div>
            <p className="font-semibold text-gray-900">{review.manager?.name}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-sm">סניף</span>
            </div>
            <p className="font-semibold text-gray-900">{review.branch?.name}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">תקופה</span>
            </div>
            <p className="font-semibold text-gray-900">{review.quarter} {review.year}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">ציון כולל</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(review.overall_score)}`}>
              {review.overall_score?.toFixed(1) || '-'}
            </p>
          </div>
        </div>

        {/* Auto Data Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📊 נתונים אוטומטיים מהמערכת</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">ממוצע תברואה:</span>{' '}
              <span className="font-semibold text-blue-900">
                {review.auto_data.sanitation_avg?.toFixed(1) || '-'}
                {review.auto_data.sanitation_count ? ` (${review.auto_data.sanitation_count} ביקורות)` : ''}
              </span>
            </div>
            <div>
              <span className="text-blue-700">ממוצע בדיקות מנות:</span>{' '}
              <span className="font-semibold text-blue-900">
                {review.auto_data.dish_checks_avg?.toFixed(1) || '-'}
                {review.auto_data.dish_checks_count ? ` (${review.auto_data.dish_checks_count} בדיקות)` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Scoring Form */}
        <div className="space-y-6">
          {/* 1. Operational Management (35%) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">1. ניהול תפעולי</h2>
            <p className="text-sm text-gray-600 mb-4">משקל: 35%</p>
            <div className="space-y-4">
              <ScoreInput
                label="תברואה ובטיחות מזון"
                weight="10%"
                score={scores.sanitation.score}
                comments={scores.sanitation.comments}
                onScoreChange={(s) => setScores({ ...scores, sanitation: { ...scores.sanitation, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, sanitation: { ...scores.sanitation, comments: c } })}
                disabled={!isEditable}
                points={getSubcategoryPoints('sanitation')}
              />
              <ScoreInput
                label="ניהול מלאי ושליטה בעלויות"
                weight="10%"
                score={scores.inventory.score}
                comments={scores.inventory.comments}
                onScoreChange={(s) => setScores({ ...scores, inventory: { ...scores.inventory, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, inventory: { ...scores.inventory, comments: c } })}
                disabled={!isEditable}
                points={getSubcategoryPoints('inventory')}
              />
              <ScoreInput
                label="איכות מוצר ושירות"
                weight="10%"
                score={scores.quality.score}
                comments={scores.quality.comments}
                onScoreChange={(s) => setScores({ ...scores, quality: { ...scores.quality, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, quality: { ...scores.quality, comments: c } })}
                disabled={!isEditable}
                points={getSubcategoryPoints('quality')}
              />
              <ScoreInput
                label="תחזוקה וסדר"
                weight="5%"
                score={scores.maintenance.score}
                comments={scores.maintenance.comments}
                onScoreChange={(s) => setScores({ ...scores, maintenance: { ...scores.maintenance, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, maintenance: { ...scores.maintenance, comments: c } })}
                disabled={!isEditable}
                points={getSubcategoryPoints('maintenance')}
              />
            </div>
            {review.operational.score !== null && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">ציון קטגוריה:</span>
                  <span className={`text-lg font-bold ${getScoreColor(review.operational.score)}`}>
                    {review.operational.score.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. People Management (30%) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">2. ניהול אנשים</h2>
            <p className="text-sm text-gray-600 mb-4">משקל: 30%</p>
            <div className="space-y-4">
              <ScoreInput
                label="גיוס והכשרה"
                weight="10%"
                score={scores.recruitment.score}
                comments={scores.recruitment.comments}
                onScoreChange={(s) => setScores({ ...scores, recruitment: { ...scores.recruitment, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, recruitment: { ...scores.recruitment, comments: c } })}
                disabled={!isEditable}
                points={getSubcategoryPoints('recruitment')}
              />
              <ScoreInput
                label="ניהול משמרות ותזמון"
                weight="10%"
                score={scores.scheduling.score}
                comments={scores.scheduling.comments}
                onScoreChange={(s) => setScores({ ...scores, scheduling: { ...scores.scheduling, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, scheduling: { ...scores.scheduling, comments: c } })}
                disabled={!isEditable}
                points={getSubcategoryPoints('scheduling')}
              />
              <ScoreInput
                label="אקלים ושימור עובדים"
                weight="10%"
                score={scores.retention.score}
                comments={scores.retention.comments}
                onScoreChange={(s) => setScores({ ...scores, retention: { ...scores.retention, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, retention: { ...scores.retention, comments: c } })}
                disabled={!isEditable}
                points={getSubcategoryPoints('retention')}
              />
            </div>
            {review.people.score !== null && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">ציון קטגוריה:</span>
                  <span className={`text-lg font-bold ${getScoreColor(review.people.score)}`}>
                    {review.people.score.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Business Performance (25%) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">3. ביצועים עסקיים</h2>
            <p className="text-sm text-gray-600 mb-4">משקל: 25%</p>
            <div className="space-y-4">
              <ScoreInput
                label="מכירות ורווחיות"
                weight="15%"
                score={scores.sales.score}
                comments={scores.sales.comments}
                onScoreChange={(s) => setScores({ ...scores, sales: { ...scores.sales, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, sales: { ...scores.sales, comments: c } })}
                disabled={!isEditable}
                points={getSubcategoryPoints('sales')}
              />
              <ScoreInput
                label="יעילות תפעולית"
                weight="10%"
                score={scores.efficiency.score}
                comments={scores.efficiency.comments}
                onScoreChange={(s) => setScores({ ...scores, efficiency: { ...scores.efficiency, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, efficiency: { ...scores.efficiency, comments: c } })}
                disabled={!isEditable}
                points={getSubcategoryPoints('efficiency')}
              />
            </div>
            {review.business.score !== null && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">ציון קטגוריה:</span>
                  <span className={`text-lg font-bold ${getScoreColor(review.business.score)}`}>
                    {review.business.score.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. Leadership (10%) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">4. מנהיגות והתפתחות אישית</h2>
            <p className="text-sm text-gray-600 mb-4">משקל: 10%</p>
            <div className="space-y-4">
              <ScoreInput
                label="מנהיגות, יוזמה ופתרון בעיות"
                weight="10%"
                score={scores.leadership.score}
                comments={scores.leadership.comments}
                onScoreChange={(s) => setScores({ ...scores, leadership: { ...scores.leadership, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, leadership: { ...scores.leadership, comments: c } })}
                disabled={!isEditable}
                points={getSubcategoryPoints('leadership')}
              />
            </div>
          </div>

          {/* AI Summary Section */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <h2 className="text-lg font-semibold text-gray-900">סיכום AI אוטומטי</h2>
              </div>
              <button
                onClick={handleGenerateSummary}
                disabled={!review.overall_score || generatingSummary}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center gap-2"
              >
                {generatingSummary ? '⏳ מייצר...' : (review.ai_summary ? 'עדכן סיכום' : 'צור סיכום')}
              </button>
            </div>

            {review.ai_summary ? (
              <div className="space-y-4">
                {/* Display AI summary */}
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {review.ai_summary}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">💡 לחץ על "צור סיכום" כדי לקבל ניתוח AI מקיף</p>
                <p className="text-xs">הסיכום כולל: נקודות חוזק, נקודות לשיפור, המלצות לפיתוח וסיכום כללי</p>
              </div>
            )}
          </div>

          {/* Historical Trend Chart */}
          {history.length > 0 && (
            <div className="mt-6">
              <TrendChart data={history} />
            </div>
          )}
        </div>
      </main>

      {/* AI Chat - Floating */}
      <AIChat reviewId={Number(id)} />
    </div>
  );
};

export default ViewManagerReview;
