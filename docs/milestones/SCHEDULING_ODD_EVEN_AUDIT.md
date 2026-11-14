# AXV NEXUS — SCHEDULING ENHANCEMENT AUDIT (PHASE 0)
## Six-Day Academic Week: Odd-Day and Even-Day Scheduling

**Audit Date:** November 14, 2026  
**System:** Al-Xorazmiy Vorislari Hub (AXV Nexus) Educational Management Platform  
**Target Module:** Scheduling (`backend/src/main/java/uz/axm/nexus/scheduling/`, `frontend/src/components/ManualScheduleModal.tsx`, `frontend/src/components/dashboard/AdminDashboardView.tsx`)

---

## 1. Executive Summary

This read-only audit examines the existing scheduling architecture of AXV Nexus to introduce a first-class six-day academic week scheduling enhancement. The feature enables administrators and authorized mentors to define recurring lesson schedules using four standardized modes:
1. **Toq kunlar (Odd Days):** Monday, Wednesday, Friday
2. **Juft kunlar (Even Days):** Tuesday, Thursday, Saturday
3. **Barcha 6 kun (All Six Days):** Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
4. **Maxsus kunlar (Custom Days):** Any custom combination of Monday through Saturday (Sunday excluded by default)

**Key Finding:** Odd/even refers to the traditional six-day academic weekday pattern, NOT calendar date parity. The existing architecture uses a domain model where `Schedule` holds recurring weekly schedule patterns (with a `days` string), while date-specific execution is handled by `LessonSession`. The enhancement preserves the existing domain model, avoids duplicate entities, adds robust conflict detection, and enhances the manual scheduling interface with seamless backward compatibility.

---

## 2. Detailed Audit Questions & Findings

### 1. How are weekly lesson days currently represented?
- **Database / Entity:** In `schedules` (`Schedule.java`), the `days` column is stored as a `VARCHAR(255)` string (e.g. `"Seshanba-Payshanba-Shanba"`, `"Dushanba, Chorshanba, Juma"`).
- **StudyGroup entity:** `study_groups.schedule_days` stores the corresponding weekday description as `VARCHAR(255)`.
- **Frontend Form:** `ManualScheduleModal.tsx` previously utilized a basic HTML `<select>` with 5 static options:
  - `"Seshanba-Payshanba-Shanba"`
  - `"Dushanba-Chorshanba-Juma"`
  - `"Dushanba-Chorshanba"`
  - `"Seshanba-Payshanba"`
  - `"Shanba-Yakshanba"`
- **Canonical Representation needed:** Standardized weekday enumeration (`MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`) and localized display names (`Dushanba`, `Seshanba`, `Chorshanba`, `Payshanba`, `Juma`, `Shanba`).

### 2. Does one Schedule record represent one weekday occurrence or multiple weekdays?
- One `Schedule` record represents the recurring timetable pattern for a study group, mentor, time slot, and room across all its weekly lesson days.
- **Approach Selection:** **Approach A (Model & DTO Extension)** is the ideal and native fit for AXV Nexus:
  - `Schedule` stores multiple weekdays within its recurring slot.
  - Creating separate `Schedule` rows per weekday would break current table displays (e.g., showing 3 separate rows for 1 class in `AdminDashboardView.tsx` where rows currently represent groups/classes).
  - Preserving one `Schedule` entity per recurring timetable entry keeps the existing API contracts, calendar widgets, and administrative dashboards completely stable.
  - In addition, an optional `dayPattern` enum / string (`ODD_DAYS`, `EVEN_DAYS`, `ALL_SIX_DAYS`, `CUSTOM`) can be attached to both the DTO and entity to explicitly store the scheduling mode.

### 3. Is there already support for multiple weekdays?
- Yes, `Schedule.days` already contains comma- or hyphen-separated weekday strings.
- However, there was no structured parser or validator ensuring that days adhere to the 6-day academic cycle, nor logic to validate that Sunday is excluded from the standard academic week.

### 4. How are recurring lessons generated or displayed?
- **Recurring Master Schedule:** Stored in `schedules` table, displayed in `AdminDashboardView` table, mentor dashboard overview, and group directory.
- **Individual Session Execution:** Stored in `lesson_sessions` table (`LessonSession.java`) linked to `Schedule` via `@ManyToOne(name = "schedule_id")` with `ON DELETE SET NULL`. Date-based attendance and lesson completions occur on `LessonSession`.
- Recurring schedules define the template; individual sessions are generated or scheduled for specific calendar dates. No infinite future lesson rows are pre-generated, preventing database bloat.

