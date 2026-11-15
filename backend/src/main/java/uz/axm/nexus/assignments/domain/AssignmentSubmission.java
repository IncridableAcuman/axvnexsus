package uz.axm.nexus.assignments.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "assignment_submissions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_assignment_student", columnNames = {"assignment_id", "student_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assignment_id", nullable = false)
    private Long assignmentId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "submission_text", columnDefinition = "TEXT")
    private String submissionText;

    @Column(name = "file_url", columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "submitted_at", nullable = false)
    @Builder.Default
    private LocalDateTime submittedAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, GRADED, LATE, RESUBMISSION_REQUESTED

    private Integer score;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "graded_by_mentor_id")
    private Long gradedByMentorId;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    @Transient
    private Integer xpEarned;

    @Transient
    private java.util.List<String> newAchievements;

    @Transient
    private Object streakStatus;
}
