# AXV NEXUS — BRANCHES & CENTERS MANAGEMENT AUDIT REPORT
## Multi-Branch Infrastructure, Educational Classrooms, Capacity & Data Integrity Audit

**Project:** Al-Xorazmiy Vorislari Hub (AXV Nexus) Educational Management Platform  
**Module:** Branches & Centers (Filiallar va Markazlar) Management  
**Date:** November 16, 2026  
**Auditor:** AXV Nexus Senior System Architect & Security Lead  
**Status:** Audit Completed — Implementation & Stabilization Defined  

---

## 1. Executive Summary

A comprehensive architectural and data integrity audit of the **Branches & Centers (Filiallar va Markazlar)** module was performed across backend domain entities, repositories, application services, REST controllers, DTO projections, database Liquibase migrations, frontend components, state management, and theme systems.

The audit investigated the 5 screenshot-based critical defects and conducted deep inspection of cross-cutting concerns:
- **Issue A — Student count inconsistency:** Branch overview displayed 29 students, while group memberships summed to 39 across `YA-24I1105` (15/16), `YA-26I0804` (24/16), and `YA-26I0805` (0/16).
- **Issue B — Group capacity inconsistency:** Group `YA-26I0804` displayed `24/16` without capacity warnings, administrative justification, or audit records.
- **Issue C — Classroom count inconsistency:** Branch overview displayed `Laboratories & Rooms: 0`, despite groups referencing `IT-2`, `IT Lab 1`, and `IT Lab 2`.
- **Issue D — Misleading capacity percentage:** Branch overview displayed `0%` capacity despite active enrollments, due to unseeded room entities and division by zero.
- **Issue E — Theme & modal design inconsistencies:** Modal dialogs showed contrast discrepancies between light and dark themes, non-standard tab controls, and unlocalized strings.

Additionally, a **severe IDOR vulnerability** was uncovered in `ResourceOwnershipService.java` where fallback `return;` statements inadvertently granted cross-branch access to mentors and students.

---

## 2. Comprehensive Issue Matrix

| ID | Issue Description | Severity | Component | Root Cause |
|---|---|---|---|---|
| **C1** | Student Count Inconsistency (29 in Overview vs 39 in Groups) | **CRITICAL** | Backend / Frontend | `study_groups.student_count` denormalized integer column was desynchronized from authoritative active group memberships; raw entity was exposed without DTO validation; student branch assignment was omitted during individual student provisioning. |
| **C2** | Zero Classrooms & 0% Capacity Utilization Display | **CRITICAL** | Database / Backend | No persistent `Room` records existed with `branch_id = 1` for `ITP-YANGIARIQ` (study groups and schedules only stored plain text room strings); `totalRoomCapacity = 0` led to unhandled division and misleading `0%`. |
| **C3** | Over-Capacity Group YA-26I0804 (24/16) Displayed Without Warnings | **CRITICAL** | Backend / Frontend | No over-capacity warning badge or metadata was provided; no administrative capacity override with audit trail existed. |
| **C4** | Severe Cross-Branch Access Bypass (IDOR) in `ResourceOwnershipService` | **CRITICAL** | Security / RBAC | `verifyBranchAccess()` contained accidental unconditional `return;` statements in mentor and student branches, bypassing ownership verification; `BranchController` endpoints failed to invoke ownership checks. |
| **H1** | Branch Details Modal Missing Mentors and Audit History Tabs | **HIGH** | Frontend | `BranchDetailsModal.tsx` only implemented 3 tabs (`overview`, `groups`, `rooms`), omitting the required Mentors tab, Audit History tab, and classroom CRUD workflows. |
| **H2** | Modal Dark/Light Theme Inconsistencies & Contrast Issues | **HIGH** | Frontend | Manual custom tab buttons used hardcoded border styles; modal cards and tables lacked consistent Radix `bg-card`/`bg-muted` theme tokens; native `<select>` controls lacked dark mode compatibility. |
| **H3** | Missing Backend Endpoints for Branch Mentors, Rooms CRUD & Activity | **HIGH** | Backend | `BranchController` lacked endpoints to fetch branch mentors, manage classrooms (`POST`/`PUT`/`DELETE` rooms), and view branch audit logs. |
| **M1** | Incomplete Validation on Branch Request DTOs | **MEDIUM** | Backend | `CreateBranchRequest` and `UpdateBranchRequest` lacked formal `@Email` and regex-based phone validations. |
| **M2** | Missing i18n Localization Across Branch Views and Modals | **MEDIUM** | Frontend | Components contained hardcoded Uzbek strings; locale files (`uz.ts`, `ru.ts`, `en.ts`) lacked translation keys for branch tabs, classroom types, and capacity warnings. |
| **M3** | Exposure of Raw JPA Entity Graphs from Controller Endpoints | **MEDIUM** | Backend | Endpoints returned raw `StudyGroup` and `Room` JPA entities instead of decoupled DTO projections. |
| **L1** | Lack of Server-Side Pagination & Region Filtering Optimization | **LOW** | Backend | `BranchService.getAll` performed in-memory filtering over `findAll()`. |
| **L2** | Missing Audit Logging on Classroom Modifications | **LOW** | Backend / Audit | Room creation, update, and deactivation actions were not logged to `AuditService`. |

