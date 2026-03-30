import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { WorkingCapitalCalculator } from '@library/financial-toolkit/calculators/WorkingCapitalCalculator';
import { useCalculatorPage } from '@/hooks/useCalculatorPage';
import { CalculatorPage } from '@/components/calculator/CalculatorPage';
import { ResultRow } from '@/components/calculator/ResultRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const fmt = (n: number, cur = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;
const num = (v: string) => parseFloat(v) || 0;

const today = new Date().toISOString().slice(0, 10);

type WCInputs = {
  asOfDate: string;
  arCurrent: number; arDays30: number; arDays60: number; arDays90Plus: number;
  apCurrent: number; apDays30: number; apDays60: number; apDays90Plus: number;
  annualRevenue: number; annualCOGS: number; inventory: number;
};
const DEFAULT: WCInputs = {
  asOfDate: today,
  arCurrent: 0, arDays30: 0, arDays60: 0, arDays90Plus: 0,
  apCurrent: 0, apDays30: 0, apDays60: 0, apDays90Plus: 0,
  annualRevenue: 0, annualCOGS: 0, inventory: 0,
};

export default function WorkingCapitalPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = (activeCompany?.currency ?? 'KES') as Currency;

  const { inputs, setField, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<WCInputs, any>('working-capital', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId || !activeCompany) return;
    try {
      const result = WorkingCapitalCalculator.calculate({
        companyId: activeCompanyId,
        currency: cur,
        asOfDate: inputs.asOfDate,
        arAging: { current: inputs.arCurrent, days30: inputs.arDays30, days60: inputs.arDays60, days90Plus: inputs.arDays90Plus },
        apAging: { current: inputs.apCurrent, days30: inputs.apDays30, days60: inputs.apDays60, days90Plus: inputs.apDays90Plus },
        annualRevenue: inputs.annualRevenue,
        annualCOGS: inputs.annualCOGS,
        inventory: inputs.inventory,
      });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) { setError(e.message); }
  };

  const field = (label: string, key: keyof WCInputs, type: 'number' | 'date' = 'number') => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <Input
        type={type}
        min={type === 'number' ? 0 : undefined}
        value={inputs[key] as string | number || (type === 'number' ? '' : inputs[key])}
        onChange={(e) => setField(key, type === 'number' ? num(e.target.value) : e.target.value)}
        placeholder={type === 'number' ? '0' : undefined}
      />
    </div>
  );

  if (loading) return <div className="p-4 text-gray-500">Loading…</div>;

  return (
    <CalculatorPage
      title="Working Capital Analysis"
      description="Analyse receivables, payables, cash conversion cycle, and working capital efficiency."
      onCalculate={handleCalculate}
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Period & Revenue */}
        <Card>
          <CardHeader><CardTitle>Period & Revenue</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {field('As of Date', 'asOfDate', 'date')}
            {field('Annual Revenue', 'annualRevenue')}
            {field('Annual COGS', 'annualCOGS')}
            {field('Inventory Balance', 'inventory')}
          </CardContent>
        </Card>

        {/* AR Aging */}
        <Card>
          <CardHeader><CardTitle>Accounts Receivable Aging</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Enter outstanding AR by age bucket</p>
            {field('Current (0–30 days)', 'arCurrent')}
            {field('31–60 Days', 'arDays30')}
            {field('61–90 Days', 'arDays60')}
            {field('90+ Days', 'arDays90Plus')}
          </CardContent>
        </Card>

        {/* AP Aging */}
        <Card>
          <CardHeader><CardTitle>Accounts Payable Aging</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Enter outstanding AP by age bucket</p>
            {field('Current (0–30 days)', 'apCurrent')}
            {field('31–60 Days', 'apDays30')}
            {field('61–90 Days', 'apDays60')}
            {field('90+ Days', 'apDays90Plus')}
          </CardContent>
        </Card>

        {/* Results */}
        {outputs && (
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent>
              <ResultRow
                label="Total AR"
                value={fmt(outputs.totalAR ?? (inputs.arCurrent + inputs.arDays30 + inputs.arDays60 + inputs.arDays90Plus), cur)}
              />
              <ResultRow
                label="  — Overdue (60+ days)"
                value={fmt(inputs.arDays60 + inputs.arDays90Plus, cur)}
                indent
                negative={inputs.arDays60 + inputs.arDays90Plus > 0}
              />
              <ResultRow
                label="Total AP"
                value={fmt(outputs.totalAP ?? (inputs.apCurrent + inputs.apDays30 + inputs.apDays60 + inputs.apDays90Plus), cur)}
              />

              <div className="my-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <ResultRow
                  label="Days Sales Outstanding (DSO)"
                  value={`${outputs.dso?.toFixed(1) ?? '—'} days`}
                  highlight
                />
                <ResultRow
                  label="Days Payable Outstanding (DPO)"
                  value={`${outputs.dpo?.toFixed(1) ?? '—'} days`}
                  highlight
                />
                <ResultRow
                  label="Cash Conversion Cycle (CCC)"
                  value={`${outputs.ccc?.toFixed(1) ?? '—'} days`}
                  highlight
                  positive={(outputs.ccc ?? 0) <= 30}
                  negative={(outputs.ccc ?? 0) > 60}
                />
              </div>

              {outputs.workingCapitalOpportunities && outputs.workingCapitalOpportunities.length > 0 && (
                <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Opportunities</p>
                  {outputs.workingCapitalOpportunities.map((opp: string, i: number) => (
                    <p key={i} className="text-xs text-gray-600 dark:text-gray-300 py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      {opp}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </CalculatorPage>
  );
}
