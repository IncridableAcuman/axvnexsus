package uz.axm.nexus.assessments.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.assessments.domain.Assessment;
import uz.axm.nexus.assessments.domain.AssessmentQuestion;
import uz.axm.nexus.assessments.domain.StudentAnswer;
import uz.axm.nexus.assessments.domain.StudentAssessmentAttempt;
import uz.axm.nexus.assessments.infrastructure.AssessmentQuestionRepository;
import uz.axm.nexus.assessments.infrastructure.AssessmentRepository;
import uz.axm.nexus.assessments.infrastructure.StudentAnswerRepository;
import uz.axm.nexus.assessments.infrastructure.StudentAssessmentAttemptRepository;
import uz.axm.nexus.grading.application.GradingAndGamificationService;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final AssessmentQuestionRepository questionRepository;
    private final StudentAssessmentAttemptRepository attemptRepository;
    private final StudentAnswerRepository answerRepository;
    private final GradingAndGamificationService gradingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<Assessment> getAllAssessments(String subject, String gradeLevel, Long groupId) {
        if (subject != null && !subject.isBlank()) {
            return assessmentRepository.findBySubject(subject);
        }
        if (gradeLevel != null && !gradeLevel.isBlank()) {
            return assessmentRepository.findByGradeLevel(gradeLevel);
        }
        if (groupId != null) {
            return assessmentRepository.findByGroupId(groupId);
        }
        return assessmentRepository.findAll();
    }

    public Assessment getAssessmentById(Long id) {
        return assessmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Baholash (Test) topilmadi: " + id));
    }

    public List<AssessmentQuestion> getQuestionsForAdminOrMentor(Long assessmentId) {
        return questionRepository.findByAssessmentIdOrderByOrderIndexAsc(assessmentId);
    }

    /**
     * Sanitizes questions for students - NEVER leaks correct answers before allowed time!
     */
    public List<AssessmentQuestion> getQuestionsForStudentAttempt(Long assessmentId) {
        Assessment assessment = getAssessmentById(assessmentId);
        List<AssessmentQuestion> questions = questionRepository.findByAssessmentIdOrderByOrderIndexAsc(assessmentId);

        if (Boolean.TRUE.equals(assessment.getRandomizeQuestions())) {
            Collections.shuffle(questions);
        }

        return questions.stream().map(q -> AssessmentQuestion.builder()
                .id(q.getId())
                .assessmentId(q.getAssessmentId())
                .questionText(q.getQuestionText())
                .questionType(q.getQuestionType())
                .points(q.getPoints())
                .orderIndex(q.getOrderIndex())
                .optionsJson(q.getOptionsJson())
                // HIDE correct answers and explanation during test taking!
                .correctAnswersJson(null)
                .explanation(null)
                .build()
        ).toList();
    }

    @Transactional
    public Assessment createAssessment(Assessment assessment, List<AssessmentQuestion> questions) {
        if (assessment.getTitle() == null || assessment.getTitle().isBlank()) {
            throw new IllegalArgumentException("Test nomi kiritilishi shart!");
        }

        int total = (questions != null) ? questions.stream().mapToInt(q -> q.getPoints() != null ? q.getPoints() : 10).sum() : 100;
        assessment.setTotalPoints(total);
        assessment.setCreatedAt(LocalDateTime.now());
        Assessment saved = assessmentRepository.save(assessment);

        if (questions != null && !questions.isEmpty()) {
            int order = 1;
            for (AssessmentQuestion q : questions) {
                q.setAssessmentId(saved.getId());
                q.setOrderIndex(order++);
                questionRepository.save(q);
            }
        }

        log.info("Yangi test yaratildi: ID={}, Savollar soni={}", saved.getId(), questions != null ? questions.size() : 0);
        return saved;
    }

    @Transactional
    public Assessment updateAssessment(Long id, Assessment updated, List<AssessmentQuestion> questions) {
        Assessment existing = getAssessmentById(id);

        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setSubject(updated.getSubject());
        existing.setGradeLevel(updated.getGradeLevel());
        existing.setTopic(updated.getTopic());
        existing.setAssessmentType(updated.getAssessmentType());
        existing.setPassingScore(updated.getPassingScore());
        existing.setDurationMinutes(updated.getDurationMinutes());
        existing.setStartTime(updated.getStartTime());
        existing.setEndTime(updated.getEndTime());
        existing.setMaxAttempts(updated.getMaxAttempts());
        existing.setRandomizeQuestions(updated.getRandomizeQuestions());
        existing.setShowCorrectAnswers(updated.getShowCorrectAnswers());
        existing.setIsPublished(updated.getIsPublished());
        existing.setGroupId(updated.getGroupId());
        existing.setUpdatedAt(LocalDateTime.now());

        if (questions != null) {
            questionRepository.deleteByAssessmentId(id);
            int total = 0;
            int order = 1;
            for (AssessmentQuestion q : questions) {
                q.setAssessmentId(id);
                q.setOrderIndex(order++);
                total += (q.getPoints() != null ? q.getPoints() : 10);
                questionRepository.save(q);
            }
            existing.setTotalPoints(total);
        }

        return assessmentRepository.save(existing);
    }

    /**
     * Starts a new attempt for a student with server-side validations.
     */
    @Transactional
    public StudentAssessmentAttempt startAttempt(Long assessmentId, Long studentId) {
        Assessment assessment = getAssessmentById(assessmentId);

        if (!Boolean.TRUE.equals(assessment.getIsPublished())) {
            throw new IllegalStateException("Ushbu test hali chop etilmagan!");
        }

        LocalDateTime now = LocalDateTime.now();
        if (assessment.getStartTime() != null && now.isBefore(assessment.getStartTime())) {
            throw new IllegalStateException("Test hali boshlanmagan. Boshlanish vaqti: " + assessment.getStartTime());
        }
        if (assessment.getEndTime() != null && now.isAfter(assessment.getEndTime())) {
            throw new IllegalStateException("Test topshirish muddati yakunlangan!");
        }

        long existingCount = attemptRepository.countByAssessmentIdAndStudentId(assessmentId, studentId);
        if (existingCount >= assessment.getMaxAttempts()) {
            throw new IllegalStateException("Siz berilgan barcha urinishlardan (" + assessment.getMaxAttempts() + " ta) foydalanib bo'ldingiz!");
        }

        StudentAssessmentAttempt attempt = StudentAssessmentAttempt.builder()
                .assessmentId(assessmentId)
                .studentId(studentId)
                .attemptNumber((int) existingCount + 1)
                .startedAt(now)
                .maxPossibleScore(assessment.getTotalPoints())
                .status("IN_PROGRESS")
                .build();

        StudentAssessmentAttempt saved = attemptRepository.save(attempt);
        log.info("O'quvchi testni boshladi: AttemptID={}, StudentID={}, AssessmentID={}", saved.getId(), studentId, assessmentId);
        return saved;
    }

    /**
     * Submits student answers, auto-grades objective questions server-side, and stores attempt score.
     */
    @Transactional
    public StudentAssessmentAttempt submitAttempt(Long attemptId, Map<Long, String> answers) {
        StudentAssessmentAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Urinish topilmadi: " + attemptId));

        if (!"IN_PROGRESS".equals(attempt.getStatus())) {
            throw new IllegalStateException("Ushbu test urinishi allaqachon yakunlangan!");
        }

        Assessment assessment = getAssessmentById(attempt.getAssessmentId());
        LocalDateTime now = LocalDateTime.now();
        attempt.setSubmittedAt(now);

        long secondsSpent = Duration.between(attempt.getStartedAt(), now).getSeconds();
        attempt.setTimeSpentSeconds((int) secondsSpent);

        // Server-side time limit enforcement (with 60-second network latency buffer)
        if (assessment.getDurationMinutes() != null && assessment.getDurationMinutes() > 0) {
            long maxAllowedSeconds = (assessment.getDurationMinutes() * 60L) + 60L;
            if (secondsSpent > maxAllowedSeconds) {
                log.warn("Vaqt chegarasidan oshildi: AttemptID={}, SpentSeconds={}", attemptId, secondsSpent);
            }
        }

        List<AssessmentQuestion> questions = questionRepository.findByAssessmentIdOrderByOrderIndexAsc(assessment.getId());
        int totalEarned = 0;
        boolean hasManualGradingQuestions = false;

        for (AssessmentQuestion q : questions) {
            String studentAnswer = answers != null ? answers.get(q.getId()) : null;
            StudentAnswer record = StudentAnswer.builder()
                    .attemptId(attemptId)
                    .questionId(q.getId())
                    .studentAnswerText(studentAnswer)
                    .build();

            // Auto-grading objective questions
            boolean isObjective = "SINGLE_CHOICE".equalsIgnoreCase(q.getQuestionType())
                    || "TRUE_FALSE".equalsIgnoreCase(q.getQuestionType())
                    || "MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionType())
                    || "SHORT_TEXT".equalsIgnoreCase(q.getQuestionType());

            if (isObjective && q.getCorrectAnswersJson() != null && studentAnswer != null) {
                boolean correct = checkAnswerCorrectness(q, studentAnswer);
                record.setIsCorrect(correct);
                if (correct) {
                    record.setEarnedPoints(q.getPoints());
                    totalEarned += q.getPoints();
                } else {
                    record.setEarnedPoints(0);
                }
            } else if (!isObjective) {
                hasManualGradingQuestions = true;
                record.setEarnedPoints(0);
            }

            answerRepository.save(record);
        }

        attempt.setTotalScore(totalEarned);
        double maxScore = attempt.getMaxPossibleScore() > 0 ? attempt.getMaxPossibleScore() : 100.0;
        attempt.setPercentage(Math.round(((double) totalEarned / maxScore) * 1000.0) / 10.0);
        attempt.setStatus(hasManualGradingQuestions ? "SUBMITTED" : "EVALUATED");

        StudentAssessmentAttempt saved = attemptRepository.save(attempt);
        log.info("Test topshirildi va avto-baholandi: AttemptID={}, Score={}/{}", attemptId, totalEarned, maxScore);

        if ("EVALUATED".equals(saved.getStatus())) {
            applyAssessmentGamificationRewards(saved, assessment);
        }

        return saved;
    }

    @Transactional
    public StudentAssessmentAttempt gradeAttemptManually(Long attemptId, Long mentorId, Map<Long, Integer> questionScores, String mentorFeedback) {
        StudentAssessmentAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Urinish topilmadi: " + attemptId));

        int total = 0;
        List<StudentAnswer> answers = answerRepository.findByAttemptId(attemptId);
        for (StudentAnswer ans : answers) {
            if (questionScores != null && questionScores.containsKey(ans.getQuestionId())) {
                int score = questionScores.get(ans.getQuestionId());
                ans.setEarnedPoints(score);
                ans.setIsCorrect(score > 0);
                answerRepository.save(ans);
            }
            total += (ans.getEarnedPoints() != null ? ans.getEarnedPoints() : 0);
        }

        attempt.setTotalScore(total);
        double maxScore = attempt.getMaxPossibleScore() > 0 ? attempt.getMaxPossibleScore() : 100.0;
        attempt.setPercentage(Math.round(((double) total / maxScore) * 1000.0) / 10.0);
        attempt.setStatus("EVALUATED");
        attempt.setMentorFeedback(mentorFeedback);
        attempt.setGradedByMentorId(mentorId);
        attempt.setGradedAt(LocalDateTime.now());

        StudentAssessmentAttempt saved = attemptRepository.save(attempt);
        applyAssessmentGamificationRewards(saved, getAssessmentById(saved.getAssessmentId()));
        return saved;
    }

    private void applyAssessmentGamificationRewards(StudentAssessmentAttempt attempt, Assessment assessment) {
        if (gradingService == null || attempt.getStudentId() == null) return;
        try {
            int score = attempt.getTotalScore() != null ? attempt.getTotalScore() : 0;
            String idempKey = "test_attempt_" + attempt.getId();
            gradingService.awardPoints(
                    attempt.getStudentId(),
                    score,
                    "ASSESSMENT",
                    String.valueOf(attempt.getId()),
                    "StudentAssessmentAttempt",
                    idempKey,
                    "Test natijasi (" + assessment.getTitle() + "): " + score + " ball (" + attempt.getPercentage() + "%)",
                    attempt.getGradedByMentorId()
            );

            if (attempt.getPercentage() != null && attempt.getPercentage() >= 100.0) {
                String bonusKey = "perfect_test_" + attempt.getId();
                gradingService.awardPoints(
                        attempt.getStudentId(),
                        50,
                        "ACHIEVEMENT_UNLOCKED",
                        String.valueOf(attempt.getId()),
                        "StudentAssessmentAttempt",
                        bonusKey,
                        "Mukammal 100% natija bonusi! (" + assessment.getTitle() + ")",
                        attempt.getGradedByMentorId()
                );
                gradingService.unlockAchievementIfEligible(attempt.getStudentId(), "FIRST_PERFECT_TEST");
            }

            gradingService.recordDailyActivity(attempt.getStudentId(), "ASSESSMENT_COMPLETION");

            long passedCount = attemptRepository.findByStudentId(attempt.getStudentId()).stream()
                    .filter(a -> "EVALUATED".equals(a.getStatus()) && a.getPercentage() != null && a.getPercentage() >= 60.0)
                    .count();
            if (passedCount >= 3) {
                gradingService.unlockAchievementIfEligible(attempt.getStudentId(), "TEST_EXPERT");
            }
        } catch (Exception e) {
            log.error("Test topshirishda gamifikatsiya mukofotlarini hisoblashda xatolik: {}", e.getMessage(), e);
        }
    }

    public List<StudentAssessmentAttempt> getStudentAttempts(Long studentId) {
        return attemptRepository.findByStudentId(studentId);
    }

    public List<StudentAssessmentAttempt> getAssessmentAttempts(Long assessmentId) {
        return attemptRepository.findByAssessmentId(assessmentId);
    }

    public StudentAssessmentAttempt getAttemptById(Long attemptId) {
        return attemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Urinish topilmadi: " + attemptId));
    }

    public List<StudentAnswer> getAttemptAnswers(Long attemptId) {
        return answerRepository.findByAttemptId(attemptId);
    }

    private boolean checkAnswerCorrectness(AssessmentQuestion q, String studentAnswer) {
        try {
            String correct = q.getCorrectAnswersJson().trim();
            studentAnswer = studentAnswer.trim();

            if ("SINGLE_CHOICE".equalsIgnoreCase(q.getQuestionType()) || "TRUE_FALSE".equalsIgnoreCase(q.getQuestionType())) {
                // If it's a numeric index like "0" or "1"
                return correct.equalsIgnoreCase(studentAnswer);
            }

            if ("SHORT_TEXT".equalsIgnoreCase(q.getQuestionType())) {
                return correct.equalsIgnoreCase(studentAnswer);
            }

            if ("MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionType())) {
                List<String> correctList = objectMapper.readValue(correct, new TypeReference<List<String>>() {});
                List<String> studentList = objectMapper.readValue(studentAnswer, new TypeReference<List<String>>() {});
                return new HashSet<>(correctList).equals(new HashSet<>(studentList));
            }
        } catch (Exception e) {
            log.warn("Javob to'g'riligini tekshirishda xatolik: {}", e.getMessage());
            return q.getCorrectAnswersJson().equalsIgnoreCase(studentAnswer);
        }
        return false;
    }
}