---

## 3. Detailed Root Cause Analysis of Screenshot Defects

### 3.1 Issue A: Student Count Inconsistency (29 vs 39)
- **Observed:** Overview KPI = 29 students, 3 groups, 3 mentors. Groups table = YA-24I1105 (15), YA-26I0804 (24), YA-26I0805 (0) = 39 students.
- **Analysis:**
  1. In the database, 29 distinct students are seeded with `branch_id = 1` and `status = 'Faol'` (15 in YA-24I1105, 14 in YA-26I0804).
  2. The overview endpoint (`GET /api/branches/{id}/statistics`) queries `studentRepository.countByBranchId(id)`, correctly calculating 29 active students.
  3. However, `GET /api/branches/{id}/groups` returned raw `StudyGroup` entities where the `student_count` column for YA-26I0804 had a value of 24. This occurred because `student_count` in `study_groups` is a denormalized cache column that was either populated with historical records, configured max group sizes (`24` from system config), or desynchronized during migrations.
  4. Furthermore, `GroupMembership` records include historical states (`TRANSFERRED`, `COMPLETED`, `ARCHIVED`). If transferred students are queried without `status = 'ACTIVE'`, historical enrollments inflate the count.
- **Authoritative Rule:**
  - One student may possess only **ONE** active primary group membership (`status = 'ACTIVE'`).
  - Active group enrollment must strictly equal `groupMembershipRepository.countByGroupIdAndStatus(groupId, "ACTIVE")`.
  - The branch student count is the distinct count of active students enrolled in groups belonging to the branch or directly assigned to the branch with status `'Faol'`.

### 3.2 Issue B: Group Capacity Inconsistency (24/16)
- **Observed:** YA-26I0804 displayed `24/16`.
- **Analysis:**
  - `16` represents `StudyGroup.maxCapacity` (the standard classroom computer capacity).
  - `24` was the recorded `student_count`, exceeding capacity by 8 students.
  - The frontend rendered `24 / 16` without any visual indicator, warning, or status badge.
  - Existing over-capacity groups must be preserved and remain fully visible (never silently modified or deleted).
- **Authoritative Rule:**
  - Over-capacity groups must render a prominent warning badge: e.g. `24/16 • Sig'imdan oshgan!`.
  - Normal enrollment prevents exceeding `maxCapacity`.
  - An administrative override (`allowCapacityOverride: true`, `overrideReason: "..."`) is permitted only for authorized administrators (`SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`), creating a permanent `GROUP_CAPACITY_OVERRIDE` audit log in `audit_logs`.

### 3.3 Issue C: Classroom Count Inconsistency (0 Rooms Displayed)
- **Observed:** Overview showed `Laboratories & Rooms: 0`, but groups referenced `IT-2`, `IT Lab 1`, `IT Lab 2`.
- **Analysis:**
  - `StudyGroup.room` and `Schedule.room` store room identifiers as plain text strings (`"IT-2"`).
  - Liquibase migration `015-branches-and-classes-management.sql` added `branch_id` to `rooms`, but no room records were ever inserted into the `rooms` table for branch 1.
  - `roomRepository.countByBranchId(branchId)` returned 0, creating a permanent empty state.
- **Authoritative Rule:**
  - Add sequential Liquibase migration `022-branch-and-room-integrity.sql` to backfill persistent `Room` records (`IT-2`, `IT Lab 1`, `IT Lab 2`) linked to `ITP-YANGIARIQ`.
  - Maintain bidirectional consistency between `Room.name` and group/schedule room identifiers.
  - Provide full classroom management (list, create, update, deactivate).

### 3.4 Issue D: Misleading 0% Capacity Percentage
- **Observed:** Branch overview showed `0%` capacity despite having enrolled students.
- **Analysis:**
  - `totalRoomCapacity` was calculated as `sum(room.capacity)`. Because `rooms` was empty, `totalRoomCapacity = 0`.
  - The formula `activeStudents / totalRoomCapacity * 100` defaulted to `0.0`.
  - The UI rendered `0%`, which misled users into thinking the branch was empty.
- **Authoritative Rule:**
  - `capacityUtilizationRate = totalRoomCapacity > 0 ? Math.round((double) activeStudents / totalRoomCapacity * 100.0 * 10.0) / 10.0 : null`.
  - When `totalRoomCapacity == 0`, `capacityUtilizationRate` is `null`, and the UI displays an explicit unavailable state (`N/A • Xonalar kiritilmagan`) rather than misleading `0%`.

