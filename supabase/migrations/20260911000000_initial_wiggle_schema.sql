create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  birth_year smallint check (birth_year between 2010 and 2030),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, parent_id)
);

create table public.learner_twins (
  child_id uuid primary key references public.children (id) on delete cascade,
  twin jsonb not null check (jsonb_typeof(twin) = 'object'),
  schema_version integer not null default 1 check (schema_version > 0),
  updated_at timestamptz not null default now()
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  objective text not null check (length(trim(objective)) > 0),
  title text not null check (length(trim(title)) > 0),
  supported_modes text[] not null default array['standard']::text[]
    check (cardinality(supported_modes) > 0),
  authored_content jsonb not null default '{}'::jsonb
    check (jsonb_typeof(authored_content) = 'object'),
  status text not null default 'available'
    check (status in ('draft', 'available', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, child_id)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id),
  mission_id uuid not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, child_id),
  foreign key (mission_id, child_id) references public.missions (id, child_id),
  check ((status = 'active' and completed_at is null) or status <> 'active')
);

create table public.learning_events (
  id uuid primary key,
  child_id uuid not null references public.children (id),
  session_id uuid not null,
  occurred_at timestamptz not null,
  event_type text not null check (event_type in (
    'session_started', 'task_started', 'first_interaction', 'response_time_recorded',
    'answer_submitted', 'retry_recorded', 'hint_requested', 'task_skipped',
    'mission_completed', 'mission_abandoned', 'stuck_requested', 'reset_started',
    'reset_completed', 'mode_changed', 'difficulty_self_reported', 'parent_check_in'
  )),
  payload jsonb not null check ((
    jsonb_typeof(payload) = 'object' and payload ->> 'kind' = event_type
  ) is true),
  idempotency_key text not null check (length(trim(idempotency_key)) > 0),
  created_at timestamptz not null default now(),
  unique (session_id, idempotency_key),
  foreign key (session_id, child_id) references public.sessions (id, child_id)
);

create table public.interventions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  session_id uuid not null,
  simulation_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(simulation_snapshot) = 'object'),
  selected_strategy text not null check (length(trim(selected_strategy)) > 0),
  predicted_success numeric(4, 3) check (predicted_success between 0 and 1),
  actual_success numeric(4, 3) check (actual_success between 0 and 1),
  outcome jsonb check (outcome is null or jsonb_typeof(outcome) = 'object'),
  status text not null default 'selected'
    check (status in ('selected', 'presented', 'completed', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, child_id) references public.sessions (id, child_id)
);

create table public.strategy_effectiveness (
  id bigint generated always as identity primary key,
  child_id uuid not null references public.children (id) on delete cascade,
  strategy text not null check (length(trim(strategy)) > 0),
  effectiveness numeric(4, 3) not null default 0.5 check (effectiveness between 0 and 1),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  updated_at timestamptz not null default now(),
  unique (child_id, strategy)
);

