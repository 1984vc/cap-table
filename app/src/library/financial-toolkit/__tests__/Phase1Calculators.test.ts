// app/src/library/financial-toolkit/__tests__/Phase1Calculators.test.ts
/**
 * Test Suite for Phase 1 Calculators
 * Balance Sheet, Budget Variance, Working Capital, Dashboard
 */

import { BalanceSheetCalculator } from '../calculators/BalanceSheetCalculator';
import { BudgetVarianceCalculator } from '../calculators/BudgetVarianceCalculator';
import { WorkingCapitalCalculator } from '../calculators/WorkingCapitalCalculator';
import { DashboardCalculator } from '../calculators/DashboardCalculator';

describe('BalanceSheetCalculator', () => {
  const validInput = {
    companyId: 'test_company',
    asOfDate: '2026-01-31',
    cashAndEquivalents: 500000,
    accountsReceivable: 800000,
    inventory: 600000,
    prepaidExpenses: 50000,
    otherCurrentAssets: 100000,
    propertyPlantEquipment: 2000000,
    accumulatedDepreciation: -400000,
    intangibleAssets: 200000,
    longTermInvestments: 300000,
    otherNonCurrentAssets: 50000,
    accountsPayable: 600000,
    shortTermDebt: 200000,
    accruedExpenses: 150000,
    deferredRevenue: 100000,
    otherCurrentLiabilities: 50000,
    longTermDebt: 800000,
    deferredTaxLiabilities: 100000,
    otherNonCurrentLiabilities: 50000,
    shareCapital: 1000000,
    retainedEarnings: 1100000,
    otherEquity: 0
  };

  test('calculates balance sheet correctly', () => {
    const result = BalanceSheetCalculator.calculate(validInput);
    
    expect(result.currentAssets.total).toBe(2050000);
    expect(result.nonCurrentAssets.total).toBe(2150000);
    expect(result.totalAssets).toBe(4200000);
    expect(result.currentLiabilities.total).toBe(1100000);
    expect(result.nonCurrentLiabilities.total).toBe(950000);
    expect(result.totalLiabilities).toBe(2050000);
    expect(result.equity.total).toBe(2100000);
  });

  test('validates balance sheet equation', () => {
    const result = BalanceSheetCalculator.calculate(validInput);
    
    // Assets = Liabilities + Equity
    expect(result.totalAssets).toBeCloseTo(
      result.totalLiabilities + result.equity.total,
      2
    );
    expect(result.health.isBalanced).toBe(true);
  });

  test('calculates liquidity ratios correctly', () => {
    const result = BalanceSheetCalculator.calculate(validInput);
    
    // Current Ratio = Current Assets / Current Liabilities
    expect(result.ratios.currentRatio).toBeCloseTo(1.86, 2);
    
    // Quick Ratio = (Current Assets - Inventory) / Current Liabilities
    expect(result.ratios.quickRatio).toBeCloseTo(1.32, 2);
    
    // Working Capital = Current Assets - Current Liabilities
    expect(result.ratios.workingCapital).toBe(950000);
  });

  test('calculates leverage ratios correctly', () => {
    const result = BalanceSheetCalculator.calculate(validInput);
    
    // Debt to Equity = Total Liabilities / Total Equity
    expect(result.ratios.debtToEquity).toBeCloseTo(0.98, 2);
    
    // Debt to Assets = Total Liabilities / Total Assets
    expect(result.ratios.debtToAssets).toBeCloseTo(0.49, 2);
  });

  test('determines health status correctly', () => {
    const result = BalanceSheetCalculator.calculate(validInput);
    
    expect(result.health.isLiquid).toBe(true); // Current ratio > 1.5
    expect(result.health.isSolvent).toBe(true); // Debt/Equity < 2.0
    expect(result.health.status).toBe('healthy');
  });

  test('detects liquidity problems', () => {
    const poorLiquidity = {
      ...validInput,
      cashAndEquivalents: 100000,
      accountsReceivable: 200000,
      inventory: 200000
    };
    
    const result = BalanceSheetCalculator.calculate(poorLiquidity);
    expect(result.health.isLiquid).toBe(false);
    expect(result.health.status).not.toBe('healthy');
  });

  test('generates meaningful insights', () => {
    const result = BalanceSheetCalculator.calculate(validInput);
    const insights = BalanceSheetCalculator.getInsights(result);
    
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some(i => i.includes('liquidity'))).toBe(true);
  });

  test('rejects negative assets', () => {
    const invalid = { ...validInput, cashAndEquivalents: -1000 };
    expect(() => BalanceSheetCalculator.calculate(invalid)).toThrow();
  });

  test('handles zero equity (insolvent)', () => {
    const insolvent = {
      ...validInput,
      shareCapital: 100000,
      retainedEarnings: -2000000
    };
    
    const result = BalanceSheetCalculator.calculate(insolvent);
    expect(result.equity.total).toBeLessThan(0);
  });
});

