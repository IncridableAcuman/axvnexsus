# AXV NEXUS — SCHEDULING ENHANCEMENT COMPLETION REPORT
## Six-Day Academic Week: Odd-Day and Even-Day Scheduling

**Project:** Al-Xorazmiy Vorislari Hub (AXV Nexus) Educational Management Platform  
**Enhancement:** Six-Day Academic Week Scheduling (Toq kunlar va Juft kunlar dars taqsimoti)  
**Date:** November 14, 2026  
**Status:** Successfully Implemented, Tested, and Verified  

---

## 1. Initial Scheduling Architecture

Prior to this enhancement, the AXV Nexus scheduling system operated with the following characteristics:
- **Backend Model:** The `Schedule` entity stored recurring lesson schedules with a single `days` string column (`VARCHAR(255)`). It maintained associations with `StudyGroup`, `Mentor`, and `Branch`. Individual lesson sessions and attendance tracking were delegated to `LessonSession` and `AttendanceRecord`.
- **Frontend Input:** `ManualScheduleModal.tsx` presented a basic HTML `<select>` dropdown with 5 hardcoded option strings (`"Seshanba-Payshanba-Shanba"`, `"Dushanba-Chorshanba-Juma"`, `"Dushanba-Chorshanba"`, `"Seshanba-Payshanba"`, `"Shanba-Yakshanba"`).
- **Gaps Identified during Phase 0 Audit:**
  1. No structured validation or parsing of recurring weekly lesson patterns.
  2. Sunday was not explicitly rejected under the traditional 6-day academic calendar.
  3. While `AttendanceScheduleService` enforced conflict detection for dated individual sessions (`LessonSession`), **no conflict detection existed** in `ScheduleService` for recurring weekly schedules (`Schedule`), leading to potential mentor, room, and group double-booking.
  4. No update endpoint (`PUT /api/schedules/{id}`) existed on `ScheduleController`.

---

## 2. Selected Implementation Approach: Approach A

**Approach A (Domain Model & DTO Extension)** was chosen over Approach B (splitting rows per weekday):
- **Preserved Existing Data & Views:** `AdminDashboardView.tsx`, mentor dashboards, and group management view display one row per recurring schedule. Splitting rows would duplicate cards and rows on existing dashboards.
- **Backwards Compatibility:** Existing records storing text strings like `"Dushanba, Chorshanba, Juma"` or `"Seshanba-Payshanba-Shanba"` continue to work without modification.
- **Explicit Day Pattern:** An optional `day_pattern` column was added to `schedules` and `study_groups` via Liquibase migration `016-scheduling-day-patterns.sql`, defaulting to `CUSTOM` and backfilling `ODD_DAYS` and `EVEN_DAYS` from existing data.
- **Zero Duplicate Entities:** No redundant entities or services were introduced. `ScheduleService` and `Schedule` remain the sole domain authorities.

---

## 3. Domain Model Changes

### 1. `DayPattern` Enum (`uz.axm.nexus.scheduling.domain.DayPattern`)
Defines the 4 supported scheduling modes:
- `ODD_DAYS`: Monday, Wednesday, Friday (Toq kunlar)
- `EVEN_DAYS`: Tuesday, Thursday, Saturday (Juft kunlar)
- `ALL_SIX_DAYS`: Monday through Saturday (Barcha 6 kun)
- `CUSTOM`: User-selected combinations of Monday through Saturday

### 2. `AcademicWeekday` Enum (`uz.axm.nexus.scheduling.domain.AcademicWeekday`)
Canonical 6-day academic weekdays:
- `MONDAY` (Dushanba, Odd)
- `TUESDAY` (Seshanba, Even)
- `WEDNESDAY` (Chorshanba, Odd)
- `THURSDAY` (Payshanba, Even)
- `FRIDAY` (Juma, Odd)
- `SATURDAY` (Shanba, Even)

*Sunday Policy:* Sunday is strictly rejected in the standard 6-day academic week. Selecting Sunday triggers a `BusinessException("Yakshanba 6 kunlik akademik haftaga kirmaydi! Faqat Dushanba - Shanba kunlari ruxsat etilgan.")`.

