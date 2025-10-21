import React from 'react';

interface ScoreInputProps {
  label: string;
  weight: string;
  score: number | null;
  comments: string;
  onScoreChange: (score: number | null) => void;
  onCommentsChange: (comments: string) => void;
  disabled?: boolean;
}

const ScoreInput: React.FC<ScoreInputProps> = ({
  label,
  weight,
  score,
  comments,
  onScoreChange,
  onCommentsChange,
  disabled = false,
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
        <div>
          <h4 className="font-medium text-gray-900">{label}</h4>
          <p className="text-sm text-gray-500">משקל: {weight}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="100"
            value={score === null ? '' : score}
            onChange={(e) => onScoreChange(e.target.value ? Number(e.target.value) : null)}
            placeholder="0-100"
            disabled={disabled}
            className={`w-20 px-3 py-2 border rounded-lg text-center font-semibold focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${getScoreColor(score)}`}
          />
          <span className="text-sm text-gray-600">/100</span>
        </div>
      </div>

      <textarea
        value={comments}
        onChange={(e) => onCommentsChange(e.target.value)}
        placeholder="הערות והמלצות..."
        rows={2}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
};

export default ScoreInput;
