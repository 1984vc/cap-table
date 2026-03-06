import {
  OperationsKPIInput,
  OperationsKPIOutput,
  KPIMetric,
} from '../types';
import {
  IdGenerator,
  CalcUtils,
  Validator,
  StatusDeterminer,
  Formatter,
} from '../utils/shared';

export class OperationsKPICalculator {
  calculate(input: OperationsKPIInput): OperationsKPIOutput {
    const currency = input.currency || 'KES';

    if (!Validator.isNonNegative(input.revenue)) {
      throw new Error('Revenue must be non-negative');
    }
    if (!Validator.isPositive(input.headcount)) {
      throw new Error('Headcount must be positive');
    }

    const grossProfit = input.revenue - input.cogs;
    const grossMargin = CalcUtils.percentage(grossProfit, input.revenue);
    const operatingProfit = input.revenue - input.cogs - input.operatingExpenses;
    const operatingMargin = CalcUtils.percentage(operatingProfit, input.revenue);
    const revenuePerEmployee = CalcUtils.round(
      CalcUtils.divide(input.revenue, input.headcount)
    );

    let churnRate: number | undefined;
    let customerRetentionRate: number | undefined;
    if (input.totalCustomers && input.customersChurned !== undefined) {
      churnRate = CalcUtils.round(
        CalcUtils.percentage(input.customersChurned, input.totalCustomers)
      );
      customerRetentionRate = CalcUtils.round(100 - churnRate);
    }

    const revenueGrowth =
      input.previousRevenue !== undefined
        ? CalcUtils.ratioChange(input.revenue, input.previousRevenue)
        : undefined;

    const metrics: KPIMetric[] = [
      {
        name: 'Gross Margin',
        value: grossMargin,
        formatted: Formatter.percentage(grossMargin),
        benchmark: 40,
        status: StatusDeterminer.fromRatio(grossMargin, {
          excellent: 50,
          good: 30,
          warning: 15,
        }),
        trend:
          revenueGrowth !== undefined
            ? revenueGrowth > 0
              ? 'up'
              : 'down'
            : 'stable',
        description: 'Percentage of revenue remaining after cost of goods sold',
      },
      {
        name: 'Operating Margin',
        value: operatingMargin,
        formatted: Formatter.percentage(operatingMargin),
        benchmark: 15,
        status: StatusDeterminer.fromRatio(operatingMargin, {
          excellent: 20,
          good: 10,
          warning: 0,
        }),
        trend: 'stable',
        description: 'Operating profit as a percentage of revenue',
      },
      {
        name: 'Revenue per Employee',
        value: revenuePerEmployee,
        formatted: Formatter.currency(revenuePerEmployee, currency),
        status: StatusDeterminer.fromRatio(revenuePerEmployee, {
          excellent: 1000000,
          good: 500000,
          warning: 200000,
        }),
        trend: 'stable',
        description: 'Average revenue generated per team member',
      },
    ];

    if (input.customerAcquisitionCost !== undefined) {
      const cac = input.customerAcquisitionCost;
      metrics.push({
        name: 'Customer Acquisition Cost',
        value: cac,
        formatted: Formatter.currency(cac, currency),
        status: StatusDeterminer.fromRatio(
          cac,
          { good: 5000, warning: 20000 },
          false
        ),
        trend: 'stable',
        description: 'Average cost to acquire one new customer',
      });
    }

    if (customerRetentionRate !== undefined) {
      metrics.push({
        name: 'Customer Retention Rate',
        value: customerRetentionRate,
        formatted: Formatter.percentage(customerRetentionRate),
        benchmark: 85,
        status: StatusDeterminer.fromRatio(customerRetentionRate, {
          excellent: 90,
          good: 80,
          warning: 70,
        }),
        trend: 'stable',
        description: 'Percentage of customers retained over the period',
      });
    }

    if (input.defectRate !== undefined) {
      metrics.push({
        name: 'Defect Rate',
        value: input.defectRate,
        formatted: Formatter.percentage(input.defectRate),
        benchmark: 1,
        status: StatusDeterminer.fromRatio(
          input.defectRate,
          { good: 2, warning: 5 },
          false
        ),
        trend: 'stable',
        description: 'Percentage of outputs with defects or errors',
      });
    }

    if (input.onTimeDeliveryRate !== undefined) {
      metrics.push({
        name: 'On-Time Delivery Rate',
        value: input.onTimeDeliveryRate,
        formatted: Formatter.percentage(input.onTimeDeliveryRate),
        benchmark: 95,
        status: StatusDeterminer.fromRatio(input.onTimeDeliveryRate, {
          excellent: 95,
          good: 85,
          warning: 75,
        }),
        trend: 'stable',
        description: 'Percentage of deliveries completed on time',
      });
    }

    const statusScores: Record<string, number> = {
      excellent: 100,
      good: 75,
      warning: 50,
      critical: 25,
      neutral: 60,
    };
    const overallScore = CalcUtils.round(
      CalcUtils.average(metrics.map((m) => statusScores[m.status] ?? 60))
    );

    return {
      id: IdGenerator.generate('ops-kpi'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(overallScore, {
        excellent: 80,
        good: 60,
        warning: 40,
      }),
      timestamp: new Date().toISOString(),
      metrics,
      revenuePerEmployee,
      grossMargin,
      operatingMargin,
      customerRetentionRate,
      churnRate,
      overallScore,
    };
  }
}
