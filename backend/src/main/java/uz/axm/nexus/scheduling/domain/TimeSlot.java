package uz.axm.nexus.scheduling.domain;

import jakarta.persistence.*;
import lombok.*;
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.shared.domain.BaseEntity;

/**
 * Administrator tomonidan boshqariladigan dars vaqt oralig'i (Time Slot).
 */
@Entity
@Table(name = "time_slots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeSlot extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "start_time", nullable = false, length = 10)
    private String startTime; // masalan: "09:30"

    @Column(name = "end_time", nullable = false, length = 10)
    private String endTime; // masalan: "11:00"

    @Column(name = "duration_minutes")
    private Integer durationMinutes; // masalan: 90 daqiqa

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;
}
