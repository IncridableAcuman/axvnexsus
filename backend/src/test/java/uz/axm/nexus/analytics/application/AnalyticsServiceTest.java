package uz.axm.nexus.analytics.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import uz.axm.nexus.analytics.domain.AssessmentAnalyticsDto;
import uz.axm.nexus.analytics.domain.GroupAnalyticsDto;
import uz.axm.nexus.analytics.domain.IndividualStudentAnalyticsDto;
import uz.axm.nexus.assessments.domain.Assessment;
import uz.axm.nexus.assessments.domain.StudentAssessmentAttempt;
import uz.axm.nexus.assessments.infrastructure.AssessmentRepository;
import uz.axm.nexus.assessments.infrastructure.StudentAssessmentAttemptRepository;
import uz.axm.nexus.assignments.domain.Assignment;
import uz.axm.nexus.assignments.domain.AssignmentSubmission;
import uz.axm.nexus.assignments.infrastructure.AssignmentRepository;
import uz.axm.nexus.assignments.infrastructure.AssignmentSubmissionRepository;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.education.infrastructure.AcademicPeriodRepository;
import uz.axm.nexus.lessons.domain.Lesson;
import uz.axm.nexus.lessons.domain.StudentLessonProgress;
import uz.axm.nexus.lessons.infrastructure.LessonRepository;
import uz.axm.nexus.lessons.infrastructure.StudentLessonProgressRepository;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.scheduling.domain.AttendanceRecord;
import uz.axm.nexus.scheduling.domain.LessonSession;
import uz.axm.nexus.scheduling.infrastructure.AttendanceRecordRepository;
import uz.axm.nexus.scheduling.infrastructure.LessonSessionRepository;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private StudentRepository studentRepository;
    @Mock
    private StudyGroupRepository studyGroupRepository;
    @Mock
    private MentorRepository mentorRepository;
    @Mock
    private LessonSessionRepository lessonSessionRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private StudentLessonProgressRepository studentLessonProgressRepository;
    @Mock
    private AssessmentRepository assessmentRepository;
    @Mock
    private StudentAssessmentAttemptRepository studentAssessmentAttemptRepository;
    @Mock
    private AssignmentRepository assignmentRepository;
    @Mock
    private AssignmentSubmissionRepository assignmentSubmissionRepository;
    @Mock
    private AcademicPeriodRepository academicPeriodRepository;
    @Mock
    private AnalyticsAuthorizationService authorizationService;
    @Mock
    private uz.axm.nexus.classrooms.infrastructure.RoomRepository roomRepository;
    @Mock
    private uz.axm.nexus.shared.application.ResourceOwnershipService resourceOwnershipService;
    @Mock
    private uz.axm.nexus.grading.application.GradingAndGamificationService gradingAndGamificationService;

    @InjectMocks
    private AnalyticsService analyticsService;

    private Student testStudent;
    private StudyGroup testGroup;
    private Mentor testMentor;
    private User adminUser;

    @BeforeEach
    void setUp() {
        testMentor = Mentor.builder()
                .fullName("Izzatbek Abdurasharipov")
                .role("IT Mentor")
                .build();
        testMentor.setId(1L);

        testGroup = StudyGroup.builder()
                .groupCode("YA-26I0804")
                .gradeLevel("8-sinf")
                .subject("Web Full-Stack Development")
                .mentor(testMentor)
                .build();
        testGroup.setId(10L);

        testStudent = Student.builder()
                .fullName("Gulnora Shamuratova")
                .studentIdNumber("I-HR 0220201")
                .pinfl("50711097180011")
                .gradeLevel("8-sinf")
                .studyGroup(testGroup)
                .mentor(testMentor)
                .status("Faol")
                .build();
        testStudent.setId(100L);

        adminUser = User.builder()
                .username("admin")
                .role("ROLE_SUPER_ADMIN")
                .build();
        adminUser.setId(1L);
    }

    @Test
    @DisplayName("Davomat ko'rsatkichi formulasi: Sababli qoldirilganlar chegirilishi va aniq hisoblanishi kerak")
    void shouldCalculateAttendanceRateWithExplicitDenominatorRules() {
        when(studentRepository.findById(100L)).thenReturn(Optional.of(testStudent));

        LocalDate from = LocalDate.now().minusDays(30);
        LocalDate to = LocalDate.now();

        // 4 ta dars sessiyasi: 2 ta PRESENT, 1 ta LATE, 1 ta EXCUSED
        LessonSession s1 = LessonSession.builder().lessonDate(from.plusDays(1)).status("COMPLETED").build();
        s1.setId(1L);
        LessonSession s2 = LessonSession.builder().lessonDate(from.plusDays(3)).status("COMPLETED").build();
        s2.setId(2L);
        LessonSession s3 = LessonSession.builder().lessonDate(from.plusDays(5)).status("COMPLETED").build();
        s3.setId(3L);
        LessonSession s4 = LessonSession.builder().lessonDate(from.plusDays(7)).status("COMPLETED").build();
        s4.setId(4L);

        when(lessonSessionRepository.findByGroupIdAndLessonDateBetween(eq(10L), eq(from), eq(to)))
                .thenReturn(List.of(s1, s2, s3, s4));

        AttendanceRecord a1 = AttendanceRecord.builder().status("PRESENT").build();
        AttendanceRecord a2 = AttendanceRecord.builder().status("PRESENT").build();
        AttendanceRecord a3 = AttendanceRecord.builder().status("LATE").build();
        AttendanceRecord a4 = AttendanceRecord.builder().status("EXCUSED").build();

        when(attendanceRecordRepository.findByStudentIdAndDateRange(eq(100L), eq(from), eq(to)))
                .thenReturn(List.of(a1, a2, a3, a4));

        IndividualStudentAnalyticsDto result = analyticsService.getIndividualStudentAnalytics(100L, from, to, adminUser);

        assertThat(result).isNotNull();
        assertThat(result.getTotalScheduledSessions()).isEqualTo(4);
        assertThat(result.getPresentCount()).isEqualTo(2);
        assertThat(result.getLateCount()).isEqualTo(1);
        assertThat(result.getExcusedCount()).isEqualTo(1);

        // Denominator = 4 - 1 (excused) = 3
        // Numerator = 2 (present) + 1 * 0.8 (late) = 2.8
        // AttendanceRate = (2.8 / 3) * 100 = 93.3%
        assertThat(result.getAttendanceRate()).isEqualTo(93.3);
        assertThat(result.getRuleDocumentation()).isNotNull();
        assertThat(result.getRuleDocumentation().getAttendanceFormula()).contains("EXCUSED");
    }

    @Test
    @DisplayName("Nol dars o'tkazilganda yoki barcha darslar sababli bo'lganda bo'linish nolga teng bo'lmasligi kerak (100% qaytishi kerak)")
    void shouldHandleZeroDenominatorSafely() {
        when(studentRepository.findById(100L)).thenReturn(Optional.of(testStudent));
        LocalDate from = LocalDate.now().minusDays(5);
        LocalDate to = LocalDate.now();

        when(lessonSessionRepository.findByGroupIdAndLessonDateBetween(eq(10L), eq(from), eq(to)))
                .thenReturn(List.of());
        when(attendanceRecordRepository.findByStudentIdAndDateRange(eq(100L), eq(from), eq(to)))
                .thenReturn(List.of());

        IndividualStudentAnalyticsDto result = analyticsService.getIndividualStudentAnalytics(100L, from, to, adminUser);

        assertThat(result).isNotNull();
        assertThat(result.getAttendanceRate()).isEqualTo(100.0);
    }

    @Test
    @DisplayName("O'quvchi boshqa o'quvchining shaxsiy hisobotiga kirishga uringanda AccessDeniedException chiqishi kerak")
    void shouldDenyStudentAccessToOtherStudentAnalytics() {
        doThrow(new AccessDeniedException("O'quvchi faqat o'zining shaxsiy ko'rsatkichlarini ko'rishga ruxsat etilgan."))
                .when(authorizationService).validateStudentAccess(eq(100L), any());

        User studentCaller = User.builder().username("other_student").role("ROLE_STUDENT").build();

        assertThatThrownBy(() -> analyticsService.getIndividualStudentAnalytics(100L, null, null, studentCaller))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("faqat o'zining shaxsiy ko'rsatkichlarini");
    }

    @Test
    @DisplayName("Guruh tahlili: o'quvchilar soni, o'rtacha ball va baholar taqsimoti hisoblanishi kerak")
    void shouldCalculateGroupAnalyticsCorrectly() {
        when(studyGroupRepository.findById(10L)).thenReturn(Optional.of(testGroup));
        when(studentRepository.findByGroupId(10L)).thenReturn(List.of(testStudent));
        when(studentRepository.findById(100L)).thenReturn(Optional.of(testStudent));

        GroupAnalyticsDto result = analyticsService.getGroupAnalytics(10L, null, null, adminUser);

        assertThat(result).isNotNull();
        assertThat(result.getGroupCode()).isEqualTo("YA-26I0804");
        assertThat(result.getStudentCount()).isEqualTo(1);
        assertThat(result.getStudents()).hasSize(1);
        assertThat(result.getScoreDistribution()).containsKey("A (90-100%)");
    }

    @Test
    @DisplayName("Test natijalari tahlili: o'tish foizi, eng yuqori va eng past ball aniqlanishi kerak")
    void shouldCalculateAssessmentAnalytics() {
        Assessment quiz = Assessment.builder()
                .id(50L)
                .title("HTML5 & CSS Oraliq Test")
                .subject("Web Full-Stack")
                .gradeLevel("8-sinf")
                .passingScore(60)
                .totalPoints(100)
                .groupId(10L)
                .build();

        when(assessmentRepository.findById(50L)).thenReturn(Optional.of(quiz));
        when(studentRepository.findByGroupId(10L)).thenReturn(List.of(testStudent));

        StudentAssessmentAttempt attempt1 = StudentAssessmentAttempt.builder()
                .assessmentId(50L)
                .studentId(100L)
                .percentage(85.0)
                .timeSpentSeconds(1200)
                .status("EVALUATED")
                .build();

        when(studentAssessmentAttemptRepository.findByAssessmentId(50L)).thenReturn(List.of(attempt1));

        AssessmentAnalyticsDto result = analyticsService.getAssessmentAnalytics(50L, adminUser);

        assertThat(result).isNotNull();
        assertThat(result.getAttemptCount()).isEqualTo(1);
        assertThat(result.getPassRate()).isEqualTo(100.0);
        assertThat(result.getAverageScore()).isEqualTo(85.0);
        assertThat(result.getHighestScore()).isEqualTo(85.0);
    }
}
