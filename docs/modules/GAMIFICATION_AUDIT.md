# AXV Nexus — Gamification Engine Audit Report (Phase 0)

**Date:** 2026-11-15  
**Auditor:** Senior Software Architect & Full-Stack Engineer  
**Scope:** Modular Monolith Gamification Engine (XP, Daily Streaks, Achievements, Leaderboards, Configurations, and Integrations)

---

## 1. Executive Summary

An in-depth architectural and code audit of the **AXV Nexus (Al-Xorazmiy Vorislari Hub)** platform was conducted across the backend Spring Boot domain modules (`grading`, `assessments`, `assignments`, `lessons`, `users`, `identity`, `shared`) and frontend React/TypeScript features (`GamificationDashboard`, `AssessmentEngine`, `useGamification`, `api.ts`, `types.ts`).

The core architecture follows a DDD + Modular Monolith pattern with Liquibase migrations and TanStack Query on the frontend. A substantial foundation already exists in `uz.axm.nexus.grading`, featuring `PointTransaction`, `StudentStreak`, `StreakFreezeHistory`, `Achievement`, `StudentAchievement`, and `GamificationConfiguration`. However, critical gaps were discovered regarding dynamic configuration usage, hardcoded XP rewards, sample fallback data in UI components, build type mismatches (`SpringPageDto`), and database-level freeze consumption constraints.

---

## 2. Existing Working Functionality

### 2.1 Backend (`grading` Module)
- **Immutable XP Transaction Ledger:** `PointTransaction` entity records `studentId`, `amount`, `pointSource`, `referenceId`, `referenceType`, `idempotencyKey`, `reason`, `awardedByUserId`, and `createdAt`. `awardPoints` enforces idempotency via unique `idempotencyKey` lookup and database unique constraint.
- **Traceable Score Adjustments:** `recordAdjustment` allows authorized administrators to adjust XP balances with a required descriptive reason and audit attribution.
- **Timezone-Aware Daily Streaks:** `GamificationTimeHelper` guarantees all calendar day transitions and periods are evaluated in `Asia/Tashkent` (`ZoneId.of("Asia/Tashkent")`).
- **Streak Logic:** `recordDailyActivity` handles:
  - First qualifying learning activity (`currentStreak = 1`, `streakStartDate = today`).
  - Consecutive calendar day activity (`currentStreak++`).
  - One missed day with automated freeze consumption (`currentStreak++`, `streakFreezeCount--`, logs to `StreakFreezeHistory`).
  - Reset to 1 on unexcused missed days.
  - Idempotency within the same calendar day (no double increments or duplicate daily XP).
- **Streak Freeze Management:** `consumeStreakFreezeManually`, `adjustStreakFreeze`, and `getStreakFreezeHistory` track and audit freeze operations.
- **Level Progressions:** Both legacy 5-tier (`calculateLevel`) and full Phase 4 10-tier progression (`calculateTenTierLevel`) are supported.
- **Leaderboards & Deterministic Tie-Breaking:** `getLeaderboard` orders students by:
  1. `totalPoints DESC`
  2. `highestSingleAward DESC`
  3. `earliestAchievedAt ASC`
  4. `studentId ASC`
  Filters out archived/inactive students and supports branch and group filtering with student privacy masking.
- **Achievement Subsystem:** Initializes default achievements in LEARNING, PERFORMANCE, CONSISTENCY, and PROGRESSION. Unlocks achievements idempotently via `(student_id, achievement_id)` unique constraint and awards corresponding XP.
- **Configuration Management:** `GamificationConfigService` backed by `gamification_configurations` table with ConcurrentHashMap cache.

### 2.2 Frontend
- `GamificationDashboard.tsx` provides rich visual widgets: podium ranking, streak card, XP progress, level badges, recent achievements, and administrative points modal.
- `useGamification.ts` provides TanStack Query hooks with structured cache invalidation (`GAMIFICATION_KEYS`).

---

## 3. Discovered Vulnerabilities, Deficiencies & Gaps

### 3.1 Hardcoded Values
1. **Assessment XP Awards:** In `AssessmentService.java` (lines 301, 316, 331, 345), XP values (`10`, `20`, `30`, `50`) are hardcoded integer literals rather than reading from `GamificationConfigService`.
2. **Assignment XP Awards:** In `AssignmentService.java` (lines 87, 101, 149), XP values (`15`, `10`, `25`) are hardcoded literals.
3. **Lesson Completion XP Awards:** In `LessonService.java` (line 263), `5` XP is hardcoded.
4. **Assessment Engine UI:** In `AssessmentEngine.tsx` (lines 420, 1511), the UI mistakenly displays `+${testResult.totalScore} XP berildi`, conflating quiz test score with gamification XP.

