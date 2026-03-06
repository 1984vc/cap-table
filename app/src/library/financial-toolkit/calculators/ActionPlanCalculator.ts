import {
  ActionPlanInput,
  ActionPlanOutput,
  ActionPlanItemOutput,
  CalculationStatus,
} from '../types';
import { IdGenerator, CalcUtils, StatusDeterminer } from '../utils/shared';

export class ActionPlanCalculator {
  calculate(input: ActionPlanInput): ActionPlanOutput {
    const currency = input.currency || 'KES';
    const now = new Date();

    if (!input.items || input.items.length === 0) {
      throw new Error('At least one action plan item is required');
    }

    const items: ActionPlanItemOutput[] = input.items.map((item) => {
      const id = item.id || IdGenerator.generate('action');
      const completionPercentage = item.completionPercentage ?? 0;
      const isOverdue =
        !!item.dueDate && new Date(item.dueDate) < now && completionPercentage < 100;

      const priorityScores: Record<string, number> = {
        high: 3,
        medium: 2,
        low: 1,
      };
      const priorityScore = priorityScores[item.priority] ?? 1;

      let impactEffortRatio: number | undefined;
      if (
        item.estimatedImpact !== undefined &&
        item.estimatedEffort !== undefined &&
        item.estimatedEffort > 0
      ) {
        impactEffortRatio = CalcUtils.round(
          item.estimatedImpact / item.estimatedEffort,
          2
        );
      }

      let status: CalculationStatus;
      if (isOverdue) {
        status = 'critical';
      } else if (completionPercentage === 100) {
        status = 'excellent';
      } else if (completionPercentage >= 50) {
        status = 'good';
      } else if (item.priority === 'high' && completionPercentage === 0) {
        status = 'warning';
      } else {
        status = 'neutral';
      }

      return {
        id,
        title: item.title,
        description: item.description,
        priority: item.priority,
        dueDate: item.dueDate,
        completionPercentage,
        assignee: item.assignee,
        category: item.category,
        priorityScore,
        isOverdue,
        impactEffortRatio,
        status,
      };
    });

    const totalItems = items.length;
    const completedItems = items.filter((i) => i.completionPercentage === 100).length;
    const overdueItems = items.filter((i) => i.isOverdue).length;
    const overallProgress = CalcUtils.round(
      CalcUtils.average(items.map((i) => i.completionPercentage))
    );

    const highPriorityItems = items
      .filter((i) => i.priority === 'high')
      .sort((a, b) => a.completionPercentage - b.completionPercentage);

    // Quick wins: high impact/effort ratio, not yet complete
    const quickWins = items
      .filter((i) => i.completionPercentage < 100)
      .filter(
        (i) =>
          (i.impactEffortRatio !== undefined && i.impactEffortRatio >= 2) ||
          (i.priority === 'high' && !i.isOverdue)
      )
      .sort((a, b) => (b.impactEffortRatio ?? 0) - (a.impactEffortRatio ?? 0))
      .slice(0, 3);

    let planHealth: CalculationStatus;
    if (overdueItems > totalItems * 0.3) planHealth = 'critical';
    else if (overdueItems > 0) planHealth = 'warning';
    else if (overallProgress >= 75) planHealth = 'excellent';
    else if (overallProgress >= 50) planHealth = 'good';
    else planHealth = 'neutral';

    return {
      id: IdGenerator.generate('action-plan'),
      currency,
      period: input.period,
      status: planHealth,
      timestamp: new Date().toISOString(),
      items,
      totalItems,
      completedItems,
      overdueItems,
      overallProgress,
      highPriorityItems,
      quickWins,
      planHealth,
    };
  }
}
