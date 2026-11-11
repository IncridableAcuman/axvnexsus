package uz.axm.nexus.lessons.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "lessons")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String subject;

    @Column(name = "grade_level", nullable = false)
    private String gradeLevel;

    private String topic;

    @Column(name = "learning_objectives", columnDefinition = "TEXT")
    private String learningObjectives;

    @Column(name = "expected_outcomes", columnDefinition = "TEXT")
    private String expectedOutcomes;

    @Column(name = "required_materials", columnDefinition = "TEXT")
    private String requiredMaterials;

    @Column(name = "theory_content", columnDefinition = "TEXT")
    private String theoryContent;

    @Column(name = "theory_duration_minutes")
    @Builder.Default
    private Integer theoryDurationMinutes = 20;

    @Column(name = "practical_content", columnDefinition = "TEXT")
    private String practicalContent;

    @Column(name = "practical_duration_minutes")
    @Builder.Default
    private Integer practicalDurationMinutes = 25;

    @Column(columnDefinition = "TEXT")
    private String exercises;

    @Column(columnDefinition = "TEXT")
    private String homework;

    @Column(name = "duration_minutes", nullable = false)
    @Builder.Default
    private Integer durationMinutes = 80;

    @Column(name = "group_id")
    private Long groupId;

    @Column(name = "mentor_id")
    private Long mentorId;

    @Column(name = "schedule_id")
    private Long scheduleId;

    @Column(nullable = false)
    @Builder.Default
    private String status = "DRAFT"; // DRAFT, REVIEW, PUBLISHED, COMPLETED, CANCELLED, ARCHIVED

    @Column(name = "actual_outcome", columnDefinition = "TEXT")
    private String actualOutcome;

    @Column(name = "mentor_notes", columnDefinition = "TEXT")
    private String mentorNotes;

    @Column(name = "presentation_slides", columnDefinition = "TEXT")
    private String presentationSlides;

    @Column(name = "is_template", nullable = false)
    @Builder.Default
    private Boolean isTemplate = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
