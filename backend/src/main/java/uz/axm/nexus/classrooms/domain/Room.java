package uz.axm.nexus.classrooms.domain;

import jakarta.persistence.*;
import lombok.*;
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.shared.domain.BaseEntity;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room extends BaseEntity {

    @Column(nullable = false)
    private String name; // e.g. "IT Lab 1"

    private String branchLocation; // e.g. "IT Park Yangiariq"

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    private Integer capacity; // Masalan: 16 kompyuterli o'rin
}
