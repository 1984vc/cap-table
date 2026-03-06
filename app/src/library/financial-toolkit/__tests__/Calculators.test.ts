// app/src/library/financial-toolkit/__tests__/Calculators.test.ts
/**
 * Comprehensive Test Suite for Financial Toolkit Calculators
 * Jest + TypeScript
 */

import { PLCalculator } from '../calculators/PLCalculator';
import { CashForecastCalculator } from '../calculators/CashForecastCalculator';
import { BreakEvenCalculator } from '../calculators/BreakEvenCalculator';
import { FounderSalaryCalculator } from '../calculators/FounderSalaryCalculator';
import { PricingCalculator } from '../calculators/PricingCalculator';
import { CashLeakageCalculator } from '../calculators/CashLeakageCalculator';

describe('PLCalculator', () => {
  const validInput = {
    companyId: 'test_company',
    period: 'monthly' as const,
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    businessName: 'Test Business',
    revenue: 100000,
    cogs: 40000,
    rent: 10000,
    salaries: 20000,
    utilities: 2000,
    marketing: 5000,
    transport: 3000,
    otherExpenses: 5000,
    founderSalary: 0,
    depreciation: 1000,
    interest: 500,
    tax: 2000
  };

  test('calculates P&L correctly', () => {
    const result = PLCalculator.calculate(validInput);
    
    expect(result.revenue.total).toBe(100000);
    expect(result.cogs.total).toBe(40000);
    expect(result.metrics.grossProfit).toBe(60000);
    expect(result.metrics.grossMargin).toBe(60);
  });

  test('validates required fields', () => {
    const invalid = { ...validInput, companyId: '' };
    expect(() => PLCalculator.calculate(invalid)).toThrow('Validation failed');
  });

  test('handles zero revenue gracefully', () => {
    const zeroRevenue = { ...validInput, revenue: 0 };
    const result = PLCalculator.calculate(zeroRevenue);
    
    expect(result.metrics.grossMargin).toBe(0);
    expect(result.metrics.netMargin).toBe(0);
  });

  test('rejects negative values', () => {
    const negative = { ...validInput, revenue: -1000 };
    expect(() => PLCalculator.calculate(negative)).toThrow();
  });

  test('calculates burn rate correctly', () => {
    const losing = { ...validInput, revenue: 10000, cogs: 5000 };
    const result = PLCalculator.calculate(losing);
    
    expect(result.metrics.ebitda).toBeLessThan(0);
    expect(result.metrics.burnRate).toBeGreaterThan(0);
  });

  test('generates insights for profitable business', () => {
    const result = PLCalculator.calculate(validInput);
    const insights = PLCalculator.getInsights(result);
    
    expect(insights.length).toBeGreaterThan(0);
  });

  test('calculates runway with cash balance', () => {
    const result = PLCalculator.calculate(validInput);
    const runway = PLCalculator.calculateRunway(result, 100000);
    
    expect(runway).toBeGreaterThanOrEqual(0);
  });
});

