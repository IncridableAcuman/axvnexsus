# AXV Nexus — Branches & Centers Data Integrity Specification

## 1. Executive Summary

This document establishes the data integrity rules, root cause analysis, schema migrations, and authoritative calculation standards for the **Branches & Centers (Filiallar va Markazlar)** module within the **AXV Nexus (Al-Xorazmiy Vorislari Hub)** platform.

Prior to stabilization, the module exhibited data discrepancies across branch overview cards, group membership tallies, classroom inventories, and capacity utilization metrics. This specification documents the architectural root causes, the corrective schema changes introduced in Liquibase Changeset 022, the single authoritative calculation formulas, and concurrency safeguards implemented to guarantee long-term data integrity.

---

## 2. Root Cause Analysis of Audit Findings

### Issue A: Student Count Inconsistency (29 in Overview vs 39 in Groups Table)

* **Symptom:**
  The branch overview dashboard displayed **29 total students**, whereas summing the memberships of active groups under the branch yielded **39** (`YA-2411105`: 15, `YA-2610804`: 24, `YA-2610805`: 0).
* **Root Causes:**
  1. **Dual / Desynchronized Data Models:** The application had two concurrent sources of student-branch association:
     - `students.branch_id` directly on the `students` table.
     - `study_groups.branch_id` coupled with `group_memberships(student_id, study_group_id, status)`.
  2. **Denormalized `study_groups.student_count` Counter Desynchronization:** The `study_groups.student_count` column was an unmanaged integer column that had diverged from the actual count of active records in `group_memberships`.
  3. **Unassigned Branch Foreign Keys:** Several student records were actively enrolled in branch study groups but had `students.branch_id IS NULL`, causing direct branch student queries (`SELECT COUNT(*) FROM students WHERE branch_id = :id`) to exclude them.
  4. **Multi-Group vs Historical Memberships:** When students were transferred between cohorts, prior memberships remained marked without strict active filtering, leading to multiple counts when summing across groups.
* **Resolution:**
  - Standardized on the **Primary Active Membership Rule**: Every active student belongs to exactly one active primary study group at any given time.
  - Changeset 022 synchronized `students.branch_id` from the student's active `study_groups.branch_id`.
  - Recalculated and backfilled `study_groups.student_count` directly from `SELECT COUNT(*) FROM group_memberships WHERE study_group_id = sg.id AND status = 'ACTIVE'`.
  - `BranchService.getBranchStatistics()` now queries `studentRepository.countActiveStudentsByBranchId(branchId)` with explicit status and branch filtering.

---

### Issue B: Group Capacity Inconsistency (`YA-2610804` Displayed 24/16)

* **Symptom:**
  Study group `YA-2610804` displayed `24/16`, indicating 24 enrolled students against a capacity of 16, with no visual warning or administrative override trace.
* **Root Causes:**
  1. **Hardcoded Fallback Capacity:** The value `16` was used as an arbitrary default when no explicit classroom or group max capacity was referenced.
  2. **Missing Enrollment Validation:** The `EducationStructureService.enrollStudent(...)` method did not validate group size against `studyGroup.getMaxCapacity()` or classroom seating limits before creating new `group_memberships`.
  3. **No Audit Trail for Overrides:** Academic coordinators who transferred entire cohorts or accommodated emergency enrollments had no facility to register an authorized capacity override.
* **Resolution:**
  - Preserved existing historical data without arbitrary truncation or student dropouts.
  - Implemented transactional capacity enforcement in `EducationStructureService.enrollStudent()`:
    ```java
    if (activeCount >= group.getMaxCapacity() && !allowCapacityOverride) {
        throw new IllegalStateException("Guruh sig'imi to'lgan (" + activeCount + "/" + group.getMaxCapacity() + "). Sig'imdan oshirish uchun ma'muriy ruxsat talab etiladi.");
    }
    ```
  - Added `allowCapacityOverride` and `overrideReason` parameters to `EnrollStudentRequest`. When an authorized administrator exercises an override, an audit event (`GROUP_CAPACITY_OVERRIDE`) is permanently recorded in `audit_logs`.
  - The UI now surfaces a prominent warning badge (`Sig'imdan oshgan!`) whenever enrollment exceeds configured capacity.

---

### Issue C: Classroom Count Inconsistency (0 Rooms Displayed vs `IT-2`, `IT Lab 1`, `IT Lab 2`)

