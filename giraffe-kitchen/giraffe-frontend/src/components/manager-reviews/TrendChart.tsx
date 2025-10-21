import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface TrendChartProps {
  data: Array<{
    period: string;
    overall_score: number | null;
    operational_score: number | null;
    people_score: number | null;
    business_score: number | null;
    leadership_score: number | null;
  }>;
}

const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">אין מספיק נתונים היסטוריים להצגת מגמה</p>
        <p className="text-sm text-gray-400 mt-1">נדרשות לפחות 2 הערכות עם ציונים</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">מגמת ביצועים</h3>
        <span className="text-sm text-gray-500">({data.length} הערכות)</span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="period"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px'
            }}
            formatter={(value: any) => value?.toFixed(1) || '-'}
          />
          <Line
            type="monotone"
            dataKey="overall_score"
            stroke="#8b5cf6"
            strokeWidth={3}
            dot={{ fill: '#8b5cf6', r: 5 }}
            name="overall_score"
          />
          <Line
            type="monotone"
            dataKey="operational_score"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            name="operational_score"
          />
          <Line
            type="monotone"
            dataKey="people_score"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            name="people_score"
          />
          <Line
            type="monotone"
            dataKey="business_score"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 4 }}
            name="business_score"
          />
          <Line
            type="monotone"
            dataKey="leadership_score"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            name="leadership_score"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center">
          <p className="text-xs text-gray-500">ציון נוכחי</p>
          <p className="text-lg font-bold text-purple-600">
            {data[data.length - 1]?.overall_score?.toFixed(1) || '-'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">ממוצע היסטורי</p>
          <p className="text-lg font-bold text-gray-700">
            {(data.reduce((sum, d) => sum + (d.overall_score || 0), 0) / data.length).toFixed(1)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">ציון הגבוה</p>
          <p className="text-lg font-bold text-green-600">
            {Math.max(...data.map(d => d.overall_score || 0)).toFixed(1)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">ציון הנמוך</p>
          <p className="text-lg font-bold text-red-600">
            {Math.min(...data.filter(d => d.overall_score).map(d => d.overall_score || 100)).toFixed(1)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">שיפור</p>
          <p className={`text-lg font-bold ${
            (data[data.length - 1]?.overall_score || 0) >= (data[0]?.overall_score || 0)
              ? 'text-green-600'
              : 'text-red-600'
          }`}>
            {data.length > 1
              ? ((data[data.length - 1]?.overall_score || 0) - (data[0]?.overall_score || 0)).toFixed(1)
              : '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrendChart;
