import { DashboardInput, DashboardOutput, DashboardMetric } from '../types';
import {
  IdGenerator,
  CalcUtils,
  Validator,
  StatusDeterminer,
  Formatter,
} from '../utils/shared';

export class DashboardCalculator {
  calculate(input: DashboardInput): DashboardOutput {
    const currency = input.currency || 'KES';

    if (!Validator.isNonNegative(input.revenue)) {
      throw new Error('Revenue must be non-negative');
    }
    if (!Validator.isNonNegative(input.expenses)) {
      throw new Error('Expenses must be non-negative');
    }
    if (!Validator.isNonNegative(input.cashOnHand)) {
      throw new Error('Cash on hand must be non-negative');
    }
    if (!Validator.isPositive(input.burnRate)) {
      throw new Error('Burn rate must be positive');
    }

    const netProfit = input.revenue - input.expenses;
    const profitMargin = CalcUtils.percentage(netProfit, input.revenue);
    const cashRunwayMonths = CalcUtils.round(
      CalcUtils.divide(input.cashOnHand, input.burnRate)
    );

    const metrics: DashboardMetric[] = [
      {
        label: 'Revenue',
        value: input.revenue,
        formatted: Formatter.currency(input.revenue, currency),
        status: StatusDeterminer.fromRatio(input.revenue, {
          good: 1,
          warning: 0.01,
        }),
      },
      {
        label: 'Net Profit',
        value: netProfit,
        formatted: Formatter.currency(netProfit, currency),
        status: netProfit >= 0 ? 'good' : 'critical',
      },
      {
        label: 'Profit Margin',
        value: profitMargin,
        formatted: Formatter.percentage(profitMargin),
        status: StatusDeterminer.fromRatio(profitMargin, {
          excellent: 20,
          good: 10,
          warning: 5,
        }),
      },
      {
        label: 'Cash Runway',
        value: cashRunwayMonths,
        formatted: `${cashRunwayMonths} months`,
        status: StatusDeterminer.fromRatio(cashRunwayMonths, {
          excellent: 12,
          good: 6,
          warning: 3,
        }),
      },
    ];

    const healthScore = CalcUtils.clamp(
      CalcUtils.average([
        netProfit >= 0 ? 100 : 0,
        CalcUtils.clamp(profitMargin * 5, 0, 100),
        CalcUtils.clamp(cashRunwayMonths * 8.33, 0, 100),
      ]),
      0,
      100
    );

    return {
      id: IdGenerator.generate('dashboard'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(healthScore, {
        excellent: 75,
        good: 50,
        warning: 25,
      }),
      timestamp: new Date().toISOString(),
      netProfit,
      profitMargin,
      cashRunwayMonths,
      metrics,
      healthScore: CalcUtils.round(healthScore),
    };
  }
}