* **Symptom:**
  Branch overview KPI cards displayed `Laboratories & Rooms: 0`, yet group schedules and listings explicitly referenced `IT-2`, `IT Lab 1`, and `IT Lab 2`.
* **Root Causes:**
  1. **String Storage vs Relational Entities:** Early prototypes recorded classroom identifiers as plain text strings (`study_groups.room` or `schedules.room`) rather than relational foreign keys to the `rooms` table.
  2. **Unseeded `rooms` Table:** While `branches` and `study_groups` were initialized during database bootstrap, the `rooms` table had zero rows for `ITP-YANGIARIQ`.
  3. **Missing DTO Endpoints:** The backend lacked dedicated room CRUD and inventory retrieval endpoints linked to specific branch IDs.
* **Resolution:**
  - Changeset 022 backfilled actual `rooms` records for `ITP-YANGIARIQ` (`IT-2`, `IT Lab 1`, `IT Lab 2`, and `Nazariy xona 1`) with defined capacities (16-24 seats) and room types (`IT_LAB`, `THEORY_ROOM`).
  - Added `room_type` and `status` columns to `rooms` table.
  - Linked `study_groups.room_id` to actual `rooms` entities while safely preserving historical text representations.
  - Implemented full Room CRUD APIs (`POST`, `PUT`, `DELETE` at `/api/branches/{id}/rooms`).

---

### Issue D: Misleading Capacity Percentage (0% Displayed)

* **Symptom:**
  The branch overview card displayed `0%` capacity utilization despite 29 active students and multiple active cohorts.
* **Root Causes:**
  1. **Division by Zero:** Total branch room capacity was calculated as `SUM(rooms.capacity)`. Because `rooms` had 0 records, total capacity was 0. The calculation defaulted to `0.0%` instead of signaling an unconfigured state.
  2. **Ambiguous Utilization Definition:** The domain lacked a clear definition of branch capacity utilization (classroom physical seats vs group target enrollments).
* **Resolution:**
  - Standardized Branch Capacity Utilization Formula:
    $$\text{Capacity Utilization (\%)} = \left( \frac{\text{Authoritative Active Enrolled Students}}{\sum \text{Active Classroom Capacities}} \right) \times 100$$
  - Guarded against division by zero:
    ```java
    if (totalRoomCapacity != null && totalRoomCapacity > 0) {
        double rate = Math.round(((double) totalStudents / totalRoomCapacity) * 1000.0) / 10.0;
        stats.setCapacityUtilizationRate(rate);
        stats.setHasCapacityData(true);
    } else {
        stats.setCapacityUtilizationRate(null);
        stats.setHasCapacityData(false);
    }
    ```
  - The UI displays an honest `Mavjud emas` (N/A) badge with explanatory tooltip when room infrastructure is not yet configured, rather than a misleading `0%`.

---

### Issue E: Modal Theme Contrast and Consistency

* **Symptom:**
  Branch details and creation modals exhibited poor contrast, missing borders, illegible text in dark mode, and misaligned tab headers.
* **Root Causes:**
  - Hardcoded utility classes (e.g. `bg-white`, `text-gray-900`) instead of semantic theme tokens (`bg-card`, `text-card-foreground`, `border-border`).
  - Missing hover/focus states in tab triggers and form controls.
* **Resolution:**
  - Refactored `BranchModal.tsx` and `BranchDetailsModal.tsx` to utilize CSS variables and semantic tokens.
  - Verified 100% WCAG 2.1 AA compliant contrast in both light and dark modes.

---

## 3. Database Schema Changes (Liquibase Changeset 022)

File: `backend/src/main/resources/db/changelog/changes/022-branch-and-room-integrity.sql`

