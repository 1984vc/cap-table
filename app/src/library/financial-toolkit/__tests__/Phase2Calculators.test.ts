// app/src/library/financial-toolkit/__tests__/Phase2Calculators.test.ts
/**
 * Test Suite for Phase 2 Calculators
 * CAPEX, Payroll, Tax Calendar, Operations KPIs
 */

import { CapexCalculator } from '../calculators/CapexCalculator';
import { PayrollCalculator } from '../calculators/PayrollCalculator';
import { TaxCalendarCalculator } from '../calculators/TaxCalendarCalculator';
import { OperationsKPICalculator } from '../calculators/OperationsKPICalculator';

describe('CapexCalculator', () => {
  const validInput = {
    companyId: 'test_company',
    projectName: 'New CNC Machine',
    category: 'equipment' as const,
    budgeted: 1200000,
    startDate: '2026-01-01',
    expectedCompletionDate: '2026-06-30',
    approvalStatus: 'approved' as const,
    approvedBy: 'CEO',
    approvalDate: '2025-12-15',
    spendToDate: 600000,
    expectedAnnualBenefit: 300000,
    expectedUsefulLife: 10,
    plannedPayments: [
      { date: '2026-02-01', amount: 400000, description: 'Down payment' },
      { date: '2026-04-01', amount: 400000, description: 'Second payment' },
      { date: '2026-06-01', amount: 400000, description: 'Final payment' }
    ]
  };

  test('calculates CAPEX budget tracking correctly', () => {
    const result = CapexCalculator.calculate(validInput);
    
    expect(result.budget.total).toBe(1200000);
    expect(result.budget.spendToDate).toBe(600000);
    expect(result.budget.remaining).toBe(600000);
    expect(result.budget.percentComplete).toBe(50);
  });

  test('determines timeline status correctly', () => {
    const result = CapexCalculator.calculate(validInput);
    
    expect(result.timeline.status).toMatch(/on-track|at-risk|delayed|complete/);
    expect(result.timeline.daysRemaining).toBeDefined();
  });

  test('calculates ROI correctly', () => {
    const result = CapexCalculator.calculate(validInput);
    
    // Total benefit over 10 years = 300K * 10 = 3M
    // ROI = (3M - 1.2M) / 1.2M * 100 = 150%
    expect(result.financialMetrics.roi).toBeCloseTo(150, 0);
  });

  test('calculates payback period correctly', () => {
    const result = CapexCalculator.calculate(validInput);
    
    // Payback = 1.2M / 300K per year = 4 years
    expect(result.financialMetrics.paybackPeriod).toBe(4);
  });

  test('tracks cash flow from planned payments', () => {
    const result = CapexCalculator.calculate(validInput);
    
    expect(result.cashFlow.plannedPayments.length).toBe(3);
    expect(result.cashFlow.totalPlanned).toBe(1200000);
  });

  test('generates actionable insights', () => {
    const result = CapexCalculator.calculate(validInput);
    const insights = CapexCalculator.getInsights(result);
    
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some(i => i.includes('budget'))).toBe(true);
  });

  test('prioritizes projects by ROI', () => {
    const project1 = CapexCalculator.calculate(validInput);
    const project2 = CapexCalculator.calculate({
      ...validInput,
      projectName: 'Low ROI Project',
      expectedAnnualBenefit: 50000 // Lower benefit
    });
    
    const prioritized = CapexCalculator.prioritizeProjects([project1, project2]);
    
    expect(prioritized[0].projectName).toBe('New CNC Machine'); // Higher ROI first
  });

  test('summarizes multiple projects', () => {
    const project1 = CapexCalculator.calculate(validInput);
    const project2 = CapexCalculator.calculate({
      ...validInput,
      projectName: 'Project 2',
      budgeted: 800000,
      spendToDate: 200000
    });
    
    const summary = CapexCalculator.summarize([project1, project2]);
    
    expect(summary.totalBudget).toBe(2000000);
    expect(summary.totalSpend).toBe(800000);
  });

  test('validates required fields', () => {
    const invalid = { ...validInput, projectName: '' };
    expect(() => CapexCalculator.calculate(invalid)).toThrow();
  });

  test('handles project completion', () => {
    const completed = {
      ...validInput,
      spendToDate: 1200000 // 100% spent
    };
    
    const result = CapexCalculator.calculate(completed);
    expect(result.timeline.status).toBe('complete');
  });
});

