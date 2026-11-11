# AXM Nexus — Security & RBAC Authorization Matrix

**Platform:** AXM Nexus (Muhammad al-Xorazmiy Vorislari Digital Education Platform)  
**Security Architecture:** Stateless JWT Authentication + Spring Method-Level Security (`@PreAuthorize`) + Domain Ownership Verification  
**Branch Context:** IT Park Yangiariq (Scalable to Multi-Branch)  
**Document Status:** Production Baseline (Post-Milestone 02 Hardening)

---

## 1. Role Hierarchy & Authority Taxonomy

The platform enforces a unified RBAC taxonomy seeded via database migrations:

| System Role Identifier | Display Title & Responsibility Scope | Inherited / Default Authorities |
|:---|:---|:---|
| `SUPER_ADMIN` | Tizimning to'liq cheklovlarsiz boshqaruvchisi | All permissions (`users.*`, `roles.*`, `audit.*`, `system.*`, etc.) |
| `ADMIN` | Tizim ma'muri (Legacy / Operational Admin) | Full operational authorities across users, mentors, groups, scheduling, and reports |
| `PROGRAM_ADMIN` | Ta'lim dasturi va jarayonlari koordinatori | `users.read`, `users.create`, `users.update`, `roles.read`, `lessons.*`, `attendance.*`, `assessments.*`, `reports.*`, `analytics.read`, `curriculum.*`, `materials.*`, `groups.*`, `mentors.*` |
| `REGIONAL_COORDINATOR` | Hududiy filial va ta'lim markazlari koordinatori | `users.read`, `groups.*`, `reports.*`, `analytics.read`, `lessons.read`, `lessons.create`, `lessons.update`, `attendance.read` |
| `COORDINATOR` | Filial koordinatori (Legacy moslik) | Branch-level view and group management |
| `MENTOR` | IT va asosiy fan mentori | `lessons.*`, `attendance.*`, `assessments.*`, `materials.*`, `curriculum.read`, `reports.read` |
| `ENGLISH_MENTOR` | Ingliz tili fani mentori | `lessons.*`, `attendance.*`, `assessments.*`, `materials.*`, `curriculum.read`, `reports.read` |
| `STUDENT` | Ta'lim oluvchi 8-11 sinf o'quvchisi | `lessons.read`, `materials.read`, `curriculum.read`, `assessments.read`, `reports.read` (Scoped to own records) |
| `CONTENT_MANAGER` | O'quv rejalari va materiallar muharriri | `materials.*`, `curriculum.*`, `lessons.*` |
| `OBSERVER` | Kuzatuvchi, vazirlik yoki tahlilchi | `reports.read`, `analytics.read`, `users.read`, `roles.read`, `lessons.read`, `curriculum.read`, `materials.read` |

---

## 2. Exhaustive API Authorization Matrix

### 2.1 Identity & Authentication (`/api/v1/auth`, `/api/auth`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/auth/captcha`, `/api/v1/auth/captcha` | `GET` | **Public** | None (Anonymous allowed) | Protected against bots; returns SVG + hashed ID |
| `/api/auth/register`, `/api/v1/auth/register` | `POST` | **Public** | None (Anonymous allowed) | User registration with initial disabled/unverified state |
| `/api/auth/login`, `/api/v1/auth/login` | `POST` | **Public** | None (Anonymous allowed) | Issues cryptographically signed Access & Refresh JWTs |
| `/api/auth/verify-email`, `/api/v1/auth/verify-email` | `GET`/`POST` | **Public** | None (Anonymous allowed) | Validates one-time email verification token |
| `/api/auth/resend-verification` | `POST` | **Public** | None (Anonymous allowed) | Rate-limited by IP and destination email |
| `/api/auth/refresh-token` | `POST` | **Public** | None (Anonymous allowed) | Validates refresh token signature and expiry |
| `/api/auth/forgot-password` | `POST` | **Public** | None (Anonymous allowed) | Generates reset password token |
| `/api/auth/reset-password` | `POST` | **Public** | None (Anonymous allowed) | Verifies token and resets password hash |
| `/api/v1/auth/me`, `/api/auth/me` | `GET` | **Protected** | `isAuthenticated()` | Returns profile of currently authenticated token holder |

---

