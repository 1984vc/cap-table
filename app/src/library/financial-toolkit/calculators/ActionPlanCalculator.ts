// app/src/library/financial-toolkit/calculators/ActionPlanCalculator.ts
/**
 * Action Plan Calculator - PRODUCTION VERSION
 * 90-day action plan tracking with prioritization and impact analysis
 * MIT Licensed
 */

import type {
  ActionPlan,
  ActionPlanInput,
  ActionItem,
  ActionItemSummary,
  ValidationResult,
  ValidationError
} from '../types/phase3-types';

export class ActionPlanCalculator {
  /**
   * Calculate action plan with progress tracking and prioritization
   */
  static calculate(input: ActionPlanInput): ActionPlan {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const today = new Date();

    // Enhance actions with calculated fields
    const enhancedActions: ActionItemSummary[] = input.actions.map(action => {
      let daysUntilDue: number | undefined;
      let isOverdue = false;
      let urgency: 'immediate' | 'soon' | 'future' = 'future';

      if (action.dueDate) {
        const due = new Date(action.dueDate);
        daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0 && action.status !== 'completed' && action.status !== 'cancelled') {
          isOverdue = true;
          urgency = 'immediate';
        } else if (daysUntilDue <= 7) {
          urgency = 'immediate';
        } else if (daysUntilDue <= 14) {
          urgency = 'soon';
        }
      }

      return {
        ...action,
        daysUntilDue,
        isOverdue,
        urgency
      };
    });

    // Organize by category
    const actionsByCategory = enhancedActions.reduce((acc, action) => {
      if (!acc[action.category]) {
        acc[action.category] = [];
      }
      acc[action.category].push(action);
      return acc;
    }, {} as Record<string, ActionItemSummary[]>);

    // Organize by priority
    const actionsByPriority = enhancedActions.reduce((acc, action) => {
      if (!acc[action.priority]) {
        acc[action.priority] = [];
      }
      acc[action.priority].push(action);
      return acc;
    }, {} as Record<string, ActionItemSummary[]>);