describe('BudgetVarianceCalculator', () => {
  const validInput = {
    companyId: 'test_company',
    period: '2026-Q1',
    lineItems: [
      { category: 'Revenue', budgeted: 1000000, actual: 950000 },
      { category: 'COGS', budgeted: 400000, actual: 420000 },
      { category: 'Salaries', budgeted: 200000, actual: 200000 },
      { category: 'Marketing', budgeted: 100000, actual: 120000 },
      { category: 'Rent', budgeted: 50000, actual: 50000 }
    ]
  };

  test('calculates variance correctly', () => {
    const result = BudgetVarianceCalculator.calculate(validInput);
    
    expect(result.summary.totalBudgeted).toBe(1750000);
    expect(result.summary.totalActual).toBe(1740000);
    expect(result.summary.totalVariance).toBe(-10000);
    expect(result.summary.totalVariancePercent).toBeCloseTo(-0.57, 2);
  });

  test('identifies favorable vs unfavorable variances', () => {
    const result = BudgetVarianceCalculator.calculate(validInput);
    
    // Revenue: actual < budget = unfavorable
    const revenueVariance = result.lineItems.find(item => item.category === 'Revenue');
    expect(revenueVariance?.isFavorable).toBe(false);
    
    // COGS: actual > budget = unfavorable (expense)
    const cogsVariance = result.lineItems.find(item => item.category === 'COGS');
    expect(cogsVariance?.isFavorable).toBe(false);
    
    // Salaries: actual = budget = favorable (no overrun)
    const salariesVariance = result.lineItems.find(item => item.category === 'Salaries');
    expect(salariesVariance?.variance).toBe(0);
  });

  test('flags material variances (>10%)', () => {
    const result = BudgetVarianceCalculator.calculate(validInput);
    
    // Marketing: 20% over budget
    const marketingVariance = result.lineItems.find(item => item.category === 'Marketing');
    expect(marketingVariance?.isMaterial).toBe(true);
    expect(Math.abs(marketingVariance?.variancePercent || 0)).toBeGreaterThan(10);
  });

  test('generates top variances list', () => {
    const result = BudgetVarianceCalculator.calculate(validInput);
    
    expect(result.topVariances).toBeDefined();
    expect(result.topVariances.length).toBeLessThanOrEqual(10);
    
    // Should be sorted by absolute variance
    if (result.topVariances.length > 1) {
      expect(Math.abs(result.topVariances[0].variance))
        .toBeGreaterThanOrEqual(Math.abs(result.topVariances[1].variance));
    }
  });

  test('determines overall status correctly', () => {
    const result = BudgetVarianceCalculator.calculate(validInput);
    expect(result.insights.overallStatus).toBe('on-track'); // < 5% variance
  });

  test('handles significant miss', () => {
    const bigMiss = {
      companyId: 'test',
      period: '2026-Q1',
      lineItems: [
        { category: 'Revenue', budgeted: 1000000, actual: 800000 } // -20%
      ]
    };
    
    const result = BudgetVarianceCalculator.calculate(bigMiss);
    expect(result.insights.overallStatus).toBe('significant-miss');
  });

  test('generates actionable insights', () => {
    const result = BudgetVarianceCalculator.calculate(validInput);
    const insights = BudgetVarianceCalculator.getInsights(result);
    
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some(i => i.includes('variance'))).toBe(true);
  });

  test('groups by category correctly', () => {
    const result = BudgetVarianceCalculator.calculate(validInput);
    const grouped = BudgetVarianceCalculator.groupByCategory(result);
    
    expect(grouped['Revenue']).toBeDefined();
    expect(grouped['COGS']).toBeDefined();
  });

  test('validates empty line items', () => {
    const invalid = { companyId: 'test', period: '2026-Q1', lineItems: [] };
    expect(() => BudgetVarianceCalculator.calculate(invalid)).toThrow();
  });
});

