-- Run once in the Supabase SQL Editor. Safe to re-run; does not reset an event.
begin;
create schema if not exists hits_room;
revoke all on schema hits_room from public, anon, authenticated;
create table if not exists hits_room.event (
 id integer primary key check(id=1), epoch text not null, quota integer not null default 100 check(quota between 1 and 100000),
 boost integer not null default 0 check(boost>=0), paused integer not null default 0 check(paused in (0,1)),
 phase text not null default 'collecting' check(phase in ('collecting','launching')), code text not null,
 launched_at bigint, video_url text not null default '',
 audio_settings text not null default '{"musicVolume":25,"sfxVolume":100,"musicUrl":""}'
);
-- Upgrade existing rooms too; CREATE TABLE IF NOT EXISTS does not add columns.
alter table hits_room.event add column if not exists audio_settings text not null default '{"musicVolume":25,"sfxVolume":100,"musicUrl":""}';
create table if not exists hits_room.activations (epoch text not null, device text not null, primary key(epoch,device));
create table if not exists hits_room.login_attempts (bucket text primary key, attempts integer not null default 0);
alter table hits_room.event enable row level security;
alter table hits_room.activations enable row level security;
alter table hits_room.login_attempts enable row level security;
revoke all on hits_room.event, hits_room.activations, hits_room.login_attempts from public, anon, authenticated;

-- A fixed operation list, never client-supplied SQL. Only the server service role
-- can execute this RPC. Mutations lock the singleton row for quota/reset safety.
create or replace function public.hits_room_store(p_operation text, p_values jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e hits_room.event%rowtype; n bigint; changes integer := 0; result jsonb; amount integer;
begin
 if p_operation = 'read_event' then
  select to_jsonb(t) into result from (select ev.*, (select count(*) from hits_room.activations a where a.epoch=ev.epoch) as audience from hits_room.event ev where id=1) t;
  return result;
 elsif p_operation = 'init' then
  insert into hits_room.event(id,epoch,code) values(1,p_values->>0,p_values->>1) on conflict do nothing;
 elsif p_operation = 'activated' then
  if exists(select 1 from hits_room.activations where epoch=p_values->>0 and device=p_values->>1) then return '{"activated":true}'::jsonb; end if;
  return null;
 elsif p_operation = 'login_increment' then
  insert into hits_room.login_attempts(bucket,attempts) values(p_values->>0,1) on conflict(bucket) do update set attempts=hits_room.login_attempts.attempts+1;
 elsif p_operation = 'login_read' then
  select jsonb_build_object('attempts',attempts) into result from hits_room.login_attempts where bucket=p_values->>0;
  return result;
 else
  select * into e from hits_room.event where id=1 for update;
  if not found then raise exception 'Event not initialised'; end if;
  select count(*) into n from hits_room.activations where epoch=e.epoch;
  case p_operation
   when 'activate' then
    if e.phase='collecting' and e.paused=0 and n+e.boost<e.quota then
     insert into hits_room.activations(epoch,device) values(e.epoch,p_values->>0) on conflict do nothing;
    else return '{"meta":{"changes":0}}'::jsonb; end if;
   when 'boost' then
    amount := (p_values->>0)::integer;
    if amount not in (1,5,10,25) then raise exception 'Invalid boost'; end if;
    update hits_room.event set boost=least(boost+amount,greatest(0,quota-n)) where id=1 and phase='collecting';
   when 'unlock' then
    update hits_room.event set boost=greatest(0,quota-n),paused=0 where id=1 and phase='collecting';
   when 'pause' then
    update hits_room.event set paused=1-paused where id=1 and phase='collecting';
   when 'settings' then
    update hits_room.event set quota=(p_values->>0)::integer,video_url=p_values->>1 where id=1 and phase='collecting';
   when 'audio_settings' then
    update hits_room.event set audio_settings=p_values->>0 where id=1;
   when 'launch' then
    update hits_room.event set phase='launching',launched_at=(p_values->>0)::bigint
     where id=1 and epoch=p_values->>1 and code=p_values->>2 and phase='collecting' and n+boost>=quota;
   when 'reset' then
    delete from hits_room.activations where epoch is not null;
    update hits_room.event set epoch=p_values->>0,code=p_values->>1,boost=0,paused=0,phase='collecting',launched_at=null where id=1;
    -- Keep authentication attempt limits across event resets.
   else raise exception 'Unsupported event operation';
  end case;
 end if;
 get diagnostics changes = row_count;
 return jsonb_build_object('meta',jsonb_build_object('changes',changes));
end;
$$;
revoke all on function public.hits_room_store(text,jsonb) from public, anon, authenticated;
grant execute on function public.hits_room_store(text,jsonb) to service_role;
commit;
