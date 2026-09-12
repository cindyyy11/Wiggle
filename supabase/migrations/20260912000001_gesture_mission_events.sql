-- Semantic mission telemetry only. Camera frames, landmarks, and coordinates never persist.
begin;

alter table public.learning_events drop constraint learning_events_event_type_check;
alter table public.learning_events add constraint learning_events_event_type_check
  check (event_type in (
    'session_started', 'task_started', 'first_interaction', 'response_time_recorded',
    'answer_submitted', 'retry_recorded', 'hint_requested', 'task_skipped',
    'mission_completed', 'mission_abandoned', 'stuck_requested', 'reset_started',
    'reset_completed', 'mode_changed', 'difficulty_self_reported', 'parent_check_in',
    'reality_mission_started', 'reality_mission_completed',
    'gesture_slice_focused', 'gesture_slice_placed', 'gesture_slice_returned',
    'gesture_lexi_opened', 'gesture_task_completed'
  ));

commit;
