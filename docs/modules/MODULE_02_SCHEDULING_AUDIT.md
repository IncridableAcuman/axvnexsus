# AXV NEXUS — MODULE 02 AUDIT REPORT
## Recurring Schedule, Academic Calendar & Lesson Session Management

**Project:** Al-Xorazmiy Vorislari Hub (AXV Nexus) Educational Management Platform  
**Module:** Module 02 — Recurring Academic Scheduling, Shifts, Academic Calendar & Lesson Sessions  
**Date:** November 16, 2026  
**Status:** Audit Completed & Architecture Defined  

---

## 1. Existing Scheduling Data Model

The AXV Nexus scheduling and calendar domain currently consists of the following primary database tables and JPA entities:

### 1.1 `schedules` (`uz.axm.nexus.scheduling.domain.Schedule`)
- **Table:** `schedules`
- **Fields:**
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `group_id`: `BIGINT REFERENCES study_groups(id) ON DELETE CASCADE`
  - `mentor_id`: `BIGINT REFERENCES mentors(id) ON DELETE SET NULL`
  - `grade_level`: `VARCHAR(50) NOT NULL` (e.g. "8-sinf", "9-sinf")
  - `subject`: `VARCHAR(255) NOT NULL` (e.g. "Web Full-Stack Development")
  - `days`: `VARCHAR(255) NOT NULL` (e.g. "Dushanba, Chorshanba, Juma")
  - `day_pattern`: `VARCHAR(50) DEFAULT 'CUSTOM'` (Enum: `ODD_DAYS`, `EVEN_DAYS`, `ALL_SIX_DAYS`, `CUSTOM`)
  - `start_time`: `VARCHAR(20) NOT NULL` (e.g. "09:30", "15:00")
  - `end_time`: `VARCHAR(20) NOT NULL` (e.g. "11:00", "16:30")
  - `room`: `VARCHAR(100)` (e.g. "IT Lab 1")
  - `branch_location`: `VARCHAR(255)` (e.g. "IT Park Yangiariq")
  - `branch_id`: `BIGINT REFERENCES branches(id) ON DELETE SET NULL`
  - `academic_year`: `VARCHAR(50)` (e.g. "2026-2027")
  - `topic`: `VARCHAR(255)` (optional topic)
  - `duration_minutes`: `INT DEFAULT 80`
  - `created_at`, `updated_at`: `TIMESTAMP`
- **Critical Data Model Gap:**
  - `schedules` lacks explicit `start_date` and `end_date` columns (`DATE`). It relies solely on a vague `academic_year` string.
  - `schedules` lacks a lifecycle `status` column (`ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`).
  - `schedules` does not reference configured shifts (`time_slot_id`).

### 1.2 `time_slots` (`uz.axm.nexus.scheduling.domain.TimeSlot`)
- **Table:** `time_slots` (introduced in Liquibase changeset `017-configurable-time-slots.sql`)
- **Fields:**
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `name`: `VARCHAR(100) NOT NULL` (e.g. "Ertalabki smena (Morning)")
  - `start_time`: `VARCHAR(10) NOT NULL` ("09:30")
  - `end_time`: `VARCHAR(10) NOT NULL` ("11:00")
  - `duration_minutes`: `INT DEFAULT 90`
  - `display_order`: `INT DEFAULT 0`
  - `is_active`: `BOOLEAN NOT NULL DEFAULT TRUE`
  - `description`: `TEXT`
  - `branch_id`: `BIGINT REFERENCES branches(id) ON DELETE SET NULL`
- **Seed Data:**
  - Shift 1: "Ertalabki smena (Morning)" `09:30`–`11:00`
  - Shift 2: "Tushdan keyingi (Afternoon)" `15:00`–`16:30`
  - Shift 3: "Kechki smena (Evening)" `16:30`–`18:00`

