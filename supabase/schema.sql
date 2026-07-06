-- EasytPack MVP schema
-- 在 Supabase SQL Editor 中执行

create table if not exists tech_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  style_no text,
  title text not null default '未命名款式',
  category text default 't-shirt',
  status text default 'draft',
  canvas_data jsonb default '{}',
  process_items jsonb default '[]',
  bom_items jsonb default '[]',
  size_chart jsonb default '{}',
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

-- 图片存储桶需在 Storage UI 手动创建：style-images（Public）
