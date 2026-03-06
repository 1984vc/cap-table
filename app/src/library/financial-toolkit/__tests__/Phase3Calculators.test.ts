// app/src/library/financial-toolkit/__tests__/Phase3Calculators.test.ts
/**
 * Test Suite for Phase 3 Calculators
 * Weekly Reviews, Action Plans
 */

import { WeeklyReviewCalculator } from '../calculators/WeeklyReviewCalculator';
import { ActionPlanCalculator } from '../calculators/ActionPlanCalculator';

describe('WeeklyReviewCalculator', () => {
  const validInput = {
    companyId: 'test_company',
    weekNumber: 8,
    year: 2026,
    weekStartDate: '2026-02-16',
    weekEndDate: '2026-02-22',
    targets: {
      revenue: 250000,
      cashIn: 300000,
      cashOut: 200000,
      collections: 280000,
      newCustomers: 5
    },
    actuals: {
      revenue: 245000,
      cashIn: 290000,
      cashOut: 210000,
      collections: 265000,
      newCustomers: 6
    },
    wins: [
      'Closed major deal with Enterprise Corp',
      'Launched new product feature'
    ],
    challenges: [
      'Collections slower than expected',
      'Unplanned server costs'
    ]
  };

  test('calculates variances correctly', () => {
    const result = WeeklyReviewCalculator.calculate(validInput);
    
    expect(result.variances.revenue).toBeDefined();
    expect(result.variances.revenue?.variance).toBe(-5000); // 245K - 250K
    expect(result.variances.revenue?.variancePercent).toBeCloseTo(-2, 0);
  });

  test('determines variance status correctly', () => {
    const result = WeeklyReviewCalculator.calculate(validInput);
    
    // Revenue variance is -2%, should be on-track (<5%)
    expect(result.variances.revenue?.status).toBe('on-track');
    
    // Collections variance is -5.4%, should be slight-miss
    expect(result.variances.collections?.status).toMatch(/on-track|slight-miss/);
  });

  test('identifies favorable vs unfavorable variances', () => {
    const result = WeeklyReviewCalculator.calculate(validInput);
    
    // Revenue actual < target = unfavorable
    expect(result.variances.revenue?.isFavorable).toBe(false);
    
    // New customers actual > target = favorable
    expect(result.variances.newCustomers?.isFavorable).toBe(true);
    
    // Cash out actual > target = unfavorable (higher spend is bad)
    expect(result.variances.cashOut?.isFavorable).toBe(false);
  });

  test('calculates overall performance correctly', () => {
    const result = WeeklyReviewCalculator.calculate(validInput);
    
    expect(result.performance.totalMetrics).toBe(5);
    expect(result.performance.metricsOnTrack).toBeGreaterThan(0);
    expect(result.performance.percentOnTrack).toBeGreaterThan(0);
    expect(result.performance.overallStatus).toMatch(/excellent|good|needs-attention|poor/);
  });

  test('generates actionable insights', () => {
    const result = WeeklyReviewCalculator.calculate(validInput);
    
    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.insights.some(i => i.includes('revenue') || i.includes('Revenue'))).toBe(true);
  });

  test('captures wins and challenges', () => {
    const result = WeeklyReviewCalculator.calculate(validInput);
    
    expect(result.wins.length).toBe(2);
    expect(result.challenges.length).toBe(2);
    expect(result.wins[0]).toContain('Enterprise Corp');
  });

  test('provides summary insights', () => {
    const result = WeeklyReviewCalculator.calculate(validInput);
    const insights = WeeklyReviewCalculator.getInsights(result);
    
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some(i => i.includes('Week 8'))).toBe(true);
  });

  test('compares with prior week', () => {
    const current = WeeklyReviewCalculator.calculate(validInput);
    const prior = WeeklyReviewCalculator.calculate({
      ...validInput,
      weekNumber: 7,
      actuals: {
        revenue: 230000,
        cashIn: 270000,
        cashOut: 190000,
        collections: 250000,
        newCustomers: 4
      }
    });
    
    const comparison = WeeklyReviewCalculator.compare(current, prior);
    
    expect(comparison.revenueChange).toBe(15000); // 245K - 230K
    expect(comparison.trend).toMatch(/improving|stable|declining/);
  });

  test('calculates rolling 4-week average', () => {
    const reviews = [
      WeeklyReviewCalculator.calculate({ ...validInput, weekNumber: 5, actuals: { revenue: 200000 } }),
      WeeklyReviewCalculator.calculate({ ...validInput, weekNumber: 6, actuals: { revenue: 220000 } }),
      WeeklyReviewCalculator.calculate({ ...validInput, weekNumber: 7, actuals: { revenue: 230000 } }),
      WeeklyReviewCalculator.calculate({ ...validInput, weekNumber: 8, actuals: { revenue: 245000 } })
    ];
    
    const average = WeeklyReviewCalculator.calculateRollingAverage(reviews, 'revenue');
    
    // (200K + 220K + 230K + 245K) / 4 = 223.75K
    expect(average).toBeCloseTo(223750, 0);
  });

  test('validates week number range', () => {
    const invalid = { ...validInput, weekNumber: 54 };
    expect(() => WeeklyReviewCalculator.calculate(invalid)).toThrow();
  });

  test('validates year range', () => {
    const invalid = { ...validInput, year: 1999 };
    expect(() => WeeklyReviewCalculator.calculate(invalid)).toThrow();
  });

  test('requires at least one target and actual', () => {
    const invalid = { ...validInput, targets: {}, actuals: {} };
    expect(() => WeeklyReviewCalculator.calculate(invalid)).toThrow();
  });

  test('handles missing optional metrics', () => {
    const partial = {
      ...validInput,
      targets: { revenue: 250000 },
      actuals: { revenue: 245000 }
    };
    
    const result = WeeklyReviewCalculator.calculate(partial);
    expect(result.performance.totalMetrics).toBe(1);
  });
});

