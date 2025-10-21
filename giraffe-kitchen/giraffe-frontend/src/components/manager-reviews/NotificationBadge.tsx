import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerReviewAPI } from '../../services/managerReviewAPI';
import { Bell, AlertCircle, Clock } from 'lucide-react';

const NotificationBadge: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await managerReviewAPI.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuarterLabel = (quarter: string) => {
    const labels: Record<string, string> = {
      Q1: 'רבעון 1',
      Q2: 'רבעון 2',
      Q3: 'רבעון 3',
      Q4: 'רבעון 4',
    };
    return labels[quarter] || quarter;
  };

  if (loading || !notifications) {
    return null;
  }

  const totalCount = notifications.total_count || 0;

  return (
    <div className="relative">
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="h-6 w-6" />
        {totalCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute left-0 mt-2 w-96 z-20 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-primary-600 text-white px-4 py-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5" />
                התראות הערכות מנהלים
              </h3>
              {totalCount > 0 && (
                <p className="text-sm text-primary-100 mt-1">
                  {totalCount} התראות ממתינות
                </p>
              )}
            </div>

            {/* No Notifications */}
            {totalCount === 0 && (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">אין התראות חדשות</p>
                <p className="text-sm text-gray-400 mt-1">כל ההערכות עדכניות!</p>
              </div>
            )}

            {/* Notifications List */}
            {totalCount > 0 && (
              <div className="max-h-96 overflow-y-auto">
                {/* Pending Reviews */}
                {notifications.pending_reviews?.length > 0 && (
                  <div className="border-b border-gray-200">
                    <div className="bg-gray-50 px-4 py-2 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">
                        ממתינות להשלמה ({notifications.pending_reviews.length})
                      </span>
                    </div>
                    {notifications.pending_reviews.map((review: any) => (
                      <div
                        key={review.id}
                        onClick={() => {
                          navigate(`/manager-reviews/${review.id}`);
                          setShowDropdown(false);
                        }}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{review.manager_name}</p>
                            <p className="text-sm text-gray-600">{review.branch_name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {getQuarterLabel(review.quarter)} {review.year}
                            </p>
                          </div>
                          <div className="text-left mr-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              review.status === 'draft'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {review.status === 'draft' ? 'טיוטה' : 'הוגש'}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {review.days_since_created} ימים
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Missing Reviews */}
                {notifications.missing_reviews?.length > 0 && (
                  <div>
                    <div className="bg-gray-50 px-4 py-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-gray-700">
                        טרם נוצרו ({notifications.missing_reviews.length})
                      </span>
                    </div>
                    {notifications.missing_reviews.map((missing: any) => (
                      <div
                        key={`${missing.manager_id}-${missing.quarter}-${missing.year}`}
                        onClick={() => {
                          navigate('/manager-reviews');
                          setShowDropdown(false);
                        }}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{missing.manager_name}</p>
                            <p className="text-sm text-gray-600">{missing.branch_name}</p>
                          </div>
                          <div className="text-left mr-4">
                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                              חסר
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {getQuarterLabel(missing.quarter)} {missing.year}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            {totalCount > 0 && (
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    navigate('/manager-reviews');
                    setShowDropdown(false);
                  }}
                  className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  צפה בכל ההערכות →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBadge;
