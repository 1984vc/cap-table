import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { useCalculatorPage } from '@/hooks/useCalculatorPage';
import { CalculatorPage } from '@/components/calculator/CalculatorPage';
import { ResultRow } from '@/components/calculator/ResultRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CapexCalculator } from '@library/financial-toolkit/calculators/CapexCalculator';

const fmt = (n: number, cur = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

const today = new Date().toISOString().slice(0, 10);

type CapexInputs = {
  projectName: string;
  category: 'equipment' | 'facility' | 'technology' | 'vehicle' | 'other';
  budgeted: number;
  startDate: string;
  expectedCompletionDate: string;
  approvalStatus: 'proposed' | 'approved' | 'rejected' | 'on-hold';
  spendToDate: number;
  expectedAnnualBenefit: number;
  expectedUsefulLife: number;
  notes: string;
};

const DEFAULT: CapexInputs = {
  projectName: '',
  category: 'equipment',
  budgeted: 0,
  startDate: today,
  expectedCompletionDate: today,
  approvalStatus: 'proposed',
  spendToDate: 0,
  expectedAnnualBenefit: 0,
  expectedUsefulLife: 5,
  notes: '',
};

const SELECT_CLASS =
  'rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white w-full';

export default function CapexPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = (activeCompany?.currency ?? 'KES') as Currency;

  const { inputs, setField, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<CapexInputs, any>('capex', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId || !activeCompany) return;
    try {
      const result = CapexCalculator.calculate({
        companyId: activeCompanyId,
        currency: cur,
        projectName: inputs.projectName,
        category: inputs.category,
        budgeted: inputs.budgeted,
        startDate: inputs.startDate,
        expectedCompletionDate: inputs.expectedCompletionDate,
        approvalStatus: inputs.approvalStatus,
        spendToDate: inputs.spendToDate,
        expectedAnnualBenefit: inputs.expectedAnnualBenefit,
        expectedUsefulLife: inputs.expectedUsefulLife,
        notes: inputs.notes,
      });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const percentComplete = outputs?.budget?.percentComplete ?? 0;

  return (
    <CalculatorPage
      title="Capital Expenditure (CapEx)"
      description="Track and analyse capital expenditure projects — budget utilisation, timeline and financial returns."
      onCalculate={handleCalculate}
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
    >
      {/* Project details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Project Name</label>
            <Input
              type="text"
              value={inputs.projectName}
              onChange={(e) => setField('projectName', e.target.value)}
              placeholder="e.g. New Production Line"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select
              className={SELECT_CLASS}
              value={inputs.category}
              onChange={(e) => setField('category', e.target.value as CapexInputs['category'])}
            >
              <option value="equipment">Equipment</option>
              <option value="facility">Facility</option>
              <option value="technology">Technology</option>
              <option value="vehicle">Vehicle</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Approval Status</label>
            <select
              className={SELECT_CLASS}
              value={inputs.approvalStatus}
              onChange={(e) =>
                setField('approvalStatus', e.target.value as CapexInputs['approvalStatus'])
              }
            >
              <option value="proposed">Proposed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Start Date</label>
            <Input
              type="date"
              value={inputs.startDate}
              onChange={(e) => setField('startDate', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Expected Completion Date</label>
            <Input
              type="date"
              value={inputs.expectedCompletionDate}
              onChange={(e) => setField('expectedCompletionDate', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Financial inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Total Budget</label>
            <Input
              type="number"
              min={0}
              value={inputs.budgeted || ''}
              onChange={(e) => setField('budgeted', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Spend to Date</label>
            <Input
              type="number"
              min={0}
              value={inputs.spendToDate || ''}
              onChange={(e) => setField('spendToDate', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Expected Annual Benefit</label>
            <Input
              type="number"
              min={0}
              value={inputs.expectedAnnualBenefit || ''}
              onChange={(e) => setField('expectedAnnualBenefit', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Expected Useful Life (years)</label>
            <Input
              type="number"
              min={1}
              value={inputs.expectedUsefulLife || ''}
              onChange={(e) => setField('expectedUsefulLife', parseFloat(e.target.value) || 5)}
              placeholder="5"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <Input
              type="text"
              value={inputs.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {outputs && (
        <>
          {/* Budget utilisation */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Utilisation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResultRow label="Total Budget" value={fmt(outputs.budget.total, cur)} />
              <ResultRow label="Spend to Date" value={fmt(outputs.budget.spendToDate, cur)} />
              <ResultRow label="Remaining Budget" value={fmt(outputs.budget.remaining, cur)} />
              <ResultRow label="Percent Complete" value={pct(percentComplete)} highlight />

              {/* Progress bar */}
              <div className="mt-3">
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      percentComplete >= 100
                        ? 'bg-red-500'
                        : percentComplete >= 80
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(percentComplete, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pct(percentComplete)} of budget utilised
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResultRow label="Status" value={outputs.timeline.status} highlight />
              <ResultRow
                label="Days Remaining"
                value={
                  outputs.timeline.daysRemaining != null
                    ? `${outputs.timeline.daysRemaining} days`
                    : '—'
                }
              />
            </CardContent>
          </Card>

          {/* Financial metrics */}
          {(outputs.financialMetrics?.roi != null ||
            outputs.financialMetrics?.paybackPeriod != null) && (
            <Card>
              <CardHeader>
                <CardTitle>Financial Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {outputs.financialMetrics.roi != null && (
                  <ResultRow
                    label="Return on Investment (ROI)"
                    value={pct(outputs.financialMetrics.roi)}
                    highlight
                  />
                )}
                {outputs.financialMetrics.paybackPeriod != null && (
                  <ResultRow
                    label="Payback Period"
                    value={`${outputs.financialMetrics.paybackPeriod.toFixed(1)} years`}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </CalculatorPage>
  );
}
