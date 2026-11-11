# AXM Nexus — Database Architecture Audit
**Project:** AXM Nexus — Muhammad al-Xorazmiy Vorislari Digital Education Management Platform  
**Target Branch:** IT Park Yangiariq  
**Auditor:** Principal Database Architect & Senior Spring Boot Engineer  
**Audit Date:** November 2026  
**Milestone:** 03 — Data Architecture & Liquibase Migration 014  

---

## 1. Executive Summary

This comprehensive database architecture audit analyzes the complete relational schema, Liquibase migration history (changesets 001 through 013), and JPA entity layer across the AXM Nexus platform.

The system currently comprises **45 relational tables**:
- **3 core identity & RBAC tables** (`users`, `roles`, `permissions`) and **2 join tables** (`user_roles`, `role_permissions`).
- **2 token tables** (`email_verification_tokens`, `password_reset_tokens`).
- **4 classroom & structure tables** (`academic_periods`, `rooms`, `study_groups`, `group_memberships`).
- **5 mentor management tables** (`mentors`, `mentor_profiles`, `mentor_skills`, `mentor_experiences`, `mentor_educations`).
- **1 student management table** (`students`).
- **3 scheduling & attendance tables** (`schedules`, `lesson_sessions`, `attendance_records`).
- **7 curriculum & lesson management tables** (`lessons`, `lesson_revisions`, `student_lesson_progress`, `learning_resources`, `lesson_quality_plans`, `lesson_delivery_records`, `student_learning_outcome_evaluations`).
- **5 assessment & assignment tables** (`assessments`, `assessment_questions`, `student_assessment_attempts`, `student_answers`, `assignments`, `assignment_submissions`).
- **5 grading & gamification tables** (`grade_records`, `point_transactions`, `achievements`, `student_achievements`, `student_streaks`).
- **5 system operations, preferences & notification tables** (`notifications`, `notification_preferences`, `notification_outbox`, `user_preferences`, `system_configs`, `audit_logs`, `ai_interaction_logs`).

---

## 2. Liquibase Migration Sequence Verification

| Changeset File | Changeset ID | Description & Tables Created / Altered | Status in Production |
|:---|:---|:---|:---:|
| `001-initial-schema.sql` | `001-initial-schema` | Initial 7 tables: `users`, `mentors`, `study_groups`, `rooms`, `schedules`, `students`, `audit_logs` | Applied |
| `002-add-created-at-columns.sql` | `002-add-created-at-columns` | Added `created_at` audit columns | Applied |
| `003-user-registration-support.sql` | `003-user-registration-support` | Altered username length, added lowercase email unique index on `users` | Applied |
| `004-modules-04-to-07-schema.sql` | `004-modules-04-to-07-schema` | Added RBAC (`roles`, `permissions`, `user_roles`, `role_permissions`), `academic_periods`, `group_memberships`, mentor profile subsystem, `lesson_sessions`, `attendance_records` | Applied |
| `005-schema-audit-columns-fix.sql` | `005-schema-audit-columns-fix` | Added missing `created_at`/`updated_at` on attendance and mentor detail tables | Applied |
| `006-auth-email-verification.sql` | `006-auth-email-verification` | Added `email_verified` to `users`, created `email_verification_tokens` | Applied |
| `007-password-reset-tokens.sql` | `007-password-reset-tokens` | Created `password_reset_tokens` table | Applied |
| `008-modules-08-to-11-schema.sql` | `008-modules-08-to-11-schema` | Added `lessons`, `lesson_revisions`, `student_lesson_progress`, `learning_resources`, `assessments`, `assessment_questions`, `student_assessment_attempts`, `student_answers`, `assignments`, `assignment_submissions`, `grade_records`, `point_transactions`, `achievements`, `student_achievements` | Applied |
| `009-modules-12-and-13-schema.sql` | `009-modules-12-and-13-schema` | Added analytics indexes, created `ai_interaction_logs` | Applied |
| `010-modules-14-to-16-schema.sql` | `010-modules-14-to-16-schema` | Created `notifications`, `notification_preferences`, `notification_outbox`, `user_preferences`, `system_configs`, extended `audit_logs` | Applied |
| `011-lesson-quality-and-outcomes-schema.sql` | `011-lesson-quality-and-outcomes-schema` | Created `lesson_quality_plans`, `lesson_delivery_records`, `student_learning_outcome_evaluations` | Applied |
| `012-gamification-streak-and-real-tests.sql` | `012-gamification-streak-and-real-tests` | Created `student_streaks` | Applied |
| `013-lesson-presentation-slides.sql` | `013-lesson-presentation-slides` | Added `presentation_slides` column to `lessons` | Applied |

