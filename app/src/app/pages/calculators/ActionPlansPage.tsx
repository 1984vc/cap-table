import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { ActionPlanCalculator } from '@library/financial-toolkit/calculators/ActionPlanCalculator';
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
const in90Days = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

type ActionItem = {
  title: string;
  category: string;
  priority: string;
  owner: string;
  dueDate: string;
  estimatedImpact: number;
  status: string;
};
type APInputs = {
  planName: string;
  startDate: string;
  endDate: string;
  actions: ActionItem[];
};
const DEFAULT: APInputs = {
  planName: '90-Day Action Plan',
  startDate: today,
  endDate: in90Days,
  actions: [{
    title: '',
    category: 'revenue',
    priority: 'high',
    owner: '',
    dueDate: in90Days,
    estimatedImpact: 0,
    status: 'not-started',
  }],
};

const CATEGORIES = ['cash', 'revenue', 'cost', 'operations', 'strategic'] as const;
const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
const STATUSES = ['not-started', 'in-progress', 'blocked', 'completed', 'cancelled'] as const;

const selectBase =
  'h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';

function priorityColor(priority: string) {
  if (priority === 'critical') return 'text-red-600 dark:text-red-400';
  if (priority === 'high') return 'text-orange-600 dark:text-orange-400';
  if (priority === 'medium') return 'text-yellow-600 dark:text-yellow-500';
  return 'text-gray-500 dark:text-gray-400';
}

function statusColor(status: string) {
  if (status === 'completed') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
  if (status === 'in-progress') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
  if (status === 'blocked') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  if (status === 'cancelled') return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
}

export default function ActionPlansPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = (activeCompany?.currency ?? 'KES') as Currency;

  const { inputs, setField, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<APInputs, any>('action-plans', DEFAULT);

  const updateAction = (index: number, key: keyof ActionItem, value: string | number) => {
    const updated = inputs.actions.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    setField('actions', updated);
  };

  const addAction = () => {
    setField('actions', [
      ...inputs.actions,
      {
        title: '',
        category: 'revenue',
        priority: 'high',
        owner: '',
        dueDate: in90Days,
        estimatedImpact: 0,
        status: 'not-started',
      },
    ]);
  };

  const removeAction = (index: number) => {
    if (inputs.actions.length === 1) return;
    setField('actions', inputs.actions.filter((_, i) => i !== index));
  };

  const handleCalculate = async () => {
    if (!activeCompanyId) return;
    try {
      const result = ActionPlanCalculator.calculate({
        companyId: activeCompanyId,
        currency: cur,
        planName: inputs.planName,
        startDate: inputs.startDate,
        endDate: inputs.endDate,
        actions: inputs.actions.map(a => ({
          title: a.title,
          category: a.category as any,
          priority: a.priority as any,
          owner: a.owner || undefined,
          dueDate: a.dueDate || undefined,
          estimatedImpact: a.estimatedImpact || undefined,
          status: a.status as any,
        })),
      });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading…</div>;

  return (
    <CalculatorPage
      title="Action Plans"
      description="Build structured action plans with owners, deadlines, and estimated impact to drive financial improvements."
      onCalculate={handleCalculate}
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
    >
      <div className="space-y-6">

        {/* Plan Details */}
        <Card>
          <CardHeader><CardTitle>Plan Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Plan Name</label>
              <Input
                value={inputs.planName}
                onChange={(e) => setField('planName', e.target.value)}
                placeholder="e.g. Q2 Action Plan"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
              <Input
                type="date"
                value={inputs.startDate}
                onChange={(e) => setField('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">End Date</label>
              <Input
                type="date"
                value={inputs.endDate}
                onChange={(e) => setField('endDate', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Actions</CardTitle>
              <Button variant="outline" size="sm" onClick={addAction}>+ Add Action</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-2 font-medium text-gray-600 dark:text-gray-400 w-[22%]">Title</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400 w-[11%]">Category</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400 w-[10%]">Priority</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400 w-[13%]">Owner</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400 w-[12%]">Due Date</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600 dark:text-gray-400 w-[13%]">Est. Impact</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400 w-[12%]">Status</th>
                    <th className="py-2 pl-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {inputs.actions.map((action, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 align-top">
                      <td className="py-2 pr-2">
                        <Input
                          value={action.title}
                          onChange={(e) => updateAction(i, 'title', e.target.value)}
                          placeholder="Action title…"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={action.category}
                          onChange={(e) => updateAction(i, 'category', e.target.value)}
                          className={selectBase}
                        >
                          {CATEGORIES.map(c => (
                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={action.priority}
                          onChange={(e) => updateAction(i, 'priority', e.target.value)}
                          className={`${selectBase} ${priorityColor(action.priority)}`}
                        >
                          {PRIORITIES.map(p => (
                            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          value={action.owner}
                          onChange={(e) => updateAction(i, 'owner', e.target.value)}
                          placeholder="Owner"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="date"
                          value={action.dueDate}
                          onChange={(e) => updateAction(i, 'dueDate', e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          min={0}
                          value={action.estimatedImpact || ''}
                          onChange={(e) => updateAction(i, 'estimatedImpact', num(e.target.value))}
                          placeholder="0"
                          className="text-right"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={action.status}
                          onChange={(e) => updateAction(i, 'status', e.target.value)}
                          className={selectBase}
                        >
                          {STATUSES.map(s => (
                            <option key={s} value={s}>
                              {s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pl-2">
                        <button
                          onClick={() => removeAction(i)}
                          disabled={inputs.actions.length === 1}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30 transition-colors text-lg leading-none"
                          aria-label="Remove action"
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Progress */}
            <Card className="bg-gray-50 dark:bg-gray-800/50">
              <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
              <CardContent>
                <ResultRow label="Total Actions" value={String(outputs.progress.totalActions)} />
                <ResultRow label="Completed" value={String(outputs.progress.completed)} positive={outputs.progress.completed > 0} />
                <ResultRow label="In Progress" value={String(outputs.progress.inProgress)} />
                <ResultRow
                  label="% Complete"
                  value={pct(outputs.progress.percentComplete)}
                  highlight
                  positive={outputs.progress.percentComplete >= 75}
                  negative={outputs.progress.percentComplete < 25}
                />
                {/* Progress bar */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(outputs.progress.percentComplete, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Impact & Timeline */}
            <Card className="bg-gray-50 dark:bg-gray-800/50">
              <CardHeader><CardTitle>Impact & Timeline</CardTitle></CardHeader>
              <CardContent>
                <ResultRow label="Total Estimated Impact" value={fmt(outputs.impact.totalEstimatedImpact, cur)} highlight />
                <ResultRow label="Realized Impact" value={fmt(outputs.impact.realizedImpact, cur)} positive={outputs.impact.realizedImpact > 0} />
                <div className="my-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                  <ResultRow label="Days Remaining" value={`${outputs.timeline.daysRemaining} days`} />
                  <ResultRow
                    label="Time Elapsed"
                    value={pct(outputs.timeline.percentTimeElapsed)}
                    negative={outputs.timeline.percentTimeElapsed > outputs.progress.percentComplete + 20}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Critical Actions */}
            {outputs.criticalActions && outputs.criticalActions.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Critical Actions</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {outputs.criticalActions.map((action: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 shrink-0 font-semibold ${priorityColor(action.priority)}`}>●</span>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{action.title}</p>
                          {action.owner && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Owner: {action.owner}</p>
                          )}
                        </div>
                        <span className={`ml-auto shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(action.status)}`}>
                          {action.status.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {outputs.recommendations && outputs.recommendations.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Recommendations</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {outputs.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </CalculatorPage>
  );
}
