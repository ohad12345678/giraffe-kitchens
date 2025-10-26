import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex" dir="rtl">
      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] mb-4 shadow-lg shadow-orange-500/20"
            >
              <span className="text-3xl">🦒</span>
            </motion.div>

            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              ברוכים הבאים ל-Giraffe
            </h1>
            <p className="text-gray-600">
              מערכת ניהול איכות מטבח מקצועית
            </p>
          </div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  אימייל
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition-all text-right"
                    placeholder="your@email.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סיסמה
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition-all text-right"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white rounded-lg font-medium shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>התחבר</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center mb-3">
                חשבונות לדוגמה
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('headquarters');
                    setPassword('admin123');
                  }}
                  className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
                >
                  <div className="font-medium">מטה</div>
                  <div className="text-gray-500">headquarters</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('haifa_user');
                    setPassword('haifa123');
                  }}
                  className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
                >
                  <div className="font-medium">חיפה</div>
                  <div className="text-gray-500">haifa_user</div>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-6">
            מערכת Giraffe © 2025
          </p>
        </motion.div>
      </div>

      {/* Left side - Black Hero with GIRAFFE Logo */}
      <div className="hidden lg:flex flex-1 bg-black items-center justify-center relative overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 text-white text-center max-w-lg"
        >
          {/* GIRAFFE Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <h2 className="text-7xl font-bold mb-4 tracking-wider" style={{ fontWeight: '300' }}>
              GIRAFFE
            </h2>
            <div className="w-32 h-1 bg-white mx-auto mb-6"></div>
            <h3 className="text-2xl font-semibold mb-2">
              ניהול איכות חכם
            </h3>
            <p className="text-lg text-white/80">
              מעקב בזמן אמת אחר בדיקות איכות, תברואה והדרכות
            </p>
          </motion.div>

          {/* Features */}
          <div className="space-y-4 text-right">
            {[
              'בדיקות איכות מנות',
              'ביקורות תברואה',
              'הערכות מנהלים',
              'דוחות מתקדמים'
            ].map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3 text-white/90 justify-end"
              >
                <span className="text-lg">{feature}</span>
                <div className="w-2 h-2 rounded-full bg-white" />
              </motion.div>
            ))}
          </div>

          {/* Giraffe Emoji */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="text-6xl mt-12"
          >
            🦒
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
