import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { useCalculatorPage } from '@/hooks/useCalculatorPage';
import { CalculatorPage } from '@/components/calculator/CalculatorPage';
import { ResultRow } from '@/components/calculator/ResultRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OperationsKPICalculator } from '@library/financial-toolkit/calculators/OperationsKPICalculator';

const fmt = (n: number, cur = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

type KPIItem = {
  name: string;
  category: string;
  value: number;
  unit: string;
  target: number;
};

type KPIInputs = {
  period: string;
  industry: string;
  kpis: KPIItem[];
};

const DEFAULT: KPIInputs = {
  period: new Date().toISOString().slice(0, 7),
  industry: 'services',
  kpis: [{ name: 'Revenue Growth', category: 'growth', value: 0, unit: '%', target: 0 }],
};

const INDUSTRIES = ['automotive', 'saas', 'manufacturing', 'retail', 'services', 'custom'] as const;
const CATEGORIES = ['production', 'quality', 'delivery', 'efficiency', 'growth', 'engagement'] as const;

const statusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'on track':
    case 'good':
    case 'excellent': return 'text-green-400';
    case 'at risk':
    case 'warning': return 'text-yellow-400';
    case 'off track':
    case 'critical': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

export default function KPIsPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur: Currency = (activeCompany?.currency as Currency) ?? 'KES';

  const { inputs, setInputs, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<KPIInputs, any>('kpis', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId || !activeCompany) return;
    try {
      const result = OperationsKPICalculator.calculate({ ...inputs, companyId: activeCompanyId, currency: cur });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) { setError(e.message); }
  };

  const updateKPI = (index: number, field: keyof KPIItem, value: string | number) => {
    const updated = inputs.kpis.map((k, i) =>
      i === index ? { ...k, [field]: value } : k
    );
    setInputs({ ...inputs, kpis: updated });
  };

  const addKPI = () => {
    setInputs({
      ...inputs,
      kpis: [...inputs.kpis, { name: '', category: 'growth', value: 0, unit: '', target: 0 }],
    });
  };

  const removeKPI = (index: number) => {
    if (inputs.kpis.length <= 1) return;
    setInputs({ ...inputs, kpis: inputs.kpis.filter((_, i) => i !== index) });
  };

  return (
    <CalculatorPage
      title="Operations KPIs"
      description="Track key performance indicators, compare against targets, and identify areas needing attention."
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
      onCalculate={handleCalculate}
    >
      {/* Period & Industry */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-100 text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Period (YYYY-MM)</label>
            <Input
              type="month"
              value={inputs.period}
              onChange={e => setInputs({ ...inputs, period: e.target.value })}
              className="bg-gray-800 border-gray-700 text-gray-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Industry</label>
            <select
              value={inputs.industry}
              onChange={e => setInputs({ ...inputs, industry: e.target.value })}
              className="bg-gray-800 border border-gray-700 text-gray-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {INDUSTRIES.map(ind => (
                <option key={ind} value={ind}>
                  {ind.replace(/\b\w/g, c => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Rows */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-gray-100 text-base">KPI Items</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={addKPI}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
          >
            + Add KPI
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left pb-2 pr-2 font-medium">Name</th>
                <th className="text-left pb-2 pr-2 font-medium">Category</th>
                <th className="text-left pb-2 pr-2 font-medium">Value</th>
                <th className="text-left pb-2 pr-2 font-medium">Unit</th>
                <th className="text-left pb-2 pr-2 font-medium">Target</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {inputs.kpis.map((kpi, i) => (
                <tr key={i}>
                  <td className="py-2 pr-2">
                    <Input
                      value={kpi.name}
                      onChange={e => updateKPI(i, 'name', e.target.value)}
                      placeholder="KPI name"
                      className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600 h-8 text-xs"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={kpi.category}
                      onChange={e => updateKPI(i, 'category', e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-gray-100 rounded-md px-2 py-1 text-xs h-8 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat.replace(/\b\w/g, c => c.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      value={kpi.value || ''}
                      onChange={e => updateKPI(i, 'value', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600 h-8 text-xs w-24"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      value={kpi.unit}
                      onChange={e => updateKPI(i, 'unit', e.target.value)}
                      placeholder="%"
                      className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600 h-8 text-xs w-16"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      value={kpi.target || ''}
                      onChange={e => updateKPI(i, 'target', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600 h-8 text-xs w-24"
                    />
                  </td>
                  <td className="py-2 text-center">
                    <button
                      onClick={() => removeKPI(i)}
                      disabled={inputs.kpis.length <= 1}
                      className="text-gray-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
                      aria-label="Remove KPI"
                    >
                      ✕
                    </button>
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
          {/* Performance Summary */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100 text-base">Performance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <ResultRow label="Total KPIs" value={String(outputs.performance?.totalKPIs ?? 0)} />
              <ResultRow label="Metrics On Track" value={String(outputs.performance?.metricsOnTrack ?? 0)} />
              <ResultRow label="% Meeting Target" value={pct(outputs.performance?.percentMeetingTarget ?? 0)} />
              <div className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                <span className="text-sm text-gray-400">Overall Status</span>
                <span className={`text-sm font-semibold ${statusColor(outputs.performance?.overallStatus)}`}>
                  {outputs.performance?.overallStatus ?? '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          {outputs.topPerformers && outputs.topPerformers.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-green-400 text-base">Top Performers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {outputs.topPerformers.map((kpi: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-green-950/30 border border-green-900/50 rounded px-3 py-2">
                    <span className="text-green-200 font-medium">{kpi.name}</span>
                    <span className="text-green-300">
                      {kpi.value}{kpi.unit} <span className="text-green-600 text-xs">/ target {kpi.target}{kpi.unit}</span>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Needs Attention */}
          {outputs.needsAttention && outputs.needsAttention.length > 0 && (
            <Card className="bg-gray-900 border-yellow-900/50">
              <CardHeader>
                <CardTitle className="text-yellow-400 text-base">Needs Attention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {outputs.needsAttention.map((kpi: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-yellow-950/30 border border-yellow-900/50 rounded px-3 py-2">
                    <span className="text-yellow-200 font-medium">{kpi.name}</span>
                    <span className="text-yellow-300">
                      {kpi.value}{kpi.unit} <span className="text-yellow-600 text-xs">/ target {kpi.target}{kpi.unit}</span>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {outputs.recommendations && outputs.recommendations.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-100 text-base">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {outputs.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </CalculatorPage>
  );
}
