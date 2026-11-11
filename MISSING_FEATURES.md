# AXM Nexus — Catalog of Missing, Incomplete & Flawed Features
**Muhammad al-Xorazmiy Vorislari Digital Education Management Platform**

This document details all features that are completely missing, partially implemented, structurally flawed, or in need of critical remediation before AXM Nexus can be considered production-ready.

---

## 1. Security & Authorization Deficiencies

### 1.1 Completely Open HTTP Filter Security
- **Problem:** `SecurityConfig.java` line 55 specifies `.anyRequest().permitAll()`.
- **Severity:** **CRITICAL**
- **Impact:** Any HTTP request that is not intercepted by a controller-level method annotation passes through without authentication.
- **Remediation:** Configure `SecurityConfig.java` to enforce `.anyRequest().authenticated()`, leaving only public paths (`/api/v1/auth/**`, `/actuator/health`, `/swagger-ui/**`, `/v3/api-docs/**`, `/static/**`) as `permitAll()`.

### 1.2 Missing Controller-Level `@PreAuthorize` Annotations
- **Problem:** The following REST controllers have zero `@PreAuthorize` annotations:
  - `StudentController.java` (`/api/students`)
  - `MentorController.java` (`/api/mentors`)
  - `StudyGroupController.java` (`/api/groups`)
  - `LessonAttendanceController.java` (`/api/lessons`)
  - `AiAssistantController.java` (`/api/ai/assistant`)
  - `CurriculumController.java` (`/api/curriculum`)
- **Severity:** **CRITICAL**
- **Impact:** Any unauthenticated caller can create students, delete students, reset student/mentor passwords, create study groups, transfer students, record fake attendance, reschedule sessions, and invoke expensive LLM endpoints.
- **Remediation:** Add granular `@PreAuthorize` annotations matching the seeded RBAC permissions (`student:read`, `student:create`, `student:update`, `student:delete`, `group:manage`, `attendance:record`, `mentor:manage`, `ai:prompt`).

### 1.3 Client Header Impersonation & Security Spoofing
- **Problem:** Controllers extract user context from client HTTP headers instead of Spring Security context:
  - `StudyGroupController`: `@RequestHeader(value = "X-Admin-User", defaultValue = "admin")`
  - `LessonAttendanceController`: `@RequestHeader(value = "X-Admin-User", defaultValue = "admin")`
  - `AnalyticsController`: `@RequestHeader(value = "X-User-Role")`, `@RequestHeader(value = "X-User-Id")`
  - `AiAssistantController`: `@RequestHeader(value = "X-User-Role")`, `@RequestHeader(value = "X-User-Id")`
  - `AnalyticsAuthorizationService`: If `requester == null` (no auth header sent), access checks are bypassed completely!
- **Severity:** **CRITICAL**
- **Impact:** Attackers can forge any identity or bypass access boundaries simply by passing or omitting HTTP headers.
- **Remediation:** Eliminate all `X-Admin-User`, `X-User-Role`, and `X-User-Id` headers. Extract the authenticated user from `SecurityContextHolder.getContext().getAuthentication()`.

### 1.4 Insecure Fallback in `CurrentUserHelper`
- **Problem:** `CurrentUserHelper.getCurrentUserId()` contains:
  ```java
  return getCurrentUser().map(User::getId).orElse(1L);
  ```
- **Severity:** **HIGH**
- **Impact:** Any unauthenticated action inside internal services automatically executes with ID `1L` (the Super Administrator account).
- **Remediation:** Throw `AccessDeniedException` or return `null`/empty Optional when unauthenticated.

---

## 2. Dashboard Fabrications & Missing Analytics Integration

### 2.1 Fabricated Statistics in `AdminDashboardView.tsx`
- **Weekly Attendance Analytics:** Hardcoded static array (`attendanceDays`: Mon 98%, Tue 97%, Wed 99%, Thu 96%, Fri 98%, Sat 95%).
- **IT Laboratory Occupancy:** Hardcoded static array (`itLabs`: Lab 1 100%, Lab 2 92%, Lab 3 83%, Lab 4 100%).
- **KPI Trends:** Hardcoded static strings (`"+100% reja"`, `"100% qamrov"`, `"Yuqori malakali"`).
- **Date-Range Filtering:** Missing. The dashboard cannot be filtered by week, month, or custom date range.
- **Branch Filtering:** Missing. The dashboard only displays a static `"IT Park Yangiariq"` badge.
- **Loading & Error States:** No granular skeletons or error retry boundaries when analytics API fails.
- **Remediation:** Connect `AdminDashboardView` to `GET /api/v1/analytics/overview?from=...&to=...&branchId=...`, render real weekly attendance curves and room occupancy from `lesson_sessions`, and provide responsive date-range and branch filters.

