# AXV Nexus — Gamification Engine: Implementation Architecture

## 1. System Architecture Overview

The Gamification Engine in **AXV Nexus (Al-Xorazmiy Vorislari Hub)** serves as the central motivational and progression infrastructure for students. It translates verified academic achievements (quizzes, assignments, lesson attendance) into Experience Points (XP), maintains contiguous daily learning streaks with protective freezes, unlocks categorical achievement badges, and ranks students on period-scoped leaderboards.

### Architectural Core Principles
1. **Backend as the Single Source of Truth**: XP, streaks, levels, and achievements are strictly computed and persisted in PostgreSQL. The frontend never computes or persists state in React state or localStorage.
2. **Immutable Transactional Ledger**: All point awards, penalties, and adjustments are recorded in `student_point_history` with unique event reference idempotency. No balance overwrites occur without an audit trail.
3. **Academic Timezone Policy**: All daily streak calculations and freeze validations are anchored to `Asia/Tashkent` (`UTC+5`), preventing midnight shift anomalies.
4. **Decoupled Configuration**: All XP rewards, milestone thresholds, and level tiers are stored in the `gamification_configurations` table and exposed via `GamificationConfigService`, eliminating hardcoded magic numbers.
5. **Enriched Real-Time Feedback**: Assessment submissions, assignment evaluations, and lesson attendances return immediate gamification feedback (`xpEarned`, `xpSources`, `streakStatus`, `newAchievements`, `levelProgression`) directly in response payloads.

---

## 2. Module Breakdown & Domain Organization

The implementation spans both backend Domain-Driven Design (DDD) modules and frontend Feature-Sliced Design (FSD) layers:

```
axvhub/
├── backend/src/main/java/uz/axm/nexus/
│   ├── grading/                          # Gamification Core Domain
│   │   ├── entity/                       # Entities: Point, Streak, Freeze, Achievement, Config
│   │   ├── repository/                   # Spring Data JPA Repositories
│   │   ├── service/                      # Gamification, Config, and Ledger Services
│   │   ├── controller/                   # REST Endpoints with RBAC
│   │   └── dto/                          # Strong Request/Response DTOs
│   ├── assessments/                      # Quiz Evaluation & Gamification Enrichment
│   │   ├── entity/StudentAssessmentAttempt.java
│   │   └── service/AssessmentService.java
│   ├── assignments/                      # Assignment Evaluation & Gamification Enrichment
│   │   ├── entity/AssignmentSubmission.java
│   │   └── service/AssignmentService.java
│   └── lessons/                          # Lesson Completion & Attendance Hooks
│       └── service/LessonService.java
├── backend/src/main/resources/db/changelog/
│   ├── changes/018-gamification-engine-tables.sql
│   ├── changes/019-seed-achievements-and-configs.sql
│   └── changes/020-gamification-integrity-and-audit.sql
└── frontend/src/
    ├── types.ts                          # TypeScript types & DTO definitions
    ├── api.ts                            # Axios client bindings
    ├── features/gamification/
    │   ├── GamificationDashboard.tsx     # Student Gamification Hub & Ledger UI
    │   └── useGamification.ts            # TanStack Query hooks & Cache Invalidation
    └── features/assessments/
        └── AssessmentEngine.tsx          # Real-time XP banner & Gamification Feedback
```

---

## 3. Entities and Database Schemas

### 3.1 `student_point_history` (XP Transaction Ledger)
Stores every immutable XP transaction with event deduplication.
- `id` (BIGSERIAL, PK)
- `student_id` (BIGINT, FK to `users`, NOT NULL)
- `points` (INT, NOT NULL)
- `point_source` (VARCHAR(50), NOT NULL: `QUIZ`, `ASSIGNMENT`, `STREAK`, `ACHIEVEMENT`, `LESSON`, `ADJUSTMENT`)
- `event_reference_id` (VARCHAR(100), UNIQUE constraint for idempotency)
- `description` (TEXT)
- `awarded_at` (TIMESTAMPTZ, default `NOW()`)
- `metadata` (TEXT / JSON)

### 3.2 `student_streaks`
Tracks continuous daily learning momentum for each student.
- `id` (BIGSERIAL, PK)
- `student_id` (BIGINT, FK to `users`, UNIQUE, NOT NULL)
- `current_streak` (INT, default 0)
- `longest_streak` (INT, default 0)
- `last_activity_date` (DATE)
- `streak_freeze_count` (INT, default 0)
- `updated_at` (TIMESTAMPTZ)

