package uz.axm.nexus.grading.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "streak_freeze_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StreakFreezeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "used_date", nullable = false)
    private LocalDate usedDate;

    @Column(name = "action_type", nullable = false, length = 50)
    private String actionType; // AUTO_CONSUMED, MANUAL_USED, ADMIN_GRANTED, ADMIN_ADJUSTED

    @Column(nullable = false)
    private String reason;

    @Column(name = "performed_by_user_id")
    private Long performedByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
