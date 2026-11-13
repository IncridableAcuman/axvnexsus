# AXV NEXUS — MILESTONE 10
# DASHBOARD & ANALYTICS INTEGRATION SPECIFICATION

## 1. Executive Overview

Milestone 10 connects the educational analytics infrastructure of **AXV Nexus (Al-Xorazmiy Vorislari Hub)** to the frontend dashboard views for **Administrators**, **Mentors**, and **Students**. Prior to this milestone, dashboard interfaces relied partially on mock placeholders, static weekly arrays, hardcoded room occupancy stats, and client-calculated metrics.

This milestone establishes end-to-end authenticated, role-scoped, backend-driven analytics pipelines that preserve the **Modular Monolith (DDD)** architecture on the backend and **Feature-Sliced Design (FSD)** on the frontend.

---

## 2. Architecture & Design Principles

### 2.1 Backend Modular Monolith & Security Context
- **Domain-Driven Design (DDD)**: Analytics capabilities are encapsulated within the `uz.axm.nexus.analytics` package with clean boundaries separating domain DTOs, application services, and presentation controllers.
- **Server-Side Security Context Resolution**: Endpoints extract the authenticated principal directly from Spring Security's `SecurityContextHolder` via `CurrentUserHelper`. No client-supplied user identifiers are trusted for identity resolution.
- **Insecure Direct Object Reference (IDOR) Prevention**: Cross-mentor and cross-student data leakage is systematically blocked by `AnalyticsAuthorizationService`, delegating ownership verification to `ResourceOwnershipService`.
- **Stateless Aggregation**: Weekly attendance, room occupancy, and student performance metrics are derived from PostgreSQL data via Spring Data JPA repositories without synthetic formulas or hardcoded mock constants.

### 2.2 Frontend Feature-Sliced Design (FSD)
- **Feature Layer (`src/features/analytics/`)**: Encapsulates data fetching hooks (`useAdminDashboard`, `useMentorDashboard`, `useStudentDashboard`) and API communication.
- **User-Scoped Query Cache**: TanStack Query cache keys incorporate the authenticated user's ID (`['dashboard-admin', ...]`, `['dashboard-mentor', userId, ...]`, `['dashboard-student', userId, ...]`), ensuring zero data cross-contamination between authenticated sessions.
- **Cache Invalidation Lifecycle**: Query client caches are cleared on logout, preventing stale or privileged analytics from leaking across user role changes.
- **Graceful Error & Degradation Handling**: Unlinked user profiles (e.g. accounts without a corresponding student or mentor record) return structured 404 responses handled gracefully with non-crashing friendly alert banners.

---

## 3. Data Contracts & DTO Specifications

### 3.1 Admin Dashboard (`GET /api/analytics/dashboard/admin`)
Scoped to administrators and regional coordinators (`hasAuthority('analytics.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR')`).

```json
{
  "totalActiveStudents": 140,
  "totalMentors": 12,
  "totalGroups": 8,
  "totalScheduledLessons": 24,
  "systemAttendanceRate": 94.8,
  "systemAverageScore": 88.5,
  "totalCompletedLessons": 120,
  "totalSubmittedAssignments": 340,
  "totalEvaluatedAssessments": 320,
  "presentCount": 520,
  "lateCount": 18,
  "excusedCount": 4,
  "absentCount": 10,
  "weeklyAttendance": [
    {
      "day": "Dush",
      "date": "2026-11-09",
      "rate": 96.5,
      "presentCount": 135,
      "lateCount": 3,
      "excusedCount": 1,
      "absentCount": 1,
      "totalCount": 140
    }
  ],
  "roomOccupancy": [
    {
      "roomId": 1,
      "name": "IT Lab 101",
      "branchLocation": "Urganch Filiali",
      "used": 22,
      "total": 25,
      "percent": 88.0,
      "indicator": "bg-emerald-500"
    }
  ],
  "groupPerformance": [
    {
      "groupId": 1,
      "groupName": "8-A",
      "groupCode": "8-A",
      "studentCount": 22,
      "attendanceRate": 96.5,
      "averageScore": 89.2,
      "submissionRate": 95.0,
      "performanceBand": "A"
    }
  ],
  "enrollmentByGrade": {
    "8-sinf": 70,
    "9-sinf": 70
  },
  "systemTrend": []
}
```

