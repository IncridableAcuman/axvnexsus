package uz.axm.nexus.grading.application;

import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.grading.domain.*;
import uz.axm.nexus.grading.infrastructure.*;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.infrastructure.StudentRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Slf4j
public class GradingAndGamificationService {

    private final GradeRecordRepository gradeRecordRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final AchievementRepository achievementRepository;
    private final StudentAchievementRepository studentAchievementRepository;
    private final StudentRepository studentRepository;
    private final StudentStreakRepository studentStreakRepository;
    private final StreakFreezeHistoryRepository streakFreezeHistoryRepository;
    private final GamificationConfigService configService;
    private final GamificationTimeHelper timeHelper;

    @Autowired
    public GradingAndGamificationService(
            GradeRecordRepository gradeRecordRepository,
            PointTransactionRepository pointTransactionRepository,
            AchievementRepository achievementRepository,
            StudentAchievementRepository studentAchievementRepository,
            StudentRepository studentRepository,
            StudentStreakRepository studentStreakRepository,
            @Autowired(required = false) StreakFreezeHistoryRepository streakFreezeHistoryRepository,
            @Autowired(required = false) GamificationConfigService configService,
            @Autowired(required = false) GamificationTimeHelper timeHelper
    ) {
        this.gradeRecordRepository = gradeRecordRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.achievementRepository = achievementRepository;
        this.studentAchievementRepository = studentAchievementRepository;
        this.studentRepository = studentRepository;
        this.studentStreakRepository = studentStreakRepository;
        this.streakFreezeHistoryRepository = streakFreezeHistoryRepository;
        this.configService = configService;
        this.timeHelper = timeHelper != null ? timeHelper : new GamificationTimeHelper();
    }

