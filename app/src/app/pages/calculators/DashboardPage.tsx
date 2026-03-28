import { useBusiness } from '../../contexts/BusinessContext';

export default function DashboardPage() {
  const { activeCompany } = useBusiness();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      {activeCompany && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {activeCompany.name} · {activeCompany.currency}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { name: 'P&L', path: '/pl', desc: 'Profit & Loss statement' },
          { name: 'Cash Forecast', path: '/cash-forecast', desc: '13-week cash flow' },
          { name: 'Working Capital', path: '/working-capital', desc: 'Current assets & liabilities' },
          { name: 'Pricing', path: '/pricing', desc: 'Product pricing models' },
          { name: 'Break-Even', path: '/break-even', desc: 'Break-even analysis' },
          { name: 'Power of One', path: '/power-of-one', desc: '1% improvement impact' },
          { name: 'Sustainable Growth', path: '/sustainable-growth', desc: 'SGR calculation' },
          { name: 'Founder Salary', path: '/founder-salary', desc: 'Founder compensation' },
          { name: 'CAPEX', path: '/capex', desc: 'Capital expenditure' },
          { name: 'Payroll Kenya', path: '/payroll', desc: 'PAYE + NHIF + NSSF' },
          { name: 'Tax Calendar', path: '/tax-calendar', desc: 'Tax deadlines' },
          { name: 'KPIs', path: '/kpis', desc: 'Operations KPIs' },
          { name: 'Balance Sheet', path: '/balance-sheet', desc: 'Assets & liabilities' },
          { name: 'Budget Variance', path: '/budget-variance', desc: 'Budget vs actuals' },
          { name: 'Weekly Review', path: '/weekly-review', desc: 'Weekly performance' },
          { name: 'Action Plans', path: '/action-plans', desc: 'Structured action tracking' },
          { name: 'Cash Leakage', path: '/cash-leakage', desc: 'Identify cash drains' },
        ].map((item) => (
          <a
            key={item.path}
            href={item.path}
            className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-400 hover:shadow-sm transition-all dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500"
          >
            <h3 className="font-medium text-gray-900 dark:text-white">{item.name}</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