describe('WorkingCapitalCalculator', () => {
  const validInput = {
    companyId: 'test_company',
    asOfDate: '2026-01-31',
    arAging: {
      current: 400000,
      days30: 200000,
      days60: 100000,
      days90Plus: 50000
    },
    apAging: {
      current: 500000,
      days30: 100000,
      days60: 50000,
      days90Plus: 20000
    },
    annualRevenue: 12000000,
    annualCOGS: 7200000,
    inventory: 800000
  };

  test('calculates DSO correctly', () => {
    const result = WorkingCapitalCalculator.calculate(validInput);
    
    // DSO = (AR / Annual Revenue) * 365
    const expectedDSO = (750000 / 12000000) * 365;
    expect(result.accountsReceivable.dso).toBeCloseTo(expectedDSO, 1);
  });

  test('calculates DPO correctly', () => {
    const result = WorkingCapitalCalculator.calculate(validInput);
    
    // DPO = (AP / Annual COGS) * 365
    const expectedDPO = (670000 / 7200000) * 365;
    expect(result.accountsPayable.dpo).toBeCloseTo(expectedDPO, 1);
  });

  test('calculates Cash Conversion Cycle', () => {
    const result = WorkingCapitalCalculator.calculate(validInput);
    
    // CCC = DSO + DIO - DPO
    expect(result.cashConversionCycle.ccc).toBeDefined();
    expect(typeof result.cashConversionCycle.ccc).toBe('number');
  });

  test('assesses credit risk correctly', () => {
    const result = WorkingCapitalCalculator.calculate(validInput);
    
    // With 46.7% overdue, should be medium or high risk
    expect(result.accountsReceivable.creditRisk).toMatch(/medium|high/);
  });

  test('assesses payment risk correctly', () => {
    const result = WorkingCapitalCalculator.calculate(validInput);
    
    // With 25.4% overdue, should be medium or high risk
    expect(result.accountsPayable.paymentRisk).toMatch(/medium|high/);
  });

  test('calculates optimization opportunities', () => {
    const result = WorkingCapitalCalculator.calculate(validInput);
    
    expect(result.opportunities.dsoReduction.cashFreed).toBeGreaterThan(0);
    expect(result.opportunities.dpoExtension.cashBenefit).toBeGreaterThan(0);
    expect(result.opportunities.totalPotential).toBeGreaterThan(0);
  });

  test('generates actionable insights', () => {
    const result = WorkingCapitalCalculator.calculate(validInput);
    const insights = WorkingCapitalCalculator.getInsights(result);
    
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some(i => i.includes('DSO') || i.includes('DPO'))).toBe(true);
  });

  test('prioritizes collections correctly', () => {
    const customers = [
      { name: 'Customer A', amount: 100000, daysOverdue: 95, historicalPaymentDays: 30 },
      { name: 'Customer B', amount: 50000, daysOverdue: 10, historicalPaymentDays: 20 },
      { name: 'Customer C', amount: 200000, daysOverdue: 65, historicalPaymentDays: 45 }
    ];
    
    const prioritized = WorkingCapitalCalculator.prioritizeCollections(customers);
    
    // Most overdue should be first
    expect(prioritized[0].priority).toBe('urgent');
    expect(prioritized[0].name).toBe('Customer A'); // 95 days overdue
  });

  test('prioritizes payments correctly', () => {
    const suppliers = [
      { name: 'Supplier A', amount: 50000, daysOverdue: 10, isCritical: false },
      { name: 'Supplier B', amount: 100000, daysOverdue: 45, isCritical: true },
      { name: 'Supplier C', amount: 30000, daysOverdue: 0, isCritical: false }
    ];
    
    const prioritized = WorkingCapitalCalculator.prioritizePayments(suppliers);
    
    // Critical + overdue should be first
    expect(prioritized[0].priority).toMatch(/urgent|high/);
    expect(prioritized[0].name).toBe('Supplier B');
  });

  test('handles missing inventory (DIO = 0)', () => {
    const noInventory = { ...validInput, inventory: undefined };
    const result = WorkingCapitalCalculator.calculate(noInventory);
    
    expect(result.cashConversionCycle.dio).toBe(0);
  });

  test('validates negative values', () => {
    const invalid = { ...validInput, arAging: { ...validInput.arAging, current: -1000 } };
    expect(() => WorkingCapitalCalculator.calculate(invalid)).toThrow();
  });
});