describe('PayrollCalculator', () => {
  const validInput = {
    companyId: 'test_company',
    period: '2026-01',
    departments: [
      { 
        name: 'Engineering', 
        headcount: 15, 
        totalGrossPay: 150000, 
        totalBenefits: 30000, 
        totalTaxes: 20000 
      },
      { 
        name: 'Sales', 
        headcount: 10, 
        totalGrossPay: 100000, 
        totalBenefits: 20000, 
        totalTaxes: 15000 
      },
      { 
        name: 'Operations', 
        headcount: 5, 
        totalGrossPay: 50000, 
        totalBenefits: 10000, 
        totalTaxes: 7500 
      }
    ],
    totalRevenue: 1000000
  };

  test('calculates department summaries correctly', () => {
    const result = PayrollCalculator.calculate(validInput);
    
    expect(result.departments.length).toBe(3);
    expect(result.departments[0].totalCost).toBe(200000); // Engineering
    expect(result.departments[0].costPerEmployee).toBe(13333.33); // 200K / 15
  });

  test('calculates company totals correctly', () => {
    const result = PayrollCalculator.calculate(validInput);
    
    expect(result.totals.headcount).toBe(30);
    expect(result.totals.grossPay).toBe(300000);
    expect(result.totals.benefits).toBe(60000);
    expect(result.totals.taxes).toBe(42500);
    expect(result.totals.totalCost).toBe(402500);
  });

  test('calculates payroll as % of revenue', () => {
    const result = PayrollCalculator.calculate(validInput);
    
    // 402.5K / 1M = 40.25%
    expect(result.metrics.payrollAsPercentRevenue).toBeCloseTo(40.25, 2);
  });

  test('calculates hiring capacity', () => {
    const result = PayrollCalculator.calculate(validInput);
    
    expect(result.affordability.maxAffordableHeadcount).toBeGreaterThan(0);
    expect(result.affordability.hiringCapacity).toBeGreaterThanOrEqual(0);
  });

  test('generates affordability recommendation', () => {
    const result = PayrollCalculator.calculate(validInput);
    
    expect(result.affordability.recommendation).toBeDefined();
    expect(result.affordability.recommendation.length).toBeGreaterThan(0);
  });

  test('warns when payroll >50% of revenue', () => {
    const highPayroll = {
      ...validInput,
      totalRevenue: 700000 // Payroll would be >50%
    };
    
    const result = PayrollCalculator.calculate(highPayroll);
    expect(result.affordability.recommendation).toContain('🚨');
  });

  test('generates actionable insights', () => {
    const result = PayrollCalculator.calculate(validInput);
    const insights = PayrollCalculator.getInsights(result);
    
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some(i => i.includes('Headcount'))).toBe(true);
  });

  test('compares with prior period', () => {
    const current = PayrollCalculator.calculate(validInput);
    const prior = PayrollCalculator.calculate({
      ...validInput,
      period: '2025-12',
      departments: validInput.departments.map(d => ({
        ...d,
        headcount: d.headcount - 2
      }))
    });
    
    const comparison = PayrollCalculator.compare(current, prior);
    
    expect(comparison.headcountChange).toBeGreaterThan(0);
  });

  test('determines hiring affordability', () => {
    const payroll = PayrollCalculator.calculate(validInput);
    
    const affordability = PayrollCalculator.canAffordHire(
      payroll,
      10000, // Proposed monthly salary
      1000000, // Total revenue
      500000, // Cash balance
      100000 // Monthly burn
    );
    
    expect(affordability.canAfford).toBeDefined();
    expect(affordability.reason).toBeDefined();
    expect(affordability.impact.newPayrollPercent).toBeGreaterThan(0);
  });

  test('validates empty departments', () => {
    const invalid = { ...validInput, departments: [] };
    expect(() => PayrollCalculator.calculate(invalid)).toThrow();
  });
});