### 3.3 `streak_freeze_history`
Audits freeze allocations and consumptions with partial uniqueness against duplicate usage.
- `id` (BIGSERIAL, PK)
- `student_id` (BIGINT, FK to `users`, NOT NULL)
- `action_type` (VARCHAR(30), NOT NULL: `ADMIN_GRANT`, `PURCHASED`, `AUTO_CONSUMED`, `MANUAL_USED`)
- `used_date` (DATE, NOT NULL)
- `reason` (VARCHAR(255))
- `created_at` (TIMESTAMPTZ, default `NOW()`)
- **Integrity Constraint**: Partial unique index on `(student_id, used_date)` where `action_type IN ('AUTO_CONSUMED', 'MANUAL_USED')`.

### 3.4 `achievements` & `student_achievements`
Master catalog and per-student unlock history.
- `achievements`: `id`, `code` (UNIQUE), `title`, `description`, `icon_url`, `badge_color`, `category`, `rarity` (`COMMON`, `RARE`, `EPIC`, `LEGENDARY`), `criteria_type`, `criteria_threshold`, `points_reward`, `is_active`, `display_order`.
- `student_achievements`: `id`, `student_id`, `achievement_id`, `unlocked_at`, `progress`, `is_unlocked`. Unique constraint on `(student_id, achievement_id)`.

### 3.5 `gamification_configurations`
Key-value configuration store for reward values, thresholds, and level definitions.
- `id` (BIGSERIAL, PK)
- `config_key` (VARCHAR(100), UNIQUE)
- `config_value` (VARCHAR(255))
- `description` (TEXT)
- `updated_at` (TIMESTAMPTZ)

---

## 4. Services and Business Logic

### 4.1 `GradingAndGamificationService`
Central orchestrator for all gamification actions:
- `awardPoints(studentId, points, source, eventRef, description, metadata)`: Uses `pointHistoryRepository.existsByEventReferenceId(eventRef)` to guarantee idempotency. Automatically recalculates leaderboard ranks and checks XP milestone achievements.
- `awardQuizCompletion(studentId, attemptId, quizTitle)`: Config-driven completion reward (Default: 10 XP).
- `awardQuizPassing(studentId, attemptId, quizTitle)`: Config-driven passing threshold reward (Default: 20 XP).
- `awardQuizHighScore(studentId, attemptId, quizTitle, scorePercentage)`: Awards 30 XP for score >= 90% and 50 XP for a perfect 100%.
- `awardAssignmentCompletion(studentId, submissionId, title)`: Awards 15 XP for validated grading.
- `awardAssignmentOnTime(studentId, submissionId, title)`: Awards 10 XP if submitted prior to deadline.
- `awardAssignmentExcellent(studentId, submissionId, title)`: Awards 25 XP if graded >= 90%.
- `awardLessonCompletion(studentId, lessonId, title)`: Awards 5 XP for verified attendance.
- `recordDailyActivity(studentId, activityDate)`: Evaluates streak progression against `last_activity_date`:
  - Same date: Idempotent no-op.
  - Previous day: Increments `current_streak`, updates `longest_streak`, checks milestone bonuses (3, 7, 14, 30, 60, 100 days).
  - Missed exactly 1 day: If `streak_freeze_count > 0` and no freeze already used for yesterday, consumes 1 freeze, records `AUTO_CONSUMED`, and increments streak.
  - Missed > 1 day (or 0 freezes): Resets `current_streak` to 1.
- `consumeStreakFreezeManually(studentId, missedDate)`: Allows student or admin to protect a missed calendar day explicitly.

### 4.2 `GamificationConfigService`
Cached configuration provider that supplies defaults and falls back gracefully:
- Configurable reward points: `quiz.completion.xp`, `quiz.passing.xp`, `quiz.highscore.xp`, `assignment.completion.xp`, `assignment.ontime.xp`, `assignment.excellent.xp`, `lesson.completion.xp`, `streak.daily.xp`.
- Streak milestones: `streak.milestone.3`, `streak.milestone.7`, `streak.milestone.14`, `streak.milestone.30`, `streak.milestone.60`, `streak.milestone.100`.
- 10-Tier Level thresholds: `level.threshold.1` through `level.threshold.10`.

---

## 5. Educational Domain Integrations

### 5.1 Quiz & Assessment Integration (`AssessmentService.java`)
Upon completion of an attempt via `finishAttempt()`:
1. Attempt is graded and persisted.
2. `awardQuizCompletion` creates idempotent XP transaction `QUIZ_COMPLETE_<attemptId>`.
3. If `passed`: `awardQuizPassing` creates `QUIZ_PASS_<attemptId>`.
4. If `scorePercentage >= 90%`: `awardQuizHighScore` creates `QUIZ_HIGH_<attemptId>`.
5. Streak is updated via `recordDailyActivity(studentId, TashkentToday)`.
6. Checks and unlocks `FIRST_QUIZ`, `QUIZ_10`, `QUIZ_50`, `QUIZ_100`, `PERFECT_SCORE`.
7. Attempt is enriched with transient fields: `xpEarned`, `xpSources`, `streakStatus`, `newAchievements`, and `levelProgression`.

