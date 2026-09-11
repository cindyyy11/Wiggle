begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(35);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'children', 'children table exists');
select has_table('public', 'learner_twins', 'learner twins table exists');
select has_table('public', 'missions', 'missions table exists');
select has_table('public', 'sessions', 'sessions table exists');
select has_table('public', 'learning_events', 'learning events table exists');
select has_table('public', 'interventions', 'interventions table exists');
select has_table('public', 'strategy_effectiveness', 'strategy effectiveness table exists');
select has_table('public', 'parent_settings', 'parent settings table exists');
select has_table('public', 'parent_check_ins', 'parent check-ins table exists');

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.children'::regclass), 'children has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.learner_twins'::regclass), 'learner twins has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.missions'::regclass), 'missions has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.sessions'::regclass), 'sessions has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.learning_events'::regclass), 'events has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.interventions'::regclass), 'interventions has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.strategy_effectiveness'::regclass), 'strategy effectiveness has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.parent_settings'::regclass), 'settings has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.parent_check_ins'::regclass), 'check-ins has RLS');

select has_index('public', 'children', 'children_parent_id_idx', 'parent ownership is indexed');
select has_index('public', 'missions', 'missions_objective_idx', 'mission objectives are indexed');
select has_index('public', 'sessions', 'sessions_active_child_idx', 'active sessions are indexed');
select has_index('public', 'learning_events', 'learning_events_child_occurred_at_idx', 'event reads are indexed');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', 'rls-parent-a@wiggle.local', '{}'),
  ('20000000-0000-0000-0000-000000000002', 'rls-parent-b@wiggle.local', '{}')
on conflict (id) do nothing;
insert into public.profiles (id, display_name)
values
  ('10000000-0000-0000-0000-000000000001', 'RLS Parent A'),
  ('20000000-0000-0000-0000-000000000002', 'RLS Parent B')
on conflict (id) do nothing;
insert into public.children (id, parent_id, display_name)
values
  ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'Nova'),
  ('20000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000002', 'Orbit')
on conflict (id) do nothing;
insert into public.missions (id, child_id, objective, title)
values (
  '10000000-0000-0000-0000-000000000111',
  '10000000-0000-0000-0000-000000000011',
  'identify-three-quarters',
  'Pizza Fractions'
)
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select is((select count(*) from public.children), 1::bigint, 'parent reads only owned children');
select is((select count(*) from public.children where id = '20000000-0000-0000-0000-000000000022'), 0::bigint, 'cross-parent child is hidden');
select lives_ok(
  $$insert into public.children (id, parent_id, display_name) values ('10000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 'Comet')$$,
  'parent can insert an owned child'
);
select ok(exists(select 1 from public.children where id = '10000000-0000-0000-0000-000000000012'), 'owned insert is visible');
select throws_ok(
  $$insert into public.children (id, parent_id, display_name) values ('20000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000002', 'Intruder')$$,
  '42501',
  'new row violates row-level security policy for table "children"',
  'cross-parent insert is rejected'
);

select lives_ok(
  $$insert into public.sessions (id, child_id, mission_id) values ('10000000-0000-0000-0000-000000001111', '10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000111')$$,
  'parent can create an owned session'
);
select lives_ok(
  $$insert into public.learning_events (id, child_id, session_id, occurred_at, event_type, payload, idempotency_key) values ('10000000-0000-0000-0000-000000011111', '10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000001111', now(), 'session_started', '{"kind":"session_started"}', 'session-start')$$,
  'parent can append an event for an owned child'
);
select throws_ok(
  $$update public.learning_events set payload = '{"kind":"session_started","changed":true}' where id = '10000000-0000-0000-0000-000000011111'$$,
  '42501',
  'permission denied for table learning_events',
  'events cannot be updated by authenticated users'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.learning_events), 0::bigint, 'cross-parent events are hidden');
select lives_ok(
  $$update public.children set display_name = 'Changed' where id = '10000000-0000-0000-0000-000000000011'$$,
  'cross-parent update exposes no writable row'
);
select is(
  (select display_name from public.children where id = '20000000-0000-0000-0000-000000000022'),
  'Orbit',
  'own child remains readable after cross-parent update attempt'
);

select * from finish();
rollback;
