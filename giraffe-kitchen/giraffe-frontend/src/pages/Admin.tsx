import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, branchAPI } from '../services/api';
import DishesTab from '../components/DishesTab';
import ChefsTab from '../components/ChefsTab';

interface User {
  id: number;
  email: string;
  role: string;
  branch_id: number | null;
  created_at: string | null;
}

interface Branch {
  id: number;
  name: string;
  location: string | null;
}

interface UserFormData {
  email: string;
  password: string;
  role: string;
  branch_id: number | null;
}

function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'branches' | 'dishes' | 'chefs' | 'settings'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    role: 'branch_manager',
    branch_id: null
  });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, branchesData] = await Promise.all([
        userAPI.list(),
        branchAPI.list()
      ]);
      setUsers(usersData);
      setBranches(branchesData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await userAPI.create(formData);
      setShowCreateModal(false);
      setFormData({ email: '', password: '', role: 'branch_manager', branch_id: null });
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה ביצירת משתמש');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError('');
    try {
      await userAPI.update(selectedUser.id, {
        email: formData.email,
        role: formData.role,
        branch_id: formData.branch_id
      });
      setShowEditModal(false);
      setSelectedUser(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה בעדכון משתמש');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError('');
    try {
      await userAPI.changePassword(selectedUser.id, newPassword);
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה בשינוי סיסמה');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setError('');
    try {
      await userAPI.delete(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה במחיקת משתמש');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      branch_id: user.branch_id
    });
    setShowEditModal(true);
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const getBranchName = (branchId: number | null) => {
    if (!branchId) return '-';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : '-';
  };

  const getRoleDisplay = (role: string) => {
    return role === 'hq' ? 'מטה' : 'מנהל סניף';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול מערכת</h1>
            <p className="text-gray-600">ניהול משתמשים והגדרות מערכת</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            חזרה לדף הראשי
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === 'users'
                  ? 'border-b-2 border-orange-500 text-orange-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              משתמשים
            </button>
            <button
              onClick={() => setActiveTab('branches')}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === 'branches'
                  ? 'border-b-2 border-orange-500 text-orange-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              סניפים
            </button>
            <button
              onClick={() => setActiveTab('dishes')}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === 'dishes'
                  ? 'border-b-2 border-orange-500 text-orange-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              מנות
            </button>
            <button
              onClick={() => setActiveTab('chefs')}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === 'chefs'
                  ? 'border-b-2 border-orange-500 text-orange-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              שפים
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === 'settings'
                  ? 'border-b-2 border-orange-500 text-orange-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              הגדרות
            </button>
          </div>
        </div>

        {/* Users Tab Content */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">ניהול משתמשים</h2>
              <button
                onClick={() => {
                  setFormData({ email: '', password: '', role: 'branch_manager', branch_id: null });
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                + משתמש חדש
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">אימייל</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">תפקיד</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">סניף</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">תאריך יצירה</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">{getRoleDisplay(user.role)}</td>
                      <td className="py-3 px-4">{getBranchName(user.branch_id)}</td>
                      <td className="py-3 px-4">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('he-IL') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                          >
                            עריכה
                          </button>
                          <button
                            onClick={() => openPasswordModal(user)}
                            className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                          >
                            שינוי סיסמה
                          </button>
                          <button
                            onClick={() => openDeleteModal(user)}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                          >
                            מחיקה
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dishes Tab */}
        {activeTab === 'dishes' && <DishesTab />}

        {/* Chefs Tab */}
        {activeTab === 'chefs' && <ChefsTab />}

        {/* Other Tabs - Coming Soon */}
        {(activeTab === 'branches' || activeTab === 'settings') && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <h3 className="text-2xl font-bold text-gray-400 mb-2">בקרוב</h3>
            <p className="text-gray-500">תכונה זו תהיה זמינה בקרוב</p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">משתמש חדש</h3>
            <form onSubmit={handleCreateUser}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">אימייל</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">סיסמה</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">תפקיד</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="branch_manager">מנהל סניף</option>
                  <option value="hq">מטה</option>
                </select>
              </div>
              {formData.role === 'branch_manager' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">סניף</label>
                  <select
                    value={formData.branch_id || ''}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 border rounded-lg"
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
              )}
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  יצירה
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">עריכת משתמש</h3>
            <form onSubmit={handleUpdateUser}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">אימייל</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">תפקיד</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="branch_manager">מנהל סניף</option>
                  <option value="hq">מטה</option>
                </select>
              </div>
              {formData.role === 'branch_manager' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">סניף</label>
                  <select
                    value={formData.branch_id || ''}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 border rounded-lg"
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
              )}
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  עדכון
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">שינוי סיסמה</h3>
            <p className="text-gray-600 mb-4">משתמש: {selectedUser.email}</p>
            <form onSubmit={handleChangePassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">סיסמה חדשה</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  שינוי סיסמה
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">אישור מחיקה</h3>
            <p className="text-gray-700 mb-6">
              האם אתה בטוח שברצונך למחוק את המשתמש <strong>{selectedUser.email}</strong>?
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                מחיקה
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
