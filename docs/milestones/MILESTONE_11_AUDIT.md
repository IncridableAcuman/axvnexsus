# AXV Nexus — Milestone 11: Technical Audit & Architecture Plan
**Milestone:** 11 — Branches & Classes Management  
**Date:** November 2026  
**Auditor:** Senior Full-Stack Software Architect & Engineer  
**Status:** Audit Complete — Ready for Implementation

---

## 1. Executive Summary

Milestone 11 establishes a robust, normalized, multi-branch educational structure for **AXV Nexus (Al-Xorazmiy Vorislari Hub)**. The goal is to move beyond flat, string-based branch designations (`branchLocation = "IT Park Yangiariq"`) towards a fully relational, multi-tenant hierarchical model:

```
Organization (Al-Xorazmiy Vorislari)
  └── Branch (Filiallar & Markazlar)
       └── Educational Groups / Classes (StudyGroup)
            ├── Students (O'quvchilar & A'zolik tarixi)
            ├── Mentors (Fan mentorlari & Murabbiylar)
            ├── Classrooms / Labs (IT Lab xonalari)
            ├── Schedules (Dars jadvallari & Mashg'ulotlar)
            ├── Lessons (O'quv rejalari & Metodika)
            └── Assessments (Nazorat ishlari & Topshiriqlar)
```

### Critical Architectural Guarantees:
1. **No Duplicate Entities:** The existing DDD entity `StudyGroup` (`uz.axm.nexus.classrooms.domain.StudyGroup`) is the established educational class cohort. A competing `Class` entity will **not** be introduced.
2. **Zero Data Loss & Backward Compatibility:** Legacy `branchLocation` string attributes will remain intact and synchronized while introducing the foreign key `branch_id` linking to the normalized `branches` table.
3. **Strict RBAC & Scoping:** Multi-branch permissions (`branches.read`, `branches.manage`) and hierarchical scoping prevent IDOR vulnerabilities across regional branches and student groups.
4. **Historical Continuity:** Student enrollments, transfers, and drops will continue to be tracked in `GroupMembership` with historical timestamps and audit trails.

---

## 2. Current Architecture & Gap Analysis

### 2.1 Backend Classrooms & Organizational Structure

| Entity / Component | Current Implementation | Gap / Milestone 11 Requirement |
| :--- | :--- | :--- |
| **Branch Representation** | `branchLocation` raw `VARCHAR(255)` scattered across `students`, `mentors`, `study_groups`, `rooms`, `schedules`. | Missing normalized `Branch` entity, repository, service, and `/api/branches` CRUD. No branch-level metrics or administrative contacts. |
| **StudyGroup** | Model in `uz.axm.nexus.classrooms.domain`. Has `groupCode`, `gradeLevel`, `subject`, `mentor`, `academicPeriod`, `status`, `maxCapacity`, `studentCount`. | Lacks direct `@ManyToOne Branch branch` reference. `StudyGroupController` lacks full edit (`PUT /api/groups/{id}`), student un-enrollment (`DELETE /api/groups/{id}/students/{studentId}`), and branch filtering. |
| **GroupMembership** | Handles `ACTIVE`, `TRANSFERRED` states with timestamps and previous group references. | Need support for `DROPPED` / `LEFT` status when a student is unassigned without immediate transfer. |
| **Room** | Has `name`, `capacity`, `branchLocation` (String). | Missing `@ManyToOne Branch branch` relationship for lab capacity tracking per physical branch. |
| **RBAC Scoping** | `ResourceOwnershipService` handles student and mentor identity. Global admin roles bypass checks. | Missing branch-level data scoping for `REGIONAL_COORDINATOR` and `COORDINATOR` roles. |

### 2.2 Frontend State & UI Components

| Component / File | Current Implementation | Enhancement Required |
| :--- | :--- | :--- |
| **GroupsDirectory** (`frontend/src/components/groups/GroupsDirectory.tsx`) | Grid and table view with filters for grade level, status, and search. Integrates `CreateGroupModal`, `GroupDetailsModal`, `StudentEnrollmentModal`. | Add Branch filter dropdown, display branch badges, add Edit Group modal, allow removing student from group, and support mentor re-assignment. |
| **Branch Management UI** | Non-existent. No view or tab exists for managing physical branches or regional centers. | Create `BranchesView.tsx` (or `features/branches`) with KPI cards (total branches, students, mentors, rooms), search/filters, branch cards/table, and Create/Edit Branch modal. |
| **Navigation & Sidebar** (`navConfig.ts`, `Sidebar.tsx`) | Contains `groups`, `students`, `mentors` under `TUZILMA` section. | Add `branches` (Filiallar & Markazlar) item with icon `Building2` or `Network` under `TUZILMA`, role-guarded to Admins and Coordinators. |
| **API Client & Types** (`api.ts`, `types.ts`) | Has `groupStructureApi` and types for `StudyGroup`, `GroupMembershipDto`. | Add `Branch`, `BranchDto`, `BranchStatisticsDto` to `types.ts`. Add `branchApi` with CRUD methods and extend `groupStructureApi` with branch filtering and update endpoints. |
| **Localization** (`uz.ts`, `ru.ts`, `en.ts`) | Has translations for groups and members. | Add translation keys for branch management, form labels, branch stats, capacity warnings, and confirmation dialogs. |

---

## 3. Database Migration Plan (Liquibase)

