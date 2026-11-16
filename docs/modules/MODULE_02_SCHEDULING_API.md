# AXV Nexus — Module 02: API Specification & Contracts

## 1. Overview

This document specifies the complete RESTful HTTP API contracts for Module 02: Recurring Schedules, Shifts, and Calendar Lesson Session Management.

Base Path: `/api`  
Security: Bearer JWT token in `Authorization` header.  
All date formats: `YYYY-MM-DD` (ISO-8601).  
All time formats: `HH:mm` (24-hour).

---

## 2. Recurring Schedules API

### 2.1 Create Recurring Schedule
* **Endpoint**: `POST /api/schedules/recurring` (Alias: `POST /api/schedules/manual`)
* **Role Required**: `ADMIN`, `PROGRAM_ADMIN`, `SUPER_ADMIN`, `MENTOR` (branch-scoped)
* **Request Body**:
```json
{
  "mentorName": "Abdurasharipov Izzatbek",
  "mentorRole": "IT mentor",
  "mentorId": 1,
  "groupCode": "YA-26I0805",
  "groupId": 5,
  "gradeLevel": "8-sinf",
  "subject": "Web Full-Stack Development",
  "dayPattern": "ODD_DAYS",
  "days": "Dushanba, Chorshanba, Juma",
  "selectedDays": ["Dushanba", "Chorshanba", "Juma"],
  "startTime": "09:30",
  "endTime": "11:00",
  "shiftId": 1,
  "room": "IT Lab 1",
  "branchLocation": "IT Park Yangiariq filiali",
  "branchId": 1,
  "startDate": "2026-11-01",
  "endDate": "2027-05-31",
  "generateSessions": true
}
```
* **Success Response (`200 OK`)**:
```json
{
  "id": 42,
  "gradeLevel": "8-sinf",
  "subject": "Web Full-Stack Development",
  "days": "Dushanba, Chorshanba, Juma",
  "dayPattern": "ODD_DAYS",
  "startTime": "09:30",
  "endTime": "11:00",
  "room": "IT Lab 1",
  "branchLocation": "IT Park Yangiariq filiali",
  "startDate": "2026-11-01",
  "endDate": "2027-05-31",
  "status": "ACTIVE",
  "mentor": { "id": 1, "fullName": "Abdurasharipov Izzatbek" },
  "studyGroup": { "id": 5, "groupCode": "YA-26I0805" },
  "timeSlot": { "id": 1, "name": "Ertalabki smena (Morning)", "startTime": "09:30", "endTime": "11:00" }
}
```
* **Conflict Response (`400 Bad Request`)**:
```json
{
  "code": "SCHEDULE_CONFLICT",
  "message": "Dars jadvalida to'qnashuv aniqlandi",
  "conflicts": [
    {
      "type": "ROOM",
      "message": "IT Lab 1 xonasi 2026-11-02 sanasida band!",
      "conflictingDate": "2026-11-02",
      "existingScheduleId": 12
    }
  ]
}
```

---

### 2.2 List Recurring Schedules
* **Endpoint**: `GET /api/schedules/recurring`
* **Query Parameters**:
  * `branchId` (optional, Long): Filter by branch.
  * `status` (optional, String): `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`.
  * `gradeLevel` (optional, String): Filter by grade level.
* **Success Response (`200 OK`)**: Array of `Schedule` objects.

---

### 2.3 Get Recurring Schedule by ID
* **Endpoint**: `GET /api/schedules/recurring/{id}` (Alias: `GET /api/schedules/{id}`)
* **Success Response (`200 OK`)**: `Schedule` object.

---

### 2.4 Update Recurring Schedule with Update Scope
* **Endpoint**: `PUT /api/schedules/recurring/{id}` (Alias: `PUT /api/schedules/{id}`)
* **Role Required**: `ADMIN`, `PROGRAM_ADMIN`, `SUPER_ADMIN`, `MENTOR`
* **Request Body**:
```json
{
  "gradeLevel": "8-sinf",
  "subject": "Advanced Web Full-Stack",
  "dayPattern": "EVEN_DAYS",
  "days": "Seshanba, Payshanba, Shanba",
  "startTime": "15:00",
  "endTime": "16:30",
  "room": "IT Lab 2",
  "startDate": "2026-11-01",
  "endDate": "2027-05-31",
  "updateScope": "FUTURE_ONLY"
}
```
* **Success Response (`200 OK`)**: Updated `Schedule` object. Future calendar sessions are recalculated; historical completed sessions remain unchanged.

---

### 2.5 Archive Recurring Schedule
* **Endpoint**: `POST /api/schedules/{id}/archive`
* **Role Required**: `ADMIN`, `SUPER_ADMIN`
* **Request Body** (optional):
```json
{
  "reason": "O'quv kursi semestr oxirida yakunlandi"
}
```
* **Success Response (`200 OK`)**: `Schedule` object with `status = "ARCHIVED"`.