### 3.2 Mentor Dashboard (`GET /api/analytics/dashboard/mentor`)
Scoped to authenticated mentors (`hasAuthority('analytics.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')`). Resolves authenticated mentor entity via `mentorRepository.findByUserId(user.getId())`.

```json
{
  "mentorId": 10,
  "mentorName": "Aziz Rahimov",
  "role": "MENTOR",
  "branchLocation": "Urganch Filiali",
  "todayLessonsCount": 2,
  "assignedGroupsCount": 4,
  "assignedStudentsCount": 68,
  "todayAttendanceRate": 97.5,
  "pendingGradingCount": 1,
  "theoryMasteryRate": 88.5,
  "codingPracticeRate": 92.0,
  "miniProjectRate": 85.0,
  "nextLesson": {
    "id": 101,
    "groupId": 1,
    "groupCode": "8-A",
    "subject": "React State Management",
    "gradeLevel": "8-sinf",
    "mentorName": "Aziz Rahimov",
    "room": "IT Lab 101",
    "branchLocation": "Urganch Filiali",
    "lessonDate": "2026-11-13",
    "startTime": "14:00",
    "endTime": "15:20",
    "status": "SCHEDULED",
    "studentCount": 22
  },
  "todayLessons": [ ... ],
  "pendingReviews": [
    {
      "submissionId": 501,
      "assignmentId": 10,
      "title": "Todo App Redux bilan",
      "studentId": 77,
      "studentName": "Ali Valiyev",
      "groupCode": "8-A",
      "submittedAt": "Bugun, 10:15",
      "dueStatus": "ON_TIME"
    }
  ],
  "weeklyAttendanceTrend": []
}
```

### 3.3 Student Dashboard (`GET /api/analytics/dashboard/student`)
Scoped to authenticated students (`isAuthenticated()`). Resolves authenticated student entity via `studentRepository.findByUserId(user.getId())`.

```json
{
  "studentId": 55,
  "studentName": "Anvar Xorazmiy",
  "studentIdNumber": "I-HR 010001",
  "gradeLevel": "8-sinf",
  "groupId": 1,
  "groupCode": "8-A",
  "mentorName": "Aziz Rahimov",
  "branchLocation": "IT Park Yangiariq",
  "level": 4,
  "totalPoints": 1450,
  "rank": 1,
  "currentStreak": 16,
  "longestStreak": 20,
  "nextLevelXp": 2000,
  "badgesCount": 7,
  "gpa": 4.85,
  "courseProgress": 82,
  "attendanceRate": 98.2,
  "presentCount": 45,
  "lateCount": 1,
  "excusedCount": 0,
  "absentCount": 0,
  "todayLesson": {
    "id": 201,
    "groupId": 1,
    "groupCode": "8-A",
    "subject": "Advanced React Hooks",
    "gradeLevel": "8-sinf",
    "mentorName": "Aziz Rahimov",
    "room": "IT Lab 101",
    "branchLocation": "IT Park Yangiariq",
    "lessonDate": "2026-11-13",
    "startTime": "14:00",
    "endTime": "15:20",
    "status": "SCHEDULED",
    "studentCount": 22
  },
  "activeTasks": [
    {
      "id": 301,
      "title": "State Architecture Project",
      "subject": "Frontend Dasturlash",
      "type": "ASSIGNMENT",
      "deadline": "15-Noyabr, 23:59",
      "isOverdue": false
    }
  ],
  "latestFeedback": {
    "subject": "Frontend Dasturlash",
    "topic": "TypeScript Generics Test",
    "score": 98.0,
    "maxScore": 100,
    "mentorFeedback": "Mukammal yechim! Type guardlar aniq belgilangan.",
    "mentorName": "Aziz Rahimov",
    "gradedAt": "2026-11-12",
    "formattedDate": "12-Noyabr, 2026"
  }
}
```

