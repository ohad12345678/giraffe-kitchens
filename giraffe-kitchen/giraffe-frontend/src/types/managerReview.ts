/**
 * Manager Review Types
 * Separate type definitions for manager performance reviews
 */

export type ReviewStatus = 'draft' | 'submitted' | 'completed';
export type ReviewQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface ReviewScoreInput {
  score: number | null;
  comments: string | null;
}

export interface DevelopmentGoal {
  goal: string;
  actions: string[];
  timeline: string;
  support: string;
}

export interface ManagerReview {
  id: number;
  manager_id: number;
  manager_name: string;
  branch_id: number;
  branch_name: string;
  reviewer_id: number;
  reviewer_name: string;
  year: number;
  quarter: ReviewQuarter;
  review_date: string;
  status: ReviewStatus;

  // Scores
  operational_score: number | null;
  people_score: number | null;
  business_score: number | null;
  leadership_score: number | null;
  overall_score: number | null;

  // Auto data from system
  auto_sanitation_avg: number | null;
  auto_dish_checks_avg: number | null;
  auto_sanitation_count: number | null;
  auto_dish_checks_count: number | null;

  // AI
  ai_summary: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  completed_at: string | null;
}

export interface DetailedReview {
  id: number;
  manager: { id: number; name: string } | null;
  branch: { id: number; name: string } | null;
  reviewer: { id: number; name: string } | null;
  year: number;
  quarter: ReviewQuarter;
  review_date: string;
  status: ReviewStatus;

  // Operational (35%)
  operational: {
    score: number | null;
    sanitation: ReviewScoreInput;
    inventory: ReviewScoreInput;
    quality: ReviewScoreInput;
    maintenance: ReviewScoreInput;
  };

  // People (30%)
  people: {
    score: number | null;
    recruitment: ReviewScoreInput;
    scheduling: ReviewScoreInput;
    retention: ReviewScoreInput;
  };

  // Business (25%)
  business: {
    score: number | null;
    sales: ReviewScoreInput;
    efficiency: ReviewScoreInput;
  };

  // Leadership (10%)
  leadership: {
    score: number | null;
    comments: string | null;
  };

  overall_score: number | null;

  // Auto data
  auto_data: {
    sanitation_avg: number | null;
    sanitation_count: number | null;
    dish_checks_avg: number | null;
    dish_checks_count: number | null;
  };

  // IDP
  development_goals: DevelopmentGoal[] | null;
  next_review_targets: Record<string, any> | null;

  // AI
  ai_analysis: Record<string, any> | null;
  ai_summary: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  completed_at: string | null;
}

export interface CreateReviewRequest {
  manager_id: number;
  branch_id: number;
  year: number;
  quarter: ReviewQuarter;
}

export interface UpdateReviewRequest {
  sanitation?: ReviewScoreInput;
  inventory?: ReviewScoreInput;
  quality?: ReviewScoreInput;
  maintenance?: ReviewScoreInput;
  recruitment?: ReviewScoreInput;
  scheduling?: ReviewScoreInput;
  retention?: ReviewScoreInput;
  sales?: ReviewScoreInput;
  efficiency?: ReviewScoreInput;
  leadership?: ReviewScoreInput;
  development_goals?: DevelopmentGoal[];
  next_review_targets?: Record<string, any>;
}
