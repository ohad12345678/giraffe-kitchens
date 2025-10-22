import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
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
  const [hoveredRating, setHoveredRating] = useState(0);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - empty or future action buttons */}
            <div></div>

            {/* Right side - Back button (RTL layout) */}
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span>חזרה לדשבורד</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">בדיקת איכות מנה</h1>
          <p className="text-gray-600 mb-8">מלא את הפרטים הבאים כדי לתעד בדיקת איכות</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Branch Selection (HQ only, Branch Managers see their branch auto-selected) */}
            {isHQ && (
              <div>
                <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-2">
                  סניף <span className="text-red-500">*</span>
                </label>
                <select
                  id="branch"
                  value={branchId || ''}
                  onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : null)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            )}

            {/* Dish Selection */}
            <div>
              <label htmlFor="dish" className="block text-sm font-medium text-gray-700 mb-2">
                מנה <span className="text-red-500">*</span>
              </label>
              <select
                id="dish"
                value={dishId}
                onChange={(e) => {
                  setDishId(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomDishName('');
                  }
                }}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">בחר מנה...</option>
                {Array.isArray(dishes) && dishes.map((dish) => (
                  <option key={dish.id} value={dish.id}>
                    {dish.name} ({dish.category})
                  </option>
                ))}
                <option value="custom">➕ מנה אחרת (הקלד ידנית)</option>
              </select>

              {/* Custom Dish Name Input */}
              {dishId === 'custom' && (
                <input
                  type="text"
                  required
                  value={customDishName}
                  onChange={(e) => setCustomDishName(e.target.value)}
                  placeholder="הקלד שם מנה..."
                  className="mt-3 block w-full px-4 py-3 border border-primary-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              )}
            </div>

            {/* Chef Selection */}
            <div>
              <label htmlFor="chef" className="block text-sm font-medium text-gray-700 mb-2">
                טבח <span className="text-red-500">*</span>
              </label>
              <select
                id="chef"
                value={chefId}
                onChange={(e) => {
                  setChefId(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomChefName('');
                  }
                }}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">בחר טבח...</option>
                {Array.isArray(chefs) && chefs.map((chef) => (
                  <option key={chef.id} value={chef.id}>
                    {chef.name}
                  </option>
                ))}
                <option value="custom">➕ טבח אחר (הקלד ידנית)</option>
              </select>

              {/* Custom Chef Name Input */}
              {chefId === 'custom' && (
                <input
                  type="text"
                  required
                  value={customChefName}
                  onChange={(e) => setCustomChefName(e.target.value)}
                  placeholder="הקלד שם טבח..."
                  className="mt-3 block w-full px-4 py-3 border border-primary-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              )}
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ציון <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                {/* Star Rating */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= (hoveredRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {/* Number Display */}
                <div className="flex items-center justify-center h-12 w-12 bg-primary-100 rounded-lg">
                  <span className="text-xl font-bold text-primary-700">{rating}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">1 = חלש מאוד, 10 = מושלם</p>
            </div>

            {/* Comments */}
            <div>
              <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                הערות (אופציונלי)
              </label>
              <textarea
                id="comments"
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="הוסף הערות לגבי המנה, איכות, טעם, מראה וכו..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                שלח בדיקה
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>טיפ:</strong> נסה לבדוק מנות באופן קבוע לאורך כל היום כדי לקבל תמונה מלאה של איכות המטבח.
          </p>
        </div>
      </main>
    </div>
  );
};

export default NewCheck;
