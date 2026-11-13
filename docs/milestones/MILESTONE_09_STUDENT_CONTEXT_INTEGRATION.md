# Milestone 09: Authenticated Student Context & Data Ownership Integration

**Project:** AXV Nexus (Al-Xorazmiy Vorislari Hub)  
**Milestone:** 09 — Authenticated Student Context & Data Ownership Integration  
**Architecture:** Modular Monolith + DDD + Feature-Sliced Design (FSD 2.1)  
**Status:** **COMPLETED (100% VERIFIED)**  

---

## 1. Previous Problem

In previous iterations and prototypes of AXV Nexus, student-facing features across the platform suffered from decoupled student identity, insecure client-side fallbacks, and potential Insecure Direct Object Reference (IDOR) vulnerabilities:

1. **Decoupled Identity & Hardcoded Fallbacks:**
   - In `AssessmentEngine.tsx`, active student identity was determined using:
     ```ts
     const activeStudentId = _students[0]?.id || 1;
     ```
   - In `GamificationDashboard.tsx`, student gamification identity used:
     ```ts
     const activeStudentId = students[0]?.id || 1;
     ```
   - In assignment submissions, the request hardcoded `studentId: 1`.
   - In daily streak tracking and XP calculations, mocked sample streaks (`getDefaultSampleStreak`) were rendered with fabricated numbers (`currentStreak: 5`, `longestStreak: 14`, `totalActiveDays: 24`).
2. **Missing Server-Side Resolution for Student Profile:**
   - There was no dedicated endpoint (`/api/students/me`) allowing an authenticated student to retrieve their own student profile directly from their security context.
   - The general student list endpoint (`GET /api/students`) was strictly restricted to administrators and mentors (`hasRole('ADMIN')`, `hasRole('MENTOR')`). When an authenticated student loaded the main application, calling `GET /api/students` returned HTTP 403 Forbidden, leaving the `students` list empty `[]`.
   - Because `students` was empty, the client fell back to `students[0]?.id || 1`, causing every student in the platform to act on student ID `1`.
3. **IDOR & Spoofing Risks:**
   - Assessment attempt starts (`POST /api/assessments/{id}/start?studentId=...`), quiz submissions, and assignment submissions accepted arbitrary `studentId` parameters from the request payload.
   - Any client could pass another student's ID and initiate attempts or submit work in their name if ownership was not strictly validated against the server-side `SecurityContextHolder`.
4. **Cache & Session Bleed:**
   - Test attempts were stored in a global `axvhub_test_attempts` key in browser `localStorage`, leaking results and attempt states across user sessions upon logout or account switching.

---

## 2. Root Cause Analysis

1. **Architectural Gap in Identity Hierarchy:**
   - The platform defines two core entities: `User` (the authentication principal in `users` table) and `Student` (the educational profile in `students` table).
   - Milestone 03 added the foreign key `students.user_id REFERENCES users(id) UNIQUE`, but the presentation layer had not yet integrated a self-service resolution pattern (`/api/students/me`).
2. **RBAC Scoping Conflict:**
   - Students were forbidden from listing all students via `GET /api/students` (which is correct behavior for data privacy). However, frontend components (`AssessmentEngine`, `GamificationDashboard`) expected the `students` prop from `App.tsx`, which was empty for student accounts.
3. **Prototype Fallback Remnants:**
   - Temporary fallbacks `[0]?.id || 1` left over from early UI prototyping masked the missing student context instead of exposing missing profile states or properly binding to the authenticated session.

---

## 3. Backend Implementation

### 3.1 Reliable Identity Resolution (`ResourceOwnershipService`)
Extended `ResourceOwnershipService` to establish a singular, reliable relationship:
`Authenticated Principal → SecurityContextHolder → User Entity → students.user_id → Student Profile`

Key mechanisms in `ResourceOwnershipService.java`:
- `getCurrentStudent()`:
  1. Resolves `CurrentUserHelper.getCurrentUser()`.
  2. Queries `studentRepository.findByUserId(user.getId())` using the unique index `idx_students_user_id`.
  3. Seamlessly links existing legacy accounts by username/studentIdNumber if `user_id` was unlinked.
