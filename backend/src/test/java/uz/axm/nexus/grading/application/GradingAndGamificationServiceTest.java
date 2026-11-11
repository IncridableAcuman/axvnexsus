package uz.axm.nexus.grading.application;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import uz.axm.nexus.grading.domain.PointTransaction;
import uz.axm.nexus.grading.domain.StudentStreak;
import uz.axm.nexus.grading.infrastructure.AchievementRepository;
import uz.axm.nexus.grading.infrastructure.GradeRecordRepository;
import uz.axm.nexus.grading.infrastructure.PointTransactionRepository;
import uz.axm.nexus.grading.infrastructure.StudentAchievementRepository;
import uz.axm.nexus.grading.infrastructure.StudentStreakRepository;
import uz.axm.nexus.users.infrastructure.StudentRepository;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GradingAndGamificationServiceTest {

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

    @InjectMocks
    private GradingAndGamificationService gradingService;

    @Test
    @DisplayName("Takroriy idempotency key bilan murojaat qilinganda qayta ball berilmasligi kerak")
    void shouldPreventDuplicatePointAwardsWithIdempotency() {
        PointTransaction existingTx = PointTransaction.builder()
                .id(1L)
                .studentId(10L)
                .amount(50)
                .idempotencyKey("assessment_attempt_55")
                .reason("Test topshirildi")
                .build();

        when(pointTransactionRepository.findByIdempotencyKey("assessment_attempt_55"))
                .thenReturn(Optional.of(existingTx));

        PointTransaction result = gradingService.awardPoints(
                10L, 50, "ASSESSMENT", "55", "Attempt", "assessment_attempt_55", "Test topshirildi", 1L
        );

        assertThat(result.getId()).isEqualTo(1L);
        verify(pointTransactionRepository, never()).save(any(PointTransaction.class));
    }

    @Test
    @DisplayName("Ball berishda asoslovchi sabab (reason) bo'lmasa rad etilishi kerak")
    void shouldRequireReasonForPointAward() {
        assertThatThrownBy(() -> gradingService.awardPoints(10L, 50, "BONUS", null, null, "k1", "", 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("aniq sabab");
    }

    @Test
    @DisplayName("Ballni qo'lda to'g'rilash (Adjustment) batafsil izoh talab qilishi kerak")
    void shouldRequireDetailedExplanationForAdjustment() {
        assertThatThrownBy(() -> gradingService.recordAdjustment(10L, -20, "xato", 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("batafsil izoh");
    }

    @Test
    @DisplayName("Birinchi marta kunlik streak qayd qilinganda streak 1 bo'lishi va 15 XP berilishi kerak")
    void shouldInitializeStreakOnFirstActivity() {
        Long studentId = 15L;
        when(studentStreakRepository.findByStudentId(studentId)).thenReturn(Optional.empty());
        when(pointTransactionRepository.save(any(PointTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(studentStreakRepository.save(any(StudentStreak.class))).thenAnswer(inv -> inv.getArgument(0));

        GradingAndGamificationService.StreakCheckInResult result = gradingService.recordDailyActivity(studentId, "DAILY_CHECKIN");

        assertThat(result.isAlreadyRecorded()).isFalse();
        assertThat(result.getCurrentStreak()).isEqualTo(1);
        assertThat(result.getBonusXpEarned()).isEqualTo(15);
        verify(studentStreakRepository).save(any(StudentStreak.class));
        verify(pointTransactionRepository).save(any(PointTransaction.class));
    }

    @Test
    @DisplayName("Kecha faol bo'lgan o'quvchi bugun streak qilganda ketma-ketlik oshishi kerak")
    void shouldIncrementConsecutiveDailyStreak() {
        Long studentId = 15L;
        LocalDate yesterday = LocalDate.now().minusDays(1);
        StudentStreak existing = StudentStreak.builder()
                .studentId(studentId)
                .currentStreak(2)
                .longestStreak(5)
                .lastActivityDate(yesterday)
                .streakFreezeCount(1)
                .totalActiveDays(4)
                .build();

        when(studentStreakRepository.findByStudentId(studentId)).thenReturn(Optional.of(existing));
        when(pointTransactionRepository.save(any(PointTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(studentStreakRepository.save(any(StudentStreak.class))).thenAnswer(inv -> inv.getArgument(0));

        GradingAndGamificationService.StreakCheckInResult result = gradingService.recordDailyActivity(studentId, "DAILY_CHECKIN");

        // 2 + 1 = 3 (3-kunlik marra bonusi: 15 + 30 = 45 XP)
        assertThat(result.getCurrentStreak()).isEqualTo(3);
        assertThat(result.getBonusXpEarned()).isEqualTo(45);
        assertThat(result.isAlreadyRecorded()).isFalse();
    }

    @Test
    @DisplayName("Bugun allaqachon streak qayd qilingan bo'lsa qayta ball berilmasligi kerak")
    void shouldNotAwardDoublePointsOnSameDay() {
        Long studentId = 15L;
        LocalDate today = LocalDate.now();
        StudentStreak existing = StudentStreak.builder()
                .studentId(studentId)
                .currentStreak(3)
                .longestStreak(5)
                .lastActivityDate(today)
                .streakFreezeCount(1)
                .totalActiveDays(5)
                .build();

        when(studentStreakRepository.findByStudentId(studentId)).thenReturn(Optional.of(existing));

        GradingAndGamificationService.StreakCheckInResult result = gradingService.recordDailyActivity(studentId, "DAILY_CHECKIN");

        assertThat(result.isAlreadyRecorded()).isTrue();
        assertThat(result.getBonusXpEarned()).isEqualTo(0);
        verify(studentStreakRepository, never()).save(any(StudentStreak.class));
    }

    @Test
    @DisplayName("XP miqdoriga qarab to'g'ri o'yin darajalari (Levels) hisoblanishi kerak")
    void shouldCalculateCorrectPlayerLevels() {
        GradingAndGamificationService.LevelInfo lvl1 = GradingAndGamificationService.calculateLevel(50);
        assertThat(lvl1.getLevel()).isEqualTo(1);
        assertThat(lvl1.getTitle()).contains("Novice");

        GradingAndGamificationService.LevelInfo lvl2 = GradingAndGamificationService.calculateLevel(350);
        assertThat(lvl2.getLevel()).isEqualTo(2);
        assertThat(lvl2.getTitle()).contains("Junior");

        GradingAndGamificationService.LevelInfo lvl3 = GradingAndGamificationService.calculateLevel(750);
        assertThat(lvl3.getLevel()).isEqualTo(3);
        assertThat(lvl3.getTitle()).contains("Developer");

        GradingAndGamificationService.LevelInfo lvl4 = GradingAndGamificationService.calculateLevel(1400);
        assertThat(lvl4.getLevel()).isEqualTo(4);
        assertThat(lvl4.getTitle()).contains("Senior");

        GradingAndGamificationService.LevelInfo lvl5 = GradingAndGamificationService.calculateLevel(2500);
        assertThat(lvl5.getLevel()).isEqualTo(5);
        assertThat(lvl5.getTitle()).contains("Grandmaster");
    }

    @Test
    @DisplayName("Gamifikatsiya va baholash mezonlari ko'rsatkichlari to'liq spetsifikatsiyani qaytarishi kerak")
    void shouldReturnGamificationMetricsSpecification() {
        GradingAndGamificationService.GamificationMetricsDto metrics = gradingService.getGamificationMetrics();

        assertThat(metrics).isNotNull();
        assertThat(metrics.getGradingScales()).isNotEmpty();
        assertThat(metrics.getXpRules()).isNotEmpty();
        assertThat(metrics.getPlayerLevels()).hasSize(5);
        assertThat(metrics.getStreakRules()).isNotEmpty();
    }
}