### 3.5 Issue E: Theme and Modal Design Inconsistency
- **Observed:** Branch details modal and edit modal had poor text contrast, hardcoded borders, manual button tabs, and lacked Radix theme tokens in dark mode.
- **Analysis:**
  - Custom `<button>` tabs lacked ARIA tab attributes, keyboard navigation (`ArrowLeft`/`ArrowRight`), and proper dark theme highlights.
  - Table rows lacked hover transitions and dark border styling.
  - Native select controls clashed with dark mode backgrounds.
- **Authoritative Rule:**
  - Re-architect `BranchDetailsModal.tsx` using Radix `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent`.
  - Apply semantic Tailwind color tokens (`bg-card`, `text-card-foreground`, `border-border`, `bg-muted/30`).
  - Ensure 100% WCAG AAA contrast compliance across both light (`data-theme="light"`) and dark (`data-theme="dark"`) modes.

---

## 4. RBAC and Branch Isolation Audit

### 4.1 Identified Vulnerability in `ResourceOwnershipService.java`
Inspection of `ResourceOwnershipService.java` revealed lines 247–263:
```java
if (currentUserHelper.isMentor()) {
    Optional<Mentor> mentorOpt = getCurrentMentor();
    if (mentorOpt.isPresent() && mentorOpt.get().getBranch() != null
            && mentorOpt.get().getBranch().getId().equals(targetBranchId)) {
        return;
    }
    return; // <-- CRITICAL SECURITY FLAW: Unconditional return!
}

if (currentUserHelper.isStudent()) {
    Optional<Student> studentOpt = getCurrentStudent();
    if (studentOpt.isPresent() && studentOpt.get().getBranch() != null
            && studentOpt.get().getBranch().getId().equals(targetBranchId)) {
        return;
    }
    return; // <-- CRITICAL SECURITY FLAW: Unconditional return!
}
```
Because of the errant `return;` outside the conditional block, the method exited successfully for **ANY** mentor and **ANY** student, completely defeating branch isolation and opening a direct IDOR vulnerability.

### 4.2 Security Remediation Plan
1. Fix `verifyBranchAccess()` to strictly throw `AccessDeniedException` if a mentor or student attempts to access a branch other than their assigned branch.
2. In `BranchController.java`, invoke `resourceOwnershipService.verifyBranchAccess(id)` on all sensitive endpoints:
   - `getBranchById(id)`
   - `getBranchStatistics(id)`
   - `getBranchGroups(id)`
   - `getBranchRooms(id)`
   - `getBranchMentors(id)`
   - `getBranchAuditLogs(id)`
3. Prevent administrative branch creation or modification by non-admin roles (`STUDENT`, `MENTOR`, `OBSERVER`).
4. Ensure `REGIONAL_COORDINATOR` can only access branches situated in their assigned region.

---

## 5. Required Action Plan

1. **Phase 1: Data Integrity & Database Safety**
   - Create Liquibase migration `022-branch-and-room-integrity.sql` to add `room_type` and `status` to `rooms`, index `branch_id`, and safely backfill `IT-2`, `IT Lab 1`, and `IT Lab 2` for `ITP-YANGIARIQ`.
   - Synchronize denormalized `study_groups.student_count` with authoritative active memberships.

2. **Phase 2: Backend Services, DTOs & Controllers**
   - Create `BranchGroupDto`, `BranchRoomDto`, `BranchMentorDto`, and `CreateRoomRequest`/`UpdateRoomRequest`.
   - Update `BranchService` to calculate authoritative statistics, over-capacity indicators, and room utilization.
   - Fix `ResourceOwnershipService` IDOR vulnerability and wire branch isolation checks into `BranchController`.
   - Implement `POST`/`PUT`/`DELETE` room management endpoints and mentor/audit retrieval.

3. **Phase 3: Frontend UI/UX & Redesign**
   - Re-architect `BranchDetailsModal.tsx` with all 5 tabs (`Overview`, `Groups`, `Mentors`, `Rooms`, `Activity`).
   - Implement search and filtering (grade, mentor, status) in the Groups tab.
   - Display prominent over-capacity warning badges (`24/16`).
   - Standardize light/dark themes using semantic tokens and Radix `Tabs`.
   - Integrate `useI18n()` with complete keys across `uz.ts`, `ru.ts`, and `en.ts`.

4. **Phase 4: Comprehensive Automated Testing**
   - Backend integration tests: CRUD, duplicate codes, statistics calculations, over-capacity detection, capacity overrides, RBAC, and IDOR prevention.
   - Frontend tests: rendering, tab navigation, search/filter, dark mode theme tokens, over-capacity rendering, and query invalidation.

5. **Phase 5: Documentation & Reporting**
   - Compile `BRANCHES_CENTERS_DATA_INTEGRITY.md`, `BRANCHES_CENTERS_IMPLEMENTATION.md`, and `BRANCHES_CENTERS_COMPLETION_REPORT.md`.
