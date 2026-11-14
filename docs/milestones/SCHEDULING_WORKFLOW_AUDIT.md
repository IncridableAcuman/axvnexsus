# AXV NEXUS — SCHEDULING WORKFLOW AUDIT
## Recurring Timetables, Individual Lesson Sessions, Calendar & Data Synchronization

**Status:** Completed  
**Milestone:** Scheduling Workflow Correction & Integration  
**Date:** 2026-11-14  
**Auditor:** Antigravity AI  

---

## 1. Executive Summary

This audit assesses the end-to-end scheduling system within the AXV Nexus educational management platform. The audit investigates runtime defects observed in application logs and user interfaces, analyzes the domain separation between recurring weekly timetables and individual lesson sessions, evaluates calendar data rendering, and proposes an architectural correction plan preserving Domain-Driven Design (DDD) in the backend and Feature-Sliced Design (FSD) in the frontend.

---

## 2. Root Cause Analysis of Specific Reported Issues

### 2.1 Issue 1: `ERROR: No static resource api/v1/admin/overview for request '/api/v1/admin/overview'`
- **Observed Behavior:** Frontend calls trigger HTTP 404 with Spring's `NoResourceFoundException`.
- **Root Cause:**
  - `frontend/src/api.ts` line 861 defines `adminApi.getOverview` using path `'/v1/admin/overview'`. Because axios `baseURL` is `/api`, the resolved URL is `/api/v1/admin/overview`.
  - In backend `uz.axm.nexus.audit.presentation.AdminOperationsController`, the class is mapped only to `@RequestMapping("/api/admin")`.
  - Other controllers (such as `AuthController`, `GradingController`, `StudentController`) support dual mappings `@RequestMapping({"/api/admin", "/api/v1/admin"})`.
- **Correction:**
  - Support `@RequestMapping({"/api/admin", "/api/v1/admin"})` in `AdminOperationsController.java`.
  - Align `frontend/src/api.ts` so `adminApi` targets `/admin/...` endpoints consistently.

---

### 2.2 Issue 2: `WARN: Noto'g'ri argument: Guruh topilmadi: 10`
- **Observed Behavior:** Backend logs `IllegalArgumentException: Guruh topilmadi: 10` when opening analytics or dashboards.
- **Root Cause:**
  - In `frontend/src/components/analytics/AnalyticsDashboard.tsx` line 66:
    ```tsx
    const [selectedGroupId, setSelectedGroupId] = useState<number>(groups[0]?.id || 10);
    ```
  - When `App.tsx` initially renders, `groups` is `[]` while asynchronous data fetching takes place. `useState` initializes once with fallback `10`.
  - When `groups` later loads, `selectedGroupId` remained `10` because there was no `useEffect` synchronizing the state.
  - When querying `analyticsApi.getGroupAnalytics(selectedGroupId)`, backend `AnalyticsService.java:236` executed:
    ```java
    studyGroupRepository.findById(groupId)
        .orElseThrow(() -> new IllegalArgumentException("Guruh topilmadi: " + groupId));
    ```
  - When the database lacks group ID 10, the call fails.
  - Similar issues exist in `CreateLessonModal.tsx` where `const [groupId, setGroupId] = useState<number>(groups[0]?.id || 1);` uses hardcoded fallback `1`.
- **Correction:**
  - Synchronize `selectedGroupId` and `groupId` with available group IDs via `useEffect` when groups load.
  - Guard against querying nonexistent group IDs.
  - Present explicit loading and empty states when no groups exist.

---

### 2.3 Issue 3: Plain String Conflict vs Structured Conflict Response
- **Observed Behavior:**
  - Conflict message: `"Xona (IT Lab 1) Seshanba kuni band! Unda YA-26I0804 darsi mavjud (15:00 - 16:30)"`.
  - UI displays an unformatted string error banner without actionable structure.
- **Root Cause:**
  - In `ScheduleService.java` and `AttendanceScheduleService.java`, conflict detection throws generic `BusinessException` with a concatenated string.
  - `GlobalExceptionHandler` converts this to `{ "success": false, "message": "...", "errorCode": "ERR_BUSINESS_RULE_VIOLATION" }`.
  - The frontend cannot programmatically identify which weekday, which conflict type (`CLASSROOM`, `MENTOR`, `GROUP`), or which resource conflicted, preventing weekday badge highlighting and structured remedies.
- **Correction:**
  - Introduce `ScheduleConflictException` and `ScheduleConflictResponse`:
    ```json
    {
      "code": "SCHEDULE_CONFLICT",
      "message": "Xona (IT Lab 1) Seshanba kuni band! Unda YA-26I0804 darsi mavjud (15:00 - 16:30)",
      "conflicts": [
        {
          "type": "CLASSROOM",
          "weekday": "TUESDAY",
          "resourceName": "IT Lab 1",
          "existingGroupCode": "YA-26I0804",
          "startTime": "15:00",
          "endTime": "16:30"
        }
      ]
    }
    ```
  - Handle `ScheduleConflictException` in `GlobalExceptionHandler` returning `HttpStatus.BAD_REQUEST` (keeping backwards compatibility with existing test assertions) and the structured conflict payload.
  - In frontend `ManualScheduleModal.tsx` and `CreateLessonModal.tsx`, parse `conflicts`, highlight the conflicting weekday badge in red, and display remediation options.

---

### 2.4 Issue 4: Empty Group & Mentor Selectors in Modal
- **Observed Behavior:**
  - In the schedule creation modal, group and mentor selection fields appear empty or unselectable.
