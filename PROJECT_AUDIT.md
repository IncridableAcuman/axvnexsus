# AXM Nexus — Complete Technical Project Audit Report
**Muhammad al-Xorazmiy Vorislari Digital Education Management Platform**  
**Audit Date:** November 2026 | **Auditor:** Senior Software Architect, Security & Database Lead  
**Scope:** Full-stack codebase inspection (Backend Java 21 / Spring Boot, Frontend React 19 / TypeScript, PostgreSQL / Liquibase schema, Security / RBAC, AI modules, UI/UX, and DevOps).

---

## 1. Executive Summary

A comprehensive architectural, security, code quality, and business logic audit was conducted on the **AXM Nexus** platform.

### Core Strengths
- **Modern Core Tech Stack:** Java 21 LTS with Spring Boot, Gradle, React 19, TypeScript (Strict Mode), Tailwind CSS v4, and Radix UI / shadcn/ui.
- **Rich Domain Model & Migration History:** 13 Liquibase migrations covering RBAC, education structure, mentor profiles, 80-minute lesson models, attendance, assessments, gamification (XP, streaks, badges), notification outbox, and audit logging.
- **Strong Pedagogical Alignment:** Clear modeling of the 80-minute lesson standard (*Understanding*, *Practice*, *Project*, *Outcome*), HEMIS student identifier generation, and curriculum tracks for 8th–11th grade students.
- **Existing Automated Test Baseline:** 22 backend test suites pass with 100% success (`BUILD SUCCESSFUL`), and 129 of 130 frontend Vitest unit tests pass.

### Critical Deficiencies Requiring Remediation
1. **Critical Security Flaw (Filter & Controller Level):** `SecurityConfig.java` enables `.anyRequest().permitAll()`. Furthermore, key controllers (`StudentController`, `MentorController`, `StudyGroupController`, `LessonAttendanceController`, `AiAssistantController`, `CurriculumController`) lack `@PreAuthorize` annotations. Anyone without authentication can read, create, modify, or delete students, mentors, groups, attendance, and lessons.
2. **Spoofable Header-Based Authentication & Impersonation:** Endpoints across `StudyGroupController`, `LessonAttendanceController`, `AnalyticsController`, and `AiAssistantController` rely on client-supplied headers (`X-Admin-User`, `X-User-Role`, `X-User-Id`, `X-Mentor-Id`) with insecure defaults (`defaultValue = "admin"`). If unauthenticated, `CurrentUserHelper.getCurrentUserId()` defaults to user `1L` (the Super Administrator).
3. **Fabricated & Hardcoded Dashboard Statistics:** The main dashboard (`AdminDashboardView`, `MentorDashboardView`, `StudentDashboardView`) displays hardcoded attendance rates (Mon 98%, Tue 97%...), hardcoded IT Lab occupancy percentages (100%, 92%, 83%...), hardcoded GPA (`94.8 / 100`), hardcoded XP (`1,450 XP`), and hardcoded schedule cards, completely bypassing the backend `AnalyticsService`.
4. **Student Entity Decoupling & User Identity Bug:** `Student` does not have a `user_id` foreign key. In `AssessmentEngine.tsx` and `GamificationDashboard.tsx`, student actions default to `activeStudentId = students[0]?.id || 1`. Test submissions and daily check-ins are attributed to student #1 regardless of who is logged in.
5. **Schema Inconsistency in Outcome Evaluations:** In migration `011`, `student_learning_outcome_evaluations` defines `student_id BIGINT REFERENCES users(id)` instead of `students(id)`, conflicting with all other academic tables.
6. **Lack of Entity Modeling for Branches, Classes, and Subjects:** Branches are stored merely as loose varchar strings (`branch_location VARCHAR(255)`) preventing multi-branch administrative scoping. Subjects and classes are hardcoded or stored as unvalidated strings.
7. **Frontend Build & Linter Failures:** `npm run build` fails with `TS6133` (unused `Lightbulb` in `RichTextRenderer.tsx`), and `npm run lint` reports 17 ESLint errors (unescaped characters, useless assignments) and 15 warnings.
8. **In-Memory Tab Routing & N+1 Performance Hotspots:** 14 main application modules are swapped via React state inside `/app/*`, breaking direct deep linking and browser history. Backend queries in `AttendanceScheduleService` and `AnalyticsService` execute repeated unindexed loops.