### 3. `DayPatternResolver` (`uz.axm.nexus.scheduling.domain.DayPatternResolver`)
Centralized domain service providing:
- `resolve(pattern, customDays)`: Returns canonical `List<AcademicWeekday>`.
- `parseWeekdays(daysString)`: Parses multilingual weekday strings and delimiters (`,`, `-`, `•`, `/`, `;`).
- `formatCanonicalDays(weekdays)`: Standardizes output into comma-separated Uzbek names (e.g. `Dushanba, Chorshanba, Juma`).
- `inferPattern(weekdays)`: Infers whether a weekday set corresponds to `ODD_DAYS`, `EVEN_DAYS`, `ALL_SIX_DAYS`, or `CUSTOM`.
- `hasWeekdayOverlap(set1, set2)`: Returns `false` for disjoint patterns (e.g. `ODD_DAYS` vs `EVEN_DAYS`), preventing false conflicts and maximizing room/mentor utilization.
- `isTimeOverlap(s1, e1, s2, e2)`: Time overlap detector.
- `validateTimeRange(start, end)`: Enforces `HH:mm` format and `start < end`.

### 4. Entity Extensions
- `Schedule.java`: Added `@Column(name = "day_pattern") private String dayPattern;`
- `StudyGroup.java`: Added `@Column(name = "day_pattern") private String dayPattern;`
- `ManualScheduleRequest.java`: Added `dayPattern`, `selectedDays`, `branchId`.

### 5. Liquibase Migration
- `backend/src/main/resources/db/changelog/changes/016-scheduling-day-patterns.sql`:
  - Adds `day_pattern VARCHAR(50) DEFAULT 'CUSTOM'` to `schedules` and `study_groups`.
  - Backfills existing records with `ODD_DAYS` or `EVEN_DAYS`.
  - Adds performance indexes (`idx_schedules_day_pattern`, `idx_schedules_mentor_time`, `idx_schedules_room_time`).
  - Included in `db.changelog-master.yaml`.

---

## 4. API Changes

| HTTP Method | Endpoint | Authorization | Description |
|:---:|:---|:---|:---|
| `GET` | `/api/schedules` | `hasAuthority('lessons.read') or isAuthenticated()` | Returns all schedules with `dayPattern` and formatted `days`. Filterable by `gradeLevel` and `mentorId`. |
| `GET` | `/api/schedules/{id}` | `hasAuthority('lessons.read') or isAuthenticated()` | Returns a single schedule by ID. |
| `POST` | `/api/schedules/manual` | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')` | Transactionally creates a schedule with full conflict checks. |
| `PUT` | `/api/schedules/{id}` | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')` | Transactionally updates a recurring schedule with conflict checks (excluding self). |
| `DELETE` | `/api/schedules/{id}` | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')` | Deletes a recurring schedule. Historical attendance records and completed lessons are strictly preserved. |

---

## 5. Frontend Changes

### 1. Enhanced `ManualScheduleModal.tsx`
- **Dars kunlari turi Section:** Added a segmented card selector offering 4 options:
  - 🔵 **Toq kunlar** (Dushanba, Chorshanba, Juma)
  - 🟣 **Juft kunlar** (Seshanba, Payshanba, Shanba)
  - 🟢 **Barcha 6 kun** (Dushanba – Shanba)
  - 🟠 **Maxsus kunlar** (Ixtiyoriy tanlov)
- **Interactive Weekday Pills:** 6 individual weekday buttons (Monday through Saturday) allowing one-click toggle in custom mode.
- **Dynamic Visual Preview Badge:** Real-time feedback badge (e.g. `Toq kunlar: Dushanba • Chorshanba • Juma`).
- **Conflict Error Banner:** Alerts the user with explicit conflict details if the mentor, room, or group is double-booked.
- **Data-Testids:** Added for automated testing (`mode-btn-odd`, `mode-btn-even`, `mode-btn-all-six`, `mode-btn-custom`, `weekday-btn-*`).
- **Preserved Existing Fields:** Grade level, group code, subject, mentor name, mentor role, start/end times, room/lab, and bulk student names list.

### 2. Enhanced `AdminDashboardView.tsx`
- Added color-coded badges for schedule patterns (`Toq kunlar`, `Juft kunlar`, `Barcha 6 kun`) in the administrative schedule table and dashboard cards.

### 3. API & Types (`types.ts`, `api.ts`)
- Added `SchedulingMode` type (`'ODD_DAYS' | 'EVEN_DAYS' | 'ALL_SIX_DAYS' | 'CUSTOM'`).
- Added `dayPattern`, `selectedDays`, `branchId` to `ManualScheduleRequest` and `Schedule`.
- Added `scheduleApi.getById` and `scheduleApi.update`.

---

## 6. Odd/Even Weekday Mapping Matrix

