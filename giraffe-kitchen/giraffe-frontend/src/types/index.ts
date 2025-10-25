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
  dish_id: number | null;
  dish_name_manual: string | null;
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

// Sanitation Audits
export type AuditStatus = 'in_progress' | 'completed' | 'reviewed';

export interface SanitationAuditCategory {
  id?: number;
  category_name: string;
  category_key: string;
  status: string;
  notes: string | null;
  score_deduction: number;
  check_performed: boolean | null;
  check_name: string | null;
  image_urls: string[];
}

export interface SanitationAudit {
  id: number;
  branch_id: number;
  auditor_id: number;
  audit_date: string;
  start_time: string;
  end_time: string | null;
  auditor_name: string;
  accompanist_name: string | null;
  total_score: number;
  total_deductions: number;
  status: AuditStatus;
  general_notes: string | null;
  equipment_issues: string | null;
  deficiencies_summary: string | null;
  signature_url: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  categories: SanitationAuditCategory[];
}

export interface SanitationAuditSummary {
  id: number;
  branch_id: number;
  branch_name: string;
  audit_date: string;
  auditor_name: string;
  total_score: number;
  total_deductions: number;
  status: AuditStatus;
  created_at: string;
}

export interface CreateSanitationAudit {
  branch_id: number;
  audit_date: string;
  start_time: string;
  auditor_name: string;
  accompanist_name: string | null;
  general_notes: string | null;
  equipment_issues: string | null;
  categories: Omit<SanitationAuditCategory, 'id'>[];
}

export interface SanitationAuditCategoryUpdate {
  status?: string;
  notes?: string;
  score_deduction?: number;
  check_performed?: boolean | null;
  check_name?: string;
  image_urls?: string[];
}

export interface BranchAuditStats {
  branch_id: number;
  branch_name: string;
  total_audits: number;
  average_score: number;
  latest_score: number | null;
  score_trend: 'improving' | 'declining' | 'stable' | 'insufficient_data' | 'no_data';
  common_issues: string[];
}

export interface NetworkAuditStats {
  total_audits: number;
  network_average_score: number;
  best_performing_branch: BranchAuditStats | null;
  worst_performing_branch: BranchAuditStats | null;
  branch_stats: BranchAuditStats[];
  common_issues_network: string[];
}

// Manager Evaluations
export interface ManagerEvaluationCategory {
  id?: number;
  category_name: string;
  rating: number;
  comments: string | null;
}

export interface ManagerEvaluation {
  id: number;
  branch_id: number;
  created_by: number;
  manager_name: string;
  evaluation_date: string;
  overall_rating: number | null;
  general_comments: string | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string | null;
  categories: ManagerEvaluationCategory[];
}

export interface ManagerEvaluationSummary {
  id: number;
  branch_id: number;
  branch_name: string;
  manager_name: string;
  evaluation_date: string;
  overall_rating: number | null;
  created_by_name: string;
  created_at: string;
}

export interface CreateManagerEvaluation {
  branch_id: number;
  manager_name: string;
  evaluation_date: string;
  overall_rating: number | null;
  general_comments: string | null;
  categories: Omit<ManagerEvaluationCategory, 'id'>[];
}
