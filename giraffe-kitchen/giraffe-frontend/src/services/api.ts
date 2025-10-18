import axios from 'axios';
import type {
  LoginCredentials,
  AuthResponse,
  User,
  Branch,
  Dish,
  Chef,
  DishCheck,
  DishCheckWithDetails
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  console.log('🔑 API Request to:', config.url, '- Token:', token ? 'EXISTS' : 'MISSING');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔑 Authorization header set');
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/v1/auth/login', credentials);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/api/v1/auth/me');
    return response.data;
  },
};

// Branch endpoints
export const branchAPI = {
  list: async (): Promise<Branch[]> => {
    const response = await api.get<Branch[]>('/api/v1/branches/');
    return response.data;
  },

  get: async (id: number): Promise<Branch> => {
    const response = await api.get<Branch>(`/api/v1/branches/${id}`);
    return response.data;
  },
};

// Dish endpoints
export const dishAPI = {
  list: async (): Promise<Dish[]> => {
    const response = await api.get<Dish[]>('/api/v1/dishes');
    return response.data;
  },

  get: async (id: number): Promise<Dish> => {
    const response = await api.get<Dish>(`/api/v1/dishes/${id}`);
    return response.data;
  },
};

// Chef endpoints
export const chefAPI = {
  list: async (branchId?: number): Promise<Chef[]> => {
    const params = branchId ? { branch_id: branchId } : {};
    const response = await api.get<Chef[]>('/api/v1/chefs', { params });
    return response.data;
  },
};

// Dish check endpoints
export const checkAPI = {
  list: async (filters?: {
    branch_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<DishCheckWithDetails[]> => {
    const response = await api.get<DishCheckWithDetails[]>('/api/v1/checks', {
      params: filters,
    });
    return response.data;
  },

  create: async (data: Partial<DishCheck>): Promise<DishCheck> => {
    const response = await api.post<DishCheck>('/api/v1/checks', data);
    return response.data;
  },

  get: async (id: number): Promise<DishCheckWithDetails> => {
    const response = await api.get<DishCheckWithDetails>(`/api/v1/checks/${id}`);
    return response.data;
  },

  getWeakestDish: async (): Promise<{
    dish_id?: number;
    dish_name: string | null;
    avg_score: number | null;
    check_count: number;
    message?: string;
  }> => {
    const response = await api.get('/api/v1/checks/weakest-dish');
    return response.data;
  },

  getAnalytics: async (filters?: {
    start_date?: string;
    end_date?: string;
    branch_id?: number;
    dish_id?: number;
  }): Promise<{
    kpis: {
      total_checks: number;
      average_rating: number;
      weak_dishes: number;
      top_chef: string | null;
      top_chef_rating: number | null;
    };
    dish_ratings: Array<{
      dish_id: number;
      name: string;
      category: string | null;
      rating: number;
      check_count: number;
      trend: string;
    }>;
    chef_performance: Array<{
      chef_id: number;
      name: string;
      branch: string;
      rating: number;
      checks_count: number;
    }>;
    daily_trend: Array<{
      date: string;
      checks: number;
      avg_rating: number;
    }>;
  }> => {
    const response = await api.get('/api/v1/checks/analytics', { params: filters });
    return response.data;
  },
};

// AI endpoints
export const aiAPI = {
  ask: async (question: string, branchId?: number): Promise<{ answer: string; context_used: any }> => {
    const response = await api.post('/api/v1/ai/ask', {
      question,
      branch_id: branchId,
      date_range: 'week'
    });
    return response.data;
  },
};

// Daily Tasks endpoints
export const tasksAPI = {
  // HQ: Create task
  create: async (data: import('../types').CreateTaskData): Promise<import('../types').DailyTask> => {
    const response = await api.post<import('../types').DailyTask>('/api/v1/tasks/', data);
    return response.data;
  },

  // HQ: List all tasks
  list: async (isActive?: boolean): Promise<import('../types').DailyTask[]> => {
    const response = await api.get<import('../types').DailyTask[]>('/api/v1/tasks/', {
      params: isActive !== undefined ? { is_active: isActive } : undefined,
    });
    return response.data;
  },

  // HQ: List all assignments (for tracking completion)
  listAssignments: async (filters?: {
    task_date?: string;
    branch_id?: number;
    is_completed?: boolean;
  }): Promise<import('../types').TaskAssignment[]> => {
    const response = await api.get<import('../types').TaskAssignment[]>('/api/v1/tasks/assignments', {
      params: filters,
    });
    return response.data;
  },

  // Branch Manager: Get my tasks for today
  getMyTasks: async (taskDate?: string): Promise<import('../types').TaskAssignment[]> => {
    const response = await api.get<import('../types').TaskAssignment[]>('/api/v1/tasks/my-tasks', {
      params: taskDate ? { task_date: taskDate } : undefined,
    });
    return response.data;
  },

  // Complete a task
  completeTask: async (assignmentId: number, notes?: string, checkId?: number): Promise<{ status: string; message: string }> => {
    const response = await api.post(`/api/v1/tasks/assignments/${assignmentId}/complete`, {
      notes,
      check_id: checkId,
    });
    return response.data;
  },

  // Uncomplete a task
  uncompleteTask: async (assignmentId: number): Promise<{ status: string; message: string }> => {
    const response = await api.delete(`/api/v1/tasks/assignments/${assignmentId}/complete`);
    return response.data;
  },
};

export default api;
