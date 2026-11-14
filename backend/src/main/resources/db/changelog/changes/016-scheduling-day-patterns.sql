--liquibase formatted sql
--changeset izzatbek:016-scheduling-day-patterns
--validCheckSum: ANY

-- ==============================================================================
-- MILESTONE 12: Six-Day Academic Week (Odd-Day and Even-Day Scheduling Patterns)
-- ==============================================================================

-- 1. Add day_pattern columns to schedules and study_groups
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS day_pattern VARCHAR(50) DEFAULT 'CUSTOM';
ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS day_pattern VARCHAR(50) DEFAULT 'CUSTOM';

-- 2. Backfill existing data based on weekday contents
UPDATE schedules
SET day_pattern = 'ODD_DAYS'
WHERE (day_pattern IS NULL OR day_pattern = 'CUSTOM')
  AND (days ILIKE '%Dushanba%Chorshanba%Juma%' OR days ILIKE '%Toq%');

UPDATE schedules
SET day_pattern = 'EVEN_DAYS'
WHERE (day_pattern IS NULL OR day_pattern = 'CUSTOM')
  AND (days ILIKE '%Seshanba%Payshanba%Shanba%' OR days ILIKE '%Juft%');

UPDATE study_groups
SET day_pattern = 'ODD_DAYS'
WHERE (day_pattern IS NULL OR day_pattern = 'CUSTOM')
  AND (schedule_days ILIKE '%Dushanba%Chorshanba%Juma%' OR schedule_days ILIKE '%Toq%');

UPDATE study_groups
SET day_pattern = 'EVEN_DAYS'
WHERE (day_pattern IS NULL OR day_pattern = 'CUSTOM')
  AND (schedule_days ILIKE '%Seshanba%Payshanba%Shanba%' OR schedule_days ILIKE '%Juft%');

-- 3. Performance Indexes for schedules
CREATE INDEX IF NOT EXISTS idx_schedules_day_pattern ON schedules (day_pattern);
CREATE INDEX IF NOT EXISTS idx_schedules_mentor_time ON schedules (mentor_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_schedules_room_time ON schedules (room, start_time, end_time);
