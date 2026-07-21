-- EasytPack schema（本期草稿，下期在 SQL Editor / migration 执行）
-- 图片桶：Storage UI 创建 style-images（或 pack-assets）

-- ========== 工艺包主表（扩展现有 tech_packs）==========
create table if not exists tech_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  style_no text,
  title text not null default '未命名款式',
  category text default 't-shirt',
  status text default 'draft',
  workflow_status text default 'draft',
  canvas_data jsonb default '{}',
  process_items jsonb default '[]',
  bom_items jsonb default '[]',
  size_chart jsonb default '{}',
  intake jsonb default '{}',
  questionnaire jsonb default '{}',
  style_review text,
  export_history jsonb default '[]',
  consent_quality_pool boolean default false,
  finalized_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tech_packs_updated_at on tech_packs;
create trigger tech_packs_updated_at
  before update on tech_packs
  for each row execute function update_updated_at();

alter table tech_packs enable row level security;

drop policy if exists "用户只能访问自己的工艺包" on tech_packs;
create policy "用户只能访问自己的工艺包"
  on tech_packs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========== 版本快照（AI 初稿 / 定稿）==========
create table if not exists pack_versions (
  id uuid primary key default gen_random_uuid(),
  tech_pack_id uuid not null references tech_packs(id) on delete cascade,
  user_id uuid references auth.users(id),
  kind text not null check (kind in ('ai_draft', 'user_checkpoint', 'user_final')),
  snapshot jsonb not null default '{}',
  source_action text,
  created_at timestamptz default now()
);

create index if not exists pack_versions_pack_idx on pack_versions (tech_pack_id, created_at desc);

alter table pack_versions enable row level security;
drop policy if exists "用户只能访问自己的版本" on pack_versions;
create policy "用户只能访问自己的版本"
  on pack_versions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========== AI 事件流（训练/质量）==========
create table if not exists ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  tech_pack_id uuid references tech_packs(id) on delete set null,
  action text not null,
  category text,
  photo_type text,
  provider text,
  model text,
  ai_output jsonb,
  user_final jsonb,
  correction_text text,
  outcome text check (outcome in ('accepted', 'edited', 'regenerated', 'discarded', 'error', 'pending')),
  image_refs text[] default '{}',
  consent boolean default false,
  created_at timestamptz default now()
);

create index if not exists ai_events_user_idx on ai_events (user_id, created_at desc);
create index if not exists ai_events_action_idx on ai_events (action, created_at desc);

alter table ai_events enable row level security;
drop policy if exists "用户只能访问自己的 AI 事件" on ai_events;
create policy "用户只能访问自己的 AI 事件"
  on ai_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========== AI 用量（订阅额度）==========
create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  action text not null,
  units int not null default 1,
  tech_pack_id uuid references tech_packs(id) on delete set null,
  ok boolean not null default true,
  provider text,
  model text,
  created_at timestamptz default now()
);

create index if not exists ai_usage_user_idx on ai_usage (user_id, created_at desc);

alter table ai_usage enable row level security;
drop policy if exists "用户只能访问自己的用量" on ai_usage;
create policy "用户只能访问自己的用量"
  on ai_usage for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 订阅计划（下期）：profiles / subscriptions 可另建
-- create table subscriptions (...);

-- 图片存储桶需在 Storage UI 手动创建：style-images（Public 或按 RLS）