A new changeset `015-branches-and-classes-management.sql` will be introduced in `backend/src/main/resources/db/changelog/changes/` and registered in `db.changelog-master.yaml`.

### Migration Operations:
1. **Create `branches` table:**
   ```sql
   CREATE TABLE branches (
       id BIGSERIAL PRIMARY KEY,
       name VARCHAR(150) NOT NULL,
       code VARCHAR(50) NOT NULL UNIQUE,
       description TEXT,
       region VARCHAR(100) NOT NULL,
       district VARCHAR(100),
       address VARCHAR(255),
       phone VARCHAR(50),
       email VARCHAR(100),
       status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   );
   ```
2. **Seed Default Branch:**
   Seed primary operational branch `IT Park Yangiariq` (`ITP-YANGIARIQ`) representing existing historical data.
3. **Alter Related Tables to add `branch_id` Foreign Keys:**
   - `study_groups`: `ADD COLUMN branch_id BIGINT REFERENCES branches(id);`
   - `rooms`: `ADD COLUMN branch_id BIGINT REFERENCES branches(id);`
   - `students`: `ADD COLUMN branch_id BIGINT REFERENCES branches(id);`
   - `mentors`: `ADD COLUMN branch_id BIGINT REFERENCES branches(id);`
   - `schedules`: `ADD COLUMN branch_id BIGINT REFERENCES branches(id);`
4. **Data Backfill:**
   Update existing rows where `branch_location = 'IT Park Yangiariq'` to set `branch_id = (SELECT id FROM branches WHERE code = 'ITP-YANGIARIQ')`.
5. **Add Indexes:**
   Add btree indexes on `branch_id` columns across all linked tables for sub-millisecond query performance.

---

## 4. Domain & REST API Contracts

### 4.1 Branch API (`/api/branches`)

| Method | Endpoint | Access Control | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/branches` | `hasAuthority('branches.read')` or Roles | List all branches with optional status/region filters |
| `GET` | `/api/branches/{id}` | `hasAuthority('branches.read')` or Roles | Get single branch details |
| `GET` | `/api/branches/{id}/statistics` | `hasAuthority('branches.read')` or Roles | Return aggregated statistics (studentCount, groupCount, mentorCount, roomCount, occupancyRate) |
| `POST` | `/api/branches` | `hasAuthority('branches.manage')` or Admin | Create a new branch |
| `PUT` | `/api/branches/{id}` | `hasAuthority('branches.manage')` or Admin | Update branch information |
| `DELETE` | `/api/branches/{id}` | `hasAuthority('branches.manage')` or Super Admin | Archive or delete branch (validates no active groups/students) |

### 4.2 Group Management API Enhancements (`/api/groups`)

| Method | Endpoint | Access Control | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/groups` | `hasAuthority('groups.read')` or Roles | Supports query param `branchId` in addition to `gradeLevel`, `mentorId`, `status`, `search` |
| `PUT` | `/api/groups/{id}` | `hasAuthority('groups.manage')` or Admin | Update group metadata (code, grade, subject, branchId, mentorId, periodId, room, maxCapacity) |
| `DELETE` | `/api/groups/{id}/students/{studentId}` | `hasAuthority('groups.manage')` or Admin/Mentor | Remove student from group (marks membership `DROPPED`/`LEFT`, unsets student's active group) |
| `PUT` | `/api/groups/{id}/mentor/{mentorId}` | `hasAuthority('groups.manage')` or Admin | Assign or change primary mentor |

---

## 5. Security & RBAC Scoping Matrix

| Role | Branch Access | Group Access | Student Assignment |
| :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` / `ADMIN` | All branches (Read & Write) | All groups (Read & Write) | Full assignment & transfer |
| `PROGRAM_ADMIN` | All branches (Read & Write) | All groups (Read & Write) | Full assignment & transfer |
| `REGIONAL_COORDINATOR` | Assigned branch(es) (Read & Manage) | Assigned branch groups | Group & student management within branch |
| `COORDINATOR` | Assigned branch (Read & Manage) | Assigned branch groups | Group & student management within branch |
| `MENTOR` | Assigned branch (Read-only) | Assigned groups (Read-only / limited update) | View group members, enroll eligible students |
| `STUDENT` | Assigned branch (Read-only) | Assigned group only (Read-only) | Read-only access to own group details |

---

## 6. Implementation Phases

1. **Phase 0:** Technical Audit & Architecture Plan (this document).
2. **Phase 1 & 2:** Liquibase Migration `015` & Entity Enhancements (`Branch`, `StudyGroup`, `Room`, `Student`, `Mentor`).
3. **Phase 3:** Backend Branch Service & Controller (`uz.axm.nexus.branches.*`).
4. **Phase 4:** Group Management Enhancements (`StudyGroupService`, `EducationStructureService`, `StudyGroupController`).
5. **Phase 5:** RBAC & Multi-Branch Security Verification (`ResourceOwnershipService`, `DataSeeder`).
6. **Phase 6 & 7:** Frontend Types, API Client, and Branch Management UI (`BranchesView.tsx`, modals).
7. **Phase 8:** Enhanced Group Directory (Branch filtering, Group Edit, Student Removal).
8. **Phase 9:** Navigation, Sidebar Integration & Full i18n Localization.
9. **Phase 10:** Automated Testing & Verification (Backend & Frontend suites).
10. **Phase 11 & 12:** Milestone Completion Report and Verification Artifacts.
