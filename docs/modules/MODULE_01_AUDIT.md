# MODULE 01: IDENTITY, STUDENT, MENTOR & ADMINISTRATION MANAGEMENT
## COMPREHENSIVE ARCHITECTURAL AUDIT & PRIORITIZED IMPLEMENTATION PLAN

**Document Version:** 1.0.0  
**Status:** Audit Complete — Ready for Implementation  
**Date:** 2026-11-14  
**Author:** Lead Software Architect & Senior Full-Stack Engineer  

---

## 1. EXECUTIVE SUMMARY

Module 01 serves as the foundational backbone for the AXV Nexus educational platform, covering:
1. **Student Management** (lifecycle, HEMIS provisioning, profiles, transfers, group history).
2. **Mentor Management** (profiles, specializations, workloads, assigned groups/students).
3. **Administrator Management** (staff account creation, RBAC oversight, operational metrics).
4. **Roles and Permissions (RBAC)** (granular permissions, multi-role inheritance, escalation prevention).
5. **User Profiles and Account Management** (self-service profile updates, password change, preferences).
6. **Branch-Level Access and Data Ownership** (strict scoping per branch, coordinator/mentor boundaries).

Following a rigorous, read-only inspection of both backend (`backend/src/main/java/uz/axm/nexus/`) and frontend (`frontend/src/`), this document details current implementations, architectural gaps, security vulnerabilities, and provides an actionable, prioritized roadmap across Phases 1 through 8.

---

## 2. AUDIT FINDINGS BY DOMAIN AREA

### 2.1 Student Management