describe('CashForecastCalculator', () => {
  const validInput = {
    companyId: 'test_company',
    openingCash: 100000,
    weeks: [
      { cashIn: 50000, cashOut: 40000 },
      { cashIn: 55000, cashOut: 42000 },
      { cashIn: 52000, cashOut: 45000 }
    ]
  };

  test('calculates 13-week forecast correctly', () => {
    const result = CashForecastCalculator.calculate(validInput);
    
    expect(result.weeks).toHaveLength(3);
    expect(result.metrics.totalCashIn).toBe(157000);
    expect(result.metrics.totalCashOut).toBe(127000);
  });

  test('FIXED: handles empty weeks array', () => {
    const empty = { ...validInput, weeks: [] };
    expect(() => CashForecastCalculator.calculate(empty)).toThrow('Cannot calculate forecast with zero weeks');
  });

  test('FIXED: division by zero protection', () => {
    const single = { ...validInput, weeks: [{ cashIn: 1000, cashOut: 500 }] };
    const result = CashForecastCalculator.calculate(single);
    
    expect(result.metrics.averageBurnRate).toBe(500);
    expect(result.weeks[0].runway).toBeGreaterThan(0);
  });

  test('calculates runway correctly', () => {
    const runway = CashForecastCalculator.calculateRunway(100000, 10000);
    expect(runway).toBe(10);
  });

  test('handles zero burn rate', () => {
    const runway = CashForecastCalculator.calculateRunway(100000, 0);
    expect(runway).toBe(Infinity);
  });

  test('categorizes runway status', () => {
    expect(CashForecastCalculator.getRunwayStatus(10)).toBe('healthy');
    expect(CashForecastCalculator.getRunwayStatus(6)).toBe('warning');
    expect(CashForecastCalculator.getRunwayStatus(2)).toBe('crisis');
  });

  test('generates recommendations for crisis', () => {
    const crisis = {
      ...validInput,
      weeks: Array(3).fill({ cashIn: 1000, cashOut: 10000 })
    };
    const result = CashForecastCalculator.calculate(crisis);
    const recs = CashForecastCalculator.getRecommendations(result);
    
    expect(recs.some(r => r.includes('URGENT'))).toBe(true);
  });

  test('validates negative cash flow', () => {
    const invalid = {
      ...validInput,
      weeks: [{ cashIn: -1000, cashOut: 500 }]
    };
    expect(() => CashForecastCalculator.calculate(invalid)).toThrow();
  });
});

describe('BreakEvenCalculator', () => {
  const validInput = {
    companyId: 'test_company',
    productName: 'Test Product',
    fixedCosts: 100000,
    pricePerUnit: 500,
    variableCostPerUnit: 200,
    currentSales: 400
  };

  test('calculates break-even correctly', () => {
    const result = BreakEvenCalculator.calculate(validInput);
    
    expect(result.results.contributionMargin).toBe(300);
    expect(result.results.breakEvenUnits).toBeCloseTo(333.33, 1);
    expect(result.results.isAboveBreakEven).toBe(true);
  });

  test('handles zero contribution margin', () => {
    const zero = { ...validInput, pricePerUnit: 200 }; // Same as variable cost
    expect(() => BreakEvenCalculator.calculate(zero)).toThrow();
  });

  test('calculates scenarios correctly', () => {
    const result = BreakEvenCalculator.calculate(validInput);
    
    expect(result.scenarios.priceIncrease10Percent).toBeLessThan(result.results.breakEvenUnits);
    expect(result.scenarios.fixedCostsDecrease20Percent).toBeLessThan(result.results.breakEvenUnits);
  });

  test('validates price must be greater than variable cost', () => {
    const invalid = { ...validInput, pricePerUnit: 100, variableCostPerUnit: 200 };
    expect(() => BreakEvenCalculator.calculate(invalid)).toThrow();
  });

  test('generates insights', () => {
    const result = BreakEvenCalculator.calculate(validInput);
    const insights = BreakEvenCalculator.getInsights(result);
    
    expect(insights.length).toBeGreaterThan(0);
  });

  test('calculates margin of safety', () => {
    const result = BreakEvenCalculator.calculate(validInput);
    const safety = BreakEvenCalculator.calculateMarginOfSafety(result);
    
    expect(safety.units).toBeGreaterThan(0);
    expect(safety.percentage).toBeGreaterThan(0);
  });
});