---

## 2. Categorized System Audit Matrix

| Category | Finding | Module Affected | Severity | Impact |
|:---|:---|:---|:---:|:---|
| **Security** | `.anyRequest().permitAll()` in `SecurityConfig.java` | `identity` | **CRITICAL** | All API endpoints without method annotations are publicly exposed without authentication. |
| **Security** | Missing `@PreAuthorize` on core controllers (`Student`, `Mentor`, `StudyGroup`, `Attendance`, `AI`) | `users`, `mentors`, `classrooms`, `scheduling`, `ai` | **CRITICAL** | Unauthenticated callers can modify student records, schedule conflicts, and trigger AI tokens. |
| **Security** | Client-spoofable auth headers (`X-Admin-User: admin`, `X-User-Role`) | `scheduling`, `classrooms`, `analytics`, `ai` | **CRITICAL** | Any client can forge administrator credentials and bypass RBAC. |
| **Security** | `CurrentUserHelper.getCurrentUserId()` defaults to `1L` | `shared/infrastructure` | **HIGH** | Unauthenticated requests default to Super Administrator identity. |
| **Data Integrity** | `Student` entity lacks `user_id` relation to `User` | `users/domain/Student` | **CRITICAL** | Inability to securely bind authenticated student users to their academic profile. |
| **Data Integrity** | `student_learning_outcome_evaluations.student_id` references `users(id)` instead of `students(id)` | `lessons`, DB Liquibase 011 | **CRITICAL** | Foreign key violation when evaluating students; links to wrong user IDs or fails constraint. |
| **Data Integrity** | Missing `branches`, `classes`, and `subjects` tables | `classrooms`, `education` | **HIGH** | Data duplication, typos in branch names, inability to scope branch administrators. |
| **Data Integrity** | `ScheduleService.createManualSchedule` lacks collision checks | `scheduling` | **HIGH** | Room double-booking and mentor schedule conflicts allowed in schedule templates. |
| **Business Logic** | Hardcoded student identity in `AssessmentEngine` and `GamificationDashboard` (`activeStudentId = students[0]?.id \|\| 1`) | `frontend/assessments`, `frontend/grading` | **CRITICAL** | Student submissions, quiz results, and streaks attributed to student #1 regardless of logged-in user. |
| **Business Logic** | Fabricated dashboard metrics (attendance, lab occupancy, GPA, XP) | `frontend/dashboard` | **HIGH** | Contradictory, fabricated data shown instead of real database aggregations. |
| **Performance** | N+1 query loops in `AttendanceScheduleService.toDto` | `scheduling` | **HIGH** | Fetching 50 sessions causes 100+ DB queries for attendance and group memberships. |
| **Performance** | `mentorRepository.findAll().stream()` in `AnalyticsAuthorizationService` | `analytics` | **MEDIUM** | In-memory full-table scan on every student analytics lookup. |
| **Code Quality** | Dead prototype duplicate classes (`Material`, `Submission`, `Grade`, `GradingService`) | `materials`, `assignments`, `grading` | **LOW** | Codebase clutter, risk of importing incorrect unpersisted models. |
| **Frontend/Build** | TypeScript build failure (`TS6133` in `RichTextRenderer.tsx`) | `frontend/lessons` | **HIGH** | Production build (`npm run build`) fails with exit code 2. |
| **Frontend/Lint** | 17 ESLint syntax errors in `defaultLessonsData.ts` & components | `frontend` | **MEDIUM** | Lint checks fail on CI/CD pipelines. |
| **Frontend/Test** | 1 Vitest test failure in `Modules08To11.test.tsx` | `frontend/tests` | **MEDIUM** | Regressed test assertion text mismatch. |
| **Architecture** | In-memory tab switching instead of React Router child routes | `frontend/app` | **MEDIUM** | Deep linking, bookmarking, and back/forward browser navigation broken. |
| **API Standards** | Non-standard API URL prefixes (`/api/students` vs `/api/v1/admin`) | `presentation` | **MEDIUM** | Inconsistent API versioning and difficulty applying gateway policies. |

