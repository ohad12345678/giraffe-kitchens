import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2,
  ClipboardCheck,
  ListChecks,
  BarChart3,
  ShieldCheck,
  Home,
  FileText,
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isHQ } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const menuItems = [
    {
      label: 'דף הבית',
      icon: Home,
      path: '/dashboard',
      show: true,
    },
    {
      label: 'בדיקת איכויות מזון',
      icon: ClipboardCheck,
      path: '/new-check',
      show: true,
    },
    {
      label: 'ביקורות תברואה',
      icon: ShieldCheck,
      path: '/sanitation-audits',
      show: true,
    },
    {
      label: 'דוחות',
      icon: BarChart3,
      path: '/reports',
      show: true,
    },
    {
      label: 'משימות',
      icon: ListChecks,
      path: '/tasks',
      show: isHQ,
    },
    {
      label: 'טופס הערכת מנהלים',
      icon: FileText,
      path: '/manager-reviews',
      show: isHQ, // Will add specific user check later
    },
  ];

  return (
    <div className="w-64 bg-white/90 backdrop-blur-sm border-l border-gray-200 h-screen sticky top-0 flex flex-col shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="h-12 w-12 bg-primary-500 rounded-lg flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Giraffe</h1>
            <p className="text-xs text-gray-600">בקרת איכות</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {menuItems.map((item) => {
            if (!item.show) return null;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Giraffe Kitchens © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
