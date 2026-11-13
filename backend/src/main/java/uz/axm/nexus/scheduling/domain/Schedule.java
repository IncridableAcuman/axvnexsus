package uz.axm.nexus.scheduling.domain;

import jakarta.persistence.*;
import lombok.*;
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.shared.domain.BaseEntity;

@Entity
@Table(name = "schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Schedule extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "group_id")
    private StudyGroup studyGroup;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "mentor_id")
    private Mentor mentor;

    @Column(nullable = false)
    private String gradeLevel; // "8-sinf", "9-sinf", "10-sinf", "11-sinf"

    @Column(nullable = false)
    private String subject; // "Web Full-Stack Development", "Computer Science Foundation"

    @Column(nullable = false)
    private String days; // "Seshanba-Payshanba-Shanba" or "Dushanba, Chorshanba, Juma"

    @Column(nullable = false)
    private String startTime; // "15:00"

    @Column(nullable = false)
    private String endTime; // "16:30"

    private String room; // "IT Lab 1"

    private String branchLocation; // "IT Park Yangiariq"

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    private String academicYear; // "2026-2027"

    private String topic; // Optional current lesson topic

    private Integer durationMinutes; // 80 daqiqa (Muhammad Al-Xorazmiy standarti)
}
