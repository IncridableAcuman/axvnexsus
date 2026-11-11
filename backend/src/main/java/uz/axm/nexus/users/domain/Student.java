package uz.axm.nexus.users.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.shared.domain.BaseEntity;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    @Column(nullable = false)
    private String fullName; // e.g. "Gulnora Shamuratova Xolmurad Qizi"

    private String pinfl; // 14-digit JSHSHIR

    private String studentIdNumber; // e.g. "I-HR 0220243"

    private String district; // e.g. "Yangiariq tumani"

    private String gradeLevel; // "8-sinf", "11-sinf"

    private String branchLocation; // "IT Park Yangiariq"

    private String phone;

    private String direction; // "Web Full-Stack", "Advanced UX/UI va Front-end"

    @Column(nullable = false)
    private String status; // "Faol", "Sinov", "Bitirgan"

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "group_id")
    private StudyGroup studyGroup;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "mentor_id")
    private Mentor mentor;
}
