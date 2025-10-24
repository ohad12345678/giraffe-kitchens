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

// Manager Evaluation types
export type EvaluationStatus = 'draft' | 'in_progress' | 'completed' | 'reviewed' | 'approved';
export type PerformanceLevel = 'outstanding' | 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement' | 'does_not_meet';

export interface DevelopmentGoal {
  goal: string;
  measurable: string;
  actions: string[];
  support_needed: string;
  deadline: string;
  milestone_date?: string;
}

export interface DetailedScores {
  operational: Record<string, number>;
  people: Record<string, number>;
  business: Record<string, number>;
  leadership: Record<string, number>;
}

export interface ManagerEvaluationSummary {
  id: number;
  branch_id: number;
  branch_name: string;
  manager_id: number;
  manager_name: string;
  evaluator_name: string;
  evaluation_date: string;
  evaluation_period_start: string;
  evaluation_period_end: string;
  total_score: number;
  performance_level: PerformanceLevel | null;
  status: EvaluationStatus;
  created_at: string;
}

export interface ManagerEvaluation {
  id: number;
  branch_id: number;
  manager_id: number;
  evaluator_id: number;
  evaluation_period_start: string;
  evaluation_period_end: string;
  evaluation_date: string;
  manager_name: string;
  evaluator_name: string;
  evaluator_role: string;

  total_score: number;
  performance_level: PerformanceLevel | null;

  operational_management_score: number | null;
  people_management_score: number | null;
  business_performance_score: number | null;
  leadership_score: number | null;

  detailed_scores: DetailedScores | null;
  network_average_comparison: Record<string, any> | null;

  executive_summary: string | null;
  strengths_summary: string | null;
  improvement_areas_summary: string | null;

  development_goals: DevelopmentGoal[] | null;
  required_training: string[] | null;

  promotion_potential: 'ready_now' | '1_year' | '2_years' | 'not_ready' | null;
  management_notes: string | null;

  next_period_goals: Record<string, any> | null;

  ai_analysis: string | null;
  ai_analysis_generated_at: string | null;

  status: EvaluationStatus;

  manager_acknowledged: boolean;
  manager_acknowledged_at: string | null;
  manager_comments: string | null;

  approved_by_id: number | null;
  approved_at: string | null;

  created_at: string;
  updated_at: string;

  categories?: EvaluationCategory[];
}

export interface EvaluationCategory {
  id: number;
  evaluation_id: number;
  category_name: string;
  category_key: string;
  subcategory_name: string | null;
  subcategory_key: string | null;
  score: number;
  weight: number;
  specific_achievements: string | null;
  improvement_areas: string | null;
  metrics: Record<string, any> | null;
  action_items: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateManagerEvaluationFormData {
  manager_id: number;
  manager_name: string;
  branch_id: number;
  evaluation_period_start: string;
  evaluation_period_end: string;

  // Operational Management (35%)
  sanitation_safety_score: number;
  sanitation_notes?: string;
  inventory_costs_score: number;
  waste_percentage?: number;
  inventory_notes?: string;
  product_quality_score: number;
  mystery_shopper_score?: number;
  quality_notes?: string;
  maintenance_score: number;
  maintenance_notes?: string;

  // People Management (30%)
  recruitment_training_score: number;
  recruitment_notes?: string;
  scheduling_score: number;
  scheduling_notes?: string;
  retention_climate_score: number;
  turnover_rate?: number;
  retention_notes?: string;

  // Business Performance (25%)
  sales_profitability_score: number;
  sales_growth?: number;
  sales_notes?: string;
  operational_efficiency_score: number;
  labor_cost_percentage?: number;
  efficiency_notes?: string;

  // Leadership (10%)
  initiative_score: number;
  problem_solving_score: number;
  communication_score: number;
  development_score: number;
  values_alignment_score: number;
  leadership_notes?: string;

  // Overall assessment
  strengths_summary?: string;
  improvement_areas_summary?: string;
  development_goals?: DevelopmentGoal[];

  // Management recommendations
  promotion_potential?: 'ready_now' | '1_year' | '2_years' | 'not_ready';
  management_notes?: string;
}