### 1.3 `lesson_sessions` (`uz.axm.nexus.scheduling.domain.LessonSession`)
- **Table:** `lesson_sessions`
- **Fields:**
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `schedule_id`: `BIGINT REFERENCES schedules(id) ON DELETE SET NULL`
  - `group_id`: `BIGINT NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE`
  - `mentor_id`: `BIGINT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE`
  - `room`: `VARCHAR(100)`
  - `subject`: `VARCHAR(255) NOT NULL`
  - `topic`: `VARCHAR(255)`
  - `lesson_date`: `DATE NOT NULL`
  - `start_time`: `VARCHAR(20) NOT NULL`
  - `end_time`: `VARCHAR(20) NOT NULL`
  - `status`: `VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED'` (`SCHEDULED`, `COMPLETED`, `CANCELLED`, `RESCHEDULED`)
  - `cancellation_reason`: `TEXT`
  - `notes`: `TEXT`
  - `created_at`, `updated_at`: `TIMESTAMP`
- **Missing Field:**
  - Lacks a flag `is_manually_modified BOOLEAN DEFAULT FALSE` to distinguish auto-generated sessions from those an administrator or mentor manually altered.

### 1.4 `attendance_records` (`uz.axm.nexus.scheduling.domain.AttendanceRecord`)
- **Table:** `attendance_records`
- **Fields:**
  - `id`: `BIGSERIAL PRIMARY KEY`
  - `lesson_session_id`: `BIGINT NOT NULL REFERENCES lesson_sessions(id) ON DELETE CASCADE`
  - `student_id`: `BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE`
  - `status`: `VARCHAR(50) NOT NULL` (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`)
  - `notes`: `TEXT`
  - `recorded_by`: `VARCHAR(100)`
  - `recorded_at`: `TIMESTAMP NOT NULL DEFAULT NOW()`
  - `updated_by`: `VARCHAR(100)`
  - `updated_at`: `TIMESTAMP`
  - Unique Constraint: `uk_session_student (lesson_session_id, student_id)`

---

## 2. How Recurring Schedules Currently Work

Currently, recurring schedules function in an incomplete and semi-virtual state:
1. An administrator creates a recurring schedule via `POST /api/schedules/manual`.
2. `ScheduleService` validates the weekdays and time, detects recurring rule-level conflicts, and writes a single row to `schedules`.
3. **No rows are written to `lesson_sessions` at creation time.**
4. When calendar endpoints are requested (`GET /api/lessons`), `AttendanceScheduleService.projectRecurringSchedules()` calculates match dates on the fly and generates synthetic "virtual" sessions in memory with negative IDs:
   ```java
   long virtualId = -(s.getId() * 1000000L + Math.abs(epochDay));
   ```
5. Only when a user interacts with a virtual session (reschedule, cancel, submit attendance) does `AttendanceScheduleService` convert the virtual session into a real database row in `lesson_sessions`.

---

## 3. Whether Calendar Sessions are Generated or Manually Created

- **Current State:** Calendar sessions are **neither generated ahead of time in the database nor persisted upon schedule creation**. They exist only as in-memory projections until interacted with, or as isolated individual manual sessions created via `POST /api/lessons`.
- **Target State for Module 02:**
  - The Recurring Schedule is the academic rule (template).
  - Concrete calendar `LessonSession` rows **must be automatically generated and persisted in the database** across the selected academic date range (e.g. 2026-11-01 to 2027-05-31).
  - The backend is the single source of truth. The frontend queries real persisted sessions.
  - Future sessions can be bulk-regenerated or adjusted safely without touching completed or historical sessions.

---

## 4. How Odd/Even Weekdays are Represented

- **Enum `DayPattern`:**
  - `ODD_DAYS`: Monday, Wednesday, Friday (Toq kunlar: Dushanba, Chorshanba, Juma)
  - `EVEN_DAYS`: Tuesday, Thursday, Saturday (Juft kunlar: Seshanba, Payshanba, Shanba)
  - `ALL_SIX_DAYS`: Monday through Saturday (Barcha 6 kun)
  - `CUSTOM`: Any admin-selected subset of Monday through Saturday
- **Enum `AcademicWeekday`:**
  - Standardized values: `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`.
  - Canonical rule: **Sunday is strictly prohibited.** `DayPatternResolver.matchSingleWeekday()` throws `BusinessException` if Sunday is requested.
- **`DayPatternResolver` Domain Helper:**
  - Resolves patterns, canonical day lists, validates string inputs, formats Uzbek names, and computes weekday set intersections to prevent false conflicts.

---

## 5. Existing Scheduling Bugs

1. **Virtual Negative Session IDs:**
   - Synthetic negative IDs (`virtualId = -...`) violate REST entity conventions, break frontend URL routing, cause unpredictable behavior with foreign key lookups, and fail numeric ID constraints in external services.
2. **Absence of Official Date Range on Recurring Schedule:**
   - Without `start_date` and `end_date` on `schedules`, the system cannot know when a course officially begins or concludes. In-memory projections projected lessons infinitely into any requested date range.
3. **No Schedule Lifecycle Status:**
   - Because `schedules` lacks `status` (`ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`), archived or completed schedules cannot be disabled without physically deleting them.
4. **Cascade Deletion Danger:**
   - Deleting a recurring schedule directly can orphan or cascade-delete dependent records if not cleanly segregated from historical sessions.
5. **Disconnected Shift Architecture:**
   - `TimeSlot` entities were defined in changeset `017` but were not formally linked to `Schedule` via a foreign key (`time_slot_id`).
6. **Incomplete Conflict Scope:**
   - `ScheduleService.checkConflicts()` only checks recurring rules against other recurring rules; it does not check against one-off rescheduled sessions on concrete calendar dates.
   - `AttendanceScheduleService` only checked persisted sessions on a given date, failing to check virtual recurring sessions for other groups unless they were already projected into memory.

---

## 6. Existing Validation Problems

1. **Invalid Reversed Time Interval Acceptance:**
   - A previously reported value `15:00–14:30` had its end time earlier than start time. The system must explicitly reject `startTime >= endTime` with HTTP 400 and a localized message.
2. **Sunday Rejection:**
   - Rejection of Sunday is enforced in `DayPatternResolver`, but must also be enforced at the API request level and session generation boundary.
3. **Branch Authorization:**
   - Cross-branch schedule creation and room assignment must be strictly validated against the user's branch permissions.
4. **Classroom Availability Validation:**
   - Rooms must belong to the specified branch, and classroom double-booking on overlapping dates/times must return structured conflict details.

---

## 7. Existing Frontend/Backend API Contracts

### Current Endpoints:
- `GET /api/schedules`: Returns list of recurring schedules.
- `GET /api/schedules/{id}`: Returns schedule by ID.
- `POST /api/schedules/manual`: Creates recurring schedule.
- `PUT /api/schedules/{id}`: Updates recurring schedule.
- `DELETE /api/schedules/{id}`: Deletes recurring schedule.
- `GET /api/lessons`: Returns calendar sessions (mix of real and projected virtual sessions).
- `GET /api/lessons/{id}`: Returns single session (or creates on-the-fly if virtual ID).
- `POST /api/lessons`: Creates one-off lesson.
- `POST /api/lessons/{id}/reschedule`: Reschedules a session.
- `POST /api/lessons/{id}/cancel`: Cancels a session.
- `POST /api/lessons/{id}/attendance`: Records student attendance.
- `GET /api/time-slots`: Returns active time slots (shifts).
- `GET /api/admin/time-slots`: Admin time slot management.

### New & Enhanced Endpoints Required:
- `POST /api/schedules/recurring`: Alias / standard endpoint for creating recurring schedules.
- `POST /api/schedules/{id}/generate`: Explicit generation of concrete calendar sessions.
- `POST /api/schedules/{id}/regenerate`: Safe future-session regeneration.
- `POST /api/schedules/{id}/archive`: Safe archival preserving history.
- `POST /api/calendar/sessions/{id}/restore`: Restoring a cancelled session.
- `GET /api/calendar/preview`: Preview generated dates and detect conflicts before persisting.

---

## 8. Data Migration Risks

1. **Existing `schedules` Table:**
   - Contains production records created without `start_date`, `end_date`, `status`, or `time_slot_id`.
   - **Mitigation:** In new Liquibase changeset `021-recurring-schedule-calendar-mgmt.sql`, add columns as nullable or with safe defaults:
     - `start_date DATE DEFAULT '2026-09-01'`
     - `end_date DATE DEFAULT '2027-05-31'`
     - `status VARCHAR(50) DEFAULT 'ACTIVE'`
     - `time_slot_id BIGINT REFERENCES time_slots(id) ON DELETE SET NULL`
2. **Existing `lesson_sessions` Table:**
   - Already has historical rows from attendance testing and manual lessons.
   - **Mitigation:** Add `is_manually_modified BOOLEAN DEFAULT FALSE`.
   - Add uniqueness index preventing duplicate sessions for the same schedule on the same date: `uk_schedule_date (schedule_id, lesson_date) WHERE status != 'CANCELLED'`.
3. **No Destructive Operations:**
   - Never drop tables or modify existing changesets 001–020.
   - All migrations are strictly additive and backwards-compatible.

---

## 9. Reusable Components

- **Backend:**
  - `DayPatternResolver`: Core pattern logic, weekday mapping, formatters.
  - `DayPattern` & `AcademicWeekday`: Domain enums.
  - `TimeSlot` & `TimeSlotService`: Predefined shifts and custom intervals.
  - `LessonSession` & `AttendanceRecord`: Concrete session and attendance tracking.
  - `CurrentUserHelper` & `AuditService`: Security context and audit logging.
  - `ScheduleConflictException` & `ConflictDetailDto`: Structured conflict responses.
- **Frontend:**
  - `ManualScheduleModal.tsx`: Expand into full recurring schedule creator with shifts, date ranges, and live calendar preview.
  - `AttendanceCalendar.tsx`: Daily, weekly, monthly calendar views with status badges, filters, and actions.
  - `TimeSlotManagement.tsx`: Shift management under Admin Control Center.
  - Shadcn/ui & `@/shared/ui` components: `Dialog`, `Button`, `Input`, `Select`, `Badge`, `Tabs`, `DataTable`.
  - `useTranslation()`: Uzbek, Russian, English localization.

---

## 10. Recommended Implementation Approach

We will proceed through the phases outlined in the project specification:

1. **Phase 1: Domain Model Separation:**
   - Separate Recurring Schedule Definition (`Schedule`) from Calendar Lesson Sessions (`LessonSession`).
   - Add `startDate`, `endDate`, `status`, and `timeSlot` to `Schedule`.
   - Add `isManuallyModified` to `LessonSession`.
2. **Phase 2: Shift & Time Management:**
   - Support daily shifts (Shift 1: 09:30-11:00, Shift 2: 15:00-16:30, custom).
   - Enforce 24-hour `HH:mm` format and `start < end` validation.
3. **Phase 3: Automatic Calendar Generation:**
   - Implement date calculation engine in `RecurringScheduleGenerator` service.
   - Idempotently generate concrete `LessonSession` rows on creation.
   - Exclude Sundays, dates outside range, and non-matching weekdays.
4. **Phase 4: Editing, Deletion & Regeneration:**
   - Implement update scopes: "Update future sessions only" (default).
   - Safe archive of schedules without deleting historical attendance.
   - Individual session management (reschedule, cancel, restore).
5. **Phase 5: Scheduling Conflict Detection:**
   - Unified conflict detection across concrete dates: Mentor, Classroom, Group, Branch, and Time Overlap.
   - Structured conflict DTOs.
6. **Phase 6: Backend APIs:**
   - Clean, standardized REST endpoints with full validation and pagination support.
7. **Phase 7: Frontend Experience:**
   - Redesign schedule modal with live calendar preview, shift selector, and date ranges.
   - Enhance calendar views (day/week/month) with filters.
   - Recurring schedule management page/table.
   - Tri-lingual localization (uz/ru/en).
8. **Phase 8: Role-Based Access Control:**
   - Enforce branch and role restrictions across all endpoints.
9. **Phase 9: Attendance Integration:**
   - Ensure attendance records strictly link to concrete `LessonSession` IDs.
10. **Phase 10: Database Migration Safety:**
    - Sequential Liquibase changeset `021-recurring-schedule-calendar-mgmt.sql`.
11. **Phase 11: Automated Testing:**
    - Full suite of backend and frontend tests covering all 20 required backend scenarios and 12 frontend scenarios.
12. **Phase 12: Documentation:**
    - Architecture, API, User Guide, and Completion Report.
