// app/src/library/financial-toolkit/types/phase3-types.ts
/**
 * Phase 3 Calculator Types - Weekly Review, Action Plans
 * Production-ready TypeScript definitions
 */

import type { Currency, ValidationResult, ValidationError } from './index';

// ═══════════════════════════════════════════════════════════════════
// WEEKLY REVIEW TYPES
// ═══════════════════════════════════════════════════════════════════

export interface WeeklyReviewInput {
  companyId: string;
  currency?: Currency; // Optional, defaults to 'KES'
  weekNumber: number; // 1-52
  year: number; // e.g., 2026
  weekStartDate: string; // ISO date (Monday)
  weekEndDate: string; // ISO date (Sunday)
  
  // Financial targets for the week
  targets: {
    revenue?: number;
    cashIn?: number;
    cashOut?: number;
    collections?: number;
    newCustomers?: number;
  };
  
  // Actual results
  actuals: {
    revenue?: number;
    cashIn?: number;
    cashOut?: number;
    collections?: number;
    newCustomers?: number;
  };
  
  // Qualitative notes
  wins?: string[];
  challenges?: string[];
  notes?: string;
}

export interface WeeklyReview {
  id: string;
  companyId: string;
  weekNumber: number;
  year: number;
  weekStartDate: string;
  weekEndDate: string;
  currency: Currency;
  
  // Targets and actuals
  targets: WeeklyMetrics;
  actuals: WeeklyMetrics;
  
  // Variance analysis
  variances: WeeklyVariance;
  
  // Performance summary
  performance: {
    metricsOnTrack: number;
    totalMetrics: number;
    percentOnTrack: number;
    overallStatus: 'excellent' | 'good' | 'needs-attention' | 'poor';
  };
  
  // Insights
  insights: string[];
  
  // Qualitative
  wins: string[];
  challenges: string[];
  notes?: string;
  
  // Trend (requires prior weeks)
  trend?: 'improving' | 'stable' | 'declining';
  
  createdAt: number;
  updatedAt: number;
}

export interface WeeklyMetrics {
  revenue?: number;
  cashIn?: number;
  cashOut?: number;
  collections?: number;
  newCustomers?: number;
}

export interface WeeklyVariance {
  revenue?: VarianceMetric;
  cashIn?: VarianceMetric;
  cashOut?: VarianceMetric;
  collections?: VarianceMetric;
  newCustomers?: VarianceMetric;
}

export interface VarianceMetric {
  target: number;
  actual: number;
  variance: number; // actual - target
  variancePercent: number;
  status: 'on-track' | 'slight-miss' | 'significant-miss';
  isFavorable: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// ACTION PLAN TYPES
// ═══════════════════════════════════════════════════════════════════

export interface ActionPlanInput {
  companyId: string;
  currency?: Currency; // Optional, defaults to 'KES'
  planName: string;
  startDate: string; // ISO date
  endDate: string; // ISO date (typically 90 days from start)
  
  // Action items
  actions: ActionItem[];
}

export interface ActionItem {
  title: string;
  description?: string;
  category: 'cash' | 'revenue' | 'cost' | 'operations' | 'strategic';
  priority: 'critical' | 'high' | 'medium' | 'low';
  owner?: string;
  dueDate?: string; // ISO date
  estimatedImpact?: number; // Dollar amount
  status: 'not-started' | 'in-progress' | 'blocked' | 'completed' | 'cancelled';
  completedDate?: string;
  notes?: string;
}

export interface ActionPlan {
  id: string;
  companyId: string;
  planName: string;
  startDate: string;
  endDate: string;
  currency: Currency;
  
  // Actions organized by category
  actionsByCategory: {
    [category: string]: ActionItemSummary[];
  };
  
  // Actions organized by priority
  actionsByPriority: {
    [priority: string]: ActionItemSummary[];
  };
  
  // Overall progress
  progress: {
    totalActions: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    blocked: number;
    cancelled: number;
    percentComplete: number;
  };
  
  // Impact tracking
  impact: {
    totalEstimatedImpact: number;
    realizedImpact: number; // From completed actions
    potentialImpact: number; // From in-progress + not-started
  };
  
  // Timeline
  timeline: {
    daysRemaining: number;
    daysElapsed: number;
    totalDays: number;
    percentTimeElapsed: number;
  };
  
  // Critical actions (overdue or high priority)
  criticalActions: ActionItemSummary[];
  
  // Recommendations
  recommendations: string[];
  
  createdAt: number;
  updatedAt: number;
}

export interface ActionItemSummary extends ActionItem {
  daysUntilDue?: number;
  isOverdue: boolean;
  urgency: 'immediate' | 'soon' | 'future';
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export type {
  WeeklyReviewInput,
  WeeklyReview,
  WeeklyMetrics,
  WeeklyVariance,
  VarianceMetric,
  ActionPlanInput,
  ActionPlan,
  ActionItem,
  ActionItemSummary,
};
