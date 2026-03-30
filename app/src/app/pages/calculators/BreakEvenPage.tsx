import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { BreakEvenCalculator } from '@library/financial-toolkit/calculators/BreakEvenCalculator';
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

type BEInputs = {
  productName: string;
  fixedCosts: number; pricePerUnit: number;
  variableCostPerUnit: number; currentSales: number;
};
const DEFAULT: BEInputs = {
  productName: '', fixedCosts: 0, pricePerUnit: 0, variableCostPerUnit: 0, currentSales: 0,
};

export default function BreakEvenPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = (activeCompany?.currency ?? 'KES') as Currency;

  const { inputs, setField, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<BEInputs, any>('break-even', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId || !activeCompany) return;
    try {
      const result = BreakEvenCalculator.calculate({
        companyId: activeCompanyId,
        productName: inputs.productName,
        fixedCosts: inputs.fixedCosts,
        pricePerUnit: inputs.pricePerUnit,
        variableCostPerUnit: inputs.variableCostPerUnit,
        currentSales: inputs.currentSales,
      });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) { setError(e.message); }
  };

  const numField = (label: string, key: keyof BEInputs) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <Input
        type="number"
        min={0}
        value={(inputs[key] as number) || ''}
        onChange={(e) => setField(key, num(e.target.value))}
        placeholder="0"
      />
    </div>
  );

  const r = outputs?.results;
  const s = outputs?.scenarios;

  if (loading) return <div className="p-4 text-gray-500">Loading…</div>;

  return (
    <CalculatorPage
      title="Break-Even Analysis"
      description="Fixed costs, variable costs, contribution margin, and break-even point in units and revenue."
      onCalculate={handleCalculate}
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Inputs */}
        <Card>
          <CardHeader><CardTitle>Product & Costs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product Name</label>
              <Input
                type="text"
                value={inputs.productName}
                onChange={(e) => setField('productName', e.target.value)}
                placeholder="e.g. Widget A"
              />
            </div>
            {numField('Fixed Costs (total)', 'fixedCosts')}
            {numField('Price Per Unit', 'pricePerUnit')}
            {numField('Variable Cost Per Unit', 'variableCostPerUnit')}
            {numField('Current Sales (units/period)', 'currentSales')}
          </CardContent>
        </Card>

        {/* Core Results */}
        {r && (
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <CardHeader><CardTitle>Break-Even Results</CardTitle></CardHeader>
            <CardContent>
              {/* Status banner */}
              <div className={[
                'mb-4 rounded-md px-4 py-3 text-sm font-semibold',
                r.isAboveBreakEven
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
              ].join(' ')}>
                {r.isAboveBreakEven ? 'ABOVE break-even' : 'BELOW break-even'}
                {' '}— {Math.abs(r.unitsAboveBelowBreakEven).toLocaleString()} units{' '}
                {r.isAboveBreakEven ? 'above' : 'below'} the break-even point
              </div>

              <ResultRow
                label="Contribution Margin / Unit"
                value={fmt(r.contributionMargin, cur)}
                highlight
                positive={r.contributionMargin > 0}
                negative={r.contributionMargin <= 0}
              />
              <ResultRow
                label="Contribution Margin %"
                value={pct(r.contributionMarginPercent)}
                positive={r.contributionMarginPercent >= 40}
                negative={r.contributionMarginPercent < 20}
              />

              <div className="my-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <ResultRow
                  label="Break-Even Units"
                  value={r.breakEvenUnits.toLocaleString()}
                  highlight
                />
                <ResultRow
                  label="Break-Even Revenue"
                  value={fmt(r.breakEvenRevenue, cur)}
                  highlight
                />
              </div>

              <div className="my-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <ResultRow
                  label="Current Revenue"
                  value={fmt(r.currentRevenue, cur)}
                />
                <ResultRow
                  label="Units vs. Break-Even"
                  value={`${r.isAboveBreakEven ? '+' : ''}${r.unitsAboveBelowBreakEven.toLocaleString()} units`}
                  positive={r.isAboveBreakEven}
                  negative={!r.isAboveBreakEven}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scenarios */}
        {s && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>What-If Scenarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

                {/* Price +10% */}
                {s.priceIncrease10Percent && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Price +10%
                    </p>
                    <ResultRow
                      label="New Break-Even Units"
                      value={s.priceIncrease10Percent.breakEvenUnits?.toLocaleString() ?? '—'}
                      indent
                    />
                    <ResultRow
                      label="New Break-Even Revenue"
                      value={fmt(s.priceIncrease10Percent.breakEvenRevenue ?? 0, cur)}
                      indent
                    />
                    {s.priceIncrease10Percent.contributionMarginPercent != null && (
                      <ResultRow
                        label="Contribution Margin %"
                        value={pct(s.priceIncrease10Percent.contributionMarginPercent)}
                        indent
                        positive
                      />
                    )}
                  </div>
                )}

                {/* Fixed Costs -20% */}
                {s.fixedCostsDecrease20Percent && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Fixed Costs -20%
                    </p>
                    <ResultRow
                      label="New Break-Even Units"
                      value={s.fixedCostsDecrease20Percent.breakEvenUnits?.toLocaleString() ?? '—'}
                      indent
                    />
                    <ResultRow
                      label="New Break-Even Revenue"
                      value={fmt(s.fixedCostsDecrease20Percent.breakEvenRevenue ?? 0, cur)}
                      indent
                    />
                  </div>
                )}

                {/* Variable Cost -5% */}
                {s.variableCostDecrease5 && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Variable Cost -5%
                    </p>
                    <ResultRow
                      label="New Break-Even Units"
                      value={s.variableCostDecrease5.breakEvenUnits?.toLocaleString() ?? '—'}
                      indent
                    />
                    <ResultRow
                      label="New Break-Even Revenue"
                      value={fmt(s.variableCostDecrease5.breakEvenRevenue ?? 0, cur)}
                      indent
                    />
                    {s.variableCostDecrease5.contributionMarginPercent != null && (
                      <ResultRow
                        label="Contribution Margin %"
                        value={pct(s.variableCostDecrease5.contributionMarginPercent)}
                        indent
                        positive
                      />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CalculatorPage>
  );
}
