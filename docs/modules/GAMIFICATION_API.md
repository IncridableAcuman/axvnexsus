# AXV Nexus — Gamification Engine: REST API Documentation

This document describes all REST API endpoints provided by the Gamification module in AXV Nexus.

## Base URL
`/api/grading`

## Authentication & Authorization
All gamification endpoints require an authenticated user session (`Authorization: Bearer <JWT>` or active session cookie).
- **STUDENT**: Access to personal metrics (`/points/me/*`, `/streaks/me/*`, `/achievements/me`), leaderboards, and personal freeze consumption.
- **TEACHER / MENTOR**: Access to student gamification profiles and leaderboards.
- **ADMIN / SUPER_ADMIN**: Full access to all endpoints, manual adjustments, freeze grants, and achievement catalog CRUD.

---

## 1. Experience Points (XP) Endpoints

### 1.1 Get Authenticated Student's Total XP
Returns the verified cumulative total XP for the currently authenticated student.

- **Method**: `GET`
- **Path**: `/api/grading/points/me/total`
- **Security**: Authenticated (`STUDENT`, `TEACHER`, `ADMIN`, `SUPER_ADMIN`)
- **Query Parameters**: None
- **Response**: `200 OK`
```json
1450
```

---

### 1.2 Get Specified Student's Total XP
Returns total XP for a specific student ID.

- **Method**: `GET`
- **Path**: `/api/grading/points/student/{studentId}/total`
- **Security**: Authenticated (`TEACHER`, `ADMIN`, `SUPER_ADMIN`, or self)
- **Path Parameters**:
  - `studentId` (Long): The unique identifier of the student.
- **Response**: `200 OK`
```json
1450
```

---

### 1.3 Get Authenticated Student's XP Summary
Calculates current total XP, today's earnings, current week earnings, current month earnings, and breakdown by activity source.

- **Method**: `GET`
- **Path**: `/api/grading/points/me/summary`
- **Security**: Authenticated (`STUDENT`, `TEACHER`, `ADMIN`)
- **Response**: `200 OK`
```json
{
  "studentId": 42,
  "totalPoints": 1450,
  "pointsToday": 60,
  "pointsThisWeek": 210,
  "pointsThisMonth": 680,
  "pointsBySource": {
    "QUIZ": 800,
    "ASSIGNMENT": 350,
    "STREAK": 180,
    "LESSON": 70,
    "ACHIEVEMENT": 50
  }
}
```

---

### 1.4 Get Authenticated Student's XP Transaction Ledger (Paginated)
Retrieves the immutable audit ledger of all XP transactions for the caller.

- **Method**: `GET`
- **Path**: `/api/grading/points/me/history`
- **Security**: Authenticated (`STUDENT`)
- **Query Parameters**:
  - `page` (optional, default `0`): Page index (0-indexed).
  - `size` (optional, default `20`): Page size.
  - `source` (optional): Filter by point source (`QUIZ`, `ASSIGNMENT`, `STREAK`, `ACHIEVEMENT`, `LESSON`, `ADJUSTMENT`).
- **Response**: `200 OK`
```json
{
  "content": [
    {
      "id": 1024,
      "studentId": 42,
      "points": 30,
      "pointSource": "QUIZ",
      "eventReferenceId": "QUIZ_HIGH_55",
      "description": "High score (>=90%) on quiz: Data Structures & Algorithms",
      "awardedAt": "2026-11-15T16:45:00Z",
      "metadata": "{\"scorePercentage\": 95.0}"
    },
    {
      "id": 1023,
      "studentId": 42,
      "points": 20,
      "pointSource": "QUIZ",
      "eventReferenceId": "QUIZ_PASS_55",
      "description": "Passed quiz: Data Structures & Algorithms",
      "awardedAt": "2026-11-15T16:45:00Z",
      "metadata": null
    },
    {
      "id": 1022,
      "studentId": 42,
      "points": 10,
      "pointSource": "QUIZ",
      "eventReferenceId": "QUIZ_COMPLETE_55",
      "description": "Completed quiz: Data Structures & Algorithms",
      "awardedAt": "2026-11-15T16:45:00Z",
      "metadata": null
    }
  ],
  "totalElements": 48,
  "totalPages": 3,
  "size": 20,
  "number": 0,
  "first": true,
  "last": false
}
```

