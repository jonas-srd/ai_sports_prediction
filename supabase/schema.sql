-- Purpose: Creates the core tables for the LLM Kicktipp MVP.
-- Run this SQL in the Supabase SQL editor before running the cron jobs.

create table if not exists public.models (
  id text primary key,
  name text not null,
  provider text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id text primary key,
  utc_date timestamptz not null,
  competition text not null,
  home_team text not null,
  away_team text not null,
  status text not null default 'SCHEDULED',
  home_score integer,
  away_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches(id) on delete cascade,
  model_id text not null references public.models(id) on delete cascade,
  predicted_home integer not null,
  predicted_away integer not null,
  confidence numeric,
  reason text,
  raw_response jsonb not null,
  created_at timestamptz not null default now(),
  unique (match_id, model_id)
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  points integer not null,
  reason text not null,
  scored_at timestamptz not null default now(),
  unique (prediction_id)
);

insert into public.models (id, name, provider, active) values
  ('openai/gpt-4o', 'GPT-4o', 'OpenAI', true),
  ('anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet', 'Anthropic', true),
  ('google/gemini-pro-1.5', 'Gemini Pro 1.5', 'Google', true),
  ('x-ai/grok-2', 'Grok 2', 'xAI', true),
  ('meta-llama/llama-3.1-70b-instruct', 'Llama 3.1 70B', 'Meta', true),
  ('mistralai/mistral-large', 'Mistral Large', 'Mistral', true),
  ('deepseek/deepseek-chat', 'DeepSeek Chat', 'DeepSeek', true),
  ('perplexity/llama-3.1-sonar-large-128k-online', 'Perplexity Sonar Large', 'Perplexity', true)
on conflict (id) do update set
  name = excluded.name,
  provider = excluded.provider,
  active = excluded.active;
