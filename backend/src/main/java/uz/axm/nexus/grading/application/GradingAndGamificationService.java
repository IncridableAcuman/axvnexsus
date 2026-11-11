package uz.axm.nexus.grading.application;

import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.grading.domain.Achievement;
import uz.axm.nexus.grading.domain.GradeRecord;
import uz.axm.nexus.grading.domain.PointTransaction;
import uz.axm.nexus.grading.domain.StudentAchievement;
import uz.axm.nexus.grading.domain.StudentStreak;
import uz.axm.nexus.grading.infrastructure.AchievementRepository;
import uz.axm.nexus.grading.infrastructure.GradeRecordRepository;
import uz.axm.nexus.grading.infrastructure.PointTransactionRepository;
import uz.axm.nexus.grading.infrastructure.StudentAchievementRepository;
import uz.axm.nexus.grading.infrastructure.StudentStreakRepository;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.infrastructure.StudentRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GradingAndGamificationService {

    private final GradeRecordRepository gradeRecordRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final AchievementRepository achievementRepository;
    private final StudentAchievementRepository studentAchievementRepository;
    private final StudentRepository studentRepository;
    private final StudentStreakRepository studentStreakRepository;

    @PostConstruct
    public void initDefaultAchievements() {
        if (achievementRepository.count() == 0) {
            List<Achievement> defaults = List.of(
                    Achievement.builder()
                            .code("FIRST_PERFECT_TEST")
                            .title("100% Natija")
                            .description("Birinchi marta testdan 100 ball to'plash")
                            .icon("Award")
                            .badgeColor("emerald")
                            .category("ASSESSMENT")
                            .xpReward(100)
                            .criteriaType("ASSESSMENT_SCORE")
                            .criteriaThreshold(100)
                            .isActive(true)
                            .build(),
                    Achievement.builder()
                            .code("STREAK_3_DAYS")
                            .title("Olovli Start")
                            .description("Ketma-ket 3 kun platformada faol bo'lish")
                            .icon("Flame")
                            .badgeColor("amber")
                            .category("STREAK")
                            .xpReward(30)
                            .criteriaType("DAILY_STREAK")
                            .criteriaThreshold(3)
                            .isActive(true)
                            .build(),
                    Achievement.builder()
                            .code("STREAK_7_DAYS")
                            .title("Haftalik Qahramon")
                            .description("Ketma-ket 7 kun platformada uzluksiz o'rganish")
                            .icon("Flame")
                            .badgeColor("orange")
                            .category("STREAK")
                            .xpReward(100)
                            .criteriaType("DAILY_STREAK")
                            .criteriaThreshold(7)
                            .isActive(true)
                            .build(),
                    Achievement.builder()
                            .code("STREAK_14_DAYS")
                            .title("Temir Intizom")
                            .description("Ketma-ket 14 kun uzluksiz ta'lim olish")
                            .icon("Zap")
                            .badgeColor("blue")
                            .category("STREAK")
                            .xpReward(250)
                            .criteriaType("DAILY_STREAK")
                            .criteriaThreshold(14)
                            .isActive(true)
                            .build(),
                    Achievement.builder()
                            .code("STREAK_30_DAYS")
                            .title("Afsonaviy Odat")
                            .description("Ketma-ket 30 kun uzluksiz o'rganish va testlar yechish")
                            .icon("Trophy")
                            .badgeColor("gold")
                            .category("STREAK")
                            .xpReward(500)
                            .criteriaType("DAILY_STREAK")
                            .criteriaThreshold(30)
                            .isActive(true)
                            .build(),
                    Achievement.builder()
                            .code("TEST_EXPERT")
                            .title("Bilimdon Tester")
                            .description("3 ta real testni muvaffaqiyatli topshirish")
                            .icon("Award")
                            .badgeColor("emerald")
                            .category("ASSESSMENT")
                            .xpReward(150)
                            .criteriaType("TESTS_COMPLETED")
                            .criteriaThreshold(3)
                            .isActive(true)
                            .build(),
                    Achievement.builder()
                            .code("PRACTICAL_HERO")
                            .title("Master Dasturchi")
                            .description("3 ta amaliy loyihani a'lo baho bilan topshirish")
                            .icon("Code2")
                            .badgeColor("blue")
                            .category("PROJECT")
                            .xpReward(200)
                            .criteriaType("PROJECTS_COUNT")
                            .criteriaThreshold(3)
                            .isActive(true)
                            .build(),
                    Achievement.builder()
                            .code("POINTS_500_MILESTONE")
                            .title("500 XP Chempioni")
                            .description("Platformada jami 500 ball chegarasini bosib o'tish")
                            .icon("Zap")
                            .badgeColor("purple")
                            .category("MASTERY")
                            .xpReward(50)
                            .criteriaType("TOTAL_POINTS")
                            .criteriaThreshold(500)
                            .isActive(true)
                            .build(),
                    Achievement.builder()
                            .code("POINTS_1000_LEGEND")
                            .title("Nexus Afsonasi")
                            .description("1000 XP ga erishgan oliy toifali o'quvchi")
                            .icon("Trophy")
                            .badgeColor("gold")
                            .category("MASTERY")
                            .xpReward(250)
                            .criteriaType("TOTAL_POINTS")
                            .criteriaThreshold(1000)
                            .isActive(true)
                            .build()
            );
            achievementRepository.saveAll(defaults);
            log.info("Standart gamifikatsiya yutuqlari (Achievements va Streaklar) bazaga yuklandi.");
        }
    }

    // =========================================================================
    // 1. ACADEMIC GRADES (Baholar qaydnomasi)
    // =========================================================================

    @Transactional
    public GradeRecord recordGrade(GradeRecord record) {
        if (record.getScore() == null || record.getScore() < 0 || record.getScore() > 100) {
            throw new IllegalArgumentException("Akademik baho 0 dan 100 gacha bo'lishi shart!");
        }

        record.setLetterGrade(calculateLetterGrade(record.getScore()));
        record.setIsPassing(record.getScore() >= 60);
        record.setCreatedAt(LocalDateTime.now());

        GradeRecord saved = gradeRecordRepository.save(record);

        // Also award gamification XP in a separate audit transaction
        String idempKey = "grade_" + saved.getId() + "_" + System.currentTimeMillis();
        awardPoints(
                record.getStudentId(),
                record.getScore(),
                "ACADEMIC_EVALUATION",
                String.valueOf(saved.getId()),
                "GradeRecord",
                idempKey,
                record.getSubject() + " fanidan " + record.getEvaluationType() + " baholandi: " + record.getScore() + " ball",
                record.getMentorId()
        );

        return saved;
    }

    public List<GradeRecord> getStudentGrades(Long studentId) {
        return gradeRecordRepository.findByStudentId(studentId);
    }

    // =========================================================================
    // 2. GAMIFICATION POINTS & AUDITABLE TRANSACTIONS
    // =========================================================================

    /**
     * Awards points safely with idempotency guarantee to prevent double-spending/duplicate awards.
     */
    @Transactional
    public PointTransaction awardPoints(
            Long studentId,
            int amount,
            String pointSource,
            String referenceId,
            String referenceType,
            String idempotencyKey,
            String reason,
            Long awardedByUserId
    ) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Har bir ball tranzaksiyasi uchun aniq sabab (reason) ko'rsatilishi shart!");
        }

        // Idempotency check: if transaction with this key was already recorded, return it
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<PointTransaction> existing = pointTransactionRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                log.info("Takroriy ball berish rad etildi (Idempotent): Key={}", idempotencyKey);
                return existing.get();
            }
        }

        PointTransaction tx = PointTransaction.builder()
                .studentId(studentId)
                .amount(amount)
                .pointSource(pointSource != null ? pointSource.toUpperCase() : "GENERAL")
                .referenceId(referenceId)
                .referenceType(referenceType)
                .idempotencyKey(idempotencyKey)
                .reason(reason.trim())
                .awardedByUserId(awardedByUserId)
                .createdAt(LocalDateTime.now())
                .build();

        PointTransaction saved = pointTransactionRepository.save(tx);
        log.info("Ball berildi: StudentID={}, Amount={}, Source={}, Reason={}", studentId, amount, pointSource, reason);

        // Check if this award unlocks new milestone achievements
        checkMilestoneAchievements(studentId);

        return saved;
    }

    /**
     * Traceable score adjustment with explicit justification.
     */
    @Transactional
    public PointTransaction recordAdjustment(Long studentId, int deltaAmount, String reason, Long authorizedUserId) {
        if (reason == null || reason.length() < 5) {
            throw new IllegalArgumentException("Ballni to'g'rilash (Adjustment) uchun batafsil izoh (kamida 5 ta belgi) talab etiladi!");
        }

        String idempKey = "adj_" + studentId + "_" + System.currentTimeMillis();
        return awardPoints(
                studentId,
                deltaAmount,
                "ADJUSTMENT",
                null,
                "ManualAdjustment",
                idempKey,
                "Korrektirovka: " + reason,
                authorizedUserId
        );
    }

    public List<PointTransaction> getStudentPointTransactions(Long studentId) {
        return pointTransactionRepository.findByStudentIdOrderByCreatedAtDesc(studentId);
    }

    public int getStudentTotalPoints(Long studentId) {
        return pointTransactionRepository.getTotalPointsByStudent(studentId);
    }

    // =========================================================================
    // 3. DAILY STREAK MANAGEMENT (Kunlik uzluksiz intizom va bonuslar)
    // =========================================================================

    /**
     * Records daily activity for a student (Daily Check-in, Quiz submission, Assignment submit).
     * Calculates consecutive days, freeze protection, milestone bonuses and XP awards.
     */
    @Transactional
    public StreakCheckInResult recordDailyActivity(Long studentId, String activityType) {
        LocalDate today = LocalDate.now();
        StudentStreak streak = studentStreakRepository.findByStudentId(studentId)
                .orElseGet(() -> StudentStreak.builder()
                        .studentId(studentId)
                        .currentStreak(0)
                        .longestStreak(0)
                        .streakFreezeCount(1)
                        .totalActiveDays(0)
                        .createdAt(LocalDateTime.now())
                        .build());

        LocalDate last = streak.getLastActivityDate();

        // 1. Agar bugun allaqachon faollik qayd etilgan bo'lsa
        if (last != null && last.equals(today)) {
            return StreakCheckInResult.builder()
                    .studentId(studentId)
                    .alreadyRecorded(true)
                    .currentStreak(streak.getCurrentStreak())
                    .longestStreak(streak.getLongestStreak())
                    .bonusXpEarned(0)
                    .message("Bugun uchun kunlik faollik allaqachon qayd etilgan! Olovli streak davom etmoqda 🔥")
                    .lastActivityDate(today)
                    .streakFreezeAvailable(streak.getStreakFreezeCount() != null && streak.getStreakFreezeCount() > 0)
                    .build();
        }

        boolean isConsecutive = (last != null && last.equals(today.minusDays(1)));
        boolean usedFreeze = false;

        if (isConsecutive) {
            streak.setCurrentStreak(streak.getCurrentStreak() + 1);
        } else if (last != null && last.equals(today.minusDays(2)) && streak.getStreakFreezeCount() != null && streak.getStreakFreezeCount() > 0) {
            // Bir kun o'tkazib yuborilgan, ammo muzlatgich (freeze) orqali saqlab qolindi
            usedFreeze = true;
            streak.setStreakFreezeCount(streak.getStreakFreezeCount() - 1);
            streak.setCurrentStreak(streak.getCurrentStreak() + 1);
        } else {
            // Yangi streak boshlanishi
            streak.setCurrentStreak(1);
        }

        if (streak.getCurrentStreak() > (streak.getLongestStreak() != null ? streak.getLongestStreak() : 0)) {
            streak.setLongestStreak(streak.getCurrentStreak());
        }

        streak.setTotalActiveDays((streak.getTotalActiveDays() != null ? streak.getTotalActiveDays() : 0) + 1);
        streak.setLastActivityDate(today);
        streak.setUpdatedAt(LocalDateTime.now());
        studentStreakRepository.save(streak);

        // Kunlik bazaviy streak XP mukofoti (+15 XP)
        int totalBonusXp = 15;
        String idempKey = "daily_streak_" + studentId + "_" + today;
        awardPoints(
                studentId,
                15,
                "DAILY_STREAK",
                today.toString(),
                "DailyStreak",
                idempKey,
                "Kunlik streak faolligi (" + streak.getCurrentStreak() + "-kun) 🔥",
                null
        );

        // Streak marralari (Milestones) bonuslari
        int curStreak = streak.getCurrentStreak();
        if (curStreak == 3) {
            awardPoints(studentId, 30, "ACHIEVEMENT_UNLOCKED", "3_DAYS", "Milestone",
                    "milestone_3d_" + studentId + "_" + today, "3 kunlik olovli streak bonusi! 🔥", null);
            unlockAchievementIfEligible(studentId, "STREAK_3_DAYS");
            totalBonusXp += 30;
        } else if (curStreak == 7) {
            awardPoints(studentId, 100, "ACHIEVEMENT_UNLOCKED", "7_DAYS", "Milestone",
                    "milestone_7d_" + studentId + "_" + today, "7 kunlik haftalik intizom bonusi! 🏆", null);
            unlockAchievementIfEligible(studentId, "STREAK_7_DAYS");
            totalBonusXp += 100;
        } else if (curStreak == 14) {
            awardPoints(studentId, 250, "ACHIEVEMENT_UNLOCKED", "14_DAYS", "Milestone",
                    "milestone_14d_" + studentId + "_" + today, "14 kunlik temir intizom bonusi! ⚡", null);
            unlockAchievementIfEligible(studentId, "STREAK_14_DAYS");
            totalBonusXp += 250;
        } else if (curStreak == 30) {
            awardPoints(studentId, 500, "ACHIEVEMENT_UNLOCKED", "30_DAYS", "Milestone",
                    "milestone_30d_" + studentId + "_" + today, "30 kunlik afsonaviy streak bonusi! 👑", null);
            unlockAchievementIfEligible(studentId, "STREAK_30_DAYS");
            totalBonusXp += 500;
        }

        String msg = usedFreeze
                ? "Muzlatgich (Freeze) yordamida uzluksiz intizom saqlab qolindi! " + curStreak + "-kun davom etmoqda 🔥"
                : (isConsecutive
                ? "Olovli streak davom etmoqda: " + curStreak + "-kun! +" + totalBonusXp + " XP berildi 🔥"
                : "Yangi streak boshlandi: 1-kun! Har kuni mashq qiling va ballar to'plang 🔥");

        return StreakCheckInResult.builder()
                .studentId(studentId)
                .alreadyRecorded(false)
                .currentStreak(streak.getCurrentStreak())
                .longestStreak(streak.getLongestStreak())
                .bonusXpEarned(totalBonusXp)
                .message(msg)
                .lastActivityDate(today)
                .streakFreezeAvailable(streak.getStreakFreezeCount() != null && streak.getStreakFreezeCount() > 0)
                .build();
    }

    public StreakStatusDto getStudentStreak(Long studentId) {
        LocalDate today = LocalDate.now();
        StudentStreak streak = studentStreakRepository.findByStudentId(studentId)
                .orElseGet(() -> StudentStreak.builder()
                        .studentId(studentId)
                        .currentStreak(0)
                        .longestStreak(0)
                        .streakFreezeCount(1)
                        .totalActiveDays(0)
                        .build());

        boolean checkedInToday = streak.getLastActivityDate() != null && streak.getLastActivityDate().equals(today);
        int activeStreak = streak.getCurrentStreak() != null ? streak.getCurrentStreak() : 0;

        if (!checkedInToday && streak.getLastActivityDate() != null && streak.getLastActivityDate().isBefore(today.minusDays(1))) {
            if (streak.getLastActivityDate().equals(today.minusDays(2)) && streak.getStreakFreezeCount() != null && streak.getStreakFreezeCount() > 0) {
                // Freeze orqali bugun tiklash imkoniyati bor
            } else {
                activeStreak = 0;
            }
        }

        int nextMilestone = activeStreak < 3 ? 3 : (activeStreak < 7 ? 7 : (activeStreak < 14 ? 14 : 30));
        int nextReward = activeStreak < 3 ? 30 : (activeStreak < 7 ? 100 : (activeStreak < 14 ? 250 : 500));

        return StreakStatusDto.builder()
                .studentId(studentId)
                .currentStreak(activeStreak)
                .longestStreak(streak.getLongestStreak() != null ? streak.getLongestStreak() : activeStreak)
                .checkedInToday(checkedInToday)
                .lastActivityDate(streak.getLastActivityDate())
                .streakFreezeCount(streak.getStreakFreezeCount() != null ? streak.getStreakFreezeCount() : 0)
                .totalActiveDays(streak.getTotalActiveDays() != null ? streak.getTotalActiveDays() : 0)
                .nextMilestoneDays(nextMilestone)
                .nextMilestoneReward(nextReward)
                .build();
    }

    // =========================================================================
    // 4. PLAYER LEVELS & XP PROGRESSION SYSTEM
    // =========================================================================

    public static LevelInfo calculateLevel(int totalXp) {
        if (totalXp >= 2000) {
            return LevelInfo.builder()
                    .level(5)
                    .title("Nexus Grandmaster / Al-Xorazmiy Vorisi")
                    .minXp(2000)
                    .maxXp(3000)
                    .progressPercent(100.0)
                    .badgeName("Grandmaster")
                    .color("amber")
                    .build();
        } else if (totalXp >= 1000) {
            double pct = ((double) (totalXp - 1000) / 1000.0) * 100.0;
            return LevelInfo.builder()
                    .level(4)
                    .title("Senior Dasturchi (Master)")
                    .minXp(1000)
                    .maxXp(2000)
                    .progressPercent(Math.min(100.0, Math.round(pct * 10.0) / 10.0))
                    .badgeName("Senior")
                    .color("purple")
                    .build();
        } else if (totalXp >= 500) {
            double pct = ((double) (totalXp - 500) / 500.0) * 100.0;
            return LevelInfo.builder()
                    .level(3)
                    .title("Faol Kodlovchi (Developer)")
                    .minXp(500)
                    .maxXp(1000)
                    .progressPercent(Math.min(100.0, Math.round(pct * 10.0) / 10.0))
                    .badgeName("Developer")
                    .color("blue")
                    .build();
        } else if (totalXp >= 200) {
            double pct = ((double) (totalXp - 200) / 300.0) * 100.0;
            return LevelInfo.builder()
                    .level(2)
                    .title("Yosh Izlanuvchi (Junior)")
                    .minXp(200)
                    .maxXp(500)
                    .progressPercent(Math.min(100.0, Math.round(pct * 10.0) / 10.0))
                    .badgeName("Junior")
                    .color("emerald")
                    .build();
        } else {
            double pct = ((double) Math.max(0, totalXp) / 200.0) * 100.0;
            return LevelInfo.builder()
                    .level(1)
                    .title("Yangi Boshlovchi (Novice)")
                    .minXp(0)
                    .maxXp(200)
                    .progressPercent(Math.min(100.0, Math.round(pct * 10.0) / 10.0))
                    .badgeName("Novice")
                    .color("slate")
                    .build();
        }
    }

    // =========================================================================
    // 5. LEADERBOARDS WITH STREAK, LEVEL & GROUP AGGREGATIONS
    // =========================================================================

    public List<LeaderboardEntry> getLeaderboard(String period) {
        LocalDateTime since = null;
        if ("WEEKLY".equalsIgnoreCase(period)) {
            since = LocalDateTime.now().minusDays(7);
        } else if ("MONTHLY".equalsIgnoreCase(period)) {
            since = LocalDateTime.now().minusDays(30);
        }

        List<Object[]> rawData = (since == null)
                ? pointTransactionRepository.getLeaderboardDataAllTime()
                : pointTransactionRepository.getLeaderboardDataSince(since);
        List<LeaderboardEntry> entries = new ArrayList<>();

        Map<Long, Student> studentMap = new HashMap<>();
        List<Student> allStudents = studentRepository.findAll();
        for (Student s : allStudents) {
            studentMap.put(s.getId(), s);
        }

        Map<Long, StudentStreak> streakMap = new HashMap<>();
        for (StudentStreak st : studentStreakRepository.findAll()) {
            streakMap.put(st.getStudentId(), st);
        }

        LocalDate today = LocalDate.now();
        int rank = 1;
        for (Object[] row : rawData) {
            Long studentId = ((Number) row[0]).longValue();
            int total = ((Number) row[1]).intValue();
            int maxSingle = row[2] != null ? ((Number) row[2]).intValue() : 0;
            LocalDateTime earliest = (LocalDateTime) row[3];

            Student student = studentMap.get(studentId);
            String displayName = maskStudentName(student, studentId);
            String groupName = (student != null && student.getStudyGroup() != null) ? student.getStudyGroup().getGroupCode() : "Biriktirilmagan";
            String gradeLevel = (student != null) ? student.getGradeLevel() : "N/A";

            StudentStreak streak = streakMap.get(studentId);
            int curStreak = 0;
            int longestStreak = 0;
            if (streak != null) {
                longestStreak = streak.getLongestStreak() != null ? streak.getLongestStreak() : 0;
                boolean isToday = streak.getLastActivityDate() != null && streak.getLastActivityDate().equals(today);
                boolean isYesterday = streak.getLastActivityDate() != null && streak.getLastActivityDate().equals(today.minusDays(1));
                if (isToday || isYesterday) {
                    curStreak = streak.getCurrentStreak() != null ? streak.getCurrentStreak() : 0;
                }
            }

            LevelInfo lvl = calculateLevel(total);

            entries.add(LeaderboardEntry.builder()
                    .rank(rank++)
                    .studentId(studentId)
                    .displayName(displayName)
                    .groupName(groupName)
                    .gradeLevel(gradeLevel)
                    .totalPoints(total)
                    .highestSingleAward(maxSingle)
                    .earliestAchievedAt(earliest)
                    .badgeCount(studentAchievementRepository.findByStudentId(studentId).size())
                    .currentStreak(curStreak)
                    .longestStreak(longestStreak)
                    .level(lvl.getLevel())
                    .levelName(lvl.getTitle())
                    .build());
        }

        return entries;
    }

    public List<GroupLeaderboardEntry> getGroupLeaderboard() {
        List<LeaderboardEntry> individualEntries = getLeaderboard("ALL_TIME");
        Map<String, List<Integer>> groupScores = new HashMap<>();

        for (LeaderboardEntry e : individualEntries) {
            groupScores.computeIfAbsent(e.getGroupName(), k -> new ArrayList<>()).add(e.getTotalPoints());
        }

        List<GroupLeaderboardEntry> groupEntries = new ArrayList<>();
        int rank = 1;
        for (Map.Entry<String, List<Integer>> entry : groupScores.entrySet()) {
            int count = entry.getValue().size();
            int sum = entry.getValue().stream().mapToInt(Integer::intValue).sum();
            double avg = count > 0 ? (double) sum / count : 0.0;

            groupEntries.add(GroupLeaderboardEntry.builder()
                    .rank(0)
                    .groupName(entry.getKey())
                    .studentCount(count)
                    .totalPoints(sum)
                    .averagePoints(Math.round(avg * 10.0) / 10.0)
                    .build());
        }

        groupEntries.sort((a, b) -> Double.compare(b.getAveragePoints(), a.getAveragePoints()));
        for (GroupLeaderboardEntry g : groupEntries) {
            g.setRank(rank++);
        }

        return groupEntries;
    }

    public StudentGamificationProfile getStudentProfile(Long studentId) {
        Student student = studentRepository.findById(studentId).orElse(null);
        int totalXP = getStudentTotalPoints(studentId);
        List<PointTransaction> txs = getStudentPointTransactions(studentId);
        List<StudentAchievement> unlocked = studentAchievementRepository.findByStudentId(studentId);
        List<Achievement> allAchievements = achievementRepository.findByIsActiveTrue();
        StreakStatusDto streak = getStudentStreak(studentId);
        LevelInfo level = calculateLevel(totalXP);

        // Calculate rank in ALL_TIME leaderboard
        List<LeaderboardEntry> lb = getLeaderboard("ALL_TIME");
        int rank = 0;
        for (LeaderboardEntry e : lb) {
            if (e.getStudentId().equals(studentId)) {
                rank = e.getRank();
                break;
            }
        }

        return StudentGamificationProfile.builder()
                .studentId(studentId)
                .displayName(maskStudentName(student, studentId))
                .totalPoints(totalXP)
                .rank(rank > 0 ? rank : lb.size() + 1)
                .currentStreak(streak.getCurrentStreak())
                .longestStreak(streak.getLongestStreak())
                .checkedInToday(streak.isCheckedInToday())
                .totalActiveDays(streak.getTotalActiveDays())
                .level(level.getLevel())
                .levelName(level.getTitle())
                .currentLevelMinXp(level.getMinXp())
                .nextLevelXp(level.getMaxXp())
                .levelProgressPercent(level.getProgressPercent())
                .streakDetails(streak)
                .recentTransactions(txs.stream().limit(10).toList())
                .unlockedAchievements(unlocked)
                .availableAchievements(allAchievements)
                .build();
    }

    // =========================================================================
    // 6. METRICS & GAMIFICATION STANDARDS SPECIFICATION
    // =========================================================================

    public GamificationMetricsDto getGamificationMetrics() {
        return GamificationMetricsDto.builder()
                .title("AXV Nexsus — Ballar, Gamifikatsiya va Baholash Standartlari")
                .gradingScales(List.of(
                        new MetricItemDto("A+", "90 - 100 ball", "A'lo daraja (Oltin ko'rsatkich)", "+100 XP va mukammallik nishoni"),
                        new MetricItemDto("A", "85 - 89 ball", "Yuqori o'zlashtirish", "+85-89 XP"),
                        new MetricItemDto("B+", "80 - 84 ball", "Yaxshi daraja", "+80-84 XP"),
                        new MetricItemDto("B", "70 - 79 ball", "O'rtacha yuqori", "+70-79 XP"),
                        new MetricItemDto("C", "60 - 69 ball", "Yetarli (O'tish chegarasi)", "+60-69 XP"),
                        new MetricItemDto("D / F", "0 - 59 ball", "Qayta tayyorlanish tavsiya etiladi", "Ballar saqlanadi, qayta topshirish mumkin")
                ))
                .xpRules(List.of(
                        new MetricItemDto("Real Test topshirish", "10 - 100 XP", "Har bir to'g'ri javob uchun 10 XP beriladi", "Avtomatik"),
                        new MetricItemDto("Mukammal Test (100%)", "+50 XP bonus", "Barcha savollarga xatosiz javob berilganda", "Bir martalik"),
                        new MetricItemDto("Kunlik Streak (Daily Check-in)", "+15 XP / kun", "Har kuni platformaga kirib ta'lim olganda", "Kuniga 1 marta"),
                        new MetricItemDto("3 kunlik Streak Bonusi", "+30 XP", "Ketma-ket 3 kun uzluksiz intizom", "Marra bonusi"),
                        new MetricItemDto("7 kunlik Haftalik Streak", "+100 XP", "Ketma-ket 7 kunlik doimiy faollik", "Haftalik marra"),
                        new MetricItemDto("14 kunlik Temir Intizom", "+250 XP", "2 hafta uzluksiz o'rganish marrasi", "Marra bonusi"),
                        new MetricItemDto("30 kunlik Afsonaviy Streak", "+500 XP", "1 oy uzluksiz ta'lim va o'zlashtirish", "Oylik oliy marra"),
                        new MetricItemDto("Amaliy loyiha topshirish", "50 - 100 XP", "Portfolio loyihasini mentorga yuborish", "Vazifa bo'yicha"),
                        new MetricItemDto("Darsdagi faollik", "+25 XP", "Nazariy va amaliy darsda eng faol o'quvchi", "Mentor tomonidan"),
                        new MetricItemDto("Mentor maxsus rag'bati", "+30 - 100 XP", "Namunali dasturlash kodi va yechimlar uchun", "Mentor tomonidan")
                ))
                .playerLevels(List.of(
                        new MetricItemDto("Level 1: Novice Coder", "0 - 199 XP", "Yangi boshlovchi dasturchi", "Boshlang'ich"),
                        new MetricItemDto("Level 2: Junior Explorer", "200 - 499 XP", "Asosiy tushunchalarni egallagan o'quvchi", "O'rta daraja"),
                        new MetricItemDto("Level 3: Active Developer", "500 - 999 XP", "Amaliy loyihalar va testlarda faol", "Yuqori daraja"),
                        new MetricItemDto("Level 4: Senior Specialist", "1000 - 1999 XP", "Oliy o'zlashtirishga ega mohir dasturchi", "Ekspert"),
                        new MetricItemDto("Level 5: Nexus Grandmaster", "2000+ XP", "Al-Xorazmiy Vorisi oliy toifasi", "Afsonaviy")
                ))
                .streakRules(List.of(
                        new MetricItemDto("Ketma-ketlik sharti", "24-48 soat", "Har kunlik mashq yoki test orqali streak saqlanadi", "Majburiy"),
                        new MetricItemDto("Streak Freeze (Muzlatgich)", "1 ta zaxira", "1 kun o'tkazib yuborilganda streak uzilib ketishidan saqlaydi", "Avtomatik"),
                        new MetricItemDto("Qayta tiklanish", "1-kundan", "2 kundan ortiq uzilish bo'lsa, streak 1 dan qayta boshlanadi", "Qoida")
                ))
                .build();
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private void checkMilestoneAchievements(Long studentId) {
        int total = getStudentTotalPoints(studentId);

        if (total >= 500) {
            unlockAchievementIfEligible(studentId, "POINTS_500_MILESTONE");
        }
        if (total >= 1000) {
            unlockAchievementIfEligible(studentId, "POINTS_1000_LEGEND");
        }
    }

    public void unlockAchievementIfEligible(Long studentId, String code) {
        Optional<Achievement> achOpt = achievementRepository.findByCode(code);
        if (achOpt.isPresent()) {
            Achievement ach = achOpt.get();
            Optional<StudentAchievement> alreadyUnlocked = studentAchievementRepository.findByStudentIdAndAchievementId(studentId, ach.getId());
            if (alreadyUnlocked.isEmpty()) {
                StudentAchievement sa = StudentAchievement.builder()
                        .studentId(studentId)
                        .achievementId(ach.getId())
                        .unlockedAt(LocalDateTime.now())
                        .progressValue(ach.getCriteriaThreshold())
                        .build();
                studentAchievementRepository.save(sa);
                log.info("Yutuq ochildi! StudentID={}, Achievement={}", studentId, ach.getTitle());
            }
        }
    }

    private String maskStudentName(Student student, Long studentId) {
        if (student == null) {
            return "Talaba #" + studentId;
        }

        String full = student.getFullName();
        if (full == null || full.isBlank()) {
            return "O'quvchi #" + studentId;
        }

        String[] parts = full.trim().split("\\s+");
        String idBadge = student.getStudentIdNumber() != null ? " (" + student.getStudentIdNumber() + ")" : "";

        if (parts.length == 1) {
            return parts[0] + idBadge;
        } else if (parts.length >= 2) {
            return parts[0] + " " + parts[1].charAt(0) + "." + idBadge;
        }

        return parts[0] + idBadge;
    }

    private String calculateLetterGrade(int score) {
        if (score >= 90) return "A+";
        if (score >= 85) return "A";
        if (score >= 80) return "B+";
        if (score >= 70) return "B";
        if (score >= 60) return "C";
        if (score >= 50) return "D";
        return "F";
    }

    // =========================================================================
    // DTO RECORDS & DATA CLASSES
    // =========================================================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaderboardEntry {
        private int rank;
        private Long studentId;
        private String displayName;
        private String groupName;
        private String gradeLevel;
        private int totalPoints;
        private int highestSingleAward;
        private LocalDateTime earliestAchievedAt;
        private int badgeCount;
        private int currentStreak;
        private int longestStreak;
        private int level;
        private String levelName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupLeaderboardEntry {
        private int rank;
        private String groupName;
        private int studentCount;
        private int totalPoints;
        private double averagePoints;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentGamificationProfile {
        private Long studentId;
        private String displayName;
        private int totalPoints;
        private int rank;
        private int currentStreak;
        private int longestStreak;
        private boolean checkedInToday;
        private int totalActiveDays;
        private int level;
        private String levelName;
        private int currentLevelMinXp;
        private int nextLevelXp;
        private double levelProgressPercent;
        private StreakStatusDto streakDetails;
        private List<PointTransaction> recentTransactions;
        private List<StudentAchievement> unlockedAchievements;
        private List<Achievement> availableAchievements;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StreakStatusDto {
        private Long studentId;
        private int currentStreak;
        private int longestStreak;
        private boolean checkedInToday;
        private LocalDate lastActivityDate;
        private int streakFreezeCount;
        private int totalActiveDays;
        private int nextMilestoneDays;
        private int nextMilestoneReward;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StreakCheckInResult {
        private Long studentId;
        private boolean alreadyRecorded;
        private int currentStreak;
        private int longestStreak;
        private int bonusXpEarned;
        private String message;
        private LocalDate lastActivityDate;
        private boolean streakFreezeAvailable;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LevelInfo {
        private int level;
        private String title;
        private int minXp;
        private int maxXp;
        private double progressPercent;
        private String badgeName;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GamificationMetricsDto {
        private String title;
        private List<MetricItemDto> gradingScales;
        private List<MetricItemDto> xpRules;
        private List<MetricItemDto> playerLevels;
        private List<MetricItemDto> streakRules;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricItemDto {
        private String metric;
        private String value;
        private String description;
        private String categoryOrCondition;
    }
}