**Conclusion on Migration Sequence:**
Changeset 013 is the latest applied migration. Therefore, **`014-data-architecture-integrity.sql`** is confirmed as the exact, deterministic next migration number.

---

## 3. Inventory of Existing Tables & Constraints

### 3.1 Identity, Access Management & Preferences
| Table Name | Primary Key | Foreign Keys | Unique Constraints | Indexes |
|:---|:---|:---|:---|:---|
| `users` | `id` (BIGSERIAL) | None | `username`, `idx_users_email` (partial) | `idx_users_email` |
| `roles` | `id` (BIGSERIAL) | None | `name` | PK, UNIQUE(`name`) |
| `permissions` | `id` (BIGSERIAL) | None | `name` | PK, UNIQUE(`name`) |
| `user_roles` | `(user_id, role_id)` | `user_id -> users(id)` (CASCADE), `role_id -> roles(id)` (CASCADE) | PK `(user_id, role_id)` | PK index |
| `role_permissions`| `(role_id, permission_id)` | `role_id -> roles(id)` (CASCADE), `permission_id -> permissions(id)` (CASCADE) | PK `(role_id, permission_id)` | PK index |
| `user_preferences`| `id` (BIGSERIAL) | `user_id -> users(id)` (CASCADE) | UNIQUE(`user_id`) | `idx_user_preferences_user` |
| `email_verification_tokens` | `id` (BIGSERIAL) | `user_id -> users(id)` (CASCADE) | UNIQUE(`token`) | `idx_email_verif_token`, `idx_email_verif_user`, `idx_email_verif_code` |
| `password_reset_tokens` | `id` (BIGSERIAL) | `user_id -> users(id)` (CASCADE) | UNIQUE(`token`) | `idx_pwd_reset_token`, `idx_pwd_reset_user` |

### 3.2 Education Structure & Mentors
| Table Name | Primary Key | Foreign Keys | Unique Constraints | Indexes |
|:---|:---|:---|:---|:---|
| `academic_periods`| `id` (BIGSERIAL) | None | `code` | PK, UNIQUE(`code`) |
| `rooms` | `id` (BIGSERIAL) | None | **None** (Risk: duplicate room names) | PK only |
| `study_groups` | `id` (BIGSERIAL) | `mentor_id -> mentors(id)` (SET NULL), `academic_period_id -> academic_periods(id)` (SET NULL) | `group_code` | PK, UNIQUE(`group_code`) |
| `group_memberships`| `id` (BIGSERIAL) | `student_id -> students(id)` (CASCADE), `group_id -> study_groups(id)` (CASCADE), `previous_group_id -> study_groups(id)` (SET NULL) | **None** (Risk: duplicate active enrollments) | `idx_group_memberships_student`, `idx_group_memberships_group` |
| `mentors` | `id` (BIGSERIAL) | **None** (Missing direct link to `users`) | **None** | PK only |
| `mentor_profiles` | `id` (BIGSERIAL) | `mentor_id -> mentors(id)` (CASCADE), `user_id -> users(id)` (SET NULL) | UNIQUE(`mentor_id`) | PK, UNIQUE(`mentor_id`) |
| `mentor_skills` | `id` (BIGSERIAL) | `profile_id -> mentor_profiles(id)` (CASCADE) | None | PK only |
| `mentor_experiences`| `id` (BIGSERIAL)| `profile_id -> mentor_profiles(id)` (CASCADE) | None | PK only |
| `mentor_educations` | `id` (BIGSERIAL)| `profile_id -> mentor_profiles(id)` (CASCADE) | None | PK only |
| `students` | `id` (BIGSERIAL) | `group_id -> study_groups(id)` (SET NULL), `mentor_id -> mentors(id)` (SET NULL) (Missing direct link to `users`) | **None** (Missing unique on `student_id_number` and `pinfl`) | PK only |

