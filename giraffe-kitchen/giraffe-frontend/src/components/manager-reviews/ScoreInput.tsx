import React from 'react';

interface ScoreInputProps {
  label: string;
  weight: string;
  score: number | null;
  comments: string;
  onScoreChange: (score: number | null) => void;
  onCommentsChange: (comments: string) => void;
  disabled?: boolean;
  points?: string[]; // רשימת נקודות להערכה
}

const ScoreInput: React.FC<ScoreInputProps> = ({
  label,
  weight,
  score,
  comments,
  onScoreChange,
  onCommentsChange,
  disabled = false,
  points = [],
}) => {
  const getScoreColor = (s: number | null) => {
    if (!s) return 'border-gray-300';
    if (s >= 85) return 'border-green-500 bg-green-50';
    if (s >= 70) return 'border-yellow-500 bg-yellow-50';
    return 'border-red-500 bg-red-50';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{label}</h4>
          <p className="text-sm text-gray-500">משקל: {weight}</p>
        </div>
        <div className="flex flex-col items-end gap-2 min-w-[200px]">
          <div className={`text-2xl font-bold ${score === null ? 'text-gray-400' : score >= 85 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
            {score === null ? '—' : score}
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={score === null ? 0 : score}
            onChange={(e) => onScoreChange(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: score !== null
                ? `linear-gradient(to right, ${score >= 85 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444'} 0%, ${score >= 85 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444'} ${score}%, #e5e7eb ${score}%, #e5e7eb 100%)`
                : undefined
            }}
          />
          <div className="flex justify-between w-full text-xs text-gray-500">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* רשימת נקודות להערכה */}
      {points.length > 0 && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">נקודות להערכה:</p>
          <ul className="space-y-1">
            {points.map((point, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <textarea
        value={comments}
        onChange={(e) => onCommentsChange(e.target.value)}
        placeholder="הערות והמלצות..."
        rows={3}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
};

export default ScoreInput;
