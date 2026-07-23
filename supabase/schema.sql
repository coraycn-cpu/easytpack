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

-- ========== AI 质量事件（管理后台 /admin 只读浏览 consent=true）==========
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

-- ========== 邀请好友注册积分（双方各得 50；每人最多成功邀请 6 人；积分上限 300）==========
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  invite_code text not null unique,
  points int not null default 0 check (points >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists profiles_invite_code_idx on profiles (invite_code);

alter table profiles enable row level security;

drop policy if exists "用户读写自己的档案" on profiles;
create policy "用户读写自己的档案"
  on profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null unique references auth.users(id) on delete cascade,
  invite_code text not null,
  points_awarded int not null default 0,
  created_at timestamptz default now()
);

create index if not exists referrals_inviter_idx on referrals (inviter_id, created_at desc);

alter table referrals enable row level security;

drop policy if exists "用户可读自己相关的邀请" on referrals;
create policy "用户可读自己相关的邀请"
  on referrals for select
  using (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- 确保当前用户有档案（含邀请码）
create or replace function ensure_user_profile()
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row profiles;
  code text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into row from profiles where user_id = uid;
  if found then
    return row;
  end if;

  code := lower(substr(replace(uid::text, '-', ''), 1, 8));
  begin
    insert into profiles (user_id, email, invite_code, points)
    values (
      uid,
      coalesce(auth.jwt() ->> 'email', null),
      code,
      0
    )
    returning * into row;
  exception when unique_violation then
    -- 邀请码极低概率冲突时加后缀
    insert into profiles (user_id, email, invite_code, points)
    values (
      uid,
      coalesce(auth.jwt() ->> 'email', null),
      code || substr(md5(random()::text), 1, 4),
      0
    )
    returning * into row;
  end;
  return row;
end;
$$;

revoke all on function ensure_user_profile() from public;
grant execute on function ensure_user_profile() to authenticated;

-- 被邀请人注册后领取：双方各 +50；邀请人最多成功 6 人；积分上限 300
create or replace function claim_invite_reward(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  code text := lower(trim(p_code));
  inviter profiles;
  invitee profiles;
  success_count int;
  reward int := 50;
  max_success int := 6;
  points_cap int := 300;
  inviter_before int;
  invitee_before int;
  inviter_gain int;
  invitee_gain int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if code is null or code = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_code');
  end if;

  -- 确保自己有档案
  perform ensure_user_profile();

  if exists (select 1 from referrals where invitee_id = uid) then
    return jsonb_build_object('ok', false, 'error', 'already_claimed');
  end if;

  select * into inviter from profiles where invite_code = code;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if inviter.user_id = uid then
    return jsonb_build_object('ok', false, 'error', 'self_invite');
  end if;

  select count(*) into success_count
  from referrals
  where inviter_id = inviter.user_id and points_awarded > 0;

  if success_count >= max_success or inviter.points >= points_cap then
    insert into referrals (inviter_id, invitee_id, invite_code, points_awarded)
    values (inviter.user_id, uid, code, 0)
    on conflict (invitee_id) do nothing;
    return jsonb_build_object(
      'ok', false,
      'error', 'inviter_limit',
      'message', '对方邀请名额已满（最多 6 人 / 上限 300 分）'
    );
  end if;

  inviter_before := inviter.points;
  inviter_gain := least(reward, points_cap - inviter_before);
  if inviter_gain < reward then
    insert into referrals (inviter_id, invitee_id, invite_code, points_awarded)
    values (inviter.user_id, uid, code, 0)
    on conflict (invitee_id) do nothing;
    return jsonb_build_object(
      'ok', false,
      'error', 'inviter_limit',
      'message', '对方邀请积分已达上限（300 分）'
    );
  end if;

  select * into invitee from profiles where user_id = uid;
  invitee_before := coalesce(invitee.points, 0);
  invitee_gain := least(reward, greatest(0, points_cap - invitee_before));

  insert into referrals (inviter_id, invitee_id, invite_code, points_awarded)
  values (inviter.user_id, uid, code, reward);

  update profiles
  set points = least(points + reward, points_cap),
      updated_at = now()
  where user_id = inviter.user_id;

  update profiles
  set points = least(points + reward, points_cap),
      updated_at = now()
  where user_id = uid;

  return jsonb_build_object(
    'ok', true,
    'points_awarded', reward,
    'inviter_points', inviter_gain,
    'invitee_points', invitee_gain,
    'inviter_id', inviter.user_id
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_claimed');
end;
$$;

revoke all on function claim_invite_reward(text) from public;
grant execute on function claim_invite_reward(text) to authenticated;

-- ========== 工艺包公开分享表（已下线产品入口；表可保留兼容旧数据）==========
create table if not exists share_links (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tech_pack_id text,
  title text not null default '未命名款式',
  snapshot jsonb not null default '{}'::jsonb,
  share_hash text,
  created_at timestamptz default now(),
  revoked_at timestamptz
);

create index if not exists share_links_user_idx on share_links (user_id, created_at desc);

alter table share_links enable row level security;

drop policy if exists "公开可读未撤销分享" on share_links;
create policy "公开可读未撤销分享"
  on share_links for select
  using (revoked_at is null);

drop policy if exists "用户可创建自己的分享" on share_links;
create policy "用户可创建自己的分享"
  on share_links for insert
  with check (auth.uid() = user_id);

drop policy if exists "用户可更新自己的分享" on share_links;
create policy "用户可更新自己的分享"
  on share_links for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "用户可删除自己的分享" on share_links;
create policy "用户可删除自己的分享"
  on share_links for delete
  using (auth.uid() = user_id);