    @PostConstruct
    public void initDefaultAchievements() {
        List<Achievement> defaults = List.of(
                // 1. LEARNING CATEGORY
                Achievement.builder()
                        .code("FIRST_QUIZ_COMPLETED")
                        .title("Birinchi Test")
                        .description("Platformada birinchi marta test topshirish")
                        .icon("Award")
                        .badgeColor("blue")
                        .category("LEARNING")
                        .rarity("COMMON")
                        .xpReward(10)
                        .criteriaType("QUIZZES_COMPLETED")
                        .criteriaThreshold(1)
                        .displayOrder(1)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("FIRST_ASSIGNMENT_SUBMITTED")
                        .title("Birinchi Topshiriq")
                        .description("Amaliy vazifani muvaffaqiyatli yuklash")
                        .icon("Code2")
                        .badgeColor("teal")
                        .category("LEARNING")
                        .rarity("COMMON")
                        .xpReward(15)
                        .criteriaType("ASSIGNMENTS_COMPLETED")
                        .criteriaThreshold(1)
                        .displayOrder(2)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("FIRST_LESSON_COMPLETED")
                        .title("Birinchi Qadam")
                        .description("Birinchi darsda qatnashib uni yakunlash")
                        .icon("BookOpen")
                        .badgeColor("emerald")
                        .category("LEARNING")
                        .rarity("COMMON")
                        .xpReward(5)
                        .criteriaType("LESSONS_COMPLETED")
                        .criteriaThreshold(1)
                        .displayOrder(3)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("QUIZZES_10_COMPLETED")
                        .title("10 ta Test")
                        .description("10 ta testni muvaffaqiyatli yakunlash")
                        .icon("Award")
                        .badgeColor("blue")
                        .category("LEARNING")
                        .rarity("RARE")
                        .xpReward(50)
                        .criteriaType("QUIZZES_COMPLETED")
                        .criteriaThreshold(10)
                        .displayOrder(4)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("QUIZZES_50_COMPLETED")
                        .title("50 ta Test")
                        .description("50 ta testni yakunlagan tajribali bilimdon")
                        .icon("Trophy")
                        .badgeColor("purple")
                        .category("LEARNING")
                        .rarity("EPIC")
                        .xpReward(150)
                        .criteriaType("QUIZZES_COMPLETED")
                        .criteriaThreshold(50)
                        .displayOrder(5)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("QUIZZES_100_COMPLETED")
                        .title("Yuzlik Tester")
                        .description("100 ta testni to'liq yakunlagan afsonaviy o'quvchi")
                        .icon("Trophy")
                        .badgeColor("gold")
                        .category("LEARNING")
                        .rarity("LEGENDARY")
                        .xpReward(300)
                        .criteriaType("QUIZZES_COMPLETED")
                        .criteriaThreshold(100)
                        .displayOrder(6)
                        .isActive(true)
                        .build(),

                // 2. PERFORMANCE CATEGORY
                Achievement.builder()
                        .code("FIRST_PERFECT_TEST")
                        .title("100% Natija")
                        .description("Birinchi marta testdan 100 ball to'plash")
                        .icon("Award")
                        .badgeColor("emerald")
                        .category("PERFORMANCE")
                        .rarity("RARE")
                        .xpReward(100)
                        .criteriaType("ASSESSMENT_SCORE")
                        .criteriaThreshold(100)
                        .displayOrder(10)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("QUIZ_MASTER")
                        .title("Test Ustasi")
                        .description("Kamida 5 ta testda 90% dan yuqori natija ko'rsatish")
                        .icon("Target")
                        .badgeColor("purple")
                        .category("PERFORMANCE")
                        .rarity("EPIC")
                        .xpReward(150)
                        .criteriaType("QUIZ_HIGH_SCORE_COUNT")
                        .criteriaThreshold(5)
                        .displayOrder(11)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("CONSISTENT_PERFORMER")
                        .title("Barqaror Natija")
                        .description("Ketma-ket 5 ta testdan muvaffaqiyatli o'tish")
                        .icon("CheckCircle2")
                        .badgeColor("blue")
                        .category("PERFORMANCE")
                        .rarity("RARE")
                        .xpReward(100)
                        .criteriaType("QUIZZES_PASSED")
                        .criteriaThreshold(5)
                        .displayOrder(12)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("EXCELLENT_ASSIGNMENT")
                        .title("Namunali Topshiriq")
                        .description("Topshiriqdan a'lo baho (>=90 ball) olish")
                        .icon("Star")
                        .badgeColor("amber")
                        .category("PERFORMANCE")
                        .rarity("RARE")
                        .xpReward(50)
                        .criteriaType("EXCELLENT_ASSIGNMENTS")
                        .criteriaThreshold(1)
                        .displayOrder(13)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("HIGH_ACHIEVER")
                        .title("Oliy Natija")
                        .description("O'z guruhida eng yuqori akademik ko'rsatkichga erishish")
                        .icon("Sparkles")
                        .badgeColor("gold")
                        .category("PERFORMANCE")
                        .rarity("EPIC")
                        .xpReward(200)
                        .criteriaType("HIGH_ACHIEVER")
                        .criteriaThreshold(1)
                        .displayOrder(14)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("TEST_EXPERT")
                        .title("Bilimdon Tester")
                        .description("3 ta real testni muvaffaqiyatli topshirish")
                        .icon("Award")
                        .badgeColor("emerald")
                        .category("PERFORMANCE")
                        .rarity("RARE")
                        .xpReward(150)
                        .criteriaType("TESTS_COMPLETED")
                        .criteriaThreshold(3)
                        .displayOrder(15)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("PRACTICAL_HERO")
                        .title("Master Dasturchi")
                        .description("3 ta amaliy loyihani a'lo baho bilan topshirish")
                        .icon("Code2")
                        .badgeColor("blue")
                        .category("PERFORMANCE")
                        .rarity("EPIC")
                        .xpReward(200)
                        .criteriaType("PROJECTS_COUNT")
                        .criteriaThreshold(3)
                        .displayOrder(16)
                        .isActive(true)
                        .build(),

                // 3. CONSISTENCY (STREAK) CATEGORY
                Achievement.builder()
                        .code("STREAK_3_DAYS")
                        .title("Olovli Start")
                        .description("Ketma-ket 3 kun platformada faol bo'lish")
                        .icon("Flame")
                        .badgeColor("amber")
                        .category("CONSISTENCY")
                        .rarity("COMMON")
                        .xpReward(30)
                        .criteriaType("DAILY_STREAK")
                        .criteriaThreshold(3)
                        .displayOrder(20)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("STREAK_7_DAYS")
                        .title("Haftalik Qahramon")
                        .description("Ketma-ket 7 kun platformada uzluksiz o'rganish")
                        .icon("Flame")
                        .badgeColor("orange")
                        .category("CONSISTENCY")
                        .rarity("RARE")
                        .xpReward(100)
                        .criteriaType("DAILY_STREAK")
                        .criteriaThreshold(7)
                        .displayOrder(21)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("STREAK_14_DAYS")
                        .title("Temir Intizom")
                        .description("Ketma-ket 14 kun uzluksiz ta'lim olish")
                        .icon("Zap")
                        .badgeColor("blue")
                        .category("CONSISTENCY")
                        .rarity("RARE")
                        .xpReward(250)
                        .criteriaType("DAILY_STREAK")
                        .criteriaThreshold(14)
                        .displayOrder(22)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("STREAK_30_DAYS")
                        .title("Afsonaviy Odat")
                        .description("Ketma-ket 30 kun uzluksiz o'rganish va testlar yechish")
                        .icon("Trophy")
                        .badgeColor("gold")
                        .category("CONSISTENCY")
                        .rarity("EPIC")
                        .xpReward(500)
                        .criteriaType("DAILY_STREAK")
                        .criteriaThreshold(30)
                        .displayOrder(23)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("STREAK_60_DAYS")
                        .title("Super Intizom")
                        .description("Ketma-ket 60 kunlik uzluksiz o'rganish marrasi")
                        .icon("Flame")
                        .badgeColor("purple")
                        .category("CONSISTENCY")
                        .rarity("EPIC")
                        .xpReward(1000)
                        .criteriaType("DAILY_STREAK")
                        .criteriaThreshold(60)
                        .displayOrder(24)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("STREAK_100_DAYS")
                        .title("Yuz Kunlik Afsona")
                        .description("Ketma-ket 100 kun platformada uzluksiz ta'lim")
                        .icon("Crown")
                        .badgeColor("gold")
                        .category("CONSISTENCY")
                        .rarity("LEGENDARY")
                        .xpReward(2000)
                        .criteriaType("DAILY_STREAK")
                        .criteriaThreshold(100)
                        .displayOrder(25)
                        .isActive(true)
                        .build(),

                // 4. PROGRESSION CATEGORY
                Achievement.builder()
                        .code("POINTS_100_MILESTONE")
                        .title("Ilk 100 XP")
                        .description("Platformada jami 100 XP to'plash")
                        .icon("Zap")
                        .badgeColor("blue")
                        .category("PROGRESSION")
                        .rarity("COMMON")
                        .xpReward(20)
                        .criteriaType("TOTAL_POINTS")
                        .criteriaThreshold(100)
                        .displayOrder(30)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("POINTS_500_MILESTONE")
                        .title("500 XP Chempioni")
                        .description("Platformada jami 500 ball chegarasini bosib o'tish")
                        .icon("Zap")
                        .badgeColor("purple")
                        .category("PROGRESSION")
                        .rarity("COMMON")
                        .xpReward(50)
                        .criteriaType("TOTAL_POINTS")
                        .criteriaThreshold(500)
                        .displayOrder(31)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("POINTS_1000_LEGEND")
                        .title("Nexus Afsonasi")
                        .description("1000 XP ga erishgan oliy toifali o'quvchi")
                        .icon("Trophy")
                        .badgeColor("gold")
                        .category("PROGRESSION")
                        .rarity("RARE")
                        .xpReward(100)
                        .criteriaType("TOTAL_POINTS")
                        .criteriaThreshold(1000)
                        .displayOrder(32)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("POINTS_5000_GRANDMASTER")
                        .title("5000 XP Grandmaster")
                        .description("5000 XP chegarasini zabt etgan ustoz darajadagi o'quvchi")
                        .icon("Crown")
                        .badgeColor("pink")
                        .category("PROGRESSION")
                        .rarity("EPIC")
                        .xpReward(250)
                        .criteriaType("TOTAL_POINTS")
                        .criteriaThreshold(5000)
                        .displayOrder(33)
                        .isActive(true)
                        .build(),
                Achievement.builder()
                        .code("POINTS_10000_MYTHIC")
                        .title("10,000 XP Nexus Mifi")
                        .description("10,000 XP ga yetgan Al-Xorazmiy Vorisi oliy chempioni")
                        .icon("Crown")
                        .badgeColor("amber")
                        .category("PROGRESSION")
                        .rarity("LEGENDARY")
                        .xpReward(500)
                        .criteriaType("TOTAL_POINTS")
                        .criteriaThreshold(10000)
                        .displayOrder(34)
                        .isActive(true)
                        .build()
        );

        for (Achievement ach : defaults) {
            if (achievementRepository.findByCode(ach.getCode()).isEmpty()) {
                achievementRepository.save(ach);
            }
        }
        log.info("Standart gamifikatsiya yutuqlari (Achievements) tekshirildi va to'ldirildi.");
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
    // 2. GAMIFICATION POINTS & AUDITABLE TRANSACTIONS (XP ENGINE)
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

        // Idempotency check: if transaction with this key was already recorded, return it safely
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

    public Page<PointTransaction> getStudentPointTransactionsPaged(Long studentId, String source, Pageable pageable) {
        if (source != null && !source.isBlank() && !"ALL".equalsIgnoreCase(source)) {
            return pointTransactionRepository.findByStudentIdAndPointSourceOrderByCreatedAtDesc(studentId, source.toUpperCase().trim(), pageable);
        }
        return pointTransactionRepository.findByStudentIdOrderByCreatedAtDesc(studentId, pageable);
    }

    public int getStudentTotalPoints(Long studentId) {
        return pointTransactionRepository.getTotalPointsByStudent(studentId);
    }

    public int getPointsByStudentAndPeriod(Long studentId, LocalDateTime startDate, LocalDateTime endDate) {
        return pointTransactionRepository.getPointsByStudentAndPeriod(studentId, startDate, endDate);
    }

    // =========================================================================
    // CONFIG-DRIVEN XP REWARD HELPERS (IDEMPOTENT & AUDITED)
    // =========================================================================

    public PointTransaction awardQuizCompletion(Long studentId, Long attemptId, String assessmentTitle, Long mentorId) {
        int xp = (configService != null) ? configService.getQuizCompleteXp() : 10;
        String idempKey = "quiz_completed_attempt_" + attemptId;
        String reason = "Test topshirildi (" + (assessmentTitle != null ? assessmentTitle : "Test #" + attemptId) + ")";
        return awardPoints(studentId, xp, "QUIZ_COMPLETED", String.valueOf(attemptId), "StudentAssessmentAttempt", idempKey, reason, mentorId);
    }

    public PointTransaction awardQuizPassing(Long studentId, Long assessmentId, Long attemptId, String assessmentTitle, double percentage, Long mentorId) {
        int xp = (configService != null) ? configService.getQuizPassXp() : 20;
        String idempKey = "quiz_passed_assessment_" + assessmentId + "_student_" + studentId;
        String reason = "Testdan muvaffaqiyatli o'tildi (" + (assessmentTitle != null ? assessmentTitle : "Test #" + assessmentId) + "): " + percentage + "%";
        return awardPoints(studentId, xp, "QUIZ_PASSED", String.valueOf(attemptId), "StudentAssessmentAttempt", idempKey, reason, mentorId);
    }

    public PointTransaction awardQuizHighScore(Long studentId, Long assessmentId, Long attemptId, String assessmentTitle, double percentage, Long mentorId) {
        int xp = (configService != null) ? configService.getQuizHighScoreXp() : 30;
        String idempKey = "quiz_high_score_assessment_" + assessmentId + "_student_" + studentId;
        String reason = "Testdan yuqori natija (>=90%): " + (assessmentTitle != null ? assessmentTitle : "Test #" + assessmentId) + " (" + percentage + "%)";
        return awardPoints(studentId, xp, "QUIZ_HIGH_SCORE", String.valueOf(attemptId), "StudentAssessmentAttempt", idempKey, reason, mentorId);
    }

    public PointTransaction awardAssignmentCompletion(Long studentId, Long assignmentId, Long submissionId, String assignmentTitle) {
        int xp = (configService != null) ? configService.getAssignmentCompleteXp() : 15;
        String idempKey = "assignment_completed_" + assignmentId + "_student_" + studentId;
        String reason = "Topshiriq topshirildi: " + (assignmentTitle != null ? assignmentTitle : "Topshiriq #" + assignmentId);
        return awardPoints(studentId, xp, "ASSIGNMENT_COMPLETED", String.valueOf(submissionId), "AssignmentSubmission", idempKey, reason, null);
    }

    public PointTransaction awardAssignmentOnTime(Long studentId, Long assignmentId, Long submissionId, String assignmentTitle) {
        int xp = (configService != null) ? configService.getAssignmentOnTimeXp() : 10;
        String idempKey = "assignment_on_time_" + assignmentId + "_student_" + studentId;
        String reason = "Topshiriq o'z vaqtida topshirildi: " + (assignmentTitle != null ? assignmentTitle : "Topshiriq #" + assignmentId);
        return awardPoints(studentId, xp, "ASSIGNMENT_ON_TIME", String.valueOf(submissionId), "AssignmentSubmission", idempKey, reason, null);
    }

    public PointTransaction awardAssignmentExcellent(Long studentId, Long assignmentId, Long submissionId, String assignmentTitle, int score, Long mentorId) {
        int xp = (configService != null) ? configService.getAssignmentExcellentXp() : 25;
        String idempKey = "assignment_excellent_" + assignmentId + "_student_" + studentId;
        String reason = "Topshiriq a'lo baholandi (" + score + " ball): " + (assignmentTitle != null ? assignmentTitle : "Topshiriq #" + assignmentId);
        return awardPoints(studentId, xp, "ASSIGNMENT_EXCELLENT", String.valueOf(submissionId), "AssignmentSubmission", idempKey, reason, mentorId);
    }

    public PointTransaction awardLessonCompletion(Long studentId, Long lessonId, String lessonTitle, Long mentorId) {
        int xp = (configService != null) ? configService.getLessonCompleteXp() : 5;
        String idempKey = "lesson_completed_" + lessonId + "_student_" + studentId;
        String reason = "Darsda qatnashildi va yakunlandi: " + (lessonTitle != null ? lessonTitle : "Dars #" + lessonId);
        return awardPoints(studentId, xp, "LESSON_COMPLETED", String.valueOf(lessonId), "Lesson", idempKey, reason, mentorId);
    }

    public StudentXpSummaryDto getStudentXpSummary(Long studentId) {
        int totalXp = getStudentTotalPoints(studentId);
        LocalDateTime weekStart = timeHelper.getStartOfWeek();
        LocalDateTime monthStart = timeHelper.getStartOfMonth();
        LocalDateTime now = timeHelper.getCurrentAcademicDateTime();

        int weeklyXp = pointTransactionRepository.getPointsByStudentAndPeriod(studentId, weekStart, now);
        int monthlyXp = pointTransactionRepository.getPointsByStudentAndPeriod(studentId, monthStart, now);

        List<Object[]> rawSourceSummary = pointTransactionRepository.getPointsSummaryBySource(studentId);
        Map<String, Integer> sourceBreakdown = new HashMap<>();
        for (Object[] row : rawSourceSummary) {
            String src = (String) row[0];
            int sum = ((Number) row[1]).intValue();
            sourceBreakdown.put(src, sum);
        }

        LevelInfo level = calculateLevel(totalXp);
        TenTierLevelInfo tenTier = calculateTenTierLevel(totalXp);

        List<LeaderboardEntry> allTimeLb = getLeaderboard("ALL_TIME");
        int overallRank = 0;
        for (LeaderboardEntry e : allTimeLb) {
            if (e.getStudentId().equals(studentId)) {
                overallRank = e.getRank();
                break;
            }
        }
        List<LeaderboardEntry> weeklyLb = getLeaderboard("WEEKLY");
        int weeklyRank = 0;
        for (LeaderboardEntry e : weeklyLb) {
            if (e.getStudentId().equals(studentId)) {
                weeklyRank = e.getRank();
                break;
            }
        }
        List<LeaderboardEntry> monthlyLb = getLeaderboard("MONTHLY");
        int monthlyRank = 0;
        for (LeaderboardEntry e : monthlyLb) {
            if (e.getStudentId().equals(studentId)) {
                monthlyRank = e.getRank();
                break;
            }
        }

        return StudentXpSummaryDto.builder()
                .studentId(studentId)
                .totalXp(totalXp)
                .weeklyXp(weeklyXp)
                .monthlyXp(monthlyXp)
                .overallRank(overallRank > 0 ? overallRank : allTimeLb.size() + 1)
                .weeklyRank(weeklyRank > 0 ? weeklyRank : weeklyLb.size() + 1)
                .monthlyRank(monthlyRank > 0 ? monthlyRank : monthlyLb.size() + 1)
                .currentLevel(level.getLevel())
                .currentLevelTitle(level.getTitle())
                .tenTierLevel(tenTier.getLevel())
                .tenTierTitle(tenTier.getTitle())
                .xpToNextLevel(tenTier.getXpNeededForNextLevel())
                .sourceBreakdown(sourceBreakdown)
                .build();
    }

    // =========================================================================
    // 3. DAILY STREAK MANAGEMENT (Kunlik uzluksiz intizom va bonuslar)
    // =========================================================================

    /**
     * Records daily activity for a student (Daily Check-in, Quiz submission, Assignment submit, Lesson attend).
     * Calculates consecutive days using Asia/Tashkent academic timezone, freeze protection, milestone bonuses and XP awards.
     */
    @Transactional
    public StreakCheckInResult recordDailyActivity(Long studentId, String activityType) {
        LocalDate today = timeHelper.getCurrentAcademicDate();
        int defaultFreeze = (configService != null) ? configService.getDefaultStreakFreezeCount() : 1;

        StudentStreak streak = studentStreakRepository.findByStudentId(studentId)
                .orElseGet(() -> StudentStreak.builder()
                        .studentId(studentId)
                        .currentStreak(0)
                        .longestStreak(0)
                        .streakFreezeCount(defaultFreeze)
                        .totalActiveDays(0)
                        .streakStartDate(today)
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
                    .streakStartDate(streak.getStreakStartDate())
                    .build();
        }

        boolean isConsecutive = (last != null && last.equals(today.minusDays(1)));
        boolean usedFreeze = false;
        LocalDate missedDate = today.minusDays(1);
        boolean freezeAlreadyUsedForMissedDate = streakFreezeHistoryRepository != null &&
                streakFreezeHistoryRepository.existsByStudentIdAndUsedDateAndActionTypeIn(studentId, missedDate, List.of("AUTO_CONSUMED", "MANUAL_USED"));

        if (isConsecutive) {
            streak.setCurrentStreak(streak.getCurrentStreak() + 1);
            if (streak.getStreakStartDate() == null) {
                streak.setStreakStartDate(last);
            }
        } else if (last != null && last.equals(today.minusDays(2)) && !freezeAlreadyUsedForMissedDate && streak.getStreakFreezeCount() != null && streak.getStreakFreezeCount() > 0) {
            // Bir kun o'tkazib yuborilgan, ammo muzlatgich (freeze) orqali saqlab qolindi
            usedFreeze = true;
            streak.setStreakFreezeCount(streak.getStreakFreezeCount() - 1);
            streak.setCurrentStreak(streak.getCurrentStreak() + 1);

            // Record streak freeze usage history
            if (streakFreezeHistoryRepository != null) {
                StreakFreezeHistory freezeRecord = StreakFreezeHistory.builder()
                        .studentId(studentId)
                        .usedDate(missedDate)
                        .actionType("AUTO_CONSUMED")
                        .reason("O'tkazib yuborilgan kun muzlatgich (freeze) orqali saqlandi")
                        .performedByUserId(null)
                        .createdAt(LocalDateTime.now())
                        .build();
                streakFreezeHistoryRepository.save(freezeRecord);
                log.info("Streak Freeze ishlatildi: StudentID={}, Sana={}", studentId, missedDate);
            }
        } else {
            // Yangi streak boshlanishi
            streak.setCurrentStreak(1);
            streak.setStreakStartDate(today);
        }

        if (streak.getCurrentStreak() > (streak.getLongestStreak() != null ? streak.getLongestStreak() : 0)) {
            streak.setLongestStreak(streak.getCurrentStreak());
        }

        streak.setTotalActiveDays((streak.getTotalActiveDays() != null ? streak.getTotalActiveDays() : 0) + 1);
        streak.setLastActivityDate(today);
        streak.setUpdatedAt(LocalDateTime.now());
        studentStreakRepository.save(streak);

        // Kunlik bazaviy streak XP mukofoti (+15 XP)
        int dailyStreakXp = (configService != null) ? configService.getDailyStreakXp() : 15;
        int totalBonusXp = dailyStreakXp;
        String idempKey = "daily_streak_" + studentId + "_" + today;
        awardPoints(
                studentId,
                dailyStreakXp,
                "DAILY_STREAK",
                today.toString(),
                "DailyStreak",
                idempKey,
                "Kunlik streak faolligi (" + streak.getCurrentStreak() + "-kun) 🔥",
                null
        );

        // Streak marralari (Milestones) bonuslari - Bir martalik idempotency kafolati
        int curStreak = streak.getCurrentStreak();
        int milestoneXp = checkAndAwardStreakMilestone(studentId, curStreak);
        totalBonusXp += milestoneXp;

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
                .streakStartDate(streak.getStreakStartDate())
                .build();
    }

    private int checkAndAwardStreakMilestone(Long studentId, int currentStreak) {
        int bonus = 0;
        if (currentStreak >= 3) {
            bonus += awardMilestoneOnce(studentId, 3, 30, "STREAK_3_DAYS", "3 kunlik olovli streak bonusi! 🔥");
        }
        if (currentStreak >= 7) {
            bonus += awardMilestoneOnce(studentId, 7, 100, "STREAK_7_DAYS", "7 kunlik haftalik intizom bonusi! 🏆");
        }
        if (currentStreak >= 14) {
            bonus += awardMilestoneOnce(studentId, 14, 250, "STREAK_14_DAYS", "14 kunlik temir intizom bonusi! ⚡");
        }
        if (currentStreak >= 30) {
            bonus += awardMilestoneOnce(studentId, 30, 500, "STREAK_30_DAYS", "30 kunlik afsonaviy streak bonusi! 👑");
        }
        if (currentStreak >= 60) {
            bonus += awardMilestoneOnce(studentId, 60, 1000, "STREAK_60_DAYS", "60 kunlik super streak bonusi! 🌟");
        }
        if (currentStreak >= 100) {
            bonus += awardMilestoneOnce(studentId, 100, 2000, "STREAK_100_DAYS", "100 kunlik afsonaviy oliy streak bonusi! 🎖️");
        }
        return bonus;
    }

    private int awardMilestoneOnce(Long studentId, int days, int xp, String achievementCode, String reason) {
        String milestoneKey = "milestone_streak_" + studentId + "_" + days;
        Optional<PointTransaction> existing = pointTransactionRepository.findByIdempotencyKey(milestoneKey);
        if (existing.isPresent()) {
            return 0; // Already awarded previously
        }

        awardPoints(studentId, xp, "ACHIEVEMENT_UNLOCKED", String.valueOf(days) + "_DAYS", "Milestone",
                milestoneKey, reason, null);
        unlockAchievementIfEligible(studentId, achievementCode);
        return xp;
    }

    public StreakStatusDto getStudentStreak(Long studentId) {
        LocalDate today = timeHelper.getCurrentAcademicDate();
        int defaultFreeze = (configService != null) ? configService.getDefaultStreakFreezeCount() : 1;

        StudentStreak streak = studentStreakRepository.findByStudentId(studentId)
                .orElseGet(() -> StudentStreak.builder()
                        .studentId(studentId)
                        .currentStreak(0)
                        .longestStreak(0)
                        .streakFreezeCount(defaultFreeze)
                        .totalActiveDays(0)
                        .streakStartDate(today)
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

        int nextMilestone = activeStreak < 3 ? 3 : (activeStreak < 7 ? 7 : (activeStreak < 14 ? 14 : (activeStreak < 30 ? 30 : (activeStreak < 60 ? 60 : 100))));
        int nextReward = activeStreak < 3 ? 30 : (activeStreak < 7 ? 100 : (activeStreak < 14 ? 250 : (activeStreak < 30 ? 500 : (activeStreak < 60 ? 1000 : 2000))));

        return StreakStatusDto.builder()
                .studentId(studentId)
                .currentStreak(activeStreak)
                .longestStreak(streak.getLongestStreak() != null ? streak.getLongestStreak() : activeStreak)
                .checkedInToday(checkedInToday)
                .lastActivityDate(streak.getLastActivityDate())
                .streakFreezeCount(streak.getStreakFreezeCount() != null ? streak.getStreakFreezeCount() : 0)
                .totalActiveDays(streak.getTotalActiveDays() != null ? streak.getTotalActiveDays() : 0)
                .streakStartDate(streak.getStreakStartDate())
                .nextMilestoneDays(nextMilestone)
                .nextMilestoneReward(nextReward)
                .build();
    }

    @Transactional
    public StreakFreezeResult consumeStreakFreezeManually(Long studentId, LocalDate missedDate, Long authorizedUserId) {
        StudentStreak streak = studentStreakRepository.findByStudentId(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Talaba streaki topilmadi: " + studentId));

        if (streak.getStreakFreezeCount() == null || streak.getStreakFreezeCount() <= 0) {
            throw new IllegalStateException("Sizda mavjud Streak Freeze mavjud emas!");
        }

        LocalDate targetDate = missedDate != null ? missedDate : timeHelper.getCurrentAcademicDate().minusDays(1);
        if (streakFreezeHistoryRepository != null && streakFreezeHistoryRepository.existsByStudentIdAndUsedDateAndActionTypeIn(studentId, targetDate, List.of("AUTO_CONSUMED", "MANUAL_USED"))) {
            throw new IllegalStateException("Ushbu sana (" + targetDate + ") uchun Streak Freeze allaqachon ishlatilgan!");
        }

        streak.setStreakFreezeCount(streak.getStreakFreezeCount() - 1);
        streak.setUpdatedAt(LocalDateTime.now());
        studentStreakRepository.save(streak);

        if (streakFreezeHistoryRepository != null) {
            StreakFreezeHistory freezeRecord = StreakFreezeHistory.builder()
                    .studentId(studentId)
                    .usedDate(targetDate)
                    .actionType("MANUAL_USED")
                    .reason("O'quvchi tomonidan qo'lda tasdiqlangan Streak Freeze")
                    .performedByUserId(authorizedUserId)
                    .createdAt(LocalDateTime.now())
                    .build();
            streakFreezeHistoryRepository.save(freezeRecord);
        }

        return StreakFreezeResult.builder()
                .studentId(studentId)
                .success(true)
                .remainingFreezes(streak.getStreakFreezeCount())
                .usedDate(targetDate)
                .message("Streak Freeze muvaffaqiyatli ishlatildi (" + targetDate + ")")
                .build();
    }

    @Transactional
    public StreakFreezeResult adjustStreakFreeze(Long studentId, int delta, String reason, Long authorizedUserId) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Freeze balansini o'zgartirish uchun asoslovchi sabab shart!");
        }

        StudentStreak streak = studentStreakRepository.findByStudentId(studentId)
                .orElseGet(() -> StudentStreak.builder()
                        .studentId(studentId)
                        .currentStreak(0)
                        .longestStreak(0)
                        .streakFreezeCount(1)
                        .totalActiveDays(0)
                        .createdAt(LocalDateTime.now())
                        .build());

        int maxFreeze = (configService != null) ? configService.getMaxStreakFreezeCount() : 5;
        int newBalance = Math.max(0, Math.min(maxFreeze, (streak.getStreakFreezeCount() != null ? streak.getStreakFreezeCount() : 0) + delta));
        streak.setStreakFreezeCount(newBalance);
        streak.setUpdatedAt(LocalDateTime.now());
        studentStreakRepository.save(streak);

        if (streakFreezeHistoryRepository != null) {
            StreakFreezeHistory record = StreakFreezeHistory.builder()
                    .studentId(studentId)
                    .usedDate(timeHelper.getCurrentAcademicDate())
                    .actionType(delta > 0 ? "ADMIN_GRANTED" : "ADMIN_ADJUSTED")
                    .reason(reason)
                    .performedByUserId(authorizedUserId)
                    .createdAt(LocalDateTime.now())
                    .build();
            streakFreezeHistoryRepository.save(record);
        }

        log.info("Streak Freeze o'zgartirildi: StudentID={}, Yangi balans={}, Sabab={}", studentId, newBalance, reason);
        return StreakFreezeResult.builder()
                .studentId(studentId)
                .success(true)
                .remainingFreezes(newBalance)
                .usedDate(timeHelper.getCurrentAcademicDate())
                .message("Streak Freeze balansi yangilandi: " + newBalance + " ta")
                .build();
    }

    public List<StreakFreezeHistory> getStreakFreezeHistory(Long studentId) {
        if (streakFreezeHistoryRepository == null) return List.of();
        return streakFreezeHistoryRepository.findByStudentIdOrderByCreatedAtDesc(studentId);
    }

    // =========================================================================
    // 4. PLAYER LEVELS & XP PROGRESSION SYSTEM
    // =========================================================================

    /**
     * Standard 5-tier baseline level calculation (preserved for backward compatibility with existing tests).
     */
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

    /**
     * Complete 10-Tier Production Gamification Level Progression (Phase 4 Specification).
     */
    public static TenTierLevelInfo calculateTenTierLevel(int totalXp) {
        int safeXp = Math.max(0, totalXp);

        if (safeXp >= 10000) {
            return TenTierLevelInfo.builder()
                    .level(10)
                    .title("Legend (Nexus Afsonasi)")
                    .minXp(10000)
                    .maxXp(10000)
                    .xpNeededForNextLevel(0)
                    .progressPercent(100.0)
                    .badgeName("Legend")
                    .color("gold")
                    .build();
        } else if (safeXp >= 6000) {
            double pct = ((double) (safeXp - 6000) / 4000.0) * 100.0;
            return TenTierLevelInfo.builder()
                    .level(9)
                    .title("Champion (Chempion)")
                    .minXp(6000)
                    .maxXp(10000)
                    .xpNeededForNextLevel(10000 - safeXp)
                    .progressPercent(Math.min(100.0, Math.round(pct * 10.0) / 10.0))
                    .badgeName("Champion")
                    .color("orange")
                    .build();
        } else if (safeXp >= 4000) {
            double pct = ((double) (safeXp - 4000) / 2000.0) * 100.0;
            return TenTierLevelInfo.builder()
                    .level(8)
                    .title("Master (Usta)")
                    .minXp(4000)
                    .maxXp(6000)
                    .xpNeededForNextLevel(6000 - safeXp)
                    .progressPercent(Math.min(100.0, Math.round(pct * 10.0) / 10.0))
                    .badgeName("Master")
                    .color("rose")
                    .build();
        } else if (safeXp >= 2500) {
            double pct = ((double) (safeXp - 2500) / 1500.0) * 100.0;
            return TenTierLevelInfo.builder()
                    .level(7)
                    .title("Expert (Ekspert)")
                    .minXp(2500)
                    .maxXp(4000)
                    .xpNeededForNextLevel(4000 - safeXp)
                    .progressPercent(Math.min(100.0, Math.round(pct * 10.0) / 10.0))
                    .badgeName("Expert")
                    .color("pink")
                    .build();
        } else if (safeXp >= 1500) {
            double pct = ((double) (safeXp - 1500) / 1000.0) * 100.0;
            return TenTierLevelInfo.builder()
                    .level(6)
                    .title("Advanced (Ilg'or)")
                    .minXp(1500)
                    .maxXp(2500)
                    .xpNeededForNextLevel(2500 - safeXp)
                    .progressPercent(Math.min(100.0, Math.round(pct * 10.0) / 10.0))
                    .badgeName("Advanced")
                    .color("purple")
                    .build();
        } else if (safeXp >= 1000) {
            double pct = ((double) (safeXp - 1000) / 500.0) * 100.0;
            return TenTierLevelInfo.builder()
                    .level(5)
                    .title("Skilled (Mohir)")
                    .minXp(1000)
                    .maxXp(1500)
                    .xpNeededForNextLevel(1500 - safeXp)
                    .progressPercent(Math.min(100.0, Math.round(pct * 10.0) / 10.0))
                    .badgeName("Skilled")
                    .color("indigo")
                    .build();
        } else if (safeXp >= 600) {
            double pct = ((double) (safeXp - 600) / 400.0) * 100.0;
            return TenTierLevelInfo.builder()
                    .level(4)
                    .title("Practitioner (Amaliyotchi)")
                    .minXp(600)
                    .maxXp(1000)
                    .xpNeededForNextLevel(1000 - safeXp)
                    .progressPercent(Math.min(100.0, Math.round(pct * 10.0) / 10.0))
                    .badgeName("Practitioner")
                    .color("blue")
                    .build();
        } else if (safeXp >= 300) {
            double pct = ((double) (safeXp - 300) / 300.0) * 100.0;
            return TenTierLevelInfo.builder()
                    .level(3)
                    .title("Learner (O'rganuvchi)")
                    .minXp(300)
                    .maxXp(600)
                    .xpNeededForNextLevel(600 - safeXp)
                    .progressPercent(Math.min(100.0, Math.round(pct * 10.0) / 10.0))
                    .badgeName("Learner")
                    .color("teal")
                    .build();
        } else if (safeXp >= 100) {
            double pct = ((double) (safeXp - 100) / 200.0) * 100.0;
            return TenTierLevelInfo.builder()
                    .level(2)
                    .title("Explorer (Izlanuvchi)")
                    .minXp(100)
                    .maxXp(300)
                    .xpNeededForNextLevel(300 - safeXp)
                    .progressPercent(Math.min(100.0, Math.round(pct * 10.0) / 10.0))
                    .badgeName("Explorer")
                    .color("emerald")
                    .build();
        } else {
            double pct = ((double) safeXp / 100.0) * 100.0;
            return TenTierLevelInfo.builder()
                    .level(1)
                    .title("Beginner (Boshlang'ich)")
                    .minXp(0)
                    .maxXp(100)
                    .xpNeededForNextLevel(100 - safeXp)
                    .progressPercent(Math.min(100.0, Math.round(pct * 10.0) / 10.0))
                    .badgeName("Beginner")
                    .color("slate")
                    .build();
        }
    }

    // =========================================================================
    // 5. LEADERBOARDS WITH STREAK, LEVEL & GROUP AGGREGATIONS
    // =========================================================================

    public List<LeaderboardEntry> getLeaderboard(String period) {
        return getLeaderboard(period, null, null, null, null);
    }

    public List<LeaderboardEntry> getLeaderboard(String period, Long branchId, Long groupId, Integer page, Integer size) {
        LocalDateTime since = null;
        if ("WEEKLY".equalsIgnoreCase(period)) {
            since = timeHelper.getStartOfWeek();
        } else if ("MONTHLY".equalsIgnoreCase(period)) {
            since = timeHelper.getStartOfMonth();
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

        LocalDate today = timeHelper.getCurrentAcademicDate();
        int rank = 1;
        for (Object[] row : rawData) {
            Long studentId = ((Number) row[0]).longValue();
            int total = ((Number) row[1]).intValue();
            int maxSingle = row[2] != null ? ((Number) row[2]).intValue() : 0;
            LocalDateTime earliest = (LocalDateTime) row[3];

            Student student = studentMap.get(studentId);

            // Filter out archived/inactive students
            if (student != null && student.getStatus() != null &&
                    ("Arxivlangan".equalsIgnoreCase(student.getStatus()) || "ARCHIVED".equalsIgnoreCase(student.getStatus()) || "INACTIVE".equalsIgnoreCase(student.getStatus()))) {
                continue;
            }

            // Filter by branch if specified
            if (branchId != null) {
                if (student == null || student.getBranch() == null || !branchId.equals(student.getBranch().getId())) {
                    continue;
                }
            }

            // Filter by group if specified
            if (groupId != null) {
                if (student == null || student.getStudyGroup() == null || !groupId.equals(student.getStudyGroup().getId())) {
                    continue;
                }
            }

            String displayName = maskStudentName(student, studentId);
            String groupName = (student != null && student.getStudyGroup() != null) ? student.getStudyGroup().getGroupCode() : "Biriktirilmagan";
            String gradeLevel = (student != null) ? student.getGradeLevel() : "N/A";
            Long branchLocationId = (student != null && student.getBranch() != null) ? student.getBranch().getId() : null;
            String branchName = (student != null && student.getBranch() != null) ? student.getBranch().getName() : (student != null ? student.getBranchLocation() : null);

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
            TenTierLevelInfo tenTier = calculateTenTierLevel(total);

            entries.add(LeaderboardEntry.builder()
                    .rank(rank++)
                    .studentId(studentId)
                    .displayName(displayName)
                    .groupName(groupName)
                    .gradeLevel(gradeLevel)
                    .branchId(branchLocationId)
                    .branchName(branchName)
                    .totalPoints(total)
                    .highestSingleAward(maxSingle)
                    .earliestAchievedAt(earliest)
                    .badgeCount(studentAchievementRepository.findByStudentId(studentId).size())
                    .currentStreak(curStreak)
                    .longestStreak(longestStreak)
                    .level(lvl.getLevel())
                    .levelName(lvl.getTitle())
                    .tenTierLevel(tenTier.getLevel())
                    .tenTierTitle(tenTier.getTitle())
                    .build());
        }

        // Apply pagination if requested
        if (page != null && size != null && size > 0) {
            int fromIdx = page * size;
            if (fromIdx >= entries.size()) {
                return Collections.emptyList();
            }
            int toIdx = Math.min(entries.size(), fromIdx + size);
            return entries.subList(fromIdx, toIdx);
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
        TenTierLevelInfo tenTier = calculateTenTierLevel(totalXP);

        // Calculate rank in ALL_TIME, WEEKLY, and MONTHLY leaderboards
        List<LeaderboardEntry> lb = getLeaderboard("ALL_TIME");
        int rank = 0;
        for (LeaderboardEntry e : lb) {
            if (e.getStudentId().equals(studentId)) {
                rank = e.getRank();
                break;
            }
        }
        List<LeaderboardEntry> weeklyLb = getLeaderboard("WEEKLY");
        int weeklyRank = 0;
        for (LeaderboardEntry e : weeklyLb) {
            if (e.getStudentId().equals(studentId)) {
                weeklyRank = e.getRank();
                break;
            }
        }
        List<LeaderboardEntry> monthlyLb = getLeaderboard("MONTHLY");
        int monthlyRank = 0;
        for (LeaderboardEntry e : monthlyLb) {
            if (e.getStudentId().equals(studentId)) {
                monthlyRank = e.getRank();
                break;
            }
        }

        return StudentGamificationProfile.builder()
                .studentId(studentId)
                .displayName(maskStudentName(student, studentId))
                .totalPoints(totalXP)
                .rank(rank > 0 ? rank : lb.size() + 1)
                .weeklyRank(weeklyRank > 0 ? weeklyRank : weeklyLb.size() + 1)
                .monthlyRank(monthlyRank > 0 ? monthlyRank : monthlyLb.size() + 1)
                .currentStreak(streak.getCurrentStreak())
                .longestStreak(streak.getLongestStreak())
                .checkedInToday(streak.isCheckedInToday())
                .totalActiveDays(streak.getTotalActiveDays())
                .streakStartDate(streak.getStreakStartDate())
                .level(level.getLevel())
                .levelName(level.getTitle())
                .currentLevelMinXp(level.getMinXp())
                .nextLevelXp(level.getMaxXp())
                .levelProgressPercent(level.getProgressPercent())
                .tenTierLevel(tenTier.getLevel())
                .tenTierTitle(tenTier.getTitle())
                .tenTierMinXp(tenTier.getMinXp())
                .tenTierMaxXp(tenTier.getMaxXp())
                .tenTierProgressPercent(tenTier.getProgressPercent())
                .streakDetails(streak)
                .recentTransactions(txs.stream().limit(15).toList())
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

    public void checkMilestoneAchievements(Long studentId) {
        int total = getStudentTotalPoints(studentId);

        if (total >= 100) {
            unlockAchievementIfEligible(studentId, "POINTS_100_MILESTONE");
        }
        if (total >= 500) {
            unlockAchievementIfEligible(studentId, "POINTS_500_MILESTONE");
        }
        if (total >= 1000) {
            unlockAchievementIfEligible(studentId, "POINTS_1000_LEGEND");
        }
        if (total >= 5000) {
            unlockAchievementIfEligible(studentId, "POINTS_5000_GRANDMASTER");
        }
        if (total >= 10000) {
            unlockAchievementIfEligible(studentId, "POINTS_10000_MYTHIC");
        }
    }

    @Transactional
    public boolean unlockAchievementIfEligible(Long studentId, String code) {
        Optional<Achievement> achOpt = achievementRepository.findByCode(code);
        if (achOpt.isPresent()) {
            Achievement ach = achOpt.get();
            if (ach.getIsActive() != null && !ach.getIsActive()) {
                return false;
            }
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

                // Award XP for achievement unlock if positive
                if (ach.getXpReward() != null && ach.getXpReward() > 0) {
                    String idemp = "ach_reward_" + studentId + "_" + ach.getId();
                    awardPoints(
                            studentId,
                            ach.getXpReward(),
                            "ACHIEVEMENT_UNLOCKED",
                            String.valueOf(ach.getId()),
                            "Achievement",
                            idemp,
                            "Yutuq nishoni ochildi: " + ach.getTitle(),
                            null
                    );
                }
                return true;
            }
        }
        return false;
    }

    public List<Achievement> getAllAchievements() {
        return achievementRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc();
    }

    @Transactional
    public Achievement createAchievement(Achievement achievement) {
        if (achievement.getCode() == null || achievement.getCode().isBlank()) {
            throw new IllegalArgumentException("Yutuq kodi (code) kiritilishi shart!");
        }
        String cleanCode = achievement.getCode().trim().toUpperCase();
        if (achievementRepository.findByCode(cleanCode).isPresent()) {
            throw new IllegalArgumentException("Ushbu kodli (" + cleanCode + ") yutuq allaqachon mavjud!");
        }
        achievement.setCode(cleanCode);
        if (achievement.getBadgeColor() == null || achievement.getBadgeColor().isBlank()) {
            achievement.setBadgeColor("blue");
        }
        if (achievement.getRarity() == null || achievement.getRarity().isBlank()) {
            achievement.setRarity("COMMON");
        }
        if (achievement.getIsActive() == null) {
            achievement.setIsActive(true);
        }
        if (achievement.getXpReward() == null) {
            achievement.setXpReward(50);
        }
        if (achievement.getCriteriaType() == null || achievement.getCriteriaType().isBlank()) {
            achievement.setCriteriaType("CUSTOM");
        }
        if (achievement.getCriteriaThreshold() == null) {
            achievement.setCriteriaThreshold(1);
        }
        if (achievement.getDisplayOrder() == null) {
            achievement.setDisplayOrder(0);
        }
        achievement.setCreatedAt(LocalDateTime.now());
        achievement.setUpdatedAt(LocalDateTime.now());
        return achievementRepository.save(achievement);
    }

    @Transactional
    public Achievement updateAchievement(Long id, Achievement updated) {
        Achievement existing = achievementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Yutuq topilmadi: " + id));

        if (updated.getTitle() != null && !updated.getTitle().isBlank()) existing.setTitle(updated.getTitle());
        if (updated.getDescription() != null) existing.setDescription(updated.getDescription());
        if (updated.getIcon() != null) existing.setIcon(updated.getIcon());
        if (updated.getBadgeColor() != null) existing.setBadgeColor(updated.getBadgeColor());
        if (updated.getCategory() != null) existing.setCategory(updated.getCategory());
        if (updated.getXpReward() != null) existing.setXpReward(updated.getXpReward());
        if (updated.getCriteriaType() != null) existing.setCriteriaType(updated.getCriteriaType());
        if (updated.getCriteriaThreshold() != null) existing.setCriteriaThreshold(updated.getCriteriaThreshold());
        if (updated.getIsActive() != null) existing.setIsActive(updated.getIsActive());
        if (updated.getRarity() != null) existing.setRarity(updated.getRarity());
        if (updated.getDisplayOrder() != null) existing.setDisplayOrder(updated.getDisplayOrder());
        existing.setUpdatedAt(LocalDateTime.now());

        return achievementRepository.save(existing);
    }

    @Transactional
    public Achievement toggleAchievementStatus(Long id) {
        Achievement existing = achievementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Yutuq topilmadi: " + id));
        existing.setIsActive(existing.getIsActive() == null || !existing.getIsActive());
        existing.setUpdatedAt(LocalDateTime.now());
        return achievementRepository.save(existing);
    }

    public List<StudentAchievement> getStudentAchievements(Long studentId) {
        return studentAchievementRepository.findByStudentId(studentId);
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
        private Long branchId;
        private String branchName;
        private int totalPoints;
        private int highestSingleAward;
        private LocalDateTime earliestAchievedAt;
        private int badgeCount;
        private int currentStreak;
        private int longestStreak;
        private int level;
        private String levelName;
        private int tenTierLevel;
        private String tenTierTitle;
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
        private int weeklyRank;
        private int monthlyRank;
        private int currentStreak;
        private int longestStreak;
        private boolean checkedInToday;
        private int totalActiveDays;
        private LocalDate streakStartDate;
        private int level;
        private String levelName;
        private int currentLevelMinXp;
        private int nextLevelXp;
        private double levelProgressPercent;
        private int tenTierLevel;
        private String tenTierTitle;
        private int tenTierMinXp;
        private int tenTierMaxXp;
        private double tenTierProgressPercent;
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
        private LocalDate streakStartDate;
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
        private LocalDate streakStartDate;
        private boolean streakFreezeAvailable;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StreakFreezeResult {
        private Long studentId;
        private boolean success;
        private int remainingFreezes;
        private LocalDate usedDate;
        private String message;
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
    public static class TenTierLevelInfo {
        private int level;
        private String title;
        private int minXp;
        private int maxXp;
        private int xpNeededForNextLevel;
        private double progressPercent;
        private String badgeName;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentXpSummaryDto {
        private Long studentId;
        private int totalXp;
        private int weeklyXp;
        private int monthlyXp;
        private int overallRank;
        private int weeklyRank;
        private int monthlyRank;
        private int currentLevel;
        private String currentLevelTitle;
        private int tenTierLevel;
        private String tenTierTitle;
        private int xpToNextLevel;
        private Map<String, Integer> sourceBreakdown;
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