describe('FounderSalaryCalculator', () => {
  const validInput = {
    companyId: 'test_company',
    rent: 20000,
    food: 15000,
    school: 10000,
    transport: 5000,
    insurance: 3000,
    savings: 5000,
    other: 2000,
    businessProfit: 100000,
    businessCash: 200000
  };

  test('calculates affordability correctly', () => {
    const result = FounderSalaryCalculator.calculate(validInput);
    
    expect(result.personalExpenses.total).toBe(60000);
    expect(result.minimumSalary).toBe(72000); // 60000 * 1.2
    expect(result.decision.canAfford).toBe(true);
  });

  test('rejects salary when profit insufficient', () => {
    const lowProfit = { ...validInput, businessProfit: 50000 };
    const result = FounderSalaryCalculator.calculate(lowProfit);
    
    expect(result.decision.canAfford).toBe(false);
    expect(result.decision.profitCoversMin).toBe(false);
  });

  test('rejects salary when cash reserve insufficient', () => {
    const lowCash = { ...validInput, businessCash: 100000 };
    const result = FounderSalaryCalculator.calculate(lowCash);
    
    expect(result.decision.canAfford).toBe(false);
    expect(result.decision.cashCovers3Months).toBe(false);
  });

  test('validates negative values', () => {
    const invalid = { ...validInput, rent: -1000 };
    expect(() => FounderSalaryCalculator.calculate(invalid)).toThrow();
  });

  test('generates recommendations', () => {
    const result = FounderSalaryCalculator.calculate(validInput);
    const recs = FounderSalaryCalculator.getRecommendations(result);
    
    expect(recs.length).toBeGreaterThan(0);
  });

  test('calculates salary runway', () => {
    const result = FounderSalaryCalculator.calculate(validInput);
    const runway = FounderSalaryCalculator.calculateSalaryRunway(result, 72000);
    
    expect(runway.months).toBeGreaterThan(0);
    expect(runway.status).toBeDefined();
  });
});

describe('PricingCalculator', () => {
  const validInput = {
    companyId: 'test_company',
    productName: 'Test Product',
    costPerUnit: 100,
    desiredMarkup: 0.5,
    competitor1: 180,
    competitor2: 200,
    competitor3: 190,
    customerProblemCost: 1000,
    solutionPercentage: 0.3
  };

  test('calculates all three pricing methods', () => {
    const result = PricingCalculator.calculate(validInput);
    
    expect(result.methods.costPlus).toBe(150);
    expect(result.methods.marketRate).toBeCloseTo(190, 0);
    expect(result.methods.valueBased).toBe(90);
  });

  test('calculates anchor price as average', () => {
    const result = PricingCalculator.calculate(validInput);
    
    // Anchor should be average of the three methods
    const avg = (result.methods.costPlus + result.methods.marketRate + result.methods.valueBased) / 3;
    expect(result.anchorPrice).toBeCloseTo(avg, 1);
  });

  test('validates solution percentage range', () => {
    const invalid = { ...validInput, solutionPercentage: 1.5 };
    expect(() => PricingCalculator.calculate(invalid)).toThrow();
  });

  test('warns about low markup', () => {
    const lowMarkup = { ...validInput, desiredMarkup: 0.1 };
    const validation = PricingCalculator.validate(lowMarkup);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.code === 'BUSINESS_LOGIC_WARNING')).toBe(true);
  });

  test('generates recommendations', () => {
    const result = PricingCalculator.calculate(validInput);
    const recs = PricingCalculator.getRecommendations(result);
    
    expect(recs.length).toBeGreaterThan(0);
  });

  test('performs sensitivity analysis', () => {
    const result = PricingCalculator.calculate(validInput);
    const sensitivity = PricingCalculator.sensitivityAnalysis(result);
    
    expect(sensitivity.length).toBeGreaterThan(0);
    expect(sensitivity[0].priceChange).toBeDefined();
  });

  test('compares with competitors', () => {
    const result = PricingCalculator.calculate(validInput);
    const comparison = PricingCalculator.competitorComparison(result);
    
    expect(comparison.length).toBe(3);
    expect(comparison[0].positioning).toBeDefined();
  });
});