- **Root Cause:**
  - `ManualScheduleModal.tsx` did not accept a `groups` prop from `App.tsx` (`<ManualScheduleModal mentors={mentors} ... />`).
  - Inside `ManualScheduleModal.tsx`, `groupCode` was an unlinked text input (`YA-26I0805`) rather than a selector from registered `StudyGroup`s.
  - In `CreateLessonModal.tsx`, `groups` was passed, but when empty on initial load, no fallback state was shown. Changing group did not auto-fill `subject`, `room`, or `mentor`.
- **Correction:**
  - Pass `groups` prop to `ManualScheduleModal.tsx` and provide a smart selector allowing users to select an existing group (auto-populating grade level, subject, mentor, room, and branch) or enter a custom group code.
  - In `CreateLessonModal.tsx`, auto-fill subject, room, and mentor based on the selected group, with explicit loading and empty states.

---

### 2.5 Issue 5: Calendar Empty State (November 2026) and Dashboard KPIs
- **Observed Behavior:**
  - Navigating to November 2026 (or any date beyond ±2 weeks from today) displays an empty calendar state.
  - Dashboard KPIs for scheduled lessons show zero.
- **Root Cause:**
  - `AttendanceCalendar.tsx` calls `attendanceApi.getSessions(undefined, undefined, ...)` without passing the current calendar month/week boundaries.
  - Backend `AttendanceScheduleService.getSessions(...)` defaults null dates to `now.minusWeeks(2)` and `now.plusWeeks(2)`.
  - More fundamentally: recurring weekly timetables created via `ManualScheduleModal` are stored in the `schedules` table (`Schedule` entity), NOT as persistent rows in `lesson_sessions`.
  - As a result, the calendar (which queries `LessonSessionRepository`) never displays recurring timetables unless an individual `LessonSession` was created!
  - Persistent future rows should NOT be generated indefinitely into the database (as mandated by business requirements against DB bloat).
- **Correction:**
  - **Virtual Calendar Projection:** In `AttendanceScheduleService.getSessions(startDate, endDate, mentorId, groupId)`, fetch persistent `LessonSession`s AND project recurring `Schedule` definitions onto matching weekdays within `[startDate, endDate]`. If a persistent session exists for that group and date, it supersedes the virtual projection.
  - In `AttendanceCalendar.tsx`, pass `startDate` and `endDate` corresponding to the active view mode (day, week, month) and `currentDate`.
  - Dashboard KPI aggregation combines active recurring schedules and completed/scheduled lesson sessions accurately.

---

## 3. Two Distinct Scheduling Operations

| Dimension | Operation A: Recurring Weekly Timetable | Operation B: Individual Lesson Session |
|---|---|---|
| **Domain Entity** | `Schedule` (`schedules` table) | `LessonSession` (`lesson_sessions` table) |
| **Lifecycle** | Semester-long recurring pattern | Single dated calendar event |
| **Day Representation** | `AcademicWeekday` / `DayPattern` (`ODD_DAYS`, `EVEN_DAYS`, `ALL_SIX_DAYS`, `CUSTOM`) | Specific `LocalDate` (e.g. `2026-11-20`) |
| **Time Format** | 24-hour `startTime` & `endTime` (`15:00` - `16:30`) | 24-hour `startTime` & `endTime` (`15:00` - `16:30`) |
| **UI Component** | `ManualScheduleModal.tsx` | `CreateLessonModal.tsx` |
| **Attendance Link** | None (template only) | Holds `AttendanceRecord`s |
| **Database Bloat Prevention** | Single record per group/subject; never generates endless future DB rows | Created on demand or instantiated when taking attendance / rescheduling |

---

## 4. Proposed Correction Strategy

1. **Backend Conflict & DTO Enhancements:**
   - Create `ConflictDetailDto`, `ScheduleConflictResponse`, and `ScheduleConflictException`.
   - Update `ScheduleService.checkConflicts(...)` to collect and throw `ScheduleConflictException`.
   - Add handler in `GlobalExceptionHandler` returning HTTP 400 Bad Request with `ScheduleConflictResponse`.
   - Add dual mapping `@RequestMapping({"/api/admin", "/api/v1/admin"})` in `AdminOperationsController`.

2. **Virtual Calendar Projection in `AttendanceScheduleService`:**
   - For `getSessions(startDate, endDate, mentorId, groupId)` and `getTodaySessions(mentorId)`:
     - Query persistent `LessonSession`s.
     - Query active `Schedule`s matching mentor/group filters.
     - For each day in the date range, match day of week with schedule pattern.
     - If no persistent session exists for that group on that date, project a virtual session (`id: -schedule.getId() * 100000 - dayOffset`, `status: "SCHEDULED"`, `isVirtual: true`).

3. **Frontend Modals & Forms:**
   - `ManualScheduleModal.tsx`: Add `groups` prop; allow selecting existing group or typing new; auto-fill fields; highlight conflicting weekday badge in red with conflict alert and action items.
   - `CreateLessonModal.tsx`: Fix state sync with `groups` & `mentors`; auto-fill from group; clear empty/loading states; validate 24-hour time and dates.
   - `AnalyticsDashboard.tsx`: Remove hardcoded fallback `10`; gracefully handle empty group selection.
   - `AttendanceCalendar.tsx`: Fetch sessions with explicit `startDate` and `endDate` based on `currentDate` and `viewMode`.

4. **TanStack Query Invalidation & Tests:**
   - Invalidate `['schedules']`, `['lessons']`, `['today-sessions']`, `['dashboard-admin']` on mutate.
   - Run full backend and frontend test suites.
