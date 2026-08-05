-- 修复：双向同步后项目库「更新」时间全变成同一分钟
-- 在 Supabase → SQL Editor 整段执行即可（可单独跑，不必重跑整份 schema）
--
-- 原因：旧触发器在每次 UPDATE 时强制 updated_at = now()，
-- 一键同步会短时间 upsert 全部工艺包，云端时间被刷成同一时刻，
-- 再拉回本机后，列表上「更新」就全一样了。

create or replace function update_updated_at()
returns trigger as $$
begin
  -- 信任前端传入的真实编辑时间；未传时才用当前时间
  if new.updated_at is not null then
    return new;
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tech_packs_updated_at on tech_packs;
create trigger tech_packs_updated_at
  before update on tech_packs
  for each row execute function update_updated_at();

-- ---------- 可选：把已经被刷成同一时刻的「更新」恢复成「建于」----------
-- 若列表上几乎所有卡片「更新」都显示同一分钟，可在上面成功后再单独执行：
--
--   update public.tech_packs set updated_at = created_at;
--
-- 这样排序会先按创建时间；之后你每真正改一次项目，「更新」就会变成各自不同的新时间。
