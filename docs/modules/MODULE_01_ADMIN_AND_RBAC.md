# AXV Nexus — Module 01: Administrator Management & RBAC Specification

## 1. Overview & Objectives

This specification outlines the administrative management, Role-Based Access Control (RBAC), privilege escalation prevention, self-service profile management, and branch-level data scoping for the AXV Nexus educational platform.

---

## 2. RBAC Model & Role Hierarchy

AXV Nexus enforces a fine-grained, 9-role hierarchy managed via Spring Security authorities and `@PreAuthorize`:

| Role Name | Authority String | Primary Responsibility |
|---|---|---|
| **SUPER_ADMIN** | `ROLE_SUPER_ADMIN` | Full root access across all branches, security roles, and system parameters |
| **ADMIN** | `ROLE_ADMIN` | Academic and institutional operations, student/mentor provisioning, reports |
| **PROGRAM_ADMIN**| `ROLE_PROGRAM_ADMIN` | Curriculum planning, educational tracks, exam standards |
| **REGIONAL_COORDINATOR** | `ROLE_REGIONAL_COORDINATOR` | Oversight of multiple district branches in a region |
| **COORDINATOR** | `ROLE_COORDINATOR` | Single branch daily operational management and timetable scheduling |
| **OBSERVER** | `ROLE_OBSERVER` | Read-only inspection of classes, analytics, and student records |
| **CONTENT_MANAGER** | `ROLE_CONTENT_MANAGER` | Syllabus authoring, lesson material preparation, resource library |
| **MENTOR** | `ROLE_MENTOR` | Teaching, attendance marking, student grading, lesson sessions |
| **STUDENT** | `ROLE_STUDENT` | Accessing student portal, viewing schedules, submitting assessments, XP tracking |

---

## 3. Privilege Escalation Prevention & Security Rules

1. **Super Admin Protection**:
   - Only a user with `ROLE_SUPER_ADMIN` can assign the `SUPER_ADMIN` or `ADMIN` role to another user.
   - Non-super-admins attempting to create or elevate an account with `ADMIN` or `SUPER_ADMIN` roles are blocked in `UserManagementService.createUser` and `assignRoles` with `AccessDeniedException` or business security exception.
2. **Immutable System Accounts**:
   - The primary `superadmin` account cannot be deactivated or deleted via standard APIs.
3. **Password Security**:
   - Passwords must be at least 8 characters and include uppercase, lowercase, numbers, and symbols.
   - Self-service password updates (`POST /api/v1/auth/change-password`) require verification of the `currentPassword` hash using Spring Security's `PasswordEncoder.matches()`.

---

## 4. Administrator & Staff Provisioning Flow

### Endpoint: `POST /api/users`
- Request: `CreateUserRequest` (`fullName`, optional `username`, optional `email`, optional `phone`, optional `password`, `primaryRole`, optional `additionalRoles`).
- Auto-Generation:
  - If `username` is omitted, an algorithmic username is generated (e.g. `d.rahimov`).
  - If `password` is omitted, a secure 12-character alphanumeric temporary password is generated.
- Audit Log:
  - Writes an event to `audit_logs` capturing creator ID, new user ID, assigned roles, and client IP.
- Response: `UserProvisionDto` containing `temporaryPassword`, login instructions, and expiration timestamp.

---

## 5. Self-Service Account & Profile Management

### 1. Update Profile (`PUT /api/v1/auth/profile`)
- Authenticated user can update `fullName`, `phone`, `email`.
- `AuthService.updateProfile` synchronizes changes across:
  - `User` entity.
  - Linked `Student` entity (if user is student).
  - Linked `Mentor` entity (if user is mentor).
- Returns updated `UserProfileDto`.

### 2. Change Password (`POST /api/v1/auth/change-password`)
- Request: `ChangePasswordRequest` (`currentPassword`, `newPassword`, `confirmPassword`).
- Enforces:
  - `currentPassword` matches stored BCrypt hash.
  - `newPassword` equals `confirmPassword`.
  - `newPassword` meets complexity rules and is distinct from old password.
- Writes audit trail for security compliance.

---

## 6. Branch-Level Access & Data Scoping

- In multi-branch setups, users with branch-specific roles (`COORDINATOR`, `MENTOR`) are scoped to their assigned branch.
- The `BranchFilterAspect` / `ResourceOwnershipService` ensures that non-admin coordinators cannot view or mutate students, mentors, or schedules of other branches.
- `ROLE_SUPER_ADMIN` and `ROLE_ADMIN` retain global cross-branch visibility.

---

## 7. API Endpoints Reference

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/users` | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | List and search user accounts with pagination |
| `POST` | `/api/users` | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | Provision new administrator, coordinator, or staff member |
| `PATCH` | `/api/users/{id}/status` | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | Enable or disable user login credentials |
| `POST` | `/api/users/{id}/roles` | `ROLE_SUPER_ADMIN` | Assign or remove roles (escalation protected) |
| `PUT` | `/api/v1/auth/profile` | Authenticated | Update self profile (name, phone, avatar) |
| `POST` | `/api/v1/auth/change-password` | Authenticated | Change password with current password verification |

---

## 8. Frontend Integration

- **`UsersDirectory.tsx` (`frontend/src/components/users/UsersDirectory.tsx`)**:
  - Administrative user table displaying avatars, primary roles, active status badges, and permissions.
  - "Yangi xodim qo‘shish" button triggers `CreateUserModal`.
- **`CreateUserModal.tsx` (`frontend/src/components/users/CreateUserModal.tsx`)**:
  - Provisioning modal with role selector, auto-generated username and password option.
  - Post-creation credentials slip with copy-to-clipboard functionality.
- **`ProfilePage.tsx` (`frontend/src/pages/profile/ProfilePage.tsx`)**:
  - Connected directly to `authApi.updateProfile` and `authApi.changePassword`.
  - Replaces all mock timeouts with real backend mutation calls and feedback toasts.
