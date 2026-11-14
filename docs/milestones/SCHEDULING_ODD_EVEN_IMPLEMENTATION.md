# AXV NEXUS — SCHEDULING ENHANCEMENT DESIGN & SPECIFICATION (PHASE 1)
## Six-Day Academic Week: Odd-Day and Even-Day Scheduling

**Document:** Implementation Specification  
**Status:** Approved for Implementation  
**Target Milestone:** Scheduling Enhancement: Odd-Day and Even-Day Patterns  

---

## 1. Domain Model Architecture

### Selected Approach: Approach A (Safe Model & DTO Extension)
The audit demonstrated that AXV Nexus already uses `Schedule` to represent weekly recurring lesson blocks with a `days` string column. Approach A preserves this domain architecture:
1. `Schedule` remains the canonical entity for recurring timetable allocations.
2. `days` stores the human-readable canonical localized weekdays string (e.g., `Dushanba, Chorshanba, Juma`).
3. An explicit `dayPattern` attribute (`ODD_DAYS`, `EVEN_DAYS`, `ALL_SIX_DAYS`, `CUSTOM`) is added to both `Schedule` and `ManualScheduleRequest`.
4. Backward compatibility is guaranteed: if legacy requests omit `dayPattern`, it is dynamically inferred from `days`.

### Conceptual Modes
```java
public enum DayPattern {
    ODD_DAYS,      // Monday, Wednesday, Friday (Toq kunlar)
    EVEN_DAYS,     // Tuesday, Thursday, Saturday (Juft kunlar)
    ALL_SIX_DAYS,  // Monday through Saturday (Barcha 6 kun)
    CUSTOM         // User-selected combination of Monday through Saturday
}
```

### Canonical Academic Weekdays (Six-Day Week)
```java
public enum AcademicWeekday {
    MONDAY("Dushanba", true),
    TUESDAY("Seshanba", false),
    WEDNESDAY("Chorshanba", true),
    THURSDAY("Payshanba", false),
    FRIDAY("Juma", true),
    SATURDAY("Shanba", false);

    private final String uzbekName;
    private final boolean isOdd; // true = Toq kun, false = Juft kun
}
```
*Rule on Sunday:* Sunday (`YAKSHANBA` / `SUNDAY`) is strictly disallowed in the standard six-day academic model. If provided in a request, validation throws a `BusinessException` with a clear message: `"Yakshanba 6 kunlik akademik haftaga kirmaydi! Faqat Dushanba - Shanba kunlari ruxsat etilgan."`

---

## 2. Day Pattern Resolution & Parsing Engine

`DayPatternResolver` provides centralized bidirectional mapping:
1. **Mode -> Weekdays:**
   - `ODD_DAYS` -> `[MONDAY, WEDNESDAY, FRIDAY]`
   - `EVEN_DAYS` -> `[TUESDAY, THURSDAY, SATURDAY]`
   - `ALL_SIX_DAYS` -> `[MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY]`
   - `CUSTOM` -> strictly validates non-empty subset of the 6 canonical weekdays.
2. **Text Parsing -> Weekdays:**
   - Parses Uzbek (`Dushanba`, `Seshanba`), English (`Monday`, `Mon`), or Russian (`Понедельник`) delimiters (`,`, `-`, `•`, `/`).
3. **Weekdays -> Canonical String:**
   - Orders days Monday to Saturday.
   - Formats as comma-separated Uzbek names: e.g. `Dushanba, Chorshanba, Juma`.
4. **Overlap Detection:**
   - Given two schedules `S1` and `S2`, returns `true` if and only if `S1.getWeekdays() ∩ S2.getWeekdays() ≠ ∅`.
   - If they have no common weekdays (e.g. `ODD_DAYS` vs `EVEN_DAYS`), they never conflict, enabling optimal classroom and mentor utilization.

---

## 3. Conflict Detection Matrix

Before any schedule record is persisted or updated, `ScheduleConflictValidator` evaluates the following constraints within the database transaction:

| Dimension | Conflict Condition | Validation Error Detail |
|:---|:---|:---|
| **Time Format & Range** | `startTime >= endTime` or invalid format | `"Dars tugash vaqti boshlanish vaqtidan kechroq bo'lishi kerak"` |
| **Sunday Validation** | Request contains Sunday | `"Yakshanba 6 kunlik akademik haftaga kirmaydi! Faqat Dushanba - Shanba ruxsat etilgan."` |
| **Empty Selection** | Mode is CUSTOM but 0 days selected | `"Kamida bitta dars kuni tanlanishi shart!"` |
| **Mentor Conflict** | Same mentor scheduled at overlapping time on any overlapping weekday | `"Mentor ({name}) uchun {day} kuni vaqt to'qnashuvi mavjud! ({group}: {start}-{end})"` |
| **Classroom Conflict** | Same room scheduled at overlapping time on any overlapping weekday | `"Xona ({room}) {day} kuni band! Unda {group} darsi mavjud ({start}-{end})"` |
| **Group Conflict** | Same study group scheduled at overlapping time on any overlapping weekday | `"Guruh ({group}) uchun {day} kuni dars allaqachon mavjud ({start}-{end})"` |
| **Branch Isolation** | User has MENTOR/COORDINATOR role for branch A but schedules for branch B | `"Sizda boshqa filial ({branch}) uchun dars jadvali yaratish huquqi yo'q!"` |

