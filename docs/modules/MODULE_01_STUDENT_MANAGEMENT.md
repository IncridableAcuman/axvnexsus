# AXV Nexus — Module 01: Student Management Specification

## 1. Overview & Objectives

Student Management is a core pillar of Module 01 in the AXV Nexus educational platform. It provides a robust, production-grade system for managing the entire lifecycle of student records, credentials, group memberships, academic tracking, and safe data archival while preserving strict referential integrity.

---

## 2. Domain Model & Architecture

### Backend Entities
- **`Student` (`uz.axm.nexus.users.domain.Student`)**:
  - `id` (BIGINT, Primary Key)
  - `fullName` (VARCHAR(255), Not Null)
  - `studentIdNumber` (VARCHAR(50), Unique HEMIS ID, e.g., `42600011`)
  - `pinfl` (VARCHAR(14), Unique Personal Identification Number)
  - `phone` (VARCHAR(30))
  - `gradeLevel` (VARCHAR(50), e.g., `8-sinf`, `9-sinf`, `10-sinf`, `11-sinf`)
  - `direction` (VARCHAR(100), e.g., `Aniq fanlar`, `IT va Dasturlash`)
  - `district` (VARCHAR(100), e.g., `Yangiariq tumani`)
  - `branchLocation` (VARCHAR(150), e.g., `IT Park Yangiariq`)
  - `status` (VARCHAR(20), Default: `ACTIVE`, Values: `ACTIVE`, `INACTIVE`, `ARCHIVED`)
  - `user` (`@OneToOne` with `User`, provides authentication credentials)
  - `studyGroup` (`@ManyToOne` with `StudyGroup`)
  - `mentor` (`@ManyToOne` with `Mentor`)
- **`GroupMembership` (`uz.axm.nexus.groups.domain.GroupMembership`)**:
  - Historical record tracking cohort transfers.
  - Fields: `student`, `group`, `joinedAt`, `leftAt`, `isActive`, `transferReason`.

---

## 3. Key Capabilities & Business Logic

### A. Unique HEMIS ID & PINFL Handling
- Every student is assigned a unique national HEMIS ID (`student_id_number`) and government PINFL (`pinfl`).
- Database constraints (`idx_students_student_id_num`, `idx_students_pinfl`) prevent duplicate registration.
- Auto-generation format: `426` + 5 digits sequentially or via unique algorithm.

### B. Single Student Fetch & Detailed Profile
- Endpoint `GET /api/students/{id}` returns `StudentDetailDto` containing:
  - Core student demographics and contact info.
  - Linked User ID and account status (`enabled`, `status`).
  - Active study group metadata (code, subject, grade, mentor name, room).
  - Assigned mentor profile info.
  - Complete historical list of cohort transfers (`groupHistory`).

### C. Safe Archiving Pattern (No Hard Deletions)
- **Problem**: Hard-deleting students causes cascading foreign key violations across `group_memberships`, `schedules`, `attendance`, `assessment_submissions`, and `student_badges`.
- **Solution**:
  - Method `archiveStudent(Long studentId, String reason)` marks student `status = "ARCHIVED"`.
  - Disables linked authentication account: `user.setEnabled(false)`.
  - Records an audit entry in `audit_logs` (`STUDENT_ARCHIVED`).
  - Preserves 100% of attendance, grades, and academic transfer history.

### D. Group Transfer & History
- Endpoint `GET /api/students/{id}/group-history` returns ordered transfer timeline:
  - Group Code, Subject, Branch.
  - Enrollment date (`joinedAt`) and departure date (`leftAt`).
  - Active status flag and documented transfer reason.

---

## 4. API Endpoints Reference

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/students` | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN`, `ROLE_COORDINATOR` | Search and filter students with pagination (`query`, `branch`, `status`) |
| `GET` | `/api/students/{id}` | Authenticated (`users.read` or Self) | Fetch complete student profile with group and mentor details |
| `POST` | `/api/students` | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | Enroll new student and provision user account |
| `PUT` | `/api/students/{id}` | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | Update student demographics, group assignment, and status |
| `PATCH` | `/api/students/{id}/status` | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | Change status (`ACTIVE`, `INACTIVE`, `ARCHIVED`) with reason |
| `POST` | `/api/students/{id}/archive` | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | Safe-archive student and disable authentication login |
| `GET` | `/api/students/{id}/group-history` | Authenticated | Retrieve complete group membership and transfer audit log |

---

## 5. Frontend Components & User Interface

- **`StudentsList.tsx` (`frontend/src/components/StudentsList.tsx`)**:
  - Top statistics cards (total students, active, inactive, archived).
  - Search by name, PINFL, or HEMIS ID; filter by grade, group, and status.
  - Action buttons: View Profile (Eye), Edit (Pencil), Reset Password (KeyRound), Safe Archive (Archive).
- **`StudentDetailsModal.tsx` (`frontend/src/components/students/StudentDetailsModal.tsx`)**:
  - Modal with tabs: Profile Overview and Group History.
  - Displays avatar, HEMIS ID with 1-click clipboard copy, PINFL, mentor, and group.
  - Group history table showing enrollment dates, previous cohorts, and transfer reasons.
- **`EditStudentModal.tsx` (`frontend/src/components/students/EditStudentModal.tsx`)**:
  - Form editing Full Name, Phone, PINFL, Grade Level, Direction, District, Branch, Group, and Status.
  - Automatic validation and toast notifications on success/error.
