import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerEvaluationAPI, branchAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { MANAGER_EVALUATION_CATEGORIES } from '../data/managerEvaluationCategories';
import type { Branch, CreateManagerEvaluation, ManagerEvaluationCategory } from '../types';

export default function CreateManagerEvaluation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [managerName, setManagerName] = useState('');
  const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().split('T')[0]);
  const [generalComments, setGeneralComments] = useState('');

  // Summary state - 2-step flow
  const [evaluationSaved, setEvaluationSaved] = useState(false);
  const [savedEvaluationId, setSavedEvaluationId] = useState<number | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [overallScore, setOverallScore] = useState<number | null>(null);

  // Categories state
  const [categories, setCategories] = useState<Omit<ManagerEvaluationCategory, 'id'>[]>(
    MANAGER_EVALUATION_CATEGORIES.map(cat => ({
      category_name: cat.category_name,
      rating: cat.defaultRating,
      comments: null,
      notes: null,
      strengths: null,
      areas_for_improvement: null,
    }))
  );

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
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const data = await branchAPI.list();
      setBranches(data);
    } catch (err: any) {
      console.error('Failed to load branches:', err);
      setError('שגיאה בטעינת סניפים');
    }
  };

  const updateCategory = (index: number, field: 'rating' | 'comments', value: any) => {
    setCategories(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBranchId) {
      setError('יש לבחור סניף');
      return;
    }

    if (!managerName.trim()) {
      setError('יש להזין שם מנהל');
      return;
    }

    // Validate all categories have ratings
    if (categories.some(cat => cat.rating === null || cat.rating < 0 || cat.rating > 10)) {
      setError('יש לדרג את כל הקטגוריות (0-10)');
      return;
    }

    setLoading(true);
    setError(null);

    const evaluationData: CreateManagerEvaluation = {
      branch_id: selectedBranchId,
      manager_name: managerName.trim(),
      evaluator_name: user?.full_name || user?.email || 'Unknown',
      evaluation_date: `${evaluationDate}T00:00:00`,
      summary: null,
      action_items: null,
      next_review_date: null,
      general_comments: generalComments.trim() || null,
      categories: categories,
    };

    try {
      const created = await managerEvaluationAPI.create(evaluationData);
      setSavedEvaluationId(created.id);
      setEvaluationSaved(true);

      // AI summary is generated automatically by backend (like sanitation audits)
      setAiSummary(created.ai_summary || 'מייצר סיכום...');
      setOverallScore(created.overall_score);
    } catch (err: any) {
      console.error('Failed to create evaluation:', err);
      setError(err.response?.data?.detail || 'שגיאה ביצירת הערכה');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!savedEvaluationId) return;

    try {
      setLoading(true);
      setError(null);

      // Update evaluation with manual notes if provided and set status to completed
      if (manualNotes.trim()) {
        const updatedSummary = aiSummary + '\n\nהערות נוספות:\n' + manualNotes;
        await managerEvaluationAPI.update(savedEvaluationId, {
          ai_summary: updatedSummary,
          status: 'completed'
        });
      } else {
        await managerEvaluationAPI.update(savedEvaluationId, {
          status: 'completed'
        });
      }

      // Navigate to view page
      navigate(`/manager-evaluations/${savedEvaluationId}`);
    } catch (err: any) {
      console.error('Failed to submit evaluation:', err);
      setError('שגיאה בשליחת הערכה');
    } finally {
      setLoading(false);
    }
  };

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {evaluationSaved ? 'הערכה נשמרה בהצלחה' : 'הערכת מנהל חדשה'}
          </h1>
          <p className="text-gray-600">
            {evaluationSaved ? 'סקור את הסיכום והוסף הערות נוספות לפני השליחה הסופית' : 'מלא את כל השדות והקטגוריות למטה'}
          </p>

          {/* Score Display */}
          {overallScore !== null && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600">ציון כללי</div>
              <div className="text-4xl font-bold text-blue-600">{overallScore.toFixed(2)}</div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!evaluationSaved && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">פרטי ההערכה</h2>

              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סניף *
                </label>
                <select
                  value={selectedBranchId || ''}
                  onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">בחר סניף</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Manager Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם המנהל *
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="הזן שם מלא"
                  required
                />
              </div>

              {/* Evaluation Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תאריך הערכה *
                </label>
                <input
                  type="date"
                  value={evaluationDate}
                  onChange={(e) => setEvaluationDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* General Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  הערות כלליות
                </label>
                <textarea
                  value={generalComments}
                  onChange={(e) => setGeneralComments(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="הערות נוספות על המנהל..."
                />
              </div>
            </div>

            {/* Evaluation Categories */}
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">קטגוריות הערכה</h2>

              {MANAGER_EVALUATION_CATEGORIES.map((template, index) => (
                <div key={template.category_name} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="mb-3">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {template.category_name}
                    </h3>
                    <p className="text-sm text-gray-500">{template.description}</p>
                  </div>

                  {/* Rating */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      דירוג (0-10) *
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={categories[index].rating}
                        onChange={(e) => updateCategory(index, 'rating', Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-2xl font-bold text-blue-600 w-12 text-center">
                        {categories[index].rating}
                      </span>
                    </div>
                  </div>

                  {/* Sub-Categories Comments */}
                  {template.subCategories && template.subCategories.length > 0 && (
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-700">פירוט לפי תתי-קטגוריות:</h4>
                      {template.subCategories.map((subCat) => (
                        <div key={subCat.name}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {subCat.name}
                          </label>
                          <textarea
                            value={(() => {
                              const comments = categories[index].comments || '';
                              const match = comments.match(new RegExp(`${subCat.name}:\\s*([^\\n]*)`));
                              return match ? match[1] : '';
                            })()}
                            onChange={(e) => {
                              const currentComments = categories[index].comments || '';
                              const lines = currentComments.split('\n').filter((line: string) => !line.startsWith(`${subCat.name}:`));
                              if (e.target.value.trim()) {
                                lines.push(`${subCat.name}: ${e.target.value.trim()}`);
                              }
                              updateCategory(index, 'comments', lines.join('\n').trim() || null);
                            }}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder={subCat.placeholder}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* General Comments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      הערות כלליות נוספות
                    </label>
                    <textarea
                      value={(() => {
                        const comments = categories[index].comments || '';
                        // Extract general comments (lines that don't start with sub-category names)
                        const lines = comments.split('\n');
                        const generalLines = lines.filter((line: string) => {
                          return !template.subCategories?.some(sub => line.startsWith(`${sub.name}:`));
                        });
                        return generalLines.join('\n');
                      })()}
                      onChange={(e) => {
                        const currentComments = categories[index].comments || '';
                        const lines = currentComments.split('\n');
                        // Keep only sub-category lines
                        const subCatLines = lines.filter((line: string) =>
                          template.subCategories?.some(sub => line.startsWith(`${sub.name}:`))
                        );
                        // Add general comments
                        if (e.target.value.trim()) {
                          subCatLines.push(e.target.value.trim());
                        }
                        updateCategory(index, 'comments', subCatLines.join('\n').trim() || null);
                      }}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="הערות כלליות נוספות על הקטגוריה..."
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? 'שומר...' : 'שמור הערכה'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/manager-evaluations')}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {/* AI Summary Section - Shows after evaluation is saved */}
        {evaluationSaved && aiSummary && (
          <div className="space-y-6 mt-6">
            {/* AI Summary Display */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">סיכום אוטומטי של ההערכה</h2>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-lg">
{aiSummary}
                </pre>
              </div>
            </div>

            {/* Manual Notes Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">הערות נוספות (אופציונלי)</h2>
              <textarea
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={6}
                placeholder="הוסף הערות נוספות, המלצות, או מידע רלוונטי אחר..."
              />
            </div>

            {/* Final Submit Button */}
            <div className="flex gap-4">
              <button
                onClick={handleFinalSubmit}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? 'שולח...' : 'שלח הערכה'}
              </button>
              <button
                onClick={() => navigate(`/manager-evaluations/${savedEvaluationId}`)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                צפה בהערכה ללא שליחה
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
