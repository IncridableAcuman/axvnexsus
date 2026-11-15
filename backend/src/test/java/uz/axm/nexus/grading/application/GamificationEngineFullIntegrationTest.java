package uz.axm.nexus.grading.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.grading.domain.*;
import uz.axm.nexus.grading.infrastructure.*;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.infrastructure.StudentRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GamificationEngineFullIntegrationTest {

    @Mock
    private GradeRecordRepository gradeRecordRepository;

    @Mock
    private PointTransactionRepository pointTransactionRepository;

    @Mock
    private AchievementRepository achievementRepository;

    @Mock
    private StudentAchievementRepository studentAchievementRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private StudentStreakRepository studentStreakRepository;

    @Mock
    private StreakFreezeHistoryRepository streakFreezeHistoryRepository;

    @Mock
    private GamificationConfigService configService;

    @Mock
    private GamificationTimeHelper timeHelper;

    @InjectMocks
    private GradingAndGamificationService gradingService;

    private final LocalDate testToday = LocalDate.of(2026, 11, 15);

    @BeforeEach
    void setUp() {
        lenient().when(timeHelper.getCurrentAcademicDate()).thenReturn(testToday);
        lenient().when(timeHelper.getCurrentAcademicDateTime()).thenReturn(testToday.atTime(14, 0));
        lenient().when(timeHelper.getStartOfWeek()).thenReturn(testToday.minusDays(6).atStartOfDay());
        lenient().when(timeHelper.getStartOfMonth()).thenReturn(testToday.withDayOfMonth(1).atStartOfDay());
        lenient().when(configService.getDailyStreakXp()).thenReturn(15);
        lenient().when(configService.getMaxStreakFreezeCount()).thenReturn(5);
        lenient().when(configService.getDefaultStreakFreezeCount()).thenReturn(1);
    }

    // =========================================================================
    // 1. XP ENGINE TESTS
    // =========================================================================

    @Test
    @DisplayName("XP berishda idempotency key mavjud bo'lsa, qayta saqlanmasdan mavjud tranzaksiya qaytarilishi kerak")
    void shouldEnforceIdempotencyOnAwardPoints() {
        PointTransaction existing = PointTransaction.builder()
                .id(99L)
                .studentId(5L)
                .amount(10)
                .pointSource("QUIZ_COMPLETED")
                .idempotencyKey("quiz_completed_attempt_10")
                .reason("Test yakunlandi")
                .build();

        when(pointTransactionRepository.findByIdempotencyKey("quiz_completed_attempt_10"))
                .thenReturn(Optional.of(existing));

        PointTransaction result = gradingService.awardPoints(
                5L, 10, "QUIZ_COMPLETED", "10", "Attempt", "quiz_completed_attempt_10", "Test yakunlandi", null
        );

        assertThat(result.getId()).isEqualTo(99L);
        verify(pointTransactionRepository, never()).save(any(PointTransaction.class));
    }

    @Test
    @DisplayName("XP sababi (reason) kiritilmasa istisno tashlanishi kerak")
    void shouldRejectAwardPointsWithoutReason() {
        assertThatThrownBy(() -> gradingService.awardPoints(5L, 20, "QUIZ_PASSED", "1", "Attempt", "k1", "", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("aniq sabab");
    }

    // =========================================================================
    // 2. DAILY STREAK ENGINE TESTS
    // =========================================================================

    @Test
    @DisplayName("Birinchi marta faollik qayd etilganda streak=1 va streakStartDate bugun bo'lishi kerak")
    void shouldInitializeFirstStreakCorrectly() {
        Long studentId = 101L;
        when(studentStreakRepository.findByStudentId(studentId)).thenReturn(Optional.empty());
        when(studentStreakRepository.save(any(StudentStreak.class))).thenAnswer(i -> i.getArgument(0));
        when(pointTransactionRepository.save(any(PointTransaction.class))).thenAnswer(i -> i.getArgument(0));

        GradingAndGamificationService.StreakCheckInResult result = gradingService.recordDailyActivity(studentId, "QUIZ_COMPLETED");

        assertThat(result.isAlreadyRecorded()).isFalse();
        assertThat(result.getCurrentStreak()).isEqualTo(1);
        assertThat(result.getLongestStreak()).isEqualTo(1);
        assertThat(result.getLastActivityDate()).isEqualTo(testToday);
        assertThat(result.getStreakStartDate()).isEqualTo(testToday);
        assertThat(result.getBonusXpEarned()).isGreaterThanOrEqualTo(15);
    }

    @Test
    @DisplayName("Kecha faol bo'lgan talaba bugun yana faollik bajarsa, streak increment qilinishi kerak")
    void shouldIncrementStreakOnConsecutiveDays() {
        Long studentId = 102L;
        StudentStreak existing = StudentStreak.builder()
                .studentId(studentId)
                .currentStreak(5)
                .longestStreak(10)
                .lastActivityDate(testToday.minusDays(1))
                .streakFreezeCount(1)
                .totalActiveDays(8)
                .streakStartDate(testToday.minusDays(5))
                .build();

        when(studentStreakRepository.findByStudentId(studentId)).thenReturn(Optional.of(existing));
        when(studentStreakRepository.save(any(StudentStreak.class))).thenAnswer(i -> i.getArgument(0));
        when(pointTransactionRepository.save(any(PointTransaction.class))).thenAnswer(i -> i.getArgument(0));

        GradingAndGamificationService.StreakCheckInResult result = gradingService.recordDailyActivity(studentId, "ASSIGNMENT_SUBMISSION");

        assertThat(result.isAlreadyRecorded()).isFalse();
        assertThat(result.getCurrentStreak()).isEqualTo(6);
        assertThat(result.getLongestStreak()).isEqualTo(10);
    }

    @Test
    @DisplayName("Bir kun o'tkazib yuborilganda va freeze mavjud bo'lsa, freeze ishlatilib streak saqlanishi kerak")
    void shouldConsumeStreakFreezeWhenMissedOneDay() {
        Long studentId = 103L;
        StudentStreak existing = StudentStreak.builder()
                .studentId(studentId)
                .currentStreak(4)
                .longestStreak(10)
                .lastActivityDate(testToday.minusDays(2)) // Missed testToday.minusDays(1)
                .streakFreezeCount(2)
                .totalActiveDays(6)
                .streakStartDate(testToday.minusDays(6))
                .build();

        when(studentStreakRepository.findByStudentId(studentId)).thenReturn(Optional.of(existing));
        when(studentStreakRepository.save(any(StudentStreak.class))).thenAnswer(i -> i.getArgument(0));
        when(pointTransactionRepository.save(any(PointTransaction.class))).thenAnswer(i -> i.getArgument(0));

        GradingAndGamificationService.StreakCheckInResult result = gradingService.recordDailyActivity(studentId, "LESSON_COMPLETED");

        assertThat(result.isAlreadyRecorded()).isFalse();
        assertThat(result.getCurrentStreak()).isEqualTo(5); // Preserved and incremented!
        assertThat(existing.getStreakFreezeCount()).isEqualTo(1); // 1 freeze consumed
        verify(streakFreezeHistoryRepository).save(any(StreakFreezeHistory.class));
    }

    @Test
    @DisplayName("Bir kun o'tkazib yuborilganda va freeze bo'lmasa, streak 1 dan qayta boshlanishi kerak")
    void shouldResetStreakWhenMissedOneDayWithZeroFreezes() {
        Long studentId = 104L;
        StudentStreak existing = StudentStreak.builder()
                .studentId(studentId)
                .currentStreak(8)
                .longestStreak(15)
                .lastActivityDate(testToday.minusDays(2))
                .streakFreezeCount(0) // No freeze!
                .totalActiveDays(12)
                .streakStartDate(testToday.minusDays(10))
                .build();

        when(studentStreakRepository.findByStudentId(studentId)).thenReturn(Optional.of(existing));
        when(studentStreakRepository.save(any(StudentStreak.class))).thenAnswer(i -> i.getArgument(0));
        when(pointTransactionRepository.save(any(PointTransaction.class))).thenAnswer(i -> i.getArgument(0));

        GradingAndGamificationService.StreakCheckInResult result = gradingService.recordDailyActivity(studentId, "QUIZ_COMPLETED");

        assertThat(result.isAlreadyRecorded()).isFalse();
        assertThat(result.getCurrentStreak()).isEqualTo(1); // Reset to 1
        assertThat(result.getStreakStartDate()).isEqualTo(testToday);
    }

    @Test
    @DisplayName("Bir kunda bir necha bor faollik bajarilsa, bir marta hisoblanib qayta XP berilmasligi kerak")
    void shouldNotDoubleCountActivitiesOnSameDay() {
        Long studentId = 105L;
        StudentStreak existing = StudentStreak.builder()
                .studentId(studentId)
                .currentStreak(3)
                .longestStreak(5)
                .lastActivityDate(testToday) // Already active today!
                .streakFreezeCount(1)
                .totalActiveDays(4)
                .build();

        when(studentStreakRepository.findByStudentId(studentId)).thenReturn(Optional.of(existing));

        GradingAndGamificationService.StreakCheckInResult result = gradingService.recordDailyActivity(studentId, "LESSON_COMPLETED");

        assertThat(result.isAlreadyRecorded()).isTrue();
        assertThat(result.getBonusXpEarned()).isEqualTo(0);
        verify(studentStreakRepository, never()).save(any(StudentStreak.class));
    }

    // =========================================================================
    // 3. STREAK FREEZE MANAGEMENT TESTS
    // =========================================================================

    @Test
    @DisplayName("Administrator o'quvchiga streak freeze berishi yoki to'g'irlashi auditi saqlanishi kerak")
    void shouldAllowAdminToAdjustStreakFreezeWithAudit() {
        Long studentId = 106L;
        StudentStreak existing = StudentStreak.builder()
                .studentId(studentId)
                .currentStreak(2)
                .streakFreezeCount(1)
                .build();

        when(studentStreakRepository.findByStudentId(studentId)).thenReturn(Optional.of(existing));
        when(studentStreakRepository.save(any(StudentStreak.class))).thenAnswer(i -> i.getArgument(0));

        GradingAndGamificationService.StreakFreezeResult result = gradingService.adjustStreakFreeze(studentId, 2, "Namunali faollik bonusi", 1L);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getRemainingFreezes()).isEqualTo(3);
        verify(streakFreezeHistoryRepository).save(any(StreakFreezeHistory.class));
    }

    // =========================================================================
    // 4. LEVEL PROGRESSION TESTS (10-TIER)
    // =========================================================================

    @Test
    @DisplayName("10 toifali o'yin darajalari to'g'ri oraliqlar va progress bilan hisoblanishi kerak")
    void shouldCalculateTenTierLevelProgressionCorrectly() {
        GradingAndGamificationService.TenTierLevelInfo l1 = GradingAndGamificationService.calculateTenTierLevel(50);
        assertThat(l1.getLevel()).isEqualTo(1);
        assertThat(l1.getTitle()).contains("Beginner");
        assertThat(l1.getXpNeededForNextLevel()).isEqualTo(50);

        GradingAndGamificationService.TenTierLevelInfo l2 = GradingAndGamificationService.calculateTenTierLevel(150);
        assertThat(l2.getLevel()).isEqualTo(2);
        assertThat(l2.getTitle()).contains("Explorer");

        GradingAndGamificationService.TenTierLevelInfo l3 = GradingAndGamificationService.calculateTenTierLevel(450);
        assertThat(l3.getLevel()).isEqualTo(3);
        assertThat(l3.getTitle()).contains("Learner");

        GradingAndGamificationService.TenTierLevelInfo l4 = GradingAndGamificationService.calculateTenTierLevel(800);
        assertThat(l4.getLevel()).isEqualTo(4);
        assertThat(l4.getTitle()).contains("Practitioner");

        GradingAndGamificationService.TenTierLevelInfo l5 = GradingAndGamificationService.calculateTenTierLevel(1200);
        assertThat(l5.getLevel()).isEqualTo(5);
        assertThat(l5.getTitle()).contains("Skilled");

        GradingAndGamificationService.TenTierLevelInfo l6 = GradingAndGamificationService.calculateTenTierLevel(2000);
        assertThat(l6.getLevel()).isEqualTo(6);
        assertThat(l6.getTitle()).contains("Advanced");

        GradingAndGamificationService.TenTierLevelInfo l7 = GradingAndGamificationService.calculateTenTierLevel(3000);
        assertThat(l7.getLevel()).isEqualTo(7);
        assertThat(l7.getTitle()).contains("Expert");

        GradingAndGamificationService.TenTierLevelInfo l8 = GradingAndGamificationService.calculateTenTierLevel(5000);
        assertThat(l8.getLevel()).isEqualTo(8);
        assertThat(l8.getTitle()).contains("Master");

        GradingAndGamificationService.TenTierLevelInfo l9 = GradingAndGamificationService.calculateTenTierLevel(8000);
        assertThat(l9.getLevel()).isEqualTo(9);
        assertThat(l9.getTitle()).contains("Champion");

        GradingAndGamificationService.TenTierLevelInfo l10 = GradingAndGamificationService.calculateTenTierLevel(12000);
        assertThat(l10.getLevel()).isEqualTo(10);
        assertThat(l10.getTitle()).contains("Legend");
        assertThat(l10.getXpNeededForNextLevel()).isEqualTo(0);
        assertThat(l10.getProgressPercent()).isEqualTo(100.0);
    }

    // =========================================================================
    // 5. ACHIEVEMENTS TESTS
    // =========================================================================

    @Test
    @DisplayName("Yutuq nishoni sharti bajarilganda bir marta ochilishi va takroriy ochilmasligi kerak")
    void shouldUnlockAchievementIdempotently() {
        Long studentId = 107L;
        Achievement ach = Achievement.builder()
                .id(1L)
                .code("FIRST_QUIZ_COMPLETED")
                .title("Birinchi Test")
                .xpReward(10)
                .criteriaThreshold(1)
                .build();

        when(achievementRepository.findByCode("FIRST_QUIZ_COMPLETED")).thenReturn(Optional.of(ach));
        when(studentAchievementRepository.findByStudentIdAndAchievementId(studentId, 1L)).thenReturn(Optional.empty());

        gradingService.unlockAchievementIfEligible(studentId, "FIRST_QUIZ_COMPLETED");

        verify(studentAchievementRepository).save(any(StudentAchievement.class));
        verify(pointTransactionRepository).save(any(PointTransaction.class));
    }

    @Test
    @DisplayName("Allaqachon ochilgan yutuq nishoni qayta saqlanmasligi kerak")
    void shouldNotReUnlockExistingAchievement() {
        Long studentId = 107L;
        Achievement ach = Achievement.builder().id(1L).code("FIRST_QUIZ_COMPLETED").build();
        StudentAchievement already = StudentAchievement.builder().studentId(studentId).achievementId(1L).build();

        when(achievementRepository.findByCode("FIRST_QUIZ_COMPLETED")).thenReturn(Optional.of(ach));
        when(studentAchievementRepository.findByStudentIdAndAchievementId(studentId, 1L)).thenReturn(Optional.of(already));

        gradingService.unlockAchievementIfEligible(studentId, "FIRST_QUIZ_COMPLETED");

        verify(studentAchievementRepository, never()).save(any(StudentAchievement.class));
    }

    // =========================================================================
    // 6. LEADERBOARD TESTS
    // =========================================================================

    @Test
    @DisplayName("Leaderboard arxividagi talabalarni chiqarib tashlashi va aniq tie-breaking qoidasiga bo'ysunishi kerak")
    void shouldFilterArchivedStudentsAndOrderDeterministic() {
        Branch branch = Branch.builder().name("Yangiariq").build();
        branch.setId(1L);

        StudyGroup group = StudyGroup.builder().groupCode("YA-8A").branch(branch).build();
        group.setId(10L);

        Student activeStudent1 = Student.builder().fullName("Ali Valiyev").status("Faol").studyGroup(group).branch(branch).build();
        activeStudent1.setId(1L);

        Student activeStudent2 = Student.builder().fullName("Vali Aliyev").status("Faol").studyGroup(group).branch(branch).build();
        activeStudent2.setId(2L);

        Student archivedStudent = Student.builder().fullName("G'ani Ketgan").status("Arxivlangan").studyGroup(group).branch(branch).build();
        archivedStudent.setId(3L);

        when(studentRepository.findAll()).thenReturn(List.of(activeStudent1, activeStudent2, archivedStudent));
        when(studentStreakRepository.findAll()).thenReturn(List.of());

        // Raw row format: [studentId, totalPoints, maxSingleAward, earliestCreatedAt]
        List<Object[]> rawRows = List.of(
                new Object[]{1L, 500, 100, LocalDateTime.now().minusDays(5)},
                new Object[]{3L, 450, 100, LocalDateTime.now().minusDays(6)}, // Archived
                new Object[]{2L, 400, 80, LocalDateTime.now().minusDays(4)}
        );
        when(pointTransactionRepository.getLeaderboardDataAllTime()).thenReturn(rawRows);

        List<GradingAndGamificationService.LeaderboardEntry> leaderboard = gradingService.getLeaderboard("ALL_TIME");

        assertThat(leaderboard).hasSize(2); // Archived student excluded
        assertThat(leaderboard.get(0).getStudentId()).isEqualTo(1L);
        assertThat(leaderboard.get(0).getRank()).isEqualTo(1);
        assertThat(leaderboard.get(1).getStudentId()).isEqualTo(2L);
        assertThat(leaderboard.get(1).getRank()).isEqualTo(2);
    }

    // =========================================================================
    // 7. SPECIFIC REWARD EVENT TESTS (PHASE 1, 5, 6)
    // =========================================================================

    @Test
    @DisplayName("Test topshirilganda, o'tilganda va yuqori ball olinganda tegishli XP berilishi va takroriy farmingdan himoyalanishi kerak")
    void shouldAwardConfigDrivenQuizRewardsAndPreventDuplicatePassingXp() {
        Long studentId = 201L;
        Long attemptId = 55L;
        Long assessmentId = 12L;

        when(configService.getQuizCompleteXp()).thenReturn(10);
        when(configService.getQuizPassXp()).thenReturn(20);
        when(configService.getQuizHighScoreXp()).thenReturn(30);

        when(pointTransactionRepository.save(any(PointTransaction.class))).thenAnswer(i -> i.getArgument(0));

        // 1. Completion
        PointTransaction txComp = gradingService.awardQuizCompletion(studentId, attemptId, "Java OOP", null);
        assertThat(txComp.getAmount()).isEqualTo(10);
        assertThat(txComp.getPointSource()).isEqualTo("QUIZ_COMPLETED");
        assertThat(txComp.getIdempotencyKey()).isEqualTo("quiz_completed_attempt_55");

        // 2. Passing
        PointTransaction txPass = gradingService.awardQuizPassing(studentId, assessmentId, attemptId, "Java OOP", 85.0, null);
        assertThat(txPass.getAmount()).isEqualTo(20);
        assertThat(txPass.getPointSource()).isEqualTo("QUIZ_PASSED");
        assertThat(txPass.getIdempotencyKey()).isEqualTo("quiz_passed_assessment_12_student_201");

        // 3. High Score
        PointTransaction txHigh = gradingService.awardQuizHighScore(studentId, assessmentId, attemptId, "Java OOP", 95.0, null);
        assertThat(txHigh.getAmount()).isEqualTo(30);
        assertThat(txHigh.getPointSource()).isEqualTo("QUIZ_HIGH_SCORE");
        assertThat(txHigh.getIdempotencyKey()).isEqualTo("quiz_high_score_assessment_12_student_201");
    }

    @Test
    @DisplayName("Topshiriq topshirilganda, o'z vaqtida yuklanganda va a'lo baholanganda konfiguratsiya bo'yicha XP berilishi kerak")
    void shouldAwardConfigDrivenAssignmentRewards() {
        Long studentId = 202L;
        Long assignmentId = 7L;
        Long submissionId = 33L;

        when(configService.getAssignmentCompleteXp()).thenReturn(15);
        when(configService.getAssignmentOnTimeXp()).thenReturn(10);
        when(configService.getAssignmentExcellentXp()).thenReturn(25);

        when(pointTransactionRepository.save(any(PointTransaction.class))).thenAnswer(i -> i.getArgument(0));

        PointTransaction txComp = gradingService.awardAssignmentCompletion(studentId, assignmentId, submissionId, "React Hooks");
        assertThat(txComp.getAmount()).isEqualTo(15);
        assertThat(txComp.getPointSource()).isEqualTo("ASSIGNMENT_COMPLETED");

        PointTransaction txTime = gradingService.awardAssignmentOnTime(studentId, assignmentId, submissionId, "React Hooks");
        assertThat(txTime.getAmount()).isEqualTo(10);
        assertThat(txTime.getPointSource()).isEqualTo("ASSIGNMENT_ON_TIME");

        PointTransaction txExc = gradingService.awardAssignmentExcellent(studentId, assignmentId, submissionId, "React Hooks", 95, 1L);
        assertThat(txExc.getAmount()).isEqualTo(25);
        assertThat(txExc.getPointSource()).isEqualTo("ASSIGNMENT_EXCELLENT");
    }

    @Test
    @DisplayName("Darsda qatnashib yakunlanganda konfiguratsiya bo'yicha 5 XP berilishi kerak")
    void shouldAwardConfigDrivenLessonRewards() {
        Long studentId = 203L;
        Long lessonId = 42L;

        when(configService.getLessonCompleteXp()).thenReturn(5);
        when(pointTransactionRepository.save(any(PointTransaction.class))).thenAnswer(i -> i.getArgument(0));

        PointTransaction txLesson = gradingService.awardLessonCompletion(studentId, lessonId, "Spring Security Asoslari", null);
        assertThat(txLesson.getAmount()).isEqualTo(5);
        assertThat(txLesson.getPointSource()).isEqualTo("LESSON_COMPLETED");
        assertThat(txLesson.getIdempotencyKey()).isEqualTo("lesson_completed_42_student_203");
    }

    @Test
    @DisplayName("Bir xil o'tkazib yuborilgan sana uchun takroriy freeze ishlatish rad etilishi kerak")
    void shouldPreventMultipleFreezesForSameMissedDate() {
        Long studentId = 204L;
        LocalDate missedDate = testToday.minusDays(1);

        StudentStreak streak = StudentStreak.builder()
                .studentId(studentId)
                .streakFreezeCount(2)
                .currentStreak(4)
                .build();
        when(studentStreakRepository.findByStudentId(studentId)).thenReturn(Optional.of(streak));
        when(streakFreezeHistoryRepository.existsByStudentIdAndUsedDateAndActionTypeIn(eq(studentId), eq(missedDate), any()))
                .thenReturn(true); // Already used!

        assertThatThrownBy(() -> gradingService.consumeStreakFreezeManually(studentId, missedDate, 1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("allaqachon ishlatilgan");
    }

    @Test
    @DisplayName("Administrator yangi yutuq nishonini qo'shishi va tahrirlashi mumkin")
    void shouldAllowAdminToCreateAndUpdateAchievements() {
        Achievement newAch = Achievement.builder()
                .code("ALGO_CHAMPION")
                .title("Algoritm Chempioni")
                .description("10 ta qiyin darajadagi algoritmik masalani yechish")
                .category("MASTERY")
                .icon("Trophy")
                .xpReward(200)
                .build();

        when(achievementRepository.findByCode("ALGO_CHAMPION")).thenReturn(Optional.empty());
        when(achievementRepository.save(any(Achievement.class))).thenAnswer(i -> {
            Achievement a = i.getArgument(0);
            a.setId(99L);
            return a;
        });

        Achievement created = gradingService.createAchievement(newAch);
        assertThat(created.getId()).isEqualTo(99L);
        assertThat(created.getCode()).isEqualTo("ALGO_CHAMPION");

        when(achievementRepository.findById(99L)).thenReturn(Optional.of(created));
        Achievement updateReq = Achievement.builder()
                .title("Algoritmik Daholar")
                .xpReward(300)
                .build();

        Achievement updated = gradingService.updateAchievement(99L, updateReq);
        assertThat(updated.getTitle()).isEqualTo("Algoritmik Daholar");
        assertThat(updated.getXpReward()).isEqualTo(300);
    }

    @Test
    @DisplayName("Belgilangan davr oralig'ida o'quvchi to'plagan ball miqdori to'g'ri hisoblanishi kerak")
    void shouldRetrievePointsByCustomPeriod() {
        Long studentId = 205L;
        LocalDateTime start = testToday.minusDays(7).atStartOfDay();
        LocalDateTime end = testToday.atTime(23, 59, 59);

        when(pointTransactionRepository.getPointsByStudentAndPeriod(studentId, start, end)).thenReturn(140);

        int points = gradingService.getPointsByStudentAndPeriod(studentId, start, end);
        assertThat(points).isEqualTo(140);
    }
}