create table public.parent_settings (
  parent_id uuid primary key references public.profiles (id) on delete cascade,
  pin_hash text check (pin_hash is null or length(pin_hash) >= 20),
  break_interval_minutes smallint not null default 20
    check (break_interval_minutes between 5 and 120),
  daily_limit_minutes smallint check (daily_limit_minutes between 5 and 480),
  gesture_enabled boolean not null default false,
  voice_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.parent_check_ins (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null,
  child_id uuid not null,
  difficulty numeric(4, 3) check (difficulty between 0 and 1),
  note text check (note is null or length(note) <= 1000),
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (child_id, parent_id) references public.children (id, parent_id) on delete cascade
);

create index children_parent_id_idx on public.children (parent_id);
create index learner_twins_updated_at_idx on public.learner_twins (updated_at desc);
create index missions_child_id_idx on public.missions (child_id);
create index missions_objective_idx on public.missions (objective);
create index sessions_child_id_idx on public.sessions (child_id);
create index sessions_mission_id_child_id_idx on public.sessions (mission_id, child_id);
create index sessions_active_child_idx on public.sessions (child_id, started_at desc)
  where status = 'active';
create index learning_events_child_occurred_at_idx
  on public.learning_events (child_id, occurred_at desc);
create index learning_events_session_id_child_id_idx
  on public.learning_events (session_id, child_id);
create index interventions_child_id_idx on public.interventions (child_id);
create index interventions_session_id_child_id_idx
  on public.interventions (session_id, child_id);
create index strategy_effectiveness_child_id_idx
  on public.strategy_effectiveness (child_id);
create index parent_check_ins_parent_id_idx on public.parent_check_ins (parent_id);
create index parent_check_ins_child_created_at_idx
  on public.parent_check_ins (child_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger children_set_updated_at before update on public.children
for each row execute function public.set_updated_at();
create trigger learner_twins_set_updated_at before update on public.learner_twins
for each row execute function public.set_updated_at();
create trigger missions_set_updated_at before update on public.missions
for each row execute function public.set_updated_at();
create trigger sessions_set_updated_at before update on public.sessions
for each row execute function public.set_updated_at();
create trigger interventions_set_updated_at before update on public.interventions
for each row execute function public.set_updated_at();
create trigger strategy_effectiveness_set_updated_at before update on public.strategy_effectiveness
for each row execute function public.set_updated_at();
create trigger parent_settings_set_updated_at before update on public.parent_settings
for each row execute function public.set_updated_at();

create function public.reject_learning_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'learning_events are append-only' using errcode = 'P0001';
end;
$$;

create trigger learning_events_append_only
before update or delete on public.learning_events
for each row execute function public.reject_learning_event_mutation();

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.reject_learning_event_mutation() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.learner_twins enable row level security;
alter table public.missions enable row level security;
alter table public.sessions enable row level security;
alter table public.learning_events enable row level security;
alter table public.interventions enable row level security;
alter table public.strategy_effectiveness enable row level security;
alter table public.parent_settings enable row level security;
alter table public.parent_check_ins enable row level security;

revoke all on table public.profiles, public.children, public.learner_twins,
  public.missions, public.sessions, public.learning_events, public.interventions,
  public.strategy_effectiveness, public.parent_settings, public.parent_check_ins
from anon, authenticated;

grant select, insert, update, delete on table public.profiles, public.children,
  public.missions, public.sessions, public.interventions, public.strategy_effectiveness,
  public.parent_check_ins to authenticated;
grant select, insert, update on table public.learner_twins, public.parent_settings
  to authenticated;
grant select, insert on table public.learning_events to authenticated;
grant usage, select on sequence public.strategy_effectiveness_id_seq to authenticated;

create policy "parents select own profile" on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy "parents insert own profile" on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);
create policy "parents update own profile" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "parents delete own profile" on public.profiles for delete to authenticated
using ((select auth.uid()) = id);

create policy "parents select own children" on public.children for select to authenticated
using ((select auth.uid()) = parent_id);
create policy "parents insert own children" on public.children for insert to authenticated
with check ((select auth.uid()) = parent_id);
create policy "parents update own children" on public.children for update to authenticated
using ((select auth.uid()) = parent_id) with check ((select auth.uid()) = parent_id);
create policy "parents delete own children" on public.children for delete to authenticated
using ((select auth.uid()) = parent_id);

create policy "parents select child twins" on public.learner_twins for select to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents insert child twins" on public.learner_twins for insert to authenticated
with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents update child twins" on public.learner_twins for update to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())))
with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));

create policy "parents select child missions" on public.missions for select to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents insert child missions" on public.missions for insert to authenticated
with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents update child missions" on public.missions for update to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())))
with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents delete child missions" on public.missions for delete to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));

create policy "parents select child sessions" on public.sessions for select to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents insert child sessions" on public.sessions for insert to authenticated
with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents update child sessions" on public.sessions for update to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())))
with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents delete child sessions" on public.sessions for delete to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));

create policy "parents select child events" on public.learning_events for select to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents insert child events" on public.learning_events for insert to authenticated
with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));

create policy "parents select child interventions" on public.interventions for select to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents insert child interventions" on public.interventions for insert to authenticated
with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents update child interventions" on public.interventions for update to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())))
with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents delete child interventions" on public.interventions for delete to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));

create policy "parents select child strategy effectiveness" on public.strategy_effectiveness for select to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents insert child strategy effectiveness" on public.strategy_effectiveness for insert to authenticated
with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents update child strategy effectiveness" on public.strategy_effectiveness for update to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())))
with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "parents delete child strategy effectiveness" on public.strategy_effectiveness for delete to authenticated
using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid())));

create policy "parents select own settings" on public.parent_settings for select to authenticated
using ((select auth.uid()) = parent_id);
create policy "parents insert own settings" on public.parent_settings for insert to authenticated
with check ((select auth.uid()) = parent_id);
create policy "parents update own settings" on public.parent_settings for update to authenticated
using ((select auth.uid()) = parent_id) with check ((select auth.uid()) = parent_id);

create policy "parents select own check ins" on public.parent_check_ins for select to authenticated
using (
  parent_id = (select auth.uid())
  and exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid()))
);
create policy "parents insert own check ins" on public.parent_check_ins for insert to authenticated
with check (
  parent_id = (select auth.uid())
  and exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid()))
);
create policy "parents update own check ins" on public.parent_check_ins for update to authenticated
using (
  parent_id = (select auth.uid())
  and exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid()))
)
with check (
  parent_id = (select auth.uid())
  and exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid()))
);
create policy "parents delete own check ins" on public.parent_check_ins for delete to authenticated
using (
  parent_id = (select auth.uid())
  and exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid()))
);
