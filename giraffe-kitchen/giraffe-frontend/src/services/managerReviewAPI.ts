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

// Get API URL dynamically at runtime - purely runtime detection, no env vars
const getAPIURL = (): string => {
  // Runtime detection ONLY - check hostname
  const hostname = window.location.hostname;

  // ONLY localhost uses explicit port 8000
  // Everything else (including Railway) uses relative URLs
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('💻 [Manager Reviews] Local development - using localhost:8000');
    return 'http://localhost:8000';
  }

  // All production environments use relative URLs
  console.log('🌐 [Manager Reviews] Production environment detected - using relative URLs');
  console.log('Hostname:', hostname);
  return '';
};

// Create axios instance without baseURL - we'll set it dynamically
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to set baseURL dynamically and add auth token
api.interceptors.request.use((config) => {
  // Set baseURL dynamically at runtime
  const baseURL = getAPIURL();
  config.baseURL = baseURL;

  // Add auth token (use 'access_token' to match main api.ts)
  const token = localStorage.getItem('access_token');
  console.log('🔑 [Manager Reviews] API Request to:', baseURL + config.url, '- Token:', token ? 'EXISTS' : 'MISSING');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔑 [Manager Reviews] Authorization header set');
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
   * Generate AI summary for review
   */
  generateAISummary: async (reviewId: number): Promise<{ summary: string; message: string }> => {
    const response = await api.post(`/api/v1/manager-reviews/${reviewId}/generate-summary`);
    return response.data;
  },

  /**
   * Chat with AI about a specific review
   */
  chatWithAI: async (reviewId: number, messages: Array<{ role: string; content: string }>) => {
    const response = await api.post(`/api/v1/manager-reviews/${reviewId}/ai-chat`, {
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

// Additional APIs for manager reviews page
export const userAPI = {
  /**
   * Get all managers (users with role BRANCH_MANAGER)
   */
  getManagers: async () => {
    const response = await api.get('/api/v1/auth/managers');
    return response.data;
  },
};

export const branchAPI = {
  /**
   * Get all branches
   */
  getBranches: async () => {
    const response = await api.get('/api/v1/branches/');
    return response.data;
  },
};

export default managerReviewAPI;