---

### 1.5 Get XP Earned in Date Range
Retrieves the total XP earned by a student across an arbitrary date period (anchored in `Asia/Tashkent`).

- **Method**: `GET`
- **Path**: `/api/grading/points/period`
- **Security**: Authenticated (`TEACHER`, `ADMIN`, or self)
- **Query Parameters**:
  - `studentId` (Long, required): Target student ID.
  - `startDate` (ISO-8601 Date or DateTime, required): e.g., `2026-11-01T00:00:00Z`
  - `endDate` (ISO-8601 Date or DateTime, required): e.g., `2026-11-15T23:59:59Z`
- **Response**: `200 OK`
```json
520
```

---

### 1.6 Award / Adjust Points (Administrative or System)
Awards XP or applies administrative point adjustments.

- **Method**: `POST`
- **Path**: `/api/grading/points/award`
- **Security**: `ADMIN` or `SUPER_ADMIN` if `pointSource == "ADJUSTMENT"`. System/internal services for educational events.
- **Request Body**:
```json
{
  "studentId": 42,
  "points": 50,
  "pointSource": "ADJUSTMENT",
  "eventReferenceId": "ADMIN_ADJ_20261115_42",
  "description": "Bonus for hackathon championship participation",
  "metadata": "{\"grantedBy\": \"admin@axm.uz\"}"
}
```
- **Response**: `200 OK` with the created `StudentPointHistoryDto`.
- **Errors**:
  - `400 Bad Request`: Validation failure or duplicate `eventReferenceId`.
  - `403 Forbidden`: Non-admin attempts to use `ADJUSTMENT`.

---

## 2. Streak & Freeze Endpoints

### 2.1 Get Authenticated Student's Streak Status
Retrieves current streak momentum, freeze balance, and last activity date.

- **Method**: `GET`
- **Path**: `/api/grading/streaks/me`
- **Security**: Authenticated (`STUDENT`)
- **Response**: `200 OK`
```json
{
  "id": 12,
  "studentId": 42,
  "currentStreak": 7,
  "longestStreak": 14,
  "lastActivityDate": "2026-11-15",
  "streakFreezeCount": 2,
  "updatedAt": "2026-11-15T16:45:00Z"
}
```

---

### 2.2 Consume Streak Freeze Manually
Allows a student to protect their streak for a missed calendar day.

- **Method**: `POST`
- **Path**: `/api/grading/streaks/me/freeze/use`
- **Security**: Authenticated (`STUDENT`)
- **Query Parameters**:
  - `missedDate` (optional, `YYYY-MM-DD`): If omitted, defaults to yesterday in `Asia/Tashkent`.
- **Response**: `200 OK`
```json
{
  "id": 12,
  "studentId": 42,
  "currentStreak": 7,
  "longestStreak": 14,
  "lastActivityDate": "2026-11-14",
  "streakFreezeCount": 1,
  "updatedAt": "2026-11-15T18:00:00Z"
}
```
- **Errors**:
  - `400 Bad Request`: `No streak freezes remaining` or `A streak freeze was already used for date 2026-11-14`.

---

### 2.3 Grant Streak Freezes Administratively
Awards streak freeze tokens to a student.

- **Method**: `POST`
- **Path**: `/api/grading/streaks/student/{studentId}/freeze/grant`
- **Security**: `ADMIN`, `SUPER_ADMIN`
- **Path Parameters**:
  - `studentId` (Long): Target student ID.
- **Query Parameters**:
  - `count` (int, default `1`): Number of freezes to grant.
  - `reason` (string, optional): Audit reason for the grant.
- **Response**: `200 OK` with updated `StudentStreakDto`.

---

## 3. Achievement & Badge Endpoints

