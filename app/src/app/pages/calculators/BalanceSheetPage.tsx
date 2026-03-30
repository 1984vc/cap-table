import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { useCalculatorPage } from '@/hooks/useCalculatorPage';
import { CalculatorPage } from '@/components/calculator/CalculatorPage';
import { ResultRow } from '@/components/calculator/ResultRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BalanceSheetCalculator } from '@library/financial-toolkit/calculators/BalanceSheetCalculator';

const fmt = (n: number, cur = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

const today = new Date().toISOString().slice(0, 10);

type BSInputs = {
  asOfDate: string;
  // Current Assets
  cashAndEquivalents: number;
  accountsReceivable: number;
  inventory: number;
  prepaidExpenses: number;
  otherCurrentAssets: number;
  // Non-Current Assets
  propertyPlantEquipment: number;
  accumulatedDepreciation: number;
  intangibleAssets: number;
  longTermInvestments: number;
  otherNonCurrentAssets: number;
  // Current Liabilities
  accountsPayable: number;
  shortTermDebt: number;
  accruedExpenses: number;
  deferredRevenue: number;
  otherCurrentLiabilities: number;
  // Non-Current Liabilities
  longTermDebt: number;
  deferredTaxLiabilities: number;
  otherNonCurrentLiabilities: number;
  // Equity
  shareCapital: number;
  retainedEarnings: number;
  otherEquity: number;
};

const DEFAULT: BSInputs = {
  asOfDate: today,
  cashAndEquivalents: 0,
  accountsReceivable: 0,
  inventory: 0,
  prepaidExpenses: 0,
  otherCurrentAssets: 0,
  propertyPlantEquipment: 0,
  accumulatedDepreciation: 0,
  intangibleAssets: 0,
  longTermInvestments: 0,
  otherNonCurrentAssets: 0,
  accountsPayable: 0,
  shortTermDebt: 0,
  accruedExpenses: 0,
  deferredRevenue: 0,
  otherCurrentLiabilities: 0,
  longTermDebt: 0,
  deferredTaxLiabilities: 0,
  otherNonCurrentLiabilities: 0,
  shareCapital: 0,
  retainedEarnings: 0,
  otherEquity: 0,
};

type FieldEntry = { key: keyof BSInputs; label: string };

const ASSET_FIELDS: FieldEntry[] = [
  { key: 'cashAndEquivalents', label: 'Cash & Equivalents' },
  { key: 'accountsReceivable', label: 'Accounts Receivable' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'prepaidExpenses', label: 'Prepaid Expenses' },
  { key: 'otherCurrentAssets', label: 'Other Current Assets' },
  { key: 'propertyPlantEquipment', label: 'Property, Plant & Equipment' },
  { key: 'accumulatedDepreciation', label: 'Accumulated Depreciation' },
  { key: 'intangibleAssets', label: 'Intangible Assets' },
  { key: 'longTermInvestments', label: 'Long-term Investments' },
  { key: 'otherNonCurrentAssets', label: 'Other Non-Current Assets' },
];

const LIABILITY_FIELDS: FieldEntry[] = [
  { key: 'accountsPayable', label: 'Accounts Payable' },
  { key: 'shortTermDebt', label: 'Short-term Debt' },
  { key: 'accruedExpenses', label: 'Accrued Expenses' },
  { key: 'deferredRevenue', label: 'Deferred Revenue' },
  { key: 'otherCurrentLiabilities', label: 'Other Current Liabilities' },
  { key: 'longTermDebt', label: 'Long-term Debt' },
  { key: 'deferredTaxLiabilities', label: 'Deferred Tax Liabilities' },
  { key: 'otherNonCurrentLiabilities', label: 'Other Non-Current Liabilities' },
];

const EQUITY_FIELDS: FieldEntry[] = [
  { key: 'shareCapital', label: 'Share Capital' },
  { key: 'retainedEarnings', label: 'Retained Earnings' },
  { key: 'otherEquity', label: 'Other Equity' },
];

function NumberField({
  label, fieldKey, inputs, setInputs,
}: {
  label: string;
  fieldKey: keyof BSInputs;
  inputs: BSInputs;
  setInputs: (v: BSInputs) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <Input
        type="number"
        min={0}
        value={(inputs[fieldKey] as number) || ''}
        onChange={e => setInputs({ ...inputs, [fieldKey]: parseFloat(e.target.value) || 0 })}
        placeholder="0"
        className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600 h-8 text-sm"
      />
    </div>
  );
}

export default function BalanceSheetPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur: Currency = (activeCompany?.currency as Currency) ?? 'KES';

  const { inputs, setInputs, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<BSInputs, any>('balance-sheet', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId || !activeCompany) return;
    try {
      const result = BalanceSheetCalculator.calculate({ ...inputs, companyId: activeCompanyId, currency: cur });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) { setError(e.message); }
  };

  return (
    <CalculatorPage
      title="Balance Sheet"
      description="Snapshot of assets, liabilities, and equity with key financial ratios."
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
      onCalculate={handleCalculate}
    >
      {/* As-of Date */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-100 text-base">Balance Sheet Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1 max-w-xs">
            <label className="text-xs text-gray-400">As of Date</label>
            <Input
              type="date"
              value={inputs.asOfDate}
              onChange={e => setInputs({ ...inputs, asOfDate: e.target.value })}
              className="bg-gray-800 border-gray-700 text-gray-100"
            />
          </div>
        </CardContent>
      </Card>

      {/* Input Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Assets */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-blue-400 text-base">Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Current Assets</p>
            {ASSET_FIELDS.slice(0, 5).map(f => (
              <NumberField key={f.key} label={f.label} fieldKey={f.key} inputs={inputs} setInputs={setInputs} />
            ))}
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide pt-2">Non-Current Assets</p>
            {ASSET_FIELDS.slice(5).map(f => (
              <NumberField key={f.key} label={f.label} fieldKey={f.key} inputs={inputs} setInputs={setInputs} />
            ))}
          </CardContent>
        </Card>

        {/* Liabilities */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-red-400 text-base">Liabilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Current Liabilities</p>
            {LIABILITY_FIELDS.slice(0, 5).map(f => (
              <NumberField key={f.key} label={f.label} fieldKey={f.key} inputs={inputs} setInputs={setInputs} />
            ))}
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide pt-2">Non-Current Liabilities</p>
            {LIABILITY_FIELDS.slice(5).map(f => (
              <NumberField key={f.key} label={f.label} fieldKey={f.key} inputs={inputs} setInputs={setInputs} />
            ))}
          </CardContent>
        </Card>

        {/* Equity */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-green-400 text-base">Equity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Shareholders' Equity</p>
            {EQUITY_FIELDS.map(f => (
              <NumberField key={f.key} label={f.label} fieldKey={f.key} inputs={inputs} setInputs={setInputs} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {outputs && (
        <>
          {/* Balance Sheet Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Assets Summary */}
            <Card className="bg-gray-900 border-blue-900/50">
              <CardHeader>
                <CardTitle className="text-blue-400 text-base">Asset Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <ResultRow label="Current Assets" value={fmt(outputs.currentAssets?.total ?? 0, cur)} />
                <ResultRow label="Non-Current Assets" value={fmt(outputs.nonCurrentAssets?.total ?? 0, cur)} />
                <ResultRow label="Total Assets" value={fmt(outputs.totalAssets ?? 0, cur)} highlight />
              </CardContent>
            </Card>

            {/* Liabilities Summary */}
            <Card className="bg-gray-900 border-red-900/50">
              <CardHeader>
                <CardTitle className="text-red-400 text-base">Liability Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <ResultRow label="Current Liabilities" value={fmt(outputs.currentLiabilities?.total ?? 0, cur)} />
                <ResultRow label="Non-Current Liabilities" value={fmt(outputs.nonCurrentLiabilities?.total ?? 0, cur)} />
                <ResultRow label="Total Liabilities" value={fmt(outputs.totalLiabilities ?? 0, cur)} highlight />
              </CardContent>
            </Card>

            {/* Equity Summary */}
            <Card className="bg-gray-900 border-green-900/50">
              <CardHeader>
                <CardTitle className="text-green-400 text-base">Equity Total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <ResultRow label="Total Equity" value={fmt(outputs.equity?.total ?? 0, cur)} highlight />
                <ResultRow label="Total Liabilities + Equity" value={fmt(outputs.totalLiabilitiesAndEquity ?? 0, cur)} />
              </CardContent>
            </Card>
          </div>

          {/* Balance Check & Ratios */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100 text-base">Key Ratios & Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <ResultRow label="Current Ratio" value={(outputs.ratios?.currentRatio ?? 0).toFixed(2)} />
              <ResultRow label="Quick Ratio" value={(outputs.ratios?.quickRatio ?? 0).toFixed(2)} />
              <ResultRow label="Debt-to-Equity" value={(outputs.ratios?.debtToEquity ?? 0).toFixed(2)} />
              <div className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                <span className="text-sm text-gray-400">Balance Check</span>
                <span className={`text-sm font-semibold ${outputs.health?.isBalanced ? 'text-green-400' : 'text-red-400'}`}>
                  {outputs.health?.isBalanced ? 'Balanced' : 'Not Balanced'}
                </span>
              </div>
              {outputs.health?.status && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-400">Status</span>
                  <span className="text-sm text-gray-200">{outputs.health.status}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </CalculatorPage>
  );
}