describe('CashLeakageCalculator', () => {
  const validInput = {
    companyId: 'test_company',
    type: 'Late customer payments',
    monthlyImpact: 50000,
    frequency: 4 as const,
    severity: 4 as const,
    notes: 'Test note'
  };

  test('calculates risk score correctly', () => {
    const result = CashLeakageCalculator.calculate(validInput);
    
    expect(result.riskScore).toBe(800000); // 50000 * 4 * 4
    expect(result.status).toBe('active');
  });

  test('validates frequency range', () => {
    const invalid = { ...validInput, frequency: 6 as any };
    expect(() => CashLeakageCalculator.calculate(invalid)).toThrow();
  });

  test('validates severity range', () => {
    const invalid = { ...validInput, severity: 0 as any };
    expect(() => CashLeakageCalculator.calculate(invalid)).toThrow();
  });

  test('calculates summary correctly', () => {
    const leaks = [
      CashLeakageCalculator.calculate(validInput),
      CashLeakageCalculator.calculate({ ...validInput, monthlyImpact: 20000, frequency: 3, severity: 2 })
    ];
    
    const summary = CashLeakageCalculator.calculateSummary(leaks);
    
    expect(summary.totalLeaks).toBe(2);
    expect(summary.totalMonthlyImpact).toBe(70000);
    expect(summary.riskLevel).toBeDefined();
  });

  test('prioritizes leaks correctly', () => {
    const leaks = [
      CashLeakageCalculator.calculate({ ...validInput, riskScore: 100000 } as any),
      CashLeakageCalculator.calculate({ ...validInput, frequency: 2, severity: 2, monthlyImpact: 5000 })
    ];
    
    const prioritized = CashLeakageCalculator.prioritizeLeaks(leaks);
    
    expect(prioritized.critical.length + prioritized.high.length).toBeGreaterThan(0);
  });

  test('calculates potential savings', () => {
    const leaks = [CashLeakageCalculator.calculate(validInput)];
    const savings = CashLeakageCalculator.calculatePotentialSavings(leaks, 'annually');
    
    expect(savings.totalSavings).toBe(600000); // 50000 * 12
  });

  test('provides common leak templates', () => {
    const templates = CashLeakageCalculator.getCommonLeakTemplates();
    
    expect(templates.length).toBeGreaterThan(0);
    expect(templates[0].type).toBeDefined();
    expect(templates[0].suggestedFrequency).toBeDefined();
  });
});

describe('Edge Cases and Integration', () => {
  test('handles very large numbers', () => {
    const huge = {
      companyId: 'test',
      period: 'yearly' as const,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      businessName: 'Big Corp',
      revenue: Number.MAX_SAFE_INTEGER / 2,
      cogs: 0,
      rent: 0,
      salaries: 0,
      utilities: 0,
      marketing: 0,
      transport: 0,
      otherExpenses: 0,
      founderSalary: 0,
      depreciation: 0,
      interest: 0,
      tax: 0
    };
    
    const result = PLCalculator.calculate(huge);
    expect(result.revenue.total).toBe(Number.MAX_SAFE_INTEGER / 2);
  });

  test('handles unicode in business names', () => {
    const unicode = {
      companyId: 'test',
      period: 'monthly' as const,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      businessName: '日本企業 🏢',
      revenue: 100000,
      cogs: 0,
      rent: 0,
      salaries: 0,
      utilities: 0,
      marketing: 0,
      transport: 0,
      otherExpenses: 0,
      founderSalary: 0,
      depreciation: 0,
      interest: 0,
      tax: 0
    };
    
    const result = PLCalculator.calculate(unicode);
    expect(result.businessName).toBe('日本企業 🏢');
  });

  test('all calculators generate unique IDs', () => {
    const ids = new Set();
    
    for (let i = 0; i < 100; i++) {
      const pl = PLCalculator.calculate({
        companyId: 'test',
        period: 'monthly',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        businessName: 'Test',
        revenue: 100000,
        cogs: 0,
        rent: 0,
        salaries: 0,
        utilities: 0,
        marketing: 0,
        transport: 0,
        otherExpenses: 0,
        founderSalary: 0,
        depreciation: 0,
        interest: 0,
        tax: 0
      });
      ids.add(pl.id);
    }
    
    expect(ids.size).toBe(100);
  });
});
