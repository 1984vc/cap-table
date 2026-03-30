import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { useCalculatorPage } from '@/hooks/useCalculatorPage';
import { CalculatorPage } from '@/components/calculator/CalculatorPage';
import { ResultRow } from '@/components/calculator/ResultRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SustainableGrowthRateCalculator } from '@library/financial-toolkit/calculators/SustainableGrowthRateCalculator';

const fmt = (n: number, cur = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

type SGRInputs = {
  netIncome: number;
  equity: number;
  dividendPayoutRatio: number;
  targetGrowthRate: number;
  totalAssets: number;
  totalRevenue: number;
};

const DEFAULT: SGRInputs = {
  netIncome: 0,
  equity: 0,
  dividendPayoutRatio: 0.3,
  targetGrowthRate: 20,
  totalAssets: 0,
  totalRevenue: 0,
};

export default function SustainableGrowthPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = (activeCompany?.currency ?? 'KES') as Currency;

  const { inputs, setField, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<SGRInputs, any>('sustainable-growth', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId || !activeCompany) return;
    try {
      const result = SustainableGrowthRateCalculator.calculate({
        companyId: activeCompanyId,
        currency: cur,
        netIncome: inputs.netIncome,
        equity: inputs.equity,
        dividendPayoutRatio: inputs.dividendPayoutRatio / 100,
        targetGrowthRate: inputs.targetGrowthRate,
        totalAssets: inputs.totalAssets,
        totalRevenue: inputs.totalRevenue,
      });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const canGrow = outputs?.canGrowWithoutFinancing;

  return (
    <CalculatorPage
      title="Sustainable Growth Rate"
      description="Calculate the maximum growth rate your business can sustain without external financing."
      onCalculate={handleCalculate}
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
    >
      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Inputs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Net Income</label>
            <Input
              type="number"
              min={0}
              value={inputs.netIncome || ''}
              onChange={(e) => setField('netIncome', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Total Equity</label>
            <Input
              type="number"
              min={0}
              value={inputs.equity || ''}
              onChange={(e) => setField('equity', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Dividend Payout Ratio (%)</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={inputs.dividendPayoutRatio || ''}
              onChange={(e) => setField('dividendPayoutRatio', parseFloat(e.target.value) || 0)}
              placeholder="30"
            />
            <p className="mt-1 text-xs text-muted-foreground">Enter as percentage, e.g. 30 for 30%</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Target Growth Rate (%)</label>
            <Input
              type="number"
              min={0}
              value={inputs.targetGrowthRate || ''}
              onChange={(e) => setField('targetGrowthRate', parseFloat(e.target.value) || 0)}
              placeholder="20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Total Assets</label>
            <Input
              type="number"
              min={0}
              value={inputs.totalAssets || ''}
              onChange={(e) => setField('totalAssets', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Total Revenue</label>
            <Input
              type="number"
              min={0}
              value={inputs.totalRevenue || ''}
              onChange={(e) => setField('totalRevenue', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {outputs && (
        <>
          {/* Traffic light status banner */}
          <div
            className={`flex items-center gap-3 rounded-lg p-4 ${
              canGrow
                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
            }`}
          >
            <span
              className={`h-4 w-4 flex-shrink-0 rounded-full ${
                canGrow ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-semibold">
              {canGrow
                ? 'Your business can achieve the target growth rate without external financing.'
                : 'External financing will be required to achieve your target growth rate.'}
            </span>
          </div>

          {/* Key metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResultRow label="Return on Equity (ROE)" value={pct(outputs.roe)} highlight />
              <ResultRow label="Retention Ratio" value={pct(outputs.retentionRatio * 100)} />
              <ResultRow
                label="Sustainable Growth Rate (SGR)"
                value={pct(outputs.sustainableGrowthRate)}
                highlight
              />
              <ResultRow label="Target Growth Rate" value={pct(inputs.targetGrowthRate)} />
              <ResultRow
                label="Growth Gap (SGR − Target)"
                value={pct(outputs.growthGap)}
              />
              {!canGrow && (
                <ResultRow
                  label="External Financing Needed"
                  value={fmt(outputs.externalFinancingNeeded, cur)}
                />
              )}
            </CardContent>
          </Card>

          {/* Analysis */}
          {outputs.analysis && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{outputs.analysis}</p>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {outputs.recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {outputs.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 flex-shrink-0 text-muted-foreground">•</span>
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
