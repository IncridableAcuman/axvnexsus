# AXV Nexus — Gamification Engine: Reward Rules & Progression Matrix

This document defines the reward policies, progression curves, streak calculation rules, and achievement specifications for AXV Nexus (Al-Xorazmiy Vorislari Hub).

---

## 1. XP Reward Rules Matrix

All XP awards are driven by configuration keys in `gamification_configurations` and managed via `GamificationConfigService`.

| Category | Event Name | Default XP | Config Key | Eligibility Condition | Idempotency Key Format |
|---|---|---:|---|---|---|
| **Quiz** | Quiz Completed | 10 XP | `quiz.completion.xp` | Valid assessment attempt submission | `QUIZ_COMPLETE_<attemptId>` |
| **Quiz** | Quiz Passed | 20 XP | `quiz.passing.xp` | Score percentage >= passing threshold (e.g. 60%) | `QUIZ_PASS_<attemptId>` |
| **Quiz** | Quiz High Score | 30 XP | `quiz.highscore.xp` | Score percentage >= 90.0% | `QUIZ_HIGH_<attemptId>` |
| **Quiz** | Perfect Score Bonus | 50 XP | Achievement reward | Score percentage == 100.0% | `ACHIEVEMENT_PERFECT_SCORE_<attemptId>` |
| **Assignment**| Assignment Completed | 15 XP | `assignment.completion.xp` | Valid submission graded by teacher/mentor | `ASSIGNMENT_COMPLETE_<submissionId>` |
| **Assignment**| Submitted On-Time | 10 XP | `assignment.ontime.xp` | Submission timestamp <= assignment due date | `ASSIGNMENT_ONTIME_<submissionId>` |
| **Assignment**| Excellent Evaluation | 25 XP | `assignment.excellent.xp` | Grade score percentage >= 90.0% | `ASSIGNMENT_EXCELLENT_<submissionId>` |
| **Lesson** | Attended / Completed | 5 XP | `lesson.completion.xp` | Student marked present or lesson finished | `LESSON_COMPLETE_<lessonId>_<studentId>` |
| **Streak** | Daily Streak Maintained | 15 XP | `streak.daily.xp` | At least 1 qualifying activity on calendar day | `STREAK_<date>_<studentId>` |
| **Milestone** | 3-Day Streak | 25 XP | `streak.milestone.3` | Contiguous streak reaches 3 days | `ACHIEVEMENT_STREAK_3_<studentId>` |
| **Milestone** | 7-Day Streak | 100 XP | `streak.milestone.7` | Contiguous streak reaches 7 days | `ACHIEVEMENT_STREAK_7_<studentId>` |
| **Milestone** | 14-Day Streak | 200 XP | `streak.milestone.14` | Contiguous streak reaches 14 days | `ACHIEVEMENT_STREAK_14_<studentId>` |
| **Milestone** | 30-Day Streak | 500 XP | `streak.milestone.30` | Contiguous streak reaches 30 days | `ACHIEVEMENT_STREAK_30_<studentId>` |
| **Milestone** | 60-Day Streak | 1,000 XP | `streak.milestone.60` | Contiguous streak reaches 60 days | `ACHIEVEMENT_STREAK_60_<studentId>` |
| **Milestone** | 100-Day Streak | 2,000 XP | `streak.milestone.100` | Contiguous streak reaches 100 days | `ACHIEVEMENT_STREAK_100_<studentId>` |
| **Admin** | Manual Adjustment | Variable | N/A | Approved administrative adjustment | Unique admin transaction reference |

---

## 2. Streak Engine & Timezone Policy

### 2.1 Timezone Specification
- **Academic Timezone**: `Asia/Tashkent` (`UTC+5`).
- The date of an activity is determined using:
  ```java
  LocalDate activityDate = ZonedDateTime.now(ZoneId.of("Asia/Tashkent")).toLocalDate();
  ```
- No client-supplied timezones or system server UTC timezones are used to determine calendar boundaries.

### 2.2 Streak Progression Rules
1. **First Qualifying Activity**:
   - If `last_activity_date` is `null`: `current_streak = 1`, `longest_streak = 1`.
2. **Same Calendar Day**:
   - If `activityDate.equals(last_activity_date)`: Idempotent no-op. Streak remains unchanged; no duplicate daily streak XP is awarded.
3. **Consecutive Calendar Day**:
   - If `activityDate.equals(last_activity_date.plusDays(1))`:
     - `current_streak += 1`
     - `longest_streak = Math.max(longest_streak, current_streak)`
     - Award `streak.daily.xp` (15 XP).
     - Evaluate milestone thresholds (3, 7, 14, 30, 60, 100).
4. **Missed Exactly One Day (`daysDiff == 2`)**:
   - If `streak_freeze_count > 0` AND no freeze has been recorded for `yesterday`:
     - Deduct 1 freeze: `streak_freeze_count -= 1`.
     - Record `streak_freeze_history` with `action_type = 'AUTO_CONSUMED'` and `used_date = yesterday`.
     - Streak is preserved: `current_streak += 1`, `longest_streak = Math.max(longest_streak, current_streak)`.
   - If `streak_freeze_count == 0`:
     - Streak breaks: `current_streak = 1`.
5. **Missed More Than One Day (`daysDiff > 2`)**:
   - Streak breaks regardless of freeze count: `current_streak = 1`. (A freeze protects only a single isolated missed day).

---

## 3. Streak Freeze Protection Rules