#### Fully Implemented Functionality:
- **Core Domain Entities:** [Student.java](file:///home/izzatbek/Desktop/axvhub/backend/src/main/java/uz/axm/nexus/users/domain/Student.java) mapped to table `students` with relations to `User`, `Branch`, `StudyGroup`, and `Mentor`.
- **HEMIS Provisioning:** `POST /api/students/provision` automatically generates standardized student identifiers (e.g. `42600011` / `I-HR 0220243`), generates secure random passwords, provisions `User` accounts with role `ROLE_STUDENT`, and creates an active `GroupMembership`.
- **Password Reset:** `POST /api/students/{id}/reset-password` generates a fresh password and updates the linked `User` credentials with audit logging.
- **List with Filters:** `GET /api/students` supports filtering by `gradeLevel`, `mentorId`, `groupId`.
- **Self Profile:** `GET /api/students/me` resolves the authenticated student via [ResourceOwnershipService.java](file:///home/izzatbek/Desktop/axvhub/backend/src/main/java/uz/axm/nexus/shared/application/ResourceOwnershipService.java).
- **Group Transfer Engine:** [EducationStructureService.java](file:///home/izzatbek/Desktop/axvhub/backend/src/main/java/uz/axm/nexus/classrooms/application/EducationStructureService.java) contains complete transfer logic: closes old membership as `TRANSFERRED` with timestamp and reason, opens new membership with `previousGroup` pointer, and maintains cohort capacity constraints.

#### Partially Implemented & Missing Functionality:
1. **Missing Single Student Detail Endpoint:** No dedicated `GET /api/students/{id}` in `StudentController.java` to fetch full student details with permission checks.
2. **Missing Update Endpoint:** No dedicated `PUT /api/students/{id}` to update student demographics (full name, phone, PINFL, grade level, district, branch, assigned group).
3. **Missing Lifecycle Status Transitions:** No `PATCH /api/students/{id}/status` endpoint. Currently, `deleteStudent` performs a hard delete (`studentRepository.deleteById(id)`), which fails with referential integrity violations if the student has attendance records or submissions. Safe archiving (`ARCHIVED` / `INACTIVE`) preserving academic history is missing.
4. **Missing Group History REST Endpoint in Student Domain:** While `GET /api/groups/students/{studentId}/history` exists, `GET /api/students/{id}/group-history` is needed for consistent client consumption.
5. **Frontend UI Gaps in [StudentsList.tsx](file:///home/izzatbek/Desktop/axvhub/frontend/src/components/StudentsList.tsx):**
   - Action column only has "Reset Password" and "Delete".
   - Missing `StudentDetailsModal.tsx` to view complete student profile, HEMIS ID, enrollment details, group, mentor, and group transfer history.
   - Missing `EditStudentModal.tsx` to update student info and transfer groups.
   - Missing status change / safe archive button and confirmation dialog.
   - Missing branch and status filter controls in the toolbar (currently only filters by grade and group).

---

### 2.2 Mentor Management

#### Fully Implemented Functionality:
- **Core Domain Entities:** [Mentor.java](file:///home/izzatbek/Desktop/axvhub/backend/src/main/java/uz/axm/nexus/mentors/domain/Mentor.java) and [MentorProfile.java](file:///home/izzatbek/Desktop/axvhub/backend/src/main/java/uz/axm/nexus/mentors/domain/MentorProfile.java) with skills, experience, education, and publication status.
- **HEMIS Provisioning:** `POST /api/mentors/provision` creates `Mentor` entity, generates HEMIS mentor ID and password, creates `User` with role `ROLE_MENTOR`, and initializes `MentorProfile`.
- **Public & Admin Profiles:** Public showcase endpoints (`GET /api/mentors/public`, `GET /api/mentors/public/{id}`) and admin endpoints (`GET /api/mentors/profiles/admin`, `PATCH /api/mentors/profiles/{profileId}/review`).
- **Frontend Directory:** [MentorDirectory.tsx](file:///home/izzatbek/Desktop/axvhub/frontend/src/components/mentors/MentorDirectory.tsx) with tabs for public showcase vs admin review, credential slip modal, and profile modals.

#### Partially Implemented & Missing Functionality:
1. **Missing Single Mentor Detail Endpoint:** No `GET /api/mentors/{id}` returning complete mentor information along with assigned groups, student count, and teaching workload.
2. **Missing Update Endpoint:** No `PUT /api/mentors/{id}` to update core mentor information (full name, role, phone, email, branch, bio).
3. **Missing Workload & Group Association Visibility:** In `MentorProfileModal.tsx`, assigned groups, assigned active students, and timetable hours are not dynamically computed or displayed.
4. **Hardcoded IDs in Profile Pages:** [ProfilePage.tsx](file:///home/izzatbek/Desktop/axvhub/frontend/src/pages/profile/ProfilePage.tsx#L59) has `mentorProfileApi.getProfileByMentorId(1)`. This hardcoded `1` causes bugs for mentors whose ID is not 1 or for non-mentor accounts.

---

### 2.3 Administrator Management & RBAC

#### Fully Implemented Functionality:
- **RBAC Engine:** [Role.java](file:///home/izzatbek/Desktop/axvhub/backend/src/main/java/uz/axm/nexus/access/domain/Role.java), [Permission.java](file:///home/izzatbek/Desktop/axvhub/backend/src/main/java/uz/axm/nexus/access/domain/Permission.java), and [RoleType.java](file:///home/izzatbek/Desktop/axvhub/backend/src/main/java/uz/axm/nexus/access/domain/RoleType.java) supporting 10 distinct role types.
- **Dynamic Permission Assignment:** `PUT /api/roles/{id}/permissions` allows configuring role permissions dynamically with audit logging.
- **Multi-Role Assignment:** `PUT /api/users/{id}/roles` and `DELETE /api/users/{id}/roles/{roleName}` with escalation prevention.
- **User Suspension/Activation:** `PATCH /api/users/{id}/status` with mandatory audit reason.
- **Super Admin Protection:** [RbacService.java](file:///home/izzatbek/Desktop/axvhub/backend/src/main/java/uz/axm/nexus/access/application/RbacService.java) protects the last active `SUPER_ADMIN` from deletion or status revocation.
- **Frontend Admin Views:** [AdminControlCenter.tsx](file:///home/izzatbek/Desktop/axvhub/frontend/src/features/admin/AdminControlCenter.tsx) and [UsersDirectory.tsx](file:///home/izzatbek/Desktop/axvhub/frontend/src/components/users/UsersDirectory.tsx).

#### Partially Implemented & Missing Functionality:
1. **Administrator Account Creation:** No dedicated `POST /api/users` or `POST /api/admin/users` to provision staff accounts (e.g. `ADMIN`, `PROGRAM_ADMIN`, `REGIONAL_COORDINATOR`, `COORDINATOR`, `OBSERVER`) directly from the admin panel with role selection and credential generation.
2. **Self-Service Password Change:** In [ProfilePage.tsx](file:///home/izzatbek/Desktop/axvhub/frontend/src/pages/profile/ProfilePage.tsx), the user password change form has no backend endpoint `POST /api/v1/auth/change-password` to verify current password and apply a new secure hash.
3. **Self-Service Profile Edit:** No `PUT /api/v1/auth/profile` allowing logged-in users to update their own contact information (phone, bio).

---

### 2.4 Branch-Level Access & Data Ownership

#### Fully Implemented Functionality:
- **Branch Management:** [Branch.java](file:///home/izzatbek/Desktop/axvhub/backend/src/main/java/uz/axm/nexus/branches/domain/Branch.java), `BranchService`, `BranchController`, and [BranchesView.tsx](file:///home/izzatbek/Desktop/axvhub/frontend/src/features/branches/BranchesView.tsx) with CRUD and aggregate KPIs.
- **Ownership Scoping Service:** [ResourceOwnershipService.java](file:///home/izzatbek/Desktop/axvhub/backend/src/main/java/uz/axm/nexus/shared/application/ResourceOwnershipService.java) enforces `verifyStudentAccess`, `verifyGroupAccess`, and `verifyBranchAccess`.

#### Partially Implemented & Missing Functionality:
1. **Branch Filtering on Student & Mentor Listings:** Mentors and regional coordinators should be restricted to their branch's students and mentors, whereas Super Admins and Admins retain cross-branch access.

---

## 3. SECURITY & DATA INTEGRITY AUDIT

| Item | Status | Risk Level | Remediation |
|---|---|---|---|
| IDOR on Student Profile | Partial | Medium | Enforce `resourceOwnershipService.verifyStudentAccess(id)` on `GET /api/students/{id}`. |
| Hard Delete of Students | Present | High | Replace hard delete with `PATCH /api/students/{id}/status` (`ARCHIVED`), disabling user login while preserving academic records. |
| Privilege Escalation to Super Admin | Mitigated | Low | Already protected in `RbacService`, but verify non-super-admins cannot assign `SUPER_ADMIN` in `AdminOperationsService`. |
| Last Super Admin Suspension | Mitigated | Low | `countActiveSuperAdmins()` check prevents removing or suspending the final Super Admin. |
| Hardcoded Mentor ID in Frontend Profile | Present | Medium | Update `ProfilePage.tsx` to dynamically query current user's mentor profile or use `/api/mentors/me`. |
| Missing Change Password Endpoint | Present | Medium | Implement `POST /api/v1/auth/change-password` with old password verification and password policy checks. |

---

## 4. PRIORITIZED IMPLEMENTATION CHECKLIST

### Phase 1: Student Management Enhancement
- [ ] Backend: Add `GET /api/students/{id}` in `StudentController.java` with ownership check.
- [ ] Backend: Add `PUT /api/students/{id}` in `StudentController.java` with validation and audit logging.
- [ ] Backend: Add `PATCH /api/students/{id}/status` in `StudentController.java` (`ACTIVE`, `INACTIVE`, `ARCHIVED`), disabling user credentials upon archival while preserving foreign key records.
- [ ] Backend: Add `GET /api/students/{id}/group-history` in `StudentController.java` delegating to `EducationStructureService`.
- [ ] Frontend: Create `StudentDetailsModal.tsx` showing demographics, HEMIS ID, enrollment date, branch, group, mentor, and group transfer history.
- [ ] Frontend: Create `EditStudentModal.tsx` to update student info and transfer groups.
- [ ] Frontend: Add status transition and safe archiving confirmation in `StudentsList.tsx`.
- [ ] Frontend: Add branch and status filter controls in `StudentsList.tsx` toolbar.

### Phase 2: Mentor Management Enhancement
- [ ] Backend: Add `GET /api/mentors/{id}` returning mentor details, assigned groups, active students count, and workload.
- [ ] Backend: Add `PUT /api/mentors/{id}` to update mentor details (name, role, phone, email, branch, bio) with audit logging.
- [ ] Backend: Add `PATCH /api/mentors/{id}/status` or safe archiving that preserves timetable sessions.
- [ ] Frontend: Update `MentorProfileModal.tsx` to display assigned groups, student rosters, and teaching hours.
- [ ] Frontend: Add branch selection dropdown to mentor create/edit modal.

### Phase 3: Administrator & Staff Management
- [ ] Backend: Add `POST /api/users` in `UserManagementController.java` allowing authorized admins to provision staff accounts (`ADMIN`, `PROGRAM_ADMIN`, `COORDINATOR`, etc.) with temporary passwords and audit logging.
- [ ] Frontend: Add "Yangi xodim qo‘shish" (Create Staff Account) modal in `UsersDirectory.tsx`.

### Phase 4: User Profile & Self-Service Account Management
- [ ] Backend: Add `POST /api/v1/auth/change-password` in `AuthController.java` verifying old password and applying new hash.
- [ ] Backend: Add `PUT /api/v1/auth/profile` in `AuthController.java` allowing users to update their own profile contact details.
- [ ] Frontend: Fix hardcoded `mentorProfileApi.getProfileByMentorId(1)` in `ProfilePage.tsx` to resolve dynamically.
- [ ] Frontend: Wire up password change and profile update forms in `ProfilePage.tsx` to real APIs with toast feedback.

### Phase 5: RBAC & Branch-Level Authorization Enforcement
- [ ] Backend: Audit `@PreAuthorize` expressions across all student, mentor, group, user, and branch endpoints.
- [ ] Backend: Enforce branch ownership in student and mentor queries for non-super admins.

### Phase 6: Frontend Experience & Localization
- [ ] Ensure full UZ / RU / EN localization coverage in `uz.ts`, `ru.ts`, `en.ts` for all new modals, buttons, and status labels.
- [ ] Ensure loading, error, and empty states across all Module 01 components.

### Phase 7: Verification & Testing
- [ ] Backend: Integration tests covering student CRUD, single fetch, update, archive lifecycle, group history, password change, staff creation, and branch scoping.
- [ ] Frontend: Vitest tests covering student details modal, edit student modal, status toggles, user management, and profile page.
- [ ] Verification: `./gradlew test`, `npm test -- --run`, `npm run build`.

### Phase 8: Module Acceptance Gate & Final Reports
- [ ] Generate `docs/modules/MODULE_01_STUDENT_MANAGEMENT.md`
- [ ] Generate `docs/modules/MODULE_01_MENTOR_MANAGEMENT.md`
- [ ] Generate `docs/modules/MODULE_01_ADMIN_AND_RBAC.md`
- [ ] Generate `MODULE_01_COMPLETION_REPORT.md`
