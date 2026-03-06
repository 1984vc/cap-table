-- worker/src/db/migrations/0005_phase2_calculators.sql
-- Phase 2 Calculator Tables: CAPEX, Payroll, Tax Calendar, Operations KPIs
-- Production-ready with indexes and constraints

-- ═══════════════════════════════════════════════════════════════════
-- CAPEX PROJECTS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS capex_projects (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('equipment', 'facility', 'technology', 'vehicle', 'other')),
  
  -- Complete project data stored as JSON
  data JSON NOT NULL,
  
  -- Quick access fields
  budgeted REAL NOT NULL CHECK(budgeted > 0),
  spend_to_date REAL NOT NULL DEFAULT 0 CHECK(spend_to_date >= 0),
  percent_complete REAL NOT NULL DEFAULT 0,
  
  start_date TEXT NOT NULL,
  expected_completion_date TEXT NOT NULL,
  timeline_status TEXT CHECK(timeline_status IN ('on-track', 'at-risk', 'delayed', 'complete')),
  days_remaining INTEGER,
  
  approval_status TEXT NOT NULL CHECK(approval_status IN ('proposed', 'approved', 'rejected', 'on-hold')),
  approved_by TEXT,
  approval_date TEXT,
  
  roi REAL, -- Return on Investment %
  payback_period REAL, -- Years
  
  -- Metadata
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_capex_company ON capex_projects(company_id);
CREATE INDEX idx_capex_status ON capex_projects(company_id, timeline_status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_capex_approval ON capex_projects(company_id, approval_status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_capex_roi ON capex_projects(company_id, roi DESC)
  WHERE deleted_at IS NULL AND roi IS NOT NULL;
CREATE INDEX idx_capex_overbudget ON capex_projects(company_id, percent_complete DESC)
  WHERE deleted_at IS NULL AND percent_complete > 100;
CREATE INDEX idx_capex_category ON capex_projects(company_id, category)
  WHERE deleted_at IS NULL;

-- View for active projects
CREATE VIEW active_capex_projects AS
SELECT * FROM capex_projects WHERE deleted_at IS NULL;

-- View for projects needing attention
CREATE VIEW capex_needs_attention AS
SELECT * FROM capex_projects 
WHERE deleted_at IS NULL 
  AND (timeline_status IN ('delayed', 'at-risk') OR percent_complete > 110);

-- ═══════════════════════════════════════════════════════════════════
-- PAYROLL SUMMARIES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payroll_summaries (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  period TEXT NOT NULL, -- e.g., "2026-01"
  currency TEXT NOT NULL DEFAULT 'KES',
  
  -- Complete payroll data stored as JSON
  data JSON NOT NULL,
  
  -- Quick access fields
  total_headcount INTEGER NOT NULL CHECK(total_headcount >= 0),
  total_cost REAL NOT NULL CHECK(total_cost >= 0),
  cost_per_employee REAL NOT NULL CHECK(cost_per_employee >= 0),
  payroll_percent_revenue REAL, -- Can be NULL if revenue not provided
  
  max_affordable_headcount INTEGER,
  hiring_capacity INTEGER,
  
  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, period)
);

-- Indexes
CREATE INDEX idx_payroll_company ON payroll_summaries(company_id);
CREATE INDEX idx_payroll_period ON payroll_summaries(company_id, period DESC);
CREATE INDEX idx_payroll_percent ON payroll_summaries(company_id, payroll_percent_revenue DESC)
  WHERE deleted_at IS NULL AND payroll_percent_revenue IS NOT NULL;
CREATE INDEX idx_payroll_high ON payroll_summaries(company_id, payroll_percent_revenue)
  WHERE deleted_at IS NULL AND payroll_percent_revenue > 50;
CREATE INDEX idx_payroll_latest ON payroll_summaries(company_id, period DESC, deleted_at)
  WHERE deleted_at IS NULL;

-- View for active records
CREATE VIEW active_payroll_summaries AS
SELECT * FROM payroll_summaries WHERE deleted_at IS NULL;

-- View for high payroll % companies
CREATE VIEW high_payroll_cost_companies AS
SELECT * FROM payroll_summaries
WHERE deleted_at IS NULL AND payroll_percent_revenue > 50;

-- ═══════════════════════════════════════════════════════════════════
-- TAX CALENDARS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tax_calendars (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL CHECK(fiscal_year >= 2000 AND fiscal_year <= 2100),
  currency TEXT NOT NULL DEFAULT 'KES',
  
  -- Complete tax calendar data stored as JSON
  data JSON NOT NULL,
  
  -- Quick access fields
  total_obligations INTEGER NOT NULL DEFAULT 0,
  total_estimated_amount REAL NOT NULL DEFAULT 0,
  total_paid REAL NOT NULL DEFAULT 0,
  total_outstanding REAL NOT NULL DEFAULT 0,
  overdue_count INTEGER NOT NULL DEFAULT 0,
  overdue_amount REAL NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, fiscal_year)
);

-- Indexes
CREATE INDEX idx_tax_company ON tax_calendars(company_id);
CREATE INDEX idx_tax_year ON tax_calendars(company_id, fiscal_year DESC);
CREATE INDEX idx_tax_overdue ON tax_calendars(company_id, overdue_count DESC)
  WHERE deleted_at IS NULL AND overdue_count > 0;
