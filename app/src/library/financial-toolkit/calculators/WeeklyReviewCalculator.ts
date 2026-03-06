import {
  WeeklyReviewInput,
  WeeklyReviewOutput,
  WeeklyMetricOutput,
  WeeklyMetric,
  CalculationStatus,
} from '../types';
import { IdGenerator, CalcUtils, StatusDeterminer } from '../utils/shared';

export class WeeklyReviewCalculator {
  calculate(input: WeeklyReviewInput): WeeklyReviewOutput {
    const currency = input.currency || 'KES';

    const processMetric = (
      metric: WeeklyMetric,
      higherIsBetter = true
    ): WeeklyMetricOutput => {
      const change =
        metric.previousWeek !== undefined
          ? CalcUtils.round(metric.currentWeek - metric.previousWeek)
          : undefined;
      const changePercentage =
        change !== undefined && metric.previousWeek !== undefined && metric.previousWeek !== 0
          ? CalcUtils.ratioChange(metric.currentWeek, metric.previousWeek)
          : undefined;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (change !== undefined) {
        if (change > 0) trend = 'up';
        else if (change < 0) trend = 'down';
      }

      let status: CalculationStatus = 'neutral';
      if (changePercentage !== undefined) {
        const isPositive = higherIsBetter ? trend === 'up' : trend === 'down';
        if (isPositive) {
          status = Math.abs(changePercentage) > 10 ? 'excellent' : 'good';
        } else if (trend !== 'stable') {
          status = Math.abs(changePercentage) > 20 ? 'critical' : 'warning';
        }
      }

      return {
        name: metric.name,
        currentWeek: metric.currentWeek,
        previousWeek: metric.previousWeek,
        change,
        changePercentage,
        trend,
        status,
      };
    };

    const metrics: WeeklyMetricOutput[] = [
      processMetric(input.revenue, true),
      processMetric(input.expenses, false),
      processMetric(input.newCustomers, true),
      processMetric(input.leads, true),
      processMetric(input.cashPosition, true),
    ];

    if (input.additionalMetrics) {
      input.additionalMetrics.forEach((m) => metrics.push(processMetric(m)));
    }

    const netProfit = CalcUtils.round(
      input.revenue.currentWeek - input.expenses.currentWeek
    );
    const burnRate = input.expenses.currentWeek;
    const revenueGrowth = metrics[0].changePercentage;

    const highlights: string[] = [];
    const concerns: string[] = [];

    metrics.forEach((m) => {
      if (m.status === 'excellent' && m.changePercentage !== undefined) {
        highlights.push(`${m.name} up ${m.changePercentage}% this week`);
      } else if (m.status === 'critical' && m.changePercentage !== undefined) {
        concerns.push(
          `${m.name} down ${Math.abs(m.changePercentage)}% this week`
        );
      }
    });

    if (netProfit >= 0) {
      highlights.push(
        `Profitable week: net profit of ${netProfit.toLocaleString()}`
      );
    } else {
      concerns.push(
        `Unprofitable week: net loss of ${Math.abs(netProfit).toLocaleString()}`
      );
    }

    const statusScores: Record<string, number> = {
      excellent: 100,
      good: 75,
      neutral: 60,
      warning: 40,
      critical: 20,
    };
    const overallHealthScore = CalcUtils.round(
      CalcUtils.average(metrics.map((m) => statusScores[m.status] ?? 60))
    );

    return {
      id: IdGenerator.generate('weekly-review'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(overallHealthScore, {
        excellent: 80,
        good: 60,
        warning: 40,
      }),
      timestamp: new Date().toISOString(),
      weekNumber: input.weekNumber,
      weekStartDate: input.weekStartDate,
      metrics,
      netProfit,
      burnRate,
      revenueGrowth,
      highlights,
      concerns,
      overallHealthScore,
    };
  }
}
