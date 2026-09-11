-- Deterministic local-only demo identities. These rows do not contain passwords.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', 'nova-parent@wiggle.local', '{}'),
  ('20000000-0000-0000-0000-000000000002', 'orbit-parent@wiggle.local', '{}')
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values
  ('10000000-0000-0000-0000-000000000001', 'Nova Household'),
  ('20000000-0000-0000-0000-000000000002', 'Orbit Household')
on conflict (id) do nothing;

insert into public.children (id, parent_id, display_name, birth_year)
values
  ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'Nova', 2018),
  ('20000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000002', 'Orbit', 2017)
on conflict (id) do nothing;

insert into public.learner_twins (child_id, twin)
values (
  '10000000-0000-0000-0000-000000000011',
  '{"mastery":{"identify-three-quarters":0.4},"initiation_friction":0.5,"persistence_friction":0.5,"cognitive_load":0.5,"transition_friction":0.5,"fatigue_estimate":0.5,"modality_effectiveness":{"visual":0.75,"voice":0.5,"gesture":0.75,"movement":0.5,"story":0.5,"text":0.5},"strategy_effectiveness":{"chunking":0.5,"movement_break":0.5,"visual_hint":0.5,"voice_hint":0.5,"choice":0.5}}'::jsonb
)
on conflict (child_id) do nothing;

insert into public.missions (id, child_id, objective, title, supported_modes, authored_content)
values (
  '10000000-0000-0000-0000-000000000111',
  '10000000-0000-0000-0000-000000000011',
  'identify-three-quarters',
  'Pizza Fractions',
  array['standard', 'visual', 'gesture', 'visual_gesture', 'chunk', 'voice', 'movement', 'story'],
  '{"prompt":"Select three of four equal pizza slices.","simulation":{"objectiveCompatibility":{"standard":0.15,"visual":0.55,"visual_gesture":1.0},"novelty":{"visual_gesture":0.1}}}'::jsonb
)
on conflict (id) do nothing;
