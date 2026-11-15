--liquibase formatted sql
--changeset izzatbek:020-gamification-integrity-and-audit

-- ============================================================================
-- GAMIFICATION ENGINE INTEGRITY & AUDIT CONSTRAINTS
-- ============================================================================

-- 1. Prevent multiple freeze consumptions for the same student on the same missed date
CREATE UNIQUE INDEX IF NOT EXISTS uk_freeze_usage_student_date
ON streak_freeze_history(student_id, used_date)
WHERE action_type IN ('AUTO_CONSUMED', 'MANUAL_USED');

-- 2. Reverse lookup index for student achievements
CREATE INDEX IF NOT EXISTS idx_student_achievements_achievement ON student_achievements(achievement_id);

-- 3. Composite index on student_streaks for fast leaderboard & streak lookup
CREATE INDEX IF NOT EXISTS idx_student_streaks_activity_date ON student_streaks(student_id, last_activity_date);

-- 4. Seed missing/configurable level & milestone reward rules into gamification_configurations
INSERT INTO gamification_configurations (config_key, config_value, description, category, updated_at)
VALUES
    ('xp.streak.milestone.3', '25', '3 kunlik streak marrasi uchun beriladigan bonus XP', 'STREAK', NOW()),
    ('xp.streak.milestone.7', '100', '7 kunlik streak marrasi uchun beriladigan bonus XP', 'STREAK', NOW()),
    ('xp.streak.milestone.14', '200', '14 kunlik streak marrasi uchun beriladigan bonus XP', 'STREAK', NOW()),
    ('xp.streak.milestone.30', '500', '30 kunlik streak marrasi uchun beriladigan bonus XP', 'STREAK', NOW()),
    ('xp.streak.milestone.60', '1000', '60 kunlik streak marrasi uchun beriladigan bonus XP', 'STREAK', NOW()),
    ('xp.streak.milestone.100', '2000', '100 kunlik streak marrasi uchun beriladigan bonus XP', 'STREAK', NOW()),
    ('level.threshold.1', '0', '1-daraja (Beginner) minimal XP chegarasi', 'LEVEL', NOW()),
    ('level.threshold.2', '100', '2-daraja (Explorer) minimal XP chegarasi', 'LEVEL', NOW()),
    ('level.threshold.3', '300', '3-daraja (Learner) minimal XP chegarasi', 'LEVEL', NOW()),
    ('level.threshold.4', '600', '4-daraja (Practitioner) minimal XP chegarasi', 'LEVEL', NOW()),
    ('level.threshold.5', '1000', '5-daraja (Skilled) minimal XP chegarasi', 'LEVEL', NOW()),
    ('level.threshold.6', '1500', '6-daraja (Advanced) minimal XP chegarasi', 'LEVEL', NOW()),
    ('level.threshold.7', '2500', '7-daraja (Expert) minimal XP chegarasi', 'LEVEL', NOW()),
    ('level.threshold.8', '4000', '8-daraja (Master) minimal XP chegarasi', 'LEVEL', NOW()),
    ('level.threshold.9', '6000', '9-daraja (Champion) minimal XP chegarasi', 'LEVEL', NOW()),
    ('level.threshold.10', '10000', '10-daraja (Legend) minimal XP chegarasi', 'LEVEL', NOW())
ON CONFLICT (config_key) DO NOTHING;
