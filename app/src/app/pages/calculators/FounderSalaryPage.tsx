import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { useCalculatorPage } from '@/hooks/useCalculatorPage';
import { CalculatorPage } from '@/components/calculator/CalculatorPage';
import { ResultRow } from '@/components/calculator/ResultRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FounderSalaryCalculator } from '@library/financial-toolkit/calculators/FounderSalaryCalculator';

const fmt = (n: number, cur = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

type FSInputs = {
  rent: number;
  food: number;
  school: number;
  transport: number;
  insurance: number;
  savings: number;
  other: number;
  businessProfit: number;
  businessCash: number;
};

const DEFAULT: FSInputs = {
  rent: 0,
  food: 0,
  school: 0,
  transport: 0,
  insurance: 0,
  savings: 0,
  other: 0,
  businessProfit: 0,
  businessCash: 0,
};

const EXPENSE_LABELS: { key: keyof FSInputs; label: string }[] = [
  { key: 'rent', label: 'Rent / Housing' },
  { key: 'food', label: 'Food & Groceries' },
  { key: 'school', label: 'School Fees' },
  { key: 'transport', label: 'Transport' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'savings', label: 'Personal Savings' },
  { key: 'other', label: 'Other Expenses' },
];

export default function FounderSalaryPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = (activeCompany?.currency ?? 'KES') as Currency;

  const { inputs, setField, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<FSInputs, any>('founder-salary', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId || !activeCompany) return;
    try {
      const result = FounderSalaryCalculator.calculate({
        companyId: activeCompanyId,
        rent: inputs.rent,
        food: inputs.food,
        school: inputs.school,
        transport: inputs.transport,
        insurance: inputs.insurance,
        savings: inputs.savings,
        other: inputs.other,
        businessProfit: inputs.businessProfit,
        businessCash: inputs.businessCash,
      });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const canAfford = outputs?.decision?.canAfford;

  return (
    <CalculatorPage
      title="Founder Salary Calculator"
      description="Determine what salary you can afford to pay yourself based on personal expenses and business performance."
      onCalculate={handleCalculate}
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
    >
      {/* Personal expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Personal Expenses</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {EXPENSE_LABELS.map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium">{label}</label>
              <Input
                type="number"
                min={0}
                value={inputs[key] || ''}
                onChange={(e) => setField(key, parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Business financials */}
      <Card>
        <CardHeader>
          <CardTitle>Business Financials</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Monthly Business Profit</label>
            <Input
              type="number"
              min={0}
              value={inputs.businessProfit || ''}
              onChange={(e) => setField('businessProfit', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Business Cash Available</label>
            <Input
              type="number"
              min={0}
              value={inputs.businessCash || ''}
              onChange={(e) => setField('businessCash', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {outputs && (
        <>
          {/* Afford status banner */}
          <div
            className={`flex items-center justify-center rounded-lg p-5 ${
              canAfford
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
            }`}
          >
            <span
              className={`text-2xl font-bold tracking-wide ${
                canAfford
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}
            >
              {canAfford ? 'CAN AFFORD' : 'CANNOT AFFORD'}
            </span>
          </div>

          {/* Expenses breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Expenses Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {EXPENSE_LABELS.map(({ key, label }) =>
                (inputs[key] as number) > 0 ? (
                  <ResultRow key={key} label={label} value={fmt(inputs[key] as number, cur)} />
                ) : null
              )}
              <ResultRow
                label="Total Monthly Expenses"
                value={fmt(outputs.personalExpenses.total, cur)}
                highlight
              />
            </CardContent>
          </Card>

          {/* Salary recommendation */}
          <Card>
            <CardHeader>
              <CardTitle>Salary Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResultRow label="Minimum Salary Needed" value={fmt(outputs.minimumSalary, cur)} />
              <ResultRow
                label="Recommended Salary"
                value={fmt(outputs.decision.recommendedSalary, cur)}
                highlight
              />
              {outputs.decision.reasoning && (
                <p className="mt-4 rounded-md bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
                  {outputs.decision.reasoning}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </CalculatorPage>
  );
}
