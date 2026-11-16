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

    @Builder.Default
    private Integer capacity = 16; // Masalan: 16 kompyuterli o'rin

    @Builder.Default
    @Column(name = "room_type", length = 50)
    private String roomType = "IT_LAB"; // "IT_LAB", "THEORY_ROOM", "ROBOTICS_LAB", "CONFERENCE_HALL"

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "ACTIVE"; // "ACTIVE", "MAINTENANCE", "INACTIVE"
}
