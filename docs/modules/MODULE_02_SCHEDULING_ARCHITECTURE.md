# AXV Nexus — Module 02: Architecture & Technical Design

## 1. Executive Summary & Architectural Overview

Module 02 implements a production-grade, enterprise-ready **Recurring Academic Schedule, Academic Calendar, and Lesson Session Management System** for the **AXV Nexus (Muhammad Al-Xorazmiy Vorislari Hub)** platform.

The core design principle is the strict separation between:
1. **Recurring Schedule Rule (`Schedule`)**: An immutable or safely editable academic timetable rule defining recurrence patterns, shift, classroom, mentor, branch, and date range.
2. **Calendar Lesson Sessions (`LessonSession`)**: Concrete, date-bound lesson occurrences generated automatically by the backend calendar engine across actual calendar dates.

---

## 2. Domain Model & Separation of Concerns

```
+-------------------------------------------------------------+
|                 Recurring Schedule (Template)               |
|  - id: Long                                                 |
|  - studyGroup: StudyGroup                                   |
|  - mentor: Mentor                                           |
|  - branch: Branch                                           |
|  - room: String                                             |
|  - dayPattern: ODD_DAYS | EVEN_DAYS | ALL_SIX_DAYS | CUSTOM |
|  - days: String ("Dushanba, Chorshanba, Juma")              |
|  - timeSlot: TimeSlot (Shift)                               |
|  - startTime: "09:30"                                       |
|  - endTime: "11:00"                                         |
|  - startDate: 2026-11-01                                    |
|  - endDate: 2027-05-31                                      |
|  - status: ACTIVE | PAUSED | COMPLETED | ARCHIVED           |
+-------------------------------------------------------------+
                              |
                   1 : N Generation Engine
                              |
                              v
+-------------------------------------------------------------+
|                 LessonSession (Calendar Occurrence)         |
|  - id: Long                                                 |
|  - schedule: Schedule (Nullable on archival/deletion)       |
|  - lessonDate: LocalDate (e.g. 2026-11-02)                  |
|  - startTime: "09:30"                                       |
|  - endTime: "11:00"                                         |
|  - status: SCHEDULED | COMPLETED | CANCELLED | RESCHEDULED  |
|  - isManuallyModified: Boolean (true if altered by mentor)  |
|  - cancellationReason: String                               |
|  - timeSlot: TimeSlot                                       |
+-------------------------------------------------------------+
                              |
                   1 : N Attendance Records
                              |
                              v
+-------------------------------------------------------------+
|                 AttendanceRecord (Historical Record)        |
|  - id: Long                                                 |
|  - lessonSession: LessonSession                             |
|  - student: Student                                         |
|  - status: PRESENT | ABSENT | LATE | EXCUSED                |
+-------------------------------------------------------------+
```

### 2.1 The Invariant Separation Principle
* **The Rule is Not the Occurrence**: An administrator never manually creates 60 individual lessons for a semester. The administrator defines a `Schedule` once, and the backend engine generates corresponding `LessonSession` rows.
* **Independent Lifecycle**:
  * Modifying an upcoming recurring schedule does **not** corrupt historical completed lesson sessions or existing student attendance records.
  * Deleting or archiving a recurring schedule safely disassociates (`schedule_id = NULL`) historical completed lessons and attendance records, pruning only upcoming scheduled lessons.

---

## 3. Recurrence Patterns & Day Resolution

The system enforces a **6-Day Academic Week (Monday through Saturday)**. Sunday is strictly excluded from standard recurrence.

Supported Recurrence Modes:
* **`ODD_DAYS`**: Dushanba (Monday), Chorshanba (Wednesday), Juma (Friday).
* **`EVEN_DAYS`**: Seshanba (Tuesday), Payshanba (Thursday), Shanba (Saturday).
* **`ALL_SIX_DAYS`**: Monday through Saturday.
* **`CUSTOM`**: Administrator or branch coordinator selects any custom combination of Monday through Saturday.

