package uz.axm.nexus.grading.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "achievements")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Achievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(nullable = false)
    private String icon;

    @Column(name = "badge_color", nullable = false)
    @Builder.Default
    private String badgeColor = "blue";

    @Column(nullable = false)
    private String category; // ATTENDANCE, ASSESSMENT, PROJECT, STREAK, MASTERY

    @Column(name = "xp_reward", nullable = false)
    @Builder.Default
    private Integer xpReward = 50;

    @Column(name = "criteria_type", nullable = false)
    private String criteriaType;

    @Column(name = "criteria_threshold", nullable = false)
    @Builder.Default
    private Integer criteriaThreshold = 1;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(nullable = false)
    @Builder.Default
    private String rarity = "COMMON"; // COMMON, RARE, EPIC, LEGENDARY

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
