-- Liquibase ChangeSet: 018-module01-people-enhancements.sql
-- Module 01: Identity, Student, Mentor & Administration Management

-- 1. Add status and indexes to mentors table for explicit lifecycle management (ACTIVE, INACTIVE, ARCHIVED)
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
UPDATE mentors SET status = 'ACTIVE' WHERE status IS NULL;
CREATE INDEX IF NOT EXISTS idx_mentors_status ON mentors (status);

-- 2. Ensure status index on students table for fast filtering
CREATE INDEX IF NOT EXISTS idx_students_status ON students (status);