### 3.1 Get All Available Achievements (Catalog)
Retrieves the complete catalog of active achievements with unlocked status for the authenticated user.

- **Method**: `GET`
- **Path**: `/api/grading/achievements`
- **Security**: Authenticated
- **Response**: `200 OK`
```json
[
  {
    "id": 1,
    "code": "FIRST_QUIZ",
    "title": "Birinchi Qadam",
    "description": "Birinchi testni muvaffaqiyatli topshiring",
    "iconUrl": "Award",
    "badgeColor": "#3B82F6",
    "category": "LEARNING",
    "rarity": "COMMON",
    "criteriaType": "QUIZ_COUNT",
    "criteriaThreshold": 1,
    "pointsReward": 25,
    "isActive": true,
    "displayOrder": 1,
    "isUnlocked": true,
    "unlockedAt": "2026-11-10T10:00:00Z",
    "progress": 1
  }
]
```

---

### 3.2 Get Student Achievements
Retrieves achievements unlocked by a specific student.

- **Method**: `GET`
- **Path**: `/api/grading/achievements/student/{studentId}`
- **Security**: Authenticated (`TEACHER`, `ADMIN`, or self)
- **Response**: `200 OK` (List of `StudentAchievementDto`)

---

### 3.3 Create Achievement (Admin)
Creates a new achievement in the catalog.

- **Method**: `POST`
- **Path**: `/api/grading/achievements`
- **Security**: `ADMIN`, `SUPER_ADMIN`
- **Request Body**:
```json
{
  "code": "ALGORITHM_MASTER",
  "title": "Algoritm Ustasi",
  "description": "10 ta algoritm topshirig'ini a'lo bahoga bajaring",
  "iconUrl": "Cpu",
  "badgeColor": "#8B5CF6",
  "category": "PERFORMANCE",
  "rarity": "EPIC",
  "criteriaType": "ASSIGNMENT_COUNT",
  "criteriaThreshold": 10,
  "pointsReward": 250,
  "isActive": true,
  "displayOrder": 20
}
```
- **Response**: `201 Created`

---

### 3.4 Update Achievement (Admin)
Updates an existing achievement's properties.

- **Method**: `PUT`
- **Path**: `/api/grading/achievements/{id}`
- **Security**: `ADMIN`, `SUPER_ADMIN`
- **Response**: `200 OK`

---

### 3.5 Toggle Achievement Active Status (Admin)
Enables or disables an achievement from being unlocked.

- **Method**: `PATCH`
- **Path**: `/api/grading/achievements/{id}/toggle`
- **Security**: `ADMIN`, `SUPER_ADMIN`
- **Response**: `200 OK`

---

## 4. Leaderboard & Profile Endpoints

### 4.1 Get Full Gamification Profile
Aggregates total XP, streak, current 10-tier level, next level requirements, recent transactions, and unlocked achievements.

- **Method**: `GET`
- **Path**: `/api/grading/profile/student/{studentId}`
- **Security**: Authenticated
- **Response**: `200 OK`
```json
{
  "studentId": 42,
  "fullName": "Izzatbek Qodirov",
  "avatarUrl": null,
  "totalPoints": 1450,
  "rank": 3,
  "level": 5,
  "levelTitle": "Skilled",
  "xpInCurrentLevel": 450,
  "xpRequiredForNextLevel": 1500,
  "levelProgressPercentage": 90.0,
  "streak": {
    "currentStreak": 7,
    "longestStreak": 14,
    "lastActivityDate": "2026-11-15",
    "streakFreezeCount": 2
  },
  "achievements": [],
  "recentTransactions": []
}
```

---

### 4.2 Get Leaderboard
Retrieves ranked students filtered by timeframe.

- **Method**: `GET`
- **Path**: `/api/grading/leaderboard`
- **Security**: Authenticated
- **Query Parameters**:
  - `period` (optional, default `ALL_TIME`): `ALL_TIME`, `MONTHLY`, `WEEKLY`.
  - `limit` (optional, default `50`): Max records returned.
- **Response**: `200 OK` (List of `LeaderboardEntryDto`)
