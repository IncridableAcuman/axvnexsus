package uz.axm.nexus.classrooms.domain;

import jakarta.persistence.*;
import lombok.*;
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.education.domain.AcademicPeriod;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.shared.domain.BaseEntity;

@Entity
@Table(name = "study_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudyGroup extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String groupCode; // e.g. "YA-26I0804"

    @Column(nullable = false)
    private String gradeLevel; // "8-sinf", "9-sinf", "10-sinf", "11-sinf"

    private String subject; // "Web Full-Stack Development", "Computer Science"

    private String branchLocation; // "IT Park Yangiariq"

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    private String scheduleDays; // "Seshanba-Payshanba-Shanba"

    private String scheduleTime; // "15:00-16:30"

    private String room; // "IT Lab 1"

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "mentor_id")
    private Mentor mentor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "academic_period_id")
    private AcademicPeriod academicPeriod;

    @Builder.Default
    @Column(nullable = false)
    private String status = "ACTIVE"; // "ACTIVE", "ARCHIVED", "COMPLETED"

    @Builder.Default
    @Column(nullable = false)
    private Integer maxCapacity = 16;

    private Integer studentCount;
}