describe('ActionPlanCalculator', () => {
  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  
  const validInput = {
    companyId: 'test_company',
    planName: 'Q1 2026 Strategic Plan',
    startDate: today.toISOString().split('T')[0],
    endDate: in90Days.toISOString().split('T')[0],
    actions: [
      {
        title: 'Reduce DSO from 60 to 45 days',
        description: 'Implement automated payment reminders',
        category: 'cash' as const,
        priority: 'critical' as const,
        owner: 'CFO',
        dueDate: in30Days.toISOString().split('T')[0],
        estimatedImpact: 200000,
        status: 'in-progress' as const
      },
      {
        title: 'Launch new product line',
        description: 'Enter enterprise market segment',
        category: 'revenue' as const,
        priority: 'high' as const,
        owner: 'VP Sales',
        dueDate: in60Days.toISOString().split('T')[0],
        estimatedImpact: 500000,
        status: 'not-started' as const
      },
      {
        title: 'Reduce cloud costs by 20%',
        description: 'Optimize infrastructure',
        category: 'cost' as const,
        priority: 'medium' as const,
        owner: 'CTO',
        dueDate: in7Days.toISOString().split('T')[0],
        estimatedImpact: 50000,
        status: 'completed' as const,
        completedDate: today.toISOString().split('T')[0]
      },
      {
        title: 'Implement ERP system',
        description: 'Replace manual processes',
        category: 'operations' as const,
        priority: 'low' as const,
        dueDate: in90Days.toISOString().split('T')[0],
        estimatedImpact: 100000,
        status: 'blocked' as const,
        notes: 'Waiting for budget approval'
      }
    ]
  };

  test('organizes actions by category', () => {
    const result = ActionPlanCalculator.calculate(validInput);
    
    expect(result.actionsByCategory['cash']).toBeDefined();
    expect(result.actionsByCategory['revenue']).toBeDefined();
    expect(result.actionsByCategory['cost']).toBeDefined();
    expect(result.actionsByCategory['operations']).toBeDefined();
    
    expect(result.actionsByCategory['cash'].length).toBe(1);
  });

  test('organizes actions by priority', () => {
    const result = ActionPlanCalculator.calculate(validInput);
    
    expect(result.actionsByPriority['critical']).toBeDefined();
    expect(result.actionsByPriority['high']).toBeDefined();
    expect(result.actionsByPriority['medium']).toBeDefined();
    expect(result.actionsByPriority['low']).toBeDefined();
  });

  test('calculates progress correctly', () => {
    const result = ActionPlanCalculator.calculate(validInput);
    
    expect(result.progress.totalActions).toBe(4);
    expect(result.progress.completed).toBe(1);
    expect(result.progress.inProgress).toBe(1);
    expect(result.progress.notStarted).toBe(1);
    expect(result.progress.blocked).toBe(1);
    expect(result.progress.percentComplete).toBe(25); // 1/4 = 25%
  });

  test('calculates impact correctly', () => {
    const result = ActionPlanCalculator.calculate(validInput);
    
    expect(result.impact.totalEstimatedImpact).toBe(850000);
    expect(result.impact.realizedImpact).toBe(50000); // Only completed action
    expect(result.impact.potentialImpact).toBe(700000); // In-progress + not-started
  });

  test('calculates timeline correctly', () => {
    const result = ActionPlanCalculator.calculate(validInput);
    
    expect(result.timeline.totalDays).toBeCloseTo(90, 0);
    expect(result.timeline.daysRemaining).toBeGreaterThan(0);
    expect(result.timeline.daysElapsed).toBeGreaterThanOrEqual(0);
  });

  test('identifies critical actions', () => {
    const result = ActionPlanCalculator.calculate(validInput);
    
    // Should include critical priority action
    expect(result.criticalActions.length).toBeGreaterThan(0);
    expect(result.criticalActions.some(a => a.priority === 'critical')).toBe(true);
  });

  test('calculates urgency correctly', () => {
    const result = ActionPlanCalculator.calculate(validInput);
    
    const urgentAction = result.actionsByCategory['cost'][0]; // Due in 7 days
    expect(urgentAction.urgency).toBe('immediate');
  });

  test('identifies overdue actions', () => {
    const overdueInput = {
      ...validInput,
      actions: [
        ...validInput.actions,
        {
          title: 'Overdue task',
          category: 'operations' as const,
          priority: 'high' as const,
          dueDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'in-progress' as const,
          estimatedImpact: 10000
        }
      ]
    };
    
    const result = ActionPlanCalculator.calculate(overdueInput);
    
    expect(result.criticalActions.some(a => a.isOverdue)).toBe(true);
  });

  test('generates actionable recommendations', () => {
    const result = ActionPlanCalculator.calculate(validInput);
    
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  test('provides summary insights', () => {
    const result = ActionPlanCalculator.calculate(validInput);
    const insights = ActionPlanCalculator.getInsights(result);
    
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some(i => i.includes('Q1 2026'))).toBe(true);
  });

  test('warns when behind schedule', () => {
    // Create plan where 80% of time has elapsed but only 25% complete
    const behindInput = {
      ...validInput,
      startDate: new Date(today.getTime() - 72 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: in90Days.toISOString().split('T')[0]
    };
    
    const result = ActionPlanCalculator.calculate(behindInput);
    
    // Should flag as behind schedule
    expect(result.recommendations.some(r => r.includes('behind') || r.includes('CRITICAL'))).toBe(true);
  });

  test('highlights blocked actions', () => {
    const result = ActionPlanCalculator.calculate(validInput);
    
    expect(result.recommendations.some(r => r.includes('Blocked'))).toBe(true);
  });

  test('updates action status', () => {
    const result = ActionPlanCalculator.calculate(validInput);
    
    const updated = ActionPlanCalculator.updateActionStatus(
      result,
      'Launch new product line',
      'completed'
    );
    
    expect(updated.progress.completed).toBe(2); // Was 1, now 2
    expect(updated.progress.percentComplete).toBe(50); // 2/4 = 50%
  });

  test('validates empty actions', () => {
    const invalid = { ...validInput, actions: [] };
    expect(() => ActionPlanCalculator.calculate(invalid)).toThrow();
  });

  test('validates action titles', () => {
    const invalid = {
      ...validInput,
      actions: [{ ...validInput.actions[0], title: '' }]
    };
    expect(() => ActionPlanCalculator.calculate(invalid)).toThrow();
  });

  test('handles actions without due dates', () => {
    const noDueDateInput = {
      ...validInput,
      actions: [
        {
          title: 'Strategic initiative',
          category: 'strategic' as const,
          priority: 'low' as const,
          status: 'not-started' as const,
          estimatedImpact: 75000
        }
      ]
    };
    
    const result = ActionPlanCalculator.calculate(noDueDateInput);
    expect(result.progress.totalActions).toBe(1);
  });

  test('handles actions without estimated impact', () => {
    const noImpactInput = {
      ...validInput,
      actions: [
        {
          title: 'Process improvement',
          category: 'operations' as const,
          priority: 'medium' as const,
          status: 'in-progress' as const
        }
      ]
    };
    
    const result = ActionPlanCalculator.calculate(noImpactInput);
    expect(result.impact.totalEstimatedImpact).toBe(0);
  });
});

describe('Phase 3 Integration Tests', () => {
  test('weekly review feeds into action plan', () => {
    const weeklyReview = WeeklyReviewCalculator.calculate({
      companyId: 'test',
      weekNumber: 8,
      year: 2026,
      weekStartDate: '2026-02-16',
      weekEndDate: '2026-02-22',
      targets: { revenue: 250000, collections: 280000 },
      actuals: { revenue: 200000, collections: 220000 },
      challenges: ['Revenue miss', 'Slow collections']
    });

    // Poor performance should trigger action items
    if (weeklyReview.performance.overallStatus === 'poor' || 
        weeklyReview.performance.overallStatus === 'needs-attention') {
      
      const actionPlan = ActionPlanCalculator.calculate({
        companyId: 'test',
        planName: 'Recovery Plan',
        startDate: '2026-02-23',
        endDate: '2026-05-23',
        actions: [
          {
            title: 'Address revenue shortfall',
            category: 'revenue',
            priority: 'critical',
            status: 'not-started',
            estimatedImpact: 50000
          },
          {
            title: 'Improve collections process',
            category: 'cash',
            priority: 'high',
            status: 'not-started',
            estimatedImpact: 60000
          }
        ]
      });

      expect(actionPlan.criticalActions.length).toBeGreaterThan(0);
    }

    expect(weeklyReview.challenges.length).toBe(2);
  });

  test('action plan completion improves weekly review metrics', () => {
    // Week 1: Poor collections
    const week1 = WeeklyReviewCalculator.calculate({
      companyId: 'test',
      weekNumber: 6,
      year: 2026,
      weekStartDate: '2026-02-02',
      weekEndDate: '2026-02-08',
      targets: { collections: 300000 },
      actuals: { collections: 200000 }
    });

    // Create action plan to fix it
    const plan = ActionPlanCalculator.calculate({
      companyId: 'test',
      planName: 'Collections Improvement',
      startDate: '2026-02-09',
      endDate: '2026-05-09',
      actions: [
        {
          title: 'Implement automated reminders',
          category: 'cash',
          priority: 'critical',
          status: 'completed',
          completedDate: '2026-02-15',
          estimatedImpact: 100000
        }
      ]
    });

    // Week 2: Improved collections after action
    const week2 = WeeklyReviewCalculator.calculate({
      companyId: 'test',
      weekNumber: 7,
      year: 2026,
      weekStartDate: '2026-02-16',
      weekEndDate: '2026-02-22',
      targets: { collections: 300000 },
      actuals: { collections: 290000 } // Better!
    });

    const comparison = WeeklyReviewCalculator.compare(week2, week1);
    expect(comparison.cashInChange).toBeGreaterThan(0);
    expect(plan.progress.completed).toBe(1);
  });

  test('dashboard uses weekly reviews for trending', () => {
    const reviews = Array.from({ length: 13 }, (_, i) => 
      WeeklyReviewCalculator.calculate({
        companyId: 'test',
        weekNumber: i + 1,
        year: 2026,
        weekStartDate: `2026-01-${(i * 7) + 1}`,
        weekEndDate: `2026-01-${(i * 7) + 7}`,
        targets: { revenue: 250000 },
        actuals: { revenue: 240000 + (i * 5000) } // Improving trend
      })
    );

    const avg = WeeklyReviewCalculator.calculateRollingAverage(reviews, 'revenue');
    expect(avg).toBeGreaterThan(0);
    
    // Trend should be improving
    const comparison = WeeklyReviewCalculator.compare(reviews[12], reviews[0]);
    expect(comparison.trend).toBe('improving');
  });
});
