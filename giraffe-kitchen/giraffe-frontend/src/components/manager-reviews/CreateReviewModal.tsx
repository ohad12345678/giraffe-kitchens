import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import type { ReviewQuarter } from '../../types/managerReview';
import { managerReviewAPI } from '../../services/managerReviewAPI';
import { branchAPI, userAPI } from '../../services/api';

interface Branch {
  id: number;
  name: string;
}

interface User {
  id: number;
  full_name: string;
  branch_id: number | null;
}

interface CreateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateReviewModal: React.FC<CreateReviewModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract first name from full_name (e.g., "Manager - Giraffe רמת החייל" -> just the Hebrew name)
  // Or extract from email (e.g., "harel@giraffe.co.il" -> "הראל")
  const getManagerDisplayName = (user: User): string => {
    // If full_name is just a simple Hebrew name, use it
    if (user.full_name && !user.full_name.includes('Manager') && !user.full_name.includes('-')) {
      return user.full_name;
    }

    // Otherwise, extract from email (before @)
    const emailName = user.email.split('@')[0];
    // Capitalize first letter for Hebrew names stored in email
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  };

  // Form state
  const [selectedBranch, setSelectedBranch] = useState<number | ''>('');
  const [selectedManager, setSelectedManager] = useState<number | ''>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [quarter, setQuarter] = useState<ReviewQuarter | ''>('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      // Load branches and users
      const [branchesData, usersData] = await Promise.all([
        branchAPI.getBranches(),
        userAPI.list(),
      ]);

      setBranches(branchesData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('שגיאה בטעינת נתונים');
    }
  };

  // Filter managers by selected branch
  const filteredManagers = selectedBranch
    ? users.filter((u) => u.branch_id === selectedBranch)
    : users;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedManager || !selectedBranch || !quarter) {
      setError('יש למלא את כל השדות');
      return;
    }

    try {
      setLoading(true);
      const newReview = await managerReviewAPI.createReview({
        manager_id: Number(selectedManager),
        branch_id: Number(selectedBranch),
        year,
        quarter: quarter as ReviewQuarter,
      });

      onSuccess();
      onClose();
      resetForm();

      // Navigate to the newly created review
      navigate(`/manager-reviews/${newReview.id}`);
    } catch (err: any) {
      console.error('Failed to create review:', err);
      setError(err.response?.data?.detail || 'שגיאה ביצירת הערכה');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedBranch('');
    setSelectedManager('');
    setYear(new Date().getFullYear());
    setQuarter('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">הערכה חדשה</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שנה</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>

          {/* Quarter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">רבעון</label>
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value as ReviewQuarter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">בחר רבעון</option>
              <option value="Q1">רבעון 1 (ינואר-מרץ)</option>
              <option value="Q2">רבעון 2 (אפריל-יוני)</option>
              <option value="Q3">רבעון 3 (יולי-ספטמבר)</option>
              <option value="Q4">רבעון 4 (אוקטובר-דצמבר)</option>
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סניף</label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value ? Number(e.target.value) : '');
                setSelectedManager(''); // Reset manager when branch changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

          {/* Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">מנהל</label>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={!selectedBranch || filteredManagers.length === 0}
              required
            >
              <option value="">בחר מנהל</option>
              {filteredManagers.map((user) => (
                <option key={user.id} value={user.id}>
                  {getManagerDisplayName(user)}
                </option>
              ))}
            </select>
            {selectedBranch && filteredManagers.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">אין מנהלים בסניף זה</p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">💡 שים לב:</p>
            <ul className="text-xs space-y-1">
              <li>• המערכת תמשוך אוטומטית נתונים מביקורות תברואה ובדיקות מנות</li>
              <li>• ניתן לשמור כטיוטה ולחזור למילוי מאוחר יותר</li>
              <li>• לאחר השליחה, ניתן יהיה להשלים את ההערכה</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              ביטול
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'יוצר...' : 'צור הערכה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReviewModal;