- `requireCurrentStudent()`:
  - Returns the resolved `Student` entity or throws `ResourceNotFoundException("Tizimga kirgan foydalanuvchiga biriktirilgan o'quvchi profili topilmadi")` which maps to HTTP 404 with structured `ApiResponse`.
- `verifyStudentAccess(Long targetStudentId)`:
  - Enforces that students can access **only** their own data (`targetStudentId.equals(currentStudent.getId())`), mentors can access only students enrolled in their assigned study groups, and admins retain authorized oversight. Any cross-access attempt immediately throws `AccessDeniedException` (HTTP 403 Forbidden).

### 3.2 Secure API Endpoints
1. **Student Profile (`StudentController.java`):**
   - `GET /api/students/me` & `GET /api/v1/students/me`: Returns the authenticated student's profile. Accessible to any authenticated user with an associated student profile.
2. **Assessment Scoping (`AssessmentController.java`):**
   - `POST /api/assessments/{id}/start`: `studentId` is optional. When invoked by a student, it automatically binds to `requireCurrentStudent().getId()`. Any provided `studentId` from a student that does not match their own profile is overridden/verified.
   - `POST /api/assessments/attempts/{attemptId}/submit`: Resolves the attempt from the database and executes `verifyStudentAccess(attempt.getStudentId())`. Cross-student submission attempts are blocked with HTTP 403 Forbidden.
   - `GET /api/assessments/attempts/{attemptId}` & `/answers`: Validates ownership via `verifyStudentAccess`.
   - `GET /api/assessments/my-attempts`: Returns only the authenticated student's quiz history.
3. **Assignment Scoping (`AssignmentController.java`):**
   - `POST /api/assignments/{id}/submit`: Binds automatically to the authenticated student.
   - `GET /api/assignments/my-submissions`: Scoped to the current student's submissions.
   - `GET /api/assignments/students/{studentId}/submissions`: Protected by `verifyStudentAccess`.
4. **Gamification Scoping (`GradingController.java`):**
   - `GET /api/grading/profile/me`: Returns `StudentGamificationProfile` (XP, rank, streak, level, achievements) for the authenticated student.
   - `GET /api/grading/streak/me`: Returns `StreakStatusDto` for the authenticated student.
   - `GET /api/grading/grades/me`: Returns `List<GradeRecord>` for the authenticated student.
   - `GET /api/grading/points/me`: Returns `List<PointTransaction>` for the authenticated student.
   - `POST /api/grading/streak/check-in`: When `studentId` is omitted or called by a student, automatically binds to `requireCurrentStudent().getId()`.

---

## 4. Frontend Implementation

### 4.1 Typed Hook: `useCurrentStudent`
Created `frontend/src/features/auth/useCurrentStudent.ts`:
- TanStack Query hook with query key: `['current-student', auth?.user?.id]`.
- Enabled strictly when `isAuthenticated && isStudent && auth?.user?.id`.
- Fetches `studentApi.getMe()`.
- Catches HTTP 404 cleanly and returns `hasProfile: false`, `student: null`.
- Automatically supplies `queryClient` so it executes safely both within full applications and standalone component unit tests.

### 4.2 Cache Invalidation & Session Separation (`AuthContext.tsx`)
- On user logout (`confirmLogout`, `forceLogout`):
  - Calls `queryClient.clear()` to completely purge all cached queries and server state.
  - Removes `STORAGE_KEY` (`axm_nexus_user`).
  - Cleans up user-scoped test attempts (`axvhub_test_attempts`).
- On login and registration:
  - Invokes `queryClient.clear()` to guarantee account switching never displays queries or cached profiles from the previous session.

### 4.3 `AssessmentEngine.tsx` Integration
- Completely removed `activeStudentId = _students[0]?.id || 1` and `studentId: 1`.
- Bound to `useCurrentStudent()`:
  - For students, `activeStudentId = currentStudentId ?? undefined`.
  - In `startAttempt(assessment.id, activeStudentId)`, if `activeStudentId` is undefined or omitted, backend resolves the authenticated session.
  - Synchronizes attempt history directly from the backend via `assessmentApi.getMyAttempts()`.
  - Scopes local attempt persistence by `auth.user.id` (`axvhub_test_attempts_${userId}`).
  - If `auth?.isStudent && !loadingStudent && !hasProfile`, displays a clear, localized warning banner indicating the account is not linked to a student record.