### 5.2 Assignment Workflow (`AssignmentService.java`)
When a teacher grades an assignment via `gradeSubmission()`:
1. Submission grade is persisted.
2. `awardAssignmentCompletion` creates `ASSIGNMENT_COMPLETE_<submissionId>`.
3. If submitted before `assignment.dueDate`: `awardAssignmentOnTime` creates `ASSIGNMENT_ONTIME_<submissionId>`.
4. If score >= 90%: `awardAssignmentExcellent` creates `ASSIGNMENT_EXCELLENT_<submissionId>`.
5. Streak is updated via `recordDailyActivity(studentId, TashkentToday)`.
6. Submission is enriched with gamification feedback.

### 5.3 Lesson Completion (`LessonService.java`)
When a student completes an interactive lesson or attendance is confirmed:
1. Student attendance is verified.
2. `awardLessonCompletion` creates `LESSON_COMPLETE_<lessonId>_<studentId>`.
3. Streak is updated for the student.

---

## 6. Frontend Integration & User Experience

### 6.1 State Management & Cache Invalidation
- TanStack Query hooks located in `frontend/src/features/gamification/useGamification.ts`:
  - `useStudentGamificationProfile(studentId)`
  - `useGamificationSummary()`
  - `useMyTotalXp()`
  - `useMyXpHistory(page, size, source)`
  - `useStreakFreeze()` mutation with automatic query cache invalidation.
- `invalidateGamificationQueries()` invalidates profile, summary, total XP, and leaderboards after quiz completion or freeze activation.

### 6.2 UI Components
- **`GamificationDashboard.tsx`**:
  - Displays Level badge, title, and visual progress bar to next level.
  - Active Streak card with "Qo‘llash" (Use Freeze) button wired to `useStreakFreeze()`.
  - Filterable Leaderboard (All-Time, Monthly, Weekly) with empty state rendering.
  - Achievements grid showing unlocked vs. locked status, criteria progress, and rarity badges.
  - **Audit Ledger Table**: Paginated transaction history showing date, source badge, XP delta, event reference, and description.
- **`AssessmentEngine.tsx`**:
  - Displays instant celebratory banner on quiz completion with real backend XP, streak days, and newly unlocked badges.

---

## 7. Security, Permissions & RBAC

All endpoints in `GradingController.java` strictly enforce role-based access control:
- **Student Self-Service**:
  - `/api/grading/points/me`, `/api/grading/points/me/total`, `/api/grading/points/me/summary`, `/api/grading/points/me/history` resolve the student identity directly from the authenticated server-side `UserContext`. Student IDs in request bodies are ignored.
- **Freeze Usage**:
  - `POST /api/grading/streaks/me/freeze/use` allows students to consume an available freeze for their own account only.
- **Administrative Endpoints**:
  - `POST /api/grading/points/award`: Restricted to `ADMIN` or `SUPER_ADMIN` when `pointSource == 'ADJUSTMENT'`.
  - `POST /api/grading/streaks/student/{studentId}/freeze/grant`: Restricted to `ADMIN` and `SUPER_ADMIN`.
  - `POST /api/grading/achievements`, `PUT /api/grading/achievements/{id}`, `PATCH /api/grading/achievements/{id}/toggle`: Restricted to `ADMIN` and `SUPER_ADMIN`.
- **Anti-Gaming Controls**:
  - Rate limiting and idempotency keys prevent duplicate XP spamming.
  - Direct database constraints prevent double-freeze consumption for the same calendar date.

---

## 8. Timezone Policy (`Asia/Tashkent`)

- All calendar calculations use `ZoneId.of("Asia/Tashkent")`.
- `LocalDate.now(ZoneId.of("Asia/Tashkent"))` determines academic day boundaries.
- Timestamps are stored in UTC with timezone in PostgreSQL (`TIMESTAMPTZ`) and serialized to ISO-8601 strings.
- Prevents timezone drift between the server hardware (UTC) and local student study schedules.

---

## 9. Verification & Quality Assurance

- **Backend Integration Tests**:
  - `uz.axm.nexus.grading.GamificationEngineFullIntegrationTest`: Validates XP awards, streak progression, auto-freeze consumption, manual freeze consumption, idempotency duplicates, achievement unlocking, and 10-tier level calculation.
  - `uz.axm.nexus.grading.GradingControllerSecurityTest`: Validates RBAC protection, student self-service isolation, and admin-only endpoints.
  - Assessment, Assignment, and Lesson integration test suites.
- **Frontend Verifications**:
  - Vitest test suite (`npm test`) passes with 100% compliance.
  - TypeScript build (`npm run build`) compiles with zero errors and strict typing.
