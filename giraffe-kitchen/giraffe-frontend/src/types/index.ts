export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'hq' | 'branch_manager';
  branch_id: number | null;
  created_at: string;
}

export interface Branch {
  id: number;
  name: string;
  location: string | null;
  created_at: string;
}

export interface Dish {
  id: number;
  name: string;
  category: string | null;
  created_at: string;
}

export interface Chef {
  id: number;
  name: string;
  branch_id: number;
  created_at: string;
}

export interface DishCheck {
  id: number;
  branch_id: number;
  dish_id: number;
  chef_id: number | null;
  chef_name_manual: string | null;
  rating: number;
  comments: string | null;
  created_by: number;
  check_date: string;
  created_at: string;
}

export interface DishCheckWithDetails extends DishCheck {
  branch_name: string | null;
  dish_name: string | null;
  chef_name: string | null;
  created_by_name: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// Daily Tasks
export type TaskType = 'DISH_CHECK' | 'RECIPE_REVIEW';
export type TaskFrequency = 'ONCE' | 'DAILY' | 'WEEKLY';

export interface DailyTask {
  id: number;
  title: string;
  description: string | null;
  task_type: TaskType;
  dish_id: number | null;
  dish_name: string | null;
  frequency: TaskFrequency;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  task_title: string;
  task_description: string | null;
  task_type: TaskType;
  dish_name: string | null;
  branch_id: number;
  branch_name: string;
  task_date: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
}

export interface CreateTaskData {
  title: string;
  description: string;
  task_type: TaskType;
  dish_id: number | null;
  frequency: TaskFrequency;
  start_date: string;
  end_date: string | null;
  branch_ids: number[];
}
