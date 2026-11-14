# AXV NEXUS — CONFIGURABLE TIME SLOTS & TIMETABLE AUDIT
## Phase 0: Existing Implementation & Domain Analysis

**Status:** Completed  
**Milestone:** Configurable Lesson Time Slots & Real Timetable Management  
**Date:** 2026-11-14  
**Auditor:** Antigravity AI  

---

## 1. Executive Summary

This audit investigates the existing scheduling architecture of the AXV Nexus platform to determine how lesson time ranges are represented, evaluated, and stored. The primary objective is to enable administrator-configurable lesson time slots without introducing duplicate entities, disrupting existing real schedules (`YA-24I1105` and `YA-26I0804`), or creating architectural debt.

---

## 2. Investigation of Existing Entities & Codebase

### 2.1 Inspection of `TimeSlot.java`
- **Location:** `backend/src/main/java/uz/axm/nexus/scheduling/domain/TimeSlot.java`
- **Definition:**
  ```java
  package uz.axm.nexus.scheduling.domain;

  import lombok.AllArgsConstructor;
  import lombok.Builder;
  import lombok.Data;
  import lombok.NoArgsConstructor;
  import java.io.Serializable;

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public class TimeSlot implements Serializable {
      private String startTime;
      private String endTime;
      private int durationMinutes; // Masalan: 80 daqiqa
  }
  ```
- **Domain Role Assessment:**
  - `TimeSlot` was defined as a pure Java Value Object / POJO.
  - It is **not** currently a JPA `@Entity`, has no `@Id`, and is not mapped to any database table in Liquibase.
  - A global search reveals that `TimeSlot` is not referenced elsewhere in either the backend or frontend.
- **Architectural Conclusion:**
  - `TimeSlot` represents the conceptual foundation for a reusable time slot, but was previously unpersisted.
  - **Decision:** Do **NOT** introduce a duplicate entity (such as `LessonTimeSlot` or `ConfigurableSlot`). Instead, **evolve `TimeSlot.java`** into a JPA entity extending `BaseEntity`, mapped to the `time_slots` table with fields for `name`, `startTime`, `endTime`, `durationMinutes`, `displayOrder`, `active`, `description`, and optional `branch`.

### 2.2 Inspection of `Schedule.java`
- **Location:** `backend/src/main/java/uz/axm/nexus/scheduling/domain/Schedule.java`
- **Current Time Representation:**
  - `startTime`: `String` (e.g. `"15:00"`)
  - `endTime`: `String` (e.g. `"16:30"`)
  - `durationMinutes`: `Integer` (e.g. `90` or `80`)
  - `days`: `String` (e.g. `"Seshanba, Payshanba, Shanba"`)
  - `dayPattern`: `String` (`"ODD_DAYS"`, `"EVEN_DAYS"`, `"ALL_SIX_DAYS"`, `"CUSTOM"`)
  - `room`: `String` (e.g. `"IT-2"`)
- **Key Insight:** `Schedule` deliberately stores decoupled `startTime` and `endTime` string values. This design is critical because:
  1. Historical schedules remain immutable even if an administrator renames or deactivates a predefined time slot.
  2. Custom time slots chosen by authorized staff are first-class citizens and do not require pseudo-slot records in the database.

### 2.3 Inspection of Real Existing Schedules in AXV Nexus
From `DataSeeder.java` and live timetable data:
| Group Identifier | Grade Level | Academic Weekdays | Time Slot | Room | Branch |
|---|---|---|---|---|---|
| **YA-26I0804** | 8-sinf | Tuesday, Thursday, Saturday (`EVEN_DAYS`) | `15:00` – `16:30` | IT-2 | IT Park Yangiariq |
| **YA-24I1105** | 11-sinf | Monday, Wednesday, Friday (`ODD_DAYS`) | `16:30` – `18:00` | IT-2 | IT Park Yangiariq |

These schedules represent active academic cohorts. **They must remain strictly untouched and preserved.**

### 2.4 Time Interval Validation & Conflict Detection
- **Validator:** `DayPatternResolver.validateTimeRange(startTime, endTime)`:
  - Parses times via `LocalTime.parse(HH:mm)`.
  - Enforces `start.isBefore(end)`.
- **Handling of Invalid / Reversed Input (`15:00–14:30`):**
  - The previously mentioned string `"15:00–14:30"` has `start (15:00) > end (14:30)`.
  - The system will **reject** this input with HTTP 400 and `BusinessException: Dars tugash vaqti boshlanish vaqtidan kechroq bo'lishi kerak (15:00 >= 14:30)`.
  - It will **not** silently swap or reinterpret the reversed values.
