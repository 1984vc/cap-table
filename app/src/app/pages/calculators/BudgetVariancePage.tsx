import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { BudgetVarianceCalculator } from '@library/financial-toolkit/calculators/BudgetVarianceCalculator';
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

type VarianceLine = { category: string; budgeted: number; actual: number };
type BVInputs = {
  period: string;
  lineItems: VarianceLine[];
};
const DEFAULT: BVInputs = {
  period: new Date().toISOString().slice(0, 7),
  lineItems: [{ category: 'Revenue', budgeted: 0, actual: 0 }],
};

export default function BudgetVariancePage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = (activeCompany?.currency ?? 'KES') as Currency;

  const { inputs, setField, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<BVInputs, any>('budget-variance', DEFAULT);

  const updateLine = (index: number, key: keyof VarianceLine, value: string | number) => {
    const updated = inputs.lineItems.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    setField('lineItems', updated);
  };

  const addLine = () => {
    setField('lineItems', [...inputs.lineItems, { category: '', budgeted: 0, actual: 0 }]);
  };

  const removeLine = (index: number) => {
    if (inputs.lineItems.length === 1) return;
    setField('lineItems', inputs.lineItems.filter((_, i) => i !== index));
  };

  const handleCalculate = async () => {
    if (!activeCompanyId) return;
    try {
      const result = BudgetVarianceCalculator.calculate({
        companyId: activeCompanyId,
        currency: cur,
        period: inputs.period,
        lineItems: inputs.lineItems.map(l => ({
          category: l.category,
          budgeted: l.budgeted,
          actual: l.actual,
        })),
      });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading…</div>;

  return (
    <CalculatorPage
      title="Budget Variance Analysis"
      description="Compare budgeted vs actual figures across categories and identify favorable and unfavorable variances."
      onCalculate={handleCalculate}
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
    >
      <div className="space-y-6">

        {/* Period */}
        <Card>
          <CardHeader><CardTitle>Period</CardTitle></CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Budget Period (YYYY-MM)
              </label>
              <Input
                type="month"
                value={inputs.period}
                onChange={(e) => setField('period', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Budget Line Items</CardTitle>
              <Button variant="outline" size="sm" onClick={addLine}>+ Add Row</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-3 font-medium text-gray-600 dark:text-gray-400 w-1/3">Category</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Budgeted</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Actual</th>
                    <th className="py-2 pl-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {inputs.lineItems.map((line, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-3">
                        <Input
                          value={line.category}
                          onChange={(e) => updateLine(i, 'category', e.target.value)}
                          placeholder="e.g. Revenue"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          min={0}
                          value={line.budgeted || ''}
                          onChange={(e) => updateLine(i, 'budgeted', num(e.target.value))}
                          placeholder="0"
                          className="text-right"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          min={0}
                          value={line.actual || ''}
                          onChange={(e) => updateLine(i, 'actual', num(e.target.value))}
                          placeholder="0"
                          className="text-right"
                        />
                      </td>
                      <td className="py-2 pl-3">
                        <button
                          onClick={() => removeLine(i)}
                          disabled={inputs.lineItems.length === 1}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30 transition-colors text-lg leading-none"
                          aria-label="Remove row"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {outputs && (
          <>
            {/* Summary Card */}
            <Card className="bg-gray-50 dark:bg-gray-800/50">
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent>
                <ResultRow label="Total Budgeted" value={fmt(outputs.summary.totalBudgeted, cur)} />
                <ResultRow label="Total Actual" value={fmt(outputs.summary.totalActual, cur)} />
                <ResultRow
                  label="Total Variance"
                  value={fmt(outputs.summary.totalVariance, cur)}
                  highlight
                  positive={outputs.summary.totalVariance >= 0}
                  negative={outputs.summary.totalVariance < 0}
                />
                <ResultRow
                  label="Variance %"
                  value={pct(outputs.summary.totalVariancePercent)}
                  positive={outputs.summary.totalVariancePercent >= 0}
                  negative={outputs.summary.totalVariancePercent < 0}
                />
                {outputs.insights?.overallStatus && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Overall Status</p>
                    <p className="text-sm mt-1 text-gray-800 dark:text-gray-200 capitalize">
                      {outputs.insights.overallStatus}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Line Item Results Table */}
            {outputs.lineItems && outputs.lineItems.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Variance by Line Item</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2 pr-3 font-medium text-gray-600 dark:text-gray-400">Category</th>
                          <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Budgeted</th>
                          <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Actual</th>
                          <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Variance</th>
                          <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Var %</th>
                          <th className="text-center py-2 pl-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outputs.lineItems.map((item: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2 pr-3 font-medium text-gray-800 dark:text-gray-200">
                              {item.category}
                              {item.isMaterial && (
                                <span className="ml-1 text-xs text-orange-500 dark:text-orange-400" title="Material variance">●</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                              {fmt(item.budgeted, cur)}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                              {fmt(item.actual, cur)}
                            </td>
                            <td className={`py-2 px-3 text-right font-medium ${
                              item.isFavorable
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {fmt(item.variance, cur)}
                            </td>
                            <td className={`py-2 px-3 text-right ${
                              item.isFavorable
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {pct(item.variancePercent)}
                            </td>
                            <td className="py-2 pl-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.isFavorable
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              }`}>
                                {item.isFavorable ? 'Favorable' : 'Unfavorable'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">● denotes a material variance</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </CalculatorPage>
  );
}