Recurrence resolution is powered by [DayPatternResolver.java](file:///home/izzatbek/Desktop/axvhub/backend/src/main/java/uz/axm/nexus/scheduling/domain/DayPatternResolver.java) which translates enum identifiers and localized weekday strings into Java `DayOfWeek` sets.

---

## 4. Shift & Time Slot Management

### 4.1 Configurable Shifts
Lesson intervals are represented by the `TimeSlot` entity, supporting multi-branch shift configurations:
* Shift 1 (Morning): 09:30–11:00
* Shift 2 (Afternoon): 15:00–16:30
* Shift 3 (Evening): 16:30–18:00
* Custom Shift: Configurable by authorized administrators with strict start < end validation.

### 4.2 Time Integrity & Validation Rules
1. **24-Hour Format**: All time values use `LocalTime` formatted as `HH:mm`.
2. **Positive Duration**: `startTime < endTime` is strictly validated. Inverted intervals (such as `15:00 >= 14:30`) are immediately rejected with HTTP 400 Bad Request.
3. **Immutability of Historical Shifts**: Changing a shift definition does not rewrite past lesson sessions.

---

## 5. Automatic Calendar Generation Engine

Backend class: [RecurringScheduleGenerator.java](file:///home/izzatbek/Desktop/axvhub/backend/src/main/java/uz/axm/nexus/scheduling/application/RecurringScheduleGenerator.java)

### 5.1 Generation Workflow
When an administrator creates or regenerates a schedule:
1. **Date Boundary Calculation**: Generates all eligible dates between `startDate` and `endDate`.
2. **Holiday & Sunday Exclusion**:
   - Sundays (`DayOfWeek.SUNDAY`) are automatically skipped.
   - Academic holidays recorded in `academic_holidays` (or branch-specific holidays) are skipped.
3. **Concrete Date Conflict Detection**: Checks mentor availability, classroom occupancy, and group availability on each concrete date and time interval.
4. **Idempotent Batch Insertion**:
   - Uses `existsByScheduleIdAndLessonDateAndStatusNot` to prevent duplicate insertions if generated repeatedly.
   - Database partial unique index `uk_schedule_lesson_date_active` provides hard DB-level concurrency safety.

---

## 6. Safe Schedule Editing & Deletion Lifecycle

### 6.1 Update Scope
When editing a recurring schedule rule:
* **`FUTURE_ONLY` (Default & Recommended)**: Only updates uncompleted sessions from `LocalDate.now()` forward. Past sessions, completed sessions, and sessions with recorded attendance remain completely untouched.
* **`ALL_UNCOMPLETED`**: Updates all uncompleted scheduled sessions across the schedule.
* **`ONLY_THIS`**: Updates only an individual calendar session without altering the recurring template.

### 6.2 Preserving Manually Modified Sessions
If a mentor or administrator individually rescheduled or cancelled a session (`isManuallyModified = true`), the automatic regeneration engine skips it, preserving custom alterations.

### 6.3 Safe Deletion & Archival
* **Archival (`POST /api/schedules/{id}/archive`)**: Sets `status = 'ARCHIVED'`, leaving all past and future calendar sessions intact.
* **Deletion (`DELETE /api/schedules/{id}`)**:
  * Uncompleted scheduled lessons are pruned.
  * Completed lessons and sessions with recorded attendance are retained with `schedule = null` (foreign key `ON DELETE SET NULL`).
  * Attendance records, grading entries, and student participation history are 100% preserved.

---

## 7. Multi-Branch Authorization Matrix

| Action | SUPER_ADMIN | BRANCH_ADMIN | MENTOR | STUDENT |
| :--- | :--- | :--- | :--- | :--- |
| View Calendar & Sessions | Global | Branch-scoped | Branch/Assigned | Enrolled Groups |
| Create Recurring Schedule | Global | Branch-scoped | Branch-scoped | Read-only |
| Edit Recurring Schedule | Global | Branch-scoped | Own Schedule | Read-only |
| Regenerate Future Sessions| Global | Branch-scoped | Own Schedule | Read-only |
| Archive / Delete Schedule | Global | Branch-scoped | Denied | Read-only |
| Reschedule / Cancel Session | Global | Branch-scoped | Assigned Sessions | Read-only |
| Submit / Edit Attendance | Global | Branch-scoped | Assigned Sessions | Read-only |
