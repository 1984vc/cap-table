import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { CashForecastCalculator } from '@library/financial-toolkit/calculators/CashForecastCalculator';
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

type CFInputs = {
  openingCash: number;
  weeks: Array<{ cashIn: number; cashOut: number }>;
};
const EMPTY_WEEK = { cashIn: 0, cashOut: 0 };
const DEFAULT: CFInputs = {
  openingCash: 0,
  weeks: Array.from({ length: 13 }, () => ({ ...EMPTY_WEEK })),
};

const STATUS_STYLES: Record<string, string> = {
  healthy: 'text-green-700 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  crisis:  'text-red-600 dark:text-red-400',
};

const STATUS_BG: Record<string, string> = {
  healthy: 'bg-green-50 dark:bg-green-900/20',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20',
  crisis:  'bg-red-50 dark:bg-red-900/20',
};

export default function CashForecastPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = (activeCompany?.currency ?? 'KES') as Currency;

  const { inputs, setField, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<CFInputs, any>('cash-forecast', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId || !activeCompany) return;
    try {
      const result = CashForecastCalculator.calculate({
        companyId: activeCompanyId,
        openingCash: inputs.openingCash,
        weeks: inputs.weeks,
      });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) { setError(e.message); }
  };

  const updateWeek = (index: number, field: 'cashIn' | 'cashOut', value: string) => {
    const updated = inputs.weeks.map((w, i) =>
      i === index ? { ...w, [field]: num(value) } : w
    );
    setField('weeks', updated);
  };

  if (loading) return <div className="p-4 text-gray-500">Loading…</div>;

  return (
    <CalculatorPage
      title="13-Week Cash Forecast"
      description="Rolling 13-week cash flow forecast showing opening balance, inflows, outflows, and closing balance."
      onCalculate={handleCalculate}
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
    >
      <div className="space-y-6">

        {/* Opening Balance */}
        <Card>
          <CardHeader><CardTitle>Opening Balance</CardTitle></CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Cash on Hand (Week 0)
              </label>
              <Input
                type="number"
                min={0}
                value={inputs.openingCash || ''}
                onChange={(e) => setField('openingCash', num(e.target.value))}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Inputs */}
        <Card>
          <CardHeader><CardTitle>Weekly Cash Flows</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-gray-400 w-16">Week</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">Cash In</th>
                  <th className="text-left py-2 font-medium text-gray-600 dark:text-gray-400">Cash Out</th>
                </tr>
              </thead>
              <tbody>
                {inputs.weeks.map((week, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-1.5 pr-4 text-gray-500 dark:text-gray-400 font-mono text-xs">W{i + 1}</td>
                    <td className="py-1.5 pr-4">
                      <Input
                        type="number"
                        min={0}
                        value={week.cashIn || ''}
                        onChange={(e) => updateWeek(i, 'cashIn', e.target.value)}
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="py-1.5">
                      <Input
                        type="number"
                        min={0}
                        value={week.cashOut || ''}
                        onChange={(e) => updateWeek(i, 'cashOut', e.target.value)}
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Results */}
        {outputs && (
          <>
            {/* Weekly Results Table */}
            <Card>
              <CardHeader><CardTitle>Weekly Forecast</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 pr-3 font-medium text-gray-600 dark:text-gray-400">Week</th>
                      <th className="text-right py-2 pr-3 font-medium text-gray-600 dark:text-gray-400">Opening</th>
                      <th className="text-right py-2 pr-3 font-medium text-gray-600 dark:text-gray-400">Cash In</th>
                      <th className="text-right py-2 pr-3 font-medium text-gray-600 dark:text-gray-400">Cash Out</th>
                      <th className="text-right py-2 pr-3 font-medium text-gray-600 dark:text-gray-400">Closing</th>
                      <th className="text-center py-2 font-medium text-gray-600 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outputs.weeks.map((w: any) => (
                      <tr
                        key={w.week}
                        className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${STATUS_BG[w.status] ?? ''}`}
                      >
                        <td className="py-2 pr-3 text-gray-500 dark:text-gray-400 font-mono text-xs">W{w.week}</td>
                        <td className="py-2 pr-3 text-right font-mono text-xs text-gray-600 dark:text-gray-300">{fmt(w.openingCash, cur)}</td>
                        <td className="py-2 pr-3 text-right font-mono text-xs text-green-700 dark:text-green-400">{fmt(w.cashIn, cur)}</td>
                        <td className="py-2 pr-3 text-right font-mono text-xs text-red-600 dark:text-red-400">{fmt(w.cashOut, cur)}</td>
                        <td className={`py-2 pr-3 text-right font-mono text-xs font-semibold ${STATUS_STYLES[w.status] ?? ''}`}>
                          {fmt(w.closingCash, cur)}
                        </td>
                        <td className="py-2 text-center">
                          <span className={`text-xs font-medium capitalize ${STATUS_STYLES[w.status] ?? ''}`}>
                            {w.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Summary Metrics */}
            <Card className="bg-gray-50 dark:bg-gray-800/50">
              <CardHeader><CardTitle>Summary Metrics</CardTitle></CardHeader>
              <CardContent>
                <ResultRow label="Total Cash In"      value={fmt(outputs.metrics.totalCashIn, cur)}  positive />
                <ResultRow label="Total Cash Out"     value={fmt(outputs.metrics.totalCashOut, cur)} negative />
                <ResultRow
                  label="Net Cash Flow"
                  value={fmt(outputs.metrics.netCashFlow, cur)}
                  highlight
                  positive={outputs.metrics.netCashFlow >= 0}
                  negative={outputs.metrics.netCashFlow < 0}
                />
                <ResultRow label="Average Weekly Burn" value={fmt(outputs.metrics.averageBurnRate, cur)} indent />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </CalculatorPage>
  );
}
