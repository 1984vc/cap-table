import { FounderSalaryInput, FounderSalaryOutput } from '../types';
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared';

export class FounderSalaryCalculator {
  calculate(input: FounderSalaryInput): FounderSalaryOutput {
    const currency = input.currency || 'KES';

    if (!Validator.isPositive(input.numberOfFounders)) {
      throw new Error('Number of founders must be positive');
    }
    if (!Validator.isPositive(input.minimumLivingExpenses)) {
      throw new Error('Minimum living expenses must be positive');
    }
    if (!Validator.isNonNegative(input.monthlyRevenue)) {
      throw new Error('Monthly revenue must be non-negative');
    }

    const stage = input.growthStage || 'early';
    const totalCashAvailable =
      input.cashOnHand + (input.fundingRaised || 0);

    // Stage-based salary cap as % of monthly revenue
    const stageCaps: Record<string, number> = {
      'pre-revenue': 0.0,
      early: 0.1,
      growth: 0.15,
      scale: 0.2,
    };
    const stageCap = stageCaps[stage] ?? 0.1;

    const monthlySurplus = input.monthlyRevenue - input.monthlyBurnRate;

    const minimumSalaryPerFounder = input.minimumLivingExpenses;
    const revenueBased = CalcUtils.divide(
      input.monthlyRevenue * stageCap,
      input.numberOfFounders
    );
    const surplusBased = CalcUtils.divide(
      Math.max(monthlySurplus, 0),
      input.numberOfFounders * 2
    );
    const maximumSalaryPerFounder = CalcUtils.round(
      Math.max(revenueBased, minimumSalaryPerFounder)
    );
    const recommendedSalaryPerFounder = CalcUtils.round(
      CalcUtils.clamp(surplusBased, minimumSalaryPerFounder, maximumSalaryPerFounder)
    );

    const totalFounderPayroll = CalcUtils.round(
      recommendedSalaryPerFounder * input.numberOfFounders
    );
    const salaryAsPercentageOfRevenue = CalcUtils.round(
      CalcUtils.percentage(totalFounderPayroll, input.monthlyRevenue)
    );

    const totalMonthlyBurn = input.monthlyBurnRate + totalFounderPayroll;
    const cashRunwayWithSalary = CalcUtils.round(
      CalcUtils.divide(totalCashAvailable, totalMonthlyBurn)
    );
    const sustainabilityMonths = cashRunwayWithSalary;

    let rationale: string;
    if (stage === 'pre-revenue') {
      rationale = 'Pre-revenue: minimum salary recommended to preserve runway';
    } else if (cashRunwayWithSalary < 6) {
      rationale = 'Low runway: consider keeping salary at minimum to extend runway';
    } else if (cashRunwayWithSalary >= 12) {
      rationale = 'Healthy runway: salary within sustainable range';
    } else {
      rationale = 'Moderate runway: balanced salary recommended';
    }

    return {
      id: IdGenerator.generate('founder-salary'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(cashRunwayWithSalary, {
        excellent: 12,
        good: 6,
        warning: 3,
      }),
      timestamp: new Date().toISOString(),
      recommendedSalaryPerFounder,
      minimumSalaryPerFounder: CalcUtils.round(minimumSalaryPerFounder),
      maximumSalaryPerFounder,
      totalFounderPayroll,
      salaryAsPercentageOfRevenue,
      cashRunwayWithSalary,
      sustainabilityMonths,
      rationale,
    };
  }
}