### 3.3 Scheduling & Attendance
| Table Name | Primary Key | Foreign Keys | Unique Constraints | Indexes |
|:---|:---|:---|:---|:---|
| `schedules` | `id` (BIGSERIAL) | `group_id -> study_groups(id)` (CASCADE), `mentor_id -> mentors(id)` (SET NULL) | None | PK only |
| `lesson_sessions`| `id` (BIGSERIAL) | `schedule_id -> schedules(id)` (SET NULL), `group_id -> study_groups(id)` (CASCADE), `mentor_id -> mentors(id)` (CASCADE) | None | `idx_lesson_sessions_date`, `idx_lesson_sessions_mentor_date`, `idx_lesson_sessions_group_status`, `idx_lesson_sessions_mentor_status` |
| `attendance_records`| `id` (BIGSERIAL)| `lesson_session_id -> lesson_sessions(id)` (CASCADE), `student_id -> students(id)` (CASCADE) | UNIQUE `(lesson_session_id, student_id)` | `idx_attendance_records_session`, `idx_attendance_records_status` |

### 3.4 Educational Content & Assessment
| Table Name | Primary Key | Foreign Keys | Unique Constraints | Indexes |
|:---|:---|:---|:---|:---|
| `lessons` | `id` (BIGSERIAL) | `group_id -> study_groups(id)` (SET NULL), `mentor_id -> mentors(id)` (SET NULL), `schedule_id -> schedules(id)` (SET NULL) | None | `idx_lessons_group`, `idx_lessons_mentor`, `idx_lessons_status` |
| `lesson_revisions`| `id` (BIGSERIAL)| `lesson_id -> lessons(id)` (CASCADE) | None | PK only |
| `student_lesson_progress`| `id` (BIGSERIAL)| `lesson_id -> lessons(id)` (CASCADE), `student_id -> students(id)` (CASCADE) | UNIQUE `(lesson_id, student_id)` | `idx_student_lesson_progress_student`, `idx_student_lesson_progress_status` |
| `learning_resources`| `id` (BIGSERIAL)| `lesson_id -> lessons(id)` (SET NULL), `mentor_id -> mentors(id)` (SET NULL) | None | `idx_learning_resources_subject`, `idx_learning_resources_grade`, `idx_learning_resources_type` |
| `lesson_quality_plans`| `id` (BIGSERIAL)| `lesson_id -> lessons(id)` (CASCADE) | UNIQUE `(lesson_id)` | `idx_quality_plans_lesson_id` |
| `lesson_delivery_records`| `id` (BIGSERIAL)| `lesson_id -> lessons(id)` (CASCADE), `mentor_id -> users(id)` (SET NULL) | None | `idx_delivery_records_lesson_id`, `idx_delivery_records_mentor_id` |
| `student_learning_outcome_evaluations`| `id` (BIGSERIAL)| `lesson_id -> lessons(id)` (CASCADE), `student_id -> users(id)` (CASCADE) | UNIQUE `(lesson_id, student_id, objective_id)` | `idx_outcome_eval_student`, `idx_outcome_eval_lesson`, `idx_outcome_eval_status` |
| `assessments` | `id` (BIGSERIAL) | `group_id -> study_groups(id)` (SET NULL), `created_by_mentor_id -> mentors(id)` (SET NULL) | None | `idx_assessments_group` |
| `assessment_questions`| `id` (BIGSERIAL)| `assessment_id -> assessments(id)` (CASCADE) | None | PK only |
| `student_assessment_attempts`| `id` (BIGSERIAL)| `assessment_id -> assessments(id)` (CASCADE), `student_id -> students(id)` (CASCADE), `graded_by_mentor_id -> mentors(id)` (SET NULL) | None | `idx_attempts_student`, `idx_attempts_assessment`, `idx_student_assessment_attempts_status` |
| `student_answers` | `id` (BIGSERIAL) | `attempt_id -> student_assessment_attempts(id)` (CASCADE), `question_id -> assessment_questions(id)` (CASCADE) | UNIQUE `(attempt_id, question_id)` | PK, UNIQUE |
| `assignments` | `id` (BIGSERIAL) | `group_id -> study_groups(id)` (SET NULL), `mentor_id -> mentors(id)` (SET NULL) | None | PK only |
| `assignment_submissions`| `id` (BIGSERIAL)| `assignment_id -> assignments(id)` (CASCADE), `student_id -> students(id)` (CASCADE), `graded_by_mentor_id -> mentors(id)` (SET NULL) | UNIQUE `(assignment_id, student_id)` | `idx_assignment_submissions_student`, `idx_assignment_submissions_status` |