- **Overlap Detection:**
  - `DayPatternResolver.isTimeOverlap(start1, end1, start2, end2)`:
    ```java
    return s1.isBefore(e2) && e1.isAfter(s2);
    ```
  - Evaluates actual numeric time intervals:
    - `09:30–11:00` vs `10:30–12:00` $\rightarrow$ Overlap detected (Conflict).
    - `09:30–11:00` vs `11:00–12:30` $\rightarrow$ Adjacent boundary ($11:00 \ngtr 11:00$), **No overlap** (Valid).
    - `15:00–16:30` vs `16:30–18:00` $\rightarrow$ Adjacent boundary ($16:30 \ngtr 16:30$), **No overlap** (Valid).

---

## 3. Recommended Initial Configurable Time Slots

To match real academic practices and existing timetable slots:

| Slot Name (UZ) | Slot Name (EN) | Start Time | End Time | Duration | Display Order | Status | Notes |
|---|---|---|---|---|---|---|---|
| **Ertalabki smena** | Morning Slot | `09:30` | `11:00` | 90 min | 1 | Faol (Active) | Morning academic block |
| **Tushdan keyingi** | Afternoon Slot | `15:00` | `16:30` | 90 min | 2 | Faol (Active) | Matches group `YA-26I0804` |
| **Kechki smena** | Evening Slot | `16:30` | `18:00` | 90 min | 3 | Faol (Active) | Matches group `YA-24I1105` |

---

## 4. Proposed Database Migration (Liquibase `017-configurable-time-slots.sql`)

```sql
-- Liquibase formatted SQL
CREATE TABLE IF NOT EXISTS time_slots (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    duration_minutes INT DEFAULT 90,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_time_slots_active ON time_slots(is_active);
CREATE INDEX IF NOT EXISTS idx_time_slots_order ON time_slots(display_order);

-- Seed initial suggested time slots
INSERT INTO time_slots (name, start_time, end_time, duration_minutes, display_order, is_active, description)
VALUES 
  ('Ertalabki smena (Morning)', '09:30', '11:00', 90, 1, TRUE, 'Ertalabki akademik dars vaqti'),
  ('Tushdan keyingi (Afternoon)', '15:00', '16:30', 90, 2, TRUE, 'Tushdan keyingi dars vaqti (YA-26I0804 standarti)'),
  ('Kechki smena (Evening)', '16:30', '18:00', 90, 3, TRUE, 'Kechki dars vaqti (YA-24I1105 standarti)')
ON CONFLICT DO NOTHING;
```

---

## 5. Implementation Roadmap

1. **Phase 1 — Domain & Entity Evolution:**
   - Update `TimeSlot.java` to a JPA entity extending `BaseEntity`.
   - Create `TimeSlotRepository.java`.
   - Implement `TimeSlotService.java` with validation (start < end, unique name/time per branch/global, active filtering, usage count across schedules).
   - Add Liquibase changeset `017-configurable-time-slots.sql` and register in `db.changelog-master.yaml`.

2. **Phase 2 — Admin REST Endpoints & RBAC:**
   - `GET /api/time-slots` (Active slots for selectors, accessible to authenticated users).
   - `GET /api/admin/time-slots` (All slots with usage statistics, restricted to `ADMIN`, `SUPER_ADMIN`).
   - `POST /api/admin/time-slots` (Create time slot).
   - `PUT /api/admin/time-slots/{id}` (Update time slot, preserving historical schedules).
   - `PATCH /api/admin/time-slots/{id}/toggle-active` (Activate/deactivate time slot).
   - `PATCH /api/admin/time-slots/reorder` (Update display order).

3. **Phase 3 — UI Integration:**
   - **Admin Management:** Add `TimeSlotManagement` component into `AdminControlCenter.tsx` or as an admin sub-view with full CRUD, activation toggles, order changes, and schedule usage counts.
   - **Recurring Timetable Creation (`ManualScheduleModal.tsx`):**
     - Dynamic time-slot selector loading active slots.
     - Selecting a slot automatically populates `startTime` and `endTime`.
     - "Maxsus vaqt oralig'i (Custom Time Range)" option preserves manual entry.
   - **Individual Lesson Creation (`CreateLessonModal.tsx`):**
     - Integrates the same dynamic slot selector for consistent user experience.

4. **Phase 4 — Verification:**
   - Unit and integration tests for time slots, validation, conflict intervals, and schedule preservation.
   - Run `./gradlew test`, `npm test -- --run`, and `npm run build`.
