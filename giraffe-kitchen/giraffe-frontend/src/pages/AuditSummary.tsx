import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sanitationAuditAPI } from '../services/api';

export default function AuditSummary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [previousScores, setPreviousScores] = useState<number[]>([]);
  const [manualNotes, setManualNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      generateSummary();
    }
  }, [id]);

  const generateSummary = async () => {
    try {
      setGenerating(true);
      setError(null);

      const response = await sanitationAuditAPI.generateSummary(parseInt(id!));

      setSummary(response.summary);
      setCurrentScore(response.current_score);
      setPreviousScores(response.previous_scores || []);
    } catch (err: any) {
      console.error('Failed to generate summary:', err);
      setError('שגיאה ביצירת סיכום');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleFinalSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Update audit with manual notes if provided
      if (manualNotes.trim()) {
        const updatedSummary = summary + '\n\nהערות נוספות:\n' + manualNotes;
        await sanitationAuditAPI.update(parseInt(id!), {
          deficiencies_summary: updatedSummary,
          status: 'completed'
        });
      } else {
        // Just mark as completed
        await sanitationAuditAPI.update(parseInt(id!), {
          status: 'completed'
        });
      }

      // Navigate to view page
      navigate(`/sanitation-audits/${id}`);
    } catch (err: any) {
      console.error('Failed to save:', err);
      setError('שגיאה בשמירה סופית');
    } finally {
      setLoading(false);
    }
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg text-gray-600">
            {generating ? 'מייצר סיכום אוטומטי...' : 'טוען...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">סיכום ביקורת</h1>
          <p className="text-gray-600">סיכום אוטומטי עם תובנות והשוואה לביקורות קודמות</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Score Comparison */}
        {previousScores.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">השוואת ציונים</h2>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">ביקורת נוכחית</div>
                <div className="text-4xl font-bold text-blue-600">{currentScore}</div>
              </div>
              {previousScores.map((score, index) => (
                <div key={index} className="text-center">
                  <div className="text-sm text-gray-600 mb-1">
                    ביקורת קודמת {index + 1}
                  </div>
                  <div className="text-4xl font-bold text-gray-600">{score}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">סיכום אוטומטי</h2>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">
              {summary}
            </pre>
          </div>
        </div>

        {/* Manual Notes */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">הערות נוספות (אופציונלי)</h2>
          <textarea
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={6}
            placeholder="הוסף הערות נוספות, המלצות, או מידע רלוונטי אחר..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleFinalSave}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? 'שומר...' : 'שמור וסיים'}
          </button>
          <button
            onClick={() => navigate(`/sanitation-audits/${id}`)}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            צפה בביקורת ללא שמירה
          </button>
        </div>
      </div>
    </div>
  );
}
