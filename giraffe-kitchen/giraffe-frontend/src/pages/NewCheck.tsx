import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Utensils, ChefHat, MessageSquare } from 'lucide-react';
import { chefAPI, dishAPI, checkAPI, branchAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Chef, Dish, Branch } from '../types';

const NewCheck: React.FC = () => {
  const navigate = useNavigate();
  const { user, isHQ } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [loading, setLoading] = useState(true);

  const [dishId, setDishId] = useState('');
  const [customDishName, setCustomDishName] = useState('');
  const [chefId, setChefId] = useState('');
  const [customChefName, setCustomChefName] = useState('');
  const [rating, setRating] = useState(10);
  const [comments, setComments] = useState('');

  // Load branches on mount
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const branchesData = await branchAPI.list();
        setBranches(branchesData);

        // Auto-select branch for branch managers
        if (!isHQ && user?.branch_id) {
          setBranchId(user.branch_id);
        }
      } catch (error) {
        console.error('Failed to load branches:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBranches();
  }, [isHQ, user]);

  // Load dishes and chefs when branch is selected
  useEffect(() => {
    if (!branchId) return;

    const loadData = async () => {
      try {
        const [dishesData, chefsData] = await Promise.all([
          dishAPI.list(),
          chefAPI.list(branchId),
        ]);
        setDishes(dishesData);
        setChefs(chefsData);
      } catch (error) {
        console.error('Failed to load data:', error);
        alert('❌ שגיאה בטעינת הנתונים');
      }
    };
    loadData();
  }, [branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!branchId) {
      alert('❌ יש לבחור סניף');
      return;
    }

    if (!dishId) {
      alert('❌ יש לבחור מנה');
      return;
    }

    if (!chefId) {
      alert('❌ יש לבחור טבח');
      return;
    }

    if (dishId === 'custom' && !customDishName.trim()) {
      alert('❌ יש להזין שם מנה');
      return;
    }

    if (chefId === 'custom' && !customChefName.trim()) {
      alert('❌ יש להזין שם טבח');
      return;
    }

    try {
      // Get today's date in local timezone as YYYY-MM-DD (manual formatting to avoid timezone issues)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayLocal = `${year}-${month}-${day}`;

      // Prepare data for submission
      const checkData = {
        branch_id: branchId as number,
        dish_id: dishId !== 'custom' ? parseInt(dishId) : undefined,
        dish_name_manual: dishId === 'custom' ? customDishName : undefined,
        chef_id: chefId !== 'custom' ? parseInt(chefId) : undefined,
        chef_name_manual: chefId === 'custom' ? customChefName : undefined,
        rating: rating,
        comments: comments || undefined,
        check_date: todayLocal,
      };

      console.log('Submitting check with date:', todayLocal, checkData);
      await checkAPI.create(checkData);

      const dishDisplay = dishId === 'custom' ? customDishName : dishes.find(d => d.id === parseInt(dishId))?.name;
      const chefDisplay = chefId === 'custom' ? customChefName : chefs.find(c => c.id === parseInt(chefId))?.name;

      alert(`✅ הבדיקה נשלחה בהצלחה!\n\nמנה: ${dishDisplay}\nטבח: ${chefDisplay}\nציון: ${rating}/10`);

      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to submit check:', error);
      alert('❌ שגיאה בשליחת הבדיקה. נסה שוב.');
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const getRatingLabel = (value: number) => {
    if (value <= 3) return 'חלש';
    if (value <= 5) return 'בינוני';
    if (value <= 7) return 'טוב';
    return 'מצוין';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">טוען...</div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            בדיקת איכות מנה
          </h1>
          <p className="text-base text-gray-600">מלא את הפרטים הבאים כדי לתעד בדיקת איכות</p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
        >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Branch Selection (HQ only, Branch Managers see their branch auto-selected) */}
          {isHQ && (
            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-2">
                סניף <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  id="branch"
                  value={branchId || ''}
                  onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : null)}
                  className="block w-full pr-11 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-all"
                  required
                >
                  <option value="">בחר סניף...</option>
                  {Array.isArray(branches) && branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Dish Selection */}
          <div>
            <label htmlFor="dish" className="block text-sm font-medium text-gray-700 mb-2">
              מנה <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Utensils className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                id="dish"
                value={dishId}
                onChange={(e) => {
                  setDishId(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomDishName('');
                  }
                }}
                className="block w-full pr-11 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-all"
              >
                <option value="">בחר מנה...</option>
                {Array.isArray(dishes) && dishes.map((dish) => (
                  <option key={dish.id} value={dish.id}>
                    {dish.name} ({dish.category})
                  </option>
                ))}
                <option value="custom">➕ מנה אחרת (הקלד ידנית)</option>
              </select>
            </div>

            {/* Custom Dish Name Input */}
            {dishId === 'custom' && (
              <input
                type="text"
                required
                value={customDishName}
                onChange={(e) => setCustomDishName(e.target.value)}
                placeholder="הקלד שם מנה..."
                className="mt-3 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-all"
              />
            )}
          </div>

          {/* Chef Selection */}
          <div>
            <label htmlFor="chef" className="block text-sm font-medium text-gray-700 mb-2">
              טבח <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <ChefHat className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                id="chef"
                value={chefId}
                onChange={(e) => {
                  setChefId(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomChefName('');
                  }
                }}
                className="block w-full pr-11 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-all"
              >
                <option value="">בחר טבח...</option>
                {Array.isArray(chefs) && chefs.map((chef) => (
                  <option key={chef.id} value={chef.id}>
                    {chef.name}
                  </option>
                ))}
                <option value="custom">➕ טבח אחר (הקלד ידנית)</option>
              </select>
            </div>

            {/* Custom Chef Name Input */}
            {chefId === 'custom' && (
              <input
                type="text"
                required
                value={customChefName}
                onChange={(e) => setCustomChefName(e.target.value)}
                placeholder="הקלד שם טבח..."
                className="mt-3 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-all"
              />
            )}
          </div>

          {/* Rating Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ציון <span className="text-red-500">*</span>
            </label>

            <div className="bg-gray-50 rounded-lg p-4">
              {/* Slider */}
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={rating}
                    onChange={(e) => setRating(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to left, #84cc16 0%, #84cc16 ${rating * 10}%, #e5e7eb ${rating * 10}%, #e5e7eb 100%)`
                    }}
                  />
                </div>

                {/* Rating Display */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-lime-500" />
                    <span className="text-sm text-gray-600">{getRatingLabel(rating)}</span>
                  </div>
                  <div className="text-4xl font-semibold text-gray-900">
                    {rating.toFixed(1)}
                  </div>
                </div>

                {/* Scale markers */}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
              הערות (אופציונלי)
            </label>
            <div className="relative">
              <MessageSquare className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                id="comments"
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="block w-full pr-11 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 transition-all resize-none"
                placeholder="הוסף הערות לגבי המנה, איכות, טעם, מראה וכו..."
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
            >
              ביטול
            </button>

            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-8 py-3 bg-lime-500 hover:bg-lime-600 text-white rounded-lg font-medium shadow-sm transition-all"
            >
              <span>שלח בדיקה</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </motion.div>

      {/* Custom slider styles */}
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #84cc16;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(132, 204, 22, 0.4);
          transition: all 0.2s;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(132, 204, 22, 0.6);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #84cc16;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(132, 204, 22, 0.4);
          transition: all 0.2s;
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(132, 204, 22, 0.6);
        }
      `}</style>
      </div>
    </div>
  );
};

export default NewCheck;
