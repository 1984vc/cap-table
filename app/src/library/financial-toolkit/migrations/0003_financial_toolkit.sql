-- worker/src/db/migrations/0003_financial_toolkit.sql
-- Financial Toolkit Database Schema for Cloudflare D1
-- Migration: Add financial management tables

-- ═══════════════════════════════════════════════════════════════════
-- Companies Table (if not exists from cap table)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════
-- P&L Statements
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE pl_statements (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  period TEXT NOT NULL CHECK(period IN ('monthly', 'quarterly', 'yearly')),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  business_name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  
  -- Financial data (stored as JSON for flexibility)
  data JSON NOT NULL,
  
  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_pl_company ON pl_statements(company_id);
CREATE INDEX idx_pl_dates ON pl_statements(company_id, start_date, end_date);
CREATE INDEX idx_pl_period ON pl_statements(company_id, period);

-- ═══════════════════════════════════════════════════════════════════
-- Cash Forecasts (13-Week Rolling)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE cash_forecasts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  weeks_count INTEGER NOT NULL DEFAULT 13,
  
  -- Full forecast data stored as JSON
  data JSON NOT NULL,
  
  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_forecast_company ON cash_forecasts(company_id);
CREATE INDEX idx_forecast_created ON cash_forecasts(company_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- Break-Even Analyses
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE break_even_analyses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  product_name TEXT,
  
  -- Analysis data stored as JSON
  data JSON NOT NULL,
  
  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_breakeven_company ON break_even_analyses(company_id);
CREATE INDEX idx_breakeven_product ON break_even_analyses(company_id, product_name);

-- ═══════════════════════════════════════════════════════════════════
-- Founder Salary Calculations
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE founder_salary_calcs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  
  -- Calculation data stored as JSON
  data JSON NOT NULL,
  
  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_salary_company ON founder_salary_calcs(company_id);
CREATE INDEX idx_salary_created ON founder_salary_calcs(company_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- Pricing Analyses
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE pricing_analyses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  
  -- Pricing data stored as JSON
  data JSON NOT NULL,
  
  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_pricing_company ON pricing_analyses(company_id);
CREATE INDEX idx_pricing_product ON pricing_analyses(company_id, product_name);

-- ═══════════════════════════════════════════════════════════════════
-- Cash Leakages
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE cash_leakages (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  leak_type TEXT NOT NULL,
  monthly_impact REAL NOT NULL,
  frequency INTEGER NOT NULL CHECK(frequency BETWEEN 1 AND 5),
  severity INTEGER NOT NULL CHECK(severity BETWEEN 1 AND 5),
  risk_score REAL NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'addressed', 'monitoring')),
  
  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_leakage_company ON cash_leakages(company_id);
CREATE INDEX idx_leakage_status ON cash_leakages(company_id, status);
CREATE INDEX idx_leakage_risk ON cash_leakages(company_id, risk_score DESC);

-- ═══════════════════════════════════════════════════════════════════
-- Weekly Reviews
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE weekly_reviews (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  week_number INTEGER NOT NULL CHECK(week_number BETWEEN 1 AND 52),
  year INTEGER NOT NULL,
  
  -- Review data stored as JSON
  data JSON NOT NULL,
  
  -- Quick access fields
  completed BOOLEAN NOT NULL DEFAULT 0,
  completed_at INTEGER,
  
  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, year, week_number)
);

CREATE INDEX idx_review_company_date ON weekly_reviews(company_id, year DESC, week_number DESC);
CREATE INDEX idx_review_completed ON weekly_reviews(company_id, completed);

-- ═══════════════════════════════════════════════════════════════════
-- 90-Day Action Plans
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE action_plans (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  
  -- Plan data stored as JSON (goals + weeks)
  data JSON NOT NULL,
  
  -- Quick access fields
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'abandoned')),
  percent_complete INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_plan_company ON action_plans(company_id);
CREATE INDEX idx_plan_status ON action_plans(company_id, status);
CREATE INDEX idx_plan_dates ON action_plans(company_id, start_date, end_date);

-- ═══════════════════════════════════════════════════════════════════
-- Late Payments Tracker
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE late_payments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  amount REAL NOT NULL,
  invoice_date TEXT NOT NULL,
  days_late INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'collected', 'written_off')),
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK(urgency IN ('low', 'medium', 'high')),
  notes TEXT,
  
  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  collected_at INTEGER,
  deleted_at INTEGER,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_company ON late_payments(company_id);
CREATE INDEX idx_payment_status ON late_payments(company_id, status);
CREATE INDEX idx_payment_urgency ON late_payments(company_id, urgency, days_late DESC);
CREATE INDEX idx_payment_invoice ON late_payments(company_id, invoice_date);

-- ═══════════════════════════════════════════════════════════════════
-- Audit Log (optional - for tracking all changes)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE financial_audit_log (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete')),
  user_id TEXT,
  changes JSON,
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_company ON financial_audit_log(company_id);
CREATE INDEX idx_audit_table ON financial_audit_log(table_name, record_id);
CREATE INDEX idx_audit_created ON financial_audit_log(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- User Permissions (if not exists from cap table)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_users (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK(permission IN ('view', 'edit', 'admin')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_users ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies ON company_users(user_id);
