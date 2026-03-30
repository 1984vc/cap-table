import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fmt = (n: number, cur = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

const NAV_ITEMS = [
  { name: 'P&L', path: '/pl', desc: 'Profit & Loss statement', emoji: '📊' },
  { name: 'Cash Forecast', path: '/cash-forecast', desc: '13-week cash flow', emoji: '💧' },
  { name: 'Working Capital', path: '/working-capital', desc: 'DSO · DPO · CCC', emoji: '⚙️' },
  { name: 'Pricing', path: '/pricing', desc: 'Cost-plus · Market · Value', emoji: '🏷️' },
  { name: 'Break-Even', path: '/break-even', desc: 'Min volume to cover costs', emoji: '⚖️' },
  { name: 'Power of One', path: '/power-of-one', desc: '1% improvement impact', emoji: '⚡' },
  { name: 'Sustainable Growth', path: '/sustainable-growth', desc: 'Max growth without funding', emoji: '🌱' },
  { name: 'Founder Salary', path: '/founder-salary', desc: 'What can you afford to pay yourself?', emoji: '👤' },
  { name: 'CAPEX', path: '/capex', desc: 'Capital expenditure & ROI', emoji: '🏗️' },
  { name: 'Payroll Kenya', path: '/payroll', desc: 'PAYE · NHIF · NSSF', emoji: '💼' },
  { name: 'Tax Calendar', path: '/tax-calendar', desc: 'Deadlines & obligations', emoji: '📅' },
  { name: 'KPIs', path: '/kpis', desc: 'Operations metrics vs targets', emoji: '📈' },
  { name: 'Balance Sheet', path: '/balance-sheet', desc: 'Assets, liabilities & equity', emoji: '🏦' },
  { name: 'Budget Variance', path: '/budget-variance', desc: 'Budget vs actuals', emoji: '📋' },
  { name: 'Weekly Review', path: '/weekly-review', desc: 'Weekly performance check-in', emoji: '🗓️' },
  { name: 'Action Plans', path: '/action-plans', desc: '90-day plan tracker', emoji: '✅' },
  { name: 'Cash Leakage', path: '/cash-leakage', desc: 'Identify & rank cash drains', emoji: '🔍' },
];

interface QuickStat { label: string; value: string; sub?: string; color?: string }

export default function DashboardPage() {
  const { activeCompanyId, activeCompany } = useBusiness();
  const cur = activeCompany?.currency ?? 'KES';
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (!activeCompanyId) return;
    loadStats();
  }, [activeCompanyId]);

  const loadStats = async () => {
    // Load latest result for each calculator type we want to surface
    const types = ['pl', 'cash-forecast', 'break-even', 'working-capital'];
    const { data } = await supabase
      .from('calculator_results')
      .select('calculator_type, outputs, created_at')
      .eq('company_id', activeCompanyId)
      .in('calculator_type', types)
      .order('created_at', { ascending: false });

    if (!data) return;

    // Count distinct calculator types that have been used
    const { data: countData } = await supabase
      .from('calculator_results')
      .select('calculator_type')
      .eq('company_id', activeCompanyId);
    if (countData) {
      const distinct = new Set(countData.map((r: any) => r.calculator_type));
      setCompletedCount(distinct.size);
    }

    // Pick latest per type
    const latest: Record<string, any> = {};
    data.forEach((row: any) => {
      if (!latest[row.calculator_type]) latest[row.calculator_type] = row.outputs;
    });

    const newStats: QuickStat[] = [];

    const pl = latest['pl'];
    if (pl?.metrics) {
      newStats.push({
        label: 'Revenue', value: fmt(pl.revenue?.total ?? 0, cur),
        sub: `Net margin ${pct(pl.metrics.netMargin ?? 0)}`,
        color: pl.metrics.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      });
      newStats.push({
        label: 'Net Income', value: fmt(pl.metrics.netIncome ?? 0, cur),
        sub: `EBITDA ${fmt(pl.metrics.ebitda ?? 0, cur)}`,
        color: pl.metrics.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      });
    }

    const cf = latest['cash-forecast'];
    if (cf?.metrics) {
      newStats.push({
        label: 'Cash Flow (13 wk)', value: fmt(cf.metrics.netCashFlow ?? 0, cur),
        sub: `Burn ${fmt(cf.metrics.averageBurnRate ?? 0, cur)}/wk`,
        color: cf.metrics.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      });
    }

    const be = latest['break-even'];
    if (be?.results) {
      newStats.push({
        label: 'Break-Even',
        value: be.results.isAboveBreakEven ? 'Above ✓' : 'Below ✗',
        sub: `B/E revenue ${fmt(be.results.breakEvenRevenue ?? 0, cur)}`,
        color: be.results.isAboveBreakEven ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      });
    }

    setStats(newStats);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        {activeCompany && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {activeCompany.name} · {activeCompany.currency}
          </p>
        )}
      </div>

      {/* Quick stats from latest calculator runs */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className={`text-lg font-bold mt-1 ${s.color ?? 'text-gray-900 dark:text-white'}`}>{s.value}</p>
                {s.sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Progress indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Toolkit Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.round((completedCount / 17) * 100)}%` }}
              />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">
              {completedCount} / 17 calculators used
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Calculator grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          All Calculators
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-400 hover:shadow-sm transition-all dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500"
            >
              <span className="text-xl shrink-0">{item.emoji}</span>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
