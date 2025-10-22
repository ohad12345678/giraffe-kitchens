import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerReviewAPI, branchAPI } from '../services/managerReviewAPI';
import type { ReviewQuarter } from '../types/managerReview';
import ScoreInput from '../components/manager-reviews/ScoreInput';
import { REVIEW_CATEGORIES } from '../config/reviewCategories';
import {
  ArrowLeft,
  Save,
  Send,
  Sparkles
} from 'lucide-react';

interface Branch {
  id: number;
  name: string;
}

const CreateManagerReview: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Selection state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [managerName, setManagerName] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [quarter, setQuarter] = useState<ReviewQuarter>('Q1');
  const [aiSummary, setAiSummary] = useState<string>('');

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
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const branchesData = await branchAPI.getBranches();
      setBranches(branchesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('שגיאה בטעינת נתונים');
    }
  };

  const handleGenerateSummary = async () => {
    // Check if all scores are filled
    const allScoresFilled = Object.values(scores).every(s => s.score !== null);
    if (!allScoresFilled) {
      alert('יש למלא את כל הציונים לפני יצירת סיכום AI');
      return;
    }

    setGeneratingSummary(true);
    try {
      // Build context for AI
      const branch = branches.find(b => b.id === selectedBranch);

      const context = `אתה מנהל אזור/מנהל תפעול ברשת מסעדות ג'ירף.
עליך לנתח את הערכת הביצועים של ${managerName || 'המנהל'} - מנהל סניף ${branch?.name || ''}
לתקופה ${quarter} ${year}.

## נתוני ההערכה:

### 1. ניהול תפעולי (35%)
- תברואה (${scores.sanitation.score}): ${scores.sanitation.comments || 'אין הערות'}
- מלאי (${scores.inventory.score}): ${scores.inventory.comments || 'אין הערות'}
- איכות מזון (${scores.quality.score}): ${scores.quality.comments || 'אין הערות'}
- תחזוקה (${scores.maintenance.score}): ${scores.maintenance.comments || 'אין הערות'}

### 2. ניהול אנשים (30%)
- גיוס (${scores.recruitment.score}): ${scores.recruitment.comments || 'אין הערות'}
- שיבוץ (${scores.scheduling.score}): ${scores.scheduling.comments || 'אין הערות'}
- שימור (${scores.retention.score}): ${scores.retention.comments || 'אין הערות'}

### 3. תוצאות עסקיות (25%)
- מכירות (${scores.sales.score}): ${scores.sales.comments || 'אין הערות'}
- יעילות (${scores.efficiency.score}): ${scores.efficiency.comments || 'אין הערות'}

### 4. מנהיגות (10%)
- מנהיגות (${scores.leadership.score}): ${scores.leadership.comments || 'אין הערות'}

צור סיכום מקיף עם 4 חלקים:
## 🟢 נקודות חוזק
## 🟡 הזדמנויות לצמיחה
## 💡 המלצות לפיתוח
## 📝 סיכום כללי`;

      // Call generic AI endpoint
      const response = await fetch('/api/v1/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ context })
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      setAiSummary(data.summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert('שגיאה ביצירת סיכום AI');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSave = async (submitStatus: 'draft' | 'submitted') => {
    // Validation
    if (!managerName.trim()) {
      alert('יש להזין שם מנהל');
      return;
    }

    if (!selectedBranch) {
      alert('יש לבחור סניף');
      return;
    }

    setSaving(true);
    try {
      const reviewData = {
        manager_name: managerName,
        branch_id: selectedBranch,
        year,
        quarter,
        status: submitStatus,

        // Operational
        sanitation_score: scores.sanitation.score,
        sanitation_comments: scores.sanitation.comments || undefined,
        inventory_score: scores.inventory.score,
        inventory_comments: scores.inventory.comments || undefined,
        quality_score: scores.quality.score,
        quality_comments: scores.quality.comments || undefined,
        maintenance_score: scores.maintenance.score,
        maintenance_comments: scores.maintenance.comments || undefined,

        // People
        recruitment_score: scores.recruitment.score,
        recruitment_comments: scores.recruitment.comments || undefined,
        scheduling_score: scores.scheduling.score,
        scheduling_comments: scores.scheduling.comments || undefined,
        retention_score: scores.retention.score,
        retention_comments: scores.retention.comments || undefined,

        // Business
        sales_score: scores.sales.score,
        sales_comments: scores.sales.comments || undefined,
        efficiency_score: scores.efficiency.score,
        efficiency_comments: scores.efficiency.comments || undefined,

        // Leadership
        leadership_score: scores.leadership.score,
        leadership_comments: scores.leadership.comments || undefined,

        // AI Summary
        ai_summary: aiSummary || undefined
      };

      await managerReviewAPI.createReview(reviewData);
      alert(submitStatus === 'draft' ? '✅ ההערכה נשמרה כטיוטה' : '✅ ההערכה נשלחה בהצלחה');
      navigate('/manager-reviews');
    } catch (error: any) {
      console.error('Failed to save review:', error);
      alert(error.response?.data?.detail || 'שגיאה בשמירת ההערכה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>שמור טיוטה</span>
              </button>
              <button
                onClick={() => handleSave('submitted')}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>שלח הערכה</span>
              </button>
            </div>

            {/* Right side - Title and back button */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <h1 className="text-xl font-bold text-gray-900">הערכת ביצועים חדשה</h1>
                <p className="text-sm text-gray-600">מלא את כל השדות</p>
              </div>
              <button
                onClick={() => navigate('/manager-reviews')}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Selection Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">פרטי ההערכה</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם מנהל <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="הקלד שם מנהל..."
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סניף <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedBranch || ''}
                  onChange={(e) => setSelectedBranch(e.target.value ? Number(e.target.value) : null)}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">בחר סניף...</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שנה <span className="text-red-500">*</span>
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  רבעון <span className="text-red-500">*</span>
                </label>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value as ReviewQuarter)}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Q1">רבעון 1 (ינואר-מרץ)</option>
                  <option value="Q2">רבעון 2 (אפריל-יוני)</option>
                  <option value="Q3">רבעון 3 (יולי-ספטמבר)</option>
                  <option value="Q4">רבעון 4 (אוקטובר-דצמבר)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Operational Management - 35% */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">1. ניהול תפעולי</h2>
            <p className="text-sm text-gray-600 mb-6">משקל: 35%</p>

            <div className="space-y-6">
              <ScoreInput
                label="תברואה ובטיחות מזון"
                weight="10%"
                score={scores.sanitation.score}
                comments={scores.sanitation.comments}
                onScoreChange={(s) => setScores({ ...scores, sanitation: { ...scores.sanitation, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, sanitation: { ...scores.sanitation, comments: c } })}
                points={getSubcategoryPoints('sanitation')}
              />

              <ScoreInput
                label="ניהול מלאי"
                weight="10%"
                score={scores.inventory.score}
                comments={scores.inventory.comments}
                onScoreChange={(s) => setScores({ ...scores, inventory: { ...scores.inventory, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, inventory: { ...scores.inventory, comments: c } })}
                points={getSubcategoryPoints('inventory')}
              />

              <ScoreInput
                label="איכות מזון ובקרת מנות"
                weight="10%"
                score={scores.quality.score}
                comments={scores.quality.comments}
                onScoreChange={(s) => setScores({ ...scores, quality: { ...scores.quality, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, quality: { ...scores.quality, comments: c } })}
                points={getSubcategoryPoints('quality')}
              />

              <ScoreInput
                label="תחזוקה ומראה סניף"
                weight="5%"
                score={scores.maintenance.score}
                comments={scores.maintenance.comments}
                onScoreChange={(s) => setScores({ ...scores, maintenance: { ...scores.maintenance, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, maintenance: { ...scores.maintenance, comments: c } })}
                points={getSubcategoryPoints('maintenance')}
              />
            </div>
          </div>

          {/* People Management - 30% */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">2. ניהול אנשים</h2>
            <p className="text-sm text-gray-600 mb-6">משקל: 30%</p>

            <div className="space-y-6">
              <ScoreInput
                label="גיוס והטמעה"
                weight="10%"
                score={scores.recruitment.score}
                comments={scores.recruitment.comments}
                onScoreChange={(s) => setScores({ ...scores, recruitment: { ...scores.recruitment, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, recruitment: { ...scores.recruitment, comments: c } })}
                points={getSubcategoryPoints('recruitment')}
              />

              <ScoreInput
                label="שיבוץ וניהול משמרות"
                weight="10%"
                score={scores.scheduling.score}
                comments={scores.scheduling.comments}
                onScoreChange={(s) => setScores({ ...scores, scheduling: { ...scores.scheduling, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, scheduling: { ...scores.scheduling, comments: c } })}
                points={getSubcategoryPoints('scheduling')}
              />

              <ScoreInput
                label="שימור עובדים ומוטיבציה"
                weight="10%"
                score={scores.retention.score}
                comments={scores.retention.comments}
                onScoreChange={(s) => setScores({ ...scores, retention: { ...scores.retention, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, retention: { ...scores.retention, comments: c } })}
                points={getSubcategoryPoints('retention')}
              />
            </div>
          </div>

          {/* Business Results - 25% */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">3. תוצאות עסקיות</h2>
            <p className="text-sm text-gray-600 mb-6">משקל: 25%</p>

            <div className="space-y-6">
              <ScoreInput
                label="מכירות וצמיחה"
                weight="15%"
                score={scores.sales.score}
                comments={scores.sales.comments}
                onScoreChange={(s) => setScores({ ...scores, sales: { ...scores.sales, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, sales: { ...scores.sales, comments: c } })}
                points={getSubcategoryPoints('sales')}
              />

              <ScoreInput
                label="יעילות תפעולית"
                weight="10%"
                score={scores.efficiency.score}
                comments={scores.efficiency.comments}
                onScoreChange={(s) => setScores({ ...scores, efficiency: { ...scores.efficiency, score: s } })}
                onCommentsChange={(c) => setScores({ ...scores, efficiency: { ...scores.efficiency, comments: c } })}
                points={getSubcategoryPoints('efficiency')}
              />
            </div>
          </div>

          {/* Leadership - 10% */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">4. מנהיגות ופיתוח</h2>
            <p className="text-sm text-gray-600 mb-6">משקל: 10%</p>

            <ScoreInput
              label="מנהיגות, יוזמה וחדשנות"
              weight="10%"
              score={scores.leadership.score}
              comments={scores.leadership.comments}
              onScoreChange={(s) => setScores({ ...scores, leadership: { ...scores.leadership, score: s } })}
              onCommentsChange={(c) => setScores({ ...scores, leadership: { ...scores.leadership, comments: c } })}
              points={getSubcategoryPoints('leadership')}
            />
          </div>

          {/* AI Summary Section */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">סיכום AI אוטומטי</h2>
              </div>
              <button
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center gap-2"
              >
                {generatingSummary ? '⏳ מייצר...' : (aiSummary ? 'עדכן סיכום' : 'צור סיכום')}
              </button>
            </div>

            {aiSummary ? (
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {aiSummary}
                </pre>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">💡 לאחר מילוי כל הציונים, לחץ על "צור סיכום" לקבלת ניתוח AI מקיף</p>
                <p className="text-xs">הסיכום כולל: נקודות חוזק, נקודות לשיפור, המלצות לפיתוח וסיכום כללי</p>
              </div>
            )}
          </div>

          {/* Action buttons at bottom */}
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              onClick={() => navigate('/manager-reviews')}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ביטול
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>שמור טיוטה</span>
              </button>
              <button
                onClick={() => handleSave('submitted')}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>שלח הערכה</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateManagerReview;
