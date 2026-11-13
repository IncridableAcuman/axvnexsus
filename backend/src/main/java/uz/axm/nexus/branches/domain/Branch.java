package uz.axm.nexus.branches.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import uz.axm.nexus.shared.domain.BaseEntity;

@Entity
@Table(name = "branches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Branch extends BaseEntity {

    @Column(nullable = false, length = 150)
    private String name; // e.g. "IT Park Yangiariq filiali"

    @Column(nullable = false, unique = true, length = 50)
    private String code; // e.g. "ITP-YANGIARIQ"

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 100)
    private String region; // e.g. "Xorazm viloyati"

    @Column(length = 100)
    private String district; // e.g. "Yangiariq tumani"

    @Column(length = 255)
    private String address;

    @Column(length = 50)
    private String phone;

    @Column(length = 100)
    private String email;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "ACTIVE"; // "ACTIVE", "INACTIVE", "ARCHIVED"
}