### 3.2 Fake or Simulated XP & Data Fallbacks
1. `GamificationDashboard.tsx` contained fallback methods:
   - `getDefaultSampleLeaderboard()`
   - `getDefaultSampleGroupLeaderboard()`
   - `getDefaultSampleStreak()`
   These generated simulated student records and streaks if the backend returned empty data. Violates the core principle that the backend is the single source of truth.

### 3.3 Build & TypeScript Errors
1. In `frontend/src/api.ts` (lines 867, 872) and `frontend/src/features/gamification/useGamification.ts` (line 15), `SpringPageDto` was imported from `@/types`, but `types.ts` did not export `SpringPageDto`, causing `npm run build` to fail (`tsc -b`).

### 3.4 Missing Backend Endpoints & Capabilities
1. **Achievement Admin Management:** No endpoints existed for administrators to create, update, or toggle active status of achievements dynamically (`POST /api/grading/achievements`, `PUT /api/grading/achievements/{id}`).
2. **Direct Period XP Query:** While summary exists, endpoint to query XP earned within arbitrary `startDate` and `endDate` parameters was missing.
3. **Quiz & Assignment Gamification Response Enrichment:** Submitting an assessment or assignment did not directly return the gamification reward breakdown (earned XP, streak change, newly unlocked badges), forcing frontend guesswork.

### 3.5 Missing Database Constraints & Integrity
1. **Streak Freeze Double-Use:** `streak_freeze_history` lacked a partial unique index preventing concurrent or duplicate freeze consumption for the same `(student_id, used_date)` when `action_type IN ('AUTO_CONSUMED', 'MANUAL_USED')`.
2. **Achievement Reverse Lookup Index:** Index on `student_achievements(achievement_id)` was absent.

### 3.6 Security & RBAC Weaknesses
1. In `GradingController.awardPoints`, non-admin mentors could technically submit payload with `pointSource = 'ADJUSTMENT'`. Adjustments must be strictly restricted to `ADMIN` and `SUPER_ADMIN`.
2. Self-service student operations must always strictly resolve student identity from authenticated security context (`resourceOwnershipService.requireCurrentStudent()`), never allowing a caller to pass arbitrary IDs without ownership verification.

---

## 4. Phase-by-Phase Remediation Plan

| Phase | Remediation Items | Target Files |
|---|---|---|
| **Phase 1: XP Engine** | Connect XP awards to `GamificationConfigService`; add `/api/grading/points/me/total` and date range endpoints; restrict `ADJUSTMENT` source to admins. | `GradingAndGamificationService.java`, `GradingController.java` |
| **Phase 2: Daily Streak Engine** | Enforce single freeze per missed day constraint; maintain Tashkent timezone rules; enrich streak check-in results. | `GradingAndGamificationService.java`, `020-gamification-integrity-and-audit.sql` |
| **Phase 3: Achievements** | Add admin achievement CRUD endpoints; support category, rarity, icon, criteria; calculate progress for multi-step achievements. | `GradingController.java`, `GradingAndGamificationService.java` |
| **Phase 4: Level Progression** | Align frontend and backend strictly on 10-tier progression (Level 1-10); ensure title and progress calculation consistency. | `GradingAndGamificationService.java`, `GamificationDashboard.tsx` |
| **Phase 5 & 6: Quiz, Assignment & Lesson Integration** | Replace hardcoded XP in `AssessmentService`, `AssignmentService`, and `LessonService` with config-driven methods in `GradingAndGamificationService`; enrich submission responses with gamification metadata. | `AssessmentService.java`, `AssignmentService.java`, `LessonService.java` |
| **Phase 7: Leaderboards** | Remove sample leaderboard fallbacks in UI; enforce deterministic tie-breakers; handle empty states gracefully. | `GradingAndGamificationService.java`, `GamificationDashboard.tsx` |
| **Phase 8: Admin & Configuration** | Complete admin endpoints for configs, achievement definitions, freeze adjustment, and audit log tracking. | `GradingController.java`, `GamificationConfigService.java` |
| **Phase 9: Frontend & UI** | Export `SpringPageDto`; remove mock data; connect quiz result modal to real backend gamification fields; complete UZ/RU/EN translations. | `types.ts`, `GamificationDashboard.tsx`, `AssessmentEngine.tsx` |
| **Phase 10: Database Integrity** | Create Liquibase migration `020-gamification-integrity-and-audit.sql` with partial unique index for freeze usage and indexes. | `020-gamification-integrity-and-audit.sql`, `db.changelog-master.yaml` |
| **Phase 11: Testing** | Add unit, integration, and security tests for all enhanced components; run full backend and frontend test suites. | Backend & frontend test directories |
| **Phase 12: Documentation** | Author `GAMIFICATION_IMPLEMENTATION.md`, `GAMIFICATION_API.md`, `GAMIFICATION_REWARD_RULES.md`, and `GAMIFICATION_COMPLETION_REPORT.md`. | `docs/modules/`, project root |
