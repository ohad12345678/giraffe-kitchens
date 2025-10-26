import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { managerEvaluationAPI, branchAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { MANAGER_EVALUATION_CATEGORIES } from '../data/managerEvaluationCategories';
import { ArrowRight, Save } from 'lucide-react';
import type { Branch, ManagerEvaluationCategory } from '../types';

export default function EditManagerEvaluation() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [managerName, setManagerName] = useState('');
  const [evaluationDate, setEvaluationDate] = useState('');
  const [generalComments, setGeneralComments] = useState('');
  const [categories, setCategories] = useState<Omit<ManagerEvaluationCategory, 'id'>[]>([]);

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
    if (id) {
      loadEvaluation(Number(id));
    }
  }, [id, hasAccess]);

  const loadBranches = async () => {
    try {
      const data = await branchAPI.list();
      setBranches(data);
    } catch (err: any) {
      console.error('Failed to load branches:', err);
      setError('שגיאה בטעינת סניפים');
    }
  };

  const loadEvaluation = async (evaluationId: number) => {
    try {
      setLoading(true);
      const evaluation = await managerEvaluationAPI.get(evaluationId);

      setSelectedBranchId(evaluation.branch_id);
      setManagerName(evaluation.manager_name);
      setEvaluationDate(evaluation.evaluation_date.split('T')[0]);
      setGeneralComments(evaluation.general_comments || '');

      // Load categories
      setCategories(evaluation.categories.map((cat: any) => ({
        category_name: cat.category_name,
        rating: cat.rating,
        comments: cat.comments,
        notes: cat.notes,
        strengths: cat.strengths,
        areas_for_improvement: cat.areas_for_improvement,
      })));
    } catch (err: any) {
      console.error('Failed to load evaluation:', err);
      setError('שגיאה בטעינת הערכה');
    } finally {
      setLoading(false);
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

    if (!selectedBranchId || !id) {
      setError('נתונים חסרים');
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

    setSaving(true);
    setError(null);

    try {
      await managerEvaluationAPI.update(Number(id), {
        manager_name: managerName.trim(),
        evaluation_date: `${evaluationDate}T00:00:00`,
        general_comments: generalComments.trim() || undefined,
      });

      // Note: Categories update would require a separate endpoint
      // For now, just redirect back to view
      navigate(`/manager-evaluations/${id}`);
    } catch (err: any) {
      console.error('Failed to update evaluation:', err);
      setError(err.response?.data?.detail || 'שגיאה בעדכון הערכה');
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/manager-evaluations/${id}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
              <span>חזרה להערכה</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <Save className="h-5 w-5" />
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900">עריכת הערכת מנהל</h1>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
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
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
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
                        value={categories[index]?.rating || 5}
                        onChange={(e) => updateCategory(index, 'rating', Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-2xl font-bold text-blue-600 w-12 text-center">
                        {categories[index]?.rating || 5}
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
                              const comments = categories[index]?.comments || '';
                              const match = comments.match(new RegExp(`${subCat.name}:\\s*([^\\n]*)`));
                              return match ? match[1] : '';
                            })()}
                            onChange={(e) => {
                              const currentComments = categories[index]?.comments || '';
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
                        const comments = categories[index]?.comments || '';
                        const lines = comments.split('\n');
                        const generalLines = lines.filter((line: string) => {
                          return !template.subCategories?.some(sub => line.startsWith(`${sub.name}:`));
                        });
                        return generalLines.join('\n');
                      })()}
                      onChange={(e) => {
                        const currentComments = categories[index]?.comments || '';
                        const lines = currentComments.split('\n');
                        const subCatLines = lines.filter((line: string) =>
                          template.subCategories?.some(sub => line.startsWith(`${sub.name}:`))
                        );
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

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate(`/manager-evaluations/${id}`)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors text-lg"
              >
                <Save className="h-5 w-5" />
                {saving ? 'שומר...' : 'שמור שינויים'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