---

### 2.6 Delete Recurring Schedule (Safe Deletion)
* **Endpoint**: `DELETE /api/schedules/{id}`
* **Role Required**: `ADMIN`, `SUPER_ADMIN`
* **Behavior**: Uncompleted scheduled lessons are deleted. Completed historical lessons and attendance records are preserved with `schedule_id = NULL`.
* **Success Response (`204 No Content`)**.

---

### 2.7 Regenerate Future Sessions
* **Endpoint**: `POST /api/schedules/{id}/regenerate`
* **Query Parameters**:
  * `updateScope` (default: `"FUTURE_ONLY"`): Scope of regeneration.
* **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "18 ta kelgusi dars mashg'uloti muvaffaqiyatli yangilandi yoki generatsiya qilindi",
  "count": 18
}
```

---

### 2.8 Schedule Recurrence & Conflict Preview
* **Endpoint**: `POST /api/schedules/preview`
* **Request Body**:
```json
{
  "dayPattern": "ODD_DAYS",
  "startDate": "2026-11-01",
  "endDate": "2026-11-30",
  "startTime": "09:30",
  "endTime": "11:00",
  "room": "IT Lab 1",
  "branchId": 1
}
```
* **Success Response (`200 OK`)**:
```json
{
  "pattern": "ODD_DAYS",
  "startDate": "2026-11-01",
  "endDate": "2026-11-30",
  "totalDaysInRange": 30,
  "totalSessions": 13,
  "holidaysSkipped": 1,
  "sundaysSkipped": 5,
  "sessionDates": ["2026-11-02", "2026-11-04", "2026-11-06", "2026-11-09"],
  "hasConflicts": false,
  "conflicts": []
}
```

---

## 3. Calendar Lesson Sessions API

### 3.1 Query Calendar Sessions
* **Endpoint**: `GET /api/lessons` (Alias: `GET /api/calendar/sessions`)
* **Query Parameters**:
  * `startDate` (e.g. `2026-11-01`)
  * `endDate` (e.g. `2026-11-07`)
  * `mentorId` (optional, Long)
  * `groupId` (optional, Long)
* **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "scheduleId": 42,
      "groupId": 5,
      "groupCode": "YA-26I0805",
      "mentorId": 1,
      "mentorName": "Abdurasharipov Izzatbek",
      "room": "IT Lab 1",
      "subject": "Web Full-Stack Development",
      "lessonDate": "2026-11-02",
      "startTime": "09:30",
      "endTime": "11:00",
      "status": "SCHEDULED",
      "isManuallyModified": false,
      "shiftName": "Ertalabki smena (Morning)"
    }
  ]
}
```

---

### 3.2 Reschedule Single Session
* **Endpoint**: `POST /api/calendar/sessions/{id}/reschedule` (Alias: `POST /api/lessons/{id}/reschedule`)
* **Request Body**:
```json
{
  "newDate": "2026-11-03",
  "newStartTime": "15:00",
  "newEndTime": "16:30",
  "newRoom": "IT Lab 2",
  "reason": "Mentor so'roviga binoan"
}
```
* **Success Response (`200 OK`)**: Updates status to `RESCHEDULED`, sets `isManuallyModified = true`.

---

### 3.3 Cancel Single Session
* **Endpoint**: `POST /api/calendar/sessions/{id}/cancel` (Alias: `POST /api/lessons/{id}/cancel`)
* **Request Body**:
```json
{
  "reason": "Filialda texnik profilaktika"
}
```
* **Success Response (`200 OK`)**: Updates status to `CANCELLED`, records cancellation reason, sets `isManuallyModified = true`.

---

### 3.4 Restore Cancelled Session
* **Endpoint**: `POST /api/calendar/sessions/{id}/restore` (Alias: `POST /api/lessons/{id}/restore`)
* **Success Response (`200 OK`)**: Restores status to `SCHEDULED`, clears cancellation reason, returns updated `LessonSessionDto`.

---

### 3.5 Submit Attendance for Session
* **Endpoint**: `POST /api/calendar/sessions/{id}/attendance` (Alias: `POST /api/lessons/{id}/attendance`)
* **Request Body**:
```json
{
  "records": [
    {
      "studentId": 1001,
      "status": "PRESENT",
      "notes": "Faol qatnashdi"
    },
    {
      "studentId": 1002,
      "status": "ABSENT",
      "notes": "Sababsiz"
    }
  ]
}
```
* **Success Response (`200 OK`)**: Saves attendance records and automatically marks session status as `COMPLETED`. Rejects submission if session is `CANCELLED`.
