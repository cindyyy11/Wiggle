-- Operator-only setup for an ALREADY CREATED Supabase Auth user.
-- Replace the two zero UUIDs with that Auth user's ID and a fresh, stable child UUID.
-- Do not run the local-only seed.sql in a production project.
begin;
do $$
declare
  household_id uuid := '00000000-0000-0000-0000-000000000000';
  explorer_id uuid := '00000000-0000-0000-0000-000000000000';
  explorer_name text := 'Explorer';
begin
  if household_id = '00000000-0000-0000-0000-000000000000'::uuid
     or explorer_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Supply a verified household Auth UUID and a fresh child UUID first';
  end if;
  if not exists (select 1 from auth.users where id = household_id) then
    raise exception 'Create the household Auth account before provisioning';
  end if;
  if exists (select 1 from public.children where id = explorer_id and parent_id <> household_id) then
    raise exception 'Child UUID already belongs to another household';
  end if;
  insert into public.profiles (id, display_name)
  values (household_id, 'Wiggle household') on conflict (id) do nothing;
  insert into public.children (id, parent_id, display_name)
  values (explorer_id, household_id, explorer_name) on conflict (id) do nothing;
  insert into public.learner_twins (child_id, twin)
  values (explorer_id, '{"mastery":{"identify-three-quarters":0.4},"modality_effectiveness":{"visual":0.75,"gesture":0.75}}'::jsonb)
  on conflict (child_id) do nothing;
  insert into public.missions (child_id, objective, title, supported_modes, authored_content)
  select explorer_id, 'identify-three-quarters', 'Pizza Fractions',
    array['standard', 'visual', 'gesture', 'visual_gesture', 'chunk', 'voice', 'movement', 'story'],
    '{"prompt":"Select three of four equal pizza slices.","simulation":{"objectiveCompatibility":{"standard":0.15,"visual":0.55,"visual_gesture":1.0},"novelty":{"visual_gesture":0.1}}}'::jsonb
  where not exists (select 1 from public.missions where child_id = explorer_id and objective = 'identify-three-quarters');
end $$;
commit;
