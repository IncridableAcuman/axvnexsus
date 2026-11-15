package uz.axm.nexus.assessments.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "student_assessment_attempts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAssessmentAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assessment_id", nullable = false)
    private Long assessmentId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "attempt_number", nullable = false)
    @Builder.Default
    private Integer attemptNumber = 1;

    @Column(name = "started_at", nullable = false)
    @Builder.Default
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "time_spent_seconds")
    @Builder.Default
    private Integer timeSpentSeconds = 0;

    @Column(name = "total_score")
    @Builder.Default
    private Integer totalScore = 0;

    @Column(name = "max_possible_score")
    @Builder.Default
    private Integer maxPossibleScore = 0;

    @Builder.Default
    private Double percentage = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private String status = "IN_PROGRESS"; // IN_PROGRESS, SUBMITTED, EVALUATED, EXPIRED

    @Column(name = "mentor_feedback", columnDefinition = "TEXT")
    private String mentorFeedback;

    @Column(name = "graded_by_mentor_id")
    private Long gradedByMentorId;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    @Transient
    private Integer xpEarned;

    @Transient
    private java.util.List<String> xpSources;

    @Transient
    private Object streakStatus;

    @Transient
    private java.util.List<String> newAchievements;

    @Transient
    private Object levelProgression;
}
