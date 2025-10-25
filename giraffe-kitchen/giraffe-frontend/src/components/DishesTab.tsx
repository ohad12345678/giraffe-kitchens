import { useState, useEffect } from 'react';
import { dishAPI } from '../services/api';

interface Dish {
  id: number;
  name: string;
  category: string | null;
}

interface DishFormData {
  name: string;
  category: string;
}

function DishesTab() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [formData, setFormData] = useState<DishFormData>({
    name: '',
    category: ''
  });

  useEffect(() => {
    loadDishes();
  }, []);

  const loadDishes = async () => {
    try {
      setLoading(true);
      const data = await dishAPI.list();
      setDishes(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה בטעינת מנות');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await dishAPI.create({
        name: formData.name,
        category: formData.category || null
      });
      setShowCreateModal(false);
      setFormData({ name: '', category: '' });
      await loadDishes();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה ביצירת מנה');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDish) return;
    setError('');
    try {
      await dishAPI.update(selectedDish.id, {
        name: formData.name,
        category: formData.category || null
      });
      setShowEditModal(false);
      setSelectedDish(null);
      await loadDishes();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה בעדכון מנה');
    }
  };

  const handleDelete = async () => {
    if (!selectedDish) return;
    setError('');
    try {
      await dishAPI.delete(selectedDish.id);
      setShowDeleteModal(false);
      setSelectedDish(null);
      await loadDishes();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'שגיאה במחיקת מנה');
    }
  };

  const openEditModal = (dish: Dish) => {
    setSelectedDish(dish);
    setFormData({
      name: dish.name,
      category: dish.category || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (dish: Dish) => {
    setSelectedDish(dish);
    setShowDeleteModal(true);
  };

  if (loading) {
    return <div className="text-center py-8">טוען...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">ניהול מנות</h2>
        <button
          onClick={() => {
            setFormData({ name: '', category: '' });
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          + מנה חדשה
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
              <th className="text-right py-3 px-4 font-semibold text-gray-700">שם המנה</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">קטגוריה</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {dishes.map((dish) => (
              <tr key={dish.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{dish.name}</td>
                <td className="py-3 px-4">{dish.category || '-'}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(dish)}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    >
                      עריכה
                    </button>
                    <button
                      onClick={() => openDeleteModal(dish)}
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
            <h3 className="text-2xl font-bold mb-4">מנה חדשה</h3>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">שם המנה</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">קטגוריה</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="אופציונלי"
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
      {showEditModal && selectedDish && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">עריכת מנה</h3>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">שם המנה</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">קטגוריה</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="אופציונלי"
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
      {showDeleteModal && selectedDish && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">אישור מחיקה</h3>
            <p className="text-gray-700 mb-6">
              האם אתה בטוח שברצונך למחוק את המנה <strong>{selectedDish.name}</strong>?
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

export default DishesTab;