### 4.4 `GamificationDashboard.tsx` Integration
- Completely removed `activeStudentId = students[0]?.id || 1`.
- Eliminated fake mocked streaks (`getDefaultSampleStreak`) for authenticated users.
- Replaced hardcoded level values (`Level 3: Active Dev`, `750 / 1000 XP`) with real values from `studentProfile.level`, `studentProfile.totalPoints`, `studentProfile.nextLevelXp`, and `studentProfile.levelProgressPercent`.
- Displays real unlocked badges (`unlockedAchievements`) and shows clean empty states when a student has not earned any badges yet.
- Award points modal uses `auth?.user?.id` for `awardedByUserId` instead of hardcoded `1`.
- If `auth?.isStudent && !loadingStudent && !hasProfile`, displays a friendly unlinked student alert.

---

## 5. Security Model & IDOR Protection Matrix

| Resource / Action | Endpoint | Student A Access | Student B Access to A | Mentor (Assigned) | Mentor (Unassigned) | Administrator |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| Personal Profile | `GET /api/students/me` | Allowed | Denied (Gets B's profile) | Denied (No profile) | Denied (No profile) | Denied (No profile) |
| Gamification Profile | `GET /api/grading/profile/me` | Allowed | Denied (Gets B's profile) | Denied (No profile) | Denied (No profile) | Denied (No profile) |
| Arbitrary Gamification Profile | `GET /api/grading/profile/{id}` | Allowed (Only if ID=A) | Denied (403 Forbidden) | Allowed | Denied (403 Forbidden) | Allowed |
| Start Assessment Attempt | `POST /api/assessments/{id}/start` | Allowed (Binds to A) | Denied (Cannot start for A) | Allowed (For assigned) | Denied (403 Forbidden) | Allowed |
| Submit Assessment Attempt | `POST /api/assessments/attempts/{attemptId}/submit` | Allowed (Only if A owns attempt) | Denied (403 Forbidden) | Denied (Students only) | Denied (Students only) | Denied |
| View Attempt & Answers | `GET /api/assessments/attempts/{attemptId}` | Allowed (Only if A owns attempt) | Denied (403 Forbidden) | Allowed | Denied (403 Forbidden) | Allowed |
| My Attempts History | `GET /api/assessments/my-attempts` | Allowed (Only A's attempts) | Denied (Gets B's attempts) | Denied (No attempts) | Denied (No attempts) | Denied (No attempts) |
| Other Student Attempts | `GET /api/assessments/students/{id}/attempts` | Allowed (Only if ID=A) | Denied (403 Forbidden) | Allowed | Denied (403 Forbidden) | Allowed |
| Submit Homework | `POST /api/assignments/{id}/submit` | Allowed (Binds to A) | Denied (Cannot submit for A) | Denied | Denied | Denied |
| View My Submissions | `GET /api/assignments/my-submissions` | Allowed (Only A's work) | Denied (Gets B's work) | Denied | Denied | Denied |
| Other Student Submissions | `GET /api/assignments/students/{id}/submissions` | Allowed (Only if ID=A) | Denied (403 Forbidden) | Allowed | Denied (403 Forbidden) | Allowed |
| Daily Streak Check-in | `POST /api/grading/streak/check-in` | Allowed (Binds to A) | Denied (Cannot check-in for A) | Denied | Denied | Denied |
| Academic Grades | `GET /api/grading/grades/me` | Allowed (Only A's grades) | Denied (Gets B's grades) | Denied | Denied | Denied |
| Point Transactions | `GET /api/grading/points/me` | Allowed (Only A's history) | Denied (Gets B's history) | Denied | Denied | Denied |

---

## 6. API Changes

| HTTP Method | Endpoint | Authorization | Description |
|:---|:---|:---|:---|
| `GET` | `/api/students/me`, `/api/v1/students/me` | `isAuthenticated()` | Returns the authenticated student's profile |
| `GET` | `/api/assessments/my-attempts` | `isAuthenticated()` | Returns all quiz attempts for the authenticated student |
| `POST` | `/api/assessments/{id}/start` | `isAuthenticated()` | Starts quiz attempt; studentId is optional (binds to session) |
| `POST` | `/api/assessments/attempts/{attemptId}/submit` | `isAuthenticated()` | Submits attempt with server-side ownership verification |
| `GET` | `/api/assessments/attempts/{attemptId}` | `isAuthenticated()` | Returns attempt result; verified against student ownership |
| `GET` | `/api/assessments/attempts/{attemptId}/answers` | `isAuthenticated()` | Returns student answers; verified against ownership |
| `GET` | `/api/assignments/my-submissions` | `isAuthenticated()` | Returns all assignments submitted by the authenticated student |
| `POST` | `/api/assignments/{id}/submit` | `isAuthenticated()` | Submits assignment; studentId is optional (binds to session) |
| `GET` | `/api/grading/profile/me` | `isAuthenticated()` | Returns gamification profile (XP, rank, streak, level, badges) |
| `GET` | `/api/grading/streak/me` | `isAuthenticated()` | Returns daily streak status for the authenticated student |
| `GET` | `/api/grading/grades/me` | `isAuthenticated()` | Returns academic grades for the authenticated student |
| `GET` | `/api/grading/points/me` | `isAuthenticated()` | Returns point transactions for the authenticated student |
| `POST` | `/api/grading/streak/check-in` | `isAuthenticated()` | Checks in streak; studentId is optional (binds to session) |

---

## 7. Database Changes & Constraints

- No new database schema migration was necessary for Milestone 09.
- Verified that Liquibase migration `014-data-architecture-integrity.sql` (Milestone 03) already establishes:
  ```sql
  ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user_id ON students (user_id);
  ```
- Uniqueness constraint `idx_students_user_id` strictly prevents a single `User` account from being attached to multiple student profiles.
- Backfill logic links existing legacy students via `student_id_number = username` or `pinfl = username`.

---

## 8. Test Results

### 8.1 Backend Test Results
- **Command:** `cd backend && ./gradlew test`
- **Results:**
  - Total test suites: **25**
  - Total tests executed: **144**
  - Failures: **0**
  - Skipped: **0**
  - Success Rate: **100%**
- **Dedicated Security Integration Suite:** `StudentContextAndDataOwnershipIntegrationTest.java`
  - Total tests: **21 / 21 passed**
  - Tested: Anonymous 401 on all `/me` endpoints, student self-resolution, missing profile 404, IDOR protection (403 on grades, points, attempts, submissions, and gamification profiles), automatic attempt binding, automatic streak check-in, mentor group scoping, and admin super-access.

### 8.2 Frontend Test Results
- **Command:** `cd frontend && npm test -- --run`
- **Results:**
  - Total test files: **25**
  - Total tests executed: **135**
  - Failures: **0**
  - Skipped: **0**
  - Success Rate: **100%**
- **Dedicated Student Context Test Suite:** `StudentContextAndDataOwnership.test.tsx`
  - Total tests: **5 / 5 passed**
  - Tested: `useCurrentStudent` resolution via `studentApi.getMe()`, missing profile 404 handling, `AssessmentEngine` missing profile warning, `GamificationDashboard` real student data display, logout query cache and storage clearance.

### 8.3 Frontend Production Build
- **Command:** `cd frontend && npm run build`
- **Result:**
  - `tsc -b`: Passed with 0 errors.
  - `vite build`: `dist/index.html` built in 1.17s.

---

## 9. Remaining Limitations & Out of Scope

In accordance with Section 10 (Scope Control):
- **Branches and classes relational modeling:** Out of scope for this milestone (scheduled for Milestone 05).
- **Dashboard analytics redesign:** Out of scope (scheduled for Milestone 08).
- **Full React Router nested routing migration:** Out of scope (scheduled for Milestone 10).
- **AI features and new notification systems:** Out of scope (scheduled for Milestone 11).
