package uz.axm.nexus.branches.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchGroupDto {
    private Long id;
    private String groupCode;
    private String gradeLevel;
    private String subject;
    private Long mentorId;
    private String mentorName;
    private String room;
    private int studentCount;
    private int maxCapacity;
    private boolean overCapacity;
    private String overCapacityWarning;
    private String status;
    private String scheduleDays;
    private String scheduleTime;
}
