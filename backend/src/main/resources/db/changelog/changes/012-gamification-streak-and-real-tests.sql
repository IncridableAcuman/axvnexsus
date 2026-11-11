--liquibase formatted sql
--changeset izzatbek:012-gamification-streak-and-real-tests

-- ============================================================================
-- MODUL 11 & MODUL 10 KENGAYTMASI: Kunlik Streak, Gamifikatsiya va Real Testlar
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_streaks (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_activity_date DATE,
    streak_freeze_count INT NOT NULL DEFAULT 1,
    total_active_days INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_student_streaks_student_id ON student_streaks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_streaks_current_streak ON student_streaks(current_streak DESC);
