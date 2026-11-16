# AXV Nexus — Module 02: Administrator & Mentor User Guide

## 1. Introduction

Welcome to the **AXV Nexus Academic Scheduling & Calendar Management Guide**.

This guide covers how to:
1. Create and manage recurring academic schedules.
2. Select weekday patterns (Odd, Even, All 6 Days, Custom).
3. Select and configure daily shifts and custom time intervals.
4. Preview generated calendar sessions and avoid schedule conflicts.
5. Safely edit recurring schedules without losing historical attendance records.
6. Manage individual calendar lesson occurrences (reschedule, cancel, restore).
7. Take and finalize lesson attendance.

---

## 2. Creating a Recurring Schedule

1. Navigate to the **Darslar Jadvali & Davomat (Timetable & Attendance)** tab.
2. Click **Doimiy jadval yaratish (Create Recurring Schedule)** or **Yangi Dars Jadvalini Qo‘shish**.
3. Fill in the schedule parameters:
   * **Mavjud Guruhni Tanlash**: Choose an existing study group (e.g. `YA-26I0805`) to automatically prefill grade level, subject, room, and mentor.
   * **Sinf va Ta'lim Bosqichi**: Select academic grade (e.g., `8-sinf`).
   * **O‘quv Fani / Yo‘nalish**: Enter subject name (e.g., `Web Full-Stack Development`).
   * **Mentor F.I.Sh**: Select from assigned branch mentors or enter mentor name.
4. Choose the **Dars kunlari turi (Recurrence Pattern)**:
   * **Toq kunlar (Odd Days)**: Monday, Wednesday, Friday.
   * **Juft kunlar (Even Days)**: Tuesday, Thursday, Saturday.
   * **Barcha 6 kun (All 6 Days)**: Monday through Saturday.
   * **Maxsus kunlar (Custom Days)**: Click individual weekday pills to select specific days. *(Note: Sunday is strictly excluded from standard academic schedules).*
5. Select the **Amal qilish muddati (Date Range)**:
   * Select **Boshlanish sanasi (Start Date)** (e.g., `2026-11-01`).
   * Select **Tugash sanasi (End Date)** (e.g., `2027-05-31`).
6. Select **Dars vaqti (Shift & Time Interval)**:
   * **Ertalabki smena (Morning)**: 09:30 – 11:00
   * **Tushdan keyingi (Afternoon)**: 15:00 – 16:30
   * **Kechki smena (Evening)**: 16:30 – 18:00
   * **Maxsus vaqt oralig‘i (Custom Time)**: Enter custom start and end time in 24-hour format (`HH:mm`).
   * *Validation Rule*: Start time must be earlier than end time (e.g., `15:00–14:30` is rejected).
7. Inspect the **Taqvim hisobi va ko‘rik (Calendar Preview)**:
   * The system automatically calculates total expected sessions across the date range.
   * Sundays and holidays registered in the academic calendar are automatically skipped and displayed in the summary.
   * If any mentor or classroom collision is detected, a conflict alert indicates the exact conflicting date and group.
8. Click **Dars Jadvalini Saqlash (Save Schedule)**. The recurring schedule rule and all calendar sessions are generated atomically.

---

## 3. Viewing Calendar Sessions vs. Recurring Rules

In the **Darslar Jadvali & Davomat** tab, use the top segment selector:
* **Taqvim mashg‘ulotlari (Calendar Sessions)**: Displays individual calendar occurrences in **Kunlik (Day)**, **Haftalik (Week)**, or **Oylik (Month)** views with search and mentor/group filters.
* **Doimiy dars qoidalari (Recurring Schedule Rules)**: Displays the master recurring rules table/cards with active status, weekday patterns, shifts, date ranges, and management buttons.

---

## 4. Safely Editing a Recurring Schedule

To correct a schedule or adjust future lesson times:
1. In the **Doimiy dars qoidalari** view, click **Tahrirlash (Edit)** on the target schedule.
2. Select your desired **Tahrirlash qamrovi (Update Scope)**:
   * **Faqat kelgusi darslarni yangilash (FUTURE_ONLY - Recommended)**: Updates only uncompleted lessons from today forward. Past lessons, completed lessons, and attendance records remain untouched.
   * **Barcha yakunlanmagan darslarni yangilash (ALL_UNCOMPLETED)**: Recalculates all uncompleted scheduled lessons.
3. Update the subject, mentor, room, weekday pattern, shift, or date range.
4. Click **Dars Jadvalini Saqlash**. The engine recalculates future occurrences safely.

---

## 5. Archiving or Deleting a Schedule

* **Arxivlash (Archive)**: Sets schedule status to `ARCHIVED`. Existing calendar sessions remain in the calendar.
* **O‘chirish (Delete)**:
  * Future uncompleted sessions are removed from the schedule.
  * **Historical Safety Guarantee**: Completed lessons and student attendance records are permanently preserved and detached from the deleted rule.

---

## 6. Managing Individual Calendar Sessions

On any calendar session card:
* **Davomat olish / tahrirlash (Take Attendance)**: Opens the interactive attendance sheet to mark `Hozir (Present)`, `Kelmadi (Absent)`, `Kechikdi (Late)`, or `Sababli (Excused)`. Submitting completes the lesson.
* **Darsni ko‘chirish (Reschedule)**: Allows shifting an individual session to a new date, time, and room with automatic collision check.
* **Bekor qilish (Cancel)**: Prompts for a cancellation reason (e.g. "Xona ta'miri") and marks the session as `CANCELLED`.
* **Qayta tiklash (Restore)**: If a lesson was cancelled by mistake, click **Qayta tiklash** to return it to `SCHEDULED` status.
