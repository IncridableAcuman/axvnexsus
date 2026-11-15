--liquibase formatted sql
--changeset izzatbek:019-gamification-engine-enhancements

-- ============================================================================
-- GAMIFICATION ENGINE ENHANCEMENTS: Streak Freeze History, Rarity, Configurations & Audit
-- ============================================================================

-- 1. Student streak freeze history audit ledger
CREATE TABLE IF NOT EXISTS streak_freeze_history (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    used_date DATE NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'AUTO_CONSUMED', 'MANUAL_USED', 'ADMIN_GRANTED', 'ADMIN_ADJUSTED'
    reason VARCHAR(255) NOT NULL,
    performed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_streak_freeze_history_student ON streak_freeze_history(student_id);
CREATE INDEX IF NOT EXISTS idx_streak_freeze_history_date ON streak_freeze_history(student_id, used_date);

-- 2. Student streaks table extension
ALTER TABLE student_streaks ADD COLUMN IF NOT EXISTS streak_start_date DATE;

-- 3. Achievements table enhancement for rarity and display order
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS rarity VARCHAR(30) DEFAULT 'COMMON';
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements(rarity);

-- 4. Dynamic Administrative Gamification Configuration table
CREATE TABLE IF NOT EXISTS gamification_configurations (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    category VARCHAR(50) NOT NULL, -- 'XP_REWARD', 'STREAK', 'LEVEL', 'FREEZE'
    updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gamification_config_key ON gamification_configurations(config_key);
CREATE INDEX IF NOT EXISTS idx_gamification_config_category ON gamification_configurations(category);

-- 5. Seed default gamification configurations
INSERT INTO gamification_configurations (config_key, config_value, description, category, updated_at)
VALUES
    ('xp.quiz.complete', '10', 'Testni yakunlash uchun beriladigan bazaviy XP', 'XP_REWARD', NOW()),
    ('xp.quiz.pass', '20', 'Testdan o''tish bali to''planganda beriladigan XP', 'XP_REWARD', NOW()),
    ('xp.quiz.high_score', '30', 'Testda 90% yoki undan yuqori natija ko''rsatilganda beriladigan XP', 'XP_REWARD', NOW()),
    ('xp.assignment.complete', '15', 'Topshiriq yuborilganda beriladigan bazaviy XP', 'XP_REWARD', NOW()),
    ('xp.assignment.on_time', '10', 'Topshiriq o''z vaqtida (deadlinegacha) topshirilganda beriladigan XP', 'XP_REWARD', NOW()),
    ('xp.assignment.excellent', '25', 'Topshiriq a''lo baho (>=90 ball) bilan baholanganda beriladigan XP', 'XP_REWARD', NOW()),
    ('xp.lesson.complete', '5', 'Darsda qatnashib yakunlanganda beriladigan XP', 'XP_REWARD', NOW()),
    ('xp.streak.daily', '15', 'Kunlik o''rganish streakini davom ettirgani uchun XP', 'STREAK', NOW()),
    ('streak.freeze.default_balance', '1', 'Yangi o''quvchiga beriladigan boshlang''ich muzlatgich (freeze) soni', 'FREEZE', NOW()),
    ('streak.freeze.max_balance', '5', 'O''quvchi to''plashi mumkin bo''lgan maksimal freeze soni', 'FREEZE', NOW()),
    ('streak.freeze.policy', 'AUTO', 'Muzlatgichni avtomatik qo''llash (AUTO) yoki o''quvchi tasdig''i (MANUAL)', 'FREEZE', NOW())
ON CONFLICT (config_key) DO NOTHING;

-- 6. Indexes for high performance ledger queries & leaderboards
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_point_transactions_point_source ON point_transactions(point_source);
CREATE INDEX IF NOT EXISTS idx_point_transactions_student_source ON point_transactions(student_id, point_source);
CREATE INDEX IF NOT EXISTS idx_point_transactions_ref ON point_transactions(reference_id, reference_type);
