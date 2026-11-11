# AXM Nexus — Catalog of Existing Working Features
**Muhammad al-Xorazmiy Vorislari Digital Education Management Platform**

This document details all modules, capabilities, database schemas, APIs, and UI components currently implemented and working in the AXM Nexus repository.

---

## 1. Authentication, Identity & Multi-Role RBAC

### 1.1 Backend Implementation
- **Stateless JWT Security Filter:** `JwtAuthenticationFilter.java` and `JwtService.java` generate and validate RFC-compliant HMAC-SHA256 JWT access tokens (24h lifespan) and refresh tokens (7 days).
- **Authentication Controller (`AuthController.java` at `/api/v1/auth` & `/api/auth`):**
  - `POST /login`: Username/email + password authentication, returns `AuthResponse` with user metadata, roles, permissions, and tokens.
  - `POST /register`: Registers new users (with password strength validation and duplicate username/email checks).
  - `POST /refresh-token`: Rotates access tokens without requiring re-login.
  - `POST /verify-email` & `POST /resend-verification`: Token-based email verification via Thymeleaf HTML email templates.
  - `POST /forgot-password` & `POST /reset-password`: Tokenized self-service password reset.
- **HEMIS Account Provisioning & Id Generation:** `HemisIdGeneratorService.java` generates official al-Xorazmiy Vorislari student IDs (`I-HR 0220243`) and secure temporary credentials.
- **Multi-Role RBAC Domain:**
  - 10 distinct system roles defined in `RoleType.java`: `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `REGIONAL_COORDINATOR`, `COORDINATOR`, `MENTOR`, `ENGLISH_MENTOR`, `CONTENT_MANAGER`, `OBSERVER`, `STUDENT`.
  - Granular permissions catalog with 26+ distinct actions seeded across users, roles, lessons, attendance, assessments, grading, curriculum, reports, and system audit.
  - Tables: `roles`, `permissions`, `user_roles`, `role_permissions`.
  - Administration endpoints: `RbacController.java` (`/api/v1/admin/rbac`) and `UserManagementController.java` (`/api/v1/admin/users`) for assigning roles, toggling permissions, and enabling/disabling users.

### 1.2 Frontend Implementation
- **Auth State Management (`AuthContext.tsx`):**
  - Manages `user`, `isAuthenticated`, `isAdmin`, `isMentor`, `isStudent`, `hasRole()`, `hasPermission()`.
  - Synchronizes with `localStorage` (`axm_nexus_user`).
  - Axios interceptor in `api.ts` automatically attaches `Authorization: Bearer <token>` and refreshes expired tokens transparently.
- **Authentication Pages & Modals:**
  - Dedicated standalone pages: `LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `VerifyEmailPage.tsx`.
  - Quick popup modals: `AuthModal.tsx` and `UserProfileModal.tsx`.
  - Safe logout flow: `LogoutConfirmDialog.tsx` with confirmation modal preventing accidental session loss.

---

## 2. Academic Operations: Scheduling, Timetable & Attendance

### 2.1 Backend Implementation
- **Schedule Templates (`schedules` table):**
  - Models recurring weekly timetables (e.g., Monday/Wednesday/Friday 15:00–16:20) associated with a study group, mentor, grade level, subject, room, branch location, and academic year.
  - Managed by `ScheduleService.java` and `ScheduleController.java` (`/api/schedules`).
- **Calendar Lesson Sessions (`lesson_sessions` table):**
  - Represents concrete lesson instances on specific calendar dates.
  - Tracks session status (`SCHEDULED`, `COMPLETED`, `RESCHEDULED`, `CANCELLED`).
  - Strict conflict detection: `checkMentorConflict()` and `checkRoomConflict()` in `AttendanceScheduleService.java` prevent double-booking a mentor or room for overlapping time intervals.