### 3.5 Grading, Gamification & Operations
| Table Name | Primary Key | Foreign Keys | Unique Constraints | Indexes |
|:---|:---|:---|:---|:---|
| `grade_records` | `id` (BIGSERIAL) | `student_id -> students(id)` (CASCADE), `academic_period_id -> academic_periods(id)` (SET NULL), `mentor_id -> mentors(id)` (SET NULL) | None | `idx_grade_records_student` |
| `point_transactions`| `id` (BIGSERIAL)| `student_id -> students(id)` (CASCADE), `awarded_by_user_id -> users(id)` (SET NULL) | `idempotency_key` | `idx_point_transactions_student` |
| `achievements` | `id` (BIGSERIAL) | None | `code` | `idx_achievements_code` |
| `student_achievements`| `id` (BIGSERIAL)| `student_id -> students(id)` (CASCADE), `achievement_id -> achievements(id)` (CASCADE) | UNIQUE `(student_id, achievement_id)` | PK, UNIQUE |
| `student_streaks` | `id` (BIGSERIAL) | `student_id -> students(id)` (CASCADE) | UNIQUE `(student_id)` | `idx_student_streaks_student_id`, `idx_student_streaks_current_streak` |
| `notifications` | `id` (BIGSERIAL) | `recipient_user_id -> users(id)` (CASCADE) | None | `idx_notifications_recipient`, `idx_notifications_recipient_read`, `idx_notifications_dedup`, `idx_notifications_created_at` |
| `notification_preferences`| `id` (BIGSERIAL)| `user_id -> users(id)` (CASCADE) | UNIQUE(`user_id`) | PK, UNIQUE(`user_id`) |
| `notification_outbox`| `id` (BIGSERIAL)| `notification_id -> notifications(id)` (CASCADE) | None | `idx_notification_outbox_status`, `idx_notification_outbox_created_at` |
| `system_configs`| `id` (BIGSERIAL) | None | `config_key` | PK, UNIQUE(`config_key`) |
| `audit_logs` | `id` (BIGSERIAL) | None | None | `idx_audit_logs_action`, `idx_audit_logs_performed_by`, `idx_audit_logs_entity_name`, `idx_audit_logs_created_at` |
| `ai_interaction_logs`| `id` (BIGSERIAL)| `user_id -> users(id)` (SET NULL) | None | `idx_ai_logs_user`, `idx_ai_logs_intent`, `idx_ai_logs_created_at` |

---

## 4. Entity Relationships Overview

```
Identity:
  User [1] <----> [0..1] Student (Missing direct FK user_id on students)
  User [1] <----> [0..1] Mentor  (Missing direct FK user_id on mentors)
  User [1] <----> [0..1] MentorProfile (via mentor_profiles.user_id)
  User [1] <----> [N] UserRole [N] <----> [1] Role
  Role [1] <----> [N] RolePermission [N] <----> [1] Permission
  User [1] <----> [0..1] UserPreference
  User [1] <----> [0..1] NotificationPreference
  User [1] <----> [N] Notification

Academic Structure:
  AcademicPeriod [1] <---- [0..N] StudyGroup
  AcademicPeriod [1] <---- [0..N] GradeRecord
  Room [1] <---- [0..N] Schedule (by name string)
  Mentor [1] <---- [0..N] StudyGroup
  Mentor [1] <---- [0..N] Student
  Mentor [1] <---- [0..1] MentorProfile
  StudyGroup [1] <---- [0..N] Student
  StudyGroup [1] <---- [0..N] GroupMembership [N] ----> [1] Student
  StudyGroup [1] <---- [0..N] Schedule
  StudyGroup [1] <---- [0..N] LessonSession
  StudyGroup [1] <---- [0..N] Lesson
  StudyGroup [1] <---- [0..N] Assessment
  StudyGroup [1] <---- [0..N] Assignment

Instruction & Attendance:
  Schedule [1] <---- [0..N] LessonSession
  Schedule [1] <---- [0..N] Lesson
  LessonSession [1] <---- [0..N] AttendanceRecord [N] ----> [1] Student
  Lesson [1] <---- [0..N] LessonRevision
  Lesson [1] <---- [0..N] StudentLessonProgress [N] ----> [1] Student
  Lesson [1] <---- [0..N] LearningResource
  Lesson [1] <---- [0..1] LessonQualityPlan
  Lesson [1] <---- [0..N] LessonDeliveryRecord
  Lesson [1] <---- [0..N] StudentLearningOutcomeEvaluation

Evaluation & Gamification:
  Assessment [1] <---- [0..N] AssessmentQuestion
  Assessment [1] <---- [0..N] StudentAssessmentAttempt [N] ----> [1] Student
  StudentAssessmentAttempt [1] <---- [0..N] StudentAnswer [N] ----> [1] AssessmentQuestion
  Assignment [1] <---- [0..N] AssignmentSubmission [N] ----> [1] Student
  Student [1] <---- [0..N] GradeRecord
  Student [1] <---- [0..N] PointTransaction
  Student [1] <---- [0..N] StudentAchievement [N] ----> [1] Achievement
  Student [1] <---- [0..1] StudentStreak
```

