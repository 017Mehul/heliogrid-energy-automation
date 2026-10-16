create extension if not exists pgcrypto;

create table if not exists public.automation_leads (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null unique,
  source text not null default 'heliogrid_public_demo',
  mode text not null check (mode in ('sandbox','live')),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  phone text,
  service text not null check (service in ('AI Videos','Websites','Apps','UI/UX')),
  budget text not null check (budget in ('Under ₹10k','₹10k–₹25k','₹25k–₹50k','₹50k+')),
  timeline text not null check (timeline in ('Just exploring','Within 1 month','Within 2 weeks','ASAP')),
  message text check (message is null or char_length(message) <= 2000),
  score integer not null check (score between 0 and 100),
  tier text not null check (tier in ('Hot','Warm','Nurture')),
  routing jsonb not null default '{}'::jsonb,
  integrations jsonb not null default '{}'::jsonb,
  workflow_status text not null,
  created_at timestamptz not null default now()
);

create index if not exists automation_leads_created_at_idx
  on public.automation_leads(created_at desc);
