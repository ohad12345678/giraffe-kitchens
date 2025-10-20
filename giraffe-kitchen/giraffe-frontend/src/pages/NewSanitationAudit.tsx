import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitationAuditAPI, branchAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { sanitationCategories, defectLevelOptions, getPointsForDefectLevel, getScoreDeductionGuidelines, type DefectLevel } from '../data/sanitationCategories';
import type { Branch, CreateSanitationAudit, SanitationAuditCategory } from '../types';

export default function NewSanitationAudit() {
  const navigate = useNavigate();
  const { isHQ, user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [auditorName, setAuditorName] = useState('');
  const [accompanistName, setAccompanistName] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [equipmentIssues, setEquipmentIssues] = useState('');

  // Summary state
  const [auditSaved, setAuditSaved] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<number | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Categories state
  const [categoryData, setCategoryData] = useState<Record<string, {
    status: string;
    notes: string;
    defectLevel: DefectLevel;
    checkPerformed: boolean | null;
    imageUrls: string[];
  }>>({});

  useEffect(() => {
    if (!isHQ) {
      setError('רק משתמשי מטה יכולים ליצור ביקורות תברואה');
      return;
    }
    loadBranches();
    initializeCategoryData();

    // Auto-fill auditor name from logged-in user
    if (user?.full_name) {
      setAuditorName(user.full_name);
    }
  }, [isHQ, user]);

  const loadBranches = async () => {
    try {
      const data = await branchAPI.list();
      setBranches(data);
    } catch (err: any) {
      console.error('Failed to load branches:', err);
      setError('שגיאה בטעינת סניפים');
    }
  };

  const initializeCategoryData = () => {
    const initialData: typeof categoryData = {};
    sanitationCategories.forEach(cat => {
      initialData[cat.key] = {
        status: 'תקין',
        notes: '',
        defectLevel: 'תקין',
        checkPerformed: null,
        imageUrls: [],
      };
    });
    setCategoryData(initialData);
  };

  const updateCategoryField = (categoryKey: string, field: string, value: any) => {
    setCategoryData(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBranchId) {
      setError('יש לבחור סניף');
      return;
    }

    if (!auditorName.trim()) {
      setError('יש למלא שם מבקר');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build categories array
      const categories: Omit<SanitationAuditCategory, 'id' | 'created_at' | 'updated_at'>[] =
        sanitationCategories.map(cat => {
          const data = categoryData[cat.key];
          return {
            category_name: cat.name,
            category_key: cat.key,
            status: data.status,
            notes: data.notes || null,
            score_deduction: getPointsForDefectLevel(data.defectLevel),
            check_performed: data.checkPerformed,
            check_name: cat.hasSubCheck ? (cat.subCheckLabel || null) : null,
            image_urls: data.imageUrls,
          };
        });

      const auditData: CreateSanitationAudit = {
        branch_id: selectedBranchId,
        audit_date: `${auditDate}T00:00:00`,
        start_time: `${auditDate}T${startTime}:00`,
        auditor_name: auditorName,
        accompanist_name: accompanistName || null,
        general_notes: generalNotes || null,
        equipment_issues: equipmentIssues || null,
        categories,
      };

      const result = await sanitationAuditAPI.create(auditData);
      setSavedAuditId(result.id);
      setAuditSaved(true);

      // Generate AI summary
      await generateAISummary(result.id);
    } catch (err: any) {
      console.error('Failed to create audit:', err);
      setError(err.response?.data?.detail || 'שגיאה ביצירת ביקורת');
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async (auditId: number) => {
    try {
      setGeneratingSummary(true);
      const response = await sanitationAuditAPI.generateSummary(auditId);
      setAiSummary(response.summary);
    } catch (err: any) {
      console.error('Failed to generate summary:', err);
      setError('שגיאה ביצירת סיכום אוטומטי');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!savedAuditId) return;

    try {
      setLoading(true);
      setError(null);

      // Update audit with manual notes if provided
      if (manualNotes.trim()) {
        const updatedSummary = aiSummary + '\n\nהערות נוספות:\n' + manualNotes;
        await sanitationAuditAPI.update(savedAuditId, {
          deficiencies_summary: updatedSummary,
          status: 'completed'
        });
      } else {
        await sanitationAuditAPI.update(savedAuditId, {
          deficiencies_summary: aiSummary,
          status: 'completed'
        });
      }

      // Navigate to view page
      navigate(`/sanitation-audits/${savedAuditId}`);
    } catch (err: any) {
      console.error('Failed to submit audit:', err);
      setError('שגיאה בשליחת ביקורת');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalScore = () => {
    const totalDeductions = Object.values(categoryData).reduce(
      (sum, cat) => sum + getPointsForDefectLevel(cat.defectLevel),
      0
    );
    return Math.max(0, 100 - totalDeductions);
  };

  const guidelines = getScoreDeductionGuidelines();

  if (!isHQ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          רק משתמשי מטה יכולים ליצור ביקורות תברואה
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {auditSaved ? 'ביקורת נשמרה בהצלחה' : 'ביקורת תברואה חדשה'}
          </h1>
          <p className="text-gray-600">
            {auditSaved ? 'סקור את הסיכום והוסף הערות נוספות לפני השליחה הסופית' : 'מלא את כל השדות והקטגוריות למטה'}
          </p>

          {/* Score Display */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">ציון נוכחי</div>
            <div className="text-4xl font-bold text-blue-600">{Math.round(calculateTotalScore())}</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!auditSaved && (
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Information */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">פרטי ביקורת</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סניף *
                </label>
                <select
                  value={selectedBranchId || ''}
                  onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">בחר סניף</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תאריך ביקורת *
                </label>
                <input
                  type="date"
                  value={auditDate}
                  onChange={(e) => setAuditDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שעת התחלה *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם מבקר *
                </label>
                <input
                  type="text"
                  value={auditorName}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  readOnly
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם מלווה (אופציונלי)
                </label>
                <input
                  type="text"
                  value={accompanistName}
                  onChange={(e) => setAccompanistName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="עובד מהסניף שליווה"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                הערות כלליות
              </label>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="הערות כלליות על הביקורת"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                בעיות ציוד
              </label>
              <textarea
                value={equipmentIssues}
                onChange={(e) => setEquipmentIssues(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="רשום בעיות ציוד שנמצאו"
              />
            </div>
          </div>

          {/* Score Guidelines */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">הנחיות ניקוד</h3>
            <div className="space-y-1 text-sm">
              <div><strong>{guidelines.minor.points} נקודות:</strong> {guidelines.minor.description}</div>
              <div><strong>{guidelines.moderate.points} נקודות:</strong> {guidelines.moderate.description}</div>
              <div><strong>{guidelines.serious.points} נקודות:</strong> {guidelines.serious.description}</div>
              <div><strong>{guidelines.critical.points} נקודות:</strong> {guidelines.critical.description}</div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">קטגוריות ביקורת</h2>

            <div className="space-y-6">
              {sanitationCategories.map((category, index) => (
                <div key={category.key} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <h3 className="font-medium text-gray-900 mb-3">
                    {index + 1}. {category.name}
                  </h3>

                  {/* Checkbox type - Simple checkbox only */}
                  {category.type === 'checkbox' && (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={categoryData[category.key]?.checkPerformed === true}
                          onChange={(e) => updateCategoryField(category.key, 'checkPerformed', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {category.checkboxLabel}
                        </span>
                      </label>
                      {category.key === 'knives_check' && (
                        <div className="flex-1">
                          <input
                            type="text"
                            value={categoryData[category.key]?.notes || ''}
                            onChange={(e) => updateCategoryField(category.key, 'notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="הערות"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full type - Complete inspection with score and notes */}
                  {category.type === 'full' && (
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          רמת ליקוי
                        </label>
                        <select
                          value={categoryData[category.key]?.defectLevel || 'תקין'}
                          onChange={(e) => updateCategoryField(category.key, 'defectLevel', e.target.value as DefectLevel)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          {defectLevelOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.value}
                            </option>
                          ))}
                        </select>
                      </div>

                      {category.hasSubCheck && (
                        <div className="flex items-center md:col-span-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={categoryData[category.key]?.checkPerformed === true}
                              onChange={(e) => updateCategoryField(category.key, 'checkPerformed', e.target.checked)}
                              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {category.subCheckLabel}
                            </span>
                          </label>
                        </div>
                      )}

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          הערות
                        </label>
                        <textarea
                          value={categoryData[category.key]?.notes || ''}
                          onChange={(e) => updateCategoryField(category.key, 'notes', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="פרט על הממצאים"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? 'שומר...' : 'שמור ביקורת'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/sanitation-audits')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>
        )}

        {/* AI Summary Section - Shows after audit is saved */}
        {auditSaved && (
          <div className="space-y-6 mt-6">
            {/* Loading Spinner */}
            {generatingSummary && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                  <p className="text-gray-600">מייצר סיכום אוטומטי...</p>
                </div>
              </div>
            )}

            {/* AI Summary Display */}
            {!generatingSummary && aiSummary && (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">סיכום אוטומטי של הביקורת</h2>
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
                    {loading ? 'שולח...' : 'שלח ביקורת'}
                  </button>
                  <button
                    onClick={() => navigate(`/sanitation-audits/${savedAuditId}`)}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    צפה בביקורת ללא שליחה
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