---

## 4. Aggregation Logic & Mathematical Formulas

### 4.1 Attendance Calculation
1. **Attendance Rate**:
   $$\text{Attendance Rate} = \frac{\text{Present Count} + \text{Late Count} \times 0.5 + \text{Excused Count}}{\text{Total Sessions}} \times 100$$
   Rounded to 1 decimal place using `BigDecimal.setScale(1, RoundingMode.HALF_UP)`.
2. **Weekly Day-of-Week Trend**:
   Aggregates sessions across the current week from Monday (`DayOfWeek.MONDAY`) to Saturday (`DayOfWeek.SATURDAY`). Sunday is reserved for non-instructional maintenance.

### 4.2 Room Occupancy
Room occupancy is derived by cross-referencing `Room` records in `RoomRepository` with active schedules occurring at the current time (`LocalTime.now()` between `startTime` and `endTime`):
$$\text{Occupancy Rate} = \frac{\text{Active Student Count in Room}}{\text{Room Capacity}} \times 100$$
Status color indicators are mapped automatically:
- $\ge 90\%$: `bg-rose-500` (Critically full)
- $\ge 70\%$: `bg-amber-500` (High occupancy)
- $> 0\%$: `bg-emerald-500` (Normal active session)
- $0\%$: `bg-blue-500` (Available)

### 4.3 Student GPA & Gamification
- **GPA Calculation**: Derived from all evaluated quiz attempts and graded assignment submissions:
  $$\text{Average Score} = \frac{\sum \text{Scores}}{\text{Count}}$$
  $$\text{GPA (5.0 Scale)} = \frac{\text{Average Score}}{20.0}$$
- **Gamification Profile**: Interfaced with `GradingAndGamificationService` to query XP points, current level, leaderboard rank, unlocked achievements count, and consecutive streak days.

---

## 5. Security & Authorization Matrix

| Endpoint | Required Authority / Roles | Ownership & Scope Enforcement |
|---|---|---|
| `GET /api/analytics/dashboard/admin` | `analytics.read`, `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `REGIONAL_COORDINATOR`, `COORDINATOR` | Branch-scoped or organization-wide system overview. |
| `GET /api/analytics/dashboard/mentor` | `analytics.read`, `SUPER_ADMIN`, `ADMIN`, `PROGRAM_ADMIN`, `MENTOR` | Scoped strictly to authenticated mentor via `mentorRepository.findByUserId()`. Blocks cross-mentor access. |
| `GET /api/analytics/dashboard/student` | `isAuthenticated()` | Scoped strictly to authenticated student via `studentRepository.findByUserId()`. Blocks cross-student access. |

---

## 6. Verification & Quality Gates

### 6.1 Backend Test Results
- **Framework**: Spring Boot Test, JUnit 5, Mockito, AssertJ, MockMvc.
- **Suites**: 30 suites executed.
- **Total Tests**: **156 passed, 0 failed, 0 skipped (100% pass rate)**.
- **Integration Test Suite**: `uz.axm.nexus.analytics.presentation.DashboardAnalyticsIntegrationTest` (12 tests covering 401s, 403s, IDOR prevention, admin full metrics, mentor today's lessons & reviews, student gamification KPIs, unlinked profile 404).

### 6.2 Frontend Test Results
- **Framework**: Vitest, React Testing Library, JSDOM.
- **Test Files**: **26 passed, 0 failed (100%)**.
- **Total Tests**: **140 passed, 0 failed (100%)**.
- **Integration Test Suite**: `src/features/analytics/__tests__/DashboardAnalytics.test.tsx` (5 comprehensive tests verifying real data rendering in Admin, Mentor, Student dashboards, empty states, and unlinked student notification).

### 6.3 Production Build Verification
- **Command**: `npm run build` (`tsc -b && vite build`)
- **Result**: **0 TypeScript errors, 2231 modules transformed, clean production distribution generated**.