---

## 3. Deep-Dive Audit: Backend Subsystems

### 3.1 Package Architecture & DDD Boundaries
The backend follows a modular package-by-feature structure:
- `uz.axm.nexus.access`: Roles, permissions, user-role associations.
- `uz.axm.nexus.identity`: JWT authentication, token blacklisting, email verification, password reset.
- `uz.axm.nexus.classrooms`: Study groups, rooms, group memberships.
- `uz.axm.nexus.mentors`: Mentors, public mentor profiles, skills, education, experience.
- `uz.axm.nexus.users`: User accounts, student profiles, user preferences.
- `uz.axm.nexus.lessons`: 80-minute lesson plans, revisions, delivery records, quality plans, outcome evaluations.
- `uz.axm.nexus.scheduling`: Weekly schedules, calendar lesson sessions, attendance records.
- `uz.axm.nexus.assessments`: Quizzes, assessment questions, student attempts, student answers.
- `uz.axm.nexus.assignments`: Homework assignments and submissions.
- `uz.axm.nexus.grading`: Grade records, gamification XP transactions, achievements, daily streaks.
- `uz.axm.nexus.analytics`: Aggregated KPI overviews, group comparisons, student progress metrics.
- `uz.axm.nexus.ai`: Timetable/student parsing (smart local, Groq, Gemini), pedagogical assistant.
- `uz.axm.nexus.notifications`: In-app notifications, preferences, transactional email outbox.
- `uz.axm.nexus.audit`: System action audit logs, dynamic system configurations.
- `uz.axm.nexus.reports`: OpenPDF-based official reporting.

**Dead Code & Redundancy:**
- `uz.axm.nexus.materials.domain.Material` & `MaterialService`: Unmapped static class duplicating `LearningResourceService` in `uz.axm.nexus.resources`.
- `uz.axm.nexus.assignments.domain.Submission`: Unmapped POJO duplicating `AssignmentSubmission`.
- `uz.axm.nexus.grading.domain.Grade` & `GradingService`: In-memory prototype generating fake IDs with `System.currentTimeMillis()`, duplicating `GradeRecord` and `GradingAndGamificationService`.

### 3.2 Database Schema & Liquibase Migrations
Liquibase executes 13 migration changesets:
- `001-initial-schema.sql`: Initial `users`, `mentors`, `study_groups`, `rooms`, `schedules`, `students`, `audit_logs`.
- `002-add-created-at-columns.sql`: Timestamps.
- `003-user-registration-support.sql`: Unique email index.
- `004-modules-04-to-07-schema.sql`: RBAC (`roles`, `permissions`, `user_roles`, `role_permissions`), `academic_periods`, `group_memberships`, `mentor_profiles`, `mentor_skills`, `mentor_experiences`, `mentor_educations`, `lesson_sessions`, `attendance_records`.
- `005-schema-audit-columns-fix.sql`: Audit timestamp fixes.
- `006-auth-email-verification.sql`: `email_verification_tokens`.
- `007-password-reset-tokens.sql`: `password_reset_tokens`.
- `008-modules-08-to-11-schema.sql`: `lessons`, `lesson_revisions`, `student_lesson_progress`, `learning_resources`, `assessments`, `assessment_questions`, `student_assessment_attempts`, `student_answers`, `assignments`, `assignment_submissions`, `grade_records`, `point_transactions`, `achievements`, `student_achievements`.
- `009-modules-12-and-13-schema.sql`: Performance indexes, `ai_interaction_logs`.
- `010-modules-14-to-16-schema.sql`: `notifications`, `notification_preferences`, `notification_outbox`, `user_preferences`, `system_configs`.
- `011-lesson-quality-and-outcomes-schema.sql`: `lesson_quality_plans`, `lesson_delivery_records`, `student_learning_outcome_evaluations`.
- `012-gamification-streak-and-real-tests.sql`: `student_streaks`.
- `013-lesson-presentation-slides.sql`: Presentation slides in `lessons`.

