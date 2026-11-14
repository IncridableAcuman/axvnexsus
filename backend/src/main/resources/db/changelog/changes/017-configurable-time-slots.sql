--liquibase formatted sql
--changeset izzatbek:017-configurable-time-slots
--validCheckSum: ANY

-- ==============================================================================
-- MILESTONE 13: Configurable Lesson Time Slots
-- ==============================================================================

CREATE TABLE IF NOT EXISTS time_slots (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    duration_minutes INT DEFAULT 90,
    display_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_time_slots_active ON time_slots(is_active);
CREATE INDEX IF NOT EXISTS idx_time_slots_order ON time_slots(display_order);
CREATE INDEX IF NOT EXISTS idx_time_slots_time ON time_slots(start_time, end_time);

-- Seed initial suggested time slots matching actual schedules
INSERT INTO time_slots (name, start_time, end_time, duration_minutes, display_order, is_active, description)
SELECT 'Ertalabki smena (Morning)', '09:30', '11:00', 90, 1, TRUE, 'Ertalabki akademik dars vaqti'
WHERE NOT EXISTS (SELECT 1 FROM time_slots WHERE start_time = '09:30' AND end_time = '11:00');

INSERT INTO time_slots (name, start_time, end_time, duration_minutes, display_order, is_active, description)
SELECT 'Tushdan keyingi (Afternoon)', '15:00', '16:30', 90, 2, TRUE, 'Tushdan keyingi dars vaqti (YA-26I0804 standarti)'
WHERE NOT EXISTS (SELECT 1 FROM time_slots WHERE start_time = '15:00' AND end_time = '16:30');

INSERT INTO time_slots (name, start_time, end_time, duration_minutes, display_order, is_active, description)
SELECT 'Kechki smena (Evening)', '16:30', '18:00', 90, 3, TRUE, 'Kechki dars vaqti (YA-24I1105 standarti)'
WHERE NOT EXISTS (SELECT 1 FROM time_slots WHERE start_time = '16:30' AND end_time = '18:00');
