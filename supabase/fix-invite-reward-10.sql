-- 邀请积分：双方各 +10，最多成功邀请 5 人，邀请积分上限 50
-- 在 Supabase → SQL Editor 整段执行（已有库升级用；新库直接跑最新 schema.sql 即可）

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
  reward int := 10;
  max_success int := 5;
  points_cap int := 50;
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

  perform ensure_user_profile();

  if exists (
    select 1 from referrals where invitee_id = uid and points_awarded > 0
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_claimed');
  end if;
  delete from referrals where invitee_id = uid and points_awarded = 0;

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
    return jsonb_build_object(
      'ok', false,
      'error', 'inviter_limit',
      'message', '对方邀请名额已满（最多 5 人 / 上限 50 分）'
    );
  end if;

  inviter_before := inviter.points;
  inviter_gain := least(reward, points_cap - inviter_before);
  if inviter_gain < reward then
    return jsonb_build_object(
      'ok', false,
      'error', 'inviter_limit',
      'message', '对方邀请积分已达上限（50 分）'
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
