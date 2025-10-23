import axios from 'axios';
import type {
  LoginCredentials,
  AuthResponse,
  User,
  Branch,
  Dish,
  Chef,
  DishCheck,
  DishCheckWithDetails,
  SanitationAudit,
  SanitationAuditSummary,
  CreateSanitationAudit,
  SanitationAuditCategoryUpdate,
  NetworkAuditStats,
  BranchAuditStats
} from '../types';

// Use relative URL in production (when VITE_API_URL is empty string)
// Use localhost in development (when VITE_API_URL is undefined)
const API_URL = import.meta.env.VITE_API_URL === undefined
  ? 'http://localhost:8000'  // Development
  : import.meta.env.VITE_API_URL;  // Production (can be empty string for relative URLs)

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
    const response = await api.get<Dish[]>('/api/v1/dishes/');
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
    const response = await api.get<Chef[]>('/api/v1/chefs/', { params });
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
    const response = await api.get<DishCheckWithDetails[]>('/api/v1/checks/', {
      params: filters,
    });
    return response.data;
  },

  create: async (data: Partial<DishCheck>): Promise<DishCheck> => {
    const response = await api.post<DishCheck>('/api/v1/checks/', data);
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

  delete: async (checkId: number): Promise<{ status: string; message: string }> => {
    const response = await api.delete(`/api/v1/checks/${checkId}`);
    return response.data;
  },

  getWeeklyComparison: async (): Promise<{
    this_week: number;
    last_week: number;
    change: number;
    change_percentage: number;
  }> => {
    const response = await api.get('/api/v1/checks/weekly-comparison');
    return response.data;
  },

  getBestWorstDishes: async (): Promise<{
    best_dish: {
      dish_id: number | null;
      name: string | null;
      avg_score: number | null;
      check_count: number;
    } | null;
    worst_dish: {
      dish_id: number | null;
      name: string | null;
      avg_score: number | null;
      check_count: number;
    } | null;
    message?: string;
  }> => {
    const response = await api.get('/api/v1/checks/best-worst-dishes');
    return response.data;
  },

  bulkDelete: async (filters?: {
    start_date?: string;
    end_date?: string;
    branch_id?: number;
    delete_all?: boolean;
  }): Promise<{ status: string; message: string; deleted_count: number }> => {
    const response = await api.delete('/api/v1/checks/bulk/delete', { params: filters });
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
  askSanitation: async (params: { question: string; date_range?: string; branch_id?: number }): Promise<{ answer: string; context_used: any }> => {
    const response = await api.post('/api/v1/ai/ask-sanitation', params);
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

// Sanitation Audit endpoints
export const sanitationAuditAPI = {
  // List all audits (HQ sees all, branch managers see only their branch)
  list: async (filters?: {
    branch_id?: number;
    skip?: number;
    limit?: number;
  }): Promise<SanitationAuditSummary[]> => {
    const response = await api.get<SanitationAuditSummary[]>('/api/v1/sanitation-audits/', {
      params: filters,
    });
    return response.data;
  },

  // Get specific audit by ID
  get: async (id: number): Promise<SanitationAudit> => {
    const response = await api.get<SanitationAudit>(`/api/v1/sanitation-audits/${id}`);
    return response.data;
  },

  // Create new audit (HQ only)
  create: async (data: CreateSanitationAudit): Promise<SanitationAudit> => {
    const response = await api.post<SanitationAudit>('/api/v1/sanitation-audits/', data);
    return response.data;
  },

  // Update audit (HQ only)
  update: async (id: number, data: {
    end_time?: string;
    accompanist_name?: string;
    general_notes?: string;
    equipment_issues?: string;
    deficiencies_summary?: string;
    status?: 'in_progress' | 'completed' | 'reviewed';
    signature_url?: string;
  }): Promise<SanitationAudit> => {
    const response = await api.put<SanitationAudit>(`/api/v1/sanitation-audits/${id}`, data);
    return response.data;
  },

  // Generate AI summary
  generateSummary: async (id: number): Promise<{
    summary: string;
    current_score: number;
    previous_scores: number[];
  }> => {
    const response = await api.post(`/api/v1/sanitation-audits/${id}/generate-summary`);
    return response.data;
  },

  // Update specific category (HQ only)
  updateCategory: async (
    auditId: number,
    categoryId: number,
    data: SanitationAuditCategoryUpdate
  ): Promise<SanitationAudit> => {
    const response = await api.put<SanitationAudit>(
      `/api/v1/sanitation-audits/${auditId}/categories/${categoryId}`,
      data
    );
    return response.data;
  },

  // Delete audit (HQ only)
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/sanitation-audits/${id}`);
  },

  // Get network-wide statistics (HQ only)
  getNetworkStats: async (): Promise<NetworkAuditStats> => {
    const response = await api.get<NetworkAuditStats>('/api/v1/sanitation-audits/stats/network');
    return response.data;
  },

  // Get branch statistics
  getBranchStats: async (branchId: number): Promise<BranchAuditStats> => {
    const response = await api.get<BranchAuditStats>(`/api/v1/sanitation-audits/stats/branch/${branchId}`);
    return response.data;
  },

  // Get branch rankings (best and worst performing branches this month)
  getBranchRankings: async (): Promise<{
    best_branch: {
      branch_id: number;
      name: string;
      avg_score: number;
      audit_count: number;
    } | null;
    worst_branch: {
      branch_id: number;
      name: string;
      avg_score: number;
      audit_count: number;
    } | null;
    message?: string;
  }> => {
    const response = await api.get('/api/v1/sanitation-audits/branch-rankings');
    return response.data;
  },
};

export default api;
