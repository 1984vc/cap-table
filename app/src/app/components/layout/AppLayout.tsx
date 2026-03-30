import { Outlet, NavLink } from 'react-router-dom';
import { BusinessSwitcher } from './BusinessSwitcher';
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/' },
  { name: 'P&L', path: '/pl' },
  { name: 'Cash Forecast', path: '/cash-forecast' },
  { name: 'Working Capital', path: '/working-capital' },
  { name: 'Pricing', path: '/pricing' },
  { name: 'Break-Even', path: '/break-even' },
  { name: 'Power of One', path: '/power-of-one' },
  { name: 'Sustainable Growth', path: '/sustainable-growth' },
  { name: 'Founder Salary', path: '/founder-salary' },
  { name: 'CAPEX', path: '/capex' },
  { name: 'Payroll Kenya', path: '/payroll' },
  { name: 'Tax Calendar', path: '/tax-calendar' },
  { name: 'KPIs', path: '/kpis' },
  { name: 'Balance Sheet', path: '/balance-sheet' },
  { name: 'Budget Variance', path: '/budget-variance' },
  { name: 'Weekly Review', path: '/weekly-review' },
  { name: 'Action Plans', path: '/action-plans' },
  { name: 'Cash Leakage', path: '/cash-leakage' },
];

export function AppLayout() {
  const { user, signOut } = useAuth();
  const { activeCompany } = useBusiness();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700">
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Financial Toolkit</h1>
          {activeCompany && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
              {activeCompany.name}
            </p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                [
                  'block rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-blue-100 font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800',
                ].join(' ')
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Cap Table link */}
        <div className="border-t border-gray-200 px-2 py-2 dark:border-gray-700">
          <a
            href="/cap-table"
            className="block rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            ← Cap Table Tool
          </a>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
          <BusinessSwitcher />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</span>
            <button
              onClick={signOut}
              className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-8">
          {activeCompany ? (
            <Outlet />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create your first business to get started
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use the &ldquo;+ New Business&rdquo; button in the toolbar above.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