describe('DashboardCalculator', () => {
  const validInput = {
    companyId: 'test_company',
    period: '2026-Q1',
    plData: {
      revenue: { total: 3000000 },
      metrics: {
        grossMargin: 40,
        netMargin: 15,
        ebitda: 500000
      }
    },
    balanceSheetData: {
      currentAssets: { cashAndEquivalents: 800000 },
      ratios: { workingCapital: 950000 }
    },
    cashForecastData: {
      metrics: {
        runway: 32,
        averageBurnRate: 25000
      }
    },
    workingCapitalData: {
      accountsReceivable: { dso: 52 },
      accountsPayable: { dpo: 48 },
      cashConversionCycle: { ccc: 45, status: 'good' }
    },
    budgetVarianceData: {
      summary: { totalVariancePercent: -3.5 }
    }
  };

  test('calculates health score', () => {
    const result = DashboardCalculator.calculate(validInput);
    
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
  });

  test('determines health status correctly', () => {
    const result = DashboardCalculator.calculate(validInput);
    
    expect(result.healthStatus).toMatch(/excellent|good|warning|critical/);
  });

  test('aggregates key metrics', () => {
    const result = DashboardCalculator.calculate(validInput);
    
    expect(result.keyMetrics.revenue).toBe(3000000);
    expect(result.keyMetrics.netMargin).toBe(15);
    expect(result.keyMetrics.runway).toBe(32);
    expect(result.keyMetrics.dso).toBe(52);
  });

  test('generates traffic light indicators', () => {
    const result = DashboardCalculator.calculate(validInput);
    
    expect(result.indicators.profitability).toMatch(/green|yellow|red/);
    expect(result.indicators.liquidity).toMatch(/green|yellow|red/);
    expect(result.indicators.workingCapital).toMatch(/green|yellow|red/);
    expect(result.indicators.budgetPerformance).toMatch(/green|yellow|red/);
  });

  test('generates priority actions', () => {
    const result = DashboardCalculator.calculate(validInput);
    
    expect(result.priorityActions).toBeDefined();
    expect(result.priorityActions.length).toBeLessThanOrEqual(5);
    
    // Should have priorities
    result.priorityActions.forEach(action => {
      expect(action.priority).toMatch(/critical|high|medium|low/);
      expect(action.category).toMatch(/cash|revenue|cost|operations/);
    });
  });

  test('flags critical cash situation', () => {
    const lowCash = {
      ...validInput,
      cashForecastData: {
        metrics: { runway: 10, averageBurnRate: 100000 } // Only 10 weeks!
      }
    };
    
    const result = DashboardCalculator.calculate(lowCash);
    
    expect(result.healthStatus).toMatch(/warning|critical/);
    expect(result.priorityActions.some(a => a.priority === 'critical')).toBe(true);
  });

  test('generates executive narrative', () => {
    const result = DashboardCalculator.calculate(validInput);
    
    expect(result.narrative).toBeDefined();
    expect(result.narrative.length).toBeGreaterThan(0);
    expect(typeof result.narrative).toBe('string');
  });

  test('provides health breakdown', () => {
    const result = DashboardCalculator.calculate(validInput);
    const breakdown = DashboardCalculator.getHealthBreakdown(result);
    
    expect(breakdown.length).toBe(4);
    expect(breakdown[0].category).toBe('Profitability');
    expect(breakdown[1].category).toBe('Liquidity');
  });

  test('validates insufficient data', () => {
    const insufficient = {
      companyId: 'test',
      period: '2026-Q1'
      // No data sources provided
    };
    
    expect(() => DashboardCalculator.calculate(insufficient)).toThrow();
  });
});

describe('Phase 1 Integration Tests', () => {
  test('balance sheet supports ROA calculation', () => {
    const bsInput = {
      companyId: 'test',
      asOfDate: '2026-01-31',
      cashAndEquivalents: 500000,
      accountsReceivable: 800000,
      inventory: 600000,
      prepaidExpenses: 50000,
      otherCurrentAssets: 100000,
      propertyPlantEquipment: 2000000,
      accumulatedDepreciation: -400000,
      intangibleAssets: 200000,
      longTermInvestments: 300000,
      otherNonCurrentAssets: 50000,
      accountsPayable: 600000,
      shortTermDebt: 200000,
      accruedExpenses: 150000,
      deferredRevenue: 100000,
      otherCurrentLiabilities: 50000,
      longTermDebt: 800000,
      deferredTaxLiabilities: 100000,
      otherNonCurrentLiabilities: 50000,
      shareCapital: 1000000,
      retainedEarnings: 1100000,
      otherEquity: 0
    };
    
    const bs = BalanceSheetCalculator.calculate(bsInput);
    const netIncome = 500000;
    
    const roa = BalanceSheetCalculator.calculateROA(bs, netIncome);
    const roe = BalanceSheetCalculator.calculateROE(bs, netIncome);
    
    expect(roa).toBeGreaterThan(0);
    expect(roe).toBeGreaterThan(0);
    expect(roe).toBeGreaterThan(roa); // ROE should be higher (financial leverage)
  });

  test('dashboard aggregates all calculators', () => {
    // This would test full integration with real data from all modules
    // For now, we verify the structure is correct
    const dashInput = {
      companyId: 'test',
      period: '2026-Q1',
      plData: { revenue: { total: 1000000 }, metrics: { netMargin: 10 } },
      balanceSheetData: { currentAssets: { cashAndEquivalents: 500000 } },
      cashForecastData: { metrics: { runway: 30 } },
      workingCapitalData: { accountsReceivable: { dso: 45 } },
      budgetVarianceData: { summary: { totalVariancePercent: 2 } }
    };
    
    const dashboard = DashboardCalculator.calculate(dashInput);
    
    expect(dashboard.healthScore).toBeDefined();
    expect(dashboard.keyMetrics.revenue).toBe(1000000);
    expect(dashboard.keyMetrics.netMargin).toBe(10);
  });
});
