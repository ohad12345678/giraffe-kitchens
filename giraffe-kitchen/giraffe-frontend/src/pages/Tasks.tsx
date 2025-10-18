import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tasksAPI, branchAPI, dishAPI } from '../services/api';
import { ArrowRight, Plus, CheckCircle, Circle, Calendar, Users } from 'lucide-react';
import type { DailyTask, TaskAssignment, CreateTaskData, Branch, Dish, TaskType, TaskFrequency } from '../types';

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { isHQ } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'track'>('create');

  // States for creating task
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('DISH_CHECK');
  const [selectedDish, setSelectedDish] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<TaskFrequency>('ONCE');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [selectAllBranchesMode, setSelectAllBranchesMode] = useState(true); // true = all branches, false = specific

  // Data states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      console.log('🔄 Tasks: Loading data...');
      const [branchesData, dishesData, tasksData] = await Promise.all([
        branchAPI.list(),
        dishAPI.list(),
        tasksAPI.list(true), // רק משימות פעילות
      ]);
      console.log('✅ Tasks: Loaded -', { branches: branchesData.length, dishes: dishesData.length, tasks: tasksData.length });
      setBranches(branchesData);
      setDishes(dishesData);
      setTasks(tasksData);

      // טען assignments להיום
      const today = new Date().toISOString().split('T')[0];
      console.log('🔄 Tasks: Loading assignments for', today);
      const assignmentsData = await tasksAPI.listAssignments({ task_date: today });
      console.log('✅ Tasks: Loaded assignments -', assignmentsData.length);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('❌ Tasks: Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    console.log('📌 Tasks: useEffect triggered, isHQ =', isHQ);
    if (!isHQ) {
      console.log('⚠️ Tasks: Not HQ user, redirecting to dashboard');
      navigate('/dashboard');
      return;
    }
    console.log('✅ Tasks: HQ user confirmed, loading data');
    loadData();
  }, [isHQ, navigate, loadData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (taskType === 'DISH_CHECK' && !selectedDish) {
      alert('❌ יש לבחור מנה');
      return;
    }

    const branchIds = selectAllBranchesMode ? branches.map(b => b.id) : selectedBranches;
    if (branchIds.length === 0) {
      alert('❌ יש לבחור לפחות סניף אחד');
      return;
    }

    // Generate title automatically
    let title = '';
    if (taskType === 'DISH_CHECK') {
      const dish = dishes.find(d => d.id === selectedDish);
      title = dish ? `בדיקת ${dish.name}` : 'בדיקת מנה';
    } else {
      title = 'עבור על מתכון';
    }

    setLoading(true);
    try {
      const taskData: CreateTaskData = {
        title,
        description,
        task_type: taskType,
        dish_id: selectedDish,
        frequency,
        start_date: startDate,
        end_date: frequency === 'ONCE' ? startDate : null,
        branch_ids: branchIds,
      };

      await tasksAPI.create(taskData);
      alert('✅ המשימה נוצרה בהצלחה!');

      // איפוס הטופס
      setDescription('');
      setSelectedDish(null);
      setSelectedBranches([]);
      setSelectAllBranchesMode(true);

      // טען מחדש
      loadData();
      setActiveTab('manage');
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('❌ שגיאה ביצירת המשימה');
    } finally {
      setLoading(false);
    }
  };

  const toggleBranch = (branchId: number) => {
    setSelectedBranches(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const selectAllBranches = () => {
    setSelectedBranches(branches.map(b => b.id));
  };

  const clearBranches = () => {
    setSelectedBranches([]);
  };

  const getCompletionStats = () => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.is_completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  };

  const stats = getCompletionStats();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowRight className="h-5 w-5" />
            <span>חזרה לדשבורד</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול משימות יומיות</h1>
          <p className="text-gray-600">צור והקצה משימות לכל הסניפים</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>יצירת משימה</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'manage'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>משימות קיימות ({tasks.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'track'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>מעקב השלמה ({stats.percentage}%)</span>
            </div>
          </button>
        </div>

        {/* Create Task Tab */}
        {activeTab === 'create' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">יצירת משימה חדשה</h2>

            <form onSubmit={handleCreateTask} className="space-y-6">
              {/* Task Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סוג המשימה <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTaskType('DISH_CHECK')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      taskType === 'DISH_CHECK'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">🍽️</div>
                    <div className="font-medium">בדיקת מנה</div>
                    <div className="text-xs text-gray-500 mt-1">בדיקה פיזית של מנה ספציפית</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskType('RECIPE_REVIEW')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      taskType === 'RECIPE_REVIEW'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">📖</div>
                    <div className="font-medium">עבור על מתכון</div>
                    <div className="text-xs text-gray-500 mt-1">עיון ורענון ידע במתכון</div>
                  </button>
                </div>
              </div>

              {/* Dish Selection (if DISH_CHECK) */}
              {taskType === 'DISH_CHECK' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    בחר מנה <span className="text-red-500">*</span>
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
                    {dishes.map((dish) => (
                      <button
                        key={dish.id}
                        type="button"
                        onClick={() => setSelectedDish(dish.id)}
                        className={`w-full text-right px-3 py-2 rounded transition-all ${
                          selectedDish === dish.id
                            ? 'bg-primary-500 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {dish.name} {dish.category && `(${dish.category})`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תיאור המשימה (אופציונלי)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="הוסף הוראות או הערות נוספות..."
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תדירות <span className="text-red-500">*</span>
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as TaskFrequency)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ONCE">חד פעמי</option>
                  <option value="DAILY">יומי</option>
                  <option value="WEEKLY">שבועי</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תאריך התחלה <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  סניפים <span className="text-red-500">*</span>
                </label>

                {/* Mode Selection */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectAllBranchesMode(true);
                      setSelectedBranches([]);
                    }}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      selectAllBranchesMode
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">כל הסניפים</div>
                    <div className="text-xs text-gray-500 mt-1">שלח לכל הסניפים</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('🔵 Clicked סניפים ספציפיים, setting to false');
                      setSelectAllBranchesMode(false);
                    }}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      !selectAllBranchesMode
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">סניפים ספציפיים</div>
                    <div className="text-xs text-gray-500 mt-1">בחר סניף אחד או יותר</div>
                  </button>
                </div>

                {/* Specific Branch Selection */}
                {!selectAllBranchesMode && (
                  <div className="mt-4 border-2 border-green-500 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">בחר סניפים:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllBranches}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          בחר הכל
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={clearBranches}
                          className="text-sm text-gray-600 hover:text-gray-700"
                        >
                          נקה הכל
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {branches.map((branch) => (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => toggleBranch(branch.id)}
                          className={`p-3 border-2 rounded-lg text-right transition-all ${
                            selectedBranches.includes(branch.id)
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{branch.name}</span>
                            {selectedBranches.includes(branch.id) && (
                              <CheckCircle className="h-5 w-5 text-primary-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      נבחרו {selectedBranches.length} מתוך {branches.length} סניפים
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
                >
                  {loading ? 'שולח...' : 'צור משימה'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Manage Tasks Tab */}
        {activeTab === 'manage' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">משימות פעילות</h2>

            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>אין משימות פעילות כרגע</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                >
                  צור משימה ראשונה
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className={`px-2 py-1 rounded-full ${
                            task.task_type === 'DISH_CHECK'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {task.task_type === 'DISH_CHECK' ? '🍽️ בדיקת מנה' : '📖 מתכון'}
                          </span>
                          {task.dish_name && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                              {task.dish_name}
                            </span>
                          )}
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            {task.frequency === 'ONCE' ? 'חד פעמי' : task.frequency === 'DAILY' ? 'יומי' : 'שבועי'}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                            מ-{new Date(task.start_date).toLocaleDateString('he-IL')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Track Completion Tab */}
        {activeTab === 'track' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-1">סה"כ משימות היום</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-1">הושלמו</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-1">אחוז השלמה</p>
                <p className="text-3xl font-bold text-primary-600">{stats.percentage}%</p>
              </div>
            </div>

            {/* Assignments List */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">מעקב השלמה - {new Date().toLocaleDateString('he-IL')}</h2>

              {assignments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>אין משימות להיום</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        assignment.is_completed
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {assignment.is_completed ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-400" />
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900">{assignment.task_title}</h4>
                          <p className="text-sm text-gray-600">{assignment.branch_name}</p>
                        </div>
                      </div>
                      {assignment.is_completed && assignment.completed_at && (
                        <div className="text-left">
                          <p className="text-xs text-gray-500">הושלם ב-</p>
                          <p className="text-sm text-gray-700">
                            {new Date(assignment.completed_at).toLocaleTimeString('he-IL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Tasks;
