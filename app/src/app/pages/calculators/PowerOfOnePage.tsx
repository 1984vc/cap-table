import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { useCalculatorPage } from '@/hooks/useCalculatorPage';
import { CalculatorPage } from '@/components/calculator/CalculatorPage';
import { ResultRow } from '@/components/calculator/ResultRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PowerOfOneCalculator } from '@library/financial-toolkit/calculators/PowerOfOneCalculator';

const fmt = (n: number, cur = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

type POOInputs = {
  currentRevenue: number;
  currentVolume: number;
  currentPrice: number;
  currentVariableCost: number;
  currentFixedCost: number;
};

const DEFAULT: POOInputs = {
  currentRevenue: 0,
  currentVolume: 0,
  currentPrice: 0,
  currentVariableCost: 0,
  currentFixedCost: 0,
};

export default function PowerOfOnePage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = (activeCompany?.currency ?? 'KES') as Currency;

  const { inputs, setField, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<POOInputs, any>('power-of-one', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId || !activeCompany) return;
    try {
      const result = PowerOfOneCalculator.calculate({
        companyId: activeCompanyId,
        currency: cur,
        currentRevenue: inputs.currentRevenue,
        currentVolume: inputs.currentVolume,
        currentPrice: inputs.currentPrice,
        currentVariableCost: inputs.currentVariableCost,
        currentFixedCost: inputs.currentFixedCost,
      });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <CalculatorPage
      title="Power of One"
      description="See how a 1% improvement in each lever impacts your profit."
      onCalculate={handleCalculate}
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
    >
      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Business Inputs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Current Revenue</label>
            <Input
              type="number"
              min={0}
              value={inputs.currentRevenue || ''}
              onChange={(e) => setField('currentRevenue', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Current Volume (units)</label>
            <Input
              type="number"
              min={0}
              value={inputs.currentVolume || ''}
              onChange={(e) => setField('currentVolume', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Current Price per Unit</label>
            <Input
              type="number"
              min={0}
              value={inputs.currentPrice || ''}
              onChange={(e) => setField('currentPrice', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Variable Cost per Unit</label>
            <Input
              type="number"
              min={0}
              value={inputs.currentVariableCost || ''}
              onChange={(e) => setField('currentVariableCost', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Total Fixed Costs</label>
            <Input
              type="number"
              min={0}
              value={inputs.currentFixedCost || ''}
              onChange={(e) => setField('currentFixedCost', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {outputs && (
        <>
          {/* Current baseline */}
          <Card>
            <CardHeader>
              <CardTitle>Current Position</CardTitle>
            </CardHeader>
            <CardContent>
              <ResultRow label="Current Profit" value={fmt(outputs.currentProfit, cur)} />
              <ResultRow label="Net Margin" value={pct(outputs.currentMargin)} />
            </CardContent>
          </Card>

          {/* Ranked levers table */}
          <Card>
            <CardHeader>
              <CardTitle>Lever Rankings — Impact of 1% Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Rank</th>
                      <th className="pb-2 pr-4 font-medium">Lever</th>
                      <th className="pb-2 pr-4 font-medium">Description</th>
                      <th className="pb-2 pr-4 font-medium text-right">Profit Impact</th>
                      <th className="pb-2 font-medium text-right">% Increase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outputs.rankedLevers?.map(
                      (
                        item: {
                          lever: string;
                          description: string;
                          profitImpact: number;
                          profitImpactPercent: number;
                        },
                        idx: number
                      ) => {
                        const isBest = item.lever === outputs.bestLever?.lever;
                        return (
                          <tr
                            key={item.lever}
                            className={`border-b last:border-0 ${
                              isBest ? 'bg-green-50 font-semibold dark:bg-green-900/20' : ''
                            }`}
                          >
                            <td className="py-2 pr-4">
                              <span
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                                  isBest
                                    ? 'bg-green-500 text-white'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-2 pr-4">
                              {item.lever}
                              {isBest && (
                                <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-800 dark:text-green-200">
                                  Best
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">{item.description}</td>
                            <td className="py-2 pr-4 text-right text-green-600 dark:text-green-400">
                              {fmt(item.profitImpact, cur)}
                            </td>
                            <td className="py-2 text-right">{pct(item.profitImpactPercent)}</td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Combined impact */}
          <Card>
            <CardHeader>
              <CardTitle>Combined Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                If all 4 levers each improve by 1% simultaneously:
              </p>
              <ResultRow
                label="Total Profit Uplift"
                value={fmt(outputs.combinedImpact, cur)}
                highlight
              />
              <ResultRow label="Profit Increase" value={pct(outputs.combinedImpactPercent)} />
            </CardContent>
          </Card>
        </>
      )}
    </CalculatorPage>
  );
}