### 2.2 Fabricated Statistics in `MentorDashboardView.tsx`
- **Next Lesson Card:** Hardcoded string (`YA-24I1105 · IT • 11-sinf • 16:30 • Xona: IT-2`).
- **KPI Card Fallbacks:** Hardcoded fallback values (`groups.length > 0 ? groups.length : 2`, `"29 ta o'quvchi biriktirilgan"`).
- **Today's Attendance & Schedule:** Static cards instead of live queries to `/api/lessons/today?mentorId=...`.
- **Remediation:** Query real mentor metrics via `GET /api/v1/analytics/mentor/{mentorId}` and `GET /api/lessons/today?mentorId=...`.

### 2.3 Fabricated Statistics in `StudentDashboardView.tsx`
- **Student Performance KPIs:** Hardcoded GPA `94.8 / 100`, course progress `68%`, attendance `100%`.
- **Gamification Pill:** Hardcoded `Level 4` and `1,450 XP`.
- **Deadlines & Timetable:** Hardcoded mock items.
- **Remediation:** Query real student metrics via `GET /api/v1/analytics/student/{studentId}` and `GET /api/grading/profile/{studentId}`.

---

## 3. Academic Domain Gaps & Data Architecture Deficiencies

### 3.1 Missing Entity Models
1. **Branch Entity (`branches` table):**
   - *Current State:* `branch_location VARCHAR(255)` string column in mentors, study groups, rooms, schedules, and students.
   - *Missing:* `Branch` entity (`id`, `name`, `code`, `region`, `address`, `phone`, `capacity`, `isActive`), relation to branch administrators and rooms.
2. **Class Entity (`classes` table):**
   - *Current State:* `grade_level VARCHAR(50)` (e.g. `"8-sinf"`) stored as a raw string.
   - *Missing:* `AcademicClass` entity (`id`, `gradeLevel`, `classLetter` e.g. 8-A, 8-B, `academicYear`, `branchId`), distinguishing whole academic classes from specialized study groups.
3. **Subject & Course Entity (`subjects` table):**
   - *Current State:* `SubjectTrack` is an in-memory hardcoded list in `EducationService.java`.
   - *Missing:* `Subject` entity (`id`, `name`, `code`, `gradeLevel`, `totalHours`, `description`, `modules`, `isActive`) with database persistence and administrative management.

### 3.2 Student Entity Decoupling & Foreign Key Disconnect
1. **Missing `user_id` on `students` Table:**
   - *Current State:* `Student` entity does not reference `User`. Links are guessed through string equality `user.username == student.studentIdNumber`.
   - *Missing:* `user_id BIGINT UNIQUE REFERENCES users(id)` column on `students` table.
2. **Foreign Key Inconsistency in `student_learning_outcome_evaluations`:**
   - *Current State:* Migration `011` declares `student_id BIGINT NOT NULL REFERENCES users(id)`.
   - *Conflict:* All other tables (`attendance_records`, `student_assessment_attempts`, `assignment_submissions`, `grade_records`, `student_streaks`, `group_memberships`) declare `student_id BIGINT NOT NULL REFERENCES students(id)`.
   - *Remediation:* Alter `student_learning_outcome_evaluations` to reference `students(id)`.

### 3.3 Scheduling Conflict Prevention Gap
- **Problem:** While `AttendanceScheduleService` checks conflicts for `LessonSession` calendar entries, `ScheduleService.createManualSchedule` creates `Schedule` recurring templates without any room or mentor conflict checks, and without automatically generating calendar session instances.
- **Remediation:** Unify schedule conflict validation so that creating or editing weekly schedule templates checks for room and mentor collisions across existing schedules and active lesson sessions.

---

## 4. Business Logic Decoupling in Frontend Components

### 4.1 Hardcoded Student Identity in Test Engine & Gamification
- **Problem:**
  - `AssessmentEngine.tsx` line 84: `const activeStudentId = _students[0]?.id || 1;`
  - `GamificationDashboard.tsx` line 79: `const activeStudentId = students[0]?.id || 1;`