| Weekday | Academic Parity | Canonical Key | Uzbek Name | Russian Name | English Name |
|:---|:---:|:---:|:---|:---|:---|
| Monday | **Odd (Toq)** | `MONDAY` | Dushanba | Понедельник | Monday |
| Tuesday | **Even (Juft)** | `TUESDAY` | Seshanba | Вторник | Tuesday |
| Wednesday | **Odd (Toq)** | `WEDNESDAY` | Chorshanba | Среда | Wednesday |
| Thursday | **Even (Juft)** | `THURSDAY` | Payshanba | Четверг | Thursday |
| Friday | **Odd (Toq)** | `FRIDAY` | Juma | Пятница | Friday |
| Saturday | **Even (Juft)** | `SATURDAY` | Shanba | Суббота | Saturday |
| Sunday | **Excluded** | `SUNDAY` | Yakshanba | Воскресенье | Sunday |

> **IMPORTANT:** Odd/even refers strictly to traditional six-day weekday parity, NOT calendar date numbers.

---

## 7. Conflict Detection Behavior

Before persisting or updating any recurring schedule in `ScheduleService`, the engine evaluates:
1. **Disjoint Days Optimization:** If Schedule A is `ODD_DAYS` and Schedule B is `EVEN_DAYS`, they never conflict, even in the identical room and time slot.
2. **Mentor Conflict:** Detects if the mentor is assigned to another lesson on any overlapping weekday during the same time interval.
3. **Classroom Conflict:** Detects if the classroom or IT lab is booked on any overlapping weekday during the same time interval.
4. **Group Conflict:** Detects if the group already has another lesson scheduled on any overlapping weekday during the same time interval.
5. **Time Range Validation:** Rejects any entry where `startTime >= endTime` or invalid time format.
6. **Branch Isolation:** Cross-branch scheduling is restricted to ADMIN and SUPER_ADMIN users. Branch-restricted mentors cannot create schedules outside their assigned branch.

---

## 8. Transactional Behavior & Historical Preservation

- **Atomic Transactions:** Both `createManualSchedule` and `updateSchedule` execute inside `@Transactional`. If conflict checks, student enrollment, or branch checks fail, the entire operation is rolled back.
- **Audit Logging:** Every create, update, and delete action is persisted via `AuditService.logAction`.
- **Historical Attendance Protection:** Foreign key relationships from `lesson_sessions` to `schedules` use `ON DELETE SET NULL`. Updating or deleting a recurring schedule does not modify or delete historical `LessonSession` records or student `AttendanceRecord`s.

---

## 9. Localization Coverage

All labels and error messages were localized across all three supported languages:

| Translation Key | Uzbek (`uz.ts`) | Russian (`ru.ts`) | English (`en.ts`) |
|:---|:---|:---|:---|
| `scheduling.dayPattern` | Dars kunlari turi | Тип учебных дней | Lesson Days Pattern |
| `scheduling.oddDays` | Toq kunlar | Нечетные дни | Odd Days |
| `scheduling.evenDays` | Juft kunlar | Четные дни | Even Days |
| `scheduling.allSixDays` | Barcha 6 kun | Все 6 дней | All 6 Days |
| `scheduling.customDays` | Maxsus kunlar | Специальные дни | Custom Days |
| `scheduling.selectedDays` | Tanlangan dars kunlari | Выбранные дни занятий | Selected lesson days |
| `scheduling.monday` | Dushanba | Понедельник | Monday |
| `scheduling.tuesday` | Seshanba | Вторник | Tuesday |
| `scheduling.wednesday` | Chorshanba | Среда | Wednesday |
| `scheduling.thursday` | Payshanba | Четверг | Thursday |
| `scheduling.friday` | Juma | Пятница | Friday |
| `scheduling.saturday` | Shanba | Суббота | Saturday |
| `scheduling.sunday` | Yakshanba | Воскресенье | Sunday |
| `scheduling.scheduleConflict` | Dars jadvalida to‘qnashuv aniqlandi | Обнаружен конфликт в расписании | Schedule conflict detected |
| `scheduling.invalidTimeRange` | Dars tugash vaqti boshlanish vaqtidan kechroq bo‘lishi kerak | Время окончания должно быть позже времени начала | End time must be later than start time |
| `scheduling.noDaysSelected` | Kamida bitta dars kuni tanlanishi shart | Необходимо выбрать хотя бы один день | At least one lesson day must be selected |
| `scheduling.sundayDisallowed` | Yakshanba 6 kunlik akademik haftaga kirmaydi | Воскресенье не входит в 6-дневную академическую неделю | Sunday is not part of the standard 6-day academic week |

---

## 10. Exact Test Results

