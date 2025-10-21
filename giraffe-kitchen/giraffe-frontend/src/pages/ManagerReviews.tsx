import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { managerReviewAPI } from '../services/managerReviewAPI';
import type { ManagerReview, ReviewQuarter, ReviewStatus } from '../types/managerReview';
import { Building2, Plus, Filter, Calendar, User, FileText } from 'lucide-react';
import CreateReviewModal from '../components/manager-reviews/CreateReviewModal';

const ManagerReviews: React.FC = () => {
  const navigate = useNavigate();
  useAuth(); // May be used later for role-based features
  const [reviews, setReviews] = useState<ManagerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterQuarter, setFilterQuarter] = useState<ReviewQuarter | ''>('');
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | ''>('');

  useEffect(() => {
    loadReviews();
  }, [filterYear, filterQuarter, filterStatus]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterYear) params.year = filterYear;
      if (filterQuarter) params.quarter = filterQuarter;
      if (filterStatus) params.status = filterStatus;

      const data = await managerReviewAPI.listReviews(params);
      setReviews(data);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ReviewStatus) => {
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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">טוען הערכות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">הערכות ביצועים</h1>
                <p className="text-sm text-gray-600">ניהול הערכות רבעוניות למנהלי סניפים</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              חזרה לדשבורד
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters + Create Button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-5 w-5 text-gray-400" />

              {/* Year Filter */}
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
              </select>

              {/* Quarter Filter */}
              <select
                value={filterQuarter}
                onChange={(e) => setFilterQuarter(e.target.value as ReviewQuarter | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">כל הרבעונים</option>
                <option value="Q1">רבעון 1 (ינואר-מרץ)</option>
                <option value="Q2">רבעון 2 (אפריל-יוני)</option>
                <option value="Q3">רבעון 3 (יולי-ספטמבר)</option>
                <option value="Q4">רבעון 4 (אוקטובר-דצמבר)</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ReviewStatus | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">כל הסטטוסים</option>
                <option value="draft">טיוטה</option>
                <option value="submitted">הוגש</option>
                <option value="completed">הושלם</option>
              </select>
            </div>

            {/* Create Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              הערכה חדשה
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">סך הערכות</p>
            <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">טיוטות</p>
            <p className="text-2xl font-bold text-gray-500">
              {reviews.filter((r) => r.status === 'draft').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">הוגשו</p>
            <p className="text-2xl font-bold text-blue-600">
              {reviews.filter((r) => r.status === 'submitted').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">הושלמו</p>
            <p className="text-2xl font-bold text-green-600">
              {reviews.filter((r) => r.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">אין הערכות</h3>
            <p className="text-gray-600 mb-6">התחל על ידי יצירת הערכה חדשה</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              צור הערכה ראשונה
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                onClick={() => navigate(`/manager-reviews/${review.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left Side - Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900">{review.manager_name}</h3>
                      {getStatusBadge(review.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {review.branch_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {review.quarter} {review.year}
                      </div>
                      <div>
                        מעריך: {review.reviewer_name}
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Score */}
                  <div className="flex items-center gap-6">
                    {/* Auto Data */}
                    <div className="text-sm text-gray-600">
                      <p>תברואה: {review.auto_sanitation_avg?.toFixed(1) || '-'}</p>
                      <p>מנות: {review.auto_dish_checks_avg?.toFixed(1) || '-'}</p>
                    </div>

                    {/* Overall Score */}
                    {review.overall_score !== null && (
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">ציון כולל</p>
                        <p className={`text-3xl font-bold ${getScoreColor(review.overall_score)}`}>
                          {review.overall_score}
                        </p>
                      </div>
                    )}

                    {/* No Score Yet */}
                    {review.overall_score === null && (
                      <div className="text-center px-4">
                        <p className="text-sm text-gray-400">טרם הוערך</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <CreateReviewModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadReviews(); // Reload the list
          setShowCreateModal(false);
        }}
      />
    </div>
  );
};

export default ManagerReviews;
