import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  CheckSquare,
  Settings,
  ClipboardList,
  Users,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Navigation items
  const navItems: NavItem[] = [
    {
      path: '/dashboard',
      label: 'דף הבית',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      path: '/new-check',
      label: 'בדיקה חדשה',
      icon: <ClipboardCheck className="w-5 h-5" />,
    },
    {
      path: '/reports',
      label: 'דוחות',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      path: '/tasks',
      label: 'משימות',
      icon: <CheckSquare className="w-5 h-5" />,
      roles: ['headquarters'],
    },
    {
      path: '/sanitation-audits',
      label: 'ביקורות תברואה',
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      path: '/manager-evaluations',
      label: 'הערכות מנהלים',
      icon: <Users className="w-5 h-5" />,
      roles: ['headquarters'],
    },
    {
      path: '/admin',
      label: 'ניהול',
      icon: <Settings className="w-5 h-5" />,
      roles: ['admin'],
    },
  ];

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;

    // Admin access (ohadb)
    if (user?.email === 'ohadb@giraffe.co.il') return true;

    // Check role-based access
    if (item.roles.includes('admin') && user?.email !== 'ohadb@giraffe.co.il') return false;
    if (item.roles.includes('headquarters') && user?.role !== 'hq') return false;

    return true;
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9E6] via-[#FFF5DC] to-[#FFFAED] relative overflow-hidden" dir="rtl">
      {/* Decorative Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-300/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-green-300/30 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative flex h-screen">
        {/* Desktop Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 280 : 80 }}
          className="hidden md:flex flex-col bg-white/95 backdrop-blur-xl border-l border-gray-200 shadow-2xl relative z-10"
        >
          {/* Logo & Toggle */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <AnimatePresence mode="wait">
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3"
                  >
                    <div className="text-4xl">🦒</div>
                    <div>
                      <h1 className="font-bold text-xl text-gray-900">Giraffe</h1>
                      <p className="text-xs text-gray-500">ניהול מטבח</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!sidebarOpen && (
                <div className="text-3xl mx-auto">🦒</div>
              )}

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft
                  className={`w-5 h-5 transition-transform ${
                    sidebarOpen ? '' : 'rotate-180'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {filteredNavItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ scale: 1.02, x: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white shadow-lg shadow-orange-500/30'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-medium whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center text-white font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex-1 overflow-hidden"
                  >
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {user?.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.location}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {sidebarOpen && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleLogout}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">התנתק</span>
              </motion.button>
            )}
          </div>
        </motion.aside>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden fixed top-4 right-4 z-50 p-3 bg-white rounded-xl shadow-lg"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden fixed inset-0 bg-black/50 z-40"
              />
              <motion.aside
                initial={{ x: 300 }}
                animate={{ x: 0 }}
                exit={{ x: 300 }}
                className="md:hidden fixed top-0 right-0 bottom-0 w-80 bg-white z-50 shadow-2xl"
              >
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">🦒</div>
                    <div>
                      <h1 className="font-bold text-xl">Giraffe</h1>
                      <p className="text-xs text-gray-500">ניהול מטבח</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="p-4 space-y-2">
                  {filteredNavItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          isActive(item.path)
                            ? 'bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                      </div>
                    </Link>
                  ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center text-white font-bold">
                      {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{user?.username}</p>
                      <p className="text-xs text-gray-500">{user?.location}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">התנתק</span>
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}