---

## 5. Critical Problems & Data Integrity Risks Identified

### Problem 1: Disconnected User Authentication vs Domain Records (Students & Mentors)
- **Root Cause:** In migration 001, `students` and `mentors` were created as standalone business entities without foreign keys referencing `users(id)`. When student accounts were provisioned via HEMIS (`StudentService.java`), user records were created with `username = studentIdNumber`, but no relational foreign key tied the `students` table to `users`.
- **Impact:** System relies on string lookups (`student.studentIdNumber == user.username`), making user ID lookup an unindexed scan, risking orphan accounts upon username changes, and preventing JPA `@OneToOne` mapping.
- **Resolution Plan:** Add `user_id BIGINT REFERENCES users(id) ON DELETE SET NULL` with a partial unique index on both `students` and `mentors`. Backfill existing links safely.

### Problem 2: Missing Foreign Key Indexes Causing Slow Cascades & Full Table Scans
- **Root Cause:** PostgreSQL does NOT automatically create indexes on foreign key columns. Several child tables have foreign keys without supporting B-tree indexes:
  - `students`: `group_id`, `mentor_id`, `status`, `student_id_number`, `pinfl`
  - `mentors`: `branch_location`, `email`
  - `study_groups`: `mentor_id`, `academic_period_id`, `status`
  - `schedules`: `group_id`, `mentor_id`
  - `attendance_records`: `student_id`
  - `assessment_questions`: `assessment_id`
  - `assignments`: `group_id`, `mentor_id`, `deadline`, `is_active`
  - `learning_resources`: `lesson_id`, `mentor_id`
  - `grade_records`: `academic_period_id`, `mentor_id`, `subject`
  - `point_transactions`: `awarded_by_user_id`
  - `notification_outbox`: `notification_id`
- **Impact:** When deleting or querying records by parent ID (e.g. deleting a mentor, or querying all attendance records for a student), PostgreSQL performs sequential table scans, degrading performance as student and attendance volumes scale.

### Problem 3: Missing Business Constraints & Uniqueness Safeguards
- **Root Cause:** Tables lack domain-level check constraints:
  - `grade_records`: No check ensuring `score >= 0` and `score <= max_score`.
  - `student_streaks`: No check ensuring `current_streak >= 0`, `longest_streak >= 0`, `streak_freeze_count >= 0`.
  - `study_groups`: No check ensuring `max_capacity > 0` and `student_count >= 0`.
  - `group_memberships`: A student could theoretically have multiple `ACTIVE` memberships in the exact same group simultaneously.
  - `rooms`: No composite uniqueness on `(name, branch_location)`.
- **Resolution Plan:** Add check constraints and partial unique indexes in Migration 014.

### Problem 4: Normalization & Historical Integrity
- **Analysis:**
  - `branch_location` is stored as `VARCHAR(255)` across `study_groups`, `mentors`, `students`, `rooms`, `schedules`, and `mentor_profiles`. In the current architecture (IT Park Yangiariq branch, scaling to state-wide Vorislari centers), keeping this denormalized string avoids premature complexity of a separate `branches` table while preserving existing code and reports.
  - Historical grades (`grade_records`), attendance (`attendance_records`), and submissions (`assignment_submissions`) use `ON DELETE CASCADE` or `SET NULL` appropriately, ensuring educational history is preserved.
  - `students.pinfl` and `students.student_id_number` should have partial unique indexes (`WHERE column IS NOT NULL AND column <> ''`) so genuine student identifiers are strictly unique without breaking unprovisioned draft student rows.

---

## 6. Proposed Migration 014 Plan

Liquibase migration `014-data-architecture-integrity.sql` will:
1. Safely add `user_id` column to `students` and `mentors`.
2. Backfill `user_id` from existing `users` by matching `student_id_number` and `pinfl`.
3. Add foreign key constraints (`REFERENCES users(id) ON DELETE SET NULL`).
4. Add all missing performance indexes on foreign keys and high-frequency search fields.
5. Add partial unique indexes for active enrollments and student identifiers.
6. Add domain check constraints for grades, streaks, and capacities.
7. Update JPA entity mappings (`Student`, `Mentor`) to reflect the new relationships cleanly without breaking existing Jackson JSON serializations.
