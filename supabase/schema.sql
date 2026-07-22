-- EasytPack 云端数据库脚本（在 Supabase → SQL Editor 里整段粘贴执行）
-- 项目 ID 用文本（如 tp_…），与本机保存一致，方便以后同步。
-- 图片桶：见文末 Storage；也可按 docs/SUPABASE_SETUP.md 用界面创建。

-- ========== 工艺包主表 ==========
create table if not exists tech_packs (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  style_no text,
  title text not null default '未命名款式',
  category text default 't-shirt',
  status text default 'draft',
  workflow_status text default 'draft',
  canvas_data jsonb default '{}'::jsonb,
  process_items jsonb default '[]'::jsonb,
  bom_items jsonb default '[]'::jsonb,
  size_chart jsonb default '{}'::jsonb,
  intake jsonb default '{}'::jsonb,
  questionnaire jsonb default '{}'::jsonb,
  style_review text,
  export_history jsonb default '[]'::jsonb,
  consent_quality_pool boolean default false,
  finalized_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists tech_packs_user_idx on tech_packs (user_id, updated_at desc);

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

-- ========== 版本快照（以后定稿/分享用）==========
create table if not exists pack_versions (
  id uuid primary key default gen_random_uuid(),
  tech_pack_id text not null references tech_packs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in ('ai_draft', 'user_checkpoint', 'user_final')),
  snapshot jsonb not null default '{}'::jsonb,
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

-- ========== AI 质量事件（以后管理后台用）==========
create table if not exists ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  tech_pack_id text references tech_packs(id) on delete set null,
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

-- ========== AI 用量（以后额度扣费用）==========
create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  units int not null default 1,
  tech_pack_id text references tech_packs(id) on delete set null,
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

-- ========== 图片桶策略（桶名 style-images，需先在 Storage 里创建桶）==========
-- 路径约定：{user_id}/{project_id}/xxx.png
insert into storage.buckets (id, name, public)
values ('style-images', 'style-images', false)
on conflict (id) do nothing;

drop policy if exists "用户可读自己的款式图" on storage.objects;
create policy "用户可读自己的款式图"
  on storage.objects for select
  using (
    bucket_id = 'style-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "用户可上传自己的款式图" on storage.objects;
create policy "用户可上传自己的款式图"
  on storage.objects for insert
  with check (
    bucket_id = 'style-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "用户可更新自己的款式图" on storage.objects;
create policy "用户可更新自己的款式图"
  on storage.objects for update
  using (
    bucket_id = 'style-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "用户可删除自己的款式图" on storage.objects;
create policy "用户可删除自己的款式图"
  on storage.objects for delete
  using (
    bucket_id = 'style-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
