import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { useCalculatorPage } from '@/hooks/useCalculatorPage';
import { CalculatorPage } from '@/components/calculator/CalculatorPage';
import { ResultRow } from '@/components/calculator/ResultRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PayrollCalculator } from '@library/financial-toolkit/calculators/PayrollCalculator';

const fmt = (n: number, cur = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

type PayrollDept = {
  name: string;
  headcount: number;
  totalGrossPay: number;
  totalBenefits: number;
  totalTaxes: number;
};

type PayrollInputs = {
  period: string;
  departments: PayrollDept[];
  totalRevenue: number;
};

const DEFAULT: PayrollInputs = {
  period: new Date().toISOString().slice(0, 7),
  departments: [{ name: 'All Staff', headcount: 1, totalGrossPay: 0, totalBenefits: 0, totalTaxes: 0 }],
  totalRevenue: 0,
};

export default function PayrollPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur: Currency = (activeCompany?.currency as Currency) ?? 'KES';

  const { inputs, setInputs, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<PayrollInputs, any>('payroll', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId || !activeCompany) return;
    try {
      const result = PayrollCalculator.calculate({ ...inputs, companyId: activeCompanyId, currency: cur });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) { setError(e.message); }
  };

  const updateDept = (index: number, field: keyof PayrollDept, value: string | number) => {
    const updated = inputs.departments.map((d, i) =>
      i === index ? { ...d, [field]: value } : d
    );
    setInputs({ ...inputs, departments: updated });
  };

  const addDept = () => {
    setInputs({
      ...inputs,
      departments: [
        ...inputs.departments,
        { name: '', headcount: 1, totalGrossPay: 0, totalBenefits: 0, totalTaxes: 0 },
      ],
    });
  };

  const removeDept = (index: number) => {
    if (inputs.departments.length <= 1) return;
    setInputs({ ...inputs, departments: inputs.departments.filter((_, i) => i !== index) });
  };

  return (
    <CalculatorPage
      title="Payroll Calculator"
      description="Calculate payroll totals, cost per employee, and affordability metrics across departments."
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
      onCalculate={handleCalculate}
    >
      {/* Period & Revenue */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-100 text-base">Payroll Period</CardTitle>
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
            <label className="text-xs text-gray-400">Total Revenue (optional)</label>
            <Input
              type="number"
              min={0}
              value={inputs.totalRevenue || ''}
              onChange={e => setInputs({ ...inputs, totalRevenue: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Department Rows */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-gray-100 text-base">Departments</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={addDept}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
          >
            + Add Row
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left pb-2 pr-2 font-medium">Department</th>
                <th className="text-left pb-2 pr-2 font-medium">Headcount</th>
                <th className="text-left pb-2 pr-2 font-medium">Gross Pay</th>
                <th className="text-left pb-2 pr-2 font-medium">Benefits</th>
                <th className="text-left pb-2 pr-2 font-medium">Taxes</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {inputs.departments.map((dept, i) => (
                <tr key={i}>
                  <td className="py-2 pr-2">
                    <Input
                      value={dept.name}
                      onChange={e => updateDept(i, 'name', e.target.value)}
                      placeholder="Dept name"
                      className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600 h-8 text-xs"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      min={1}
                      value={dept.headcount || ''}
                      onChange={e => updateDept(i, 'headcount', parseInt(e.target.value) || 1)}
                      placeholder="1"
                      className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600 h-8 text-xs w-20"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      min={0}
                      value={dept.totalGrossPay || ''}
                      onChange={e => updateDept(i, 'totalGrossPay', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600 h-8 text-xs w-28"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      min={0}
                      value={dept.totalBenefits || ''}
                      onChange={e => updateDept(i, 'totalBenefits', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600 h-8 text-xs w-28"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      min={0}
                      value={dept.totalTaxes || ''}
                      onChange={e => updateDept(i, 'totalTaxes', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600 h-8 text-xs w-28"
                    />
                  </td>
                  <td className="py-2 text-center">
                    <button
                      onClick={() => removeDept(i)}
                      disabled={inputs.departments.length <= 1}
                      className="text-gray-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
                      aria-label="Remove row"
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
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100 text-base">Payroll Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <ResultRow label="Total Headcount" value={String(outputs.totals?.headcount ?? 0)} />
              <ResultRow label="Total Gross Pay" value={fmt(outputs.totals?.grossPay ?? 0, cur)} />
              <ResultRow label="Total Benefits" value={fmt(outputs.totals?.benefits ?? 0, cur)} />
              <ResultRow label="Total Taxes" value={fmt(outputs.totals?.taxes ?? 0, cur)} />
              <ResultRow label="Total Payroll Cost" value={fmt(outputs.totals?.totalCost ?? 0, cur)} highlight />
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100 text-base">Metrics & Affordability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <ResultRow label="Cost Per Employee" value={fmt(outputs.metrics?.costPerEmployee ?? 0, cur)} />
              {inputs.totalRevenue > 0 && (
                <ResultRow label="Payroll as % of Revenue" value={pct(outputs.metrics?.payrollAsPercentRevenue ?? 0)} />
              )}
              {outputs.affordability?.hiringCapacity !== undefined && (
                <ResultRow label="Hiring Capacity" value={String(outputs.affordability.hiringCapacity)} />
              )}
              {outputs.affordability?.recommendation && (
                <p className="pt-2 text-sm text-gray-300 bg-gray-800 rounded px-3 py-2 mt-2">
                  {outputs.affordability.recommendation}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </CalculatorPage>
  );
}
