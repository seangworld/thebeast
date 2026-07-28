-- BeastHealth 3.0.0 appointment record support.
-- This additive migration expands the owner-scoped health record vocabulary.
-- It does not diagnose, interpret health data, or execute clinical actions.

alter table public.beast_health_records
  drop constraint if exists beast_health_records_record_type_check;

alter table public.beast_health_records
  add constraint beast_health_records_record_type_check
  check (record_type in (
    'profile', 'condition', 'medication', 'procedure', 'vital', 'document',
    'lifestyle', 'family_history', 'provider', 'appointment'
  ));
