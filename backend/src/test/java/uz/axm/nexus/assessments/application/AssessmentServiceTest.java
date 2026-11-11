package uz.axm.nexus.assessments.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import uz.axm.nexus.assessments.domain.Assessment;
import uz.axm.nexus.assessments.domain.AssessmentQuestion;
import uz.axm.nexus.assessments.domain.StudentAnswer;
import uz.axm.nexus.assessments.domain.StudentAssessmentAttempt;
import uz.axm.nexus.assessments.infrastructure.AssessmentQuestionRepository;
import uz.axm.nexus.assessments.infrastructure.AssessmentRepository;
import uz.axm.nexus.assessments.infrastructure.StudentAnswerRepository;
import uz.axm.nexus.assessments.infrastructure.StudentAssessmentAttemptRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssessmentServiceTest {

    @Mock
    private AssessmentRepository assessmentRepository;

    @Mock
    private AssessmentQuestionRepository questionRepository;

    @Mock
    private StudentAssessmentAttemptRepository attemptRepository;

    @Mock
    private StudentAnswerRepository answerRepository;

    @Mock
    private uz.axm.nexus.grading.application.GradingAndGamificationService gradingService;

    @InjectMocks
    private AssessmentService assessmentService;

    private Assessment assessment;

    @BeforeEach
    void setUp() {
        assessment = Assessment.builder()
                .id(1L)
                .title("JavaScript Asoslari Testi")
                .subject("Web Full-Stack")
                .gradeLevel("8-sinf")
                .isPublished(true)
                .maxAttempts(2)
                .totalPoints(20)
                .durationMinutes(30)
                .build();
    }

    @Test
    @DisplayName("O'quvchi test olayotganda to'g'ri javob kalitlari yashirilishi shart")
    void shouldSanitizeQuestionsForStudentTaking() {
        AssessmentQuestion q1 = AssessmentQuestion.builder()
                .id(101L)
                .assessmentId(1L)
                .questionText("let va const farqi nima?")
                .questionType("SINGLE_CHOICE")
                .optionsJson("[\"A\", \"B\", \"C\"]")
                .correctAnswersJson("1") // to'g'ri javob indexi
                .explanation("const qiymatini qayta o'zgartirib bo'lmaydi")
                .points(10)
                .build();

        when(assessmentRepository.findById(1L)).thenReturn(Optional.of(assessment));
        when(questionRepository.findByAssessmentIdOrderByOrderIndexAsc(1L)).thenReturn(List.of(q1));

        List<AssessmentQuestion> studentQuestions = assessmentService.getQuestionsForStudentAttempt(1L);

        assertThat(studentQuestions).hasSize(1);
        assertThat(studentQuestions.get(0).getCorrectAnswersJson()).isNull();
        assertThat(studentQuestions.get(0).getExplanation()).isNull();
        assertThat(studentQuestions.get(0).getQuestionText()).isEqualTo("let va const farqi nima?");
    }

    @Test
    @DisplayName("Urinishlar soni oshib ketganda yangi urinish boshlash taqiqlanishi kerak")
    void shouldRejectWhenAttemptLimitExceeded() {
        when(assessmentRepository.findById(1L)).thenReturn(Optional.of(assessment));
        when(attemptRepository.countByAssessmentIdAndStudentId(1L, 42L)).thenReturn(2L);

        assertThatThrownBy(() -> assessmentService.startAttempt(1L, 42L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("barcha urinishlardan");
    }

    @Test
    @DisplayName("Test topshirilganda ob'ektiv savollar avtomatik hisoblanishi kerak")
    void shouldAutoGradeObjectiveQuestionsOnSubmit() {
        StudentAssessmentAttempt attempt = StudentAssessmentAttempt.builder()
                .id(50L)
                .assessmentId(1L)
                .studentId(42L)
                .maxPossibleScore(20)
                .startedAt(LocalDateTime.now().minusMinutes(5))
                .status("IN_PROGRESS")
                .build();

        AssessmentQuestion q1 = AssessmentQuestion.builder()
                .id(101L)
                .assessmentId(1L)
                .questionType("SINGLE_CHOICE")
                .correctAnswersJson("1")
                .points(10)
                .build();

        AssessmentQuestion q2 = AssessmentQuestion.builder()
                .id(102L)
                .assessmentId(1L)
                .questionType("TRUE_FALSE")
                .correctAnswersJson("true")
                .points(10)
                .build();

        when(attemptRepository.findById(50L)).thenReturn(Optional.of(attempt));
        when(assessmentRepository.findById(1L)).thenReturn(Optional.of(assessment));
        when(questionRepository.findByAssessmentIdOrderByOrderIndexAsc(1L)).thenReturn(List.of(q1, q2));
        when(attemptRepository.save(any(StudentAssessmentAttempt.class))).thenAnswer(i -> i.getArgument(0));

        // Student answers: Q1 is correct ("1"), Q2 is wrong ("false")
        Map<Long, String> studentAnswers = Map.of(101L, "1", 102L, "false");

        StudentAssessmentAttempt result = assessmentService.submitAttempt(50L, studentAnswers);

        assertThat(result.getTotalScore()).isEqualTo(10);
        assertThat(result.getPercentage()).isEqualTo(50.0);
        assertThat(result.getStatus()).isEqualTo("EVALUATED");
        verify(answerRepository, times(2)).save(any(StudentAnswer.class));
    }
}
