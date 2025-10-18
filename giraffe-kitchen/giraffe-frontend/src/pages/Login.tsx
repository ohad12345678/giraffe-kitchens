import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

const Login: React.FC = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await login({ email: 'giraffe@giraffe.com', password: '123' });
      navigate('/dashboard');
    } catch (err) {
      setError('שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-gray-200">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-500 rounded-full flex items-center justify-center mb-4">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            התחברות למערכת
          </h2>
          <p className="mt-2 text-gray-600">
            Giraffe Kitchens - מערכת בקרת איכות
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'מתחבר...' : 'התחבר למערכת'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
