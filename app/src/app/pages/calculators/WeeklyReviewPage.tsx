import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { WeeklyReviewCalculator } from '@library/financial-toolkit/calculators/WeeklyReviewCalculator';
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

const today = new Date();
const weekStart = new Date(today);
weekStart.setDate(today.getDate() - today.getDay() + 1);
const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6);
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

type WRInputs = {
  weekNumber: number; year: number;
  weekStartDate: string; weekEndDate: string;
  targetRevenue: number; targetCashIn: number; targetCashOut: number;
  targetCollections: number; targetNewCustomers: number;
  actualRevenue: number; actualCashIn: number; actualCashOut: number;
  actualCollections: number; actualNewCustomers: number;
  wins: string; challenges: string; notes: string;
};
const DEFAULT: WRInputs = {
  weekNumber: Math.ceil((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 86400000)),
  year: today.getFullYear(),
  weekStartDate: isoDate(weekStart),
  weekEndDate: isoDate(weekEnd),
  targetRevenue: 0, targetCashIn: 0, targetCashOut: 0, targetCollections: 0, targetNewCustomers: 0,
  actualRevenue: 0, actualCashIn: 0, actualCashOut: 0, actualCollections: 0, actualNewCustomers: 0,
  wins: '', challenges: '', notes: '',
};

type MetricKey = 'revenue' | 'cashIn' | 'cashOut' | 'collections' | 'newCustomers';

const METRICS: { key: MetricKey; label: string; isCurrency: boolean }[] = [
  { key: 'revenue', label: 'Revenue', isCurrency: true },
  { key: 'cashIn', label: 'Cash In', isCurrency: true },
  { key: 'cashOut', label: 'Cash Out', isCurrency: true },
  { key: 'collections', label: 'Collections', isCurrency: true },
  { key: 'newCustomers', label: 'New Customers', isCurrency: false },
];

function statusColors(status: string) {
  if (status === 'on-track') return 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20';
  if (status === 'slight-miss') return 'border-yellow-400 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
  return 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/20';
}

function statusBadge(status: string) {
  if (status === 'on-track') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
  if (status === 'slight-miss') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
}

function statusLabel(status: string) {
  if (status === 'on-track') return 'On Track';
  if (status === 'slight-miss') return 'Slight Miss';
  return 'Significant Miss';
}

export default function WeeklyReviewPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = (activeCompany?.currency ?? 'KES') as Currency;

  const { inputs, setField, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<WRInputs, any>('weekly-review', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId) return;
    try {
      const result = WeeklyReviewCalculator.calculate({
        companyId: activeCompanyId,
        currency: cur,
        weekNumber: inputs.weekNumber,
        year: inputs.year,
        weekStartDate: inputs.weekStartDate,
        weekEndDate: inputs.weekEndDate,
        targets: {
          revenue: inputs.targetRevenue,
          cashIn: inputs.targetCashIn,
          cashOut: inputs.targetCashOut,
          collections: inputs.targetCollections,
          newCustomers: inputs.targetNewCustomers,
        },
        actuals: {
          revenue: inputs.actualRevenue,
          cashIn: inputs.actualCashIn,
          cashOut: inputs.actualCashOut,
          collections: inputs.actualCollections,
          newCustomers: inputs.actualNewCustomers,
        },
        wins: inputs.wins ? inputs.wins.split('\n').filter(Boolean) : [],
        challenges: inputs.challenges ? inputs.challenges.split('\n').filter(Boolean) : [],
        notes: inputs.notes,
      });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) { setError(e.message); }
  };

  const numField = (label: string, key: keyof WRInputs, type: 'number' | 'date' = 'number') => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <Input
        type={type}
        min={type === 'number' ? 0 : undefined}
        value={(inputs[key] as string | number) || (type === 'number' ? '' : inputs[key])}
        onChange={(e) => setField(key, type === 'number' ? num(e.target.value) : e.target.value)}
        placeholder={type === 'number' ? '0' : undefined}
      />
    </div>
  );

  if (loading) return <div className="p-4 text-gray-500">Loading…</div>;

  return (
    <CalculatorPage
      title="Weekly Review"
      description="Track weekly performance against targets across revenue, cash, collections, and customer acquisition."
      onCalculate={handleCalculate}
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
    >
      <div className="space-y-6">

        {/* Week Info */}
        <Card>
          <CardHeader><CardTitle>Week Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {numField('Week Number', 'weekNumber')}
            {numField('Year', 'year')}
            {numField('Week Start', 'weekStartDate', 'date')}
            {numField('Week End', 'weekEndDate', 'date')}
          </CardContent>
        </Card>

        {/* Targets & Actuals */}
        <Card>
          <CardHeader><CardTitle>Targets vs Actuals</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-3 font-medium text-gray-600 dark:text-gray-400 w-1/3">Metric</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Target</th>
                    <th className="text-right py-2 pl-3 font-medium text-gray-600 dark:text-gray-400">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map(({ key, label }) => (
                    <tr key={key} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-3 font-medium text-gray-700 dark:text-gray-300">{label}</td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          min={0}
                          value={(inputs[`target${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof WRInputs] as number) || ''}
                          onChange={(e) => setField(`target${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof WRInputs, num(e.target.value))}
                          placeholder="0"
                          className="text-right"
                        />
                      </td>
                      <td className="py-2 pl-3">
                        <Input
                          type="number"
                          min={0}
                          value={(inputs[`actual${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof WRInputs] as number) || ''}
                          onChange={(e) => setField(`actual${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof WRInputs, num(e.target.value))}
                          placeholder="0"
                          className="text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Wins, Challenges, Notes */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {(
            [
              { key: 'wins' as keyof WRInputs, label: 'Wins', placeholder: 'One win per line…' },
              { key: 'challenges' as keyof WRInputs, label: 'Challenges', placeholder: 'One challenge per line…' },
              { key: 'notes' as keyof WRInputs, label: 'Notes', placeholder: 'Any additional notes…' },
            ] as const
          ).map(({ key, label, placeholder }) => (
            <Card key={key}>
              <CardHeader><CardTitle>{label}</CardTitle></CardHeader>
              <CardContent>
                <textarea
                  value={inputs[key] as string}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder={placeholder}
                  rows={5}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Results */}
        {outputs && (
          <>
            {/* Overall performance */}
            <Card className="bg-gray-50 dark:bg-gray-800/50">
              <CardHeader><CardTitle>Performance Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusBadge(outputs.performance?.overallStatus ?? '')}`}>
                    {statusLabel(outputs.performance?.overallStatus ?? '')}
                  </span>
                  {outputs.performance?.percentOnTrack != null && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {pct(outputs.performance.percentOnTrack)} of metrics on track
                    </span>
                  )}
                </div>

                {/* Per-metric variance cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {METRICS.map(({ key, label, isCurrency }) => {
                    const v = outputs.variances?.[key];
                    if (!v) return null;
                    return (
                      <div
                        key={key}
                        className={`rounded-lg border-l-4 p-3 ${statusColors(v.status)}`}
                      >
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                          {label}
                        </p>
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Target</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {isCurrency ? fmt(v.target, cur) : v.target}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Actual</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {isCurrency ? fmt(v.actual, cur) : v.actual}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline mt-1 pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Variance</span>
                          <span className={`text-sm font-semibold ${
                            v.isFavorable
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {isCurrency ? fmt(v.variance, cur) : v.variance} ({pct(v.variancePercent)})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Insights */}
            {outputs.insights && outputs.insights.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Insights</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {outputs.insights.map((insight: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </CalculatorPage>
  );
}