- **Severity:** **CRITICAL**
- **Impact:** Any student taking a test or checking in for daily streaks does so under the identity of the first student in the database (`studentId: 1`), corrupting academic records.
- **Remediation:** Look up the logged-in student's ID from `useAuth()` (or `/api/v1/students/me`) and use it for all student-scoped operations.

---

## 5. Frontend Architecture & Routing Deficiencies

### 5.1 In-Memory Tab Switching vs Proper Nested Routing
- **Problem:** All 14 modules (`dashboard`, `timetable`, `analytics`, `lessons`, `materials`, `assessments`, `grading`, `groups`, `students`, `mentors`, `users`, `admin`, `curriculum`, `profile`, `design-system`) are switched in-memory via `activeTab` React state inside `<MainApp />`.
- **Impact:**
  - Browser back/forward navigation does not work between modules.
  - Page refresh always resets the view to `dashboard`.
  - Links to specific pages (e.g. sharing a link to `/app/lessons` or `/app/students`) cannot be bookmarked or shared.
- **Remediation:** Implement nested React Router routes:
  - `/app/dashboard`
  - `/app/timetable`
  - `/app/analytics`
  - `/app/lessons`
  - `/app/materials`
  - `/app/assessments`
  - `/app/grading`
  - `/app/groups`
  - `/app/students`
  - `/app/mentors`
  - `/app/users`
  - `/app/admin`
  - `/app/curriculum`
  - `/app/profile`

### 5.2 Excessive Initial Data Payload
- **Problem:** On initial mount, `App.tsx` calls `Promise.all([scheduleApi.getAll(), studentApi.getAll(), mentorApi.getAll(), groupApi.getAll()])`, loading unbounded lists of all schedules, students, mentors, and groups into memory.
- **Impact:** Slow initial page load, high memory consumption, and unnecessary data transfer for students who only need their own group and timetable.
- **Remediation:** Move data fetching into individual page components using TanStack React Query (`useQuery`) with server-side pagination and role-based scoping.

---

## 6. Build, Quality Assurance & Lint Deficiencies

### 6.1 TypeScript Build Failure
- **Error:** `src/components/lessons/RichTextRenderer.tsx:2:10 - error TS6133: 'Lightbulb' is declared but its value is never read.`
- **Command:** `cd frontend && npm run build` fails with exit code 2.

### 6.2 ESLint Syntax Errors
- **17 Errors:**
  - Unnecessary backslash escapes in `defaultLessonsData.ts` (lines 202, 386, 572, 705).
  - Empty block statement in `AssessmentEngine.tsx` (line 114).
  - Useless variable assignment in `AttendanceCalendar.tsx` (line 150).
- **15 Warnings:**
  - Missing hook dependencies (`useEffect` and `useMemo`) across `AnalyticsDashboard.tsx`, `UsersDirectory.tsx`, `GlobalSearchModal.tsx`, `ProfilePage.tsx`.

### 6.3 Vitest Unit Test Failure
- **Error:** `src/components/__tests__/Modules08To11.test.tsx` line 340 fails:
  ```
  Timed out waiting for: expect(screen.getByText(/Tabriklaymiz! Testdan o‘tdingiz/i)).toBeInTheDocument()
  ```
  Caused by string mismatch with revised feedback text in `AssessmentEngine.tsx`.

---

## 7. Performance & Query Optimization Deficiencies

### 7.1 N+1 Query Hotspots
1. `AttendanceScheduleService.toDto()`: Executes `attendanceRecordRepository.findByLessonSessionId(s.getId())` for every session. For 50 sessions, this fires 50 queries. If attendance is not yet recorded, it executes another query to `groupMembershipRepository.findByGroupIdAndStatus(...)` per session, totaling 100+ SQL queries for a single calendar view.
2. `AnalyticsAuthorizationService.validateStudentAccess()`: Executes `mentorRepository.findAll().stream()` on every request to find a matching mentor by email/name.
3. `AnalyticsService.getSystemOverview()`: Loops over every study group and executes `getGroupAnalytics()`, which in turn queries attendances, assessments, assignments, and lesson sessions per group.

### 7.2 Missing Pagination on Core Endpoints
- `GET /api/students`: Returns unbounded `List<Student>`.
- `GET /api/mentors`: Returns unbounded `List<Mentor>`.
- `GET /api/groups`: Returns unbounded `List<StudyGroup>`.
- `GET /api/schedules`: Returns unbounded `List<Schedule>`.
- **Remediation:** Introduce Spring Data JPA `Pageable` (`page`, `size`, `sort`) returning `PageResponse<T>`.
