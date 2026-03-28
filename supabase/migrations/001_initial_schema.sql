-- Sprint -1A: Initial schema for Financial Toolkit
-- Run this in the Supabase SQL Editor

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- USER PROFILES
-- Auto-populated from Supabase Auth via trigger below
-- ============================================================
create table if not exists user_profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text not null,
  full_name   text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- COMPANIES  (multi-business support)
-- ============================================================
create table if not exists companies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  currency    text not null default 'KES',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- USER → COMPANY MEMBERSHIP
-- ============================================================
create table if not exists user_companies (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references user_profiles(id) on delete cascade not null,
  company_id  uuid references companies(id)     on delete cascade not null,
  role        text not null default 'owner',   -- owner | admin | accountant | editor | viewer
  is_default  boolean default false,
  created_at  timestamptz default now(),
  unique(user_id, company_id)
);

-- ============================================================
-- CALCULATOR RESULTS
-- Stores inputs + outputs as JSONB, scoped to a company
-- ============================================================
create table if not exists calculator_results (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid references companies(id)     on delete cascade not null,
  calculator_type  text not null,
  inputs           jsonb not null,
  outputs          jsonb not null,
  created_by       uuid references user_profiles(id) not null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Indexes for common query patterns
create index if not exists idx_calculator_results_company_type
  on calculator_results(company_id, calculator_type);
create index if not exists idx_calculator_results_created_at
  on calculator_results(created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table user_profiles      enable row level security;
alter table companies          enable row level security;
alter table user_companies     enable row level security;
alter table calculator_results enable row level security;

-- user_profiles: users can only see/update their own profile
create policy "Users can view own profile"
  on user_profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on user_profiles for update using (auth.uid() = id);

-- companies: visible to members only
create policy "Members can view their companies"
  on companies for select using (
    exists (
      select 1 from user_companies
      where user_companies.company_id = companies.id
        and user_companies.user_id    = auth.uid()
    )
  );

create policy "Owners can update their companies"
  on companies for update using (
    exists (
      select 1 from user_companies
      where user_companies.company_id = companies.id
        and user_companies.user_id    = auth.uid()
        and user_companies.role       = 'owner'
    )
  );

-- Allow authenticated users to create companies
create policy "Authenticated users can create companies"
  on companies for insert with check (auth.uid() is not null);

-- user_companies: members can view their memberships
create policy "Users can view own memberships"
  on user_companies for select using (user_id = auth.uid());

create policy "Owners can manage memberships"
  on user_companies for all using (
    user_id = auth.uid()
    or exists (
      select 1 from user_companies uc2
      where uc2.company_id = user_companies.company_id
        and uc2.user_id    = auth.uid()
        and uc2.role       = 'owner'
    )
  );

-- calculator_results: company members can manage their data
create policy "Members can manage calculator results"
  on calculator_results for all using (
    exists (
      select 1 from user_companies
      where user_companies.company_id = calculator_results.company_id
        and user_companies.user_id    = auth.uid()
    )
  );

-- ============================================================
-- TRIGGER: auto-create user_profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FUNCTION: auto-update updated_at timestamps
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_user_profiles_updated_at
  before update on user_profiles
  for each row execute procedure public.set_updated_at();

create trigger set_companies_updated_at
  before update on companies
  for each row execute procedure public.set_updated_at();

create trigger set_calculator_results_updated_at
  before update on calculator_results
  for each row execute procedure public.set_updated_at();
