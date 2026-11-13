package uz.axm.nexus.branches.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchStatisticsDto {
    private Long branchId;
    private String branchName;
    private String branchCode;
    private long totalStudents;
    private long activeStudents;
    private long totalGroups;
    private long activeGroups;
    private long totalMentors;
    private long totalRooms;
    private long totalRoomCapacity;
    private double averageGroupSize;
    private double capacityUtilizationRate; // percentage
}