---

## 4. API Contract Enhancements

### `ManualScheduleRequest`
```java
public class ManualScheduleRequest {
    private String mentorName;
    private String mentorRole;
    private String branchLocation;
    private Long branchId;
    private String groupCode;
    private String gradeLevel;
    private String subject;
    private String dayPattern; // "ODD_DAYS", "EVEN_DAYS", "ALL_SIX_DAYS", "CUSTOM"
    private List<String> selectedDays; // ["MONDAY", "WEDNESDAY", "FRIDAY"] or localized names
    private String days; // Legacy string fallback: "Dushanba, Chorshanba, Juma"
    private String startTime;
    private String endTime;
    private String room;
    private String topic;
    private List<StudentDto> students;
}
```

### Endpoints
- `GET /api/schedules`: Returns all schedules with `dayPattern` and formatted `days`.
- `POST /api/schedules/manual`: Transactional creation with comprehensive conflict checks.
- `PUT /api/schedules/{id}`: Transactional update with conflict checks (excluding self).
- `DELETE /api/schedules/{id}`: Deletes schedule while preserving historical `lesson_sessions` and `attendance_records`.

---

## 5. Frontend Form Enhancement (`ManualScheduleModal.tsx`)

### UI Components & Interaction:
1. **Dars kunlari turi (Section Header):**
   - 4-option Segmented Control / Card Selector:
     - 🔵 **Toq kunlar** (Dush - Chor - Jum)
     - 🟣 **Juft kunlar** (Sesh - Pay - Shan)
     - 🟢 **Barcha 6 kun** (Dush - Shan)
     - 🟠 **Maxsus kunlar** (Ixtiyoriy tanlov)
2. **Interactive Weekday Pills:**
   - 6 buttons representing Monday to Saturday:
     - `Dushanba`, `Seshanba`, `Chorshanba`, `Payshanba`, `Juma`, `Shanba`.
   - When `Toq kunlar` is selected: Mon, Wed, Fri automatically active and highlighted.
   - When `Juft kunlar` is selected: Tue, Thu, Sat automatically active and highlighted.
   - When `Barcha 6 kun` is selected: All 6 buttons active.
   - When `Maxsus kunlar` is selected: User can toggle any combination on/off.
3. **Selected Days Visual Preview Badge:**
   - E.g.: `Toq kunlar: Dushanba • Chorshanba • Juma`
   - Dynamically updates as the user toggles or changes modes.
4. **Validation Feedback:**
   - Shows inline error if no days are selected in CUSTOM mode.
   - Submits cleanly formatted payload to backend.

---

## 6. Migration Specification (`016-scheduling-day-patterns.sql`)

```sql
--liquibase formatted sql
--changeset izzatbek:016-scheduling-day-patterns
--validCheckSum: ANY

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS day_pattern VARCHAR(50) DEFAULT 'CUSTOM';
ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS day_pattern VARCHAR(50) DEFAULT 'CUSTOM';

UPDATE schedules
SET day_pattern = 'ODD_DAYS'
WHERE day_pattern IS NULL OR day_pattern = 'CUSTOM'
  AND (days ILIKE '%Dushanba%Chorshanba%Juma%' OR days ILIKE '%Toq%');

UPDATE schedules
SET day_pattern = 'EVEN_DAYS'
WHERE (day_pattern IS NULL OR day_pattern = 'CUSTOM')
  AND (days ILIKE '%Seshanba%Payshanba%Shanba%' OR days ILIKE '%Juft%');

UPDATE study_groups
SET day_pattern = 'ODD_DAYS'
WHERE (day_pattern IS NULL OR day_pattern = 'CUSTOM')
  AND (schedule_days ILIKE '%Dushanba%Chorshanba%Juma%' OR schedule_days ILIKE '%Toq%');

UPDATE study_groups
SET day_pattern = 'EVEN_DAYS'
WHERE (day_pattern IS NULL OR day_pattern = 'CUSTOM')
  AND (schedule_days ILIKE '%Seshanba%Payshanba%Shanba%' OR schedule_days ILIKE '%Juft%');
```
