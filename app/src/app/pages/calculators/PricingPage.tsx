import { useBusiness } from '@/contexts/BusinessContext';
import type { Currency } from '@library/financial-toolkit/types';
import { PricingCalculator } from '@library/financial-toolkit/calculators/PricingCalculator';
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

type PricingInputs = {
  productName: string;
  costPerUnit: number; desiredMarkup: number;
  competitor1: number; competitor2: number; competitor3: number;
  customerProblemCost: number; solutionPercentage: number;
};
const DEFAULT: PricingInputs = {
  productName: '', costPerUnit: 0, desiredMarkup: 0.5,
  competitor1: 0, competitor2: 0, competitor3: 0,
  customerProblemCost: 0, solutionPercentage: 0.3,
};

export default function PricingPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = (activeCompany?.currency ?? 'KES') as Currency;

  const { inputs, setField, outputs, setOutputs, loading, saving, lastSaved, setError, saveResult } =
    useCalculatorPage<PricingInputs, any>('pricing', DEFAULT);

  const handleCalculate = async () => {
    if (!activeCompanyId || !activeCompany) return;
    try {
      const result = PricingCalculator.calculate({
        companyId: activeCompanyId,
        productName: inputs.productName,
        costPerUnit: inputs.costPerUnit,
        desiredMarkup: inputs.desiredMarkup,
        competitor1: inputs.competitor1,
        competitor2: inputs.competitor2,
        competitor3: inputs.competitor3,
        customerProblemCost: inputs.customerProblemCost,
        solutionPercentage: inputs.solutionPercentage,
      });
      setOutputs(result);
      await saveResult(inputs, result);
    } catch (e: any) { setError(e.message); }
  };

  const numField = (label: string, key: keyof PricingInputs, placeholder = '0', step?: string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <Input
        type="number"
        min={0}
        step={step}
        value={(inputs[key] as number) || ''}
        onChange={(e) => setField(key, num(e.target.value))}
        placeholder={placeholder}
      />
    </div>
  );

  if (loading) return <div className="p-4 text-gray-500">Loading…</div>;

  return (
    <CalculatorPage
      title="Pricing Calculator"
      description="Cost-plus, market-rate, and value-based pricing models with margin analysis and recommendations."
      onCalculate={handleCalculate}
      calculating={false}
      saving={saving}
      lastSaved={lastSaved}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Product & Cost */}
        <Card>
          <CardHeader><CardTitle>Product & Cost</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product Name</label>
              <Input
                type="text"
                value={inputs.productName}
                onChange={(e) => setField('productName', e.target.value)}
                placeholder="e.g. Monthly SaaS Plan"
              />
            </div>
            {numField('Cost Per Unit', 'costPerUnit')}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Desired Markup <span className="text-gray-400">(e.g. 0.5 = 50%)</span>
              </label>
              <Input
                type="number"
                min={0}
                max={10}
                step="0.01"
                value={inputs.desiredMarkup || ''}
                onChange={(e) => setField('desiredMarkup', num(e.target.value))}
                placeholder="0.50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Competitor Prices */}
        <Card>
          <CardHeader><CardTitle>Competitor Prices</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Enter up to three competitor prices for market-rate benchmarking</p>
            {numField('Competitor 1', 'competitor1')}
            {numField('Competitor 2', 'competitor2')}
            {numField('Competitor 3', 'competitor3')}
          </CardContent>
        </Card>

        {/* Value-Based Inputs */}
        <Card>
          <CardHeader><CardTitle>Value-Based Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Estimate the customer's problem cost and the fraction your solution resolves
            </p>
            {numField('Customer Problem Cost', 'customerProblemCost')}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Solution Percentage <span className="text-gray-400">(e.g. 0.3 = 30%)</span>
              </label>
              <Input
                type="number"
                min={0}
                max={1}
                step="0.01"
                value={inputs.solutionPercentage || ''}
                onChange={(e) => setField('solutionPercentage', num(e.target.value))}
                placeholder="0.30"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {outputs && (
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <CardHeader><CardTitle>Pricing Results</CardTitle></CardHeader>
            <CardContent>
              {/* Three pricing methods */}
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Pricing Methods</p>
              <ResultRow
                label="Cost-Plus Price"
                value={fmt(outputs.methods?.costPlus ?? 0, cur)}
                indent
              />
              <ResultRow
                label="Market Rate Price"
                value={fmt(outputs.methods?.marketRate ?? 0, cur)}
                indent
              />
              <ResultRow
                label="Value-Based Price"
                value={fmt(outputs.methods?.valueBased ?? 0, cur)}
                indent
              />

              <div className="my-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <ResultRow
                  label="Anchor Price"
                  value={fmt(outputs.anchorPrice ?? 0, cur)}
                  highlight
                  positive
                />
                <ResultRow
                  label="Minimum Price"
                  value={fmt(outputs.minimumPrice ?? 0, cur)}
                  highlight
                />
              </div>

              <div className="my-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <ResultRow
                  label="Margin %"
                  value={pct(outputs.analysis?.marginPercent ?? 0)}
                  positive={(outputs.analysis?.marginPercent ?? 0) >= 30}
                  negative={(outputs.analysis?.marginPercent ?? 0) < 10}
                />
              </div>

              {outputs.analysis?.recommendation && (
                <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Recommendation</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {outputs.analysis.recommendation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </CalculatorPage>
  );
}