describe('TaxCalendarCalculator', () => {
  const today = new Date();
  const validInput = {
    companyId: 'test_company',
    fiscalYear: 2026,
    obligations: [
      {
        taxType: 'vat' as const,
        jurisdiction: 'Kenya',
        description: 'Monthly VAT',
        dueDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days from now
        estimatedAmount: 50000,
        currency: 'KES' as const,
        frequency: 'monthly' as const,
        isPaid: false
      },
      {
        taxType: 'corporate-income' as const,
        jurisdiction: 'Kenya',
        description: 'Quarterly Corporate Tax',
        dueDate: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days from now
        estimatedAmount: 150000,
        currency: 'KES' as const,
        frequency: 'quarterly' as const,
        isPaid: false
      },
      {
        taxType: 'payroll' as const,
        jurisdiction: 'Kenya',
        description: 'Payroll Tax',
        dueDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago (overdue)
        estimatedAmount: 30000,
        currency: 'KES' as const,
        frequency: 'monthly' as const,
        isPaid: false
      }
    ]
  };

  test('calculates days until due correctly', () => {
    const result = TaxCalendarCalculator.calculate(validInput);
    
    const vatObligation = result.obligations.find(o => o.taxType === 'vat');
    expect(vatObligation?.daysUntilDue).toBeCloseTo(10, 0);
  });

  test('identifies overdue obligations', () => {
    const result = TaxCalendarCalculator.calculate(validInput);
    
    expect(result.timeline.overdue.length).toBe(1);
    expect(result.timeline.overdue[0].taxType).toBe('payroll');
  });

  test('categorizes by timeline', () => {
    const result = TaxCalendarCalculator.calculate(validInput);
    
    expect(result.timeline.next30Days.length).toBeGreaterThan(0);
  });

  test('calculates summary correctly', () => {
    const result = TaxCalendarCalculator.calculate(validInput);
    
    expect(result.summary.totalObligations).toBe(3);
    expect(result.summary.totalEstimatedAmount).toBe(230000);
    expect(result.summary.overdueCount).toBe(1);
    expect(result.summary.overdueAmount).toBe(30000);
  });

  test('generates alerts for overdue obligations', () => {
    const result = TaxCalendarCalculator.calculate(validInput);
    
    const criticalAlerts = result.alerts.filter(a => a.severity === 'critical');
    expect(criticalAlerts.length).toBeGreaterThan(0);
  });

  test('prioritizes obligations correctly', () => {
    const result = TaxCalendarCalculator.calculate(validInput);
    
    const overdue = result.obligations.find(o => o.daysUntilDue < 0);
    expect(overdue?.priority).toBe('critical');
  });

  test('generates actionable insights', () => {
    const result = TaxCalendarCalculator.calculate(validInput);
    const insights = TaxCalendarCalculator.getInsights(result);
    
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some(i => i.includes('OVERDUE'))).toBe(true);
  });

  test('calculates cash impact for upcoming payments', () => {
    const result = TaxCalendarCalculator.calculate(validInput);
    const impact = TaxCalendarCalculator.calculateCashImpact(result, 13);
    
    expect(impact.weeklyPayments.length).toBe(13);
    expect(impact.totalCashNeeded).toBeGreaterThan(0);
  });

  test('handles paid obligations', () => {
    const withPaid = {
      ...validInput,
      obligations: [
        ...validInput.obligations,
        {
          taxType: 'vat' as const,
          jurisdiction: 'Kenya',
          description: 'Prior Month VAT',
          dueDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          estimatedAmount: 50000,
          currency: 'KES' as const,
          frequency: 'monthly' as const,
          isPaid: true,
          paidDate: new Date(today.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          paidAmount: 50000
        }
      ]
    };
    
    const result = TaxCalendarCalculator.calculate(withPaid);
    expect(result.summary.totalPaid).toBe(50000);
  });

  test('validates fiscal year', () => {
    const invalid = { ...validInput, fiscalYear: 1999 };
    expect(() => TaxCalendarCalculator.calculate(invalid)).toThrow();
  });
});

