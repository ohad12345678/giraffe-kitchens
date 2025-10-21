/**
 * Manager Review API Service
 * Separate API service for manager performance reviews
 */

import axios from 'axios';
import type {
  ManagerReview,
  DetailedReview,
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewStatus,
  ReviewQuarter,
} from '../types/managerReview';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with auth
const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const managerReviewAPI = {
  /**
   * Create a new manager review
   */
  createReview: async (data: CreateReviewRequest): Promise<ManagerReview> => {
    const response = await api.post('/api/v1/manager-reviews/', data);
    return response.data;
  },

  /**
   * List all reviews with optional filters
   */
  listReviews: async (params?: {
    branch_id?: number;
    manager_id?: number;
    year?: number;
    quarter?: ReviewQuarter;
    status?: ReviewStatus;
  }): Promise<ManagerReview[]> => {
    const response = await api.get('/api/v1/manager-reviews/', { params });
    return response.data;
  },

  /**
   * Get detailed review by ID
   */
  getReview: async (reviewId: number): Promise<DetailedReview> => {
    const response = await api.get(`/api/v1/manager-reviews/${reviewId}`);
    return response.data;
  },

  /**
   * Update review scores and comments
   */
  updateReview: async (
    reviewId: number,
    data: UpdateReviewRequest
  ): Promise<{ message: string; overall_score: number }> => {
    const response = await api.put(`/api/v1/manager-reviews/${reviewId}`, data);
    return response.data;
  },

  /**
   * Submit review (change status to SUBMITTED)
   */
  submitReview: async (reviewId: number): Promise<{ message: string }> => {
    const response = await api.post(`/api/v1/manager-reviews/${reviewId}/submit`);
    return response.data;
  },

  /**
   * Complete review (change status to COMPLETED)
   */
  completeReview: async (reviewId: number): Promise<{ message: string }> => {
    const response = await api.post(`/api/v1/manager-reviews/${reviewId}/complete`);
    return response.data;
  },

  /**
   * Delete review (only drafts)
   */
  deleteReview: async (reviewId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/v1/manager-reviews/${reviewId}`);
    return response.data;
  },

  /**
   * Chat with AI about a specific review
   */
  chatWithAI: async (reviewId: number, messages: Array<{ role: string; content: string }>) => {
    const response = await api.post('/api/v1/ai/chat', {
      context_type: 'manager_review',
      context_id: reviewId,
      messages,
    });
    return response.data;
  },

  /**
   * Get review history for a manager (for trend charts)
   */
  getManagerHistory: async (managerId: number) => {
    const response = await api.get(`/api/v1/manager-reviews/manager/${managerId}/history`);
    return response.data;
  },

  /**
   * Get notifications for pending and missing reviews
   */
  getNotifications: async () => {
    const response = await api.get('/api/v1/manager-reviews/notifications');
    return response.data;
  },
};

export default managerReviewAPI;
