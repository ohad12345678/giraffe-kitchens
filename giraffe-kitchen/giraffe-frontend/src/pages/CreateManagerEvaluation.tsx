import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerEvaluationAPI, branchAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Save } from 'lucide-react';
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

  // Categories state
  const [categories, setCategories] = useState<Omit<ManagerEvaluationCategory, 'id'>[]>(
    MANAGER_EVALUATION_CATEGORIES.map(cat => ({
      category_name: cat.category_name,
      rating: cat.defaultRating,
      comments: null,
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
      evaluation_date: evaluationDate,
      general_comments: generalComments.trim() || null,
      categories: categories,
    };

    try {
      const created = await managerEvaluationAPI.create(evaluationData);
      navigate(`/manager-evaluations/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create evaluation:', err);
      setError(err.response?.data?.detail || 'שגיאה ביצירת הערכה');
      setLoading(false);
    }
  };

  if (!hasAccess) {
    return null;
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

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <Save className="h-5 w-5" />
              {loading ? 'שומר...' : 'שמור הערכה'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900">הערכת מנהל חדשה</h1>

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
                        value={categories[index].rating}
                        onChange={(e) => updateCategory(index, 'rating', Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-2xl font-bold text-blue-600 w-12 text-center">
                        {categories[index].rating}
                      </span>
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      הערות והמלצות
                    </label>
                    <textarea
                      value={categories[index].comments || ''}
                      onChange={(e) => updateCategory(index, 'comments', e.target.value || null)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`הערות על ${template.category_name}...`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors text-lg"
              >
                <Save className="h-5 w-5" />
                {loading ? 'שומר...' : 'שמור הערכה'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