    // Calculate progress
    const statusCounts = enhancedActions.reduce((acc, action) => {
      acc[action.status] = (acc[action.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const progress = {
      totalActions: enhancedActions.length,
      completed: statusCounts['completed'] || 0,
      inProgress: statusCounts['in-progress'] || 0,
      notStarted: statusCounts['not-started'] || 0,
      blocked: statusCounts['blocked'] || 0,
      cancelled: statusCounts['cancelled'] || 0,
      percentComplete: enhancedActions.length > 0 
        ? ((statusCounts['completed'] || 0) / enhancedActions.length) * 100 
        : 0
    };

    // Calculate impact
    const totalEstimatedImpact = enhancedActions.reduce(
      (sum, action) => sum + (action.estimatedImpact || 0),
      0
    );

    const realizedImpact = enhancedActions
      .filter(action => action.status === 'completed')
      .reduce((sum, action) => sum + (action.estimatedImpact || 0), 0);

    const potentialImpact = enhancedActions
      .filter(action => action.status === 'in-progress' || action.status === 'not-started')
      .reduce((sum, action) => sum + (action.estimatedImpact || 0), 0);

    // Timeline analysis
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const percentTimeElapsed = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

    // Identify critical actions
    const criticalActions = enhancedActions
      .filter(action => 
        (action.isOverdue && action.status !== 'completed' && action.status !== 'cancelled') ||
        (action.priority === 'critical' && action.status !== 'completed') ||
        (action.urgency === 'immediate' && action.status !== 'completed')
      )
      .sort((a, b) => {
        // Sort by: overdue first, then by priority, then by urgency
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        
        const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      enhancedActions,
      progress,
      percentTimeElapsed,
      criticalActions
    );

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      planName: input.planName,
      startDate: input.startDate,
      endDate: input.endDate,
      currency: 'KES',
      
      actionsByCategory,
      actionsByPriority,
      progress,
      
      impact: {
        totalEstimatedImpact,
        realizedImpact,
        potentialImpact
      },
      
      timeline: {
        daysRemaining,
        daysElapsed,
        totalDays,
        percentTimeElapsed
      },
      
      criticalActions,
      recommendations,
      
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Generate actionable recommendations
   */
  private static generateRecommendations(
    actions: ActionItemSummary[],
    progress: ActionPlan['progress'],
    percentTimeElapsed: number,
    criticalActions: ActionItemSummary[]
  ): string[] {
    const recommendations: string[] = [];

    // Overall progress vs time
    if (progress.percentComplete < percentTimeElapsed - 20) {
      recommendations.push('🚨 CRITICAL: Significantly behind schedule - immediate action required');
      recommendations.push('   • Review and re-prioritize all actions');
      recommendations.push('   • Consider cancelling low-priority items');
      recommendations.push('   • Assign more resources to critical actions');
    } else if (progress.percentComplete < percentTimeElapsed - 10) {
      recommendations.push('⚠️ WARNING: Behind schedule - need to accelerate');
      recommendations.push('   • Focus on high-priority items only');
      recommendations.push('   • Review blockers and remove obstacles');
    } else if (progress.percentComplete > percentTimeElapsed + 20) {
      recommendations.push('✅ EXCELLENT: Ahead of schedule!');
      recommendations.push('   • Consider adding strategic initiatives');
      recommendations.push('   • Document what\'s working well');
    }

    // Critical actions
    if (criticalActions.length > 0) {
      recommendations.push(`\n🎯 ${criticalActions.length} Critical Actions Requiring Attention:`);
      criticalActions.slice(0, 5).forEach((action, index) => {
        const status = action.isOverdue ? '🚨 OVERDUE' : '⚠️ URGENT';
        recommendations.push(`   ${index + 1}. ${status}: ${action.title}`);
        if (action.owner) {
          recommendations.push(`      Owner: ${action.owner}`);
        }
        if (action.daysUntilDue !== undefined) {
          recommendations.push(`      Due: ${action.isOverdue ? `${Math.abs(action.daysUntilDue)} days ago` : `in ${action.daysUntilDue} days`}`);
        }
      });
    }

    // Blocked actions
    const blockedActions = actions.filter(a => a.status === 'blocked');
    if (blockedActions.length > 0) {
      recommendations.push(`\n⛔ ${blockedActions.length} Blocked Actions:`);
      blockedActions.slice(0, 3).forEach(action => {
        recommendations.push(`   • ${action.title}`);
        recommendations.push(`     Action: Identify and remove blocker immediately`);
      });
    }

    // Not started critical items
    const notStartedCritical = actions.filter(
      a => a.status === 'not-started' && a.priority === 'critical'
    );
    if (notStartedCritical.length > 0) {
      recommendations.push(`\n⚡ ${notStartedCritical.length} Critical Actions Not Yet Started:`);
      notStartedCritical.forEach(action => {
        recommendations.push(`   • ${action.title}`);
      });
    }

    // Impact analysis
    const { realizedImpact, potentialImpact, totalEstimatedImpact } = this.calculateImpact(actions);
    if (totalEstimatedImpact > 0) {
      const percentRealized = (realizedImpact / totalEstimatedImpact) * 100;
      recommendations.push(`\n💰 Impact Tracking:`);
      recommendations.push(`   Realized: ${realizedImpact.toLocaleString()} (${percentRealized.toFixed(0)}% of total)`);
      recommendations.push(`   Potential: ${potentialImpact.toLocaleString()} remaining`);
    }

    return recommendations;
  }

  /**
   * Calculate impact from actions
   */
  private static calculateImpact(actions: ActionItemSummary[]): {
    totalEstimatedImpact: number;
    realizedImpact: number;
    potentialImpact: number;
  } {
    const totalEstimatedImpact = actions.reduce(
      (sum, action) => sum + (action.estimatedImpact || 0),
      0
    );

    const realizedImpact = actions
      .filter(action => action.status === 'completed')
      .reduce((sum, action) => sum + (action.estimatedImpact || 0), 0);

    const potentialImpact = actions
      .filter(action => action.status === 'in-progress' || action.status === 'not-started')
      .reduce((sum, action) => sum + (action.estimatedImpact || 0), 0);

    return {
      totalEstimatedImpact,
      realizedImpact,
      potentialImpact
    };
  }

  /**
   * Validate action plan input
   */
  static validate(input: ActionPlanInput): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input.companyId) {
      errors.push({ field: 'companyId', message: 'Company ID is required', code: 'REQUIRED' });
    }

    if (!input.planName?.trim()) {
      errors.push({ field: 'planName', message: 'Plan name is required', code: 'REQUIRED' });
    }

    if (!input.startDate) {
      errors.push({ field: 'startDate', message: 'Start date is required', code: 'REQUIRED' });
    }

    if (!input.endDate) {
      errors.push({ field: 'endDate', message: 'End date is required', code: 'REQUIRED' });
    }

    if (!Array.isArray(input.actions) || input.actions.length === 0) {
      errors.push({ 
        field: 'actions', 
        message: 'At least one action is required', 
        code: 'REQUIRED' 
      });
      return { valid: false, errors };
    }

    // Validate each action
    input.actions.forEach((action, index) => {
      if (!action.title?.trim()) {
        errors.push({ 
          field: `actions[${index}].title`, 
          message: `Action ${index + 1}: Title is required`, 
          code: 'REQUIRED' 
        });
      }

      if (!action.category) {
        errors.push({ 
          field: `actions[${index}].category`, 
          message: `Action ${index + 1}: Category is required`, 
          code: 'REQUIRED' 
        });
      }

      if (!action.priority) {
        errors.push({ 
          field: `actions[${index}].priority`, 
          message: `Action ${index + 1}: Priority is required`, 
          code: 'REQUIRED' 
        });
      }

      if (!action.status) {
        errors.push({ 
          field: `actions[${index}].status`, 
          message: `Action ${index + 1}: Status is required`, 
          code: 'REQUIRED' 
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get summary insights
   */
  static getInsights(plan: ActionPlan): string[] {
    const insights: string[] = [];

    insights.push(`📋 ${plan.planName}`);
    insights.push(`Timeline: ${plan.timeline.daysRemaining} days remaining (${plan.timeline.percentTimeElapsed.toFixed(0)}% elapsed)`);
    insights.push(`Progress: ${plan.progress.completed}/${plan.progress.totalActions} actions completed (${plan.progress.percentComplete.toFixed(0)}%)`);

    // Progress status
    if (plan.progress.percentComplete > plan.timeline.percentTimeElapsed + 10) {
      insights.push(`✅ Ahead of schedule by ${(plan.progress.percentComplete - plan.timeline.percentTimeElapsed).toFixed(0)}%`);
    } else if (plan.progress.percentComplete < plan.timeline.percentTimeElapsed - 10) {
      insights.push(`🚨 Behind schedule by ${(plan.timeline.percentTimeElapsed - plan.progress.percentComplete).toFixed(0)}%`);
    } else {
      insights.push(`✅ On track`);
    }

    // By category
    insights.push(`\n📊 By Category:`);
    Object.entries(plan.actionsByCategory).forEach(([category, actions]) => {
      const completed = actions.filter(a => a.status === 'completed').length;
      insights.push(`   ${category}: ${completed}/${actions.length} complete`);
    });

    // Critical actions
    if (plan.criticalActions.length > 0) {
      insights.push(`\n🎯 ${plan.criticalActions.length} Critical Actions Requiring Attention`);
    }

    // Impact
    if (plan.impact.totalEstimatedImpact > 0) {
      insights.push(`\n💰 Financial Impact:`);
      insights.push(`   Realized: ${plan.impact.realizedImpact.toLocaleString()}`);
      insights.push(`   Potential: ${plan.impact.potentialImpact.toLocaleString()}`);
    }

    return insights;
  }

  /**
   * Update action status
   */
  static updateActionStatus(
    plan: ActionPlan,
    actionTitle: string,
    newStatus: ActionItem['status'],
    completedDate?: string
  ): ActionPlan {
    // This would typically update the database, but for now just return updated plan
    const updatedActions = Object.values(plan.actionsByCategory)
      .flat()
      .map(action => {
        if (action.title === actionTitle) {
          return {
            ...action,
            status: newStatus,
            completedDate: newStatus === 'completed' ? completedDate || new Date().toISOString() : action.completedDate
          };
        }
        return action;
      });

    // Recalculate plan with updated actions
    const input: ActionPlanInput = {
      companyId: plan.companyId,
      planName: plan.planName,
      startDate: plan.startDate,
      endDate: plan.endDate,
      actions: updatedActions
    };

    return this.calculate(input);
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `actionplan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
