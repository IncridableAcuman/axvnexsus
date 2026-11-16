package uz.axm.nexus.branches.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchActivityDto {
    private Long id;
    private String action;
    private String entityName;
    private String entityId;
    private String performedBy;
    private String outcome;
    private String details;
    private LocalDateTime createdAt;
}
