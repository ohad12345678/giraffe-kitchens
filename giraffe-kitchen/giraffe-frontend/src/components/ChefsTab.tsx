import { useState, useEffect } from 'react';
import { chefAPI, branchAPI } from '../services/api';

interface Chef {
  id: number;
  name: string;
  branch_id: number;
}

interface Branch {
  id: number;
  name: string;
  location: string | null;
}

interface ChefFormData {
  name: string;
  branch_id: number | null;
}

function ChefsTab() {
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedChef, setSelectedChef] = useState<Chef | null>(null);
  const [formData, setFormData] = useState<ChefFormData>({
    name: '',
    branch_id: null
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [chefsData, branchesData] = await Promise.all([
        chefAPI.list(),
        branchAPI.list()
      ]);
      setChefs(chefsData);
      setBranches(branchesData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.branch_id) {
      setError('יש לבחור סניף');
      return;
    }
    try {
      await chefAPI.create({
        name: formData.name,
        branch_id: formData.branch_id
      });
      setShowCreateModal(false);
      setFormData({ name: '', branch_id: null });
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה ביצירת שף');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChef || !formData.branch_id) return;
    setError('');
    try {
      await chefAPI.update(selectedChef.id, {
        name: formData.name,
        branch_id: formData.branch_id
      });
      setShowEditModal(false);
      setSelectedChef(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה בעדכון שף');
    }
  };

  const handleDelete = async () => {
    if (!selectedChef) return;
    setError('');
    try {
      await chefAPI.delete(selectedChef.id);
      setShowDeleteModal(false);
      setSelectedChef(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה במחיקת שף');
    }
  };

  const openEditModal = (chef: Chef) => {
    setSelectedChef(chef);
    setFormData({
      name: chef.name,
      branch_id: chef.branch_id
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (chef: Chef) => {
    setSelectedChef(chef);
    setShowDeleteModal(true);
  };

  const getBranchName = (branchId: number) => {
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : '-';
  };

  if (loading) {
    return <div className="text-center py-8">טוען...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">ניהול שפים</h2>
        <button
          onClick={() => {
            setFormData({ name: '', branch_id: null });
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          + שף חדש
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
              <th className="text-right py-3 px-4 font-semibold text-gray-700">שם השף</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">סניף</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {chefs.map((chef) => (
              <tr key={chef.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{chef.name}</td>
                <td className="py-3 px-4">{getBranchName(chef.branch_id)}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(chef)}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    >
                      עריכה
                    </button>
                    <button
                      onClick={() => openDeleteModal(chef)}
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">שף חדש</h3>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">שם השף</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
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

      {/* Edit Modal */}
      {showEditModal && selectedChef && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">עריכת שף</h3>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">שם השף</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
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

      {/* Delete Modal */}
      {showDeleteModal && selectedChef && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">אישור מחיקה</h3>
            <p className="text-gray-700 mb-6">
              האם אתה בטוח שברצונך למחוק את השף <strong>{selectedChef.name}</strong>?
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
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

export default ChefsTab;