```sql
-- 1. Ensure rooms table has room_type and status columns
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type VARCHAR(50) DEFAULT 'IT_LAB';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';

-- 2. Add performance indexes for room and branch lookups
CREATE INDEX IF NOT EXISTS idx_rooms_branch_status ON rooms(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_rooms_branch_name ON rooms(branch_id, name);
CREATE INDEX IF NOT EXISTS idx_study_groups_branch_status ON study_groups(branch_id, status);

-- 3. Backfill missing room entities for ITP-YANGIARIQ
INSERT INTO rooms (name, capacity, branch_id, room_type, status, created_at, updated_at)
SELECT 'IT-2', 16, b.id, 'IT_LAB', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM branches b WHERE b.code = 'ITP-YANGIARIQ'
  AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND r.name = 'IT-2');

INSERT INTO rooms (name, capacity, branch_id, room_type, status, created_at, updated_at)
SELECT 'IT Lab 1', 16, b.id, 'IT_LAB', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM branches b WHERE b.code = 'ITP-YANGIARIQ'
  AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND r.name = 'IT Lab 1');

INSERT INTO rooms (name, capacity, branch_id, room_type, status, created_at, updated_at)
SELECT 'IT Lab 2', 16, b.id, 'IT_LAB', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM branches b WHERE b.code = 'ITP-YANGIARIQ'
  AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND r.name = 'IT Lab 2');

INSERT INTO rooms (name, capacity, branch_id, room_type, status, created_at, updated_at)
SELECT 'Nazariy xona 1', 24, b.id, 'THEORY_ROOM', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM branches b WHERE b.code = 'ITP-YANGIARIQ'
  AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND r.name = 'Nazariy xona 1');

-- 4. Synchronize students.branch_id from active study groups
UPDATE students s
SET branch_id = sg.branch_id
FROM study_groups sg
WHERE s.study_group_id = sg.id
  AND (s.branch_id IS NULL OR s.branch_id <> sg.branch_id)
  AND sg.branch_id IS NOT NULL;

-- 5. Synchronize study_groups.student_count from group_memberships
UPDATE study_groups sg
SET student_count = (
    SELECT COUNT(gm.id)
    FROM group_memberships gm
    WHERE gm.study_group_id = sg.id
      AND (gm.status IS NULL OR gm.status = 'ACTIVE')
)
WHERE EXISTS (
    SELECT 1 FROM group_memberships gm WHERE gm.study_group_id = sg.id
);
```

---

## 4. Authoritative Counting and Calculation Rules

| Metric | Source of Truth | Query / Logic | Handling of Edge Cases |
|---|---|---|---|
| **Branch Total Students** | `students` table | `SELECT COUNT(DISTINCT s.id) FROM students s WHERE s.branch_id = :branchId AND s.status = 'ACTIVE'` | Excludes archived and expelled students. |
| **Group Enrollment** | `group_memberships` table | `SELECT COUNT(gm.id) FROM group_memberships gm WHERE gm.study_group_id = :groupId AND gm.status = 'ACTIVE'` | Denormalized `student_count` column is synchronized on every join/leave mutation. |
| **Branch Active Groups** | `study_groups` table | `SELECT COUNT(sg.id) FROM study_groups sg WHERE sg.branch_id = :branchId AND sg.status = 'ACTIVE'` | Archived/completed cohorts excluded from active count. |
| **Branch Mentors** | `study_groups` + `mentors` | `SELECT COUNT(DISTINCT sg.mentor_id) FROM study_groups sg WHERE sg.branch_id = :branchId AND sg.mentor_id IS NOT NULL` | Avoids duplicate counting when a mentor teaches multiple groups in the branch. |
| **Classroom Count** | `rooms` table | `SELECT COUNT(r.id) FROM rooms r WHERE r.branch_id = :branchId AND r.status = 'ACTIVE'` | Distinguishes between active rooms and rooms under maintenance. |
| **Branch Capacity Rate** | Derived calculation | `(Total Active Students / Total Active Room Capacity) * 100` | Returns `null` (`hasCapacityData = false`) if total capacity is 0 or no rooms exist. |

---

## 5. Prevention and Concurrency Safeguards

1. **Transaction-Level Capacity Validation:**
   Student enrollment operations are executed inside `@Transactional` service boundaries with optimistic/pessimistic concurrency controls to prevent race conditions during concurrent enrollment requests.
2. **Audit Logging for Overrides:**
   Whenever an administrative override occurs (`allowCapacityOverride = true`), an immutable audit record is saved via `AuditService.logAdminOperation(...)` detailing the student ID, group ID, previous count, target capacity, and justification reason.
3. **Safe Branch Lifecycle (No Hard Deletes):**
   Branches with associated groups, students, rooms, or historical attendance are protected against hard deletion. If deletion is attempted on a populated branch, `BranchService.deleteBranch()` automatically transitions the branch status to `ARCHIVED`, ensuring historical student records remain accessible.
