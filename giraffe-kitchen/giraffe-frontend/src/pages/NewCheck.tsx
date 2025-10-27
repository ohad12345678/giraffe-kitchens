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

  const getRatingColor = (value: number) => {
    if (value <= 3) return 'bg-red-500';
    if (value <= 5) return 'bg-orange-500';
    if (value <= 7) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#f97316] to-[#ea580c] bg-clip-text text-transparent mb-3">
            בדיקת איכות מנה
          </h1>
          <p className="text-lg text-gray-600">מלא את הפרטים הבאים כדי לתעד בדיקת איכות</p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white p-10 shadow-2xl shadow-orange-500/10"
        >
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Branch Selection (HQ only, Branch Managers see their branch auto-selected) */}
          {isHQ && (
            <div className="relative group">
              <label htmlFor="branch" className="block text-base font-semibold text-gray-700 mb-3">
                סניף <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
                <select
                  id="branch"
                  value={branchId || ''}
                  onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : null)}
                  className="block w-full pr-14 pl-6 py-4 bg-white/50 border-2 border-gray-200 rounded-2xl focus:border-[#f97316] focus:shadow-lg focus:shadow-orange-500/20 transition-all duration-300"
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
          <div className="relative group">
            <label htmlFor="dish" className="block text-base font-semibold text-gray-700 mb-3">
              מנה <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Utensils className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
              <select
                id="dish"
                value={dishId}
                onChange={(e) => {
                  setDishId(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomDishName('');
                  }
                }}
                className="block w-full pr-14 pl-6 py-4 bg-white/50 border-2 border-gray-200 rounded-2xl focus:border-[#f97316] focus:shadow-lg focus:shadow-orange-500/20 transition-all duration-300"
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
                className="mt-3 block w-full px-6 py-4 bg-white/50 border-2 border-gray-200 rounded-2xl focus:border-[#f97316] focus:shadow-lg focus:shadow-orange-500/20 transition-all duration-300"
              />
            )}
          </div>

          {/* Chef Selection */}
          <div className="relative group">
            <label htmlFor="chef" className="block text-base font-semibold text-gray-700 mb-3">
              טבאח <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <ChefHat className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
              <select
                id="chef"
                value={chefId}
                onChange={(e) => {
                  setChefId(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomChefName('');
                  }
                }}
                className="block w-full pr-14 pl-6 py-4 bg-white/50 border-2 border-gray-200 rounded-2xl focus:border-[#f97316] focus:shadow-lg focus:shadow-orange-500/20 transition-all duration-300"
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
                className="mt-3 block w-full px-6 py-4 bg-white/50 border-2 border-gray-200 rounded-2xl focus:border-[#f97316] focus:shadow-lg focus:shadow-orange-500/20 transition-all duration-300"
              />
            )}
          </div>

          {/* Rating Slider */}
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-3">
              ציון <span className="text-red-500">*</span>
            </label>

            <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-6 border-2 border-orange-100">
              {/* Rating Display - Big Number */}
              <div className="text-center mb-6">
                <div className="text-6xl font-black bg-gradient-to-r from-[#f97316] to-[#ea580c] bg-clip-text text-transparent mb-2">
                  {rating.toFixed(1)}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${getRatingColor(rating)}`} />
                  <span className="text-base font-bold text-gray-700">{getRatingLabel(rating)}</span>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-3">
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
                      background: `linear-gradient(to left, #f97316 0%, #f97316 ${rating * 10}%, #e5e7eb ${rating * 10}%, #e5e7eb 100%)`
                    }}
                  />
                </div>

                {/* Scale markers */}
                <div className="flex justify-between text-xs text-gray-500 font-medium">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="relative group">
            <label htmlFor="comments" className="block text-base font-semibold text-gray-700 mb-3">
              הערות (אופציונלי)
            </label>
            <div className="relative">
              <MessageSquare className="absolute right-4 top-4 w-6 h-6 text-gray-400" />
              <textarea
                id="comments"
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="block w-full pr-14 pl-6 py-4 bg-white/50 border-2 border-gray-200 rounded-2xl min-h-32 focus:border-[#f97316] focus:shadow-lg focus:shadow-orange-500/20 transition-all duration-300 resize-none"
                placeholder="הוסף הערות לגבי המנה, איכות, טעם, מראה וכו..."
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleCancel}
              className="flex-1 px-8 py-5 bg-white/50 backdrop-blur-sm border-2 border-gray-300 text-gray-700 rounded-2xl text-lg font-bold hover:bg-white hover:border-gray-400 transition-all duration-300"
            >
              ביטול
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-8 py-5 bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white rounded-2xl text-lg font-bold shadow-2xl shadow-orange-500/50 hover:shadow-3xl transition-all duration-300"
            >
              <span>שלח בדיקה</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
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
          background: #f97316;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
          transition: all 0.2s;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.6);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #f97316;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
          transition: all 0.2s;
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.6);
        }
      `}</style>
      </div>
    </div>
  );
};

export default NewCheck;