**Schema Flaws Identified:**
1. Foreign key mismatch in `student_learning_outcome_evaluations`:
   ```sql
   student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
   ```
   Must reference `students(id)` to match the rest of the academic schema.
2. Missing `branches` table: `branch_location VARCHAR(255)` is repeated across 6 tables without referential integrity.
3. Missing `classes` table: `grade_level` is stored as `"8-sinf"` without academic class grouping (e.g., 8-A, 8-B).
4. Missing `subjects` table: `subject` is stored as free-form strings (`"Web Full-Stack"`, `"Computer Science"`) without catalog metadata or prerequisites.

### 3.3 Security, RBAC & Authentication Architecture
1. **Filter Chain Hole:** In `SecurityConfig.java`:
   ```java
   .authorizeHttpRequests(auth -> auth
       .requestMatchers("/api/v1/auth/**", "/swagger-ui/**", ...).permitAll()
       .anyRequest().permitAll() // OPEN TO ALL
   )
   ```
   Any endpoint lacking `@PreAuthorize` can be accessed by unauthenticated clients.
2. **Missing Controller Authorization:**
   - `StudentController`: Completely unannotated. Anyone can read PINFL, full names, phones, provision HEMIS accounts, and trigger password resets.
   - `MentorController`: Completely unannotated. Anyone can provision mentors and reset passwords.
   - `StudyGroupController`: Unannotated. Allows arbitrary group creation and student transfers.
   - `LessonAttendanceController`: Unannotated. Allows unauthorized attendance recording and session rescheduling.
   - `AiAssistantController`: Unannotated. Allows arbitrary AI prompt generation, consuming LLM quotas.
3. **Impersonation Vulnerability via Spoofed Headers:**
   Controllers rely on:
   ```java
   @RequestHeader(value = "X-Admin-User", required = false, defaultValue = "admin") String actor
   @RequestHeader(value = "X-User-Role", required = false) String callerRole
   @RequestHeader(value = "X-User-Id", required = false) Long callerUserId
   ```
   Any HTTP client can impersonate `admin` by omitting or providing custom headers. The application must instead extract the identity from the verified JWT in `SecurityContextHolder`.

---

## 4. Deep-Dive Audit: Frontend Subsystems

### 4.1 Application Shell & Navigation
- `frontend/src/app/App.tsx` defines top-level guest and protected routes.
- Once authenticated at `/app/*`, navigation is driven by `<AppShell>` and `activeTab` state.
- **Problem:** When navigating to another section (e.g. `lessons`, `students`), the browser URL remains `/app`. Refreshing the page returns the user to `dashboard`.
- **Recommendation:** Refactor `/app/*` into nested React Router routes: `/app/dashboard`, `/app/timetable`, `/app/lessons`, `/app/materials`, `/app/assessments`, `/app/grading`, `/app/groups`, `/app/students`, `/app/mentors`, `/app/users`, `/app/admin`, `/app/analytics`, `/app/profile`.

### 4.2 Dashboard Data Authenticity & Verification
- `AdminDashboardView.tsx`:
  - Attendance rates are hardcoded:
    ```typescript
    const attendanceDays = useMemo(() => [
      { day: t('schedule.days.monday'), rate: 98 },
      { day: t('schedule.days.tuesday'), rate: 97 },
      ...
    ], [t]);
    ```
  - IT Lab occupancy is hardcoded:
    ```typescript
    const itLabs = useMemo(() => [
      { name: 'IT Lab 1 — Web Full-Stack', used: 24, total: 24, percent: 100, ... },
      ...
    ], []);
    ```
  - KPIs compute lengths of raw arrays without date range filtering or server aggregation.
- `MentorDashboardView.tsx`: Next lesson details (`YA-24I1105 · IT`) and attendance figures are hardcoded strings.
- `StudentDashboardView.tsx`: Displays hardcoded GPA `94.8 / 100`, course progress `68%`, attendance `100%`, and `1,450 XP`.
- **Remediation:** Connect all dashboard cards to real backend endpoints (`/api/v1/analytics/overview`, `/api/v1/analytics/student/{id}`, `/api/v1/grading/profile/{id}`, `/api/v1/lessons/today`). Add date range picker and branch selector.

