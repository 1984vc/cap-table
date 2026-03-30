import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { CashLeakageCalculator } from '@library/financial-toolkit/calculators/CashLeakageCalculator';
import { useCalculatorPage } from '@/hooks/useCalculatorPage';
import { CalculatorPage } from '@/components/calculator/CalculatorPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const fmt = (n: number, cur = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);

const FREQ_LABELS: Record<number, string> = { 1: 'Rare', 2: 'Occasional', 3: 'Regular', 4: 'Frequent', 5: 'Constant' };
const SEV_LABELS: Record<number, string> = { 1: 'Minor', 2: 'Moderate', 3: 'Significant', 4: 'Major', 5: 'Critical' };
const RISK_COLORS: Record<string, string> = {
  none: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  minor: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  significant: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  major: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

type LeakItem = { type: string; monthlyImpact: number; frequency: number; severity: number; notes: string };
type CLInputs = { leaks: LeakItem[] };
const DEFAULT: CLInputs = {
  leaks: [{ type: '', monthlyImpact: 0, frequency: 3, severity: 3, notes: '' }],
};

const selectCls = 'rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white';

export default function CashLeakagePage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = activeCompany?.currency ?? 'KES';

  const { inputs, setInputs, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<CLInputs, any>('cash-leakage', DEFAULT);

  const updateLeak = (i: number, key: keyof LeakItem, val: string | number) => {
    setInputs((prev) => ({
      ...prev,
      leaks: prev.leaks.map((l, idx) => idx === i ? { ...l, [key]: val } : l),
    }));
  };

  const addLeak = () => setInputs((prev) => ({
    ...prev,
    leaks: [...prev.leaks, { type: '', monthlyImpact: 0, frequency: 3, severity: 3, notes: '' }],
  }));

  const removeLeak = (i: number) => {
    if (inputs.leaks.length === 1) return;
    setInputs((prev) => ({ ...prev, leaks: prev.leaks.filter((_, idx) => idx !== i) }));
  };

  const handleCalculate = async () => {
    if (!activeCompanyId) return;
    try {
      const valid = inputs.leaks.filter(l => l.type.trim() && l.monthlyImpact > 0);
      if (!valid.length) throw new Error('Add at least one leak with a type and monthly impact.');

      const calculated = valid.map(l =>
        CashLeakageCalculator.calculate({
          companyId: activeCompanyId,
          type: l.type,
          monthlyImpact: l.monthlyImpact,
          frequency: l.frequency as 1 | 2 | 3 | 4 | 5,
          severity: l.severity as 1 | 2 | 3 | 4 | 5,
          notes: l.notes,
        })
      );
      const summary = CashLeakageCalculator.calculateSummary(calculated);
      const result = { individual: calculated, summary };
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading…</div>;

  const summary = outputs?.summary;
  const individual: any[] = outputs?.individual ?? [];
  const sorted = [...individual].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <CalculatorPage title="Cash Leakage Detector"
      description="Identify and rank cash drains by risk score (monthly impact × frequency × severity)."
      onCalculate={handleCalculate} calculating={false} saving={saving} lastSaved={lastSaved}>
      <div className="space-y-6">

        {/* Input table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cash Leaks</CardTitle>
              <Button variant="outline" size="sm" onClick={addLeak}>+ Add Leak</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-2 pr-3 font-medium text-gray-600 dark:text-gray-400">Type / Description</th>
                    <th className="py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Monthly Impact</th>
                    <th className="py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Frequency</th>
                    <th className="py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Severity</th>
                    <th className="py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Notes</th>
                    <th className="py-2 pl-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {inputs.leaks.map((l, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-3">
                        <Input value={l.type} placeholder="e.g. Slow debtors"
                          onChange={(e) => updateLeak(i, 'type', e.target.value)} />
                      </td>
                      <td className="py-2 px-3">
                        <Input type="number" min={0} value={l.monthlyImpact || ''} placeholder="0"
                          onChange={(e) => updateLeak(i, 'monthlyImpact', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="py-2 px-3">
                        <select className={selectCls} value={l.frequency}
                          onChange={(e) => updateLeak(i, 'frequency', parseInt(e.target.value))}>
                          {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} – {FREQ_LABELS[v]}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <select className={selectCls} value={l.severity}
                          onChange={(e) => updateLeak(i, 'severity', parseInt(e.target.value))}>
                          {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} – {SEV_LABELS[v]}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <Input value={l.notes} placeholder="Optional"
                          onChange={(e) => updateLeak(i, 'notes', e.target.value)} />
                      </td>
                      <td className="py-2 pl-3">
                        <button onClick={() => removeLeak(i)} disabled={inputs.leaks.length === 1}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30 text-lg leading-none">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {summary && (
          <Card className={`border-2 ${RISK_COLORS[summary.riskLevel] ?? ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Summary
                <span className={`text-sm font-normal px-3 py-1 rounded-full capitalize ${RISK_COLORS[summary.riskLevel]}`}>
                  {summary.riskLevel} risk
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Leaks</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalLeaks}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Drain</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{fmt(summary.totalMonthlyImpact, cur)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Annual Drain</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{fmt(summary.totalMonthlyImpact * 12, cur)}</p>
                </div>
              </div>
              {summary.recommendations?.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {summary.recommendations.map((r: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-red-400 shrink-0">→</span>{r}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ranked leaks table */}
        {sorted.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Leaks Ranked by Risk Score</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-2 pr-3 font-medium text-gray-600 dark:text-gray-400">Type</th>
                    <th className="py-2 px-3 text-right font-medium text-gray-600 dark:text-gray-400">Monthly Impact</th>
                    <th className="py-2 px-3 text-center font-medium text-gray-600 dark:text-gray-400">Freq</th>
                    <th className="py-2 px-3 text-center font-medium text-gray-600 dark:text-gray-400">Severity</th>
                    <th className="py-2 pl-3 text-right font-medium text-gray-600 dark:text-gray-400">Risk Score</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((leak: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-3 font-medium text-gray-800 dark:text-gray-200">{leak.type}</td>
                      <td className="py-2 px-3 text-right text-red-600 dark:text-red-400">{fmt(leak.monthlyImpact, cur)}</td>
                      <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">{FREQ_LABELS[leak.frequency]}</td>
                      <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">{SEV_LABELS[leak.severity]}</td>
                      <td className="py-2 pl-3 text-right font-bold text-gray-900 dark:text-white">{leak.riskScore.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </CalculatorPage>
  );
}
