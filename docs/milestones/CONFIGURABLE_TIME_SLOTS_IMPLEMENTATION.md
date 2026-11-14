# AXV NEXUS — CONFIGURABLE TIME SLOTS IMPLEMENTATION
## Flexible Time Slot Management & Scheduling Integration

**Status:** Successfully Implemented & Verified  
**Milestone:** Configurable Lesson Time Slots  
**Date:** 2026-11-14  
**Author:** Antigravity AI  

---

## 1. Architectural Design & Entity Evolution

The AXV Nexus scheduling system requires administrator-configurable lesson time slots while strictly preserving real-world academic cohorts, historical schedules, and existing attendance records.

### Evolution of Existing `TimeSlot.java`
Rather than introducing redundant domain entities (such as `LessonTimeSlot` or `ConfigurableSlot`), the existing domain class `uz.axm.nexus.scheduling.domain.TimeSlot` was promoted to a full JPA entity extending `BaseEntity`:

```java
@Entity
@Table(name = "time_slots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeSlot extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "start_time", nullable = false, length = 10)
    private String startTime; // masalan: "09:30"

    @Column(name = "end_time", nullable = false, length = 10)
    private String endTime; // masalan: "11:00"

    @Column(name = "duration_minutes")
    private Integer durationMinutes; // 90 daqiqa

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;
}
```

---

## 2. Database Migration (`017-configurable-time-slots.sql`)

Liquibase changeset `017-configurable-time-slots.sql` creates the schema and seeds the default time slot configurations matching real-world academic hours:

```sql
-- Liquibase formatted SQL
-- changeset izzatbek:017-configurable-time-slots
CREATE TABLE IF NOT EXISTS time_slots (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    duration_minutes INT DEFAULT 90,
    display_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_time_slots_active ON time_slots(is_active);
CREATE INDEX IF NOT EXISTS idx_time_slots_order ON time_slots(display_order);
CREATE INDEX IF NOT EXISTS idx_time_slots_time ON time_slots(start_time, end_time);

-- Seed initial suggested time slots matching actual schedules
INSERT INTO time_slots (name, start_time, end_time, duration_minutes, display_order, is_active, description)
SELECT 'Ertalabki smena (Morning)', '09:30', '11:00', 90, 1, TRUE, 'Ertalabki akademik dars vaqti'
WHERE NOT EXISTS (SELECT 1 FROM time_slots WHERE start_time = '09:30' AND end_time = '11:00');

INSERT INTO time_slots (name, start_time, end_time, duration_minutes, display_order, is_active, description)
SELECT 'Tushdan keyingi (Afternoon)', '15:00', '16:30', 90, 2, TRUE, 'Tushdan keyingi dars vaqti (YA-26I0804 standarti)'
WHERE NOT EXISTS (SELECT 1 FROM time_slots WHERE start_time = '15:00' AND end_time = '16:30');

INSERT INTO time_slots (name, start_time, end_time, duration_minutes, display_order, is_active, description)
SELECT 'Kechki smena (Evening)', '16:30', '18:00', 90, 3, TRUE, 'Kechki dars vaqti (YA-24I1105 standarti)'
WHERE NOT EXISTS (SELECT 1 FROM time_slots WHERE start_time = '16:30' AND end_time = '18:00');
```

---

## 3. Strict Validation & Protection of Historical Schedules

1. **Rejection of Reversed / Malformed Input:**
   - The user-reported reversed time range `15:00–14:30` is strictly rejected with HTTP 400 Bad Request:
     `"Dars tugash vaqti boshlanish vaqtidan kechroq bo'lishi kerak (15:00 >= 14:30)"`.
   - The system does **not** silently swap or reinterpret invalid inputs.
2. **Preservation of Existing Schedules:**
   - Real schedules in the system:
     - `YA-26I0804`: Tuesday, Thursday, Saturday, `15:00` – `16:30`.
     - `YA-24I1105`: Monday, Wednesday, Friday, `16:30` – `18:00`.
   - Modifying or deactivating a time slot leaves existing `Schedule` and `LessonSession` records completely unaffected.
   - Destructive deletion of an active time slot is blocked if `usageCount > 0`:
     `"Ushbu dars vaqti X ta dars jadvalida ishlatilmoqda. Uni o'chirish o'rniga nofaol (deactivate) qiling!"`.

---

## 4. Conflict Detection Across Actual Intervals

Conflict detection compares numeric time boundaries rather than slot IDs:
$$\text{isTimeOverlap}(s_1, e_1, s_2, e_2) \iff s_1 < e_2 \land e_1 > s_2$$

- **Overlapping:** `09:30–11:00` vs `10:30–12:00` $\rightarrow$ Overlap detected.
- **Adjacent Non-Overlapping:** `09:30–11:00` and `11:00–12:30` $\rightarrow$ Valid (adjacent boundary $11:00 \ngtr 11:00$).
- **Adjacent Afternoon/Evening:** `15:00–16:30` and `16:30–18:00` in the same room $\rightarrow$ Valid.

---

## 5. Frontend & UI Integration

1. **Admin Control Center:**
   - Added `TimeSlotManagement.tsx` component under the `AdminControlCenter.tsx` tabs (`'timeslots'`).
   - Features:
     - Real-time list of all time slots with active toggles, display order, duration, and usage counts.
     - Add / Edit Dialog with client-side and server-side validation.
     - Safe deletion guards.
2. **Recurring Timetable Creation (`ManualScheduleModal.tsx`):**
   - Dynamic time-slot selector loaded from `/api/time-slots`.
   - Selecting a slot automatically populates `startTime` and `endTime`.
   - Selecting an existing study group auto-detects if its schedule matches a predefined slot or switches to `"custom"`.
   - "Maxsus vaqt oralig‘i (Custom Time Range)" enables manual time entry when needed.
3. **Individual Lesson Creation (`CreateLessonModal.tsx`):**
   - Added time slot dropdown selector.
   - Synchronized with active slot definitions.

---

## 6. Verification Metrics

- **Backend Tests:** **206 passed** (0 failures, 0 errors, 0 skipped).
  - 10 new integration tests in `TimeSlotManagementIntegrationTest.java`.
- **Frontend Tests:** **166 passed** (0 failures) across 29 test files.
  - 15 tests in `ManualScheduleModal.test.tsx` (3 new time-slot tests).
  - 6 new tests in `TimeSlotManagement.test.tsx`.
- **Production Build:** Vite + TypeScript build succeeded in **864ms**.