describe('OperationsKPICalculator', () => {
  const validInput = {
    companyId: 'test_company',
    period: '2026-01',
    industry: 'automotive' as const,
    kpis: [
      { 
        name: 'OEE', 
        category: 'production' as const, 
        value: 82, 
        unit: '%', 
        target: 85, 
        benchmark: 80 
      },
      { 
        name: 'PPM Defects', 
        category: 'quality' as const, 
        value: 120, 
        unit: 'ppm', 
        target: 100, 
        benchmark: 150 
      },
      { 
        name: 'On-Time Delivery', 
        category: 'delivery' as const, 
        value: 96, 
        unit: '%', 
        target: 98, 
        benchmark: 95 
      },
      { 
        name: 'Scrap Rate', 
        category: 'quality' as const, 
        value: 1.8, 
        unit: '%', 
        target: 1.5, 
        benchmark: 2.0 
      }
    ]
  };

  test('calculates KPI performance correctly', () => {
    const result = OperationsKPICalculator.calculate(validInput);
    
    expect(result.performance.totalKPIs).toBe(4);
    expect(result.performance.meetsTarget).toBeGreaterThan(0);
  });

  test('organizes KPIs by category', () => {
    const result = OperationsKPICalculator.calculate(validInput);
    
    expect(result.kpisByCategory['production']).toBeDefined();
    expect(result.kpisByCategory['quality']).toBeDefined();
    expect(result.kpisByCategory['delivery']).toBeDefined();
  });

  test('determines overall status correctly', () => {
    const result = OperationsKPICalculator.calculate(validInput);
    
    expect(result.performance.overallStatus).toMatch(/excellent|good|needs-improvement|poor/);
  });

  test('identifies top performers', () => {
    const result = OperationsKPICalculator.calculate(validInput);
    
    // PPM Defects (120 vs 150 benchmark) and OEE (82 vs 80 benchmark) perform above benchmark
    expect(result.topPerformers.length).toBeGreaterThan(0);
  });

  test('identifies KPIs needing attention', () => {
    const result = OperationsKPICalculator.calculate(validInput);
    
    // OEE is below target (82 vs 85), Scrap Rate above target (1.8 vs 1.5)
    expect(result.needsAttention.length).toBeGreaterThan(0);
  });

  test('generates industry-specific recommendations', () => {
    const result = OperationsKPICalculator.calculate(validInput);
    
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  test('assigns traffic light status correctly', () => {
    const result = OperationsKPICalculator.calculate(validInput);
    
    result.kpisByCategory['production'].forEach(kpi => {
      expect(kpi.status).toMatch(/green|yellow|red/);
    });
  });

  test('handles higher-is-better KPIs', () => {
    const result = OperationsKPICalculator.calculate(validInput);
    
    const oee = result.kpisByCategory['production'].find(k => k.name === 'OEE');
    expect(oee).toBeDefined();
  });

  test('handles lower-is-better KPIs', () => {
    const result = OperationsKPICalculator.calculate(validInput);
    
    const defects = result.kpisByCategory['quality'].find(k => k.name === 'PPM Defects');
    expect(defects).toBeDefined();
  });

  test('provides industry templates', () => {
    const automotiveTemplate = OperationsKPICalculator.getIndustryTemplate('automotive');
    
    expect(automotiveTemplate.length).toBeGreaterThan(0);
    expect(automotiveTemplate[0].target).toBeDefined();
  });

  test('generates actionable insights', () => {
    const result = OperationsKPICalculator.calculate(validInput);
    const insights = OperationsKPICalculator.getInsights(result);
    
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some(i => i.includes('Performance'))).toBe(true);
  });

  test('validates empty KPIs', () => {
    const invalid = { ...validInput, kpis: [] };
    expect(() => OperationsKPICalculator.calculate(invalid)).toThrow();
  });

  test('handles SaaS industry KPIs', () => {
    const saasInput = {
      companyId: 'test',
      period: '2026-01',
      industry: 'saas' as const,
      kpis: [
        { name: 'MRR Growth', category: 'growth' as const, value: 12, unit: '%', target: 10 },
        { name: 'Churn Rate', category: 'engagement' as const, value: 3, unit: '%', target: 5 }
      ]
    };
    
    const result = OperationsKPICalculator.calculate(saasInput);
    expect(result.industry).toBe('saas');
  });
});

describe('Phase 2 Integration Tests', () => {
  test('CAPEX projects feed into cash forecast', () => {
    const capex = CapexCalculator.calculate({
      companyId: 'test',
      projectName: 'Equipment Purchase',
      category: 'equipment',
      budgeted: 500000,
      startDate: '2026-01-01',
      expectedCompletionDate: '2026-12-31',
      approvalStatus: 'approved',
      plannedPayments: [
        { date: '2026-03-01', amount: 250000, description: 'Payment 1' },
        { date: '2026-09-01', amount: 250000, description: 'Payment 2' }
      ]
    });
    
    // Cash flow should show 500K in payments
    expect(capex.cashFlow.totalPlanned).toBe(500000);
  });

  test('Payroll integrates with hiring decisions', () => {
    const payroll = PayrollCalculator.calculate({
      companyId: 'test',
      period: '2026-01',
      departments: [
        { name: 'Engineering', headcount: 10, totalGrossPay: 100000, totalBenefits: 20000, totalTaxes: 15000 }
      ],
      totalRevenue: 500000
    });
    
    const hiringDecision = PayrollCalculator.canAffordHire(
      payroll,
      10000,
      500000,
      300000,
      50000
    );
    
    expect(hiringDecision.canAfford).toBeDefined();
  });

  test('Tax calendar impacts cash forecast', () => {
    const calendar = TaxCalendarCalculator.calculate({
      companyId: 'test',
      fiscalYear: 2026,
      obligations: [
        {
          taxType: 'vat',
          jurisdiction: 'Test',
          description: 'VAT Payment',
          dueDate: '2026-03-15',
          estimatedAmount: 100000,
          currency: 'KES',
          frequency: 'monthly',
          isPaid: false
        }
      ]
    });
    
    const cashImpact = TaxCalendarCalculator.calculateCashImpact(calendar, 13);
    expect(cashImpact.totalCashNeeded).toBeGreaterThan(0);
  });

  test('Operations KPIs link to financial performance', () => {
    const kpis = OperationsKPICalculator.calculate({
      companyId: 'test',
      period: '2026-01',
      industry: 'manufacturing',
      kpis: [
        { name: 'OEE', category: 'production', value: 70, unit: '%', target: 80 }
      ]
    });
    
    // Poor operational performance should trigger alerts
    expect(kpis.performance.overallStatus).toMatch(/needs-improvement|poor/);
  });
});
