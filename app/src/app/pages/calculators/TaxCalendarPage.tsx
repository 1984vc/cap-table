import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { useCalculatorPage } from '@/hooks/useCalculatorPage';
import { CalculatorPage } from '@/components/calculator/CalculatorPage';
import { ResultRow } from '@/components/calculator/ResultRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TaxCalendarCalculator } from '@library/financial-toolkit/calculators/TaxCalendarCalculator';

const fmt = (n: number, cur = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

type TaxObligation = {
  taxType: string;
  jurisdiction: string;
  description: string;
  dueDate: string;
  estimatedAmount: number;
  frequency: string;
  isPaid: boolean;
  notes: string;
};

type TaxCalInputs = {
  fiscalYear: number;
  obligations: TaxObligation[];
};

const DEFAULT: TaxCalInputs = {
  fiscalYear: new Date().getFullYear(),
  obligations: [{
    taxType: 'vat',
    jurisdiction: 'Kenya',
    description: 'Monthly VAT',
    dueDate: '',
    estimatedAmount: 0,
    frequency: 'monthly',
    isPaid: false,
    notes: '',
  }],
};

const TAX_TYPES = ['vat', 'corporate-income', 'payroll', 'property', 'sales', 'other'] as const;
const FREQUENCIES = ['monthly', 'quarterly', 'annually', 'one-time'] as const;

export default function TaxCalendarPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur: Currency = (activeCompany?.currency as Currency) ?? 'KES';

  const { inputs, setInputs, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<TaxCalInputs, any>('tax-calendar', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId || !activeCompany) return;
    try {
      const mapped = inputs.obligations.map(o => ({ ...o, currency: cur }));
      const result = TaxCalendarCalculator.calculate({
        ...inputs,
        obligations: mapped,
        companyId: activeCompanyId,
        currency: cur,
      });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) { setError(e.message); }
  };

  const updateObligation = (index: number, field: keyof TaxObligation, value: string | number | boolean) => {
    const updated = inputs.obligations.map((o, i) =>
      i === index ? { ...o, [field]: value } : o
    );
    setInputs({ ...inputs, obligations: updated });
  };

  const addObligation = () => {
    setInputs({
      ...inputs,
      obligations: [
        ...inputs.obligations,
        {
          taxType: 'vat',
          jurisdiction: 'Kenya',
          description: '',
          dueDate: '',
          estimatedAmount: 0,
          frequency: 'monthly',
          isPaid: false,
          notes: '',
        },
      ],
    });
  };

  const removeObligation = (index: number) => {
    if (inputs.obligations.length <= 1) return;
    setInputs({ ...inputs, obligations: inputs.obligations.filter((_, i) => i !== index) });
  };

  return (
    <CalculatorPage
      title="Tax Calendar"
      description="Track tax obligations, deadlines, and outstanding amounts across all tax types."
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
      onCalculate={handleCalculate}
    >
      {/* Fiscal Year */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-100 text-base">Fiscal Year</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1 max-w-xs">
            <label className="text-xs text-gray-400">Year</label>
            <Input
              type="number"
              min={2000}
              max={2100}
              value={inputs.fiscalYear}
              onChange={e => setInputs({ ...inputs, fiscalYear: parseInt(e.target.value) || new Date().getFullYear() })}
              className="bg-gray-800 border-gray-700 text-gray-100"
            />
          </div>
        </CardContent>
      </Card>

      {/* Obligations */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-gray-100 text-base">Tax Obligations</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={addObligation}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
          >
            + Add Obligation
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {inputs.obligations.map((ob, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">Obligation {i + 1}</span>
                <button
                  onClick={() => removeObligation(i)}
                  disabled={inputs.obligations.length <= 1}
                  className="text-gray-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
                  aria-label="Remove obligation"
                >
                  ✕ Remove
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Tax Type</label>
                  <select
                    value={ob.taxType}
                    onChange={e => updateObligation(i, 'taxType', e.target.value)}
                    className="bg-gray-700 border border-gray-600 text-gray-100 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {TAX_TYPES.map(t => (
                      <option key={t} value={t}>{t.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Frequency</label>
                  <select
                    value={ob.frequency}
                    onChange={e => updateObligation(i, 'frequency', e.target.value)}
                    className="bg-gray-700 border border-gray-600 text-gray-100 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {FREQUENCIES.map(f => (
                      <option key={f} value={f}>{f.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Jurisdiction</label>
                  <Input
                    value={ob.jurisdiction}
                    onChange={e => updateObligation(i, 'jurisdiction', e.target.value)}
                    placeholder="e.g. Kenya"
                    className="bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-600 h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                  <label className="text-xs text-gray-500">Description</label>
                  <Input
                    value={ob.description}
                    onChange={e => updateObligation(i, 'description', e.target.value)}
                    placeholder="e.g. Monthly VAT return"
                    className="bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-600 h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Due Date</label>
                  <Input
                    type="date"
                    value={ob.dueDate}
                    onChange={e => updateObligation(i, 'dueDate', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-gray-100 h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Estimated Amount</label>
                  <Input
                    type="number"
                    min={0}
                    value={ob.estimatedAmount || ''}
                    onChange={e => updateObligation(i, 'estimatedAmount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-600 h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs text-gray-500">Notes</label>
                  <Input
                    value={ob.notes}
                    onChange={e => updateObligation(i, 'notes', e.target.value)}
                    placeholder="Optional notes"
                    className="bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-600 h-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id={`paid-${i}`}
                    checked={ob.isPaid}
                    onChange={e => updateObligation(i, 'isPaid', e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 accent-blue-500"
                  />
                  <label htmlFor={`paid-${i}`} className="text-sm text-gray-300 select-none cursor-pointer">
                    Paid
                  </label>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Results */}
      {outputs && (
        <>
          {/* Alerts */}
          {outputs.alerts && outputs.alerts.length > 0 && (
            <Card className="bg-gray-900 border-red-800">
              <CardHeader>
                <CardTitle className="text-red-400 text-base">Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {outputs.alerts.map((alert: any, i: number) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-sm px-3 py-2 rounded ${
                      alert.severity === 'high'
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : alert.severity === 'medium'
                        ? 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                        : 'bg-gray-800 text-gray-300 border border-gray-700'
                    }`}
                  >
                    <span className="font-medium capitalize">[{alert.severity}]</span>
                    <span>{alert.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100 text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <ResultRow label="Total Obligations" value={String(outputs.summary?.totalObligations ?? 0)} />
              <ResultRow label="Total Estimated Amount" value={fmt(outputs.summary?.totalEstimatedAmount ?? 0, cur)} />
              <ResultRow label="Total Paid" value={fmt(outputs.summary?.totalPaid ?? 0, cur)} />
              <ResultRow label="Total Outstanding" value={fmt(outputs.summary?.totalOutstanding ?? 0, cur)} highlight />
              {(outputs.summary?.overdueCount ?? 0) > 0 && (
                <>
                  <ResultRow label="Overdue Count" value={String(outputs.summary.overdueCount)} />
                  <ResultRow label="Overdue Amount" value={fmt(outputs.summary.overdueAmount, cur)} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Overdue */}
          {outputs.timeline?.overdue && outputs.timeline.overdue.length > 0 && (
            <Card className="bg-gray-900 border-red-900">
              <CardHeader>
                <CardTitle className="text-red-400 text-base">Overdue Obligations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {outputs.timeline.overdue.map((ob: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-red-950/40 border border-red-900 rounded px-3 py-2">
                    <div>
                      <span className="text-red-200 font-medium">{ob.description}</span>
                      <span className="text-red-400 ml-2 text-xs">Due {ob.dueDate}</span>
                    </div>
                    <span className="text-red-300 font-medium">{fmt(ob.estimatedAmount ?? 0, cur)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Next 30 Days */}
          {outputs.timeline?.next30Days && outputs.timeline.next30Days.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-100 text-base">Due in Next 30 Days</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {outputs.timeline.next30Days.map((ob: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-yellow-950/30 border border-yellow-900/50 rounded px-3 py-2">
                    <div>
                      <span className="text-yellow-200 font-medium">{ob.description}</span>
                      <span className="text-yellow-500 ml-2 text-xs">Due {ob.dueDate}</span>
                    </div>
                    <span className="text-yellow-300 font-medium">{fmt(ob.estimatedAmount ?? 0, cur)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </CalculatorPage>
  );
}