CREATE INDEX idx_tax_outstanding ON tax_calendars(company_id, total_outstanding DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_tax_latest ON tax_calendars(company_id, fiscal_year DESC, deleted_at)
  WHERE deleted_at IS NULL;

-- View for active records
CREATE VIEW active_tax_calendars AS
SELECT * FROM tax_calendars WHERE deleted_at IS NULL;

-- View for companies with overdue taxes
CREATE VIEW companies_with_overdue_taxes AS
SELECT * FROM tax_calendars 
WHERE deleted_at IS NULL AND overdue_count > 0
ORDER BY overdue_amount DESC;

-- ═══════════════════════════════════════════════════════════════════
-- OPERATIONS KPI SNAPSHOTS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS operations_kpi_snapshots (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  period TEXT NOT NULL,
  industry TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  
  -- Complete KPI data stored as JSON
  data JSON NOT NULL,
  
  -- Quick access fields
  total_kpis INTEGER NOT NULL DEFAULT 0,
  meets_target INTEGER NOT NULL DEFAULT 0,
  percent_meeting_target REAL NOT NULL DEFAULT 0,
  overall_status TEXT CHECK(overall_status IN ('excellent', 'good', 'needs-improvement', 'poor')),
  
  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, period)
);

-- Indexes
CREATE INDEX idx_ops_kpi_company ON operations_kpi_snapshots(company_id);
CREATE INDEX idx_ops_kpi_period ON operations_kpi_snapshots(company_id, period DESC);
CREATE INDEX idx_ops_kpi_status ON operations_kpi_snapshots(company_id, overall_status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ops_kpi_industry ON operations_kpi_snapshots(industry)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ops_kpi_performance ON operations_kpi_snapshots(company_id, percent_meeting_target DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ops_kpi_poor ON operations_kpi_snapshots(company_id, overall_status)
  WHERE deleted_at IS NULL AND overall_status IN ('poor', 'needs-improvement');

-- View for active records
CREATE VIEW active_operations_kpi_snapshots AS
SELECT * FROM operations_kpi_snapshots WHERE deleted_at IS NULL;

-- View for poor performing operations
CREATE VIEW poor_operational_performance AS
SELECT * FROM operations_kpi_snapshots
WHERE deleted_at IS NULL AND overall_status IN ('poor', 'needs-improvement')
ORDER BY percent_meeting_target ASC;

-- ═══════════════════════════════════════════════════════════════════
-- HELPER VIEWS - Cross-Module Queries
-- ═══════════════════════════════════════════════════════════════════

-- Complete company operations dashboard
CREATE VIEW company_operations_dashboard AS
SELECT 
  c.id as company_id,
  c.name as company_name,
  (SELECT COUNT(*) FROM active_capex_projects WHERE company_id = c.id AND approval_status = 'approved') as active_capex_projects,
  (SELECT SUM(budgeted - spend_to_date) FROM active_capex_projects WHERE company_id = c.id) as capex_remaining,
  (SELECT total_headcount FROM active_payroll_summaries WHERE company_id = c.id ORDER BY period DESC LIMIT 1) as current_headcount,
  (SELECT payroll_percent_revenue FROM active_payroll_summaries WHERE company_id = c.id ORDER BY period DESC LIMIT 1) as payroll_percent,
  (SELECT overdue_count FROM active_tax_calendars WHERE company_id = c.id ORDER BY fiscal_year DESC LIMIT 1) as overdue_taxes,
  (SELECT overall_status FROM active_operations_kpi_snapshots WHERE company_id = c.id ORDER BY period DESC LIMIT 1) as ops_status
FROM companies c;

-- Projects over budget or delayed
CREATE VIEW projects_in_trouble AS
SELECT 
  company_id,
  project_name,
  category,
  budgeted,
  spend_to_date,
  percent_complete,
  timeline_status,
  days_remaining,
  CASE 
    WHEN percent_complete > 100 THEN 'Over Budget'
    WHEN timeline_status = 'delayed' THEN 'Delayed'
    WHEN timeline_status = 'at-risk' THEN 'At Risk'
  END as issue_type
FROM active_capex_projects
WHERE timeline_status IN ('delayed', 'at-risk') OR percent_complete > 100
ORDER BY 
  CASE timeline_status WHEN 'delayed' THEN 1 WHEN 'at-risk' THEN 2 ELSE 3 END,
  percent_complete DESC;

-- ═══════════════════════════════════════════════════════════════════
-- UPDATE SCHEMA MIGRATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO schema_migrations (version, applied_at, checksum, description)
VALUES (
  '0005_phase2_calculators',
  unixepoch(),
  'phase2_complete',
  'Phase 2: CAPEX, Payroll, Tax Calendar, Operations KPI calculators'
);

-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════

-- Phase 2 adds 4 new tables:
-- - capex_projects (22 tables total now)
-- - payroll_summaries
-- - tax_calendars
-- - operations_kpi_snapshots

-- Plus 4 active record views:
-- - active_capex_projects
-- - active_payroll_summaries
-- - active_tax_calendars
-- - active_operations_kpi_snapshots

-- Plus 6 helper views:
-- - capex_needs_attention
-- - high_payroll_cost_companies
-- - companies_with_overdue_taxes
-- - poor_operational_performance
-- - company_operations_dashboard
-- - projects_in_trouble

-- Total indexes added: 22 new indexes for optimal query performance
