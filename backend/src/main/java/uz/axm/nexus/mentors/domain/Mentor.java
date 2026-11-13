package uz.axm.nexus.mentors.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.shared.domain.BaseEntity;
import uz.axm.nexus.users.domain.User;

@Entity
@Table(name = "mentors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mentor extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String role; // "IT mentor", "Ingliz tili mentor"

    private String phone;

    private String email;

    private String branchLocation; // e.g. "IT Park Yangiariq"

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @Column(columnDefinition = "TEXT")
    private String bio;
}
