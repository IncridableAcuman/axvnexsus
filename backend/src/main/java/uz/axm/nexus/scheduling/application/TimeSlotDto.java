package uz.axm.nexus.scheduling.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeSlotDto {
    private Long id;
    private String name;
    private String startTime;
    private String endTime;
    private Integer durationMinutes;
    private Integer displayOrder;
    private Boolean active;
    private String description;
    private Long branchId;
    private String branchName;
    private Long usageCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
