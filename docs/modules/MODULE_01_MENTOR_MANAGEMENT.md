# AXV Nexus — Module 01: Mentor Management Specification

## 1. Overview & Objectives

Mentor Management in Module 01 provides administrative and mentor-facing tools to oversee teaching staff, calculate weekly teaching workloads, maintain showcase mentor profiles for students, and safely manage mentor account lifecycles.

---

## 2. Domain Model & Architecture

### Backend Entities
- **`Mentor` (`uz.axm.nexus.mentors.domain.Mentor`)**:
  - `id` (BIGINT, Primary Key)
  - `fullName` (VARCHAR(255), Not Null)
  - `email` (VARCHAR(255), Unique)
  - `phone` (VARCHAR(30))
  - `specialization` (VARCHAR(150), e.g., `Full-Stack Web Development`, `Python Data Science`)
  - `role` (VARCHAR(50), e.g., `LEAD_MENTOR`, `SENIOR_MENTOR`, `MENTOR`)
  - `branchLocation` (VARCHAR(150), e.g., `IT Park Yangiariq`)
  - `rating` (DOUBLE, Default: `5.0`)
  - `status` (VARCHAR(20), Default: `ACTIVE`, Added in Liquibase `018-module01-people-enhancements.sql`)
  - `user` (`@OneToOne` with `User`, provides authentication credentials)
  - `studyGroups` (`@OneToMany` with `StudyGroup`)
- **`MentorProfile` (`uz.axm.nexus.mentors.domain.MentorProfile`)**:
  - Public showcase profile: `bio`, `teachingLanguages`, `skills`, `achievements`, `hourlyRate`, `socialLinks`, `showcaseEnabled`.

---

## 3. Key Capabilities & Business Logic

### A. Dynamic Mentor Self-Service Lookup
- Previously, profile retrieval used a hardcoded ID (`1`).
- Resolved with endpoint `GET /api/mentors/me/profile` (`MentorProfileController`):
  - Resolves authenticated principal (`@AuthenticationPrincipal UserDetails`).
  - Matches linked `Mentor` record by `user.id`.
  - Returns the mentor's own profile without ID spoofing or hardcoded values.

### B. Rich Workload & Activity Calculations
- Endpoint `GET /api/mentors/{id}` returns `MentorDetailDto`:
  - `assignedGroupsCount`: Count of active study groups taught.
  - `totalStudentsCount`: Sum of enrolled students across all assigned groups.
  - `weeklyWorkloadHours`: Automatically computed from active recurring schedules (`schedules` table) for this mentor by summing duration between start time and end time across scheduled days.

### C. Safe Mentor Archival
- Deleting mentors directly breaks timetable schedules, historical attendance sheets, and lesson records.
- Endpoint `POST /api/mentors/{id}/archive`:
  - Sets mentor `status = "ARCHIVED"`.
  - Disables linked user account (`user.setEnabled(false)`).
  - Unlinks active group assignments safely or logs re-assignment requirements.
  - Emits audit log entry (`MENTOR_ARCHIVED`).

---

## 4. API Endpoints Reference

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/mentors` | Authenticated | List/search mentors with pagination and branch filters |
| `GET` | `/api/mentors/{id}` | Authenticated | Retrieve rich mentor profile with workload and assigned cohorts |
| `PUT` | `/api/mentors/{id}` | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | Update mentor demographics, specialization, role, and branch |
| `PATCH` | `/api/mentors/{id}/status` | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | Transition mentor status (`ACTIVE`, `INACTIVE`, `ARCHIVED`) |
| `POST` | `/api/mentors/{id}/archive` | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | Safe-archive mentor account and disable credentials |
| `GET` | `/api/mentors/me/profile` | `ROLE_MENTOR` | Get current authenticated mentor's public showcase profile |
| `PUT` | `/api/mentors/profile` | `ROLE_MENTOR` | Update authenticated mentor's public showcase profile |

---

## 5. Frontend Integration

- **`MentorDirectory.tsx` (`frontend/src/components/mentors/MentorDirectory.tsx`)**:
  - Grid and table views displaying mentor cards with rating badges, active cohorts, and workload hours.
  - Filtering by branch location and mentor specialty.
- **`ProfilePage.tsx` (`frontend/src/pages/profile/ProfilePage.tsx`)**:
  - Mentor tab populated via `mentorProfileApi.getMyProfile()`.
  - Allows editing bio, skills, and showcase information with instant preview.