- **Attendance Records (`attendance_records` table):**
  - Real-time attendance logging per student for each lesson session.
  - Valid statuses: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`.
  - Audit logging of who submitted or edited attendance.
  - Endpoints in `LessonAttendanceController.java` (`/api/lessons`):
    - `GET /api/lessons`: Session calendar query with date-range, group, and mentor filters.
    - `GET /api/lessons/today`: Today's sessions for quick dashboard access.
    - `POST /api/lessons`: Schedule a new session with automatic conflict validation.
    - `POST /api/lessons/{id}/reschedule`: Reschedule session to new date/time/room with conflict check.
    - `POST /api/lessons/{id}/cancel`: Cancel session with mandatory reason.
    - `POST /api/lessons/{id}/attendance`: Submit or update attendance sheet.

### 2.2 Frontend Implementation
- **Attendance & Timetable Calendar (`AttendanceCalendar.tsx`):**
  - Multi-view calendar supporting **Day**, **Week**, and **Month** views.
  - Filtering by mentor and study group.
  - Interactive modals:
    - `AttendanceSheetModal.tsx`: Visual attendance sheet with one-click toggles for Present, Late, Excused, Absent.
    - `CreateLessonModal.tsx`: Lesson session scheduling form.
    - `RescheduleLessonModal.tsx`: Date, time, and room rescheduling with conflict feedback.
    - Quick session cancellation with prompt confirmation.

---

## 3. Pedagogical Lesson Planning (80-Minute Standard) & Quality Assurance

### 3.1 Backend Implementation
- **80-Minute Lesson Model (`lessons` table):**
  - Tailored to the al-Xorazmiy Vorislari standard:
    - Theory phase (15–20 min, default 20 min).
    - Practical coding phase (25–30 min, default 25 min).
    - Exercises & mini-project phase.
    - Homework & outcome summary.
  - Revision history: `lesson_revisions` tracks every edit with snapshots.
  - Managed via `LessonService.java` and `LessonController.java` (`/api/lesson-plans`).
- **Lesson Quality & Delivery Records (Schema 011 & 013):**
  - `LessonQualityPlan.java` (`lesson_quality_plans` table): Detailed Bloom taxonomy learning objectives, expected competencies, required materials, and assessment criteria.
  - `LessonDeliveryRecord.java` (`lesson_delivery_records` table): Post-lesson reflection, actual duration, practical exercises completed, student participation rate, common difficulties, and exercise difficulty rating (`TOO_EASY`, `BALANCED`, `TOO_DIFFICULT`).
  - Presentation slides: `presentation_slides` column for interactive in-class slide decks.
  - Endpoints in `LessonQualityController.java` (`/api/v1/lessons/{id}/quality-plan`, `/api/v1/lessons/{id}/delivery-record`, `/api/v1/lessons/{id}/outcome-evaluations`).

### 3.2 Frontend Implementation
- **Lesson Manager (`LessonManager.tsx`):**
  - View, filter, and search lesson plans by subject, grade level, and group.
  - Create and edit lesson plans conforming to the 80-minute structure.
  - `AiPresentationModal.tsx`: Rich slide viewer rendering lesson presentations.
  - `RichTextRenderer.tsx`: Formatted markdown and callout rendering for lesson materials.

---

## 4. Educational Resources & Learning Materials Library

### 4.1 Backend Implementation
- **Resource Management (`learning_resources` table):**
  - Supports PDFs, presentation slides, code snippets, videos, and external links.
  - Attributes: title, description, resource type, file size, storage key, MIME type, grade level, subject, tags, and download count.
  - Managed by `LearningResourceService.java` and `ResourceController.java` (`/api/v1/resources`).
  - Physical file storage handled via `StorageProvider` interface (`LocalStorageProvider.java`) with secure file uploads to `uploads/` directory.

### 4.2 Frontend Implementation
- **Resource Library (`ResourceLibrary.tsx`):**
  - Grid view of learning materials with type badges (PDF, Video, Slide, Code).
  - Search by title and filter by category/grade.
  - File upload modal with drag-and-drop support.
  - Download counter and file preview links.

---

## 5. Assessments, Quizzes & Homework Assignments

### 5.1 Backend Implementation
- **Assessment Engine (`assessments`, `assessment_questions` tables):**
  - Supports multiple-choice, true/false, and open-ended questions.
  - Scoring rules: total points, passing score, duration limit, randomized questions.
  - Managed by `AssessmentService.java` and `AssessmentController.java` (`/api/v1/assessments`).
- **Student Assessment Attempts (`student_assessment_attempts`, `student_answers` tables):**
  - Tracks started time, submitted time, time spent in seconds, total score, and percentage.
  - Automated grading of objective questions upon submission.
  - Mentor feedback recording.
- **Homework Assignments (`assignments`, `assignment_submissions` tables):**
  - Assignments with deadline, max points, and attachments.
  - Submissions with student text, file URL, submission date, status (`PENDING`, `GRADED`), and mentor score/feedback.
  - Managed by `AssignmentService.java` and `AssignmentController.java` (`/api/v1/assignments`).

### 5.2 Frontend Implementation
- **Interactive Assessment Engine (`AssessmentEngine.tsx`):**
  - Dual tabs: **Quizzes & Tests** and **Homework Assignments**.
  - Interactive test taking modal with real-time countdown timer, question-by-question stepper, radio option selection, and instant score review.
  - Mentor management views to publish tests and review assignment submissions.

---

## 6. Grading, Gamification & Student Streaks

### 6.1 Backend Implementation
- **Academic Grading (`grade_records` table):**
  - Records formal subject grades, evaluation types (midterm, final, lab), score/maxScore, letter grades, and passing indicators.
- **Gamification Points & Achievements (`point_transactions`, `achievements`, `student_achievements` tables):**
  - Point award engine with idempotency keys preventing duplicate XP awards.
  - Point adjustment audit with mandatory administrative reasons.
  - Pre-seeded achievement badges (e.g. `FIRST_CODE`, `PERFECT_ATTENDANCE`, `TOP_SCORER`, `BUG_HUNTER`).
- **Daily Activity Streaks (`student_streaks` table):**
  - Tracks current streak, longest streak, last activity date, streak freeze count, and total active days.
  - Automated check-in logic awarding bonus XP for consecutive daily learning activities.
- **Controller Endpoints (`GradingController.java` at `/api/grading`):**
  - `/grades`, `/grades/student/{id}`, `/points`, `/points/adjust`, `/leaderboard`, `/leaderboard/groups`, `/profile/{studentId}`, `/streak/check-in`, `/streak/student/{studentId}`, `/metrics`.

### 6.2 Frontend Implementation
- **Gamification Dashboard (`GamificationDashboard.tsx`):**
  - Leaderboard view with podium (1st, 2nd, 3rd places), student XP, rankings, and group rankings.
  - Streak display with fire animation and streak freeze indicators.
  - Mentor modal for awarding XP and bonus badges.
  - Detailed gamification metric inspection dialog.

---

## 7. AI Features: Smart Timetable Parser & Pedagogical Assistant

### 7.1 Backend Implementation
- **Smart Timetable & Student Parser (`AiImportService.java` at `/api/ai/import`):**
  - Multi-engine document analysis:
    1. **Smart Local Parser:** Offline extraction from Excel (`.xlsx`, `.xls` via Apache POI), CSV, and PDF (via Apache PDFBox). Identifies student full names, PINFL, student IDs, groups, mentors, and rooms using heuristic regex.
    2. **Groq Llama 3.3 70B Adapter:** High-speed remote LLM parser for semantic table extraction.
    3. **Google Gemini 2.5 Flash Adapter:** Multimodal analysis for unstructured documents.
  - Confirmation pipeline: `POST /api/ai/import/confirm` commits parsed students and schedules in a single transactional operation.
- **Pedagogical AI Assistant (`AiAssistantService.java` at `/api/ai/assistant`):**
  - PII sanitization via `PiiSanitizer.java` masks phone numbers, PINFL, and sensitive identifiers before dispatching to external LLMs.
  - `PromptGuardrail.java` enforces educational tone and curriculum alignment.
  - Capability to convert AI-generated lesson plans and quizzes directly into system `DRAFT` records.
  - `MockAiProviderAdapter.java` guarantees offline availability for local development without API keys.

### 7.2 Frontend Implementation
- **AI Timetable Import Modal (`AiImportModal.tsx`):**
  - Drag-and-drop file upload (Excel, CSV, PDF).
  - Target mentor selection.
  - Engine picker (Local, Groq, Gemini).
  - Live preview grid with editable columns before database commit.
- **AI Teaching Assistant Interface (`AiAssistantInterface.tsx`):**
  - Role-adaptive chat interface (Mentor Mode & Student Mode).
  - One-click prompt templates for 80-minute lesson plans, quiz generation, coding exercises, and concept explanations.
  - "Save as Lesson Draft" and "Save as Assessment Draft" action buttons.

---

## 8. Reporting, Notifications & System Administration

### 8.1 Backend Implementation
- **PDF Report Generation (`PdfReportService.java` at `/api/v1/reports`):**
  - Generates formal PDF documents using OpenPDF for student transcripts, group academic performance, attendance sheets, and mentor workload summaries.
- **Notification Outbox Pattern (`notifications`, `notification_outbox` tables):**
  - Reliable asynchronous delivery engine with retry attempts and dead-letter handling.
  - User notification preferences (`notification_preferences`).
- **System Administration & Audit Logging (`AdminOperationsController.java` at `/api/v1/admin`):**
  - `audit_logs` records actions, target entities, actors, timestamps, IP addresses, and outcomes.
  - Dynamic system configuration (`system_configs`) supporting runtime maintenance mode toggle, open registration toggle, and session timeouts.

### 8.2 Frontend Implementation
- **Admin Control Center (`AdminControlCenter.tsx`):**
  - Tabbed administration hub for audit log exploration, system settings configuration, health checks, and database status.
- **Notification Center (`NotificationCenter.tsx`):**
  - Dropdown popover displaying unread notifications with timestamps and read/unread markers.
- **Global Search Modal (`GlobalSearchModal.tsx`):**
  - `Ctrl + K` / `Cmd + K` search modal providing instant navigation across students, mentors, groups, lessons, and tools.
- **Design System Showcase (`DesignSystemShowcase.tsx`):**
  - Interactive UI kit previewing all typography, color palettes, buttons, badges, dialogs, inputs, and tables.
- **Internationalization (`frontend/src/shared/i18n/`):**
  - Comprehensive 3-language dictionary support: Uzbek (`uz`), Russian (`ru`), English (`en`).