### 4.3 Student State & Test Engine Decoupling
- In `AssessmentEngine.tsx`:
  ```typescript
  const activeStudentId = _students[0]?.id || 1;
  ```
- In `GamificationDashboard.tsx`:
  ```typescript
  const activeStudentId = students[0]?.id || 1;
  ```
- **Consequence:** If student "Jasur" (ID 14) takes an assessment or checks in for daily streak, the score and streak are awarded to student #1 ("Gulnora").
- **Remediation:** Retrieve the authenticated user's student profile ID from `useAuth()` or `/api/v1/students/me` and pass it to all assessment and gamification operations.

### 4.4 Build, Lint & Test Health
- **Build:** `npm run build` fails:
  ```
  src/components/lessons/RichTextRenderer.tsx:2:10 - error TS6133: 'Lightbulb' is declared but its value is never read.
  ```
- **Lint:** `npm run lint` fails with 17 syntax errors:
  - Unnecessary escape character `\` in `defaultLessonsData.ts` (lines 202, 386, 572, 705).
  - Empty block statement in `AssessmentEngine.tsx` (line 114).
  - Useless assignment in `AttendanceCalendar.tsx` (line 150).
  - 15 React Hook missing dependency warnings.
- **Tests:** 129 pass, 1 fails in `Modules08To11.test.tsx` (line 340) because modal confirmation text changed from `"Tabriklaymiz! Testdan o‘tdingiz"` to `"Yaxshi natija! Testdan muvaffaqiyatli o‘tdingiz"`.

---

## 5. EdTech Domain & Business Logic Audit

### 5.1 Muhammad al-Xorazmiy Vorislari Educational Requirements
1. **Target Group (8th–11th Grades):**
   - 8th Grade: Computer Science Foundation (36h) + Web Full-Stack (66h).
   - 9th–10th Grade: 9 specialized tracks (AI/ML, GameDev, Mobile, Cyber Security, etc.).
   - 11th Grade: Professional portfolio, freelance, international startup readiness.
   - *Current State:* Tracks are hardcoded in Java memory in `EducationService.java`. No database management for subjects, courses, or module progression.
2. **80-Minute Lesson Standard:**
   - Structured breakdown:
     - 15–20 min: Understanding (Theory & concepts).
     - 25–30 min: Practice (Mentor live coding & exercises).
     - 20–25 min: Project (Mini-product development).
     - 10–15 min: Outcome (Evaluation, feedback, homework).
   - *Current State:* Supported in `Lesson` and `LessonQualityPlan` entities. Rich presentations supported via `presentation_slides`. Requires frontend UI integration to ensure mentors submit lesson plans with all 4 phases.
3. **Academic Integrity & Conflict Prevention:**
   - A mentor cannot teach two classes simultaneously.
   - A room cannot host two lessons at the same time.
   - *Current State:* `AttendanceScheduleService` checks conflicts for `LessonSession`. However, `ScheduleService.createManualSchedule` bypasses conflict detection completely.
4. **Attendance Calculation Standard:**
   - Formula: $\text{Attendance Rate} = \frac{\text{Present} + (\text{Late} \times 0.8)}{\text{Total Lessons} - \text{Excused Absence}} \times 100\%$.
   - *Current State:* Implemented in `AnalyticsService.java`. However, frontend displays hardcoded numbers instead of querying this calculation.

---

## 6. Audit Conclusion & Next Steps

The platform possesses a comprehensive functional foundation with advanced features already conceived and partially implemented. However, it cannot be considered production-ready due to:
1. Publicly exposed endpoints and spoofable authorization headers.
2. Hardcoded dashboard statistics and decoupled student identities.
3. Database entity gaps (branches, classes, subjects, student-user FK).
4. TypeScript and lint build errors.

The prioritized remediation roadmap must be executed in milestones as detailed in `IMPLEMENTATION_ROADMAP.md`.
