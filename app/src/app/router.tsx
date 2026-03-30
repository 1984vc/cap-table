import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from './components/layout/AuthLayout';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/protected/ProtectedRoute';
import { BusinessProvider } from './contexts/BusinessContext';

import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import CallbackPage from './pages/auth/CallbackPage';

import DashboardPage from './pages/calculators/DashboardPage';
import PLPage from './pages/calculators/PLPage';
import CashForecastPage from './pages/calculators/CashForecastPage';
import WorkingCapitalPage from './pages/calculators/WorkingCapitalPage';
import PricingPage from './pages/calculators/PricingPage';
import BreakEvenPage from './pages/calculators/BreakEvenPage';
import PowerOfOnePage from './pages/calculators/PowerOfOnePage';
import SustainableGrowthPage from './pages/calculators/SustainableGrowthPage';
import FounderSalaryPage from './pages/calculators/FounderSalaryPage';
import CapexPage from './pages/calculators/CapexPage';
import PayrollPage from './pages/calculators/PayrollPage';
import TaxCalendarPage from './pages/calculators/TaxCalendarPage';
import KPIsPage from './pages/calculators/KPIsPage';
import BalanceSheetPage from './pages/calculators/BalanceSheetPage';
import BudgetVariancePage from './pages/calculators/BudgetVariancePage';
import WeeklyReviewPage from './pages/calculators/WeeklyReviewPage';
import ActionPlansPage from './pages/calculators/ActionPlansPage';
import CashLeakagePage from './pages/calculators/CashLeakagePage';

// Cap table page (preserved, no auth required)
import CapTablePage from './cap-table/page';

function ProtectedApp() {
  return (
    <ProtectedRoute>
      <BusinessProvider>
        <AppLayout />
      </BusinessProvider>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  // Public: cap table tool (preserved at /cap-table)
  {
    path: '/cap-table',
    element: <CapTablePage />,
  },

  // Auth routes
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      { path: 'callback', element: <CallbackPage /> },
    ],
  },

  // Protected financial toolkit routes
  {
    path: '/',
    element: <ProtectedApp />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'pl', element: <PLPage /> },
      { path: 'cash-forecast', element: <CashForecastPage /> },
      { path: 'working-capital', element: <WorkingCapitalPage /> },
      { path: 'pricing', element: <PricingPage /> },
      { path: 'break-even', element: <BreakEvenPage /> },
      { path: 'power-of-one', element: <PowerOfOnePage /> },
      { path: 'sustainable-growth', element: <SustainableGrowthPage /> },
      { path: 'founder-salary', element: <FounderSalaryPage /> },
      { path: 'capex', element: <CapexPage /> },
      { path: 'payroll', element: <PayrollPage /> },
      { path: 'tax-calendar', element: <TaxCalendarPage /> },
      { path: 'kpis', element: <KPIsPage /> },
      { path: 'balance-sheet', element: <BalanceSheetPage /> },
      { path: 'budget-variance', element: <BudgetVariancePage /> },
      { path: 'weekly-review', element: <WeeklyReviewPage /> },
      { path: 'action-plans', element: <ActionPlansPage /> },
      { path: 'cash-leakage', element: <CashLeakagePage /> },
    ],
  },
]);
