package uz.axm.nexus.assignments.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.assignments.domain.Assignment;
import uz.axm.nexus.assignments.domain.AssignmentSubmission;
import uz.axm.nexus.assignments.infrastructure.AssignmentRepository;
import uz.axm.nexus.assignments.infrastructure.AssignmentSubmissionRepository;
import uz.axm.nexus.grading.application.GradingAndGamificationService;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;

    @Autowired(required = false)
    private GradingAndGamificationService gradingService;

    public List<Assignment> getAllAssignments(Long groupId, String subject) {
        if (groupId != null) {
            return assignmentRepository.findByGroupId(groupId);
        }
        if (subject != null && !subject.isBlank()) {
            return assignmentRepository.findBySubject(subject);
        }
        return assignmentRepository.findAll();
    }

    public Assignment getAssignmentById(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Topshiriq topilmadi: " + id));
    }

    @Transactional
    public Assignment createAssignment(Assignment assignment) {
        if (assignment.getTitle() == null || assignment.getTitle().isBlank()) {
            throw new IllegalArgumentException("Topshiriq sarlavhasi kiritilishi shart!");
        }
        if (assignment.getMaxPoints() == null || assignment.getMaxPoints() <= 0) {
            assignment.setMaxPoints(100);
        }
        assignment.setCreatedAt(LocalDateTime.now());
        return assignmentRepository.save(assignment);
    }

    @Transactional
    public AssignmentSubmission submitAssignment(Long assignmentId, Long studentId, String submissionText, String fileUrl) {
        Assignment assignment = getAssignmentById(assignmentId);
        LocalDateTime now = LocalDateTime.now();

        AssignmentSubmission submission = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, studentId)
                .orElse(AssignmentSubmission.builder()
                        .assignmentId(assignmentId)
                        .studentId(studentId)
                        .build());

        submission.setSubmissionText(submissionText);
        submission.setFileUrl(fileUrl);
        submission.setSubmittedAt(now);

        // Check overdue deadline
        if (assignment.getDeadline() != null && now.isAfter(assignment.getDeadline())) {
            submission.setStatus("LATE");
            log.warn("Topshiriq muddatidan kech topshirildi: AssignmentID={}, StudentID={}", assignmentId, studentId);
        } else {
            submission.setStatus("PENDING");
        }

        AssignmentSubmission saved = submissionRepository.save(submission);

        // Gamification XP & Streak Integration
        if (gradingService != null) {
            try {
                int earnedXp = 0;
                List<String> unlocked = new ArrayList<>();

                // 1. Complete an assignment (Configurable, default 15 XP)
                uz.axm.nexus.grading.domain.PointTransaction txComp = gradingService.awardAssignmentCompletion(studentId, assignmentId, saved.getId(), assignment.getTitle());
                if (txComp != null && txComp.getAmount() != null) {
                    earnedXp += txComp.getAmount();
                }

                // 2. Submit on time (Configurable, default 10 XP)
                if (!"LATE".equals(saved.getStatus())) {
                    uz.axm.nexus.grading.domain.PointTransaction txTime = gradingService.awardAssignmentOnTime(studentId, assignmentId, saved.getId(), assignment.getTitle());
                    if (txTime != null && txTime.getAmount() != null) {
                        earnedXp += txTime.getAmount();
                    }
                }

                // 3. Register Daily Streak Activity
                GradingAndGamificationService.StreakCheckInResult streakRes = gradingService.recordDailyActivity(studentId, "ASSIGNMENT_SUBMISSION");

                // 4. Achievement check
                if (gradingService.unlockAchievementIfEligible(studentId, "FIRST_ASSIGNMENT_SUBMITTED")) {
                    unlocked.add("FIRST_ASSIGNMENT_SUBMITTED");
                }

                saved.setXpEarned(earnedXp);
                saved.setNewAchievements(unlocked);
                saved.setStreakStatus(streakRes);
            } catch (Exception e) {
                log.error("Topshiriq gamifikatsiyasini hisoblashda xatolik: {}", e.getMessage(), e);
            }
        }

        return saved;
    }

    @Transactional
    public AssignmentSubmission gradeSubmission(Long submissionId, Long mentorId, Integer score, String feedback) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Yuborilgan topshiriq topilmadi: " + submissionId));

        if (score == null || score < 0 || score > 100) {
            throw new IllegalArgumentException("Ball 0 dan 100 gacha bo'lishi kerak!");
        }

        submission.setScore(score);
        submission.setFeedback(feedback);
        submission.setGradedByMentorId(mentorId);
        submission.setGradedAt(LocalDateTime.now());
        submission.setStatus("GRADED");

        AssignmentSubmission saved = submissionRepository.save(submission);
        log.info("Topshiriq baholandi: ID={}, StudentID={}, Score={}", submissionId, saved.getStudentId(), score);

        // Gamification Excellent Evaluation Bonus (Configurable, default 25 XP)
        if (gradingService != null && score >= 90) {
            try {
                Assignment assignment = getAssignmentById(saved.getAssignmentId());
                uz.axm.nexus.grading.domain.PointTransaction txExc = gradingService.awardAssignmentExcellent(
                        saved.getStudentId(),
                        saved.getAssignmentId(),
                        saved.getId(),
                        assignment.getTitle(),
                        score,
                        mentorId
                );
                if (txExc != null && txExc.getAmount() != null) {
                    saved.setXpEarned(txExc.getAmount());
                }
                gradingService.unlockAchievementIfEligible(saved.getStudentId(), "EXCELLENT_ASSIGNMENT");

                // Check 3 practical projects with high score for PRACTICAL_HERO
                long excellentCount = submissionRepository.findByStudentId(saved.getStudentId()).stream()
                        .filter(s -> s.getScore() != null && s.getScore() >= 90)
                        .count();
                if (excellentCount >= 3) {
                    gradingService.unlockAchievementIfEligible(saved.getStudentId(), "PRACTICAL_HERO");
                }
            } catch (Exception e) {
                log.error("Topshiriq a'lo bahosi gamifikatsiyasini hisoblashda xatolik: {}", e.getMessage(), e);
            }
        }

        return saved;
    }

    public List<AssignmentSubmission> getSubmissionsByAssignment(Long assignmentId) {
        return submissionRepository.findByAssignmentId(assignmentId);
    }

    public List<AssignmentSubmission> getSubmissionsByStudent(Long studentId) {
        return submissionRepository.findByStudentId(studentId);
    }
}
