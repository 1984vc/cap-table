import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { PLCalculator } from '@library/financial-toolkit/calculators/PLCalculator';
import { useCalculatorPage } from '@/hooks/useCalculatorPage';
import { CalculatorPage } from '@/components/calculator/CalculatorPage';
import { ResultRow } from '@/components/calculator/ResultRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const fmt = (n: number, cur = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

type PLInputs = {
  revenue: number; cogs: number; rent: number; salaries: number;
  utilities: number; marketing: number; transport: number; otherExpenses: number;
  founderSalary: number; depreciation: number; interest: number; tax: number;
};

const DEFAULT: PLInputs = {
  revenue: 0, cogs: 0, rent: 0, salaries: 0,
  utilities: 0, marketing: 0, transport: 0, otherExpenses: 0,
  founderSalary: 0, depreciation: 0, interest: 0, tax: 0,
};

export default function PLPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = (activeCompany?.currency ?? 'KES') as Currency;

  const { inputs, setField, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<PLInputs, any>('pl', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId || !activeCompany) return;
    setError(null);
    try {
      const result = PLCalculator.calculate({
        ...inputs,
        companyId: activeCompanyId,
        period: 'monthly',
        startDate: firstOfMonth,
        endDate: lastOfMonth,
        businessName: activeCompany.name,
        currency: cur,
      });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const field = (label: string, key: keyof PLInputs) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <Input
        type="number"
        min={0}
        value={inputs[key] || ''}
        onChange={(e) => setField(key, parseFloat(e.target.value) || 0)}
        placeholder="0"
      />
    </div>
  );

  if (loading) return <div className="p-4 text-gray-500">Loading…</div>;

  return (
    <CalculatorPage
      title="Profit & Loss"
      description="Monthly income statement: revenue, costs, and profit metrics."
      onCalculate={handleCalculate}
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue & Cost of Goods</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {field('Revenue', 'revenue')}
            {field('Cost of Goods Sold (COGS)', 'cogs')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Operating Expenses</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {field('Rent', 'rent')}
            {field('Salaries', 'salaries')}
            {field('Utilities', 'utilities')}
            {field('Marketing', 'marketing')}
            {field('Transport', 'transport')}
            {field('Other Expenses', 'otherExpenses')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Below-the-Line Items</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {field("Founder's Salary", 'founderSalary')}
            {field('Depreciation', 'depreciation')}
            {field('Interest', 'interest')}
            {field('Tax', 'tax')}
          </CardContent>
        </Card>

        {outputs && (
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent>
              <ResultRow label="Revenue" value={fmt(outputs.revenue.total, cur)} />
              <ResultRow label="COGS" value={fmt(outputs.cogs.total, cur)} indent />
              <ResultRow label="Gross Profit" value={fmt(outputs.metrics.grossProfit, cur)} highlight />
              <ResultRow label="Gross Margin" value={pct(outputs.metrics.grossMargin)} indent />
              <ResultRow label="Operating Expenses" value={fmt(outputs.operatingExpenses.total, cur)} indent />
              <ResultRow label="EBITDA" value={fmt(outputs.metrics.ebitda, cur)} highlight
                positive={outputs.metrics.ebitda >= 0} negative={outputs.metrics.ebitda < 0} />
              <ResultRow label="EBITDA Margin" value={pct(outputs.metrics.ebitdaMargin)} indent />
              <ResultRow label="Net Income" value={fmt(outputs.metrics.netIncome, cur)} highlight
                positive={outputs.metrics.netIncome >= 0} negative={outputs.metrics.netIncome < 0} />
              <ResultRow label="Net Margin" value={pct(outputs.metrics.netMargin)} indent />
              {outputs.metrics.burnRate > 0 && (
                <ResultRow label="Monthly Burn Rate" value={fmt(outputs.metrics.burnRate, cur)} negative />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </CalculatorPage>
  );
}
