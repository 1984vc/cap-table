// Unified type exports for the Financial Toolkit

export type Currency = 'KES' | 'USD' | 'EUR' | 'GBP' | 'TZS' | 'UGX' | 'RWF' | 'NGN' | 'ZAR' | 'GHS';
export type CalculationStatus = 'excellent' | 'good' | 'warning' | 'critical' | 'neutral';

// ─── Base Types ────────────────────────────────────────────────────────────────

export interface BaseCalculationInput {
  currency?: Currency;
  period?: string;
  label?: string;
}

export interface BaseCalculationOutput {
  id: string;
  currency: Currency;
  period?: string;
  status: CalculationStatus;
  timestamp: string;
  warnings?: string[];
  errors?: string[];
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardInput extends BaseCalculationInput {
  revenue: number;
  expenses: number;
  cashOnHand: number;
  burnRate: number;
  receivables?: number;
  payables?: number;
}

export interface DashboardMetric {
  label: string;
  value: number;
  formatted: string;
  status: CalculationStatus;
  trend?: 'up' | 'down' | 'stable';
}

export interface DashboardOutput extends BaseCalculationOutput {
  netProfit: number;
  profitMargin: number;
  cashRunwayMonths: number;
  metrics: DashboardMetric[];
  healthScore: number;
}

// ─── CapEx ─────────────────────────────────────────────────────────────────────

export interface CapexItem {
  name: string;
  cost: number;
  usefulLifeYears: number;
  salvageValue?: number;
  purchaseDate?: string;
}

export interface CapexInput extends BaseCalculationInput {
  items: CapexItem[];
  depreciationMethod?: 'straight-line' | 'declining-balance' | 'sum-of-years';
}

export interface CapexItemOutput {
  name: string;
  cost: number;
  annualDepreciation: number;
  monthlyDepreciation: number;
  netBookValue: number;
  accumulatedDepreciation: number;
}

export interface CapexOutput extends BaseCalculationOutput {
  totalCapex: number;
  totalAnnualDepreciation: number;
  totalMonthlyDepreciation: number;
  items: CapexItemOutput[];
  paybackPeriodYears?: number;
}

// ─── Balance Sheet ─────────────────────────────────────────────────────────────

export interface BalanceSheetInput extends BaseCalculationInput {
  // Current Assets
  cash: number;
  accountsReceivable: number;
  inventory: number;
  otherCurrentAssets?: number;
  // Non-Current Assets
  propertyPlantEquipment?: number;
  accumulatedDepreciation?: number;
  intangibleAssets?: number;
  otherNonCurrentAssets?: number;
  // Current Liabilities
  accountsPayable: number;
  shortTermDebt?: number;
  currentPortionLongTermDebt?: number;
  otherCurrentLiabilities?: number;
  // Non-Current Liabilities
  longTermDebt?: number;
  otherNonCurrentLiabilities?: number;
  // Equity
  paidInCapital?: number;
  retainedEarnings?: number;
}

export interface BalanceSheetOutput extends BaseCalculationOutput {
  totalCurrentAssets: number;
  totalNonCurrentAssets: number;
  totalAssets: number;
  totalCurrentLiabilities: number;
  totalNonCurrentLiabilities: number;
  totalLiabilities: number;
  totalEquity: number;
  currentRatio: number;
  quickRatio: number;
  debtToEquityRatio: number;
  workingCapital: number;
  isBalanced: boolean;
  balanceDifference: number;
}

// ─── Break-Even ────────────────────────────────────────────────────────────────

export interface BreakEvenInput extends BaseCalculationInput {
  fixedCosts: number;
  variableCostPerUnit: number;
  sellingPricePerUnit: number;
  currentUnits?: number;
  targetProfit?: number;
}

export interface BreakEvenOutput extends BaseCalculationOutput {
  breakEvenUnits: number;
  breakEvenRevenue: number;
  contributionMarginPerUnit: number;
  contributionMarginRatio: number;
  marginOfSafety?: number;
  marginOfSafetyPercentage?: number;
  unitsForTargetProfit?: number;
  revenueForTargetProfit?: number;
}

// ─── Budget Variance ───────────────────────────────────────────────────────────

export interface BudgetLineItem {
  category: string;
  budgeted: number;
  actual: number;
}

export interface BudgetVarianceInput extends BaseCalculationInput {
  items: BudgetLineItem[];
}

export interface BudgetVarianceLineOutput {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  status: CalculationStatus;
  isOverBudget: boolean;
}

export interface BudgetVarianceOutput extends BaseCalculationOutput {
  items: BudgetVarianceLineOutput[];
  totalBudgeted: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercentage: number;
  overBudgetCategories: string[];
  underBudgetCategories: string[];
}

// ─── Cash Forecast ─────────────────────────────────────────────────────────────

export interface CashForecastMonthInput {
  month: string;
  projectedInflows: number;
  projectedOutflows: number;
}

export interface CashForecastInput extends BaseCalculationInput {
  openingBalance: number;
  months: CashForecastMonthInput[];
  minimumCashBuffer?: number;
}

export interface CashForecastMonthOutput {
  month: string;
  openingBalance: number;
  inflows: number;
  outflows: number;
  netCashFlow: number;
  closingBalance: number;
  status: CalculationStatus;
  isBelowMinimum: boolean;
}

export interface CashForecastOutput extends BaseCalculationOutput {
  months: CashForecastMonthOutput[];
  minimumBalance: number;
  minimumBalanceMonth: string;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  finalBalance: number;
  monthsBelowMinimum: number;
  cashRunwayMonths: number;
}

// ─── Cash Leakage ──────────────────────────────────────────────────────────────

export interface CashLeakageItem {
  category: string;
  expectedAmount: number;
  actualAmount: number;
  description?: string;
}

export interface CashLeakageInput extends BaseCalculationInput {
  items: CashLeakageItem[];
}

export interface CashLeakageItemOutput {
  category: string;
  expected: number;
  actual: number;
  leakage: number;
  leakagePercentage: number;
  status: CalculationStatus;
}

export interface CashLeakageOutput extends BaseCalculationOutput {
  items: CashLeakageItemOutput[];
  totalExpected: number;
  totalActual: number;
  totalLeakage: number;
  totalLeakagePercentage: number;
  topLeakageCategories: string[];
  leakageScore: number;
}

// ─── Founder Salary ────────────────────────────────────────────────────────────

export interface FounderSalaryInput extends BaseCalculationInput {
  monthlyRevenue: number;
  monthlyBurnRate: number;
  cashOnHand: number;
  numberOfFounders: number;
  minimumLivingExpenses: number;
  fundingRaised?: number;
  growthStage?: 'pre-revenue' | 'early' | 'growth' | 'scale';
}

export interface FounderSalaryOutput extends BaseCalculationOutput {
  recommendedSalaryPerFounder: number;
  minimumSalaryPerFounder: number;
  maximumSalaryPerFounder: number;
  totalFounderPayroll: number;
  salaryAsPercentageOfRevenue: number;
  cashRunwayWithSalary: number;
  sustainabilityMonths: number;
  rationale: string;
}

// ─── P&L ───────────────────────────────────────────────────────────────────────

export interface PLOperatingExpenses {
  salaries?: number;
  rent?: number;
  utilities?: number;
  marketing?: number;
  depreciation?: number;
  other?: number;
}

export interface PLInput extends BaseCalculationInput {
  revenue: number;
  costOfGoodsSold: number;
  operatingExpenses: PLOperatingExpenses;
  otherIncome?: number;
  otherExpenses?: number;
  taxRate?: number;
}

export interface PLOutput extends BaseCalculationOutput {
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMargin: number;
  totalOperatingExpenses: number;
  ebitda: number;
  ebit: number;
  netProfitBeforeTax: number;
  taxAmount: number;
  netProfit: number;
  netMargin: number;
  operatingMargin: number;
}

// ─── Pricing ───────────────────────────────────────────────────────────────────

export interface PricingInput extends BaseCalculationInput {
  directCost: number;
  indirectCostAllocation: number;
  desiredProfitMargin: number;
  competitorPrices?: number[];
  customerWillingnessToPay?: number;
  priceElasticity?: 'elastic' | 'inelastic' | 'neutral';
}

export interface PricingOutput extends BaseCalculationOutput {
  totalCost: number;
  costPlusPrice: number;
  minimumViablePrice: number;
  recommendedPrice: number;
  profitPerUnit: number;
  competitorPriceAverage?: number;
  pricePositioning?: 'below-market' | 'at-market' | 'above-market';
  marginAtRecommendedPrice: number;
}

// ─── Working Capital ───────────────────────────────────────────────────────────

export interface WorkingCapitalInput extends BaseCalculationInput {
  cash: number;
  accountsReceivable: number;
  inventory: number;
  otherCurrentAssets?: number;
  accountsPayable: number;
  shortTermDebt?: number;
  otherCurrentLiabilities?: number;
  annualRevenue?: number;
  annualCOGS?: number;
}

export interface WorkingCapitalOutput extends BaseCalculationOutput {
  currentAssets: number;
  currentLiabilities: number;
  workingCapital: number;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  daysPayableOutstanding?: number;
  daysReceivableOutstanding?: number;
  daysInventoryOutstanding?: number;
  cashConversionCycle?: number;
  workingCapitalTurnover?: number;
}

// ─── Payroll ───────────────────────────────────────────────────────────────────

export interface EmployeePayroll {
  name: string;
  grossSalary: number;
  nhifContribution?: number;
  nssfContribution?: number;
  otherDeductions?: number;
  allowances?: number;
  isDirector?: boolean;
}

export interface PayrollInput extends BaseCalculationInput {
  employees: EmployeePayroll[];
  month?: string;
  year?: number;
}

export interface EmployeePayrollOutput {
  name: string;
  grossSalary: number;
  paye: number;
  nhif: number;
  nssf: number;
  otherDeductions: number;
  allowances: number;
  totalDeductions: number;
  netPay: number;
  employerNssf: number;
  totalEmployerCost: number;
}

export interface PayrollOutput extends BaseCalculationOutput {
  employees: EmployeePayrollOutput[];
  totalGrossSalary: number;
  totalPaye: number;
  totalNhif: number;
  totalNssf: number;
  totalNetPay: number;
  totalEmployerCost: number;
  totalDeductions: number;
  payrollMonth: string;
}

// ─── Tax Calendar ──────────────────────────────────────────────────────────────

export interface TaxCalendarInput extends BaseCalculationInput {
  annualRevenue: number;
  businessType: 'sole-proprietor' | 'partnership' | 'limited-company' | 'sme';
  taxYear?: number;
  hasVATRegistration?: boolean;
  vatRate?: number;
  hasEmployees?: boolean;
  corporateTaxRate?: number;
}

export interface TaxObligation {
  taxType: string;
  description: string;
  dueDate: string;
  estimatedAmount: number;
  frequency: 'monthly' | 'quarterly' | 'annually';
  isOverdue: boolean;
}

export interface TaxCalendarOutput extends BaseCalculationOutput {
  obligations: TaxObligation[];
  totalAnnualTax: number;
  monthlyTaxProvision: number;
  nextDueTax: TaxObligation | null;
  upcomingObligations: TaxObligation[];
  taxYear: number;
}

// ─── Operations KPI ────────────────────────────────────────────────────────────

export interface OperationsKPIInput extends BaseCalculationInput {
  revenue: number;
  previousRevenue?: number;
  cogs: number;
  operatingExpenses: number;
  headcount: number;
  customersAcquired?: number;
  customersChurned?: number;
  totalCustomers?: number;
  customerAcquisitionCost?: number;
  averageOrderValue?: number;
  ordersProcessed?: number;
  defectRate?: number;
  onTimeDeliveryRate?: number;
}

export interface KPIMetric {
  name: string;
  value: number;
  formatted: string;
  benchmark?: number;
  status: CalculationStatus;
  trend?: 'up' | 'down' | 'stable';
  description: string;
}

export interface OperationsKPIOutput extends BaseCalculationOutput {
  metrics: KPIMetric[];
  revenuePerEmployee: number;
  grossMargin: number;
  operatingMargin: number;
  customerRetentionRate?: number;
  churnRate?: number;
  overallScore: number;
}

// ─── Weekly Review ─────────────────────────────────────────────────────────────

export interface WeeklyMetric {
  name: string;
  currentWeek: number;
  previousWeek?: number;
}

export interface WeeklyReviewInput extends BaseCalculationInput {
  weekNumber?: number;
  weekStartDate?: string;
  revenue: WeeklyMetric;
  expenses: WeeklyMetric;
  newCustomers: WeeklyMetric;
  leads: WeeklyMetric;
  cashPosition: WeeklyMetric;
  additionalMetrics?: WeeklyMetric[];
}

export interface WeeklyMetricOutput {
  name: string;
  currentWeek: number;
  previousWeek?: number;
  change?: number;
  changePercentage?: number;
  trend: 'up' | 'down' | 'stable';
  status: CalculationStatus;
}

export interface WeeklyReviewOutput extends BaseCalculationOutput {
  weekNumber?: number;
  weekStartDate?: string;
  metrics: WeeklyMetricOutput[];
  netProfit: number;
  burnRate: number;
  revenueGrowth?: number;
  highlights: string[];
  concerns: string[];
  overallHealthScore: number;
}

// ─── Action Plan ───────────────────────────────────────────────────────────────

export interface ActionPlanItem {
  id?: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  completionPercentage?: number;
  assignee?: string;
  category?: string;
  estimatedImpact?: number;
  estimatedEffort?: number;
}

export interface ActionPlanInput extends BaseCalculationInput {
  items: ActionPlanItem[];
  planStartDate?: string;
  planEndDate?: string;
}

export interface ActionPlanItemOutput {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  completionPercentage: number;
  assignee?: string;
  category?: string;
  priorityScore: number;
  isOverdue: boolean;
  impactEffortRatio?: number;
  status: CalculationStatus;
}

export interface ActionPlanOutput extends BaseCalculationOutput {
  items: ActionPlanItemOutput[];
  totalItems: number;
  completedItems: number;
  overdueItems: number;
  overallProgress: number;
  highPriorityItems: ActionPlanItemOutput[];
  quickWins: ActionPlanItemOutput[];
  planHealth: CalculationStatus;
  estimatedCompletionDate?: string;
}