### 5. How are mentor, group, room, and branch relationships maintained?
- `Schedule` contains direct relationships:
  - `mentor_id` -> `Mentor` (`@ManyToOne`)
  - `group_id` -> `StudyGroup` (`@ManyToOne`)
  - `branch_id` -> `Branch` (`@ManyToOne`)
  - `room` -> String (classroom/lab name)
  - `branchLocation` -> String (branch location name)
- In `ScheduleService.createManualSchedule`, mentors and groups are resolved or created via `mentorService.getOrCreate` and `studyGroupService.getOrCreate`.
- Branch associations are checked against the mentor, group, and room locations.

### 6. How are overlapping schedules detected?
- **Current State:** Overlap conflict detection was implemented in `AttendanceScheduleService` for dated `LessonSession`s, but was **absent** in `ScheduleService` for recurring weekly `Schedule` records!
- **Required Enhancement:** We must implement weekly schedule conflict detection:
  - **Mentor Conflict:** A mentor must not be double-booked at overlapping times on any overlapping weekday.
  - **Classroom / Room Conflict:** A room must not be double-booked at overlapping times on any overlapping weekday.
  - **Group Conflict:** A study group must not be double-booked at overlapping times on any overlapping weekday.
  - **Time Range Validation:** Start time must be strictly before end time, with valid `HH:mm` format.
  - **Branch Isolation:** Cross-branch assignments must match the user's branch scope or require SUPER_ADMIN / ADMIN privilege.

### 7. Are there existing APIs that can be reused?
- `GET /api/schedules`: Returns all schedules (with optional `gradeLevel` and `mentorId` query parameters).
- `POST /api/schedules/manual`: Accepts `ManualScheduleRequest` and creates a schedule.
- `DELETE /api/schedules/{id}`: Deletes a schedule.
- We will enrich `ManualScheduleRequest` to accept `dayPattern` and `selectedDays`, while keeping `days` backwards-compatible.
- We will also add `PUT /api/schedules/{id}` to support editing recurring schedules.

### 8. How are schedule updates and deletions handled?
- Deletions are handled by `ScheduleRepository.deleteById(id)`.
- Foreign key in `lesson_sessions` uses `ON DELETE SET NULL`, meaning historical lesson sessions and attendance records are never deleted when a recurring schedule is removed or updated.
- We will add an update endpoint (`PUT /api/schedules/{id}`) that updates the schedule in place transactionally, ensuring all conflicts are verified and historical attendance remains untouched.

---

## 3. Canonical Weekday Mapping

| Academic Weekday | Parity Category | Canonical Key | Uzbek Name | Russian Name | English Name |
|:---|:---:|:---:|:---|:---|:---|
| Monday | Odd (Toq) | `MONDAY` | Dushanba | Понедельник | Monday |
| Tuesday | Even (Juft) | `TUESDAY` | Seshanba | Вторник | Tuesday |
| Wednesday | Odd (Toq) | `WEDNESDAY` | Chorshanba | Среда | Wednesday |
| Thursday | Even (Juft) | `THURSDAY` | Payshanba | Четверг | Thursday |
| Friday | Odd (Toq) | `FRIDAY` | Juma | Пятница | Friday |
| Saturday | Even (Juft) | `SATURDAY` | Shanba | Суббота | Saturday |
| Sunday | Unsupported (Non-academic) | `SUNDAY` | Yakshanba | Воскресенье | Sunday |

---

## 4. Architectural Boundaries and Restrictions Adherence

1. **No duplicate entities:** We extend `Schedule` and its DTOs rather than creating a second entity.
2. **No duplicate services:** `ScheduleService` remains the single authority for recurring schedules.
3. **No calendar date parity confusion:** Logic strictly operates on weekday parity (Mon/Wed/Fri vs Tue/Thu/Sat).
4. **Preserve data integrity:** Liquibase migration `016-scheduling-day-patterns.sql` safely adds `day_pattern` column with default fallback. Existing schedules continue to work without data loss.
5. **Security & RBAC:** `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')` is enforced on write/delete/update operations with branch validation.

---

## 5. Audit Conclusion

The existing AXV Nexus codebase provides a clean Spring Boot + React architecture. The domain model naturally supports Approach A. The enhancement will integrate canonical weekday utilities, multi-level conflict detection, an intuitive 4-mode segmented UI in `ManualScheduleModal`, full i18n support across Uzbek, Russian, and English, and rigorous test coverage.