### 2.2 User Management & RBAC Administration (`/api/users`, `/api/rbac`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/users` | `GET` | **Protected** | `hasAuthority('users.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `REGIONAL_COORDINATOR`, `COORDINATOR`, `OBSERVER` | Paginated listing; passwords and sensitive security tokens masked |
| `/api/users/{id}` | `GET` | **Protected** | `hasAuthority('users.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `REGIONAL_COORDINATOR`, `COORDINATOR`, `OBSERVER` | Single user details with full roles and permissions catalog |
| `/api/users/{id}/roles` | `PUT` | **Protected** | `hasAuthority('roles.assign')` or `SUPER_ADMIN`, `ADMIN` | Cannot revoke the last active `SUPER_ADMIN` role |
| `/api/users/{id}/roles/{roleName}` | `DELETE` | **Protected** | `hasAuthority('roles.assign')` or `SUPER_ADMIN`, `ADMIN` | Guarded against accidental system lockout |
| `/api/users/{id}/status` | `PATCH` | **Protected** | `hasAuthority('users.disable')` or `SUPER_ADMIN`, `ADMIN` | Audit log record generated with caller username |
| `/api/rbac/roles` | `GET` | **Protected** | `hasAuthority('roles.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `OBSERVER` | Full roles catalog |
| `/api/rbac/permissions` | `GET` | **Protected** | `hasAuthority('roles.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `OBSERVER` | Full system permissions catalog |
| `/api/rbac/{id}/permissions` | `PUT` | **Protected** | `hasAuthority('roles.manage')` or `SUPER_ADMIN`, `ADMIN` | Immutable system roles cannot lose core permissions |

---

### 2.3 Student Management (`/api/students`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/students` | `GET` | **Protected** | `hasAuthority('users.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `REGIONAL_COORDINATOR`, `COORDINATOR`, `MENTOR`, `OBSERVER` | Filterable by grade, mentor, or study group |
| `/api/students` | `POST` | **Protected** | `hasAuthority('users.create')` or `users.update` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Creates/updates student and auto-provisions `users` auth record |
| `/api/students/provision` | `POST` | **Protected** | `hasAuthority('users.create')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Generates official HEMIS ID (`426xxxx`) + temporary password |
| `/api/students/{id}/reset-password` | `POST` | **Protected** | `hasAuthority('users.update')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Resets student credentials and issues audited temporary secret |
| `/api/students/{id}` | `DELETE` | **Protected** | `hasAuthority('users.disable')` or `SUPER_ADMIN`, `ADMIN` | Administrative soft deletion / archiving |

---

### 2.4 Mentors & Showcasing Profiles (`/api/mentors`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/mentors/public` | `GET` | **Public** | None (Anonymous allowed) | Approved profiles only; private phone/email masked |
| `/api/mentors/public/{id}` | `GET` | **Public** | None (Anonymous allowed) | Approved profile bio, skills, and portfolio only |
| `/api/mentors` | `GET` | **Protected** | `hasAuthority('mentors.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `REGIONAL_COORDINATOR`, `COORDINATOR`, `MENTOR`, `OBSERVER` | Internal mentor directory |
| `/api/mentors` | `POST` | **Protected** | `hasAuthority('mentors.manage')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN` | Registers mentor entity |
| `/api/mentors/provision` | `POST` | **Protected** | `hasAuthority('mentors.manage')` or `SUPER_ADMIN`, `ADMIN` | Generates official HEMIS ID (`326xxxx`) + temporary password |
| `/api/mentors/{id}/reset-password` | `POST` | **Protected** | `hasAuthority('mentors.manage')` or `SUPER_ADMIN`, `ADMIN` | Admin password reset |
| `/api/mentors/{mentorId}/profile` | `GET` | **Protected** | `hasAuthority('mentors.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Full mentor profile with private contact info |
| `/api/mentors/{mentorId}/profile` | `PUT` | **Protected** | `hasAuthority('mentors.manage')` or `SUPER_ADMIN`, `ADMIN`, `MENTOR` | **Ownership Check:** Mentor can only update own profile; admins can update all |
| `/api/mentors/profiles/admin` | `GET` | **Protected** | `hasAuthority('mentors.manage')` or `SUPER_ADMIN`, `ADMIN` | Lists pending, draft, and rejected profiles for moderation |
| `/api/mentors/profiles/{profileId}/review` | `PATCH` | **Protected** | `hasAuthority('mentors.manage')` or `SUPER_ADMIN`, `ADMIN` | Approves or rejects profile with audit justification |

---

### 2.5 Classrooms & Study Groups (`/api/groups`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/groups` | `GET` | **Protected** | `hasAuthority('groups.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `REGIONAL_COORDINATOR`, `COORDINATOR`, `MENTOR`, `STUDENT`, `OBSERVER` | Filterable by gradeLevel, mentorId, status |
| `/api/groups/{id}` | `GET` | **Protected** | `hasAuthority('groups.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `REGIONAL_COORDINATOR`, `COORDINATOR`, `MENTOR`, `STUDENT` | Group details and roster |
| `/api/groups` | `POST` | **Protected** | `hasAuthority('groups.manage')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN` | Creates study group with capacity check |
| `/api/groups/{id}/students` | `POST` | **Protected** | `hasAuthority('groups.manage')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Enrolls student with duplicate prevention; actor from JWT |
| `/api/groups/{id}/students/{studentId}/transfer` | `POST` | **Protected** | `hasAuthority('groups.manage')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN` | Transfers student and preserves membership history; actor from JWT |
| `/api/groups/{id}/history` | `GET` | **Protected** | `hasAuthority('groups.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `OBSERVER` | Group transfer and enrollment audit history |
| `/api/groups/students/{studentId}/history` | `GET` | **Protected** | `hasAuthority('groups.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR`, `STUDENT` | **Ownership Check:** Student can only view their own transfer history |
| `/api/groups/{id}/status` | `PATCH` | **Protected** | `hasAuthority('groups.manage')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN` | Updates group status; actor from JWT |

---

### 2.6 Scheduling & Attendance Control (`/api/lessons`, `/api/schedules`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/lessons` | `GET` | **Protected** | `hasAuthority('lessons.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `REGIONAL_COORDINATOR`, `COORDINATOR`, `MENTOR`, `STUDENT`, `OBSERVER` | Calendar lesson sessions |
| `/api/lessons/today` | `GET` | **Protected** | `hasAuthority('lessons.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `REGIONAL_COORDINATOR`, `COORDINATOR`, `MENTOR`, `STUDENT`, `OBSERVER` | Dashboard widget sessions |
| `/api/lessons/{id}` | `GET` | **Protected** | `hasAuthority('lessons.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `REGIONAL_COORDINATOR`, `COORDINATOR`, `MENTOR`, `STUDENT`, `OBSERVER` | Session details & attendance sheet |
| `/api/lessons` | `POST` | **Protected** | `hasAuthority('lessons.create')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Conflict-preventing session schedule; actor from JWT |
| `/api/lessons/{id}/reschedule` | `POST` | **Protected** | `hasAuthority('lessons.update')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Reschedules session and verifies conflicts; actor from JWT |
| `/api/lessons/{id}/cancel` | `POST` | **Protected** | `hasAuthority('lessons.delete')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN` | Cancels session with mandatory reason; actor from JWT |
| `/api/lessons/{id}/attendance` | `POST` | **Protected** | `hasAuthority('attendance.record')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Records attendance records; actor from JWT |
| `/api/schedules` | `GET` | **Protected** | `hasAuthority('lessons.read')` or `isAuthenticated()` | Weekly master timetable |
| `/api/schedules/manual` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')` | Manual timetable creation |
| `/api/schedules/{id}` | `DELETE` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')` | Deletes master timetable slot |

---

### 2.7 Lesson Planning & Outcomes Quality (`/api/lesson-plans`, `/api/v1/lessons`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/lesson-plans` | `GET` | **Protected** | `hasAuthority('lessons.read')` or `isAuthenticated()` | Lesson plans directory |
| `/api/lesson-plans/templates` | `GET` | **Protected** | `hasAuthority('lessons.read')` or `isAuthenticated()` | Lesson plan templates |
| `/api/lesson-plans/{id}` | `GET` | **Protected** | `hasAuthority('lessons.read')` or `isAuthenticated()` | Plan details |
| `/api/lesson-plans` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Creates draft lesson |
| `/api/lesson-plans/{id}` | `PUT` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Edits lesson and increments revision |
| `/api/lesson-plans/{id}/status` | `PATCH` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Transitions lesson state |
| `/api/lesson-plans/{id}/presentation` | `PATCH` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Updates lecture presentation markdown slides |
| `/api/lesson-plans/{id}/clone` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Duplicates lesson |
| `/api/lesson-plans/{id}/revisions` | `GET` | **Protected** | `hasAuthority('lessons.read')` or `isAuthenticated()` | Revision history |
| `/api/lesson-plans/{id}/progress` | `GET` | **Protected** | `isAuthenticated()` | Student lesson completion progress |
| `/api/lesson-plans/{id}/progress` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Records practical task score |
| `/api/lesson-plans/{id}` | `DELETE` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN')` | Deletes draft or cancelled lesson |
| `/api/v1/lessons/{id}/quality-plan` | `GET` | **Protected** | `isAuthenticated()` | Lesson quality criteria |
| `/api/v1/lessons/{id}/quality-plan` | `PUT` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Sets quality outcomes |
| `/api/v1/lessons/{id}/delivery` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Records pedagogical reflection |
| `/api/v1/lessons/{id}/evaluations` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Records student learning outcome evaluations |

---

### 2.8 Assessments, Quizzes & Testing (`/api/assessments`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/assessments` | `GET` | **Protected** | `hasAuthority('assessments.read')` or `isAuthenticated()` | Assessments catalog |
| `/api/assessments/{id}` | `GET` | **Protected** | `hasAuthority('assessments.read')` or `isAuthenticated()` | Assessment metadata |
| `/api/assessments/{id}/questions` | `GET` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')` | Questions **with answer keys** (never exposed to students) |
| `/api/assessments/{id}/take` | `GET` | **Protected** | `isAuthenticated()` | Questions **without answer keys** |
| `/api/assessments` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')` | Creates quiz |
| `/api/assessments/{id}` | `PUT` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')` | Updates quiz |
| `/api/assessments/{id}/start` | `POST` | **Protected** | `isAuthenticated()` | **Ownership Check:** Student can only start attempt for themselves |
| `/api/assessments/attempts/{attemptId}/submit` | `POST` | **Protected** | `isAuthenticated()` | Submits answers and auto-grades |
| `/api/assessments/attempts/{attemptId}/grade` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')` | Manual mentor grading |
| `/api/assessments/attempts/{attemptId}` | `GET` | **Protected** | `isAuthenticated()` | Score and feedback |
| `/api/assessments/students/{studentId}/attempts` | `GET` | **Protected** | `isAuthenticated()` | **Ownership Check:** Student can only view own attempt history |

---

### 2.9 Grading & Gamification (`/api/grading`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/grading/grades` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Records academic grade |
| `/api/grading/grades/student/{studentId}` | `GET` | **Protected** | `isAuthenticated()` | **Ownership Check:** Student can only view own academic grades |
| `/api/grading/points` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Awards XP points with idempotency key |
| `/api/grading/points/adjust` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN')` | Corrects XP points; strictly audited |
| `/api/grading/points/student/{studentId}` | `GET` | **Protected** | `isAuthenticated()` | **Ownership Check:** Student can only view own XP transactions |
| `/api/grading/leaderboard` | `GET` | **Protected** | `isAuthenticated()` | Student leaderboard (all time / weekly) |
| `/api/grading/leaderboard/groups` | `GET` | **Protected** | `isAuthenticated()` | Group leaderboard |
| `/api/grading/profile/{studentId}` | `GET` | **Protected** | `isAuthenticated()` | Gamification profile (rank, badges, XP) |
| `/api/grading/streak/check-in` | `POST` | **Protected** | `isAuthenticated()` | **Ownership Check:** Student can only check in for themselves |
| `/api/grading/streak/student/{studentId}` | `GET` | **Protected** | `isAuthenticated()` | **Ownership Check:** Student can only view own streak record |
| `/api/grading/metrics` | `GET` | **Protected** | `hasAuthority('analytics.read')` or `hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR', 'OBSERVER')` | Overall gamification analytics |

---

### 2.10 Assignments & Practical Homework (`/api/assignments`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/assignments` | `GET` | **Protected** | `isAuthenticated()` | Assignments listing |
| `/api/assignments/{id}` | `GET` | **Protected** | `isAuthenticated()` | Assignment details |
| `/api/assignments` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Creates homework |
| `/api/assignments/{id}/submit` | `POST` | **Protected** | `isAuthenticated()` | **Ownership Check:** Student can only submit homework for themselves |
| `/api/assignments/submissions/{submissionId}/grade` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Mentors grades submission |
| `/api/assignments/{id}/submissions` | `GET` | **Protected** | `hasAuthority('assessments.grade')` or `hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')` | Group submissions roster (students cannot view peers' submissions) |
| `/api/assignments/students/{studentId}/submissions` | `GET` | **Protected** | `isAuthenticated()` | **Ownership Check:** Student can only view own homework submissions |

---

### 2.11 Learning Resources & Media Library (`/api/resources`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/resources` | `GET` | **Protected** | `hasAuthority('materials.read')` or `isAuthenticated()` | Searches and filters resources |
| `/api/resources/{id}` | `GET` | **Protected** | `hasAuthority('materials.read')` or `isAuthenticated()` | Resource metadata |
| `/api/resources/by-lesson/{lessonId}` | `GET` | **Protected** | `hasAuthority('materials.read')` or `isAuthenticated()` | Resources attached to lesson |
| `/api/resources/upload` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Uploads PDF, slides, source code |
| `/api/resources/link` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | External links and video embeds |
| `/api/resources/{id}/download` | `GET` | **Protected** | `hasAuthority('materials.read')` or `isAuthenticated()` | Download stream |
| `/api/resources/{id}/preview` | `GET` | **Protected** | `hasAuthority('materials.read')` or `isAuthenticated()` | In-browser preview stream |
| `/api/resources/{id}` | `DELETE` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')` | Deletes resource |

---

### 2.12 Educational Curriculum & Tracks (`/api/curriculum`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/curriculum/tracks` | `GET` | **Protected** | `hasAuthority('curriculum.read')` or `isAuthenticated()` | 8-11 grade tracks and learning roadmaps |

---

### 2.13 Platform Analytics & KPIs (`/api/analytics`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/analytics/overview` | `GET` | **Protected** | `hasAuthority('analytics.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `REGIONAL_COORDINATOR`, `COORDINATOR`, `OBSERVER` | System-wide attendance, lab occupancy, performance KPI |
| `/api/analytics/student/{studentId}` | `GET` | **Protected** | `isAuthenticated()` | **Ownership Check:** Students can only view their own analytics; mentors view assigned students; admins view all |
| `/api/analytics/group/{groupId}` | `GET` | **Protected** | `hasAuthority('analytics.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | **Ownership Check:** Mentors can only view assigned groups; students denied |
| `/api/analytics/assessment/{assessmentId}` | `GET` | **Protected** | `hasAuthority('analytics.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Assessment statistical distribution |
| `/api/analytics/mentor/{mentorId}` | `GET` | **Protected** | `hasAuthority('analytics.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR`, `OBSERVER` | Mentor teaching activity and workload |
| `/api/analytics/subjects` | `GET` | **Protected** | `hasAuthority('analytics.read')` or `isAuthenticated()` | Subject-level performance |
| `/api/analytics/academic-period/{periodId}` | `GET` | **Protected** | `hasAuthority('analytics.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `OBSERVER` | Semester aggregate summary |
| `/api/analytics/rules` | `GET` | **Protected** | `isAuthenticated()` | Documentation of statistical KPI formulas |

---

### 2.14 Official PDF Reports & Exports (`/api/reports`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/reports/student/{studentId}/pdf` | `GET` | **Protected** | `isAuthenticated()` | **Ownership Check:** Student can download own report; mentor assigned; admins all |
| `/api/reports/group/{groupId}/pdf` | `GET` | **Protected** | `hasAuthority('reports.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Group academic report PDF |
| `/api/reports/assessment/{assessmentId}/pdf` | `GET` | **Protected** | `hasAuthority('reports.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Test results report PDF |
| `/api/reports/attendance/{groupId}/pdf` | `GET` | **Protected** | `hasAuthority('reports.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Group attendance register PDF |
| `/api/reports/lesson-completion/{groupId}/pdf` | `GET` | **Protected** | `hasAuthority('reports.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Syllabus coverage report PDF |
| `/api/reports/mentor/{mentorId}/pdf` | `GET` | **Protected** | `hasAuthority('reports.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR`, `OBSERVER` | Mentor activity report PDF |
| `/api/reports/subjects/pdf` | `GET` | **Protected** | `hasAuthority('reports.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `OBSERVER` | Subject efficacy report PDF |
| `/api/reports/academic-period/{periodId}/pdf` | `GET` | **Protected** | `hasAuthority('reports.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `OBSERVER` | Semester report PDF |

---

### 2.15 Admin Operations, Audit & System Configuration (`/api/admin`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/admin/overview` | `GET` | **Protected** | `hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')` | High-level administrative operations overview |
| `/api/admin/users` | `GET` | **Protected** | `hasAuthority('users.read')` or `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN` | Paginated admin user listing |
| `/api/admin/users/{id}/status` | `PUT` | **Protected** | `hasAuthority('users.disable')` or `SUPER_ADMIN`, `ADMIN` | Suspends/activates user; caller username logged to audit |
| `/api/admin/users/{id}/roles` | `PUT` | **Protected** | `hasAuthority('roles.assign')` or `SUPER_ADMIN`, `ADMIN` | Modifies roles; caller username logged to audit |
| `/api/admin/audit-logs` | `GET` | **Protected** | `hasAuthority('audit.read')` or `SUPER_ADMIN`, `ADMIN` | Searchable system audit log |
| `/api/admin/audit-logs/export` | `GET` | **Protected** | `hasAuthority('audit.read')` or `SUPER_ADMIN`, `ADMIN` | Exports audit logs as CSV/JSON; action itself is audited |
| `/api/admin/system-config` | `GET` | **Protected** | `hasAuthority('system.configure')` or `SUPER_ADMIN`, `ADMIN` | System parameter listing (secrets masked) |
| `/api/admin/system-config` | `PUT` | **Protected** | `hasAuthority('system.configure')` or `SUPER_ADMIN`, `ADMIN` | Updates system config; caller username logged to audit |
| `/api/admin/health-overview` | `GET` | **Protected** | `hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'OBSERVER')` | Infrastructure, DB pool, and disk health metrics |
| `/api/admin/content-moderation` | `POST` | **Protected** | `hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'CONTENT_MANAGER')` | Moderates lesson content and resources |
| `/api/admin/grade-override` | `POST` | **Protected** | `hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')` | Formal grade override with mandatory justification |

---

### 2.16 Notifications & Preferences (`/api/v1/notifications`, `/api/v1/user-preferences`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/v1/notifications` | `GET` | **Protected** | `isAuthenticated()` | Scoped strictly to authenticated user's ID via `CurrentUserHelper` |
| `/api/v1/notifications/unread-count` | `GET` | **Protected** | `isAuthenticated()` | Scoped strictly to authenticated user's ID |
| `/api/v1/notifications/{id}/read` | `PATCH` | **Protected** | `isAuthenticated()` | User can only mark own notifications as read |
| `/api/v1/notifications/read-all` | `PATCH` | **Protected** | `isAuthenticated()` | Marks all own notifications as read |
| `/api/v1/user-preferences` | `GET` | **Protected** | `isAuthenticated()` | Scoped strictly to authenticated user's ID |
| `/api/v1/user-preferences` | `PUT` | **Protected** | `isAuthenticated()` | User can only update own preferences (theme, language) |

---

### 2.17 AI Assistant & Parser (`/api/ai`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/ai/assistant/generate` | `POST` | **Protected** | `isAuthenticated()` | Caller identity and role resolved from JWT; prompt guardrails applied |
| `/api/ai/assistant/convert-to-lesson` | `POST` | **Protected** | `hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Converts AI response to draft lesson |
| `/api/ai/assistant/convert-to-assessment` | `POST` | **Protected** | `hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')` | Converts AI response to draft assessment |
| `/api/ai/assistant/prompts` | `GET` | **Protected** | `isAuthenticated()` | Suggested educational prompts |
| `/api/ai/assistant/providers` | `GET` | **Protected** | `hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')` | AI provider configuration status |
| `/api/ai/parse-timetable` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')` | AI timetable parser |
| `/api/ai/confirm-import` | `POST` | **Protected** | `hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')` | Persists AI parsed timetable |

---

### 2.18 System Health & Actuator (`/api/v1/health`, `/actuator`)

| Endpoint Path | HTTP Method | Public / Auth | Required Authority / Roles | Ownership & Scope Rules |
|:---|:---:|:---:|:---|:---|
| `/api/v1/health`, `/api/health` | `GET` | **Public** | None (Anonymous allowed) | Public application uptime status and architecture metadata |
| `/actuator/health` | `GET` | **Public** | None (Anonymous allowed) | Liveness and readiness probes |
| `/actuator/info` | `GET` | **Public** | None (Anonymous allowed) | Application build info |
| `/actuator/**` (env, beans, etc.) | `*` | **Protected** | `hasRole('SUPER_ADMIN')` | Sensitive environment properties blocked from public access |
| `/swagger-ui/**`, `/v3/api-docs/**` | `GET` | **Public** | None (In non-production) | OpenAPI documentation |