1. **Balance Constraint**: Freezes can only be consumed if `streak_freeze_count > 0`.
2. **Single-Day Scope**: A freeze protects exactly one calendar date (`used_date`).
3. **Idempotency & Duplicate Prevention**:
   - Protected by a partial unique index on `streak_freeze_history(student_id, used_date)` where `action_type IN ('AUTO_CONSUMED', 'MANUAL_USED')`.
   - Cannot consume two freezes for the same missed day.
4. **Acquisition**:
   - Granted by administrators via `POST /api/grading/streaks/student/{studentId}/freeze/grant`.
   - Awarded automatically upon hitting certain multi-week streak milestones (optional).

---

## 4. Achievement Catalog & Criteria

Achievements are categorized into 4 domain categories and 4 rarity tiers.

| Code | Title | Category | Rarity | Criteria Type | Threshold | XP Reward |
|---|---|---|---|---|---:|---:|
| `FIRST_QUIZ` | Birinchi Qadam | LEARNING | COMMON | QUIZ_COUNT | 1 | 25 XP |
| `QUIZ_10` | Test Sinovchisi | LEARNING | COMMON | QUIZ_COUNT | 10 | 100 XP |
| `QUIZ_50` | Bilimdon | LEARNING | RARE | QUIZ_COUNT | 50 | 300 XP |
| `QUIZ_100` | Test Grossmeysteri | LEARNING | EPIC | QUIZ_COUNT | 100 | 1,000 XP |
| `FIRST_ASSIGNMENT` | Amaliyotchi | LEARNING | COMMON | ASSIGNMENT_COUNT | 1 | 25 XP |
| `FIRST_LESSON` | Faol Tinglovchi | LEARNING | COMMON | LESSON_COUNT | 1 | 20 XP |
| `PERFECT_SCORE` | Mukammal Natija | PERFORMANCE | RARE | PERFECT_SCORE | 1 | 50 XP |
| `QUIZ_MASTER` | Viktorina Qiroli | PERFORMANCE | EPIC | HIGH_SCORE_COUNT | 10 | 250 XP |
| `EXCELLENT_STUDENT` | A'lochi O'quvchi | PERFORMANCE | EPIC | ASSIGNMENT_EXCELLENT | 5 | 200 XP |
| `STREAK_3` | Olovli Boshlanish | CONSISTENCY | COMMON | STREAK_DAYS | 3 | 25 XP |
| `STREAK_7` | Bir Haftalik Intizom | CONSISTENCY | COMMON | STREAK_DAYS | 7 | 100 XP |
| `STREAK_14` | Ikki Haftalik Izchillik | CONSISTENCY | RARE | STREAK_DAYS | 14 | 200 XP |
| `STREAK_30` | Temir Iroda | CONSISTENCY | EPIC | STREAK_DAYS | 30 | 500 XP |
| `STREAK_60` | Oltin Marom | CONSISTENCY | EPIC | STREAK_DAYS | 60 | 1,000 XP |
| `STREAK_100` | Afsonaviy Intizom | CONSISTENCY | LEGENDARY | STREAK_DAYS | 100 | 2,000 XP |
| `XP_100` | Dastlabki Yutuq | PROGRESSION | COMMON | XP_TOTAL | 100 | 20 XP |
| `XP_500` | Tez Rivojlanayotgan | PROGRESSION | COMMON | XP_TOTAL | 500 | 50 XP |
| `XP_1000` | Minglik Cho'qqi | PROGRESSION | RARE | XP_TOTAL | 1,000 | 100 XP |
| `XP_5000` | Tajribali Ustoz | PROGRESSION | EPIC | XP_TOTAL | 5,000 | 500 XP |
| `XP_10000` | Afsonaviy Bilimdon | PROGRESSION | LEGENDARY | XP_TOTAL | 10,000 | 1,000 XP |

---

## 5. 10-Tier Level Progression Curve

Student levels are dynamically calculated from total accumulated XP. Levels never decrease even if XP transactions are audited or filtered.

| Level | Title (English) | Unvon (O'zbekcha) | Minimum XP | XP to Next Level | Badge Color |
|---:|---|---|---:|---:|---|
| **1** | Beginner | Boshlovchi | 0 XP | 100 XP | Slate Grey (`#94A3B8`) |
| **2** | Explorer | Izlanuvchi | 100 XP | 200 XP | Sky Blue (`#38BDF8`) |
| **3** | Learner | O'rganuvchi | 300 XP | 300 XP | Emerald Green (`#10B981`) |
| **4** | Practitioner | Amaliyotchi | 600 XP | 400 XP | Amber Gold (`#F59E0B`) |
| **5** | Skilled | Mahoratli | 1,000 XP | 500 XP | Indigo (`#6366F1`) |
| **6** | Advanced | Ilg'or | 1,500 XP | 1,000 XP | Violet (`#8B5CF6`) |
| **7** | Expert | Ekspert | 2,500 XP | 1,500 XP | Fuchsia (`#D946EF`) |
| **8** | Master | Usta | 4,000 XP | 2,000 XP | Rose Red (`#F43F5E`) |
| **9** | Champion | Chempion | 6,000 XP | 4,000 XP | Electric Cyan (`#06B6D4`) |
| **10** | Legend | Afsona | 10,000 XP | MAX (0 XP) | Radiant Gold (`#EAB308`) |

### Level Calculation Formula
```
Current Level L is the highest tier where totalXP >= threshold(L).
Progress Percentage = (totalXP - threshold(L)) / (threshold(L+1) - threshold(L)) * 100%
For Level 10 (Legend), Progress Percentage = 100.0%.
```
