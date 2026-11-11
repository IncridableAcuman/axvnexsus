--liquibase formatted sql
--changeset izzatbek:014-data-architecture-integrity

-- ==============================================================================
-- MILESTONE 03: Database Architecture Integrity, Foreign Keys & Optimization
-- ==============================================================================

-- 1. Student and Mentor Authentication Linkage (Direct Foreign Keys to Users)
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

-- 2. Safe Backfill of Existing Student and Mentor Accounts
UPDATE students s
SET user_id = u.id
FROM users u
WHERE s.user_id IS NULL AND (s.student_id_number = u.username OR s.pinfl = u.username);

UPDATE mentors m
SET user_id = mp.user_id
FROM mentor_profiles mp
WHERE m.user_id IS NULL AND mp.mentor_id = m.id AND mp.user_id IS NOT NULL;

UPDATE mentors m
SET user_id = u.id
FROM users u
WHERE m.user_id IS NULL AND m.email IS NOT NULL AND LOWER(m.email) = LOWER(u.email);

-- 3. Unique & Performance Indexes for Identity & Integrity
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user_id ON students (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mentors_user_id ON mentors (user_id);
CREATE INDEX IF NOT EXISTS idx_students_student_id_num ON students (student_id_number);
CREATE INDEX IF NOT EXISTS idx_students_pinfl ON students (pinfl);
CREATE INDEX IF NOT EXISTS idx_group_memberships_student_status ON group_memberships (student_id, group_id, status);

-- 4. Foreign Key and Query Performance Indexes: Students & Mentors
CREATE INDEX IF NOT EXISTS idx_students_group_id ON students (group_id);
CREATE INDEX IF NOT EXISTS idx_students_mentor_id ON students (mentor_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students (status);
CREATE INDEX IF NOT EXISTS idx_students_grade_level ON students (grade_level);
CREATE INDEX IF NOT EXISTS idx_students_branch_location ON students (branch_location);

CREATE INDEX IF NOT EXISTS idx_mentors_email ON mentors (email);
CREATE INDEX IF NOT EXISTS idx_mentors_phone ON mentors (phone);
CREATE INDEX IF NOT EXISTS idx_mentors_branch ON mentors (branch_location);
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_user_id ON mentor_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_status ON mentor_profiles (publication_status);

-- 5. Foreign Key Performance Indexes: Study Groups, Schedules & Rooms
CREATE INDEX IF NOT EXISTS idx_study_groups_mentor_id ON study_groups (mentor_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_academic_period_id ON study_groups (academic_period_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_status ON study_groups (status);
CREATE INDEX IF NOT EXISTS idx_study_groups_branch ON study_groups (branch_location);

CREATE INDEX IF NOT EXISTS idx_schedules_group_id ON schedules (group_id);
CREATE INDEX IF NOT EXISTS idx_schedules_mentor_id ON schedules (mentor_id);
CREATE INDEX IF NOT EXISTS idx_schedules_branch ON schedules (branch_location);

CREATE INDEX IF NOT EXISTS idx_lesson_sessions_schedule_id ON lesson_sessions (schedule_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_group_date ON lesson_sessions (group_id, lesson_date);

-- 6. Foreign Key Performance Indexes: Attendance & Learning Resources
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON attendance_records (student_id);

CREATE INDEX IF NOT EXISTS idx_lessons_schedule_id ON lessons (schedule_id);
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons (created_at);

CREATE INDEX IF NOT EXISTS idx_learning_resources_lesson_id ON learning_resources (lesson_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_mentor_id ON learning_resources (mentor_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_public ON learning_resources (is_public, publication_status);

-- 7. Foreign Key Performance Indexes: Assessments & Assignments
CREATE INDEX IF NOT EXISTS idx_assessments_mentor_id ON assessments (created_by_mentor_id);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments (assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment_id ON assessment_questions (assessment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_mentor ON student_assessment_attempts (graded_by_mentor_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_question_id ON student_answers (question_id);

CREATE INDEX IF NOT EXISTS idx_assignments_group_id ON assignments (group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_mentor_id ON assignments (mentor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_deadline ON assignments (deadline);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON assignments (is_active);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded_by ON assignment_submissions (graded_by_mentor_id);

-- 8. Foreign Key Performance Indexes: Grading, Gamification & Outbox
CREATE INDEX IF NOT EXISTS idx_grade_records_academic_period ON grade_records (academic_period_id);
CREATE INDEX IF NOT EXISTS idx_grade_records_mentor ON grade_records (mentor_id);
CREATE INDEX IF NOT EXISTS idx_grade_records_subject ON grade_records (subject);

CREATE INDEX IF NOT EXISTS idx_point_transactions_awarded_by ON point_transactions (awarded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_source ON point_transactions (point_source);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_notification_id ON notification_outbox (notification_id);
