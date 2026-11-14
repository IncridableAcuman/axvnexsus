# AXV NEXUS — REAL TIMETABLE & FLEXIBLE TIME SLOT MANAGEMENT
## Real-World Timetable Implementation & Conflict Verification

**Status:** Successfully Implemented & Verified  
**Milestone:** Real Timetable & Flexible Time Slot Management  
**Date:** 2026-11-14  
**Author:** Antigravity AI  

---

## 1. Executive Summary & Objective

The AXV Nexus platform's scheduling system has been augmented to support real-world lesson time configurations, administrator-managed time slots, and reliable weekly recurring schedules while strictly preserving existing live schedules (`YA-24I1105` and `YA-26I0804`).

---

## 2. Preservation of Existing Real Schedules

The following actual existing schedules from the AXV Nexus timetable are preserved without modification:

| Cohort / Group | Grade Level | Days Pattern | Weekdays | Start Time | End Time | Room | Branch |
|---|---|---|---|---|---|---|---|
| **YA-26I0804** | 8-sinf | `EVEN_DAYS` | Tuesday, Thursday, Saturday | `15:00` | `16:30` | IT-2 | IT Park Yangiariq |
| **YA-24I1105** | 11-sinf | `ODD_DAYS` | Monday, Wednesday, Friday | `16:30` | `18:00` | IT-2 | IT Park Yangiariq |

These cohorts remain completely functional with their mentors, rooms, student memberships, and attendance records intact.

---

## 3. Supported Configurable Time Slots

The administrator can manage available lesson time slots dynamically:

| Slot Name (UZ) | Slot Name (EN) | Default Start | Default End | Duration | Default Order | Default Status |
|---|---|---|---|---|---|---|
| **Ertalabki smena** | Morning Slot | `09:30` | `11:00` | 90 min | 1 | Faol (Active) |
| **Tushdan keyingi** | Afternoon Slot | `15:00` | `16:30` | 90 min | 2 | Faol (Active) |
| **Kechki smena** | Evening Slot | `16:30` | `18:00` | 90 min | 3 | Faol (Active) |

Administrators can add additional shifts, edit existing slots, change display order, or toggle active status directly from the Admin Control Center without modifying code.

---

## 4. End-to-End Recurring Schedule Creation Workflow

In the "Yangi Dars Jadvalini Qo'shish" modal (`ManualScheduleModal.tsx`):
1. **Educational Grade:** Select 8-sinf, 9-sinf, 10-sinf, or 11-sinf.
2. **Group Identifier:** Choose an existing group (auto-populating course, room, mentor, and timetable slot) or type a new group code.
3. **Subject / Course:** Enter course curriculum title.
4. **Mentor Allocation:** Choose from registered mentors; role and branch location auto-populate.
5. **Academic Weekday Pattern:**
   - Toq kunlar (`ODD_DAYS`): Monday, Wednesday, Friday.
   - Juft kunlar (`EVEN_DAYS`): Tuesday, Thursday, Saturday.
   - Barcha 6 kun (`ALL_SIX_DAYS`): Monday through Saturday.
   - Maxsus kunlar (`CUSTOM`): Any combination of Monday through Saturday (Sunday strictly excluded).
6. **Flexible Time Slot:**
   - Predefined time slot dropdown (`09:30–11:00`, `15:00–16:30`, `16:30–18:00`).
   - "Maxsus vaqt oralig'i (Custom)" option allows arbitrary valid 24-hour ranges.
7. **Room / Lab Allocation:** IT Lab 1, IT-2, Lab AI 3, etc.
8. **Student Bulk Roster:** Paste student names directly.
9. **Review & Validation:** Selected pattern and time summary previewed prior to saving.
10. **Save & Conflict Check:** Evaluates mentor, room, and group overlaps across actual intervals.

---

## 5. Conflict Resolution Matrix

| Scenario | Existing Schedule | New Schedule | Weekday Overlap? | Time Overlap? | Outcome |
|---|---|---|---|---|---|
| **Disjoint Weekdays** | Mon, Wed, Fri (16:30–18:00) | Tue, Thu, Sat (16:30–18:00) | No | Yes (Same time) | **No Conflict (Valid)** |
| **Same Weekday, Overlapping** | Mon, Wed, Fri (16:30–18:00) | Mon (17:00–18:30) | Yes (Mon) | Yes ($17:00 < 18:00$) | **Conflict (Rejected)** |
| **Same Weekday, Adjacent** | Mon (15:00–16:30) | Mon (16:30–18:00) | Yes (Mon) | No ($16:30 \ngtr 16:30$) | **No Conflict (Valid)** |
| **Reversed Time** | — | Any (15:00–14:30) | — | Invalid ($s \ge e$) | **Validation Error (Rejected)** |
