--liquibase formatted sql
--changeset izzatbek:021-recurring-schedule-calendar-mgmt
--validCheckSum: ANY

-- ==============================================================================
-- MODULE 02: Recurring Schedule, Academic Calendar & Lesson Session Management
-- ==============================================================================

-- 1. Add start_date, end_date, status, time_slot_id to schedules
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT '2026-09-01';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT '2027-05-31';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS time_slot_id BIGINT REFERENCES time_slots(id) ON DELETE SET NULL;

UPDATE schedules SET start_date = '2026-09-01' WHERE start_date IS NULL;
UPDATE schedules SET end_date = '2027-05-31' WHERE end_date IS NULL;
UPDATE schedules SET status = 'ACTIVE' WHERE status IS NULL;

-- 2. Add is_manually_modified and time_slot_id to lesson_sessions
ALTER TABLE lesson_sessions ADD COLUMN IF NOT EXISTS is_manually_modified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE lesson_sessions ADD COLUMN IF NOT EXISTS time_slot_id BIGINT REFERENCES time_slots(id) ON DELETE SET NULL;

-- 3. Academic Holidays table
CREATE TABLE IF NOT EXISTS academic_holidays (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    holiday_date DATE NOT NULL,
    description TEXT,
    branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_academic_holidays_date ON academic_holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_academic_holidays_branch ON academic_holidays(branch_id);

-- 4. Performance Indexes for schedules and sessions
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_dates ON schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedules_time_slot ON schedules(time_slot_id);

CREATE INDEX IF NOT EXISTS idx_lesson_sessions_status ON lesson_sessions(status);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_schedule_id ON lesson_sessions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_group_date ON lesson_sessions(group_id, lesson_date);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_time_slot ON lesson_sessions(time_slot_id);

-- 5. Idempotent uniqueness protection against duplicate active sessions
CREATE UNIQUE INDEX IF NOT EXISTS uk_schedule_lesson_date_active ON lesson_sessions (schedule_id, lesson_date)
WHERE (status != 'CANCELLED' AND schedule_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS uk_group_lesson_date_time_active ON lesson_sessions (group_id, lesson_date, start_time)
WHERE (status != 'CANCELLED');
