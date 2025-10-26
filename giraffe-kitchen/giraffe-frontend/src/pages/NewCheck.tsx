import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Utensils, ChefHat, MessageSquare, ArrowRight } from 'lucide-react';
import api from '../services/api';

interface Location {
  id: number;
  name: string;
}

interface Dish {
  id: number;
  name: string;
}

interface Chef {
  id: number;
  name: string;
  role: string;
}

export default function NewCheck() {
  const navigate = useNavigate();

  const [locations, setLocations] = useState<Location[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [chefs, setChefs] = useState<Chef[]>([]);

  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDish, setSelectedDish] = useState('');
  const [selectedChef, setSelectedChef] = useState('');
  const [rating, setRating] = useState(7);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [locationsRes, dishesRes, chefsRes] = await Promise.all([
        api.get('/api/v1/branches/'),
        api.get('/api/v1/dishes/'),
        api.get('/api/v1/chefs/'),
      ]);
      setLocations(locationsRes.data);
      setDishes(dishesRes.data);
      setChefs(chefsRes.data);
    } catch (error) {
      alert('שגיאה בטעינת הנתונים');
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLocation || !selectedDish || !selectedChef) {
      alert('נא למלא את כל השדות');
      return;
    }

    setLoading(true);

    try {
      await api.post('/api/v1/checks/', {
        branch_id: parseInt(selectedLocation),
        dish_id: parseInt(selectedDish),
        chef_id: parseInt(selectedChef),
        rating,
        notes: notes || null,
      });

      alert('הבדיקה נשמרה בהצלחה!');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'שגיאה בשמירת הבדיקה');
      console.error('Error submitting check:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingLabel = (value: number) => {
    if (value <= 3) return 'חלש';
    if (value <= 5) return 'בינוני';
    if (value <= 7) return 'טוב';
    if (value <= 9) return 'טוב מאוד';
    return 'מצוין';
  };

  const getRatingColor = (value: number) => {
    if (value <= 3) return 'bg-red-500';
    if (value <= 5) return 'bg-orange-500';
    if (value <= 7) return 'bg-yellow-500';
    if (value <= 9) return 'bg-green-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          בדיקת איכות מנה
        </h1>
        <p className="text-gray-600">
          מלא את הפרטים הבאים כדי לתעד בדיקת איכות
        </p>
      </div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              סניף
            </label>
            <div className="relative">
              <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition-all text-right appearance-none bg-white"
                required
                disabled={loading}
              >
                <option value="">בחר סניף...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dish */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              מנה
            </label>
            <div className="relative">
              <Utensils className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedDish}
                onChange={(e) => setSelectedDish(e.target.value)}
                className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition-all text-right appearance-none bg-white"
                required
                disabled={loading}
              >
                <option value="">בחר מנה...</option>
                {dishes.map((dish) => (
                  <option key={dish.id} value={dish.id}>
                    {dish.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chef */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              טבאח
            </label>
            <div className="relative">
              <ChefHat className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedChef}
                onChange={(e) => setSelectedChef(e.target.value)}
                className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition-all text-right appearance-none bg-white"
                required
                disabled={loading}
              >
                <option value="">בחר טבאח...</option>
                {chefs.map((chef) => (
                  <option key={chef.id} value={chef.id}>
                    {chef.name} - {chef.role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rating Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              ציון איכות
            </label>

            <div className="space-y-4">
              {/* Slider */}
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

              {/* Rating Display */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getRatingColor(rating)}`} />
                  <span className="text-sm text-gray-600">{getRatingLabel(rating)}</span>
                </div>
                <div className="text-3xl font-semibold text-gray-900">
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              הערות (אופציונלי)
            </label>
            <div className="relative">
              <MessageSquare className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition-all text-right resize-none"
                placeholder="הוסף הערות לגבי המנה, איכות, טעם, מראה וכו..."
                disabled={loading}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 text-left">
              {notes.length} תווים
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
              disabled={loading}
            >
              ביטול
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white rounded-lg font-medium shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>שלח בדיקה</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
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
  );
}