### Backend Test Execution
```bash
cd backend && ./gradlew test
```
- **Total Backend Tests:** 185
- **Passed:** 185 (100%)
- **Failed:** 0
- **Execution Time:** 56 seconds
- **Key Test Suites:**
  - `DayPatternResolverTest`: 8 unit test cases covering all parity patterns, Sunday rejection, overlap detection, and time range validations.
  - `ScheduleManagementIntegrationTest`: 14 comprehensive integration test cases covering API endpoints, conflict detection (mentor, room, group), transaction rollbacks, branch isolation, and historical attendance preservation.
  - All existing test suites (analytics, grading, security, access, identity, classrooms, mentors, reports, ai, etc.) passed with 0 regressions.

### Frontend Test Execution
```bash
cd frontend && npm test -- --run
```
- **Total Test Suites:** 28 passed (28)
- **Total Frontend Tests:** 155 passed (155)
- **Failed:** 0
- **Execution Time:** 25.26 seconds
- **Key Test Suite:**
  - `ManualScheduleModal.test.tsx`: 10 passed test cases verifying Odd Days, Even Days, All 6 Days, Custom Days, mode switching, preview badge, validation errors, payload submission, field preservation, and 3-locale rendering.

---

## 11. Production Build Results

```bash
cd frontend && npm run build
```
- **Exit Code:** 0 (Success)
- **TypeScript Compilation:** Passed with 0 errors (`tsc -b`).
- **Vite Production Bundling:**
  - `dist/index.html`: 0.91 kB
  - `dist/assets/index-ZX4N7fER.css`: 235.79 kB (gzip: 28.00 kB)
  - `dist/assets/index-29ZS8W45.js`: 1,802.57 kB (gzip: 439.89 kB)
- **Build Time:** 1.53s

---

## 12. Changed & Created Files Summary

### Created Files:
1. `backend/src/main/java/uz/axm/nexus/scheduling/domain/DayPattern.java`
2. `backend/src/main/java/uz/axm/nexus/scheduling/domain/AcademicWeekday.java`
3. `backend/src/main/java/uz/axm/nexus/scheduling/domain/DayPatternResolver.java`
4. `backend/src/main/resources/db/changelog/changes/016-scheduling-day-patterns.sql`
5. `backend/src/test/java/uz/axm/nexus/scheduling/domain/DayPatternResolverTest.java`
6. `backend/src/test/java/uz/axm/nexus/scheduling/presentation/ScheduleManagementIntegrationTest.java`
7. `frontend/src/components/__tests__/ManualScheduleModal.test.tsx`
8. `docs/milestones/SCHEDULING_ODD_EVEN_AUDIT.md`
9. `docs/milestones/SCHEDULING_ODD_EVEN_IMPLEMENTATION.md`
10. `SCHEDULING_ODD_EVEN_COMPLETION_REPORT.md`

### Modified Files:
1. `backend/src/main/java/uz/axm/nexus/scheduling/domain/Schedule.java`
2. `backend/src/main/java/uz/axm/nexus/scheduling/application/ManualScheduleRequest.java`
3. `backend/src/main/java/uz/axm/nexus/scheduling/application/ScheduleService.java`
4. `backend/src/main/java/uz/axm/nexus/scheduling/presentation/ScheduleController.java`
5. `backend/src/main/java/uz/axm/nexus/classrooms/domain/StudyGroup.java`
6. `backend/src/main/java/uz/axm/nexus/classrooms/application/StudyGroupService.java`
7. `backend/src/main/java/uz/axm/nexus/branches/infrastructure/BranchRepository.java`
8. `backend/src/main/java/uz/axm/nexus/identity/infrastructure/SuperAdminBootstrapService.java`
9. `backend/src/main/resources/db/changelog/db.changelog-master.yaml`
10. `frontend/src/types.ts`
11. `frontend/src/api.ts`
12. `frontend/src/components/ManualScheduleModal.tsx`
13. `frontend/src/components/dashboard/AdminDashboardView.tsx`
14. `frontend/src/shared/i18n/I18nContext.tsx`
15. `frontend/src/shared/i18n/locales/uz.ts`
16. `frontend/src/shared/i18n/locales/ru.ts`
17. `frontend/src/shared/i18n/locales/en.ts`

---

## 13. Known Limitations

1. **Non-Standard Sunday Schedules:** Sunday is explicitly disallowed in standard academic operations. If a specialized Sunday workshop program is required in the future, it would need a documented requirement and explicit flag on the request.
2. **Calendar Parity Decoupling:** Odd/even refers to traditional weekday parity (Monday/Wednesday/Friday vs Tuesday/Thursday/Saturday). It intentionally does not adjust for calendar day number parity (e.g., whether the 13th of a month is an odd calendar number). This is by design per academic specifications.
