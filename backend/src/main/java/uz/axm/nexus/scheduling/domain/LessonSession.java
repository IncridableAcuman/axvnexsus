package uz.axm.nexus.scheduling.domain;

import jakarta.persistence.*;
import lombok.*;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.shared.domain.BaseEntity;

import java.time.LocalDate;

@Entity
@Table(name = "lesson_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonSession extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "schedule_id")
    private Schedule schedule;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "group_id", nullable = false)
    private StudyGroup group;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "mentor_id", nullable = false)
    private Mentor mentor;

    private String room;

    @Column(nullable = false)
    private String subject;

    private String topic;

    @Column(nullable = false)
    private LocalDate lessonDate;

    @Column(nullable = false, length = 20)
    private String startTime; // "15:00"

    @Column(nullable = false, length = 20)
    private String endTime; // "16:30"

    @Builder.Default
    @Column(nullable = false, length = 50)
    private String status = "SCHEDULED"; // "SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"

    @Builder.Default
    @Column(name = "is_manually_modified", nullable = false)
    private Boolean isManuallyModified = false;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "time_slot_id")
    private TimeSlot timeSlot;

    @Column(columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
